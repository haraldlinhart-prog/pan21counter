import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const NOBLE_API_URL = 'https://www.noble-limited.com';
const NOBLE_API_KEY = process.env.NOBLE_API_KEY || '';
const ACTIVATE_URL = 'https://shop.pan21.com/api/activate-plus';
const INTERNAL_ACTIVATE_SECRET = process.env.INTERNAL_ACTIVATE_SECRET || '';

const PRICE_EUR = 0.99;
const EUROPAN_BONUS_PCT = 0.02;
const DOPPELWUMS_BONUS_PCT = 0.03;

// POST /api/europan-pay  { badge_key, email, pin, bonusChoice: 'now'|'save' }
// SICHERHEIT: /api/v1/debit bei noble-limited prüft nur den API-Key, keine PIN —
// diese Route ist die einzige Stelle, die die PIN vor dem Debit verifiziert.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://pan21counter.de');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const en = req.body?.lang === 'en';
  try {
    const { badge_key, email, pin, bonusChoice } = req.body || {};
    if (!badge_key || !email || !pin) {
      return res.status(400).json({ error: en ? 'Site ID, email and PIN are required' : 'Badge-Key, E-Mail und PIN erforderlich' });
    }
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: en ? 'Please enter your 4-digit PIN' : 'PIN (4-stellig) erforderlich' });
    }
    if (!NOBLE_API_KEY || !INTERNAL_ACTIVATE_SECRET) {
      return res.status(500).json({ error: 'Not configured' });
    }

    const { data: sites } = await supabase.from('pc_sites').select('id').eq('site_id', badge_key).limit(1);
    if (!sites || sites.length === 0) {
      return res.status(404).json({ error: en ? 'Website not found' : 'Website nicht gefunden' });
    }
    const siteId = badge_key; // pc_sites nutzt die Site-ID selbst als Schlüssel für pc_plus_subscribers

    // 1. PIN verifizieren + echten Kontostand holen
    const verifyRes = await fetch(`${NOBLE_API_URL}/api/v1/balance-by-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${NOBLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase(), pin, coin_id: 'europan' }),
    });
    if (verifyRes.status === 404) return res.status(404).json({ error: en ? 'No EUROPAN credit found for this email address.' : 'Kein EUROPAN-Guthaben für diese E-Mail gefunden.' });
    if (verifyRes.status === 401) return res.status(401).json({ error: en ? 'Incorrect PIN.' : 'Falsche PIN.' });
    if (verifyRes.status === 429) return res.status(429).json({ error: en ? 'Too many failed attempts — please try again later.' : 'Zu viele falsche Versuche — bitte später erneut versuchen.' });
    if (!verifyRes.ok) return res.status(verifyRes.status).json({ error: 'Noble API error' });

    const verifyData = await verifyRes.json();
    const balance = verifyData.balances?.europan || 0;

    // 2. Bonus-Mathematik — serverseitig, wie im EUROPAN-Widget-Standard
    const europanBonus = PRICE_EUR * EUROPAN_BONUS_PCT;
    const europanBonusApplied = bonusChoice === 'now' ? europanBonus : 0;
    const afterEuropanBonus = Math.max(0, PRICE_EUR - europanBonusApplied);
    const doppelWumsBonus = PRICE_EUR * DOPPELWUMS_BONUS_PCT;
    const fullyCovered = balance >= afterEuropanBonus;
    if (!fullyCovered) {
      return res.status(402).json({
        error: en ? 'Your credit does not cover the full amount — EUROPAN can only be used here to pay in full.' : 'Guthaben deckt den Betrag nicht vollständig — EUROPAN kann hier nur als vollständige Zahlung eingesetzt werden.',
        balance,
        required: afterEuropanBonus,
      });
    }
    const amountToDebit = Math.max(0, afterEuropanBonus - doppelWumsBonus);
    const orderRef = `PC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // 3. Debit — PIN bereits oben verifiziert
    const debitRes = await fetch(`${NOBLE_API_URL}/api/v1/debit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${NOBLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, coin_id: 'europan', amount: amountToDebit,
        description: `PAN21counter Plus – erster Monat`, reference: orderRef,
      }),
    });
    if (!debitRes.ok) {
      const err = await debitRes.json().catch(() => ({}));
      return res.status(debitRes.status).json({ error: err.error || (en ? 'Payment failed' : 'Zahlung fehlgeschlagen') });
    }

    // 4. Affiliate/Bonus-Gutschrift beim Anbieter (doppel_wums, da vollständig in EUROPAN bezahlt)
    fetch(`${NOBLE_API_URL}/api/v1/affiliate-credit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${NOBLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyer_email: email, affiliate_ref: null, order_amount_eur: PRICE_EUR,
        coin_id_used: 'europan', doppel_wums: true, order_reference: orderRef,
      }),
    }).catch(() => {});

    // 5. Zentrale Aktivierung auslösen (gleiche Logik + Mail wie bei Stripe)
    const activateRes = await fetch(ACTIVATE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${INTERNAL_ACTIVATE_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ product: 'pan21counter', meta: { site_id: siteId, email } }),
    });
    if (!activateRes.ok) {
      console.error('Aktivierung fehlgeschlagen nach erfolgreicher Zahlung:', await activateRes.text());
      return res.status(200).json({ ok: true, warning: en ? 'Payment successful, but activation is delayed — please contact us.' : 'Zahlung erfolgreich, Aktivierung verzögert sich — bitte kontaktieren Sie uns.' });
    }

    res.status(200).json({ ok: true, amountCharged: amountToDebit, europanBonusApplied, doppelWumsBonus });
  } catch (err) {
    console.error('europan-pay error:', err);
    res.status(500).json({ error: en ? 'Unexpected error' : 'Unerwarteter Fehler' });
  }
}

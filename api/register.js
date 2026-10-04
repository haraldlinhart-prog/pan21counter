import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Fehlermeldungen pro Sprache (Default: Deutsch; die englische Seite /en sendet lang: 'en')
const MESSAGES = {
  de: {
    invalidEmail: 'Ungültige E-Mail',
    missingUrl: 'URL fehlt',
    invalidUrl: 'Ungültige URL',
    dbError: 'Datenbankfehler',
  },
  en: {
    invalidEmail: 'Invalid email address',
    missingUrl: 'Please enter your website URL',
    invalidUrl: 'Invalid URL',
    dbError: 'Database error. Please try again later.',
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.pan21counter.de');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { email, url, sitename, honeypot, elapsed } = req.body;
  const lang = (req.body && req.body.lang === 'en') || req.query?.lang === 'en' ? 'en' : 'de';
  const t = MESSAGES[lang];

  // Spam-Schutz
  if (honeypot && honeypot.trim() !== '') return res.status(200).json({ ok: true });
  if (!elapsed || Number(elapsed) < 3000) return res.status(200).json({ ok: true });
  if (email && email.split(' ').some(w => w.length > 60)) return res.status(200).json({ ok: true });

  if (!email || !email.includes('@')) return res.status(400).json({ error: t.invalidEmail });
  if (!url) return res.status(400).json({ error: t.missingUrl });

  // URL normalisieren
  let cleanUrl;
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    cleanUrl = u.hostname;
  } catch {
    return res.status(400).json({ error: t.invalidUrl });
  }

  // Site-ID generieren (6-stellig, Base36)
  const siteId = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();

  // Prüfen ob diese URL+Email schon existiert
  const { data: existing } = await supabase
    .from('pc_sites')
    .select('site_id')
    .eq('email', email)
    .eq('url', cleanUrl)
    .single();

  if (existing) {
    // Bestehende ID zurückgeben
    await sendConfirmationEmail(email, cleanUrl, sitename, existing.site_id, lang);
    return res.status(200).json({ ok: true, site_id: existing.site_id });
  }

  // Neue Site anlegen
  const { error } = await supabase.from('pc_sites').insert({
    site_id: siteId,
    email,
    url: cleanUrl,
    sitename: sitename || cleanUrl,
    created_at: new Date().toISOString(),
  });

  if (error) return res.status(500).json({ error: t.dbError });

  await sendConfirmationEmail(email, cleanUrl, sitename || cleanUrl, siteId, lang);
  return res.status(200).json({ ok: true, site_id: siteId });
}

async function buildToolsFooterHtml(excludeSlug, lang = 'de') {
  try {
    const res = await fetch('https://shop.pan21.com/api/webmaster-tools', { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    const tools = (data.tools || []).filter((t) => t.slug !== excludeSlug);
    if (tools.length === 0) return '';
    // Die Tool-Beschreibungen der Shop-API gibt es nur auf Deutsch -> in englischen Mails nur Name + Link
    const rows = tools.map((t) =>
      `<tr><td style="padding:4px 8px 4px 0;">${t.emoji}</td><td style="padding:4px 8px 4px 0;"><a href="${t.url}" style="color:#0d1f3c;font-weight:600;text-decoration:none;">${t.name}</a></td><td style="padding:4px 0;color:#6b7ca0;">${lang === 'en' ? '' : t.description}</td></tr>`
    ).join('');
    const heading = lang === 'en'
      ? 'Have you tried our other free webmaster tools?'
      : 'Kennen Sie schon unsere anderen kostenlosen Webmaster-Tools?';
    return `<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e8ecf2;">
      <p style="font-size:13px;color:#1a1a2e;font-weight:700;margin-bottom:8px;">${heading}</p>
      <table style="font-size:12px;border-collapse:collapse;">${rows}</table>
    </div>`;
  } catch (e) {
    return '';
  }
}

async function sendConfirmationEmail(email, url, sitename, siteId, lang = 'de') {
  const embedCode = `<div id="pan21counter"></div>\n<script src="https://www.pan21counter.de/c.js?id=${siteId}" async></script>`;
  const statsUrl = lang === 'en'
    ? `https://www.pan21counter.de/en/stats/${siteId}/`
    : `https://www.pan21counter.de/stats/${siteId}/`;
  const toolsFooter = await buildToolsFooterHtml('pan21counter', lang);
  const codeHtml = embedCode.replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const subject = lang === 'en'
    ? `Your counter code for ${sitename}`
    : `Ihr Zähler-Code für ${sitename}`;

  const html = lang === 'en' ? `
<div style="font-family:Arial,sans-serif;max-width:600px;color:#1a1a2e">
  <div style="background:#0d1f3c;padding:20px 24px;border-bottom:3px solid #b8860b">
    <h2 style="margin:0;color:#fff;font-size:18px">PAN21 Counter — your counter is ready</h2>
  </div>
  <div style="padding:24px;background:#f5f7fa;border:1px solid #e8ecf2">
    <p style="font-size:14px;line-height:1.6">Thanks for signing up! Your free visitor counter for <strong>${sitename}</strong> (${url}) is now active.</p>

    <h3 style="font-size:15px;color:#0d1f3c;margin-bottom:8px">1. Add this code to your website:</h3>
    <pre style="background:#1a1a2e;color:#c0e0ff;padding:16px;border-radius:4px;font-size:13px;overflow-x:auto">${codeHtml}</pre>

    <h3 style="font-size:15px;color:#0d1f3c;margin-top:20px;margin-bottom:8px">2. Your public stats page:</h3>
    <p style="font-size:14px"><a href="${statsUrl}" style="color:#b8860b">${statsUrl}</a></p>

    <p style="font-size:13px;color:#6b7ca0;margin-top:20px">Your counter ID: <strong>${siteId}</strong><br>
    The badge design is picked automatically based on your rank in the top list.</p>
    ${toolsFooter}
  </div>
  <div style="padding:12px 24px;background:#e8ecf2;font-size:11px;color:#6b7ca0">
    PAN21 Counter · pan21counter.de · A free service by PAN21.COM
  </div>
</div>` : `
<div style="font-family:Arial,sans-serif;max-width:600px;color:#1a1a2e">
  <div style="background:#0d1f3c;padding:20px 24px;border-bottom:3px solid #b8860b">
    <h2 style="margin:0;color:#fff;font-size:18px">PAN21 Counter — Ihr Zähler ist bereit</h2>
  </div>
  <div style="padding:24px;background:#f5f7fa;border:1px solid #e8ecf2">
    <p style="font-size:14px;line-height:1.6">Vielen Dank für Ihre Registrierung! Ihr kostenloser Besucherzähler für <strong>${sitename}</strong> (${url}) ist aktiviert.</p>

    <h3 style="font-size:15px;color:#0d1f3c;margin-bottom:8px">1. Einbindung — diesen Code in Ihre Seite einfügen:</h3>
    <pre style="background:#1a1a2e;color:#c0e0ff;padding:16px;border-radius:4px;font-size:13px;overflow-x:auto">${codeHtml}</pre>

    <h3 style="font-size:15px;color:#0d1f3c;margin-top:20px;margin-bottom:8px">2. Ihre öffentliche Statistik-Seite:</h3>
    <p style="font-size:14px"><a href="${statsUrl}" style="color:#b8860b">${statsUrl}</a></p>

    <p style="font-size:13px;color:#6b7ca0;margin-top:20px">Ihre Zähler-ID: <strong>${siteId}</strong><br>
    Das Badge-Design wählt sich automatisch nach Ihrem Rang in der Toplist.</p>
    ${toolsFooter}
  </div>
  <div style="padding:12px 24px;background:#e8ecf2;font-size:11px;color:#6b7ca0">
    PAN21 Counter · pan21counter.de · Ein kostenloser Service von PAN21.COM
  </div>
</div>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PAN21 Counter <noreply@pan21.com>',
      to: [email],
      reply_to: 'counter@pan21.com',
      subject,
      html,
    }),
  });
}

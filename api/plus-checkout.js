import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/plus-checkout  { site_id, email }
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://pan21counter.de');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { site_id, email } = req.body;
  if (!site_id || !email || !email.includes('@')) {
    return res.status(400).json({ error: 'site_id und gültige E-Mail erforderlich' });
  }

  const { data: site } = await supabase.from('pc_sites').select('site_id').eq('site_id', site_id).single();
  if (!site) return res.status(404).json({ error: 'Site nicht gefunden' });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{
      price_data: {
        currency: 'eur',
        recurring: { interval: 'month' },
        product_data: {
          name: 'PAN21counter Plus',
          description: '365-Tage-Historie, wöchentlicher E-Mail-Report, Badge ohne PAN21-Branding',
        },
        unit_amount: 99,
      },
      quantity: 1,
    }],
    metadata: { product: 'pan21counter', site_id, email },
    success_url: 'https://pan21counter.de/plus.html?success=1&site=' + site_id,
    cancel_url: 'https://pan21counter.de/plus.html?cancelled=1',
  });

  await supabase.from('pc_plus_subscribers').upsert(
    { site_id, email, status: 'pending' },
    { onConflict: 'site_id' }
  );

  res.status(200).json({ url: session.url });
}

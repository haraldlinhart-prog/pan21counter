import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { Resend } from 'resend';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export const config = { api: { bodyParser: false } };

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (c) => chunks.push(c));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let event;
  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { site_id, email } = session.metadata || {};
    if (site_id) {
      await supabase.from('pc_plus_subscribers').update({
        status: 'active',
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        activated_at: new Date().toISOString(),
      }).eq('site_id', site_id);

      try {
        await resend.emails.send({
          from: 'PAN21counter <noreply@pan21.com>',
          to: email,
          subject: 'PAN21counter Plus aktiviert',
          html: `<div style="font-family:sans-serif;line-height:1.6">
            <h2>PAN21counter Plus ist aktiv</h2>
            <p>Ihre Website <strong>${site_id}</strong> hat jetzt Zugriff auf:</p>
            <ul>
              <li>365-Tage-Statistik-Historie</li>
              <li>Wöchentlichen E-Mail-Report</li>
              <li>Badge ohne PAN21-Branding</li>
            </ul>
            <p>Statistiken: <a href="https://pan21counter.de/stats/${site_id}">pan21counter.de/stats/${site_id}</a></p>
          </div>`,
        });
      } catch (e) {
        console.error('Mail send error:', e);
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    await supabase.from('pc_plus_subscribers').update({ status: 'cancelled' }).eq('stripe_subscription_id', sub.id);
  }

  res.status(200).json({ received: true });
}

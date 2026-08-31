import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://pan21counter.de');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const password = req.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Alle registrierten Sites
  const { data: sites, error } = await supabase
    .from('pc_sites')
    .select('site_id, email, url, sitename, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Gesamt-Hits pro Site aus der Aggregat-Tabelle summieren (für Übersicht)
  const { data: allDaily } = await supabase
    .from('pc_daily_stats')
    .select('site_id, total_hits');

  const counts = {};
  (allDaily || []).forEach(r => { counts[r.site_id] = (counts[r.site_id] || 0) + (r.total_hits || 0); });

  const result = (sites || []).map(s => ({
    ...s,
    total_hits: counts[s.site_id] || 0,
  }));

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, count: result.length, sites: result });
}

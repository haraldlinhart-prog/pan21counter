import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://pan21counter.de');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const password = req.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') return handleList(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  return res.status(405).end();
}

async function handleList(req, res) {
  const { data: sites, error } = await supabase
    .from('pc_sites')
    .select('site_id, email, url, sitename, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

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

async function handleCreate(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { url, sitename, email } = body || {};

  if (!url) return res.status(400).json({ error: 'URL fehlt' });

  let cleanUrl;
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    cleanUrl = u.hostname;
  } catch {
    return res.status(400).json({ error: 'Ungültige URL' });
  }

  const adminEmail = (email && email.includes('@')) ? email : 'admin@pan21.com';

  // Prüfen ob URL bereits registriert ist (site_id ist unique, url selbst nicht zwingend,
  // daher hier zusätzlich prüfen um Duplikate zu vermeiden)
  const { data: existing } = await supabase
    .from('pc_sites')
    .select('site_id')
    .eq('url', cleanUrl)
    .maybeSingle();

  if (existing) {
    return res.status(200).json({ ok: true, site_id: existing.site_id, already_existed: true });
  }

  // Eindeutige Site-ID generieren (6-stellig, Base36, Kollisions-Check)
  let siteId;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
    const { data: clash } = await supabase
      .from('pc_sites')
      .select('site_id')
      .eq('site_id', candidate)
      .maybeSingle();
    if (!clash) { siteId = candidate; break; }
  }
  if (!siteId) return res.status(500).json({ error: 'Konnte keine eindeutige ID generieren' });

  const { error } = await supabase.from('pc_sites').insert({
    site_id: siteId,
    email: adminEmail,
    url: cleanUrl,
    sitename: sitename || cleanUrl,
    created_at: new Date().toISOString(),
  });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true, site_id: siteId });
}

async function handleDelete(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const site_id = req.query?.site_id || body?.site_id;
  if (!site_id) return res.status(400).json({ error: 'site_id fehlt' });

  const { error } = await supabase.from('pc_sites').delete().eq('site_id', site_id);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}

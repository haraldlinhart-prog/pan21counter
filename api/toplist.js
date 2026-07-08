import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const limit = Math.min(parseInt(req.query.limit || '10'), 100);

  // Heutiges Ranking direkt aus der Tages-Aggregat-Tabelle (schnell, keine Einzel-Hits noetig)
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('pc_daily_stats')
    .select('site_id, total_hits')
    .eq('date', todayStr)
    .throwOnError();

  if (error) return res.status(500).json({ error: error.message });

  const counts = {};
  (data || []).forEach(row => {
    counts[row.site_id] = row.total_hits;
  });

  // Site-Infos aus pc_sites holen
  const siteIds = Object.keys(counts);
  let sites = [];
  if (siteIds.length > 0) {
    const { data: siteData } = await supabase
      .from('pc_sites')
      .select('site_id, sitename, url')
      .in('site_id', siteIds);
    sites = siteData || [];
  }

  const siteMap = {};
  sites.forEach(s => { siteMap[s.site_id] = s; });

  // Sortieren und auf limit kürzen
  const ranked = Object.entries(counts)
    .map(([site_id, total_views]) => ({
      rank: 0,
      site_id,
      sitename: siteMap[site_id]?.sitename || site_id,
      url: siteMap[site_id]?.url || '',
      total_views,
    }))
    .sort((a, b) => b.total_views - a.total_views)
    .slice(0, limit)
    .map((item, i) => ({ ...item, rank: i + 1 }));

  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(200).json({ date: todayStr, limit, total_sites: siteIds.length, sites: ranked });
}

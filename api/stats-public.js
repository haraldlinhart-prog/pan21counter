import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  // Eigene Stats
  const { data, error } = await supabase.rpc('get_site_stats', { p_site_id: id });
  if (error) return res.status(500).json({ error: error.message });
  const stats = data?.[0] || { total_views: 0, total_unique: 0 };

  // Site-Info (Name + URL)
  const { data: siteInfo } = await supabase
    .from('pc_sites')
    .select('sitename, url')
    .eq('site_id', id)
    .single();

  // Letzte 30 Tage — aus der Tages-Aggregat-Tabelle (schnell, keine Einzel-Hit-Details noetig)
  const { data: daily } = await supabase
    .from('pc_daily_stats')
    .select('date, total_hits, unique_hits')
    .eq('site_id', id)
    .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
    .order('date', { ascending: true });

  const byDay = {};
  (daily || []).forEach(row => {
    byDay[row.date] = { views: row.total_hits, unique: row.unique_hits };
  });

  // Rang ermitteln: Gesamt-Hits pro Site aus der Aggregat-Tabelle summieren
  const { data: allDaily } = await supabase
    .from('pc_daily_stats')
    .select('site_id, total_hits');

  let rank = 0;
  if (allDaily) {
    const counts = {};
    allDaily.forEach(r => { counts[r.site_id] = (counts[r.site_id] || 0) + r.total_hits; });
    const myViews = stats.total_views;
    rank = Object.values(counts).filter(v => v > myViews).length + 1;
  }

  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(200).json({
    total_views:  stats.total_views,
    total_unique: stats.total_unique,
    sitename: siteInfo?.sitename || null,
    url:      siteInfo?.url || null,
    rank,
    daily: byDay,
  });
}

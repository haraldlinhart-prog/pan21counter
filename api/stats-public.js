import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Alle Tageszeilen einer Site seitenweise holen (PostgREST liefert max. 1000 Zeilen pro Abfrage)
async function fetchSiteDaily(id) {
  const rows = [];
  for (let from = 0; from < 100000; from += 1000) {
    const { data, error } = await supabase
      .from('pc_daily_stats')
      .select('date, total_hits, unique_hits')
      .eq('site_id', id)
      .order('date', { ascending: true })
      .range(from, from + 999);
    if (error || !data) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  // Zählerstand aus pc_hits (enthält nur die noch nicht archivierten Einzel-Hits)
  const { data, error } = await supabase.rpc('get_site_stats', { p_site_id: id });
  if (error) return res.status(500).json({ error: error.message });
  const hitStats = data?.[0] || { total_views: 0, total_unique: 0 };

  // Site-Info (Name + URL)
  const { data: siteInfo } = await supabase
    .from('pc_sites')
    .select('sitename, url')
    .eq('site_id', id)
    .single();

  // Gesamtzahlen seit Einbindung = Summe aller Tageswerte (Tages-Aggregat-Tabelle)
  const allDays = await fetchSiteDaily(id);
  let sumViews = 0;
  let sumUnique = 0;
  allDays.forEach(row => {
    sumViews += Number(row.total_hits) || 0;
    sumUnique += Number(row.unique_hits) || 0;
  });
  const totalViews = Math.max(sumViews, Number(hitStats.total_views) || 0);
  const totalUnique = Math.max(sumUnique, Number(hitStats.total_unique) || 0);

  // Letzte 30 Tage
  const fromDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const byDay = {};
  allDays.forEach(row => {
    if (row.date >= fromDate) byDay[row.date] = { views: row.total_hits, unique: row.unique_hits };
  });

  // Rang wie in der Toplist: nach Pageviews des heutigen Tages
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: today } = await supabase
    .from('pc_daily_stats')
    .select('site_id, total_hits')
    .eq('date', todayStr);

  let rank = 999;
  if (today) {
    const mine = today.find(r => r.site_id === id);
    const myToday = mine ? Number(mine.total_hits) || 0 : 0;
    if (myToday > 0) {
      rank = today.filter(r => (Number(r.total_hits) || 0) > myToday).length + 1;
    }
  }

  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(200).json({
    total_views:  totalViews,
    total_unique: totalUnique,
    sitename: siteInfo?.sitename || null,
    url:      siteInfo?.url || null,
    rank,
    daily: byDay,
  });
}

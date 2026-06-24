import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const { data, error } = await supabase.rpc('get_site_stats', { p_site_id: id });
  if (error) return res.status(500).json({ error: error.message });

  const stats = data?.[0] || { total_views: 0, total_unique: 0 };

  // Letzte 30 Tage für Grafik
  const { data: daily } = await supabase
    .from('pc_hits')
    .select('date, is_unique')
    .eq('site_id', id)
    .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
    .order('date', { ascending: true });

  // Aggregieren
  const byDay = {};
  (daily || []).forEach(row => {
    if (!byDay[row.date]) byDay[row.date] = { views: 0, unique: 0 };
    byDay[row.date].views++;
    if (row.is_unique) byDay[row.date].unique++;
  });

  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(200).json({
    total_views: stats.total_views,
    total_unique: stats.total_unique,
    daily: byDay,
  });
}

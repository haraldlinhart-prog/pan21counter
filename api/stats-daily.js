import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Liefert Tages-Gesamtzahlen (nicht die Einzel-Hit-Details) für Statistikkurven.
// GET /api/stats-daily              -> Netzwerk-Gesamt (alle Sites summiert), letzte 30 Tage
// GET /api/stats-daily?id=PA001     -> nur diese Site
// GET /api/stats-daily?days=90      -> anderer Zeitraum (max 365)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query;
  const days = Math.min(parseInt(req.query.days || '30'), 365);
  const fromDate = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);

  let query = supabase
    .from('pc_daily_stats')
    .select(id ? 'date, total_hits, unique_hits' : 'date, total_hits, unique_hits, site_id')
    .gte('date', fromDate)
    .order('date', { ascending: true });

  if (id) query = query.eq('site_id', id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let series;
  if (id) {
    series = data || [];
  } else {
    // Netzwerkweit: pro Tag über alle Sites summieren
    const byDate = {};
    (data || []).forEach(row => {
      if (!byDate[row.date]) byDate[row.date] = { date: row.date, total_hits: 0, unique_hits: 0 };
      byDate[row.date].total_hits += row.total_hits;
      byDate[row.date].unique_hits += row.unique_hits;
    });
    series = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }

  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).json({
    site_id: id || 'ALL',
    days,
    from: fromDate,
    series, // [{ date, total_hits, unique_hits }, ...] -- fertig für eine Kurve/Chart
  });
}

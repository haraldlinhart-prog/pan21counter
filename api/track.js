import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing site id' });

  // IP-Hash für Unique-Visitor (kein personenbezogenes Datum gespeichert)
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const ipHash = crypto.createHash('sha256').update(ip + today + id).digest('hex').slice(0, 16);

  // Bot-Filter: keine üblichen Crawler tracken
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const isBot = /bot|crawl|spider|slurp|search|preview|fetch|curl|wget|python|java|go-http/.test(ua);

  if (!isBot) {
    // Pageview immer zählen
    await supabase.from('pc_hits').insert({
      site_id: id,
      ip_hash: ipHash,
      date: today,
      is_unique: false, // wird unten bestimmt
    });

    // Unique: gibt es diesen ip_hash heute schon?
    const { count } = await supabase
      .from('pc_hits')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', id)
      .eq('ip_hash', ipHash)
      .eq('date', today);

    // Wenn dieser Hit der erste heute ist → unique
    if (count === 1) {
      await supabase
        .from('pc_hits')
        .update({ is_unique: true })
        .eq('site_id', id)
        .eq('ip_hash', ipHash)
        .eq('date', today)
        .order('created_at', { ascending: true })
        .limit(1);
    }
  }

  // Gesamtzahlen für Badge zurückgeben
  const { data: stats } = await supabase.rpc('get_site_stats', { p_site_id: id });

  // 1x1 Transparentes GIF zurückgeben (Tracking-Pixel)
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('X-Views', stats?.[0]?.total_views || 0);
  res.setHeader('X-Unique', stats?.[0]?.total_unique || 0);
  res.status(200).send(gif);
}

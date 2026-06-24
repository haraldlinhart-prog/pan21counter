import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// In-Memory Rate Limit: IP-Hash → letzter Timestamp
// Vercel Functions sind kurzlebig, aber das reicht für den häufigsten Fall
const rateLimitCache = new Map();
const RATE_LIMIT_MS = 30000; // 30 Sekunden zwischen Pageviews pro IP+Site

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing site id' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  const ipHash = crypto.createHash('sha256').update(ip + today + id).digest('hex').slice(0, 16);

  // Bot-Filter
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const isBot = /bot|crawl|spider|slurp|search|preview|fetch|curl|wget|python|java|go-http/.test(ua);

  // Gesamtzahlen immer holen (für Badge)
  const { data: stats } = await supabase.rpc('get_site_stats', { p_site_id: id });

  if (!isBot) {
    // Rate Limit prüfen: gleiche IP+Site nicht öfter als alle 30s tracken
    const rateLimitKey = ipHash + ':' + id;
    const lastHit = rateLimitCache.get(rateLimitKey);
    const now = Date.now();

    if (!lastHit || (now - lastHit) >= RATE_LIMIT_MS) {
      rateLimitCache.set(rateLimitKey, now);

      // Cache nicht unbegrenzt wachsen lassen
      if (rateLimitCache.size > 5000) {
        const oldest = [...rateLimitCache.entries()]
          .sort((a, b) => a[1] - b[1])
          .slice(0, 1000)
          .map(e => e[0]);
        oldest.forEach(k => rateLimitCache.delete(k));
      }

      // Pageview eintragen
      await supabase.from('pc_hits').insert({
        site_id: id,
        ip_hash: ipHash,
        date: today,
        is_unique: false,
      });

      // Unique prüfen: gibt es diesen ip_hash heute schon?
      const { count } = await supabase
        .from('pc_hits')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', id)
        .eq('ip_hash', ipHash)
        .eq('date', today);

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
    // Wenn Rate Limit aktiv: Hit wird still ignoriert, Badge-Daten trotzdem zurückgegeben
  }

  // 1x1 Transparentes GIF
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('X-Views', stats?.[0]?.total_views || 0);
  res.setHeader('X-Unique', stats?.[0]?.total_unique || 0);
  res.status(200).send(gif);
}

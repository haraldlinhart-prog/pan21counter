import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function svgBadge(display, label, views) {
  const isTopTen     = label === 'TOP TEN';
  const isTopHundred = label === 'TOP HUNDRED';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80">
  <defs>
    <linearGradient id="silver" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8e8e8"/>
      <stop offset="40%" stop-color="#c8c8c8"/>
      <stop offset="100%" stop-color="#a0a0a0"/>
    </linearGradient>
    <linearGradient id="blueBtn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2255cc"/>
      <stop offset="100%" stop-color="#0033aa"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4488ff"/>
      <stop offset="100%" stop-color="#1144cc"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- Äußerer Rahmen -->
  <rect x="1" y="1" width="318" height="78" rx="8" ry="8" fill="url(#silver)" stroke="#888" stroke-width="1.5"/>
  <rect x="3" y="3" width="314" height="74" rx="6" ry="6" fill="none" stroke="#fff" stroke-width="1" opacity="0.5"/>
  <!-- PAN21 HITS -->
  <rect x="6" y="6" width="82" height="68" rx="4" ry="4" fill="url(#blueBtn)" stroke="#1133aa" stroke-width="1"/>
  <text x="47" y="32" font-family="Arial Black,Arial" font-size="16" font-weight="900" fill="white" text-anchor="middle" letter-spacing="1">PAN21</text>
  <text x="47" y="52" font-family="Arial Black,Arial" font-size="13" font-weight="700" fill="white" text-anchor="middle" letter-spacing="2">HITS</text>
  <!-- Label: TOP TEN oder TOP HUNDRED -->
  <text x="195" y="18" font-family="Arial" font-size="${isTopHundred ? '8' : '9'}" font-weight="700" fill="#1144bb" text-anchor="middle" letter-spacing="${isTopHundred ? '2' : '3'}">${label}</text>
  <!-- LED-Display -->
  <rect x="94" y="22" width="170" height="38" rx="3" ry="3" fill="#0a0a0a" stroke="#333" stroke-width="1"/>
  <rect x="95" y="23" width="168" height="36" rx="2" ry="2" fill="#050510"/>
  <text x="180" y="51" font-family="'Courier New',monospace" font-size="28" font-weight="700"
    fill="#ffffff" text-anchor="middle" letter-spacing="4" filter="url(#glow)">${display}</text>
  <!-- Balken -->
  <rect x="272" y="50" width="8" height="18" rx="1" fill="url(#bar)" opacity="0.7"/>
  <rect x="284" y="38" width="8" height="30" rx="1" fill="url(#bar)" opacity="0.85"/>
  <rect x="296" y="24" width="10" height="44" rx="1" fill="url(#bar)"/>
  <!-- Glanz -->
  <rect x="3" y="3" width="314" height="20" rx="6" ry="6" fill="white" opacity="0.12"/>
</svg>`;
}

export default async function handler(req, res) {
  const { id } = req.query;

  let views = 0;
  let rank  = 0;

  if (id) {
    // Pageviews dieser Site
    const { data } = await supabase.rpc('get_site_stats', { p_site_id: id });
    views = data?.[0]?.total_views || 0;

    // Rang ermitteln: wieviele Sites haben MEHR Views?
    const { count } = await supabase
      .from('pc_hits')
      .select('site_id', { count: 'exact', head: false })
      .neq('site_id', id);

    // Schnellere Variante: alle site_ids mit mehr Views zählen via RPC
    // Wir nutzen eine einfache Zählung über pc_sites
    const { data: allStats } = await supabase
      .from('pc_hits')
      .select('site_id');

    if (allStats) {
      const counts = {};
      allStats.forEach(r => { counts[r.site_id] = (counts[r.site_id] || 0) + 1; });
      const sorted = Object.values(counts).sort((a, b) => b - a);
      const myCount = counts[id] || 0;
      rank = sorted.findIndex(v => v <= myCount) + 1;
      if (rank === 0) rank = sorted.length + 1;
    }
  }

  const display = String(views).padStart(6, '0');

  // Badge-Typ nach Rang
  let label = 'TOP TEN';
  if (rank > 10 && rank <= 100) label = 'TOP HUNDRED';
  else if (rank > 100 || rank === 0) label = 'PAN21 NET';

  const svg = svgBadge(display, label, views);

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(svg);
}

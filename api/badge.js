import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Groß: TOP TEN / TOP HUNDRED (320x80) — mit Label oben
function svgLarge(display, label) {
  const labelSize = label === 'TOP HUNDRED' ? '8' : '9';
  const letterSpc = label === 'TOP HUNDRED' ? '2' : '3';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80">
  <defs>
    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e8e8e8"/><stop offset="40%" stop-color="#c8c8c8"/><stop offset="100%" stop-color="#a0a0a0"/></linearGradient>
    <linearGradient id="bb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2255cc"/><stop offset="100%" stop-color="#0033aa"/></linearGradient>
    <linearGradient id="br" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4488ff"/><stop offset="100%" stop-color="#1144cc"/></linearGradient>
    <filter id="gl"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect x="1" y="1" width="318" height="78" rx="8" ry="8" fill="url(#sg)" stroke="#888" stroke-width="1.5"/>
  <rect x="3" y="3" width="314" height="74" rx="6" ry="6" fill="none" stroke="#fff" stroke-width="1" opacity="0.5"/>
  <rect x="6" y="6" width="82" height="68" rx="4" ry="4" fill="url(#bb)" stroke="#1133aa" stroke-width="1"/>
  <text x="47" y="32" font-family="Arial Black,Arial" font-size="16" font-weight="900" fill="white" text-anchor="middle" letter-spacing="1">PAN21</text>
  <text x="47" y="52" font-family="Arial Black,Arial" font-size="13" font-weight="700" fill="white" text-anchor="middle" letter-spacing="2">HITS</text>
  <text x="195" y="18" font-family="Arial" font-size="${labelSize}" font-weight="700" fill="#1144bb" text-anchor="middle" letter-spacing="${letterSpc}">${label}</text>
  <rect x="94" y="22" width="170" height="38" rx="3" ry="3" fill="#0a0a0a" stroke="#333" stroke-width="1"/>
  <rect x="95" y="23" width="168" height="36" rx="2" ry="2" fill="#050510"/>
  <text x="180" y="51" font-family="'Courier New',monospace" font-size="28" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="4" filter="url(#gl)">${display}</text>
  <rect x="272" y="50" width="8" height="18" rx="1" fill="url(#br)" opacity="0.7"/>
  <rect x="284" y="38" width="8" height="30" rx="1" fill="url(#br)" opacity="0.85"/>
  <rect x="296" y="24" width="10" height="44" rx="1" fill="url(#br)"/>
  <rect x="3" y="3" width="314" height="20" rx="6" ry="6" fill="white" opacity="0.12"/>
</svg>`;
}

// Klein: Rang 101+ (280x60) — kein Label, kompakter
function svgSmall(display) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="60" viewBox="0 0 280 60">
  <defs>
    <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e8e8e8"/><stop offset="40%" stop-color="#c8c8c8"/><stop offset="100%" stop-color="#a0a0a0"/></linearGradient>
    <linearGradient id="bb2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2255cc"/><stop offset="100%" stop-color="#0033aa"/></linearGradient>
    <linearGradient id="br2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4488ff"/><stop offset="100%" stop-color="#1144cc"/></linearGradient>
    <filter id="gl2"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <!-- Rahmen -->
  <rect x="1" y="1" width="278" height="58" rx="6" ry="6" fill="url(#sg2)" stroke="#888" stroke-width="1.5"/>
  <rect x="2" y="2" width="276" height="56" rx="5" ry="5" fill="none" stroke="#fff" stroke-width="1" opacity="0.45"/>
  <!-- PAN21 HITS Block -->
  <rect x="5" y="5" width="76" height="50" rx="3" ry="3" fill="url(#bb2)" stroke="#1133aa" stroke-width="1"/>
  <text x="43" y="26" font-family="Arial Black,Arial" font-size="14" font-weight="900" fill="white" text-anchor="middle" letter-spacing="0.5">PAN21</text>
  <text x="43" y="43" font-family="Arial Black,Arial" font-size="11" font-weight="700" fill="white" text-anchor="middle" letter-spacing="2">HITS</text>
  <!-- LED Display — kein Label, direkt ab oben -->
  <rect x="87" y="8" width="148" height="44" rx="3" ry="3" fill="#0a0a0a" stroke="#333" stroke-width="1"/>
  <rect x="88" y="9" width="146" height="42" rx="2" ry="2" fill="#050510"/>
  <text x="161" y="39" font-family="'Courier New',monospace" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="3" filter="url(#gl2)">${display}</text>
  <!-- Balken rechts (kleiner) -->
  <rect x="243" y="40" width="6" height="14" rx="1" fill="url(#br2)" opacity="0.65"/>
  <rect x="253" y="30" width="6" height="24" rx="1" fill="url(#br2)" opacity="0.82"/>
  <rect x="263" y="18" width="8" height="36" rx="1" fill="url(#br2)"/>
  <!-- Glanz -->
  <rect x="2" y="2" width="276" height="14" rx="5" ry="5" fill="white" opacity="0.11"/>
</svg>`;
}

export default async function handler(req, res) {
  const { id } = req.query;

  let views = 0;
  let rank  = 999;

  if (id) {
    const { data } = await supabase.rpc('get_site_stats', { p_site_id: id });
    views = data?.[0]?.total_views || 0;

    const { data: allHits } = await supabase.from('pc_hits').select('site_id');
    if (allHits) {
      const counts = {};
      allHits.forEach(r => { counts[r.site_id] = (counts[r.site_id] || 0) + 1; });
      const myViews = counts[id] || 0;
      rank = Object.values(counts).filter(v => v > myViews).length + 1;
    }
  }

  const display = String(views).padStart(6, '0');

  let svg;
  if (rank <= 10) {
    svg = svgLarge(display, 'TOP TEN');
  } else if (rank <= 100) {
    svg = svgLarge(display, 'TOP HUNDRED');
  } else {
    svg = svgSmall(display);
  }

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(svg);
}

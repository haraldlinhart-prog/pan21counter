import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { id, style } = req.query;

  let views = 0;
  if (id) {
    const { data } = await supabase.rpc('get_site_stats', { p_site_id: id });
    views = data?.[0]?.total_views || 0;
  }

  // Zahl formatieren: immer 6 Stellen mit führenden Nullen
  const display = String(views).padStart(6, '0');

  // LED-Segment-Darstellung via SVG Text (monospace, leuchtend)
  // Badge-Stil: "TOP TEN" = blau/silber wie im Bild
  const isDark = style === 'dark';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80">
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
    <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4488ff"/>
      <stop offset="100%" stop-color="#1144cc"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Äußerer Rahmen silber/grau -->
  <rect x="1" y="1" width="318" height="78" rx="8" ry="8" fill="url(#silver)" stroke="#888" stroke-width="1.5"/>
  <!-- Innerer Schatten oben -->
  <rect x="3" y="3" width="314" height="74" rx="6" ry="6" fill="none" stroke="#fff" stroke-width="1" opacity="0.5"/>

  <!-- PAN21 HITS Bereich links (blau) -->
  <rect x="6" y="6" width="82" height="68" rx="4" ry="4" fill="url(#blueBtn)" stroke="#1133aa" stroke-width="1"/>
  <text x="47" y="32" font-family="Arial Black, Arial" font-size="16" font-weight="900" fill="white" text-anchor="middle" letter-spacing="1">PAN21</text>
  <text x="47" y="52" font-family="Arial Black, Arial" font-size="13" font-weight="700" fill="white" text-anchor="middle" letter-spacing="2">HITS</text>

  <!-- TOP TEN Label -->
  <text x="195" y="18" font-family="Arial" font-size="9" font-weight="700" fill="#1144bb" text-anchor="middle" letter-spacing="3">TOP TEN</text>

  <!-- LED-Display Hintergrund -->
  <rect x="94" y="22" width="170" height="38" rx="3" ry="3" fill="#0a0a0a" stroke="#333" stroke-width="1"/>
  <!-- LED-Schein innen -->
  <rect x="95" y="23" width="168" height="36" rx="2" ry="2" fill="#050510"/>

  <!-- LED Ziffern -->
  <text x="180" y="51" font-family="'Courier New', monospace" font-size="28" font-weight="700"
    fill="#ffffff" text-anchor="middle" letter-spacing="4"
    filter="url(#glow)"
    style="font-feature-settings: 'tnum'">${display}</text>

  <!-- Balken-Diagramm rechts -->
  <rect x="272" y="50" width="8" height="18" rx="1" fill="url(#bar1)" opacity="0.7"/>
  <rect x="284" y="38" width="8" height="30" rx="1" fill="url(#bar1)" opacity="0.85"/>
  <rect x="296" y="24" width="10" height="44" rx="1" fill="url(#bar1)"/>

  <!-- Glanzeffekt oben -->
  <rect x="3" y="3" width="314" height="20" rx="6" ry="6" fill="white" opacity="0.12"/>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(svg);
}

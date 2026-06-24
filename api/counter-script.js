export default async function handler(req, res) {
  const { id, style } = req.query;

  if (!id) {
    res.setHeader('Content-Type', 'application/javascript');
    return res.status(200).send('/* pan21counter: missing id */');
  }

  const baseUrl = 'https://pan21counter.de';

  const script = `
(function() {
  var _p21id = '${id}';
  var _p21base = '${baseUrl}';

  // Tracking-Pixel
  var img = new Image();
  img.src = _p21base + '/track?id=' + _p21id + '&r=' + encodeURIComponent(document.referrer) + '&t=' + Date.now();

  // Badge rendern
  function renderBadge() {
    var el = document.getElementById('p21c-' + _p21id) || document.getElementById('pan21counter');
    if (!el) return;

    fetch(_p21base + '/api/stats-public?id=' + _p21id)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var views  = d.total_views  || 0;
        var unique = d.total_unique || 0;
        var rank   = d.rank || 999;

        // Badge-Label je nach Rang
        var label     = rank <= 10 ? 'TOP TEN' : rank <= 100 ? 'TOP HUNDRED' : 'PAN21 NET';
        var labelSize = label === 'TOP HUNDRED' ? '8' : '9';
        var letterSpc = label === 'TOP HUNDRED' ? '2' : '3';
        var display   = String(views).padStart(6, '0');

        var svgBadge = '<a href="' + _p21base + '/toplist" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none">'
          + '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="55" viewBox="0 0 320 80">'
          + '<defs>'
          + '<linearGradient id="p21sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e8e8e8"/><stop offset="40%" stop-color="#c8c8c8"/><stop offset="100%" stop-color="#a0a0a0"/></linearGradient>'
          + '<linearGradient id="p21bb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2255cc"/><stop offset="100%" stop-color="#0033aa"/></linearGradient>'
          + '<linearGradient id="p21br" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4488ff"/><stop offset="100%" stop-color="#1144cc"/></linearGradient>'
          + '<filter id="p21gl"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
          + '</defs>'
          + '<rect x="1" y="1" width="318" height="78" rx="8" fill="url(#p21sg)" stroke="#888" stroke-width="1.5"/>'
          + '<rect x="3" y="3" width="314" height="74" rx="6" fill="none" stroke="#fff" stroke-width="1" opacity="0.5"/>'
          + '<rect x="6" y="6" width="82" height="68" rx="4" fill="url(#p21bb)" stroke="#1133aa" stroke-width="1"/>'
          + '<text x="47" y="32" font-family="Arial Black,Arial" font-size="16" font-weight="900" fill="white" text-anchor="middle" letter-spacing="1">PAN21</text>'
          + '<text x="47" y="52" font-family="Arial Black,Arial" font-size="13" font-weight="700" fill="white" text-anchor="middle" letter-spacing="2">HITS</text>'
          + '<text x="195" y="18" font-family="Arial" font-size="' + labelSize + '" font-weight="700" fill="#1144bb" text-anchor="middle" letter-spacing="' + letterSpc + '">' + label + '</text>'
          + '<rect x="94" y="22" width="170" height="38" rx="3" fill="#0a0a0a" stroke="#333" stroke-width="1"/>'
          + '<rect x="95" y="23" width="168" height="36" rx="2" fill="#050510"/>'
          + '<text x="180" y="51" font-family="Courier New,monospace" font-size="28" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="4" filter="url(#p21gl)">' + display + '</text>'
          + '<rect x="272" y="50" width="8" height="18" rx="1" fill="url(#p21br)" opacity="0.7"/>'
          + '<rect x="284" y="38" width="8" height="30" rx="1" fill="url(#p21br)" opacity="0.85"/>'
          + '<rect x="296" y="24" width="10" height="44" rx="1" fill="url(#p21br)"/>'
          + '<rect x="3" y="3" width="314" height="20" rx="6" fill="white" opacity="0.12"/>'
          + '</svg></a>';

        el.innerHTML = svgBadge;
      })
      .catch(function() {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderBadge);
  } else {
    renderBadge();
  }
})();
`;

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(script);
}

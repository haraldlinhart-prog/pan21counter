export default async function handler(req, res) {
  const { id } = req.query;

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

  function renderBadge() {
    var el = document.getElementById('p21c-' + _p21id) || document.getElementById('pan21counter');
    if (!el) return;

    fetch(_p21base + '/api/stats-public?id=' + _p21id)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var views   = d.total_views  || 0;
        var rank    = d.rank || 999;
        var display = String(views).padStart(6, '0');

        var svg;

        if (rank <= 100) {
          // GROSS: TOP TEN oder TOP HUNDRED
          var label     = rank <= 10 ? 'TOP TEN' : 'TOP HUNDRED';
          var labelSize = rank <= 10 ? '9' : '8';
          var letterSpc = rank <= 10 ? '3' : '2';
          svg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80">'
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
            + '<text x="180" y="51" font-family="Courier New,monospace" font-size="28" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="4" filter="url(#p21gl)">' + display + '</text>'
            + '<rect x="272" y="50" width="8" height="18" rx="1" fill="url(#p21br)" opacity="0.7"/>'
            + '<rect x="284" y="38" width="8" height="30" rx="1" fill="url(#p21br)" opacity="0.85"/>'
            + '<rect x="296" y="24" width="10" height="44" rx="1" fill="url(#p21br)"/>'
            + '<rect x="3" y="3" width="314" height="20" rx="6" fill="white" opacity="0.12"/>'
            + '</svg>';
        } else {
          // KLEIN: Rang 101+ — kein Label, kompakteres Format
          svg = '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="60" viewBox="0 0 280 60">'
            + '<defs>'
            + '<linearGradient id="p21sg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e8e8e8"/><stop offset="40%" stop-color="#c8c8c8"/><stop offset="100%" stop-color="#a0a0a0"/></linearGradient>'
            + '<linearGradient id="p21bb2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2255cc"/><stop offset="100%" stop-color="#0033aa"/></linearGradient>'
            + '<linearGradient id="p21br2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4488ff"/><stop offset="100%" stop-color="#1144cc"/></linearGradient>'
            + '<filter id="p21gl2"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            + '</defs>'
            + '<rect x="1" y="1" width="278" height="58" rx="6" fill="url(#p21sg2)" stroke="#888" stroke-width="1.5"/>'
            + '<rect x="2" y="2" width="276" height="56" rx="5" fill="none" stroke="#fff" stroke-width="1" opacity="0.45"/>'
            + '<rect x="5" y="5" width="76" height="50" rx="3" fill="url(#p21bb2)" stroke="#1133aa" stroke-width="1"/>'
            + '<text x="43" y="26" font-family="Arial Black,Arial" font-size="14" font-weight="900" fill="white" text-anchor="middle" letter-spacing="0.5">PAN21</text>'
            + '<text x="43" y="43" font-family="Arial Black,Arial" font-size="11" font-weight="700" fill="white" text-anchor="middle" letter-spacing="2">HITS</text>'
            + '<rect x="87" y="8" width="148" height="44" rx="3" fill="#0a0a0a" stroke="#333" stroke-width="1"/>'
            + '<rect x="88" y="9" width="146" height="42" rx="2" fill="#050510"/>'
            + '<text x="161" y="39" font-family="Courier New,monospace" font-size="26" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="3" filter="url(#p21gl2)">' + display + '</text>'
            + '<rect x="243" y="40" width="6" height="14" rx="1" fill="url(#p21br2)" opacity="0.65"/>'
            + '<rect x="253" y="30" width="6" height="24" rx="1" fill="url(#p21br2)" opacity="0.82"/>'
            + '<rect x="263" y="18" width="8" height="36" rx="1" fill="url(#p21br2)"/>'
            + '<rect x="2" y="2" width="276" height="14" rx="5" fill="white" opacity="0.11"/>'
            + '</svg>';
        }

        el.innerHTML = '<a href="' + _p21base + '/toplist" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none">' + svg + '</a>';
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

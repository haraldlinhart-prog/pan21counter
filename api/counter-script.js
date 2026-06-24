export default async function handler(req, res) {
  const { id, style } = req.query;

  if (!id) {
    res.setHeader('Content-Type', 'application/javascript');
    return res.status(200).send('/* pan21counter: missing id */');
  }

  const baseUrl = 'https://pan21counter.de';
  const badgeStyle = style || 'classic'; // classic | minimal | dark

  const script = `
(function() {
  var _p21id = '${id}';
  var _p21base = '${baseUrl}';

  // Tracking-Pixel senden
  var img = new Image();
  img.src = _p21base + '/track?id=' + _p21id + '&r=' + encodeURIComponent(document.referrer) + '&t=' + Date.now();

  // Badge rendern sobald DOM bereit
  function renderBadge() {
    var el = document.getElementById('p21c-' + _p21id) || document.getElementById('pan21counter');
    if (!el) return;

    fetch(_p21base + '/api/stats-public?id=' + _p21id)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var views = d.total_views || 0;
        var unique = d.total_unique || 0;

        var style = ${JSON.stringify(badgeStyle)} === 'dark'
          ? 'background:#1a1a2e;color:#fff;border:1px solid #333;'
          : ${JSON.stringify(badgeStyle)} === 'minimal'
          ? 'background:transparent;color:#555;border:none;'
          : 'background:#f5f7fa;color:#1a1a2e;border:1px solid #d0d7de;';

        el.innerHTML =
          '<a href="${baseUrl}/stats/' + _p21id + '" target="_blank" rel="noopener" ' +
          'style="display:inline-flex;align-items:center;gap:8px;padding:4px 10px;border-radius:4px;font-family:Arial,sans-serif;font-size:12px;text-decoration:none;' + style + '">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>' +
          '<span title="Pageviews">' + views.toLocaleString() + '</span>' +
          '<span style="opacity:.4">|</span>' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>' +
          '<span title="Unique Visitors">' + unique.toLocaleString() + '</span>' +
          '</a>';
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

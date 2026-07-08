// Aggregiert aktuelle deutsche Wirtschaftsnews aus mehreren RSS-Feeds
// (inkl. Bild-URL aus <enclosure>) und liefert sie als JSON, im
// Stil eines Feedzy-Grids fuer die Frontend-Section auf pan21counter.de.

const FEEDS = [
  { url: 'https://www.handelsblatt.com/contentexport/feed/schlagzeilen', source: 'Handelsblatt' },
  { url: 'https://www.wiwo.de/contentexport/feed/rss/schlagzeilen', source: 'WirtschaftsWoche' },
];

function decodeEntities(str) {
  return (str || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decodeEntities(m[1]) : '';
}

function extractImage(block) {
  const enclosure = block.match(/<enclosure[^>]*url="([^"]+)"[^>]*>/i);
  if (enclosure) return enclosure[1];
  const media = block.match(/<media:content[^>]*url="([^"]+)"[^>]*>/i);
  if (media) return media[1];
  const imgTag = block.match(/<img[^>]*src="([^"]+)"/i);
  if (imgTag) return imgTag[1];
  return null;
}

function parseFeed(xml, source) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items.map((block) => {
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const description = extractTag(block, 'description')
      .replace(/<[^>]+>/g, '')
      .trim();
    const pubDateRaw = extractTag(block, 'pubDate');
    const pubDate = pubDateRaw ? new Date(pubDateRaw).toISOString() : null;
    const image = extractImage(block);
    return { title, link, description, pubDate, image, source };
  }).filter((item) => item.title && item.link);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const limit = Math.min(parseInt(req.query.limit || '9', 10) || 9, 30);
  const onlyWithImage = req.query.images !== '0';

  try {
    const results = await Promise.allSettled(
      FEEDS.map(async (feed) => {
        const r = await fetch(feed.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PAN21CounterNewsBot/1.0)' },
        });
        if (!r.ok) throw new Error(`${feed.source}: HTTP ${r.status}`);
        const xml = await r.text();
        return parseFeed(xml, feed.source);
      })
    );

    let items = [];
    results.forEach((r) => {
      if (r.status === 'fulfilled') items = items.concat(r.value);
    });

    if (onlyWithImage) items = items.filter((i) => i.image);

    items.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
    items = items.slice(0, limit);

    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=600, stale-while-revalidate=1800');
    res.status(200).json({ updated: new Date().toISOString(), count: items.length, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

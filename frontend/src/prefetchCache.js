export const bookCache = {};

export function prefetchBook(slug) {
  if (!slug || bookCache[slug]) return;
  bookCache[slug] = fetch(`/api/books/${slug}`, { credentials: "include" })
    .then(r => r.ok ? r.json() : null)
    .catch(() => null);
  bookCache[slug].then(data => {
    const url = data?.images?.[0]?.web_webp_url || data?.images?.[0]?.web_url;
    if (url) new Image().src = url;
  });
}

let _configPromise = null;
export function getConfig() {
  if (!_configPromise) {
    _configPromise = fetch("/api/config")
      .then(r => r.json())
      .catch(() => ({ image_max_width: 900, title: "Spread" }));
  }
  return _configPromise;
}

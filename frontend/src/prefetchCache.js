export const bookCache = {};

export function prefetchBook(slug) {
  if (!slug || bookCache[slug]) return;
  bookCache[slug] = fetch(`/api/books/${slug}`, { credentials: "include" })
    .then(r => r.ok ? r.json() : null)
    .catch(() => null);
  bookCache[slug].then(data => {
    const img = data?.images?.[0];
    const dpr = window.devicePixelRatio || 1;
    const url = dpr >= 2
      ? (img?.avif_2000 || img?.url_2000 || img?.avif_1200 || img?.url_1200)
      : (img?.avif_1200 || img?.url_1200 || img?.avif_800 || img?.url_800);
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
import api from "./api";

export const bookCache = {};

export function getBook(slug) {
  if (!slug) return Promise.resolve(null);
  if (bookCache[slug]) return bookCache[slug];
  bookCache[slug] = api.public.getBook(slug).catch(() => null);
  return bookCache[slug];
}

export function prefetchBook(slug) {
  getBook(slug).then(data => {
    const img = data?.images?.[0];
    const dpr = window.devicePixelRatio || 1;
    const url = dpr >= 2
      ? (img?.avif_2000 || img?.url_2000 || img?.avif_1500 || img?.url_1500)
      : (img?.avif_1300 || img?.url_1300 || img?.avif_800 || img?.url_800);
    if (url) new Image().src = url;
  });
}

let _configPromise = null;
export function getConfig() {
  if (!_configPromise) {
    _configPromise = api.public.getConfig().catch(() => ({ image_max_width: 900, title: "Spread" }));
  }
  return _configPromise;
}

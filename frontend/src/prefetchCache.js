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

let _avifSupport = null;
export function avifSupported() {
  if (!_avifSupport) {
    _avifSupport = new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img.width === 1);
      img.onerror = () => resolve(false);
      img.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAACEgABAAAANWlpbmYAAAAAAAEAAAAVaW5mZQIAAAAAAQAAYXYwMQAAAABnaXBycAAAAEhpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAMYXYxQ4EAAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACdtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=";
    });
  }
  return _avifSupport;
}

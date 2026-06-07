export const WIDTHS = [400, 800, 1300, 1500, 2000, 3000, 4000];

// The largest resource that will actually be served for an image — ladder generation
// skips any rung >= the source width, so a small original may only ever produce e.g.
// a `_400` variant. Falls back to the stored original dimensions when no ladder rung
// exists (very small sources serve the raw file).
export function nativeDisplaySize(img) {
  for (const w of [...WIDTHS].reverse()) {
    if (img[`avif_${w}`] || img[`url_${w}`]) {
      return { width: w, height: Math.round(w * (img.height / img.width)) };
    }
  }
  return { width: img.width, height: img.height };
}

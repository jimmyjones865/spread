import { useState, useEffect, useRef } from "react";

export default function LazyImage({ src, webpSrc, avifSrcset, webpSrcset, imgSizes, eager, root, aspectRatio, style, onClick, fetchPriority }) {
  const [loaded, setLoaded] = useState(eager);
  const ref = useRef();

  useEffect(() => {
    if (eager || !src) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setLoaded(true); observer.disconnect(); } },
      { root: root?.current ?? null, rootMargin: "900px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src, eager, root]);

  if (!loaded) {
    return (
      <div
        ref={ref}
        onClick={onClick}
        style={{ width: "100%", aspectRatio, background: "var(--bg-elevated)", cursor: style?.cursor }}
      />
    );
  }

  const img = (
    <img
      src={(avifSrcset || webpSrcset || webpSrc) ? undefined : src}
      alt=""
      onClick={onClick}
      style={{ ...style, aspectRatio }}
      decoding="async"
      fetchPriority={fetchPriority}
    />
  );

  if (!avifSrcset && !webpSrcset && !webpSrc) return img;
  return (
    <picture>
      {avifSrcset && <source type="image/avif" srcSet={avifSrcset} sizes={imgSizes} />}
      {webpSrcset
        ? <source type="image/webp" srcSet={webpSrcset} sizes={imgSizes} />
        : webpSrc && <source type="image/webp" srcSet={webpSrc} />
      }
      {img}
    </picture>
  );
}

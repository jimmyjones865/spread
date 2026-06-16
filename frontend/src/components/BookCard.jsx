import { useRef, useEffect } from "react";
import { prefetchBook } from "../prefetchCache";

export default function BookCard({ book, onClick, priority = false }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          prefetchBook(book.slug);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [book.slug]);

  function preload() {
    const url = book.cover_avif_800 || book.cover_webp_800;
    if (url) new Image().src = url;
    prefetchBook(book.slug);
  }

  return (
    <div ref={cardRef} onClick={onClick} onMouseEnter={preload} style={{ cursor: "pointer" }}>
      <div style={{
        position: "relative", width: "100%", paddingBottom: "135%",
        background: "var(--bg-elevated)", borderRadius: "3px", overflow: "hidden",
        marginBottom: "0.5rem",
      }}>
        {book.cover_url ? (
          <picture>
            {book.cover_avif_400 && <source type="image/avif" srcSet={book.cover_avif_400} />}
            {book.cover_webp_400 && (
              <source type="image/webp" srcSet={book.cover_webp_400} />
            )}
            <img
              src={(book.cover_avif_400 || book.cover_webp_400) ? undefined : book.cover_url}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : undefined}
              decoding="async"
            />
          </picture>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "1.3125rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>
              {book.title.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 700, lineHeight: 1.3, marginBottom: "2px" }}>
        {book.title}
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
        {book.artist_name}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

export default function BookDetail() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [imageMaxWidth, setImageMaxWidth] = useState(900);
  const isMobile = useIsMobile();

  const rightRef = useRef(null);
  const leftRef = useRef(null);

  const bookSlugs = location.state?.slugs ?? null;
  const slugIdx = bookSlugs ? bookSlugs.indexOf(slug) : -1;
  const prevSlug = slugIdx > 0 ? bookSlugs[slugIdx - 1] : null;
  const nextSlug = slugIdx >= 0 && slugIdx < bookSlugs.length - 1 ? bookSlugs[slugIdx + 1] : null;

  function navigateBook(targetSlug) {
    navigate(`/books/${targetSlug}`, { state: { slugs: bookSlugs } });
  }

  useEffect(() => {
    window.scrollTo(0, 0);
    if (leftRef.current) leftRef.current.scrollTop = 0;
    if (rightRef.current) rightRef.current.scrollTop = 0;
  }, [slug]);

  useEffect(() => {
    fetch(`/api/books/${slug}`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(setBook)
      .catch(() => setNotFound(true));
  }, [slug]);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(d => {
      if (d.image_max_width) setImageMaxWidth(d.image_max_width);
    }).catch(() => {});
  }, []);

  // Keyboard navigation for lightbox
  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  useEffect(() => {
    if (lightboxIdx === null || !book) return;
    function onKey(e) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") setLightboxIdx(i => (i + 1) % book.images.length);
      if (e.key === "ArrowLeft") setLightboxIdx(i => (i - 1 + book.images.length) % book.images.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, book, closeLightbox]);

  if (notFound) {
    return (
      <div style={{ padding: "4rem 3rem", color: "var(--text-muted)" }}>
        Book not found.{" "}
        <Link to="/" style={{ color: "var(--accent)" }}>← Back to gallery</Link>
      </div>
    );
  }

  if (!book) return null;

  const imgWidths = book.images.map(i => i.width).filter(Boolean);
  const imgColWidth = imgWidths.length > 0
    ? Math.min(imageMaxWidth, Math.min(...imgWidths))
    : imageMaxWidth;

  const metadata = <BookMeta book={book} />;
  const imageList = book.images.map((img, idx) => (
    <img
      key={img.id}
      src={img.url}
      alt=""
      onClick={() => setLightboxIdx(idx)}
      style={{ width: "100%", height: "auto", display: "block", cursor: "zoom-in" }}
      loading="lazy"
    />
  ));
  const bookNav = (prevSlug || nextSlug) && (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 2rem 3rem" }}>
      {prevSlug
        ? <button onClick={() => navigateBook(prevSlug)} style={navBtn}>← Prev</button>
        : <span />}
      {nextSlug
        ? <button onClick={() => navigateBook(nextSlug)} style={navBtn}>Next →</button>
        : <span />}
    </div>
  );

  return (
    <>
      {/* Lightbox */}
      {lightboxIdx !== null && book.images.length > 0 && (
        <Lightbox
          images={book.images}
          idx={lightboxIdx}
          onClose={closeLightbox}
          onPrev={() => setLightboxIdx(i => (i - 1 + book.images.length) % book.images.length)}
          onNext={() => setLightboxIdx(i => (i + 1) % book.images.length)}
        />
      )}

      {isMobile ? (
        <div>
          <div style={{ padding: "1.5rem 1.5rem 2rem" }}>
            <div style={{ marginBottom: "0" }}>
              <Link to="/" style={backLink}>← Spread</Link>
            </div>
            {metadata}
          </div>
          <div>{imageList}</div>
          {bookNav}
        </div>
      ) : (
        <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
          {/* Left — metadata */}
          <div ref={leftRef} className="no-scrollbar" style={{ width: "28%", minWidth: "240px", maxWidth: "360px", height: "100vh", overflowY: "auto", borderRight: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ padding: "2rem 2rem 3rem" }}>
              <div style={{ marginBottom: "0" }}>
                <Link to="/" style={backLink}>← Spread</Link>
              </div>
              {metadata}
            </div>
          </div>

          {/* Right — images */}
          <div ref={rightRef} className="no-scrollbar" style={{ flex: 1, overflowY: "auto", height: "100vh", maxWidth: imgColWidth }}>
            {imageList}
            {bookNav}
          </div>
        </div>
      )}
    </>
  );
}

function Lightbox({ images, idx, onClose, onPrev, onNext }) {
  const [zoomed, setZoomed] = useState(false);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const clickRatioRef = useRef(null);
  const multi = images.length > 1;

  // Reset zoom when image changes
  useEffect(() => setZoomed(false), [idx]);

  // After zooming in, scroll so the clicked spot stays centered
  useEffect(() => {
    if (!zoomed || !clickRatioRef.current || !containerRef.current || !imgRef.current) return;
    const { rx, ry } = clickRatioRef.current;
    clickRatioRef.current = null;
    const container = containerRef.current;
    const img = imgRef.current;
    requestAnimationFrame(() => {
      const naturalX = rx * img.naturalWidth;
      const naturalY = ry * img.naturalHeight;
      container.scrollLeft = Math.max(0, naturalX - container.clientWidth / 2);
      container.scrollTop = Math.max(0, img.offsetTop + naturalY - container.clientHeight / 2);
    });
  }, [zoomed]);

  return (
    <div
      ref={containerRef}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.93)",
        display: "flex",
        alignItems: zoomed ? "flex-start" : "center",
        justifyContent: zoomed ? "flex-start" : "center",
        overflow: zoomed ? "auto" : "hidden",
      }}
    >
      {/* Top bar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: "fixed", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0.9rem 1.25rem", pointerEvents: "none" }}
      >
        {multi && (
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em" }}>
            {idx + 1} / {images.length}
          </span>
        )}
        <div style={{ position: "absolute", right: "1.25rem", display: "flex", gap: "0.75rem", pointerEvents: "all" }}>
          <button
            onClick={e => { e.stopPropagation(); setZoomed(z => !z); }}
            style={topBtn}
            title={zoomed ? "Fit to screen" : "100% zoom"}
          >
            {zoomed ? "Fit" : "1:1"}
          </button>
          <button onClick={e => { e.stopPropagation(); onClose(); }} style={{ ...topBtn, fontSize: "20px" }}>×</button>
        </div>
      </div>

      {/* Prev */}
      {multi && (
        <button onClick={e => { e.stopPropagation(); onPrev(); }} style={arrowBtn("left")}>‹</button>
      )}

      {/* Image */}
      <img
        ref={imgRef}
        src={images[idx].url}
        alt=""
        onClick={e => {
          e.stopPropagation();
          if (!zoomed) {
            const rect = e.currentTarget.getBoundingClientRect();
            clickRatioRef.current = {
              rx: (e.clientX - rect.left) / rect.width,
              ry: (e.clientY - rect.top) / rect.height,
            };
          }
          setZoomed(z => !z);
        }}
        style={{
          display: "block",
          userSelect: "none",
          cursor: zoomed ? "zoom-out" : "zoom-in",
          ...(zoomed
            ? { width: "auto", height: "auto", maxWidth: "none", maxHeight: "none", margin: "3.5rem auto 2rem" }
            : { maxHeight: "92vh", maxWidth: "90vw", objectFit: "contain" }
          ),
        }}
      />

      {/* Next */}
      {multi && (
        <button onClick={e => { e.stopPropagation(); onNext(); }} style={arrowBtn("right")}>›</button>
      )}
    </div>
  );
}

function arrowBtn(side) {
  return {
    position: "absolute",
    [side]: "1.25rem",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.6)",
    fontSize: "48px",
    cursor: "pointer",
    lineHeight: 1,
    padding: "0 0.5rem",
    userSelect: "none",
  };
}

function BookMeta({ book }) {
  const pubYear = [book.publisher, book.year].filter(Boolean).join(" ");

  const editionParts = [];
  if (book.edition) {
    let ep = `${book.edition} Edition`;
    if (book.print_run) ep += ` of ${book.print_run}`;
    editionParts.push(ep);
  } else if (book.print_run) {
    editionParts.push(`Edition of ${book.print_run}`);
  }
  if (book.edition_year) editionParts.push(String(book.edition_year));
  if (book.copy_number != null) editionParts.push(`copy ${book.copy_number}`);
  if (book.signed) editionParts.push("signed");
  if (book.numbered && book.copy_number == null) editionParts.push("numbered");
  const editionLine = editionParts.join(", ");

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: "20px", fontWeight: 700, color: "var(--text-bright)", lineHeight: 1.3 }}>
        {book.title}
      </h1>
      <Link to={`/artists/${book.artist.slug}`} style={{ fontSize: "14px", color: "var(--accent)", textDecoration: "none", display: "block", marginBottom: "1rem" }}>
        {book.artist.name}
      </Link>

      <div style={{ marginBottom: "1.25rem", fontSize: "13px", color: "var(--text)", lineHeight: 1.7 }}>
        {pubYear && <div>{pubYear}</div>}
        {editionLine && <div>{editionLine}</div>}
        {book.language && <div>{book.language}</div>}
      </div>

      {book.description && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={sectionLabel}>Description</div>
          <p style={{ margin: "0.4rem 0 0", fontSize: "13px", color: "var(--text)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
            {book.description}
          </p>
        </div>
      )}

      {book.colophon && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={sectionLabel}>Colophon</div>
          <p style={{ margin: "0.4rem 0 0", fontSize: "13px", color: "var(--text)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
            {book.colophon}
          </p>
        </div>
      )}

      {book.isbn && (
        <div style={{ marginBottom: "1.25rem" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>ISBN {book.isbn}</span>
        </div>
      )}

      {book.links.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={sectionLabel}>Links</div>
          <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {book.links.map((lnk, i) => (
              <a key={i} href={lnk.url} target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: "var(--accent)" }}>
                {lnk.label || lnk.url}
              </a>
            ))}
          </div>
        </div>
      )}

      {book.tags.length > 0 && (
        <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {book.tags.map(tag => (
              <span key={tag} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const backLink = { fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" };
const navBtn = { background: "none", border: "none", padding: "0.5rem 0", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "13px", opacity: 0.6 };
const sectionLabel = { fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 500 };
const topBtn = { background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: "15px", cursor: "pointer", padding: "2px 4px", fontFamily: "var(--font-body)" };

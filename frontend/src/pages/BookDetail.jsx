import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import PublicFooter from "../components/PublicFooter";

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
  const [book, setBook] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const isMobile = useIsMobile();

  const rightRef = useRef(null);
  const leftInnerRef = useRef(null);

  useEffect(() => {
    fetch(`/api/books/${slug}`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(setBook)
      .catch(() => setNotFound(true));
  }, [slug]);

  // Scroll sync: left col "falls" into position as right col nears bottom
  useEffect(() => {
    const right = rightRef.current;
    const leftInner = leftInnerRef.current;
    if (!right || !leftInner || !book || isMobile) return;

    function sync() {
      const rightMax = right.scrollHeight - right.clientHeight;
      const leftOverflow = leftInner.offsetHeight - right.clientHeight;
      if (rightMax <= 0 || leftOverflow <= 0) {
        leftInner.style.transform = "translateY(0)";
        return;
      }
      const threshold = rightMax - leftOverflow;
      const translate = right.scrollTop <= threshold
        ? 0
        : Math.min(right.scrollTop - threshold, leftOverflow);
      leftInner.style.transform = `translateY(-${translate}px)`;
    }

    right.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(leftInner);
    ro.observe(right);
    return () => {
      right.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [book, isMobile]);

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
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1.5rem 1.5rem 2rem" }}>
            <Link to="/" style={backLink}>← Spread</Link>
            {metadata}
          </div>
          <div>{imageList}</div>
          <PublicFooter />
        </div>
      ) : (
        <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
          {/* Left — metadata */}
          <div style={{ width: "28%", minWidth: "240px", maxWidth: "360px", height: "100vh", overflow: "hidden", borderRight: "1px solid var(--border)", flexShrink: 0 }}>
            <div ref={leftInnerRef} style={{ padding: "2rem 2rem 3rem" }}>
              <Link to="/" style={backLink}>← Spread</Link>
              {metadata}
            </div>
          </div>

          {/* Right — images */}
          <div ref={rightRef} style={{ flex: 1, overflowY: "auto", height: "100vh" }}>
            {imageList}
          </div>
        </div>
      )}
    </>
  );
}

function Lightbox({ images, idx, onClose, onPrev, onNext }) {
  const multi = images.length > 1;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.93)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Counter */}
      {multi && (
        <div style={{ position: "absolute", top: "1.25rem", left: "50%", transform: "translateX(-50%)", fontSize: "13px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em" }}>
          {idx + 1} / {images.length}
        </div>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        style={{ position: "absolute", top: "1rem", right: "1.25rem", background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "24px", cursor: "pointer", lineHeight: 1 }}
      >
        ×
      </button>

      {/* Prev */}
      {multi && (
        <button
          onClick={e => { e.stopPropagation(); onPrev(); }}
          style={arrowBtn("left")}
        >
          ‹
        </button>
      )}

      {/* Image */}
      <img
        src={images[idx].url}
        alt=""
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "92vh", maxWidth: "90vw", objectFit: "contain", display: "block", userSelect: "none" }}
      />

      {/* Next */}
      {multi && (
        <button
          onClick={e => { e.stopPropagation(); onNext(); }}
          style={arrowBtn("right")}
        >
          ›
        </button>
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
  return (
    <div style={{ marginTop: "1.5rem" }}>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: "20px", fontWeight: 700, color: "var(--text-bright)", lineHeight: 1.3 }}>
        {book.title}
      </h1>
      <Link to={`/artists/${book.artist.slug}`} style={{ fontSize: "14px", color: "var(--accent)", textDecoration: "none", display: "block", marginBottom: "1.5rem" }}>
        {book.artist.name}
      </Link>

      <MetaRow label="Publisher" value={book.publisher} />
      <MetaRow label="Year" value={book.year} />
      <MetaRow label="Edition" value={book.edition} />
      <MetaRow label="Language" value={book.language} />
      <MetaRow label="ISBN" value={book.isbn} />
      {book.signed && <MetaRow label="Signed" value="Yes" />}
      {book.numbered && book.copy_number != null && (
        <MetaRow label="Copy" value={`${book.copy_number}${book.print_run ? ` / ${book.print_run}` : ""}`} />
      )}
      {book.numbered && book.copy_number == null && <MetaRow label="Numbered" value="Yes" />}

      {book.tags.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={sectionLabel}>Tags</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.4rem" }}>
            {book.tags.map(tag => (
              <span key={tag} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

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

      {book.links.length > 0 && (
        <div>
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
    </div>
  );
}

function MetaRow({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={sectionLabel}>{label}</span>
      <span style={{ fontSize: "13px", color: "var(--text)", marginLeft: "0.5rem" }}>{value}</span>
    </div>
  );
}

const backLink = { fontSize: "13px", color: "var(--text-muted)", textDecoration: "none", display: "block", marginBottom: "0" };
const sectionLabel = { fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 500 };

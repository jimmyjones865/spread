import useLightbox from "../hooks/useLightbox";

const topBtn = { background: "none", border: "none", color: "rgba(255,255,255,0.85)", fontSize: "15px", cursor: "pointer", padding: "2px 4px", fontFamily: "var(--font-body)" };

// Idle fade: ease out to a hint, but snap back instantly on input — a slow fade-in reads as lag.
function idleFade(idle) {
  return idle
    ? { opacity: 0.15, transition: "opacity 0.15s ease" }
    : { opacity: 1, transition: "none" };
}

export default function Lightbox({ images, idx, onClose, onPrev, onNext }) {
  const {
    containerRef, imgRef, closeButtonRef,
    multi,
    displayAvif, displayWebp, displaySrc,
    imgStyle,
    idle,
    handleTouchStart, handleTouchEnd,
    onImgClick,
  } = useLightbox(images, idx, onPrev, onNext);

  return (
    <div
      ref={containerRef}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.93)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: "fixed", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0.9rem 1.25rem", pointerEvents: "none" }}
      >
        {multi && (
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", ...idleFade(idle) }}>
            {idx + 1} / {images.length}
          </span>
        )}
        <div style={{ position: "absolute", right: "1.25rem", display: "flex", gap: "0.75rem", pointerEvents: "all" }}>
          <button
            ref={closeButtonRef}
            onClick={e => { e.stopPropagation(); onClose(); }}
            className="lightbox-close-btn"
            style={{ ...topBtn, fontSize: "20px", ...idleFade(idle) }}
            aria-label="Close image viewer"
          >×</button>
        </div>
      </div>

      {multi && (
        <button
          onClick={e => { e.stopPropagation(); onPrev(); }}
          style={arrowBtn("left", idle)}
          aria-label="Previous image"
        >‹</button>
      )}

      {(displayAvif || displayWebp) ? (
        <picture>
          {displayAvif && <source type="image/avif" srcSet={displayAvif} />}
          {displayWebp && <source type="image/webp" srcSet={displayWebp} />}
          <img ref={imgRef} src={undefined} alt="" onClick={onImgClick} style={imgStyle} decoding="async" />
        </picture>
      ) : (
        <img ref={imgRef} src={displaySrc} alt="" onClick={onImgClick} style={imgStyle} decoding="async" />
      )}

      {multi && (
        <button
          onClick={e => { e.stopPropagation(); onNext(); }}
          style={arrowBtn("right", idle)}
          aria-label="Next image"
        >›</button>
      )}
    </div>
  );
}

function arrowBtn(side, idle) {
  return {
    position: "fixed",
    [side]: "1.25rem",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 1,
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.6)",
    fontSize: "48px",
    cursor: "pointer",
    lineHeight: 1,
    padding: "0 0.5rem",
    userSelect: "none",
    ...idleFade(idle),
  };
}

import { useState, useEffect, useRef } from "react";

const topBtn = { background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: "15px", cursor: "pointer", padding: "2px 4px", fontFamily: "var(--font-body)" };

export default function Lightbox({ images, idx, onClose, onPrev, onNext }) {
  const [zoomed, setZoomed] = useState(false);
  const [displayAvif, setDisplayAvif] = useState(null);
  const [displayWebp, setDisplayWebp] = useState(null);
  const [displaySrc, setDisplaySrc] = useState(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const clickRatioRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const multi = images.length > 1;

  useEffect(() => {
    setZoomed(false);
    const cur = images[idx];

    // Pick ladder URL matching what the detail view would cache at this viewport/DPR.
    // detail sizes: "(min-width: 768px) 900px, 100vw" — mirror that here.
    const dpr = window.devicePixelRatio || 1;
    const sizesPx = window.innerWidth < 768 ? window.innerWidth : 900;
    const fitPx = sizesPx * dpr;
    const zoomPx = fitPx * 2;
    const WIDTHS = [400, 800, 1200, 2000, 3000, 4000];

    function bestUrl(img, minPx) {
      const w = WIDTHS.find(w => w >= minPx && (img[`avif_${w}`] || img[`url_${w}`]));
      if (w) return { avif: img[`avif_${w}`] || null, webp: img[`url_${w}`] || null };
      // image too small for minPx — use largest available ladder entry
      for (const fw of [...WIDTHS].reverse()) {
        if (img[`url_${fw}`]) return { avif: img[`avif_${fw}`] || null, webp: img[`url_${fw}`] };
      }
      return { avif: null, webp: null };
    }

    const fit = bestUrl(cur, fitPx);
    setDisplayAvif(fit.avif);
    setDisplayWebp(fit.webp || null);
    setDisplaySrc(cur.url);

    const zoom = bestUrl(cur, zoomPx);
    let cancelled = false;
    const upgradeImg = new Image();
    upgradeImg.onload = () => {
      if (cancelled) return;
      setDisplayAvif(zoom.avif);
      setDisplayWebp(zoom.webp || null);
      setDisplaySrc(cur.url);
    };
    upgradeImg.onerror = () => {
      if (cancelled || !zoom.webp) return;
      const fbImg = new Image();
      fbImg.onload = () => {
        if (cancelled) return;
        setDisplayAvif(null);
        setDisplayWebp(zoom.webp);
        setDisplaySrc(cur.url);
      };
      fbImg.src = zoom.webp;
    };
    upgradeImg.src = zoom.avif || zoom.webp || cur.url;

    // Preload neighbours at zoom size
    [idx - 1, idx + 1].forEach(i => {
      if (i >= 0 && i < images.length) {
        const adj = images[i];
        const adjZoom = bestUrl(adj, zoomPx);
        new Image().src = adjZoom.avif || adjZoom.webp || adj.url;
      }
    });
    return () => { cancelled = true; };
  }, [idx, images]);

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

  const imgStyle = {
    display: "block",
    userSelect: "none",
    cursor: zoomed ? "zoom-out" : "zoom-in",
    ...(zoomed
      ? { width: "auto", height: "auto", maxWidth: "none", maxHeight: "none", margin: "3.5rem auto 2rem" }
      : { maxHeight: "92vh", maxWidth: "90vw", objectFit: "contain" }
    ),
  };

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null || !multi || zoomed) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) onNext(); else onPrev();
    }
  }

  const onImgClick = e => {
    e.stopPropagation();
    if (!zoomed) {
      const rect = e.currentTarget.getBoundingClientRect();
      clickRatioRef.current = {
        rx: (e.clientX - rect.left) / rect.width,
        ry: (e.clientY - rect.top) / rect.height,
      };
    }
    setZoomed(z => !z);
  };

  return (
    <div
      ref={containerRef}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.93)",
        display: "flex",
        alignItems: zoomed ? "flex-start" : "center",
        justifyContent: zoomed ? "flex-start" : "center",
        overflow: zoomed ? "auto" : "hidden",
      }}
    >
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

      {multi && (
        <button onClick={e => { e.stopPropagation(); onPrev(); }} style={arrowBtn("left")}>‹</button>
      )}

      {(displayAvif || displayWebp) ? (
        <picture>
          {displayAvif && <source type="image/avif" srcSet={displayAvif} />}
          {displayWebp && <source type="image/webp" srcSet={displayWebp} />}
          <img ref={imgRef} src={displaySrc} alt="" onClick={onImgClick} style={imgStyle} decoding="async" />
        </picture>
      ) : (
        <img ref={imgRef} src={displaySrc} alt="" onClick={onImgClick} style={imgStyle} decoding="async" />
      )}

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

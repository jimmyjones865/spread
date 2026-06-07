import { useState, useEffect, useRef } from "react";

const topBtn = { background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: "15px", cursor: "pointer", padding: "2px 4px", fontFamily: "var(--font-body)" };

const WIDTHS = [400, 800, 1300, 1500, 2000, 3000, 4000];
// UPGRADE_STRETCH: true = fit image stretched to final display size (blurry→sharp on initial open)
const UPGRADE_STRETCH = true;

function bestUrl(img, minPx) {
  const w = WIDTHS.find(w => w >= minPx && (img[`avif_${w}`] || img[`url_${w}`]));
  if (w) return { avif: img[`avif_${w}`] || null, webp: img[`url_${w}`] || null };
  for (const fw of [...WIDTHS].reverse()) {
    if (img[`avif_${fw}`] || img[`url_${fw}`]) return { avif: img[`avif_${fw}`] || null, webp: img[`url_${fw}`] || null };
  }
  return { avif: null, webp: null };
}

function touchDist(a, b) {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}
function touchMid(a, b) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

// Keeps a scaled-up image from being panned entirely out of view: at scale s, the image
// overflows its container by (s-1)/2 per side, so that's the natural pan limit per axis.
function clampPanOffset(offset, scale, container) {
  if (!container || scale <= 1) return { x: 0, y: 0 };
  const maxX = (scale - 1) * container.clientWidth / 2;
  const maxY = (scale - 1) * container.clientHeight / 2;
  return {
    x: Math.max(-maxX, Math.min(maxX, offset.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.y)),
  };
}

// Tries avif, then webp, then the raw original — always resolves (never rejects) once something decodes.
// `probe` is the primary candidate's Image, used for a synchronous `.complete` check (cached vs cold).
function resolveDisplay(best, rawUrl) {
  function tryDecode(url, result) {
    const img = new Image();
    img.src = url;
    return { img, promise: img.decode().then(() => result) };
  }

  let primary;
  if (best.avif) primary = tryDecode(best.avif, { avif: best.avif, webp: null });
  else if (best.webp) primary = tryDecode(best.webp, { avif: null, webp: best.webp });
  else primary = tryDecode(rawUrl, { avif: null, webp: null });

  let chain = primary.promise;
  if (best.avif && best.webp) {
    chain = chain.catch(() => tryDecode(best.webp, { avif: null, webp: best.webp }).promise);
  }
  chain = chain.catch(() => ({ avif: null, webp: null }));

  return { probe: primary.img, ready: chain.then(r => ({ ...r, src: rawUrl })) };
}

export default function Lightbox({ images, idx, onClose, onPrev, onNext }) {
  const [zoomed, setZoomed] = useState(false);
  const [zoomOverflowsX, setZoomOverflowsX] = useState(false);
  const [zoomOverflowsY, setZoomOverflowsY] = useState(false);
  const [displayAvif, setDisplayAvif] = useState(null);
  const [displayWebp, setDisplayWebp] = useState(null);
  const [displaySrc, setDisplaySrc] = useState(null);
  const [lockedWidth, setLockedWidth] = useState(null);
  const [fitStyle, setFitStyle] = useState(null);
  const [pinchScale, setPinchScale] = useState(1);
  const [pinchOffset, setPinchOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const clickRatioRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const zoomedRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const multi = images.length > 1;

  zoomedRef.current = zoomed;

  useEffect(() => {
    const cur = images[idx];
    const isNav = hasLoadedRef.current;
    hasLoadedRef.current = true;

    pinchRef.current = null;
    panRef.current = null;
    setPinchScale(1);
    setPinchOffset({ x: 0, y: 0 });

    let fitStyleValue;
    if (UPGRADE_STRETCH && cur?.width && cur?.height) {
      const maxW = window.innerWidth;
      const maxH = window.innerHeight;
      const scale = Math.min(maxW / cur.width, maxH / cur.height, 1);
      fitStyleValue = { width: Math.round(cur.width * scale) + "px", height: Math.round(cur.height * scale) + "px" };
    } else {
      fitStyleValue = { maxHeight: "92vh", maxWidth: "90vw", objectFit: "contain" };
    }

    // detail sizes: "(min-width: 768px) 900px, 100vw" — mirror that here
    const dpr = window.devicePixelRatio || 1;
    const sizesPx = window.innerWidth < 768 ? window.innerWidth : 900;
    const fitPx = sizesPx * dpr;
    const zoomPx = fitPx * 2;

    const fit = bestUrl(cur, fitPx);
    const zoom = bestUrl(cur, zoomPx);
    const zoomSrc = zoom.avif || zoom.webp || cur.url;

    let cancelled = false;

    if (isNav) {
      // Navigation: race fit vs zoom decode, show whichever lands first, upgrade to zoom if fit won.
      // One rule covers every cache state — no thresholds, no special-casing:
      //   zoom already decoded  → wins the race instantly → shown directly
      //   only fit decoded      → fit wins → shown, zoom upgrades in when ready
      //   neither decoded (cold)→ both start fresh, fit (smaller) finishes first → same as above
      const fitR = resolveDisplay(fit, cur.url);
      const zoomR = resolveDisplay(zoom, cur.url);

      // Decode-only wait (bytes already cached) is imperceptible — keep the old image up, as before.
      // A real network fetch is needed for both — clear now so the lightbox doesn't look frozen.
      if (!(fitR.probe.complete || zoomR.probe.complete)) {
        setDisplayAvif(null);
        setDisplayWebp(null);
        setDisplaySrc(null);
      }

      function applyResolved(d) {
        if (cancelled) return;
        setZoomed(false);
        setLockedWidth(null);
        setFitStyle(fitStyleValue);
        setDisplayAvif(d.avif);
        setDisplayWebp(d.webp);
        setDisplaySrc(d.src);
      }

      function applyZoomUpgrade(d) {
        if (cancelled) return;
        if (zoomedRef.current && imgRef.current) {
          const w = imgRef.current.offsetWidth;
          if (w > 0) setLockedWidth(w);
        }
        setDisplayAvif(d.avif);
        setDisplayWebp(d.webp);
      }

      let winner = null;
      fitR.ready.then(d => {
        if (cancelled || winner) return;
        winner = "fit";
        applyResolved(d);
      });
      zoomR.ready.then(d => {
        if (cancelled) return;
        if (!winner) {
          winner = "zoom";
          applyResolved(d);
        } else if (winner === "fit") {
          winner = "zoom";
          applyZoomUpgrade(d);
        }
      });
    } else {
      // Initial open: show fit immediately, upgrade to zoom async
      setZoomed(false);
      setLockedWidth(null);
      setFitStyle(fitStyleValue);
      setDisplayAvif(fit.avif);
      setDisplayWebp(fit.webp || null);
      setDisplaySrc(cur.url);

      function applyUpgrade(avif, webp) {
        if (cancelled) return;
        if (zoomedRef.current && imgRef.current) {
          const w = imgRef.current.offsetWidth;
          if (w > 0) setLockedWidth(w);
        }
        setDisplayAvif(avif);
        setDisplayWebp(webp);
      }

      const upgradeImg = new Image();
      upgradeImg.src = zoomSrc;
      upgradeImg.decode()
        .then(() => applyUpgrade(zoom.avif, zoom.webp || null))
        .catch(() => {
          if (cancelled || !zoom.webp || zoomSrc === zoom.webp) return;
          const fbImg = new Image();
          fbImg.src = zoom.webp;
          fbImg.decode().then(() => applyUpgrade(null, zoom.webp)).catch(() => {});
        });
    }

    // Warm the decode cache for neighbours at both resolutions — whichever wins the race on next nav.
    [idx - 1, idx + 1].forEach(i => {
      if (i < 0 || i >= images.length) return;
      const adj = images[i];
      resolveDisplay(bestUrl(adj, fitPx), adj.url);
      resolveDisplay(bestUrl(adj, zoomPx), adj.url);
    });

    return () => { cancelled = true; };
  }, [idx, images]);

  // Native (non-passive) listener: React's synthetic touch handlers are passive,
  // so e.preventDefault() inside them can't stop the browser's own pinch-zoom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onTouchMove(e) {
      if (zoomedRef.current) return;

      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const [a, b] = e.touches;
        const { startDist, startScale, startMid, startOffset } = pinchRef.current;
        const scale = Math.min(4, Math.max(1, startScale * (touchDist(a, b) / startDist)));
        const mid = touchMid(a, b);
        const raw = scale > 1
          ? { x: startOffset.x + (mid.x - startMid.x), y: startOffset.y + (mid.y - startMid.y) }
          : { x: 0, y: 0 };
        setPinchScale(scale);
        setPinchOffset(clampPanOffset(raw, scale, el));
        return;
      }

      if (e.touches.length === 1 && panRef.current) {
        e.preventDefault();
        const t = e.touches[0];
        const { startX, startY, startOffset, scale } = panRef.current;
        const raw = { x: startOffset.x + (t.clientX - startX), y: startOffset.y + (t.clientY - startY) };
        setPinchOffset(clampPanOffset(raw, scale, el));
      }
    }
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  useEffect(() => {
    if (!zoomed || !clickRatioRef.current || !containerRef.current || !imgRef.current) return;
    const { rx, ry } = clickRatioRef.current;
    clickRatioRef.current = null;
    const container = containerRef.current;
    const img = imgRef.current;
    requestAnimationFrame(() => {
      const naturalX = rx * img.naturalWidth;
      const naturalY = ry * img.naturalHeight;
      // Only scroll axes that actually overflow — the other axis is centered via flex
      // alignment and has no scrollable range (assigning scrollLeft/Top there is a no-op
      // at best, but skipping it keeps the intent explicit).
      if (img.naturalWidth > container.clientWidth) {
        container.scrollLeft = Math.max(0, naturalX - container.clientWidth / 2);
      }
      if (img.naturalHeight > container.clientHeight) {
        container.scrollTop = Math.max(0, img.offsetTop + naturalY - container.clientHeight / 2);
      }
    });
  }, [zoomed]);

  const appliedFitStyle = fitStyle || { maxHeight: "92vh", maxWidth: "90vw", objectFit: "contain" };

  const imgStyle = {
    display: "block",
    userSelect: "none",
    cursor: zoomed ? "zoom-out" : "zoom-in",
    ...(zoomed
      ? { width: lockedWidth ? `${lockedWidth}px` : "auto", height: "auto", maxWidth: "none", maxHeight: "none", margin: "3.5rem auto 2rem" }
      : {
          ...appliedFitStyle,
          transform: `translate(${pinchOffset.x}px, ${pinchOffset.y}px) scale(${pinchScale})`,
          transition: (pinchRef.current || panRef.current) ? "none" : "transform 0.2s ease",
        }
    ),
  };

  function handleTouchStart(e) {
    if (e.touches.length === 2 && !zoomed) {
      const [a, b] = e.touches;
      pinchRef.current = {
        startDist: touchDist(a, b),
        startScale: pinchScale,
        startMid: touchMid(a, b),
        startOffset: pinchOffset,
      };
      panRef.current = null;
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    if (e.touches.length === 1 && pinchScale > 1 && !zoomed) {
      const t = e.touches[0];
      panRef.current = { startX: t.clientX, startY: t.clientY, startOffset: pinchOffset, scale: pinchScale };
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    // Lifted one finger mid-pinch while still zoomed in — hand off to single-finger panning.
    if (pinchRef.current && e.touches.length === 1 && pinchScale > 1) {
      const t = e.touches[0];
      pinchRef.current = null;
      panRef.current = { startX: t.clientX, startY: t.clientY, startOffset: pinchOffset, scale: pinchScale };
      return;
    }
    if (pinchRef.current && e.touches.length < 2) {
      pinchRef.current = null;
      if (pinchScale <= 1) {
        setPinchScale(1);
        setPinchOffset({ x: 0, y: 0 });
      } else {
        // Force a re-render so `transition` re-enables (was "none" mid-gesture, ref-driven).
        setPinchOffset(o => ({ ...o }));
      }
    }
    if (panRef.current && e.touches.length === 0) {
      panRef.current = null;
      setPinchOffset(o => ({ ...o }));
    }
    if (touchStartX.current === null || !multi || zoomed || pinchScale > 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) onNext(); else onPrev();
    }
  }

  // Zoom always shows the image at 1:1 (native pixel size). Whether that overflows the
  // viewport is just a fact about this image — it decides the positioning strategy, not
  // whether zooming "is allowed". Each axis is judged independently: a portrait image at
  // 1:1 may overflow vertically while still being narrower than the viewport — that axis
  // should stay centered, not anchored left. Only an overflowing axis gets top/left
  // anchoring + scroll-to-focal-point; a fitting axis is centered like the fit view.
  function startZoom(rx, ry) {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    pinchRef.current = null;
    panRef.current = null;
    setPinchScale(1);
    setPinchOffset({ x: 0, y: 0 });
    const overflowsX = img.naturalWidth > container.clientWidth;
    const overflowsY = img.naturalHeight > container.clientHeight;
    clickRatioRef.current = (overflowsX || overflowsY) ? { rx, ry } : null;
    setZoomOverflowsX(overflowsX);
    setZoomOverflowsY(overflowsY);
    setZoomed(true);
  }

  const onImgClick = e => {
    e.stopPropagation();
    if (pinchScale > 1) return;
    if (!zoomed) {
      const rect = e.currentTarget.getBoundingClientRect();
      startZoom((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
    } else {
      setLockedWidth(null);
      setZoomed(false);
    }
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
        // default flex-direction: row → justifyContent = horizontal (X), alignItems = vertical (Y)
        justifyContent: zoomed && zoomOverflowsX ? "flex-start" : "center",
        alignItems: zoomed && zoomOverflowsY ? "flex-start" : "center",
        overflow: zoomed && (zoomOverflowsX || zoomOverflowsY) ? "auto" : "hidden",
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
            onClick={e => {
              e.stopPropagation();
              if (zoomed) {
                setLockedWidth(null);
                setZoomed(false);
              } else {
                startZoom(0.5, 0.5);
              }
            }}
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
          <img ref={imgRef} src={undefined} alt="" onClick={onImgClick} style={imgStyle} decoding="async" />
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

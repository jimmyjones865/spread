import { useState, useEffect, useMemo, useRef } from "react";
import { nativeDisplaySize, WIDTHS } from "../utils/nativeDisplaySize";

// UPGRADE_STRETCH: true = fit image stretched to final display size (blurry→sharp on initial open)
const UPGRADE_STRETCH = true;
const DEFAULT_FIT_STYLE = { maxHeight: "92vh", maxWidth: "90vw", objectFit: "contain" };

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

// 1:1 zoom renders the image at its native pixel size via explicit width/height (no
// transform: scale, so offsetWidth IS the rendered size) — overflow per axis is half
// the difference between that native size and the viewport, the natural pan limit.
function clampZoomPanOffset(offset, img, container) {
  if (!img || !container) return { x: 0, y: 0 };
  const maxX = Math.max(0, (img.naturalWidth - container.clientWidth) / 2);
  const maxY = Math.max(0, (img.naturalHeight - container.clientHeight) / 2);
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

export default function useLightbox(images, idx, onPrev, onNext) {
  const [zoomed, setZoomed] = useState(false);
  const [displayAvif, setDisplayAvif] = useState(null);
  const [displayWebp, setDisplayWebp] = useState(null);
  const [displaySrc, setDisplaySrc] = useState(null);
  const [lockedWidth, setLockedWidth] = useState(null);
  const [pinchScale, setPinchScale] = useState(1);
  const [pinchOffset, setPinchOffset] = useState({ x: 0, y: 0 });
  // Resize: bumping viewportKey recomputes fitStyle (and clears lockedWidth, which is in
  // pixels and stale across viewport changes — rotate-the-phone-in-1:1-zoom fix).
  const [viewportKey, setViewportKey] = useState(0);
  // prefers-reduced-motion: when on, the fit-view transform transition is suppressed.
  const [reducedMotion, setReducedMotion] = useState(false);
  // Idle fade: chrome (counter, arrows, close button) dims to a hint after IDLE_MS with no input.
  const [idle, setIdle] = useState(false);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const closeButtonRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const zoomedRef = useRef(false);
  const hasLoadedRef = useRef(false);
  // Suppresses the fit view's transform transition for one render — set by click-driven
  // "snap to fit" actions (exitZoom/resetPinchZoom) so they jump instantly. Left enabled
  // for the natural pinch-release spring-back, which should animate smoothly.
  const instantRef = useRef(false);
  // Mirror of pinchScale for the wheel-zoom listener (which is mounted once and would
  // otherwise close over a stale state value).
  const pinchScaleRef = useRef(1);
  const multi = images.length > 1;

  zoomedRef.current = zoomed;

  // fitStyle is a pure function of (image dimensions, viewport size). Derived via useMemo
  // (not useState + setFitStyle in the big effect) so it updates on viewport resize without
  // re-running the decode/upgrade effect — that effect handles display state, not sizing.
  const fitStyle = useMemo(() => {
    const cur = images[idx];
    if (!UPGRADE_STRETCH || !cur?.width || !cur?.height) return null;
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const { width: nativeW, height: nativeH } = nativeDisplaySize(cur);
    const scale = Math.min(maxW / nativeW, maxH / nativeH, 1);
    return { width: Math.round(nativeW * scale) + "px", height: Math.round(nativeH * scale) + "px" };
    // viewportKey is bumped by the resize listener; reading it here makes the memo
    // recompute on every viewport change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, idx, viewportKey]);

  useEffect(() => {
    instantRef.current = false;
  }, [zoomed, pinchScale]);

  // Viewport resize: bump viewportKey (recomputes fitStyle via the memo) and clear
  // lockedWidth — it's a pixel measurement from the old viewport and is meaningless after
  // a resize (the user sees a fresh "1:1 zoom, centered" without the stale crop).
  useEffect(() => {
    function onResize() {
      setViewportKey(k => k + 1);
      setLockedWidth(null);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // prefers-reduced-motion: track the user's OS-level setting and skip the fit-view
  // transform transition when on. The instantRef mechanism still works for the click-driven
  // snap actions, which is what reduced-motion users want regardless.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = e => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Idle fade: dim the chrome (counter, arrows, close button) after IDLE_MS with no input.
  // Reset on touch / key / mouse activity. Window-level listeners catch activity anywhere
  // in the lightbox.
  useEffect(() => {
    const IDLE_MS = 1000;
    let timer = null;
    function reset() {
      setIdle(false);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), IDLE_MS);
    }
    reset();
    const events = ["touchstart", "touchmove", "keydown", "mousemove"];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => {
      if (timer) clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, []);

  // Focus management: move focus to the close button on open (so keyboard users land
  // somewhere inside the dialog), and restore focus to the previously-focused element on
  // close (so the user returns to where they were). rAF defers the focus call to after
  // the close button is in the DOM and focusable.
  useEffect(() => {
    const prev = document.activeElement;
    const id = requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, []);

  useEffect(() => {
    const cur = images[idx];
    const isNav = hasLoadedRef.current;
    hasLoadedRef.current = true;

    pinchRef.current = null;
    panRef.current = null;
    setPinchScale(1);
    setPinchOffset({ x: 0, y: 0 });

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
    // ±2 covers the two-step skip on the arrow keys and the two-step swipes.
    for (let offset = -2; offset <= 2; offset++) {
      if (offset === 0) continue;
      const k = idx + offset;
      if (k < 0 || k >= images.length) continue;
      const adj = images[k];
      resolveDisplay(bestUrl(adj, fitPx), adj.url);
      resolveDisplay(bestUrl(adj, zoomPx), adj.url);
    }

    return () => { cancelled = true; };
  }, [idx, images]);

  // Native (non-passive) listener: React's synthetic touch handlers are passive,
  // so e.preventDefault() inside them can't stop the browser's own pinch-zoom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onTouchMove(e) {
      if (zoomedRef.current) {
        if (e.touches.length === 1 && panRef.current) {
          e.preventDefault();
          const t = e.touches[0];
          const { startX, startY, startOffset } = panRef.current;
          const raw = { x: startOffset.x + (t.clientX - startX), y: startOffset.y + (t.clientY - startY) };
          setPinchOffset(clampZoomPanOffset(raw, imgRef.current, el));
        }
        return;
      }

      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const [a, b] = e.touches;
        const { startDist, startScale, startMid, startOffset } = pinchRef.current;
        // Rubber-band: allow the scale to overshoot [1, 4] by a third of the raw delta.
        // Hard cap at [0.7, 4.3] so a wild pinch can't fling the image to 10x.
        // On release, handleTouchEnd snaps back to 1 (under) or 4 (over).
        const raw = startScale * (touchDist(a, b) / startDist);
        let scale = raw;
        if (raw < 1) scale = 1 + (raw - 1) * 0.3;
        else if (raw > 4) scale = 4 + (raw - 4) * 0.3;
        scale = Math.max(0.7, Math.min(4.3, scale));
        const mid = touchMid(a, b);
        const offsetRaw = scale > 1
          ? { x: startOffset.x + (mid.x - startMid.x), y: startOffset.y + (mid.y - startMid.y) }
          : { x: 0, y: 0 };
        setPinchScale(scale);
        setPinchOffset(clampPanOffset(offsetRaw, scale, el));
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

  // Mirror pinchScale into a ref so the once-mounted wheel listener can read the
  // current value without re-attaching on every change.
  useEffect(() => { pinchScaleRef.current = pinchScale; }, [pinchScale]);

  // Wheel zoom (desktop): ctrl+wheel / cmd+wheel zooms the fit view, multiplicative like
  // pinch (deltaY sign matters: scroll up = zoom in). preventDefault stops the page from
  // scrolling. Resets pan on a full zoom-out (scale hits 1) so the image is centered.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.002);
      const next = pinchScaleRef.current * factor;
      const clamped = Math.max(1, Math.min(4, next));
      pinchScaleRef.current = clamped;
      setPinchScale(clamped);
      if (clamped === 1) setPinchOffset({ x: 0, y: 0 });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const appliedFitStyle = fitStyle || DEFAULT_FIT_STYLE;

  const imgStyle = {
    display: "block",
    userSelect: "none",
    cursor: zoomed ? "zoom-out" : "zoom-in",
    ...(zoomed
      ? {
          width: lockedWidth ? `${lockedWidth}px` : "auto", height: "auto", maxWidth: "none", maxHeight: "none", margin: "3.5rem auto 2rem",
          // No transition: the offset is always clamped during drag (never overshoots),
          // so there's no spring-back to animate — entering/exiting zoom should snap, not slide.
          transform: `translate(${pinchOffset.x}px, ${pinchOffset.y}px)`,
        }
      : {
          ...appliedFitStyle,
          transform: `translate(${pinchOffset.x}px, ${pinchOffset.y}px) scale(${pinchScale})`,
          transition: (pinchRef.current || panRef.current || instantRef.current || reducedMotion) ? "none" : "transform 0.2s ease",
        }
    ),
  };

  function handleTouchStart(e) {
    if (e.touches.length === 1 && zoomed) {
      const t = e.touches[0];
      panRef.current = { startX: t.clientX, startY: t.clientY, startOffset: pinchOffset };
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
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
      } else if (pinchScale > 4) {
        // Spring back from rubber-band over-zoom.
        setPinchScale(4);
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

  // Zoom always shows the image at 1:1 (native pixel size), centered, and panned via
  // `pinchOffset` (the same transform-based mechanism pinch-zoom uses). The clicked point
  // (rx, ry) — a ratio of the image's natural dimensions — is centered in the viewport,
  // clamped to the pan range so the image never gets dragged past its own edges.
  function startZoom(rx, ry) {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    pinchRef.current = null;
    panRef.current = null;
    setPinchScale(1);
    const target = { x: -(rx - 0.5) * img.naturalWidth, y: -(ry - 0.5) * img.naturalHeight };
    setPinchOffset(clampZoomPanOffset(target, img, container));
    setZoomed(true);
  }

  function exitZoom() {
    instantRef.current = true;
    setLockedWidth(null);
    setPinchOffset({ x: 0, y: 0 });
    setZoomed(false);
  }

  // Pinch-zoom has no "Fit" state of its own (it's a transient transform on top of the fit
  // view) — resetting it just clears the gesture state back to scale 1 / no offset.
  function resetPinchZoom() {
    instantRef.current = true;
    pinchRef.current = null;
    panRef.current = null;
    setPinchScale(1);
    setPinchOffset({ x: 0, y: 0 });
  }

  const onImgClick = e => {
    e.stopPropagation();
    if (pinchScale > 1) { resetPinchZoom(); return; }
    if (!zoomed) {
      const rect = e.currentTarget.getBoundingClientRect();
      startZoom((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
    } else {
      exitZoom();
    }
  };

  return {
    containerRef, imgRef, closeButtonRef,
    multi,
    zoomedIn: zoomed || pinchScale > 1,
    displayAvif, displayWebp, displaySrc,
    imgStyle,
    idle,
    handleTouchStart, handleTouchEnd,
    onImgClick,
  };
}

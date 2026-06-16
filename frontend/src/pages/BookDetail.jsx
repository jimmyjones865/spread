import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getBook, prefetchBook, getConfig } from "../prefetchCache";
import useVTNavigate from "../hooks/useVTNavigate";
import { useIsMobile } from "../hooks/useIsMobile";
import Lightbox from "../components/Lightbox";
import BookMeta from "../components/BookMeta";
import LazyImage from "../components/LazyImage";
import { makeSrcset } from "../utils/srcset";
import { nativeDisplaySize } from "../utils/nativeDisplaySize";

export default function BookDetail() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useVTNavigate();
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

  // Proactively prefetch adjacent books as soon as slugs are known — no hover required
  useEffect(() => {
    if (prevSlug) prefetchBook(prevSlug);
    if (nextSlug) prefetchBook(nextSlug);
  }, [prevSlug, nextSlug]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (leftRef.current) leftRef.current.scrollTop = 0;
    if (rightRef.current) rightRef.current.scrollTop = 0;
  }, [slug]);

  useEffect(() => {
    getBook(slug).then(data => {
      if (data) setBook(data);
      else setNotFound(true);
    });
  }, [slug]);

  useEffect(() => {
    getConfig().then(d => { if (d.image_max_width) setImageMaxWidth(d.image_max_width); });
  }, []);

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);

  const handleOuterWheel = useCallback((e) => {
    if (!rightRef.current) return;
    if (leftRef.current?.contains(e.target)) return;
    if (rightRef.current.contains(e.target)) return;
    e.preventDefault();
    const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
    rightRef.current.scrollBy({ top: delta, behavior: "instant" });
  }, []);

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
        <a href="/" onClick={e => { e.preventDefault(); navigate("/"); }} style={{ color: "var(--accent)" }}>← back to gallery</a>
      </div>
    );
  }

  if (!book) return null;

  const imgWidths = book.images.filter(i => i.width && i.height).map(i => nativeDisplaySize(i).width);
  const imgColWidth = imgWidths.length > 0
    ? Math.min(imageMaxWidth, Math.min(...imgWidths))
    : imageMaxWidth;

  const metadata = <BookMeta book={book} />;
  const imageList = book.images.map((img, idx) => {
    const avifSrcset = makeSrcset([
      img.avif_400 && `${img.avif_400} 400w`,
      img.avif_800 && `${img.avif_800} 800w`,
      img.avif_1300 && `${img.avif_1300} 1300w`,
      img.avif_1500 && `${img.avif_1500} 1500w`,
      img.avif_2000 && `${img.avif_2000} 2000w`,
      img.avif_3000 && `${img.avif_3000} 3000w`,
      img.avif_4000 && `${img.avif_4000} 4000w`,
    ]);
    const webpSrcset = makeSrcset([
      img.url_400 && `${img.url_400} 400w`,
      img.url_800 && `${img.url_800} 800w`,
      img.url_1300 && `${img.url_1300} 1300w`,
      img.url_1500 && `${img.url_1500} 1500w`,
      img.url_2000 && `${img.url_2000} 2000w`,
      img.url_3000 && `${img.url_3000} 3000w`,
      img.url_4000 && `${img.url_4000} 4000w`,
    ]);
    return (
      <LazyImage
        key={img.id}
        src={img.url}
        avifSrcset={avifSrcset}
        webpSrcset={webpSrcset}
        imgSizes="(min-width: 768px) 900px, 100vw"
        eager={idx === 0}
        fetchPriority={idx === 0 ? "high" : undefined}
        root={isMobile ? null : rightRef}
        aspectRatio={img.width && img.height ? `${img.width}/${img.height}` : undefined}
        onClick={() => setLightboxIdx(idx)}
        style={{ width: "100%", height: "auto", display: "block", cursor: "zoom-in" }}
      />
    );
  });
  const bookNav = (prevSlug || nextSlug) && (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 2rem" }}>
      {prevSlug
        ? <button onMouseEnter={() => prefetchBook(prevSlug)} onClick={() => navigateBook(prevSlug)} style={navBtn}>← Prev</button>
        : <span />}
      {nextSlug
        ? <button onMouseEnter={() => prefetchBook(nextSlug)} onClick={() => navigateBook(nextSlug)} style={navBtn}>Next →</button>
        : <span />}
    </div>
  );

  return (
    <>
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
              <a href="/" onClick={e => { e.preventDefault(); navigate("/"); }} style={backLink}>← back</a>
            </div>
            {metadata}
          </div>
          <div>{imageList}</div>
          {bookNav}
        </div>
      ) : (
        <div onWheel={handleOuterWheel} style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
          <div ref={leftRef} className="no-scrollbar" style={{ width: "28%", minWidth: "240px", maxWidth: "360px", height: "100vh", overflowY: "auto", overscrollBehavior: "none", borderRight: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ padding: "2rem 2rem 3rem" }}>
              <div style={{ marginBottom: "0" }}>
                <a href="/" onClick={e => { e.preventDefault(); navigate("/"); }} style={backLink}>← back</a>
              </div>
              {metadata}
            </div>
          </div>
          <div ref={rightRef} className="no-scrollbar" style={{ flex: 1, overflowY: "auto", overscrollBehavior: "none", height: "100vh", maxWidth: imgColWidth }}>
            {imageList}
            {bookNav}
          </div>
        </div>
      )}
    </>
  );
}

const backLink = { fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none" };
const navBtn = { background: "none", border: "none", padding: "0.5rem 0", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "0.875rem", opacity: 0.6 };

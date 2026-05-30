import { useState, useEffect } from "react";
import api from "../api";

export default function CurationPanel({ bookId, onImagesAdded, onAddToBook }) {
  const [url, setUrl] = useState("");
  const [scrape, setScrape] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState(null);
  const [imageSizes, setImageSizes] = useState({});
  const [imageReachable, setImageReachable] = useState({});

  const [coverUrl, setCoverUrl] = useState(null);
  const [spreadUrls, setSpreadUrls] = useState([]);

  const [descBlocks, setDescBlocks] = useState(new Set());
  const [colophonBlocks, setColophonBlocks] = useState(new Set());

  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addDone, setAddDone] = useState(false);

  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.getBookScrapes(bookId).then(setHistory).catch(() => {});
  }, [bookId]);

  async function doScrape(force = false) {
    if (!url.trim()) return;
    setScraping(true);
    setScrapeError(null);
    setAddDone(false);
    setCoverUrl(null);
    setSpreadUrls([]);
    setDescBlocks(new Set());
    setColophonBlocks(new Set());
    try {
      const result = await api.scrape(url.trim(), force, bookId);
      setScrape(result);
      api.getBookScrapes(bookId).then(setHistory).catch(() => {});
      setImageSizes({});
      setImageReachable({});
      if (result.image_urls.length > 0) {
        api.imageMeta(result.image_urls).then(({ sizes }) => {
          const sizeMap = {};
          const reachableMap = {};
          for (const { url: u, content_length, reachable } of sizes) {
            sizeMap[u] = content_length;
            reachableMap[u] = reachable !== false; // default true if field absent
          }
          setImageSizes(sizeMap);
          setImageReachable(reachableMap);
        }).catch(() => {});
      }
    } catch (e) {
      setScrapeError(e.message);
    } finally {
      setScraping(false);
    }
  }

  function toggleCover(imgUrl) {
    if (coverUrl === imgUrl) {
      setCoverUrl(null);
    } else {
      setCoverUrl(imgUrl);
      setSpreadUrls(prev => prev.filter(u => u !== imgUrl));
    }
  }

  function toggleSpread(imgUrl) {
    if (spreadUrls.includes(imgUrl)) {
      setSpreadUrls(prev => prev.filter(u => u !== imgUrl));
    } else {
      setSpreadUrls(prev => [...prev, imgUrl]);
      if (coverUrl === imgUrl) setCoverUrl(null);
    }
  }

  function toggleField(setFn, i) {
    setFn(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  const MIN_IMAGE_BYTES = 20 * 1024;
  const sizesLoaded = Object.keys(imageSizes).length > 0;
  const visibleImageUrls = !scrape ? [] : !sizesLoaded ? scrape.image_urls : scrape.image_urls.filter(imgUrl => {
    if (imageReachable[imgUrl] === false) return false; // dead URL
    const size = imageSizes[imgUrl];
    if (size == null) return true; // reachable but no Content-Length → show
    return size >= MIN_IMAGE_BYTES;
  });
  const hiddenCount = scrape && sizesLoaded ? scrape.image_urls.length - visibleImageUrls.length : 0;

  const imageCount = (coverUrl ? 1 : 0) + spreadUrls.length;
  const descText = scrape
    ? scrape.text_blocks.filter((_, i) => descBlocks.has(i)).join("\n\n")
    : "";
  const colophonText = scrape
    ? scrape.text_blocks.filter((_, i) => colophonBlocks.has(i)).join("\n\n")
    : "";
  const hasAnything = imageCount > 0 || descBlocks.size > 0 || colophonBlocks.size > 0;

  async function addToBook() {
    setAdding(true);
    setAddError(null);
    setAddDone(false);
    try {
      const toDownload = [];
      if (coverUrl) toDownload.push({ url: coverUrl, role: "cover" });
      for (const u of spreadUrls) toDownload.push({ url: u, role: "spread" });
      for (const { url: imgUrl, role } of toDownload) {
        await api.downloadImage(bookId, imgUrl, role);
      }
      if (toDownload.length > 0) onImagesAdded();
      await onAddToBook(descText || null, colophonText || null);
      setCoverUrl(null);
      setSpreadUrls([]);
      setDescBlocks(new Set());
      setColophonBlocks(new Set());
      setAddDone(true);
    } catch (e) {
      setAddError(e.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      {/* URL input */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doScrape(false)}
          placeholder="Publisher URL to scrape…"
          style={inputStyle}
        />
        <button onClick={() => doScrape(false)} disabled={scraping || !url.trim()} style={actionBtn}>
          {scraping ? "Scraping…" : "Scrape"}
        </button>
        {scrape && (
          <button onClick={() => doScrape(true)} disabled={scraping} style={ghostBtn}>
            Re-fetch
          </button>
        )}
      </div>

      {history.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <span style={sectionLabel}>Previously scraped</span>
          <div style={{ marginTop: "0.35rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            {history.map(s => (
              <div key={s.url} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "12px" }}>
                <button
                  onClick={() => setUrl(s.url)}
                  title={s.url}
                  style={{ flex: 1, minWidth: 0, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--accent)", fontFamily: "var(--font-body)", fontSize: "12px" }}
                >
                  {s.url}
                </button>
                <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: "11px", flexShrink: 0 }}>
                  {new Date(s.scraped_at + "Z").toLocaleDateString("en-GB")} · {s.image_count} imgs
                </span>
                <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none", flexShrink: 0 }}>↗</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {scrapeError && <p style={errorStyle}>{scrapeError}</p>}

      {scrape && (
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 1rem" }}>
          {scrape.from_cache ? "Cached" : "Fetched"} ·{" "}
          {new Date(scrape.scraped_at + "Z").toLocaleString("en-GB")} ·{" "}
          {scrape.image_urls.length} images · {scrape.text_blocks.length} text blocks
          {!scraping && !sizesLoaded && scrape.image_urls.length > 0 && " · loading sizes…"}
        </p>
      )}

      {/* Images */}
      {scrape && scrape.image_urls.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={sectionLabel}>Images</span>
            {hiddenCount > 0 && (
              <span style={{ fontSize: "11px", color: "var(--text-muted)", opacity: 0.7 }}>
                {hiddenCount} hidden (&lt; 20 KB)
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", margin: "0.5rem 0" }}>
            {visibleImageUrls.map((imgUrl, i) => {
              const isCover = coverUrl === imgUrl;
              const isSpread = spreadUrls.includes(imgUrl);
              return (
                <ImageCard
                  key={imgUrl + i}
                  url={imgUrl}
                  isCover={isCover}
                  isSpread={isSpread}
                  spreadIdx={spreadUrls.indexOf(imgUrl)}
                  sizeBytes={imageSizes[imgUrl] ?? null}
                  onCover={() => toggleCover(imgUrl)}
                  onSpread={() => toggleSpread(imgUrl)}
                />
              );
            })}
          </div>
          {hasAnything && (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.5rem" }}>
              <button onClick={addToBook} disabled={adding} style={actionBtn}>
                {adding ? "Saving…" : "Add to book & save"}
              </button>
              {addDone && <span style={{ fontSize: "13px", color: "var(--accent)" }}>Saved</span>}
              {addError && <span style={{ fontSize: "13px", color: "var(--danger)" }}>{addError}</span>}
            </div>
          )}
        </div>
      )}

      {/* Text blocks */}
      {scrape && scrape.text_blocks.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <span style={sectionLabel}>Text blocks</span>
          <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {scrape.text_blocks.map((block, i) => (
              <TextBlock
                key={i}
                text={block}
                inDesc={descBlocks.has(i)}
                inColophon={colophonBlocks.has(i)}
                onDescToggle={() => toggleField(setDescBlocks, i)}
                onColophonToggle={() => toggleField(setColophonBlocks, i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Previews */}
      {(descBlocks.size > 0 || colophonBlocks.size > 0) && (
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          {descBlocks.size > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ ...sectionLabel, marginBottom: "0.4rem" }}>Description preview</div>
              <textarea readOnly value={descText} style={previewStyle} />
            </div>
          )}
          {colophonBlocks.size > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ ...sectionLabel, marginBottom: "0.4rem" }}>Colophon preview</div>
              <textarea readOnly value={colophonText} style={previewStyle} />
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      {scrape && hasAnything && (
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button onClick={addToBook} disabled={adding} style={actionBtn}>
            {adding ? "Saving…" : "Add to book & save"}
          </button>
          {addDone && <span style={{ fontSize: "13px", color: "var(--accent)" }}>Saved</span>}
          {addError && <span style={{ fontSize: "13px", color: "var(--danger)" }}>{addError}</span>}
        </div>
      )}
    </div>
  );
}

function fmtSize(bytes) {
  if (bytes == null) return null;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function ImageCard({ url, isCover, isSpread, spreadIdx, sizeBytes, onCover, onSpread }) {
  const [broken, setBroken] = useState(false);
  const highlight = isCover ? "#4c566a" : isSpread ? "#3b4252" : "transparent";
  const borderColor = isCover ? "var(--accent)" : isSpread ? "#5e81ac" : "var(--border)";

  return (
    <div style={{ width: "130px", border: `2px solid ${borderColor}`, borderRadius: "4px", background: highlight, overflow: "hidden", flexShrink: 0 }}>
      <div style={{ height: "100px", background: "var(--bg-highlight)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {broken ? (
          <span style={{ fontSize: "11px", color: "var(--text-muted)", padding: "4px", textAlign: "center" }}>No preview</span>
        ) : (
          <img src={url} alt="" onError={() => setBroken(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
        {isCover && <div style={{ position: "absolute", top: "3px", left: "3px", background: "var(--accent)", color: "#fff", fontSize: "10px", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>COVER</div>}
        {isSpread && <div style={{ position: "absolute", top: "3px", left: "3px", background: "#5e81ac", color: "#fff", fontSize: "10px", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>#{spreadIdx + 1}</div>}
      </div>
      {fmtSize(sizeBytes) && (
        <div style={{ fontSize: "10px", color: "var(--text-muted)", textAlign: "center", padding: "2px 0", borderTop: "1px solid var(--border)" }}>
          {fmtSize(sizeBytes)}
        </div>
      )}
      <div style={{ display: "flex", borderTop: "1px solid var(--border)" }}>
        <button onClick={onCover} style={{ ...miniBtn, flex: 1, color: isCover ? "var(--accent)" : "var(--text-muted)", borderRight: "1px solid var(--border)" }}>Cover</button>
        <button onClick={onSpread} style={{ ...miniBtn, flex: 1, color: isSpread ? "#5e81ac" : "var(--text-muted)" }}>Spread</button>
      </div>
    </div>
  );
}

function TextBlock({ text, inDesc, inColophon, onDescToggle, onColophonToggle }) {
  const [expanded, setExpanded] = useState(false);
  const preview = text.length > 200 && !expanded ? text.slice(0, 200) + "…" : text;
  const highlighted = inDesc || inColophon;

  return (
    <div style={{
      background: highlighted ? "#4c566a" : "var(--bg-highlight)",
      border: `2px solid ${highlighted ? "var(--accent)" : "var(--border)"}`,
      borderRadius: "4px",
      padding: "0.6rem 0.75rem",
    }}>
      <p style={{ margin: "0 0 0.5rem", fontSize: "13px", color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
        {preview}
        {text.length > 200 && (
          <button onClick={() => setExpanded(v => !v)} style={{ ...ghostBtn, marginLeft: "0.5rem", padding: "0 4px", fontSize: "12px" }}>
            {expanded ? "less" : "more"}
          </button>
        )}
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={onDescToggle} style={{ ...ghostBtn, ...(inDesc ? activeBtn : {}) }}>→ Description</button>
        <button onClick={onColophonToggle} style={{ ...ghostBtn, ...(inColophon ? activeBtn : {}) }}>→ Colophon</button>
      </div>
    </div>
  );
}

const inputStyle = { flex: 1, padding: "0.5rem 0.6rem", background: "var(--bg-highlight)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "14px", width: "100%", boxSizing: "border-box" };
const actionBtn = { background: "var(--accent-dim)", color: "var(--text-bright)", border: "none", borderRadius: "4px", padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px", whiteSpace: "nowrap" };
const ghostBtn = { background: "none", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.3rem 0.6rem", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "12px" };
const activeBtn = { color: "var(--accent)", borderColor: "var(--accent)" };
const miniBtn = { background: "none", border: "none", padding: "4px 2px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "11px" };
const sectionLabel = { fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 500 };
const previewStyle = { width: "100%", height: "120px", resize: "vertical", padding: "0.5rem 0.6rem", background: "var(--bg-highlight)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px", boxSizing: "border-box" };
const errorStyle = { color: "var(--danger)", fontSize: "13px", margin: "0 0 0.75rem" };

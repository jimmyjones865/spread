import { useState } from "react";
import api from "../api";

export default function CurationPanel({ bookId, onImagesAdded, onAssignText }) {
  const [url, setUrl] = useState("");
  const [scrape, setScrape] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState(null);

  const [imageSizes, setImageSizes] = useState({});

  const [coverUrl, setCoverUrl] = useState(null);
  const [spreadUrls, setSpreadUrls] = useState([]);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [downloadDone, setDownloadDone] = useState(false);

  async function doScrape(force = false) {
    if (!url.trim()) return;
    setScraping(true);
    setScrapeError(null);
    setDownloadDone(false);
    setCoverUrl(null);
    setSpreadUrls([]);
    try {
      const result = await api.scrape(url.trim(), force);
      setScrape(result);
      setImageSizes({});
      if (result.image_urls.length > 0) {
        api.imageMeta(result.image_urls).then(({ sizes }) => {
          const map = {};
          for (const { url: u, content_length } of sizes) map[u] = content_length;
          setImageSizes(map);
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

  async function downloadSelected() {
    const toDownload = [];
    if (coverUrl) toDownload.push({ url: coverUrl, role: "cover" });
    for (const u of spreadUrls) toDownload.push({ url: u, role: "spread" });
    if (toDownload.length === 0) return;

    setDownloading(true);
    setDownloadError(null);
    setDownloadDone(false);
    try {
      for (const { url: imgUrl, role } of toDownload) {
        await api.downloadImage(bookId, imgUrl, role);
      }
      onImagesAdded();
      setCoverUrl(null);
      setSpreadUrls([]);
      setDownloadDone(true);
    } catch (e) {
      setDownloadError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  const selectedCount = (coverUrl ? 1 : 0) + spreadUrls.length;

  return (
    <div>
      {/* URL input row */}
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
          <button onClick={() => doScrape(true)} disabled={scraping} style={ghostBtn} title="Force fresh fetch">
            Re-fetch
          </button>
        )}
      </div>

      {scrapeError && <p style={errorStyle}>{scrapeError}</p>}

      {scrape && (
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 1rem" }}>
          {scrape.from_cache ? "Cached" : "Fetched"} ·{" "}
          {new Date(scrape.scraped_at + "Z").toLocaleString("en-GB")} ·{" "}
          {scrape.image_urls.length} images · {scrape.text_blocks.length} text blocks
        </p>
      )}

      {scrape && scrape.image_urls.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
            <span style={sectionLabel}>Images</span>
            {selectedCount > 0 && (
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {coverUrl ? "1 cover" : ""}{coverUrl && spreadUrls.length > 0 ? ", " : ""}{spreadUrls.length > 0 ? `${spreadUrls.length} spread${spreadUrls.length > 1 ? "s" : ""}` : ""} selected
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {scrape.image_urls.map((imgUrl, i) => {
              const isCover = coverUrl === imgUrl;
              const isSpread = spreadUrls.includes(imgUrl);
              const spreadIdx = spreadUrls.indexOf(imgUrl);
              return (
                <ImageCard
                  key={imgUrl + i}
                  url={imgUrl}
                  isCover={isCover}
                  isSpread={isSpread}
                  spreadIdx={spreadIdx}
                  sizeBytes={imageSizes[imgUrl] ?? null}
                  onCover={() => toggleCover(imgUrl)}
                  onSpread={() => toggleSpread(imgUrl)}
                />
              );
            })}
          </div>

          {selectedCount > 0 && (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button onClick={downloadSelected} disabled={downloading} style={actionBtn}>
                {downloading ? "Downloading…" : `Download selected (${selectedCount})`}
              </button>
              {downloadDone && <span style={{ fontSize: "13px", color: "var(--success, #a3be8c)" }}>Done</span>}
              {downloadError && <span style={{ fontSize: "13px", color: "var(--danger)" }}>{downloadError}</span>}
            </div>
          )}
        </div>
      )}

      {scrape && scrape.text_blocks.length > 0 && (
        <div>
          <span style={sectionLabel}>Text blocks</span>
          <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {scrape.text_blocks.map((block, i) => (
              <TextBlock
                key={i}
                text={block}
                onAssign={field => onAssignText(field, block)}
              />
            ))}
          </div>
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
    <div style={{
      width: "130px",
      border: `2px solid ${borderColor}`,
      borderRadius: "4px",
      background: highlight,
      overflow: "hidden",
      flexShrink: 0,
    }}>
      <div style={{ height: "100px", background: "var(--bg-highlight)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {broken ? (
          <span style={{ fontSize: "11px", color: "var(--text-muted)", padding: "4px", textAlign: "center" }}>No preview</span>
        ) : (
          <img
            src={url}
            alt=""
            onError={() => setBroken(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
        {isCover && (
          <div style={{ position: "absolute", top: "3px", left: "3px", background: "var(--accent)", color: "#fff", fontSize: "10px", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>
            COVER
          </div>
        )}
        {isSpread && (
          <div style={{ position: "absolute", top: "3px", left: "3px", background: "#5e81ac", color: "#fff", fontSize: "10px", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>
            #{spreadIdx + 1}
          </div>
        )}
      </div>
      {fmtSize(sizeBytes) && (
        <div style={{ fontSize: "10px", color: "var(--text-muted)", textAlign: "center", padding: "2px 0", borderTop: "1px solid var(--border)" }}>
          {fmtSize(sizeBytes)}
        </div>
      )}
      <div style={{ display: "flex", borderTop: "1px solid var(--border)" }}>
        <button
          onClick={onCover}
          style={{
            ...miniBtn,
            flex: 1,
            color: isCover ? "var(--accent)" : "var(--text-muted)",
            borderRight: "1px solid var(--border)",
          }}
          title="Set as cover"
        >
          Cover
        </button>
        <button
          onClick={onSpread}
          style={{
            ...miniBtn,
            flex: 1,
            color: isSpread ? "#5e81ac" : "var(--text-muted)",
          }}
          title="Add as spread"
        >
          Spread
        </button>
      </div>
    </div>
  );
}

function TextBlock({ text, onAssign }) {
  const [expanded, setExpanded] = useState(false);
  const [assigned, setAssigned] = useState([]);
  const preview = text.length > 200 && !expanded ? text.slice(0, 200) + "…" : text;

  function handleAssign(field) {
    if (assigned.includes(field)) {
      setAssigned(prev => prev.filter(f => f !== field));
    } else {
      onAssign(field);
      setAssigned(prev => [...prev, field]);
    }
  }

  const isAssigned = assigned.length > 0;

  return (
    <div style={{
      background: isAssigned ? "var(--bg-elevated)" : "var(--bg-highlight)",
      border: `1px solid ${isAssigned ? "var(--accent)" : "var(--border)"}`,
      borderRadius: "4px",
      padding: "0.6rem 0.75rem",
    }}>
      <p style={{ margin: "0 0 0.5rem", fontSize: "13px", color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
        {preview}
        {text.length > 200 && (
          <button onClick={() => setExpanded(e => !e)} style={{ ...ghostBtn, marginLeft: "0.5rem", padding: "0 4px", fontSize: "12px" }}>
            {expanded ? "less" : "more"}
          </button>
        )}
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => handleAssign("description")}
          style={{ ...ghostBtn, ...(assigned.includes("description") ? assignedBtn : {}) }}
        >→ Description</button>
        <button
          onClick={() => handleAssign("colophon")}
          style={{ ...ghostBtn, ...(assigned.includes("colophon") ? assignedBtn : {}) }}
        >→ Colophon</button>
      </div>
    </div>
  );
}

const inputStyle = {
  flex: 1, padding: "0.5rem 0.6rem", background: "var(--bg-highlight)",
  border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text)",
  fontFamily: "var(--font-body)", fontSize: "14px",
};
const actionBtn = {
  background: "var(--accent-dim)", color: "var(--text-bright)", border: "none",
  borderRadius: "4px", padding: "0.5rem 1rem", cursor: "pointer",
  fontFamily: "var(--font-body)", fontSize: "13px", whiteSpace: "nowrap",
};
const ghostBtn = {
  background: "none", color: "var(--text-muted)", border: "1px solid var(--border)",
  borderRadius: "4px", padding: "0.3rem 0.6rem", cursor: "pointer",
  fontFamily: "var(--font-body)", fontSize: "12px",
};
const miniBtn = {
  background: "none", border: "none", padding: "4px 2px",
  cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "11px",
};
const sectionLabel = {
  fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em",
  color: "var(--text-muted)", fontWeight: 500,
};
const assignedBtn = { color: "var(--accent)", borderColor: "var(--accent)" };
const errorStyle = { color: "var(--danger)", fontSize: "13px", margin: "0 0 0.75rem" };

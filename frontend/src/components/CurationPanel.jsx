import { useCuration } from "../hooks/useCuration";
import ImageCard from "./ImageCard";
import TextBlock from "./TextBlock";
import { ghostBtn } from "./CurationStyles";

const inputStyle = { flex: 1, padding: "0.5rem 0.6rem", background: "var(--bg-highlight)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "14px", width: "100%", boxSizing: "border-box" };
const actionBtn = { background: "var(--accent-dim)", color: "var(--text-bright)", border: "none", borderRadius: "4px", padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px", whiteSpace: "nowrap" };
const sectionLabel = { fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 500 };
const previewStyle = { width: "100%", height: "120px", resize: "vertical", padding: "0.5rem 0.6rem", background: "var(--bg-highlight)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px", boxSizing: "border-box" };
const errorStyle = { color: "var(--danger)", fontSize: "13px", margin: "0 0 0.75rem" };

export default function CurationPanel({ bookId, onImagesAdded, onAddToBook }) {
  const c = useCuration(bookId, { onImagesAdded, onAddToBook });

  return (
    <div>
      {/* URL input */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <input
          value={c.url}
          onChange={e => c.setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && c.doScrape(false)}
          placeholder="Publisher URL to scrape…"
          style={inputStyle}
        />
        <button onClick={() => c.doScrape(false)} disabled={c.scraping || !c.url.trim()} style={actionBtn}>
          {c.scraping ? "Scraping…" : "Scrape"}
        </button>
        {c.scrape && (
          <button onClick={() => c.doScrape(true)} disabled={c.scraping} style={ghostBtn}>
            Re-fetch
          </button>
        )}
      </div>

      {c.history.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <span style={sectionLabel}>Previously scraped</span>
          <div style={{ marginTop: "0.35rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            {c.history.map(s => (
              <div key={s.url} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "12px" }}>
                <button
                  onClick={() => c.setUrl(s.url)}
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

      {c.scrapeError && <p style={errorStyle}>{c.scrapeError}</p>}

      {c.scrape && (
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 1rem" }}>
          {c.scrape.from_cache ? "Cached" : "Fetched"} ·{" "}
          {new Date(c.scrape.scraped_at + "Z").toLocaleString("en-GB")} ·{" "}
          {c.scrape.image_urls.length} images · {c.scrape.text_blocks.length} text blocks
          {!c.scraping && !c.sizesLoaded && c.scrape.image_urls.length > 0 && " · loading sizes…"}
        </p>
      )}

      {/* Images */}
      {c.scrape && c.scrape.image_urls.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={sectionLabel}>Images</span>
            {c.hiddenCount > 0 && (
              <span style={{ fontSize: "11px", color: "var(--text-muted)", opacity: 0.7 }}>
                {c.hiddenCount} hidden (too small)
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", margin: "0.5rem 0" }}>
            {c.visibleImageUrls.map((imgUrl, i) => (
              <ImageCard
                key={imgUrl + i}
                url={imgUrl}
                isCover={c.coverUrl === imgUrl}
                isSpread={c.spreadUrls.includes(imgUrl)}
                spreadIdx={c.spreadUrls.indexOf(imgUrl)}
                sizeBytes={c.imageSizes[imgUrl] ?? null}
                dims={c.imageDims[imgUrl] ?? null}
                onCover={() => c.toggleCover(imgUrl)}
                onSpread={() => c.toggleSpread(imgUrl)}
                onDimsLoaded={(w, h) => c.setImageDims(prev => ({ ...prev, [imgUrl]: { w, h } }))}
              />
            ))}
          </div>
          {c.hasAnything && (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.5rem" }}>
              <button onClick={c.addToBook} disabled={c.adding} style={actionBtn}>
                {c.adding ? "Saving…" : "Add to book & save"}
              </button>
              {c.addDone && <span style={{ fontSize: "13px", color: "var(--accent)" }}>Saved</span>}
              {c.addError && <span style={{ fontSize: "13px", color: "var(--danger)" }}>{c.addError}</span>}
            </div>
          )}
        </div>
      )}

      {/* Text blocks */}
      {c.scrape && c.scrape.text_blocks.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <span style={sectionLabel}>Text blocks</span>
          <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {c.scrape.text_blocks.map((block, i) => (
              <TextBlock
                key={i}
                text={block}
                inDesc={c.descBlocks.has(i)}
                inColophon={c.colophonBlocks.has(i)}
                onDescToggle={() => c.toggleField(c.setDescBlocks, i)}
                onColophonToggle={() => c.toggleField(c.setColophonBlocks, i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Previews */}
      {(c.descBlocks.size > 0 || c.colophonBlocks.size > 0) && (
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          {c.descBlocks.size > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ ...sectionLabel, marginBottom: "0.4rem" }}>Description preview</div>
              <textarea readOnly value={c.descText} style={previewStyle} />
            </div>
          )}
          {c.colophonBlocks.size > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ ...sectionLabel, marginBottom: "0.4rem" }}>Colophon preview</div>
              <textarea readOnly value={c.colophonText} style={previewStyle} />
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      {c.scrape && c.hasAnything && (
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button onClick={c.addToBook} disabled={c.adding} style={actionBtn}>
            {c.adding ? "Saving…" : "Add to book & save"}
          </button>
          {c.addDone && <span style={{ fontSize: "13px", color: "var(--accent)" }}>Saved</span>}
          {c.addError && <span style={{ fontSize: "13px", color: "var(--danger)" }}>{c.addError}</span>}
        </div>
      )}
    </div>
  );
}

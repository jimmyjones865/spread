function FilterSection({ label, children }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 500, marginBottom: "0.5rem" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const panelSelect = {
  width: "100%", padding: "0.4rem 0.5rem", background: "var(--bg-elevated)",
  border: "1px solid var(--border)", borderRadius: "4px",
  color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "0.875rem", cursor: "pointer",
  boxSizing: "border-box",
};
const panelInput = {
  width: "100%", padding: "0.4rem 0.5rem", background: "var(--bg-elevated)",
  border: "1px solid var(--border)", borderRadius: "4px",
  color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "0.875rem", boxSizing: "border-box",
};
const checkLabel = { display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.875rem", color: "var(--text-muted)", cursor: "pointer" };
const orderBtn = { background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.4rem 0.6rem", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "0.875rem" };
const clearBtn = { background: "none", border: "none", padding: "0 4px", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "0.8125rem", textDecoration: "underline" };
const closeBtn = { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.3125rem", lineHeight: 1, padding: "0 2px" };

export default function FilterPanel({
  open, onClose, onClear, activeFilterCount,
  artists, allTags, availableYears,
  artistId, setArtistId,
  yearFrom, setYearFrom, yearTo, setYearTo,
  language, setLanguage,
  activeTags, toggleTag,
  signed, setSigned, numbered, setNumbered,
  sort, setSort, order, setOrder,
  status, setStatus,
  cardWidth, updateCardWidth,
}) {
  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.35)" }}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, width: "300px", height: "100vh",
        zIndex: 101, background: "var(--bg)", borderLeft: "1px solid var(--border)",
        overflowY: "auto", padding: "1.5rem", boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-bright)" }}>Filters</span>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {activeFilterCount > 0 && (
              <button onClick={onClear} style={clearBtn}>Clear all</button>
            )}
            <button onClick={onClose} style={closeBtn}>×</button>
          </div>
        </div>

        <FilterSection label="Artist">
          <select value={artistId} onChange={e => setArtistId(e.target.value)} style={panelSelect}>
            <option value="">All artists</option>
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </FilterSection>

        <FilterSection label="Year">
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <select value={yearFrom} onChange={e => setYearFrom(e.target.value)} style={{ ...panelSelect, flex: 1 }}>
              <option value="">From</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>–</span>
            <select value={yearTo} onChange={e => setYearTo(e.target.value)} style={{ ...panelSelect, flex: 1 }}>
              <option value="">To</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </FilterSection>

        <FilterSection label="Language">
          <input value={language} onChange={e => setLanguage(e.target.value)} placeholder="e.g. English" style={panelInput} />
        </FilterSection>

        {allTags.length > 0 && (
          <FilterSection label="Tags">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {allTags.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleTag(t.name)}
                  style={{
                    padding: "3px 8px", borderRadius: "10px", border: "1px solid",
                    cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.75rem",
                    background: activeTags.has(t.name) ? "var(--accent-dim)" : "var(--bg-elevated)",
                    color: activeTags.has(t.name) ? "var(--text-bright)" : "var(--text-muted)",
                    borderColor: activeTags.has(t.name) ? "var(--accent)" : "var(--border)",
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </FilterSection>
        )}

        <FilterSection label="Options">
          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={checkLabel}>
              <input type="checkbox" checked={signed} onChange={e => setSigned(e.target.checked)} />
              Signed
            </label>
            <label style={checkLabel}>
              <input type="checkbox" checked={numbered} onChange={e => setNumbered(e.target.checked)} />
              Numbered
            </label>
          </div>
        </FilterSection>

        <FilterSection label="Sort by">
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...panelSelect, flex: 1 }}>
              <option value="theme">Theme</option>
              <option value="artist">Artist</option>
              <option value="title">Title</option>
              <option value="year">Year</option>
              <option value="publisher">Publisher</option>
            </select>
            <button
              onClick={() => sort !== "theme" && setOrder(order === "asc" ? "desc" : "asc")}
              disabled={sort === "theme"}
              style={{ ...orderBtn, opacity: sort === "theme" ? 0.4 : 1, cursor: sort === "theme" ? "not-allowed" : "pointer" }}
              title={sort === "theme" ? "Theme sort has its own order" : "Toggle ascending / descending"}
            >
              {order === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </FilterSection>

        <FilterSection label="Status">
          <select value={status} onChange={e => setStatus(e.target.value)} style={panelSelect}>
            <option value="">All</option>
            <option value="owned">Owned</option>
            <option value="on_order">On order</option>
            <option value="wishlist">Wishlist</option>
          </select>
        </FilterSection>

        <FilterSection label="Card size">
          <input
            type="range" min={120} max={280} step={10}
            value={cardWidth}
            onChange={e => updateCardWidth(parseInt(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "right", marginTop: "2px" }}>
            {cardWidth}px
          </div>
        </FilterSection>
      </div>
    </>
  );
}

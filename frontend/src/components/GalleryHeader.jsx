import ThemeToggle from "./ThemeToggle";

const iconBtn = {
  background: "none", border: "none", borderRadius: "6px",
  padding: "0.45rem 0.55rem", color: "var(--text-muted)", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};

const searchInput = {
  padding: "0.45rem 0.65rem", background: "var(--bg-elevated)",
  border: "1px solid var(--border)", borderRadius: "6px", lineHeight: "1",
  color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "14px", width: "200px",
};

const filterBtn = {
  padding: "0.45rem 0.55rem", background: "none",
  border: "none", borderRadius: "6px",
  color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "13px",
  cursor: "pointer", position: "relative", lineHeight: 0,
};

export default function GalleryHeader({
  siteTitle, isMobile,
  searchOpen, onSearchOpen, onSearchClose,
  q, setQ,
  onFiltersClick, activeFilterCount,
}) {
  return (
    <div style={{ padding: isMobile ? "2rem 1.5rem 1.5rem" : "2rem 2.5rem 1.5rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
      {!searchOpen && (
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "var(--text-bright)", letterSpacing: "0.02em", flex: 1 }}>
          {siteTitle}
        </h1>
      )}
      {searchOpen ? (
        <>
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search…"
            style={{ ...searchInput, flex: 1, width: "auto" }}
          />
          <button onClick={() => { onSearchClose(); setQ(""); }} style={iconBtn} title="Close search">✕</button>
        </>
      ) : (
        <button onClick={onSearchOpen} style={iconBtn} title="Search">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {!searchOpen && <ThemeToggle />}
      <button
        onClick={onFiltersClick}
        title="Filters"
        style={{ ...filterBtn, ...(activeFilterCount > 0 ? { color: "var(--accent)" } : {}) }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
          <line x1="1" y1="4" x2="15" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="5" cy="4" r="1.75" stroke="currentColor" strokeWidth="1.5" style={{ fill: "var(--bg-elevated)" }}/>
          <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="10" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.5" style={{ fill: "var(--bg-elevated)" }}/>
          <line x1="1" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="6" cy="12" r="1.75" stroke="currentColor" strokeWidth="1.5" style={{ fill: "var(--bg-elevated)" }}/>
        </svg>
        {activeFilterCount > 0 && <span style={{ position: "absolute", top: "-5px", right: "-5px", background: "var(--accent)", color: "var(--text-bright)", borderRadius: "50%", fontSize: "10px", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{activeFilterCount}</span>}
      </button>
    </div>
  );
}

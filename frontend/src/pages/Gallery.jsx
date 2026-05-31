import { useState, useEffect, useRef } from "react";
import PublicFooter from "../components/PublicFooter";
import ThemeToggle from "../components/ThemeToggle";
import { prefetchBook, getConfig } from "../prefetchCache";
import useVTNavigate from "../hooks/useVTNavigate";

const _staticCache = { artists: null, tags: null };
const _booksCache = {};

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Gallery() {
  const navigate = useVTNavigate();
  const isMobile = useIsMobile();
  const scrollRestored = useRef(false);

  const [books, setBooks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [siteTitle, setSiteTitle] = useState("Spread");
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  const [cardWidth, setCardWidth] = useState(() => {
    const stored = localStorage.getItem("spread_card_width");
    return stored ? parseInt(stored) : window.innerWidth < 768 ? 150 : 190;
  });

  const [q, setQ] = useState("");
  const [artistId, setArtistId] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [language, setLanguage] = useState("");
  const [activeTags, setActiveTags] = useState(new Set());
  const [status, setStatus] = useState("");
  const [signed, setSigned] = useState(false);
  const [numbered, setNumbered] = useState(false);
  const [sort, setSort] = useState("artist");
  const [order, setOrder] = useState("asc");

  const debouncedQ = useDebounce(q, 300);

  useEffect(() => {
    if (_staticCache.artists) {
      setArtists(_staticCache.artists);
      setAllTags(_staticCache.tags);
    } else {
      fetch("/api/artists", { credentials: "include" }).then(r => r.json()).then(d => { _staticCache.artists = d; setArtists(d); }).catch(() => {});
      fetch("/api/tags", { credentials: "include" }).then(r => r.json()).then(d => { _staticCache.tags = d; setAllTags(d); }).catch(() => {});
    }
    getConfig().then(d => { if (d.title) setSiteTitle(d.title); });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (artistId) params.set("artist_id", artistId);
    if (yearFrom) params.set("year_from", yearFrom);
    if (yearTo) params.set("year_to", yearTo);
    if (language) params.set("language", language);
    if (activeTags.size > 0) params.set("tags", [...activeTags].join(","));
    if (status) params.set("status", status);
    if (signed) params.set("signed", "true");
    if (numbered) params.set("numbered", "true");
    params.set("sort", sort);
    params.set("order", order);
    const key = params.toString();

    function apply(data, years) {
      setBooks(data);
      setAvailableYears(years);
      setLoading(false);
      if (!scrollRestored.current) {
        scrollRestored.current = true;
        const y = sessionStorage.getItem("gallery_scroll");
        if (y) {
          sessionStorage.removeItem("gallery_scroll");
          requestAnimationFrame(() => window.scrollTo(0, parseInt(y)));
        }
      }
    }

    if (_booksCache[key]) {
      apply(_booksCache[key].data, _booksCache[key].years);
      return;
    }

    setLoading(true);
    fetch(`/api/books?${params}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        const years = [...new Set(data.map(b => b.year).filter(Boolean))].sort((a, b) => b - a);
        _booksCache[key] = { data, years };
        apply(data, years);
      })
      .catch(() => setLoading(false));
  }, [debouncedQ, artistId, yearFrom, yearTo, language, activeTags, status, signed, numbered, sort, order]);

  function toggleTag(name) {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  function clearFilters() {
    setQ(""); setArtistId(""); setYearFrom(""); setYearTo(""); setLanguage("");
    setActiveTags(new Set()); setStatus(""); setSigned(false); setNumbered(false);
  }

  function updateCardWidth(w) {
    setCardWidth(w);
    localStorage.setItem("spread_card_width", w);
  }

  const [searchOpen, setSearchOpen] = useState(false);

  const activeFilterCount =
    [q, artistId, yearFrom, yearTo, language, status].filter(Boolean).length +
    (signed ? 1 : 0) + (numbered ? 1 : 0) + activeTags.size;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
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
            <button onClick={() => { setSearchOpen(false); setQ(""); }} style={iconBtn} title="Close search">✕</button>
          </>
        ) : (
          <button onClick={() => setSearchOpen(true)} style={iconBtn} title="Search">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {!searchOpen && <ThemeToggle />}
        <button
          onClick={() => setPanelOpen(true)}
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

      {/* Book grid */}
      <div style={{ flex: 1, padding: isMobile ? "0 1.5rem 3rem" : "0 2.5rem 3rem" }}>
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading…</p>
        ) : books.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No books found.</p>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
            gap: "1.5rem",
          }}>
            {books.map(book => (
              <BookCard key={book.slug} book={book} onClick={() => {
                sessionStorage.setItem("gallery_scroll", String(window.scrollY));
                navigate(`/books/${book.slug}`, { state: { slugs: books.map(b => b.slug) } });
              }} />
            ))}
          </div>
        )}
      </div>

      <PublicFooter />

      {/* Filter overlay */}
      {panelOpen && (
        <>
          <div
            onClick={() => setPanelOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.35)" }}
          />
          <div style={{
            position: "fixed", top: 0, right: 0, width: "300px", height: "100vh",
            zIndex: 101, background: "var(--bg)", borderLeft: "1px solid var(--border)",
            overflowY: "auto", padding: "1.5rem", boxSizing: "border-box",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-bright)" }}>Filters</span>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} style={clearBtn}>Clear all</button>
                )}
                <button onClick={() => setPanelOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: "0 2px" }}>×</button>
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
                <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>–</span>
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
                        cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "11px",
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
                  <option value="artist">Artist</option>
                  <option value="title">Title</option>
                  <option value="year">Year</option>
                  <option value="publisher">Publisher</option>
                </select>
                <button onClick={() => setOrder(o => o === "asc" ? "desc" : "asc")} style={orderBtn}>
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
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "right", marginTop: "2px" }}>
                {cardWidth}px
              </div>
            </FilterSection>
          </div>
        </>
      )}
    </div>
  );
}

function FilterSection({ label, children }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 500, marginBottom: "0.5rem" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function BookCard({ book, onClick }) {
  function preload() {
    const webpUrl = book.cover_webp_url?.replace("_thumb.webp", "_web.webp");
    if (webpUrl) new Image().src = webpUrl;
    else if (book.cover_url) new Image().src = book.cover_url.replace("_thumb.jpg", "_web.jpg");
    prefetchBook(book.slug);
  }
  return (
    <div onClick={onClick} onMouseEnter={preload} style={{ cursor: "pointer" }}>
      <div style={{
        position: "relative", width: "100%", paddingBottom: "135%",
        background: "var(--bg-elevated)", borderRadius: "3px", overflow: "hidden",
        marginBottom: "0.5rem",
      }}>
        {book.cover_url ? (
          <picture style={{ position: "absolute", inset: 0, display: "block" }}>
            {book.cover_webp_url && <source type="image/webp" srcSet={book.cover_webp_url} />}
            <img
              src={book.cover_url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              loading="lazy"
              decoding="async"
            />
          </picture>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "20px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>
              {book.title.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div style={{ fontSize: "12px", color: "var(--text)", fontWeight: 500, lineHeight: 1.3, marginBottom: "2px" }}>
        {book.title}
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.3 }}>
        {book.artist_name}
      </div>
    </div>
  );
}

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
const panelSelect = {
  width: "100%", padding: "0.4rem 0.5rem", background: "var(--bg-elevated)",
  border: "1px solid var(--border)", borderRadius: "4px",
  color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "13px", cursor: "pointer",
  boxSizing: "border-box",
};
const panelInput = {
  width: "100%", padding: "0.4rem 0.5rem", background: "var(--bg-elevated)",
  border: "1px solid var(--border)", borderRadius: "4px",
  color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "13px", boxSizing: "border-box",
};
const checkLabel = { display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "13px", color: "var(--text-muted)", cursor: "pointer" };
const orderBtn = { background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.4rem 0.6rem", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "13px" };
const clearBtn = { background: "none", border: "none", padding: "0 4px", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "12px", textDecoration: "underline" };

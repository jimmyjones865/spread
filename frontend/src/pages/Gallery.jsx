import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PublicFooter from "../components/PublicFooter";
import ThemeToggle from "../components/ThemeToggle";

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Gallery() {
  const navigate = useNavigate();

  const [books, setBooks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);

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
    fetch("/api/artists", { credentials: "include" }).then(r => r.json()).then(setArtists).catch(() => {});
    fetch("/api/tags", { credentials: "include" }).then(r => r.json()).then(setAllTags).catch(() => {});
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

    setLoading(true);
    fetch(`/api/books?${params}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => { setBooks(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [debouncedQ, artistId, yearFrom, yearTo, language, activeTags, status, signed, numbered, sort, order]);

  function toggleTag(name) {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  const hasFilters = debouncedQ || artistId || yearFrom || yearTo || language || activeTags.size > 0 || status || signed || numbered;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "2.5rem 3rem 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: "var(--text-bright)", letterSpacing: "0.02em" }}>
            Spread
          </h1>
          <ThemeToggle />
        </div>

        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search books, artists, publishers…"
          style={searchInput}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", margin: "0.75rem 0 0.6rem", alignItems: "center" }}>
          <select value={artistId} onChange={e => setArtistId(e.target.value)} style={filterSelect}>
            <option value="">All artists</option>
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          <select value={status} onChange={e => setStatus(e.target.value)} style={filterSelect}>
            <option value="">All statuses</option>
            <option value="owned">Owned</option>
            <option value="on_order">On order</option>
            <option value="wishlist">Wishlist</option>
          </select>

          <input value={language} onChange={e => setLanguage(e.target.value)} placeholder="Language" style={{ ...filterSelect, width: "90px" }} />

          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Year</span>
          <input value={yearFrom} onChange={e => setYearFrom(e.target.value)} type="number" placeholder="from" style={{ ...filterSelect, width: "76px" }} />
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>–</span>
          <input value={yearTo} onChange={e => setYearTo(e.target.value)} type="number" placeholder="to" style={{ ...filterSelect, width: "76px" }} />

          <label style={checkLabel}>
            <input type="checkbox" checked={signed} onChange={e => setSigned(e.target.checked)} />
            Signed
          </label>
          <label style={checkLabel}>
            <input type="checkbox" checked={numbered} onChange={e => setNumbered(e.target.checked)} />
            Numbered
          </label>

          <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <select value={sort} onChange={e => setSort(e.target.value)} style={filterSelect}>
              <option value="artist">Artist</option>
              <option value="title">Title</option>
              <option value="year">Year</option>
              <option value="publisher">Publisher</option>
            </select>
            <button onClick={() => setOrder(o => o === "asc" ? "desc" : "asc")} style={orderBtn} title={order === "asc" ? "Ascending" : "Descending"}>
              {order === "asc" ? "↑" : "↓"}
            </button>
          </div>

          {hasFilters && (
            <button onClick={() => {
              setQ(""); setArtistId(""); setYearFrom(""); setYearTo(""); setLanguage("");
              setActiveTags(new Set()); setStatus(""); setSigned(false); setNumbered(false);
            }} style={clearBtn}>
              Clear
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.5rem" }}>
            {allTags.map(t => (
              <button
                key={t.id}
                onClick={() => toggleTag(t.name)}
                style={{
                  padding: "3px 10px",
                  borderRadius: "12px",
                  border: "1px solid",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  fontSize: "12px",
                  transition: "all 0.1s",
                  background: activeTags.has(t.name) ? "var(--accent-dim)" : "var(--bg-elevated)",
                  color: activeTags.has(t.name) ? "var(--text-bright)" : "var(--text-muted)",
                  borderColor: activeTags.has(t.name) ? "var(--accent)" : "var(--border)",
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: "0 3rem 3rem" }}>
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading…</p>
        ) : books.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No books found.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.75rem" }}>
            {books.map(book => (
              <BookCard key={book.slug} book={book} onClick={() => navigate(`/books/${book.slug}`)} />
            ))}
          </div>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}

function BookCard({ book, onClick }) {
  return (
    <div onClick={onClick} style={{ cursor: "pointer", width: "140px", flexShrink: 0 }}>
      <div style={{ width: "140px", height: "190px", background: "var(--bg-elevated)", borderRadius: "3px", overflow: "hidden", marginBottom: "0.5rem", border: "1px solid var(--border)" }}>
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            loading="lazy"
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
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

const searchInput = { width: "100%", padding: "0.6rem 0.75rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "15px", boxSizing: "border-box" };
const filterSelect = { padding: "0.35rem 0.5rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "13px", cursor: "pointer" };
const checkLabel = { display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "13px", color: "var(--text-muted)", cursor: "pointer" };
const orderBtn = { background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.35rem 0.6rem", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "13px" };
const clearBtn = { background: "none", border: "none", padding: "0.35rem 0.5rem", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "12px", textDecoration: "underline" };

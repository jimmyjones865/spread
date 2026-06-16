import { useState, useEffect } from "react";
import PublicFooter from "../components/PublicFooter";
import GalleryHeader from "../components/GalleryHeader";
import FilterPanel from "../components/FilterPanel";
import BookCard from "../components/BookCard";
import api from "../api";
import { getConfig } from "../prefetchCache";
import useVTNavigate from "../hooks/useVTNavigate";
import { useIsMobile } from "../hooks/useIsMobile";
import useGalleryFilters from "../hooks/useGalleryFilters";

const _staticCache = { artists: null, tags: null };

export default function Gallery() {
  const navigate = useVTNavigate();
  const isMobile = useIsMobile();

  const [artists, setArtists] = useState(() => _staticCache.artists || []);
  const [allTags, setAllTags] = useState(() => _staticCache.tags || []);
  const [siteTitle, setSiteTitle] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cardWidth, setCardWidth] = useState(() => {
    const stored = localStorage.getItem("spread_card_width");
    return stored ? parseInt(stored) : window.innerWidth < 768 ? 150 : 190;
  });

  const f = useGalleryFilters();

  useEffect(() => {
    if (_staticCache.artists) {
      setArtists(_staticCache.artists);
      setAllTags(_staticCache.tags);
    } else {
      api.public.listArtists()
        .then(d => { _staticCache.artists = d; setArtists(d); })
        .catch(() => {});
      api.public.listTags()
        .then(d => { _staticCache.tags = d; setAllTags(d); })
        .catch(() => {});
    }
    getConfig().then(d => { if (d.title) setSiteTitle(d.title); });
  }, []);

  function updateCardWidth(w) {
    setCardWidth(w);
    localStorage.setItem("spread_card_width", w);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <GalleryHeader
        siteTitle={siteTitle}
        isMobile={isMobile}
        searchOpen={searchOpen}
        onSearchOpen={() => setSearchOpen(true)}
        onSearchClose={() => setSearchOpen(false)}
        q={f.q}
        setQ={f.setQ}
        onFiltersClick={() => setPanelOpen(true)}
        activeFilterCount={f.activeFilterCount}
      />

      <div style={{ flex: 1, padding: isMobile ? "0 1.5rem 3rem" : "0 2.5rem 3rem" }}>
        {f.loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>Loading…</p>
        ) : f.books.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>No books found.</p>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
            gap: "1.5rem",
          }}>
            {f.books.map((book, i) => (
              <BookCard
                key={book.slug}
                book={book}
                priority={i < 2}
                onClick={() => {
                  sessionStorage.setItem("gallery_scroll", String(window.scrollY));
                  navigate(`/books/${book.slug}`, { state: { slugs: f.books.map(b => b.slug) } });
                }}
              />
            ))}
          </div>
        )}
      </div>

      <PublicFooter />

      <FilterPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onClear={f.clearFilters}
        activeFilterCount={f.activeFilterCount}
        artists={artists}
        allTags={allTags}
        availableYears={f.availableYears}
        artistId={f.artistId} setArtistId={f.setArtistId}
        yearFrom={f.yearFrom} setYearFrom={f.setYearFrom}
        yearTo={f.yearTo} setYearTo={f.setYearTo}
        language={f.language} setLanguage={f.setLanguage}
        activeTags={f.activeTags} toggleTag={f.toggleTag}
        signed={f.signed} setSigned={f.setSigned}
        numbered={f.numbered} setNumbered={f.setNumbered}
        sort={f.sort} setSort={f.setSort}
        order={f.order} setOrder={f.setOrder}
        status={f.status} setStatus={f.setStatus}
        cardWidth={cardWidth} updateCardWidth={updateCardWidth}
      />
    </div>
  );
}

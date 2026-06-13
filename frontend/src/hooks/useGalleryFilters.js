import { useState, useEffect, useRef } from "react";
import useDebounce from "./useDebounce";
import api from "../api";

const _booksCache = {};
const FILTER_KEY = "gallery_filters";

function _loadFilters() {
  try { return JSON.parse(sessionStorage.getItem(FILTER_KEY)) ?? {}; }
  catch { return {}; }
}

export default function useGalleryFilters() {
  const [q, setQ] = useState(() => _loadFilters().q ?? "");
  const [artistId, setArtistId] = useState(() => _loadFilters().artistId ?? "");
  const [yearFrom, setYearFrom] = useState(() => _loadFilters().yearFrom ?? "");
  const [yearTo, setYearTo] = useState(() => _loadFilters().yearTo ?? "");
  const [language, setLanguage] = useState(() => _loadFilters().language ?? "");
  const [activeTags, setActiveTags] = useState(() => new Set(_loadFilters().activeTags ?? []));
  const [status, setStatus] = useState(() => _loadFilters().status ?? "");
  const [signed, setSigned] = useState(() => _loadFilters().signed ?? false);
  const [numbered, setNumbered] = useState(() => _loadFilters().numbered ?? false);
  const [sort, setSort] = useState(() => _loadFilters().sort ?? "theme");
  const [order, setOrder] = useState(() => _loadFilters().order ?? "asc");

  const [books, setBooks] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);

  const pendingScroll = useRef(null);
  const debouncedQ = useDebounce(q, 300);

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
      const y = sessionStorage.getItem("gallery_scroll");
      if (y) {
        sessionStorage.removeItem("gallery_scroll");
        pendingScroll.current = parseInt(y);
      }
    }

    if (_booksCache[key]) {
      apply(_booksCache[key].data, _booksCache[key].years);
      return;
    }

    setLoading(true);
    api.public.listBooks(params)
      .then(data => {
        const years = [...new Set(data.map(b => b.year).filter(Boolean))].sort((a, b) => b - a);
        _booksCache[key] = { data, years };
        apply(data, years);
      })
      .catch(() => setLoading(false));
  }, [debouncedQ, artistId, yearFrom, yearTo, language, activeTags, status, signed, numbered, sort, order]);

  useEffect(() => {
    if (!loading && pendingScroll.current !== null) {
      const y = pendingScroll.current;
      pendingScroll.current = null;
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [books, loading]);

  function toggleTag(name) {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify({
        q, artistId, yearFrom, yearTo, language,
        activeTags: [...activeTags],
        status, signed, numbered, sort, order,
      }));
    } catch {}
  }, [q, artistId, yearFrom, yearTo, language, activeTags, status, signed, numbered, sort, order]);

  function clearFilters() {
    setQ(""); setArtistId(""); setYearFrom(""); setYearTo(""); setLanguage("");
    setActiveTags(new Set()); setStatus(""); setSigned(false); setNumbered(false);
    sessionStorage.removeItem(FILTER_KEY);
  }

  const activeFilterCount =
    [q, artistId, yearFrom, yearTo, language, status].filter(Boolean).length +
    (signed ? 1 : 0) + (numbered ? 1 : 0) + activeTags.size;

  return {
    books, loading, availableYears, activeFilterCount,
    q, setQ,
    artistId, setArtistId,
    yearFrom, setYearFrom,
    yearTo, setYearTo,
    language, setLanguage,
    activeTags, setActiveTags, toggleTag,
    status, setStatus,
    signed, setSigned,
    numbered, setNumbered,
    sort, setSort,
    order, setOrder,
    clearFilters,
  };
}

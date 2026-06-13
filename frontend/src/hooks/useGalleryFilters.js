import { useState, useEffect, useRef } from "react";
import useDebounce from "./useDebounce";
import api from "../api";

const _booksCache = {};

export default function useGalleryFilters() {
  const [q, setQ] = useState("");
  const [artistId, setArtistId] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [language, setLanguage] = useState("");
  const [activeTags, setActiveTags] = useState(() => new Set());
  const [status, setStatus] = useState("");
  const [signed, setSigned] = useState(false);
  const [numbered, setNumbered] = useState(false);
  const [sort, setSort] = useState("theme");
  const [order, setOrder] = useState("asc");

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

  function clearFilters() {
    setQ(""); setArtistId(""); setYearFrom(""); setYearTo(""); setLanguage("");
    setActiveTags(new Set()); setStatus(""); setSigned(false); setNumbered(false);
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

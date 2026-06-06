import { useState, useEffect } from "react";
import api from "../api";
import { parseLanguages } from "../constants/languages";

const EMPTY = {
  title: "", artist_id: "", publisher: "", year: "", edition: "", edition_year: "",
  language: [], isbn: "", signed: false, numbered: false,
  print_run: "", copy_number: "", status: "owned", hidden: false,
  acquisition_year: "", price_paid: "", description: "", colophon: "", notes: "",
  tag_ids: [],
};

function toForm(book) {
  return {
    title: book.title ?? "",
    artist_id: String(book.artist_id ?? book.artist?.id ?? ""),
    publisher: book.publisher ?? "",
    year: book.year != null ? String(book.year) : "",
    edition: book.edition ?? "",
    edition_year: book.edition_year != null ? String(book.edition_year) : "",
    language: parseLanguages(book.language ?? ""),
    isbn: book.isbn ?? "",
    signed: book.signed ?? false,
    numbered: book.numbered ?? false,
    print_run: book.print_run != null ? String(book.print_run) : "",
    copy_number: book.copy_number != null ? String(book.copy_number) : "",
    status: book.status ?? "owned",
    hidden: book.hidden ?? false,
    acquisition_year: book.acquisition_year != null ? String(book.acquisition_year) : "",
    price_paid: book.price_paid != null ? String(book.price_paid) : "",
    description: book.description ?? "",
    colophon: book.colophon ?? "",
    notes: book.notes ?? "",
    tag_ids: (book.tags ?? []).map(t => t.id),
  };
}

function toPayload(form) {
  return {
    title: form.title,
    artist_id: parseInt(form.artist_id),
    publisher: form.publisher || null,
    year: form.year ? parseInt(form.year) : null,
    edition: form.edition || null,
    edition_year: form.edition_year ? parseInt(form.edition_year) : null,
    language: form.language.join(" / ") || null,
    isbn: form.isbn || null,
    signed: form.signed,
    numbered: form.numbered,
    print_run: form.print_run ? parseInt(form.print_run) : null,
    copy_number: form.copy_number ? parseInt(form.copy_number) : null,
    status: form.status,
    hidden: form.hidden,
    acquisition_year: form.acquisition_year ? parseInt(form.acquisition_year) : null,
    price_paid: form.price_paid ? parseFloat(form.price_paid) : null,
    description: form.description || null,
    colophon: form.colophon || null,
    notes: form.notes || null,
    tag_ids: form.tag_ids,
  };
}

export default function useBookForm({ id, navigate }) {
  const isNew = !id;

  const [form, setForm] = useState(EMPTY);
  const [book, setBook] = useState(null);
  const [artists, setArtists] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  async function loadTags() {
    const tags = await api.getTags();
    setAllTags(tags);
  }

  async function loadArtists() {
    const data = await api.getArtists();
    setArtists(data);
  }

  async function loadBook() {
    const b = await api.getBook(id);
    setBook(b);
    setForm(toForm(b));
    setSelectedTags(b.tags ?? []);
  }

  useEffect(() => {
    loadArtists();
    loadTags();
    if (!isNew) loadBook();
  }, [id]);

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
    if (!form.artist_id) {
      setError("Artist is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...toPayload(form), tag_ids: selectedTags.map(t => t.id) };
      if (isNew) {
        const created = await api.createBook(payload);
        navigate(`/admin/books/${created.id}`, { replace: true });
      } else {
        await api.updateBook(id, payload);
        await loadBook();
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveWithOverrides(overrides) {
    const newForm = { ...form, ...overrides };
    setForm(newForm);
    setSaving(true);
    setError(null);
    try {
      const payload = { ...toPayload(newForm), tag_ids: selectedTags.map(t => t.id) };
      await api.updateBook(id, payload);
      await loadBook();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setSaving(false);
    }
  }

  return {
    isNew, form, set, book, loadBook,
    artists, allTags, loadArtists, loadTags,
    selectedTags, setSelectedTags,
    saving, saved, error, save, saveWithOverrides,
  };
}

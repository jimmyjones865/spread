import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import ImageManager from "../components/ImageManager";
import TagSelect from "../components/TagSelect";
import CurationPanel from "../components/CurationPanel";
import { useIsMobile } from "../hooks/useIsMobile";

const LANGUAGES = [
  "English", "Japanese", "German", "French", "Italian", "Spanish",
  "Dutch", "Swedish", "Norwegian", "Danish", "Finnish", "Korean",
  "Chinese", "Portuguese", "Polish", "Czech", "Russian", "Arabic",
  "Turkish", "Greek", "Hungarian", "Romanian", "Ukrainian", "Hebrew",
  "Persian", "Catalan",
];

const LANG_CODE_MAP = {
  en: "English", ja: "Japanese", de: "German", fr: "French", it: "Italian",
  es: "Spanish", nl: "Dutch", sv: "Swedish", no: "Norwegian", da: "Danish",
  fi: "Finnish", ko: "Korean", zh: "Chinese", pt: "Portuguese", pl: "Polish",
  cs: "Czech", ru: "Russian", ar: "Arabic", tr: "Turkish", el: "Greek",
  hu: "Hungarian", ro: "Romanian", uk: "Ukrainian", he: "Hebrew", fa: "Persian",
  ca: "Catalan",
};

function parseLanguages(str) {
  if (!str) return [];
  return str.split(/\s*[\/,]\s*/)
    .map(s => LANG_CODE_MAP[s.trim().toLowerCase()] || s.trim())
    .filter(Boolean);
}

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

export default function AdminBookForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

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

  async function loadArtists() {
    const data = await api.getArtists();
    setArtists(data);
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

  const links = book?.links ?? [];

  return (
    <div style={{ maxWidth: "760px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button onClick={() => navigate("/admin")} style={backBtn}>← Books</button>
        <h1 style={h1}>{isNew ? "New book" : form.title || "Edit book"}</h1>
      </div>

      {error && <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>{error}</p>}

      <form onSubmit={save}>
        <Section title="Metadata">
          <Row label="Title *">
            <Input value={form.title} onChange={v => set("title", v)} required />
          </Row>
          <Row label="Artist *">
            <ArtistCombobox
              artists={artists}
              value={form.artist_id}
              onChange={v => set("artist_id", v)}
              onArtistsChanged={loadArtists}
            />
          </Row>
          <Row label="Publisher"><Input value={form.publisher} onChange={v => set("publisher", v)} /></Row>
          <Row label="Year"><Input value={form.year} onChange={v => set("year", v)} type="number" /></Row>
          <Row label="Edition"><Input value={form.edition} onChange={v => set("edition", v)} placeholder='e.g. "1st", "XL"' /></Row>
          <Row label="Language">
            <LanguageCombobox value={form.language} onChange={v => set("language", v)} />
          </Row>
          <Row label="ISBN"><Input value={form.isbn} onChange={v => set("isbn", v)} /></Row>
        </Section>

        <Section title="Edition details">
          <Row label="Edition year"><Input value={form.edition_year} onChange={v => set("edition_year", v)} type="number" placeholder="Year of this edition" /></Row>
          <Row label="Print run"><Input value={form.print_run} onChange={v => set("print_run", v)} type="number" placeholder="Total copies" /></Row>
          <Row label="Copy number"><Input value={form.copy_number} onChange={v => set("copy_number", v)} type="number" /></Row>
          <Row label="">
            <label style={checkLabel}>
              <input type="checkbox" checked={form.signed} onChange={e => set("signed", e.target.checked)} />
              Signed
            </label>
            <label style={checkLabel}>
              <input type="checkbox" checked={form.numbered} onChange={e => set("numbered", e.target.checked)} />
              Numbered
            </label>
          </Row>
        </Section>

        <Section title="Collection">
          <Row label="Status">
            <select value={form.status} onChange={e => set("status", e.target.value)} style={inputStyle}>
              <option value="owned">Owned</option>
              <option value="on_order">On order</option>
              <option value="wishlist">Wishlist</option>
            </select>
          </Row>
          <Row label="Acquisition year"><Input value={form.acquisition_year} onChange={v => set("acquisition_year", v)} type="number" /></Row>
          <Row label="Price paid (€)"><Input value={form.price_paid} onChange={v => set("price_paid", v)} type="number" step="0.01" /></Row>
          <Row label="">
            <label style={checkLabel}>
              <input type="checkbox" checked={form.hidden} onChange={e => set("hidden", e.target.checked)} />
              Hidden (not shown publicly)
            </label>
          </Row>
        </Section>

        <Section title="Tags">
          <TagSelect
            allTags={allTags}
            selected={selectedTags}
            onChange={setSelectedTags}
            onTagsChanged={loadTags}
          />
        </Section>

        <Section title="Text">
          <Row label="Description">
            <textarea value={form.description} onChange={e => set("description", e.target.value)} style={{ ...inputStyle, height: "120px", resize: "vertical" }} />
          </Row>
          <Row label="Colophon">
            <textarea value={form.colophon} onChange={e => set("colophon", e.target.value)} style={{ ...inputStyle, height: "80px", resize: "vertical" }} />
          </Row>
          <Row label="Notes (private)">
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} style={{ ...inputStyle, height: "80px", resize: "vertical" }} />
          </Row>
        </Section>

        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button type="submit" disabled={saving} style={primaryBtn}>
              {saving ? "Saving…" : isNew ? "Create book" : "Save changes"}
            </button>
            {saved && <span style={{ fontSize: "13px", color: "var(--accent)" }}>✓ Saved</span>}
          </div>
        </div>
      </form>

      {!isNew && book && (
        <>
          <Section title="Images">
            <ImageManager
              bookId={parseInt(id)}
              images={book.images}
              onChange={loadBook}
            />
          </Section>

          <Section title="Scrape & Curate">
            <CurationPanel
              bookId={parseInt(id)}
              onImagesAdded={loadBook}
              onAddToBook={async (desc, colophon) => {
                const overrides = {};
                if (desc) overrides.description = desc;
                if (colophon) overrides.colophon = colophon;
                if (Object.keys(overrides).length > 0) await saveWithOverrides(overrides);
              }}
            />
          </Section>

          <Section title="Review links">
            <LinkManager bookId={parseInt(id)} links={links} onChanged={loadBook} />
          </Section>
        </>
      )}
    </div>
  );
}

function LinkManager({ bookId, links, onChanged }) {
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editId, setEditId] = useState(null);
  const [editUrl, setEditUrl] = useState("");
  const [editLabel, setEditLabel] = useState("");

  async function add() {
    if (!newUrl) return;
    await api.addLink(bookId, { url: newUrl, label: newLabel || null, sort_order: links.length });
    setNewUrl(""); setNewLabel("");
    onChanged();
  }

  async function save(linkId) {
    await api.updateLink(bookId, linkId, { url: editUrl, label: editLabel || null, sort_order: 0 });
    setEditId(null);
    onChanged();
  }

  return (
    <div>
      {links.map(link => (
        <div key={link.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
          {editId === link.id ? (
            <>
              <input value={editUrl} onChange={e => setEditUrl(e.target.value)} style={{ ...inputStyle, flex: 2 }} placeholder="URL" />
              <input value={editLabel} onChange={e => setEditLabel(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Label" />
              <button onClick={() => save(link.id)} style={ghostBtn}>Save</button>
              <button onClick={() => setEditId(null)} style={ghostBtn}>Cancel</button>
            </>
          ) : (
            <>
              <span style={{ flex: 2, fontSize: "13px", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <a href={link.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{link.label || link.url}</a>
              </span>
              <button onClick={() => { setEditId(link.id); setEditUrl(link.url); setEditLabel(link.label ?? ""); }} style={ghostBtn}>Edit</button>
              <button onClick={async () => { await api.deleteLink(bookId, link.id); onChanged(); }} style={{ ...ghostBtn, color: "var(--danger)" }}>✕</button>
            </>
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
        <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="URL" style={{ ...inputStyle, flex: 2 }} />
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label (optional)" style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={add} style={ghostBtn}>Add</button>
      </div>
    </div>
  );
}

function ArtistCombobox({ artists, value, onChange, onArtistsChanged }) {
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = artists.find(a => String(a.id) === String(value));

  async function select(artist) {
    onChange(String(artist.id));
    setInput("");
  }

  async function createAndSelect() {
    const name = input.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const artist = await api.createArtist({ name, country: null, instagram: null, website: null, bio: null });
      await onArtistsChanged();
      onChange(String(artist.id));
      setInput("");
    } finally {
      setCreating(false);
    }
  }

  if (value && !selected) {
    return <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading…</span>;
  }

  if (selected) {
    return (
      <span style={comboChip}>
        {selected.name}
        <button type="button" onClick={() => onChange("")} style={comboChipX}>✕</button>
      </span>
    );
  }

  const filtered = artists.filter(a => a.name.toLowerCase().includes(input.toLowerCase()));
  const showCreate = input.trim() && !artists.some(a => a.name.toLowerCase() === input.trim().toLowerCase());

  return (
    <div style={{ position: "relative" }}>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (filtered.length === 1 && !showCreate) select(filtered[0]);
          else if (showCreate) createAndSelect();
        }}
        onBlur={() => setTimeout(() => setInput(""), 150)}
        placeholder="Search or create artist…"
        style={inputStyle}
      />
      {input && (filtered.length > 0 || showCreate) && (
        <div style={comboDropdown}>
          {filtered.slice(0, 8).map(a => (
            <div key={a.id} onMouseDown={e => { e.preventDefault(); select(a); }} style={comboOption}>
              {a.name}
            </div>
          ))}
          {showCreate && (
            <div onMouseDown={e => { e.preventDefault(); createAndSelect(); }} style={{ ...comboOption, color: "var(--accent)" }}>
              {creating ? "Creating…" : `Create "${input.trim()}"`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LanguageCombobox({ value, onChange }) {
  const [input, setInput] = useState("");

  const filtered = LANGUAGES.filter(l =>
    l.toLowerCase().includes(input.toLowerCase()) && !value.includes(l)
  );
  const trimmed = input.trim();
  const showAdd = trimmed && !value.some(v => v.toLowerCase() === trimmed.toLowerCase());

  function add(lang) {
    if (!value.includes(lang)) onChange([...value, lang]);
    setInput("");
  }

  function addCustom() {
    if (!trimmed || value.some(v => v.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...value, trimmed]);
    setInput("");
  }

  function remove(lang) {
    onChange(value.filter(l => l !== lang));
  }

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
          {value.map(lang => (
            <span key={lang} style={comboChip}>
              {lang}
              <button type="button" onClick={() => remove(lang)} style={comboChipX}>✕</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (filtered.length === 1) add(filtered[0]);
            else if (showAdd) addCustom();
          }}
          onBlur={() => setTimeout(() => setInput(""), 150)}
          placeholder="Add language…"
          style={inputStyle}
        />
        {input && (filtered.length > 0 || showAdd) && (
          <div style={comboDropdown}>
            {filtered.slice(0, 7).map(lang => (
              <div key={lang} onMouseDown={e => { e.preventDefault(); add(lang); }} style={comboOption}>
                {lang}
              </div>
            ))}
            {showAdd && !filtered.some(l => l.toLowerCase() === trimmed.toLowerCase()) && (
              <div onMouseDown={e => { e.preventDefault(); addCustom(); }} style={{ ...comboOption, color: "var(--accent)" }}>
                Add "{trimmed}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h2 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", margin: "0 0 1rem", fontWeight: 500 }}>{title}</h2>
      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", padding: "1.25rem" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }) {
  const isMobile = useIsMobile();
  return (
    <div style={isMobile
      ? { marginBottom: "0.75rem" }
      : { display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.5rem 1rem", marginBottom: "0.75rem", alignItems: "start" }
    }>
      <label style={{ fontSize: "13px", color: "var(--text-muted)", display: "block", ...(isMobile ? { marginBottom: "0.25rem" } : { paddingTop: "0.5rem" }) }}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

function Input({ value, onChange, type = "text", ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={inputStyle}
      {...props}
    />
  );
}

const inputStyle = {
  width: "100%", padding: "0.5rem 0.6rem", background: "var(--bg-highlight)",
  border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text)",
  fontFamily: "var(--font-body)", fontSize: "14px", boxSizing: "border-box",
};
const checkLabel = { display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "14px", color: "var(--text)", marginRight: "1.5rem", cursor: "pointer" };
const h1 = { margin: 0, fontSize: "22px", fontWeight: 600, color: "var(--text-bright)" };
const backBtn = { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "14px", padding: 0 };
const primaryBtn = { background: "var(--accent-dim)", color: "var(--text-bright)", border: "none", borderRadius: "4px", padding: "0.6rem 1.5rem", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "14px" };
const ghostBtn = { background: "none", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.3rem 0.6rem", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px" };
const comboChip = { display: "inline-flex", alignItems: "center", gap: "0.25rem", background: "var(--bg-highlight)", color: "var(--text)", borderRadius: "4px", padding: "0.2rem 0.5rem", fontSize: "13px" };
const comboChipX = { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, fontSize: "12px" };
const comboDropdown = { position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "4px", zIndex: 20, marginTop: "2px", maxHeight: "200px", overflowY: "auto" };
const comboOption = { padding: "0.5rem 0.75rem", cursor: "pointer", fontSize: "14px", color: "var(--text)" };

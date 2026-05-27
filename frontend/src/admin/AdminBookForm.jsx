import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import ImageManager from "../components/ImageManager";
import TagSelect from "../components/TagSelect";
import CurationPanel from "../components/CurationPanel";

const EMPTY = {
  title: "", artist_id: "", publisher: "", year: "", edition: "",
  language: "", isbn: "", signed: false, numbered: false,
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
    language: book.language ?? "",
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
    language: form.language || null,
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
    api.getArtists().then(setArtists);
    loadTags();
    if (!isNew) loadBook();
  }, [id]);

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
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
            <select value={form.artist_id} onChange={e => set("artist_id", e.target.value)} required style={inputStyle}>
              <option value="">Select artist…</option>
              {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Row>
          <Row label="Publisher"><Input value={form.publisher} onChange={v => set("publisher", v)} /></Row>
          <Row label="Year"><Input value={form.year} onChange={v => set("year", v)} type="number" /></Row>
          <Row label="Edition"><Input value={form.edition} onChange={v => set("edition", v)} placeholder='e.g. "1st", "XL"' /></Row>
          <Row label="Language"><Input value={form.language} onChange={v => set("language", v)} placeholder="en, ja, de…" /></Row>
          <Row label="ISBN"><Input value={form.isbn} onChange={v => set("isbn", v)} /></Row>
        </Section>

        <Section title="Edition details">
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
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.5rem 1rem", marginBottom: "0.75rem", alignItems: "start" }}>
      <label style={{ fontSize: "13px", color: "var(--text-muted)", paddingTop: "0.5rem" }}>{label}</label>
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

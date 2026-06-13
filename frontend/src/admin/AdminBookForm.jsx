import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import ImageManager from "../components/ImageManager";
import TagSelect from "../components/TagSelect";
import CurationPanel from "../components/CurationPanel";
import LinkManager from "./LinkManager";
import ArtistCombobox from "./ArtistCombobox";
import LanguageCombobox from "./LanguageCombobox";
import { Section, Row, Input, inputStyle } from "./Field";
import useBookForm from "../hooks/useBookForm";
import api from "../api";

export default function AdminBookForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bookIds, setBookIds] = useState([]);

  useEffect(() => {
    api.getBooks().then(books => setBookIds(books.map(b => b.id))).catch(() => {});
  }, []);

  const {
    isNew, form, set, book, loadBook,
    artists, allTags, loadArtists, loadTags,
    selectedTags, setSelectedTags,
    saving, saved, error, save, saveWithOverrides,
  } = useBookForm({ id, navigate });

  const links = book?.links ?? [];

  const numId = id ? parseInt(id) : null;
  const idx = bookIds.indexOf(numId);
  const prevId = idx > 0 ? bookIds[idx - 1] : null;
  const nextId = idx >= 0 && idx < bookIds.length - 1 ? bookIds[idx + 1] : null;

  return (
    <div style={{ maxWidth: "760px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button onClick={() => navigate("/admin")} style={backBtn}>← Books</button>
        <h1 style={{ ...h1, flex: 1 }}>{isNew ? "New book" : form.title || "Edit book"}</h1>
        {!isNew && bookIds.length > 0 && (
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button onClick={() => navigate(`/admin/books/${prevId}`)} disabled={!prevId} style={navBtn}>‹ Prev</button>
            <button onClick={() => navigate(`/admin/books/${nextId}`)} disabled={!nextId} style={navBtn}>Next ›</button>
          </div>
        )}
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

const checkLabel = { display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "14px", color: "var(--text)", marginRight: "1.5rem", cursor: "pointer" };
const h1 = { margin: 0, fontSize: "22px", fontWeight: 600, color: "var(--text-bright)" };
const backBtn = { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "14px", padding: 0 };
const primaryBtn = { background: "var(--accent-dim)", color: "var(--text-bright)", border: "none", borderRadius: "4px", padding: "0.6rem 1.5rem", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "14px" };
const navBtn = { background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: "4px", padding: "0.3rem 0.75rem", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px" };

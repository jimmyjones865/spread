import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ConfirmModal from "../components/ConfirmModal";

const STATUS_LABEL = { owned: "Owned", on_order: "On order", wishlist: "Wishlist" };
const STATUS_COLOR = { owned: "var(--text-muted)", on_order: "var(--accent)", wishlist: "var(--accent-dim)" };

export default function AdminBooks() {
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("list");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const navigate = useNavigate();

  async function load() {
    setBooks(await api.getBooks());
  }

  useEffect(() => { load(); }, []);

  async function confirmDelete() {
    await api.deleteBook(deleteTarget);
    setDeleteTarget(null);
    load();
  }

  return (
    <div style={{ maxWidth: "760px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={h1}>Books</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setView(v => v === "list" ? "grid" : "list")} style={ghostBtn} title="Toggle view">
            {view === "list" ? "⊞ Grid" : "≡ List"}
          </button>
          <button onClick={() => navigate("/admin/books/new")} style={primaryBtn}>+ Add book</button>
        </div>
      </div>

      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search title or artist…"
        style={searchInput}
      />

      {books.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No books yet.</p>
      )}

      {(() => {
        const filtered = books.filter(b => {
          const q = query.toLowerCase();
          return !q || b.title.toLowerCase().includes(q) || b.artist.name.toLowerCase().includes(q);
        });

        if (view === "grid") {
          return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              {filtered.map(book => (
                <div
                  key={book.id}
                  onClick={() => navigate(`/admin/books/${book.id}`)}
                  style={{ width: 120, cursor: "pointer" }}
                >
                  {book.cover ? (
                    <img
                      src={`/images/${book.id}/${book.cover.filename}`}
                      alt=""
                      style={{ width: 120, height: 160, objectFit: "cover", borderRadius: "3px", display: "block" }}
                    />
                  ) : (
                    <div style={{ width: 120, height: 160, background: "var(--bg-highlight)", borderRadius: "3px" }} />
                  )}
                  <div style={{ fontSize: "12px", color: "var(--text)", fontWeight: 500, marginTop: "0.4rem", lineHeight: 1.3 }}>{book.title}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{book.artist.name}</div>
                </div>
              ))}
            </div>
          );
        }

        return (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {filtered.map(book => (
                <tr key={book.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.6rem 0.5rem", width: 52 }}>
                    {book.cover ? (
                      <img
                        src={`/images/${book.id}/${book.cover.filename}`}
                        alt=""
                        style={{ width: 40, height: 40, objectFit: "cover", borderRadius: "2px", display: "block" }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, background: "var(--bg-highlight)", borderRadius: "2px" }} />
                    )}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem" }}>
                    <div style={{ fontSize: "14px", color: "var(--text)", fontWeight: 500 }}>{book.title}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{book.artist.name}{book.year ? ` · ${book.year}` : ""}</div>
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem", fontSize: "12px" }}>
                    <span style={{ color: STATUS_COLOR[book.status] }}>{STATUS_LABEL[book.status]}</span>
                    {book.hidden && <span style={{ marginLeft: "0.5rem", color: "var(--text-muted)", opacity: 0.6 }}>hidden</span>}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>
                    <button onClick={() => navigate(`/admin/books/${book.id}`)} style={ghostBtn}>Edit</button>
                    <button onClick={e => { e.stopPropagation(); setDeleteTarget(book.id); }} style={{ ...ghostBtn, color: "var(--danger)" }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      })()}

      {deleteTarget && (
        <ConfirmModal
          message="Delete this book? All images will be removed. This cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

const h1 = { margin: 0, fontSize: "22px", fontWeight: 600, color: "var(--text-bright)" };
const primaryBtn = {
  background: "var(--accent-dim)", color: "var(--text-bright)", border: "none",
  borderRadius: "4px", padding: "0.5rem 1.25rem", cursor: "pointer",
  fontFamily: "var(--font-body)", fontSize: "14px",
};
const ghostBtn = {
  background: "none", color: "var(--text-muted)", border: "none",
  cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px",
  padding: "0.25rem 0.5rem",
};
const searchInput = {
  width: "100%", padding: "0.5rem 0.6rem", marginBottom: "1rem",
  background: "var(--bg-highlight)", border: "1px solid var(--border)",
  borderRadius: "4px", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "14px",
};

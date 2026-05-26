import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ConfirmModal from "../components/ConfirmModal";

const STATUS_LABEL = { owned: "Owned", on_order: "On order", wishlist: "Wishlist" };
const STATUS_COLOR = { owned: "var(--text-muted)", on_order: "var(--accent)", wishlist: "var(--accent-dim)" };

export default function AdminBooks() {
  const [books, setBooks] = useState([]);
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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={h1}>Books</h1>
        <button onClick={() => navigate("/admin/books/new")} style={primaryBtn}>+ Add book</button>
      </div>

      {books.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No books yet.</p>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {books.map(book => (
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
                <button onClick={() => setDeleteTarget(book.id)} style={{ ...ghostBtn, color: "var(--danger)" }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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

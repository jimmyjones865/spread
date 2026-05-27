import { useState, useEffect } from "react";
import api from "../api";
import ConfirmModal from "../components/ConfirmModal";

export default function AdminTags() {
  const [tags, setTags] = useState([]);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  async function load() { setTags(await api.getTags()); }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.createTag(newName.trim());
      setNewName("");
      load();
    } catch (e) { setError(e.message); }
  }

  async function save(id) {
    if (!editName.trim()) return;
    await api.updateTag(id, editName.trim());
    setEditId(null);
    load();
  }

  async function confirmDelete() {
    await api.deleteTag(deleteTarget);
    setDeleteTarget(null);
    load();
  }

  return (
    <div style={{ maxWidth: "760px" }}>
      <h1 style={h1}>Tags</h1>

      {error && <p style={{ color: "var(--danger)", fontSize: "14px" }}>{error}</p>}

      <form onSubmit={create} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New tag name…"
          style={inputStyle}
        />
        <button type="submit" style={primaryBtn}>Add</button>
      </form>

      {tags.length === 0 && <p style={{ color: "var(--text-muted)" }}>No tags yet.</p>}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {tags.map(tag => (
            <tr key={tag.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "0.6rem 0.5rem" }}>
                {editId === tag.id ? (
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    autoFocus
                    style={{ ...inputStyle, width: "auto" }}
                    onKeyDown={e => { if (e.key === "Enter") save(tag.id); if (e.key === "Escape") setEditId(null); }}
                  />
                ) : (
                  <>
                    <div style={{ fontSize: "14px", color: "var(--text)", fontWeight: 500 }}>{tag.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{tag.book_count} {tag.book_count === 1 ? "book" : "books"}</div>
                  </>
                )}
              </td>
              <td style={{ padding: "0.5rem", textAlign: "right" }}>
                {editId === tag.id ? (
                  <>
                    <button onClick={() => save(tag.id)} style={ghostBtn}>Save</button>
                    <button onClick={() => setEditId(null)} style={ghostBtn}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditId(tag.id); setEditName(tag.name); }} style={ghostBtn}>Rename</button>
                    <button onClick={() => setDeleteTarget(tag.id)} style={{ ...ghostBtn, color: "var(--danger)" }}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {deleteTarget && (
        <ConfirmModal
          message="Delete this tag? It will be removed from all books."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

const h1 = { margin: "0 0 1.5rem", fontSize: "22px", fontWeight: 600, color: "var(--text-bright)" };
const inputStyle = { flex: 1, padding: "0.5rem 0.6rem", background: "var(--bg-highlight)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "14px" };
const primaryBtn = { background: "var(--accent-dim)", color: "var(--text-bright)", border: "none", borderRadius: "4px", padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "14px" };
const ghostBtn = { background: "none", color: "var(--text-muted)", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px", padding: "0.25rem 0.5rem" };

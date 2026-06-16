import { useState, useEffect } from "react";
import api from "../api";
import ConfirmModal from "../components/ConfirmModal";

export default function AdminTags() {
  const [tags, setTags] = useState([]);
  const [combos, setCombos] = useState([]);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    const [t, c] = await Promise.all([api.getTags(), api.getCombinations()]);
    setTags(t);
    setCombos(c);
  }
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

  // ── Combinations: drag-free arrow reordering. ───────────────────────────
  // The list is the source of truth: we move rows in the local state, then
  // POST the new id list. Backend rewrites sort_order from index 0.
  async function moveCombo(fromIdx, toIdx) {
    if (toIdx < 0 || toIdx >= combos.length) return;
    const next = [...combos];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setCombos(next);
    await api.reorderCombinations(next.map(c => c.id));
  }

  function comboLabel(c) {
    if (!c.tag_names.length) return "(no tags)";
    return c.tag_names.join(" + ");
  }

  return (
    <div style={{ maxWidth: "760px" }}>
      <h1 style={h1}>Tags</h1>

      {error && <p style={{ color: "var(--danger)", fontSize: "0.9375rem" }}>{error}</p>}

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
                    <div style={{ fontSize: "0.9375rem", color: "var(--text)", fontWeight: 500 }}>{tag.name}</div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{tag.book_count} {tag.book_count === 1 ? "book" : "books"}</div>
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

      <h2 style={{ ...h1, fontSize: "1.25rem", marginTop: "2.5rem", marginBottom: "0.5rem" }}>Tag combinations</h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: "0 0 1rem" }}>
        Order of the gallery when sorted by <strong>Theme</strong>. New combinations are added at the bottom when you save a book — use ↑↓ to set their position.
      </p>

      {combos.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No combinations yet — they're created automatically when you tag a book.</p>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {combos.map((c, i) => (
            <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "0.6rem 0.3rem", width: "60px", whiteSpace: "nowrap" }}>
                <button
                  onClick={() => moveCombo(i, i - 1)}
                  disabled={i === 0}
                  style={{ ...arrowBtn, opacity: i === 0 ? 0.25 : 1 }}
                  title="Move up"
                >↑</button>
                <button
                  onClick={() => moveCombo(i, i + 1)}
                  disabled={i === combos.length - 1}
                  style={{ ...arrowBtn, opacity: i === combos.length - 1 ? 0.25 : 1 }}
                  title="Move down"
                >↓</button>
              </td>
              <td style={{ padding: "0.6rem 0.5rem" }}>
                <div style={{ fontSize: "0.9375rem", color: "var(--text)", fontWeight: 500 }}>{comboLabel(c)}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                  {c.book_count} {c.book_count === 1 ? "book" : "books"}
                </div>
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

const h1 = { margin: "0 0 1.5rem", fontSize: "1.5rem", fontWeight: 600, color: "var(--text-bright)" };
const inputStyle = { flex: 1, padding: "0.5rem 0.6rem", background: "var(--bg-highlight)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "0.9375rem" };
const primaryBtn = { background: "var(--accent-dim)", color: "var(--text-bright)", border: "none", borderRadius: "4px", padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.9375rem" };
const ghostBtn = { background: "none", color: "var(--text-muted)", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.875rem", padding: "0.25rem 0.5rem" };
const arrowBtn = { background: "none", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "3px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.875rem", padding: "0.1rem 0.4rem", marginRight: "0.25rem" };

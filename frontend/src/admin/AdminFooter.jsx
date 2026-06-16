import { useState, useEffect } from "react";
import api from "../api";
import ConfirmModal from "../components/ConfirmModal";

const EMPTY = { type: "link", label: "", url: "", sort_order: 0 };

export default function AdminFooter() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  async function load() { setItems(await api.getFooter()); }
  useEffect(() => { load(); }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function startEdit(item) {
    setForm({ type: item.type, label: item.label, url: item.url ?? "", sort_order: item.sort_order });
    setEditId(item.id);
    setError(null);
  }

  function cancelEdit() { setEditId(null); setForm(EMPTY); }

  async function save() {
    const payload = { ...form, url: form.url || null, sort_order: parseInt(form.sort_order) || 0 };
    try {
      if (editId) {
        await api.updateFooterItem(editId, payload);
      } else {
        await api.createFooterItem({ ...payload, sort_order: items.length });
      }
      cancelEdit();
      load();
    } catch (e) { setError(e.message); }
  }

  async function move(id, direction) {
    const ids = items.map(i => i.id);
    const idx = ids.indexOf(id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= ids.length) return;
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    await api.reorderFooter(ids);
    load();
  }

  async function confirmDelete() {
    await api.deleteFooterItem(deleteTarget);
    setDeleteTarget(null);
    load();
  }

  return (
    <div style={{ maxWidth: "600px" }}>
      <h1 style={h1}>Footer</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", marginBottom: "1.5rem" }}>
        Items appear in the public footer in this order. Links and plain text are both supported.
      </p>

      {error && <p style={{ color: "var(--danger)", fontSize: "0.9375rem" }}>{error}</p>}

      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", padding: "1.25rem", marginBottom: "1.5rem" }}>
        <h2 style={sectionTitle}>{editId ? "Edit item" : "Add item"}</h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <select value={form.type} onChange={e => set("type", e.target.value)} style={{ ...inputStyle, width: "110px" }}>
            <option value="link">Link</option>
            <option value="text">Text</option>
          </select>
          <input
            value={form.label}
            onChange={e => set("label", e.target.value)}
            placeholder={form.type === "link" ? "Link text" : "Display text"}
            style={{ ...inputStyle, flex: 1, minWidth: "120px" }}
          />
          {form.type === "link" && (
            <input
              value={form.url}
              onChange={e => set("url", e.target.value)}
              placeholder="/about or https://…"
              style={{ ...inputStyle, flex: 2, minWidth: "160px" }}
            />
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <button onClick={save} style={primaryBtn}>{editId ? "Save" : "Add"}</button>
          {editId && <button onClick={cancelEdit} style={ghostBtn}>Cancel</button>}
        </div>
      </div>

      {items.length === 0 && <p style={{ color: "var(--text-muted)" }}>No footer items yet.</p>}

      <div>
        {items.map((item, idx) => (
          <div key={item.id} style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.6rem 0.5rem", borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginRight: "0.25rem" }}>
              <button onClick={() => move(item.id, -1)} disabled={idx === 0} style={arrowBtn}>↑</button>
              <button onClick={() => move(item.id, 1)} disabled={idx === items.length - 1} style={arrowBtn}>↓</button>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", width: 32, textAlign: "center", fontFamily: "var(--font-mono)" }}>
              {item.type === "link" ? "link" : "text"}
            </span>
            <span style={{ flex: 1, fontSize: "0.9375rem", color: "var(--text)" }}>
              {item.label}
              {item.url && <span style={{ marginLeft: "0.5rem", fontSize: "0.8125rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{item.url}</span>}
            </span>
            <button onClick={() => startEdit(item)} style={ghostBtn}>Edit</button>
            <button onClick={() => setDeleteTarget(item.id)} style={{ ...ghostBtn, color: "var(--danger)" }}>✕</button>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <ConfirmModal
          message="Remove this footer item?"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

const h1 = { margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 600, color: "var(--text-bright)" };
const sectionTitle = { margin: "0 0 0.75rem", fontSize: "0.9375rem", fontWeight: 600, color: "var(--text)" };
const inputStyle = { padding: "0.5rem 0.6rem", background: "var(--bg-highlight)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "0.9375rem", boxSizing: "border-box" };
const primaryBtn = { background: "var(--accent-dim)", color: "var(--text-bright)", border: "none", borderRadius: "4px", padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.9375rem" };
const ghostBtn = { background: "none", color: "var(--text-muted)", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.875rem", padding: "0.25rem 0.5rem" };
const arrowBtn = { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0 2px", fontSize: "0.75rem", lineHeight: 1 };

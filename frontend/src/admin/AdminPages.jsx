import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ConfirmModal from "../components/ConfirmModal";

export default function AdminPages() {
  const [pages, setPages] = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ slug: "", title: "", body: "" });
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  async function load() { setPages(await api.getPages()); }
  useEffect(() => { load(); }, []);

  function startNew() {
    setForm({ slug: "", title: "", body: "" });
    setEditId(null);
    setIsNew(true);
    setError(null);
  }

  function startEdit(page) {
    setForm({ slug: page.slug, title: page.title, body: page.body });
    setEditId(page.id);
    setIsNew(false);
    setError(null);
  }

  async function save() {
    setError(null);
    try {
      if (isNew) {
        await api.createPage(form);
      } else {
        await api.updatePage(editId, form);
      }
      setEditId(null);
      setIsNew(false);
      load();
    } catch (e) { setError(e.message); }
  }

  async function confirmDelete() {
    await api.deletePage(deleteTarget);
    setDeleteTarget(null);
    load();
  }

  const editing = isNew || editId !== null;

  return (
    <div style={{ maxWidth: "760px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={h1}>Pages</h1>
        {!editing && <button onClick={startNew} style={primaryBtn}>+ New page</button>}
      </div>

      {editing && (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h2 style={sectionTitle}>{isNew ? "New page" : "Edit page"}</h2>
          {error && <p style={{ color: "var(--danger)", fontSize: "14px" }}>{error}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={labelStyle}>Slug (URL path)</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="about" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={labelStyle}>Body (markdown)</label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              style={{ ...inputStyle, height: "240px", resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "13px" }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={save} style={primaryBtn}>Save</button>
            <button onClick={() => { setEditId(null); setIsNew(false); }} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {pages.length === 0 && !editing && <p style={{ color: "var(--text-muted)" }}>No pages yet.</p>}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {pages.map(page => (
            <tr key={page.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "0.6rem 0.5rem" }}>
                <div style={{ fontSize: "14px", color: "var(--text)", fontWeight: 500 }}>{page.title}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>/{page.slug}</div>
              </td>
              <td style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>
                <button onClick={() => startEdit(page)} style={ghostBtn}>Edit</button>
                <button onClick={() => setDeleteTarget(page.id)} style={{ ...ghostBtn, color: "var(--danger)" }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {deleteTarget && (
        <ConfirmModal
          message="Delete this page? This cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

const h1 = { margin: 0, fontSize: "22px", fontWeight: 600, color: "var(--text-bright)" };
const sectionTitle = { margin: "0 0 1rem", fontSize: "15px", fontWeight: 600, color: "var(--text)" };
const labelStyle = { display: "block", fontSize: "13px", color: "var(--text-muted)", marginBottom: "0.3rem" };
const inputStyle = { width: "100%", padding: "0.5rem 0.6rem", background: "var(--bg-highlight)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "14px", boxSizing: "border-box" };
const primaryBtn = { background: "var(--accent-dim)", color: "var(--text-bright)", border: "none", borderRadius: "4px", padding: "0.5rem 1.25rem", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "14px" };
const ghostBtn = { background: "none", color: "var(--text-muted)", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px", padding: "0.25rem 0.5rem" };

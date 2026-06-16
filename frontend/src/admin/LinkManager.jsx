import { useState } from "react";
import api from "../api";
import { inputStyle } from "./Field";

export default function LinkManager({ bookId, links, onChanged }) {
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
              <span style={{ flex: 2, fontSize: "0.875rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

const ghostBtn = { background: "none", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.3rem 0.6rem", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.875rem" };

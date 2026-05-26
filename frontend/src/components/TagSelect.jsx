import { useState } from "react";
import api from "../api";

export default function TagSelect({ allTags, selected, onChange, onTagsChanged }) {
  const [input, setInput] = useState("");

  const selectedIds = new Set(selected.map(t => t.id));
  const filtered = allTags.filter(t =>
    t.name.toLowerCase().includes(input.toLowerCase()) && !selectedIds.has(t.id)
  );
  const showCreate = input.trim() && !allTags.find(t => t.name.toLowerCase() === input.trim().toLowerCase());

  async function addTag(tag) {
    onChange([...selected, tag]);
    setInput("");
  }

  async function createAndAdd() {
    const name = input.trim();
    if (!name) return;
    const tag = await api.createTag(name);
    onTagsChanged();
    addTag(tag);
  }

  function remove(tagId) {
    onChange(selected.filter(t => t.id !== tagId));
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
        {selected.map(tag => (
          <span key={tag.id} style={chipStyle}>
            {tag.name}
            <button onClick={() => remove(tag.id)} style={chipX}>✕</button>
          </span>
        ))}
      </div>
      <div style={{ position: "relative" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Add tag…"
          style={inputStyle}
        />
        {(filtered.length > 0 || showCreate) && input && (
          <div style={dropdownStyle}>
            {filtered.slice(0, 8).map(tag => (
              <div key={tag.id} onClick={() => addTag(tag)} style={optionStyle}>
                {tag.name}
              </div>
            ))}
            {showCreate && (
              <div onClick={createAndAdd} style={{ ...optionStyle, color: "var(--accent)" }}>
                Create "{input.trim()}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const chipStyle = {
  display: "inline-flex", alignItems: "center", gap: "0.25rem",
  background: "var(--bg-highlight)", color: "var(--text)",
  borderRadius: "4px", padding: "0.2rem 0.5rem", fontSize: "13px",
};
const chipX = {
  background: "none", border: "none", color: "var(--text-muted)",
  cursor: "pointer", padding: 0, fontSize: "12px",
};
const inputStyle = {
  width: "100%", padding: "0.5rem", background: "var(--bg-highlight)",
  border: "1px solid var(--border)", borderRadius: "4px",
  color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "14px",
};
const dropdownStyle = {
  position: "absolute", top: "100%", left: 0, right: 0,
  background: "var(--bg-elevated)", border: "1px solid var(--border)",
  borderRadius: "4px", zIndex: 10, marginTop: "2px",
};
const optionStyle = {
  padding: "0.5rem 0.75rem", cursor: "pointer", fontSize: "14px",
  color: "var(--text)",
};

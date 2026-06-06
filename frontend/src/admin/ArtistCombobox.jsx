import { useState } from "react";
import api from "../api";
import { inputStyle } from "./Field";
import { comboChip, comboChipX, comboDropdown, comboOption } from "./ComboboxStyles";

export default function ArtistCombobox({ artists, value, onChange, onArtistsChanged }) {
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = artists.find(a => String(a.id) === String(value));

  async function select(artist) {
    onChange(String(artist.id));
    setInput("");
  }

  async function createAndSelect() {
    const name = input.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const artist = await api.createArtist({ name, country: null, instagram: null, website: null, bio: null });
      await onArtistsChanged();
      onChange(String(artist.id));
      setInput("");
    } finally {
      setCreating(false);
    }
  }

  if (value && !selected) {
    return <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading…</span>;
  }

  if (selected) {
    return (
      <span style={comboChip}>
        {selected.name}
        <button type="button" onClick={() => onChange("")} style={comboChipX}>✕</button>
      </span>
    );
  }

  const filtered = artists.filter(a => a.name.toLowerCase().includes(input.toLowerCase()));
  const showCreate = input.trim() && !artists.some(a => a.name.toLowerCase() === input.trim().toLowerCase());

  return (
    <div style={{ position: "relative" }}>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (filtered.length === 1 && !showCreate) select(filtered[0]);
          else if (showCreate) createAndSelect();
        }}
        onBlur={() => setTimeout(() => setInput(""), 150)}
        placeholder="Search or create artist…"
        style={inputStyle}
      />
      {input && (filtered.length > 0 || showCreate) && (
        <div style={comboDropdown}>
          {filtered.slice(0, 8).map(a => (
            <div key={a.id} onMouseDown={e => { e.preventDefault(); select(a); }} style={comboOption}>
              {a.name}
            </div>
          ))}
          {showCreate && (
            <div onMouseDown={e => { e.preventDefault(); createAndSelect(); }} style={{ ...comboOption, color: "var(--accent)" }}>
              {creating ? "Creating…" : `Create "${input.trim()}"`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

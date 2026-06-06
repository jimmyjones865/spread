import { useState } from "react";
import { LANGUAGES } from "../constants/languages";
import { inputStyle } from "./Field";
import { comboChip, comboChipX, comboDropdown, comboOption } from "./ComboboxStyles";

export default function LanguageCombobox({ value, onChange }) {
  const [input, setInput] = useState("");

  const filtered = LANGUAGES.filter(l =>
    l.toLowerCase().includes(input.toLowerCase()) && !value.includes(l)
  );
  const trimmed = input.trim();
  const showAdd = trimmed && !value.some(v => v.toLowerCase() === trimmed.toLowerCase());

  function add(lang) {
    if (!value.includes(lang)) onChange([...value, lang]);
    setInput("");
  }

  function addCustom() {
    if (!trimmed || value.some(v => v.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...value, trimmed]);
    setInput("");
  }

  function remove(lang) {
    onChange(value.filter(l => l !== lang));
  }

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
          {value.map(lang => (
            <span key={lang} style={comboChip}>
              {lang}
              <button type="button" onClick={() => remove(lang)} style={comboChipX}>✕</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (filtered.length === 1) add(filtered[0]);
            else if (showAdd) addCustom();
          }}
          onBlur={() => setTimeout(() => setInput(""), 150)}
          placeholder="Add language…"
          style={inputStyle}
        />
        {input && (filtered.length > 0 || showAdd) && (
          <div style={comboDropdown}>
            {filtered.slice(0, 7).map(lang => (
              <div key={lang} onMouseDown={e => { e.preventDefault(); add(lang); }} style={comboOption}>
                {lang}
              </div>
            ))}
            {showAdd && !filtered.some(l => l.toLowerCase() === trimmed.toLowerCase()) && (
              <div onMouseDown={e => { e.preventDefault(); addCustom(); }} style={{ ...comboOption, color: "var(--accent)" }}>
                Add "{trimmed}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

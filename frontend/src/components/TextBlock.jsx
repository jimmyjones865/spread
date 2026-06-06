import { useState } from "react";
import { ghostBtn, activeBtn } from "./CurationStyles";

export default function TextBlock({ text, inDesc, inColophon, onDescToggle, onColophonToggle }) {
  const [expanded, setExpanded] = useState(false);
  const preview = text.length > 200 && !expanded ? text.slice(0, 200) + "…" : text;
  const highlighted = inDesc || inColophon;

  return (
    <div style={{
      background: highlighted ? "#4c566a" : "var(--bg-highlight)",
      border: `2px solid ${highlighted ? "var(--accent)" : "var(--border)"}`,
      borderRadius: "4px",
      padding: "0.6rem 0.75rem",
    }}>
      <p style={{ margin: "0 0 0.5rem", fontSize: "13px", color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
        {preview}
        {text.length > 200 && (
          <button onClick={() => setExpanded(v => !v)} style={{ ...ghostBtn, marginLeft: "0.5rem", padding: "0 4px", fontSize: "12px" }}>
            {expanded ? "less" : "more"}
          </button>
        )}
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={onDescToggle} style={{ ...ghostBtn, ...(inDesc ? activeBtn : {}) }}>→ Description</button>
        <button onClick={onColophonToggle} style={{ ...ghostBtn, ...(inColophon ? activeBtn : {}) }}>→ Colophon</button>
      </div>
    </div>
  );
}

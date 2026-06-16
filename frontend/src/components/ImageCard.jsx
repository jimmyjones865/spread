import { useState } from "react";
import { fmtSize } from "../utils/format";

const miniBtn = { background: "none", border: "none", padding: "4px 2px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.75rem" };

export default function ImageCard({ url, isCover, isSpread, spreadIdx, sizeBytes, dims, onCover, onSpread, onDimsLoaded }) {
  const [broken, setBroken] = useState(false);
  const highlight = isCover ? "#4c566a" : isSpread ? "#3b4252" : "transparent";
  const borderColor = isCover ? "var(--accent)" : isSpread ? "#5e81ac" : "var(--border)";

  return (
    <div style={{ width: "130px", border: `2px solid ${borderColor}`, borderRadius: "4px", background: highlight, overflow: "hidden", flexShrink: 0 }}>
      <div style={{ height: "100px", background: "var(--bg-highlight)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {broken ? (
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "4px", textAlign: "center" }}>No preview</span>
        ) : (
          <img
            src={url}
            alt=""
            onError={() => setBroken(true)}
            onLoad={e => onDimsLoaded(e.target.naturalWidth, e.target.naturalHeight)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
        {isCover && <div style={{ position: "absolute", top: "3px", left: "3px", background: "var(--accent)", color: "#fff", fontSize: "0.6875rem", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>COVER</div>}
        {isSpread && <div style={{ position: "absolute", top: "3px", left: "3px", background: "#5e81ac", color: "#fff", fontSize: "0.6875rem", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>#{spreadIdx + 1}</div>}
      </div>
      {(dims || fmtSize(sizeBytes)) && (
        <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textAlign: "center", padding: "2px 4px", borderTop: "1px solid var(--border)", lineHeight: 1.4 }}>
          {dims && <div>{dims.w}×{dims.h}</div>}
          {fmtSize(sizeBytes) && <div>{fmtSize(sizeBytes)}</div>}
        </div>
      )}
      <div style={{ display: "flex", borderTop: "1px solid var(--border)" }}>
        <button onClick={onCover} style={{ ...miniBtn, flex: 1, color: isCover ? "var(--accent)" : "var(--text-muted)", borderRight: "1px solid var(--border)" }}>Cover</button>
        <button onClick={onSpread} style={{ ...miniBtn, flex: 1, color: isSpread ? "#5e81ac" : "var(--text-muted)" }}>Spread</button>
      </div>
    </div>
  );
}

export default function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div style={{
        background: "var(--bg-elevated)", border: "1px solid var(--border)",
        borderRadius: "8px", padding: "2rem", maxWidth: "400px", width: "90%",
      }}>
        <p style={{ margin: "0 0 1.5rem", color: "var(--text)" }}>{message}</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={btnStyle("var(--bg-highlight)")}>Cancel</button>
          <button onClick={onConfirm} style={btnStyle("var(--danger)")}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(bg) {
  return {
    background: bg, color: "var(--text-bright)", border: "none",
    borderRadius: "4px", padding: "0.5rem 1.25rem", cursor: "pointer",
    fontFamily: "var(--font-body)", fontSize: "0.9375rem",
  };
}

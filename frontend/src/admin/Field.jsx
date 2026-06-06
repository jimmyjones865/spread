import { useIsMobile } from "../hooks/useIsMobile";

export const inputStyle = {
  width: "100%", padding: "0.5rem 0.6rem", background: "var(--bg-highlight)",
  border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text)",
  fontFamily: "var(--font-body)", fontSize: "14px", boxSizing: "border-box",
};

export function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h2 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", margin: "0 0 1rem", fontWeight: 500 }}>{title}</h2>
      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", padding: "1.25rem" }}>
        {children}
      </div>
    </div>
  );
}

export function Row({ label, children }) {
  const isMobile = useIsMobile();
  return (
    <div style={isMobile
      ? { marginBottom: "0.75rem" }
      : { display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.5rem 1rem", marginBottom: "0.75rem", alignItems: "start" }
    }>
      <label style={{ fontSize: "13px", color: "var(--text-muted)", display: "block", ...(isMobile ? { marginBottom: "0.25rem" } : { paddingTop: "0.5rem" }) }}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

export function Input({ value, onChange, type = "text", ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={inputStyle}
      {...props}
    />
  );
}

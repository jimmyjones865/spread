import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") ?? "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const light = theme === "light";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <span style={{ fontSize: "11px", color: "var(--text-muted)", userSelect: "none" }}>☀</span>
      <button
        role="switch"
        aria-checked={light}
        aria-label="Toggle light/dark theme"
        onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
        style={{
          width: "36px",
          height: "20px",
          borderRadius: "10px",
          background: light ? "var(--accent)" : "var(--bg-highlight)",
          border: "1px solid var(--border)",
          padding: "2px",
          cursor: "pointer",
          transition: "background 0.2s",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span style={{
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          background: "#fff",
          display: "block",
          transition: "transform 0.15s",
          transform: light ? "translateX(16px)" : "translateX(0)",
          flexShrink: 0,
        }} />
      </button>
      <span style={{ fontSize: "11px", color: "var(--text-muted)", userSelect: "none" }}>◑</span>
    </div>
  );
}

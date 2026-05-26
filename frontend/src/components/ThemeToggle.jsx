import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") ?? "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme(t => (t === "dark" ? "light" : "dark"))}
      aria-label="Toggle theme"
      style={{
        background: "none",
        border: "1px solid var(--border)",
        color: "var(--text-muted)",
        borderRadius: "4px",
        padding: "4px 10px",
        cursor: "pointer",
        fontSize: "12px",
        fontFamily: "var(--font-mono)",
      }}
    >
      {theme === "dark" ? "light" : "dark"}
    </button>
  );
}

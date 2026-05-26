import { Routes, Route } from "react-router-dom";
import ThemeToggle from "./components/ThemeToggle";

function Placeholder({ name }) {
  return (
    <div style={{ padding: "2rem", color: "var(--text-muted)" }}>
      {name} — coming soon
    </div>
  );
}

export default function App() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Temporary dev header — will be removed; nav lives in footer only */}
      <div style={{ padding: "1rem", display: "flex", justifyContent: "flex-end", borderBottom: "1px solid var(--border)" }}>
        <ThemeToggle />
      </div>

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Placeholder name="Gallery" />} />
          <Route path="/books/:slug" element={<Placeholder name="Book detail" />} />
          <Route path="/artists/:slug" element={<Placeholder name="Artist" />} />
          <Route path="/admin/*" element={<Placeholder name="Admin" />} />
          <Route path="/:slug" element={<Placeholder name="Page" />} />
        </Routes>
      </main>

      <footer style={{
        borderTop: "1px solid var(--border)",
        padding: "1.5rem 2rem",
        display: "flex",
        gap: "1.5rem",
        alignItems: "center",
        color: "var(--text-muted)",
        fontSize: "14px",
      }}>
        {/* Footer items rendered dynamically in Phase 4 */}
        <span style={{ opacity: 0.4 }}>footer</span>
      </footer>
    </div>
  );
}

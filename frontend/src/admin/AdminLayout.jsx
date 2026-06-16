import { useState } from "react";
import { NavLink, Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useIsMobile } from "../hooks/useIsMobile";
import AdminLogin from "./AdminLogin";
import ThemeToggle from "../components/ThemeToggle";

const NAV = [
  { to: "/admin",         label: "Books",   end: true },
  { to: "/admin/artists", label: "Artists" },
  { to: "/admin/tags",    label: "Tags" },
  { to: "/admin/pages",   label: "Pages" },
  { to: "/admin/footer",  label: "Footer" },
];

export default function AdminLayout() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  if (auth === null) return null;
  if (auth === false) return <AdminLogin />;

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", padding: "0 1rem", height: "48px",
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: "1.0625rem", color: "var(--text-bright)", flex: 1 }}>Spread</span>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", fontSize: "1.4375rem", padding: "0 0.25rem", lineHeight: 1 }}
          >
            {menuOpen ? "✕" : "≡"}
          </button>
        </div>

        {menuOpen && (
          <div style={{
            position: "fixed", top: "48px", left: 0, right: 0, bottom: 0,
            background: "var(--bg-elevated)", zIndex: 99, overflowY: "auto",
            padding: "0.5rem 0",
          }}>
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to} to={to} end={end}
                onClick={() => setMenuOpen(false)}
                style={({ isActive }) => ({
                  display: "block", padding: "0.85rem 1.25rem", fontSize: "1.0625rem",
                  color: isActive ? "var(--accent)" : "var(--text)",
                  textDecoration: "none", fontWeight: isActive ? 600 : 400,
                  borderBottom: "1px solid var(--border)",
                })}
              >
                {label}
              </NavLink>
            ))}
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                style={{ fontSize: "0.9375rem", color: "var(--text-muted)", textDecoration: "none" }}
              >
                View site ↗
              </Link>
              <ThemeToggle />
              <button
                onClick={async () => { await logout(); navigate("/admin"); setMenuOpen(false); }}
                style={{ background: "none", border: "none", color: "var(--text-muted)", padding: 0, cursor: "pointer", fontSize: "0.9375rem", fontFamily: "var(--font-body)", textAlign: "left" }}
              >
                Sign out
              </button>
            </div>
          </div>
        )}

        <main style={{ flex: 1, padding: "1.25rem 1rem", overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <nav style={{
        width: "180px", flexShrink: 0, background: "var(--bg-elevated)",
        borderRight: "1px solid var(--border)", display: "flex",
        flexDirection: "column", padding: "1.5rem 0", overflowY: "auto",
      }}>
        <span style={{
          padding: "0 1.25rem 1.5rem", fontSize: "1.0625rem",
          fontWeight: 700, color: "var(--text-bright)", letterSpacing: "0.02em",
        }}>
          Spread
        </span>
        {NAV.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end} style={({ isActive }) => navLinkStyle(isActive)}>
            {label}
          </NavLink>
        ))}
        <div style={{ marginTop: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Link to="/" style={{ fontSize: "0.8125rem", color: "var(--text-muted)", textDecoration: "none", opacity: 0.7 }}>
            View site ↗
          </Link>
          <ThemeToggle />
          <button
            onClick={async () => { await logout(); navigate("/admin"); }}
            style={{
              background: "none", border: "none", color: "var(--text-muted)",
              padding: "4px 0", cursor: "pointer", fontSize: "0.8125rem",
              fontFamily: "var(--font-body)", textAlign: "left",
              opacity: 0.7,
            }}
          >
            Sign out
          </button>
        </div>
      </nav>
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}

function navLinkStyle(isActive) {
  return {
    display: "block", padding: "0.5rem 1.25rem", fontSize: "0.9375rem",
    color: isActive ? "var(--accent)" : "var(--text-muted)",
    textDecoration: "none", fontWeight: isActive ? 500 : 400,
    borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
  };
}

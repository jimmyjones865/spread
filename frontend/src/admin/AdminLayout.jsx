import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
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

  if (auth === null) return null; // loading
  if (auth === false) return <AdminLogin />;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav style={{
        width: "180px", flexShrink: 0, background: "var(--bg-elevated)",
        borderRight: "1px solid var(--border)", display: "flex",
        flexDirection: "column", padding: "1.5rem 0",
      }}>
        <span style={{
          padding: "0 1.25rem 1.5rem", fontSize: "16px",
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
          <ThemeToggle />
          <button
            onClick={async () => { await logout(); navigate("/admin"); }}
            style={{
              background: "none", border: "1px solid var(--border)", color: "var(--text-muted)",
              borderRadius: "4px", padding: "4px 10px", cursor: "pointer",
              fontSize: "12px", fontFamily: "var(--font-body)",
            }}
          >
            Logout
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
    display: "block", padding: "0.5rem 1.25rem", fontSize: "14px",
    color: isActive ? "var(--accent)" : "var(--text-muted)",
    textDecoration: "none", fontWeight: isActive ? 500 : 400,
    borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
  };
}

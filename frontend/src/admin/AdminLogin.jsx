import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function AdminLogin() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(password);
    } catch {
      setError("Invalid password");
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)",
    }}>
      <form onSubmit={submit} style={{
        background: "var(--bg-elevated)", border: "1px solid var(--border)",
        borderRadius: "8px", padding: "2.5rem", width: "320px",
      }}>
        <h1 style={{ margin: "0 0 2rem", fontSize: "1.25rem", color: "var(--text-bright)", fontWeight: 600 }}>
          Spread
        </h1>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          style={{
            width: "100%", padding: "0.6rem 0.75rem", marginBottom: "1rem",
            background: "var(--bg-highlight)", border: "1px solid var(--border)",
            borderRadius: "4px", color: "var(--text)", fontFamily: "var(--font-body)",
            fontSize: "0.9375rem", boxSizing: "border-box",
          }}
        />
        {error && <p style={{ color: "var(--danger)", fontSize: "0.875rem", marginBottom: "1rem" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "0.6rem", background: "var(--accent-dim)",
            color: "var(--text-bright)", border: "none", borderRadius: "4px",
            cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.9375rem",
          }}
        >
          {loading ? "…" : "Login"}
        </button>
      </form>
    </div>
  );
}

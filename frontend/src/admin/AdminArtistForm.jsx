import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";

const COUNTRIES = [
  ["AR", "Argentina"], ["AU", "Australia"], ["AT", "Austria"], ["BE", "Belgium"],
  ["BR", "Brazil"], ["CA", "Canada"], ["CN", "China"], ["HR", "Croatia"],
  ["CZ", "Czech Republic"], ["DK", "Denmark"], ["EG", "Egypt"], ["FI", "Finland"],
  ["FR", "France"], ["DE", "Germany"], ["GR", "Greece"], ["HU", "Hungary"],
  ["IN", "India"], ["IR", "Iran"], ["IL", "Israel"], ["IT", "Italy"],
  ["JP", "Japan"], ["KR", "Korea"], ["MX", "Mexico"], ["NL", "Netherlands"],
  ["NZ", "New Zealand"], ["NG", "Nigeria"], ["NO", "Norway"], ["PL", "Poland"],
  ["PT", "Portugal"], ["RO", "Romania"], ["RU", "Russia"], ["ZA", "South Africa"],
  ["ES", "Spain"], ["SE", "Sweden"], ["CH", "Switzerland"], ["TR", "Turkey"],
  ["UA", "Ukraine"], ["GB", "United Kingdom"], ["US", "United States"],
];

const EMPTY = { name: "", country: "", instagram: "", website: "", bio: "" };

export default function AdminArtistForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isNew) api.getArtist(id).then(a => setForm({
      name: a.name ?? "",
      country: a.country ?? "",
      instagram: a.instagram ?? "",
      website: a.website ?? "",
      bio: a.bio ?? "",
    }));
  }, [id]);

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function toPayload() {
    return {
      name: form.name,
      country: form.country || null,
      instagram: form.instagram || null,
      website: form.website || null,
      bio: form.bio || null,
    };
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await api.createArtist(toPayload());
        navigate("/admin/artists");
      } else {
        await api.updateArtist(id, toPayload());
        navigate("/admin/artists");
      }
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: "560px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button onClick={() => navigate("/admin/artists")} style={backBtn}>← Artists</button>
        <h1 style={h1}>{isNew ? "New artist" : form.name || "Edit artist"}</h1>
      </div>

      {error && <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>{error}</p>}

      <form onSubmit={save}>
        <Field label="Name *"><Input value={form.name} onChange={v => set("name", v)} required /></Field>
        <Field label="Country">
          <input
            list="countries"
            value={form.country}
            onChange={e => set("country", e.target.value)}
            placeholder="DE, JP, US…"
            style={inputStyle}
          />
          <datalist id="countries">
            {COUNTRIES.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </datalist>
        </Field>
        <Field label="Instagram"><Input value={form.instagram} onChange={v => set("instagram", v)} placeholder="handle (no @)" /></Field>
        <Field label="Website"><Input value={form.website} onChange={v => set("website", v)} placeholder="https://…" /></Field>
        <Field label="Bio">
          <textarea value={form.bio} onChange={e => set("bio", e.target.value)} style={{ ...inputStyle, height: "120px", resize: "vertical" }} />
        </Field>
        <button type="submit" disabled={saving} style={primaryBtn}>
          {saving ? "Saving…" : isNew ? "Create artist" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, ...props }) {
  return <input value={value} onChange={e => onChange(e.target.value)} style={inputStyle} {...props} />;
}

const inputStyle = { width: "100%", padding: "0.5rem 0.6rem", background: "var(--bg-highlight)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "0.9375rem", boxSizing: "border-box" };
const h1 = { margin: 0, fontSize: "1.5rem", fontWeight: 600, color: "var(--text-bright)" };
const backBtn = { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.9375rem", padding: 0 };
const primaryBtn = { background: "var(--accent-dim)", color: "var(--text-bright)", border: "none", borderRadius: "4px", padding: "0.6rem 1.5rem", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.9375rem" };

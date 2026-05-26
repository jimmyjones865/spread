import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ConfirmModal from "../components/ConfirmModal";

export default function AdminArtists() {
  const [artists, setArtists] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const navigate = useNavigate();

  async function load() {
    setArtists(await api.getArtists());
  }

  useEffect(() => { load(); }, []);

  async function confirmDelete() {
    try {
      await api.deleteArtist(deleteTarget);
      setDeleteTarget(null);
      setDeleteError(null);
      load();
    } catch (e) {
      setDeleteError(e.message);
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={h1}>Artists</h1>
        <button onClick={() => navigate("/admin/artists/new")} style={primaryBtn}>+ New artist</button>
      </div>

      {deleteError && <p style={{ color: "var(--danger)", marginBottom: "1rem", fontSize: "14px" }}>{deleteError}</p>}
      {artists.length === 0 && <p style={{ color: "var(--text-muted)" }}>No artists yet.</p>}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {artists.map(artist => (
            <tr key={artist.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "0.6rem 0.5rem" }}>
                <div style={{ fontSize: "14px", color: "var(--text)", fontWeight: 500 }}>{artist.name}</div>
                {artist.country && <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{artist.country}</div>}
              </td>
              <td style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>
                <button onClick={() => navigate(`/admin/artists/${artist.id}`)} style={ghostBtn}>Edit</button>
                <button onClick={() => setDeleteTarget(artist.id)} style={{ ...ghostBtn, color: "var(--danger)" }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {deleteTarget && (
        <ConfirmModal
          message="Delete this artist? This will fail if they have books."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

const h1 = { margin: 0, fontSize: "22px", fontWeight: 600, color: "var(--text-bright)" };
const primaryBtn = { background: "var(--accent-dim)", color: "var(--text-bright)", border: "none", borderRadius: "4px", padding: "0.5rem 1.25rem", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "14px" };
const ghostBtn = { background: "none", color: "var(--text-muted)", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px", padding: "0.25rem 0.5rem" };

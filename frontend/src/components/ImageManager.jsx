import { useState, useRef } from "react";
import api from "../api";
import ConfirmModal from "./ConfirmModal";

export default function ImageManager({ bookId, images, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const fileRef = useRef();

  const sorted = [...images].sort((a, b) => {
    if (a.role === "cover" && b.role !== "cover") return -1;
    if (b.role === "cover" && a.role !== "cover") return 1;
    return a.sort_order - b.sort_order;
  });

  async function upload(file, role) {
    setUploading(true);
    setError(null);
    try {
      await api.uploadImage(bookId, file, role);
      await onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function setCover(imgId) {
    await api.setImageRole(bookId, imgId, "cover");
    await onChange();
  }

  async function confirmDelete() {
    await api.deleteImage(bookId, deleteTarget);
    setDeleteTarget(null);
    await onChange();
  }

  async function move(imgId, direction) {
    const spreadImages = sorted.filter(i => i.role === "spread");
    const idx = spreadImages.findIndex(i => i.id === imgId);
    if (idx < 0) return;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= spreadImages.length) return;
    const newOrder = spreadImages.map(i => i.id);
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    await api.reorderImages(bookId, newOrder);
    await onChange();
  }

  const cover = sorted.find(i => i.role === "cover");
  const spreads = sorted.filter(i => i.role === "spread");

  return (
    <div>
      {error && <p style={{ color: "var(--danger)", fontSize: "14px" }}>{error}</p>}

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <button
          onClick={() => { fileRef.current.dataset.role = "cover"; fileRef.current.click(); }}
          disabled={uploading}
          style={uploadBtn}
        >
          {uploading ? "Uploading…" : "+ Cover"}
        </button>
        <button
          onClick={() => { fileRef.current.dataset.role = "spread"; fileRef.current.click(); }}
          disabled={uploading}
          style={uploadBtn}
        >
          {uploading ? "Uploading…" : "+ Spread"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={e => {
            const file = e.target.files[0];
            if (file) upload(file, e.target.dataset.role || "spread");
            e.target.value = "";
          }}
        />
      </div>

      {cover && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cover</p>
          <ImageRow img={cover} bookId={bookId} onDelete={setDeleteTarget} isFirst={false} isLast={false} showMove={false} />
        </div>
      )}

      {spreads.length > 0 && (
        <div>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Spreads</p>
          {spreads.map((img, idx) => (
            <ImageRow
              key={img.id}
              img={img}
              bookId={bookId}
              onDelete={setDeleteTarget}
              onSetCover={() => setCover(img.id)}
              onMove={(dir) => move(img.id, dir)}
              isFirst={idx === 0}
              isLast={idx === spreads.length - 1}
              showMove={true}
            />
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          message="Delete this image? This cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function ImageRow({ img, bookId, onDelete, onSetCover, onMove, isFirst, isLast, showMove }) {
  const url = `/images/${bookId}/${img.filename}`;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.5rem", marginBottom: "0.5rem",
      background: "var(--bg-highlight)", borderRadius: "4px",
    }}>
      <img src={url} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: "2px", flexShrink: 0 }} />
      <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", flexGrow: 1 }}>
        {img.width && img.height ? `${img.width}×${img.height}` : ""}
      </span>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        {showMove && <button onClick={() => onMove(-1)} disabled={isFirst} style={smallBtn}>↑</button>}
        {showMove && <button onClick={() => onMove(1)} disabled={isLast} style={smallBtn}>↓</button>}
        {onSetCover && <button onClick={onSetCover} style={smallBtn}>Set cover</button>}
        <button onClick={() => onDelete(img.id)} style={{ ...smallBtn, color: "var(--danger)" }}>✕</button>
      </div>
    </div>
  );
}

const uploadBtn = {
  background: "var(--bg-highlight)", color: "var(--text)", border: "1px solid var(--border)",
  borderRadius: "4px", padding: "0.4rem 1rem", cursor: "pointer",
  fontFamily: "var(--font-body)", fontSize: "14px",
};

const smallBtn = {
  background: "none", color: "var(--text-muted)", border: "1px solid var(--border)",
  borderRadius: "4px", padding: "0.25rem 0.5rem", cursor: "pointer",
  fontFamily: "var(--font-body)", fontSize: "12px",
};

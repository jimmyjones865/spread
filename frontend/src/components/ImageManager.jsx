import { useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import api from "../api";
import ConfirmModal from "./ConfirmModal";

function fmtSize(bytes) {
  if (!bytes) return null;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export default function ImageManager({ bookId, images, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [rotating, setRotating] = useState(null);
  const [versions, setVersions] = useState({});
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const fileRef = useRef();

  const sorted = [...images].sort((a, b) => {
    if (a.role === "cover" && b.role !== "cover") return -1;
    if (b.role === "cover" && a.role !== "cover") return 1;
    return a.sort_order - b.sort_order;
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

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

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex(i => i.id === active.id);
    const newIndex = sorted.findIndex(i => i.id === over.id);
    const newOrder = arrayMove(sorted, oldIndex, newIndex).map(i => i.id);
    await api.reorderImages(bookId, newOrder);
    await onChange();
  }

  async function handleRotate(imgId) {
    setRotating(imgId);
    setError(null);
    try {
      await api.rotateImage(bookId, imgId);
      setVersions(v => ({ ...v, [imgId]: Date.now() }));
      await onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setRotating(null);
    }
  }

  async function confirmDelete() {
    await api.deleteImage(bookId, deleteTarget);
    setDeleteTarget(null);
    await onChange();
  }

  const activeImg = activeId ? sorted.find(i => i.id === activeId) : null;

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

      {sorted.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={e => setActiveId(e.active.id)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={sorted.map(i => i.id)} strategy={rectSortingStrategy}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
              {sorted.map((img, idx) => (
                <SortableImageCard
                  key={img.id}
                  img={img}
                  bookId={bookId}
                  isCover={idx === 0}
                  onDelete={() => setDeleteTarget(img.id)}
                  onRotate={() => handleRotate(img.id)}
                  isRotating={rotating === img.id}
                  version={versions[img.id]}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeImg && (
              <ImageCard
                img={activeImg}
                bookId={bookId}
                isCover={false}
                onDelete={() => {}}
                isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
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

function SortableImageCard({ img, bookId, isCover, onDelete, onRotate, isRotating, version }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ImageCard img={img} bookId={bookId} isCover={isCover} onDelete={onDelete} onRotate={onRotate} isRotating={isRotating} version={version} />
    </div>
  );
}

function ImageCard({ img, bookId, isCover, onDelete, onRotate, isRotating, version, isDragOverlay }) {
  const url = `/images/${bookId}/${img.filename}${version ? `?v=${version}` : ""}`;
  return (
    <div style={{
      position: "relative",
      background: "var(--bg-highlight)",
      borderRadius: "6px",
      overflow: "hidden",
      cursor: isDragOverlay ? "grabbing" : "grab",
      userSelect: "none",
    }}>
      <img
        src={url}
        alt=""
        style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block", opacity: isRotating ? 0.5 : 1 }}
        draggable={false}
      />
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={onDelete}
        style={{
          position: "absolute", top: "4px", right: "4px",
          background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%",
          color: "#fff", width: "22px", height: "22px", cursor: "pointer",
          fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1,
        }}
      >✕</button>
      {!isDragOverlay && onRotate && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={onRotate}
          disabled={isRotating}
          style={{
            position: "absolute", top: "4px", right: "30px",
            background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%",
            color: "#fff", width: "22px", height: "22px", cursor: isRotating ? "default" : "pointer",
            fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}
        >↻</button>
      )}
      {isCover && (
        <div style={{
          position: "absolute", top: "4px", left: "4px",
          background: "var(--nord10, #5E81AC)", color: "#fff",
          fontSize: "9px", fontWeight: "700", letterSpacing: "0.06em",
          padding: "2px 5px", borderRadius: "3px", textTransform: "uppercase",
        }}>Cover</div>
      )}
      <div style={{
        padding: "0.35rem 0.5rem",
        fontSize: "11px",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        lineHeight: 1.5,
      }}>
        {img.width && img.height && <div>{img.width}×{img.height}</div>}
        {img.file_size && <div>{fmtSize(img.file_size)}</div>}
      </div>
    </div>
  );
}

const uploadBtn = {
  background: "var(--bg-highlight)", color: "var(--text)", border: "1px solid var(--border)",
  borderRadius: "4px", padding: "0.4rem 1rem", cursor: "pointer",
  fontFamily: "var(--font-body)", fontSize: "14px",
};

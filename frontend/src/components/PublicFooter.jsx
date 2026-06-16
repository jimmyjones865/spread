import { useState, useEffect } from "react";
import api from "../api";

export default function PublicFooter() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.public.getFooter()
      .then(setItems)
      .catch(() => {});
  }, []);

  if (!items.length) return null;

  return (
    <footer style={{
      padding: "1rem 3rem 1.5rem",
      display: "flex",
      gap: "1.5rem",
      flexWrap: "wrap",
      opacity: 0.6,
    }}>
      {items.map((item, i) =>
        item.type === "link" ? (
          <a key={i} href={item.url} target="_blank" rel="noreferrer" style={footerLink}>
            {item.label}
          </a>
        ) : (
          <span key={i} style={footerText}>{item.label}</span>
        )
      )}
    </footer>
  );
}

const footerLink = { fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none" };
const footerText = { fontSize: "0.875rem", color: "var(--text-muted)" };

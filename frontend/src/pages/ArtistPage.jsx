import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PublicFooter from "../components/PublicFooter";
import ThemeToggle from "../components/ThemeToggle";

export default function ArtistPage() {
  const { slug } = useParams();
  const [artist, setArtist] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/artists/${slug}`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setArtist)
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div style={{ padding: "4rem 3rem", color: "var(--text-muted)" }}>
        Artist not found.{" "}
        <Link to="/" style={{ color: "var(--accent)" }}>← Back to gallery</Link>
      </div>
    );
  }

  if (!artist) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, padding: "2.5rem 3rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link to="/" style={backLink}>← Spread</Link>
          <ThemeToggle />
        </div>

        <h1 style={{ margin: "1.5rem 0 0.35rem", fontSize: "28px", fontWeight: 700, color: "var(--text-bright)" }}>
          {artist.name}
        </h1>

        <div style={{ display: "flex", gap: "1.25rem", marginBottom: artist.bio ? "1rem" : "2rem", flexWrap: "wrap", alignItems: "center" }}>
          {artist.country && <span style={muted}>{artist.country}</span>}
          {artist.instagram && (
            <a
              href={`https://instagram.com/${artist.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noreferrer"
              style={linkStyle}
            >
              @{artist.instagram.replace(/^@/, "")}
            </a>
          )}
          {artist.website && (
            <a href={artist.website} target="_blank" rel="noreferrer" style={linkStyle}>
              Website ↗
            </a>
          )}
        </div>

        {artist.bio && (
          <p style={{ maxWidth: "600px", fontSize: "14px", color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: "2.5rem", marginTop: "0.25rem" }}>
            {artist.bio}
          </p>
        )}

        {artist.books.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.75rem" }}>
            {artist.books.map(book => (
              <div key={book.slug} onClick={() => navigate(`/books/${book.slug}`)} style={{ cursor: "pointer", width: "140px", flexShrink: 0 }}>
                <div style={{ width: "140px", height: "190px", background: "var(--bg-elevated)", borderRadius: "3px", overflow: "hidden", marginBottom: "0.5rem", border: "1px solid var(--border)" }}>
                  {book.cover_url ? (
                    <picture>
                      {book.cover_avif_400 && <source type="image/avif" srcSet={book.cover_avif_400} />}
                      {book.cover_webp_400 && (
                        <source type="image/webp" srcSet={book.cover_webp_400} />
                      )}
                      <img
                        src={(book.cover_avif_400 || book.cover_webp_400) ? undefined : book.cover_url}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        loading="lazy"
                      />
                    </picture>
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "20px", color: "var(--text-muted)", fontWeight: 700 }}>
                        {book.title.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text)", fontWeight: 500, lineHeight: 1.3, marginBottom: "2px" }}>
                  {book.title}
                </div>
                {book.year && (
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{book.year}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No books in collection.</p>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}

const backLink = { fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" };
const muted = { fontSize: "14px", color: "var(--text-muted)" };
const linkStyle = { fontSize: "14px", color: "var(--accent)", textDecoration: "none" };

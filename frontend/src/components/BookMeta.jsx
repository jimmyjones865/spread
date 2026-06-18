import { Link } from "react-router-dom";

const sectionLabel = { fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 500 };

export default function BookMeta({ book }) {
  const pubYear = [book.publisher, book.year].filter(Boolean).join(" ");

  const editionParts = [];
  if (book.edition) {
    let ep = `${book.edition} Edition`;
    if (book.print_run) ep += ` of ${book.print_run}`;
    editionParts.push(ep);
  } else if (book.print_run) {
    editionParts.push(`Edition of ${book.print_run}`);
  }
  if (book.edition_year) editionParts.push(String(book.edition_year));
  if (book.copy_number != null) editionParts.push(`copy ${book.copy_number}`);
  if (book.signed) editionParts.push("signed");
  if (book.numbered && book.copy_number == null) editionParts.push("numbered");
  const editionLine = editionParts.join(", ");

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <h1 style={{ margin: "0 0 0.25rem", fontFamily: "var(--font-display)", fontSize: "1.375rem", fontWeight: 500, color: "var(--text-bright)", lineHeight: 1.3 }}>
        {book.title}
      </h1>
      <Link to={`/artists/${book.artist.slug}`} style={{ fontSize: "0.9375rem", color: "var(--accent)", textDecoration: "none", display: "block", marginBottom: "1rem" }}>
        {book.artist.name}
      </Link>

      <div style={{ marginBottom: "1.25rem", fontSize: "0.875rem", color: "var(--text)", lineHeight: 1.7 }}>
        {pubYear && <div>{pubYear}</div>}
        {editionLine && <div>{editionLine}</div>}
        {book.language && <div>{book.language}</div>}
      </div>

      {book.description && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={sectionLabel}>Description</div>
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.875rem", color: "var(--text)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
            {book.description}
          </p>
        </div>
      )}

      {book.colophon && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={sectionLabel}>Colophon</div>
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.875rem", color: "var(--text)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
            {book.colophon}
          </p>
        </div>
      )}

      {book.isbn && (
        <div style={{ marginBottom: "1.25rem" }}>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>ISBN {book.isbn}</span>
        </div>
      )}

      {book.links.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={sectionLabel}>Links</div>
          <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {book.links.map((lnk, i) => (
              <a key={i} href={lnk.url} target="_blank" rel="noreferrer" style={{ fontSize: "0.875rem", color: "var(--accent)" }}>
                {lnk.label || lnk.url}
              </a>
            ))}
          </div>
        </div>
      )}

      {book.tags.length > 0 && (
        <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {book.tags.map(tag => (
              <span key={tag} style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "10px", background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

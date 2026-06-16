import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import PublicFooter from "../components/PublicFooter";
import ThemeToggle from "../components/ThemeToggle";
import api from "../api";

export default function StaticPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.public.getPage(slug)
      .then(setPage)
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div style={{ padding: "4rem 3rem", color: "var(--text-muted)" }}>
        Page not found.{" "}
        <Link to="/" style={{ color: "var(--accent)" }}>← Back to gallery</Link>
      </div>
    );
  }

  if (!page) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, padding: "2.5rem 3rem", maxWidth: "760px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <Link to="/" style={{ fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none" }}>← Spread</Link>
          <ThemeToggle />
        </div>
        <h1 style={{ margin: "0 0 2rem", fontSize: "1.75rem", fontWeight: 700, color: "var(--text-bright)" }}>
          {page.title}
        </h1>
        <ReactMarkdown components={mdComponents}>{page.body}</ReactMarkdown>
      </div>
      <PublicFooter />
    </div>
  );
}

const mdComponents = {
  h1: ({ children }) => <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-bright)", margin: "1.5rem 0 0.75rem" }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-bright)", margin: "1.5rem 0 0.5rem" }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: "1.0625rem", fontWeight: 600, color: "var(--text-bright)", margin: "1.25rem 0 0.4rem" }}>{children}</h3>,
  p: ({ children }) => <p style={{ margin: "0 0 1rem", lineHeight: 1.7, fontSize: "1rem", color: "var(--text)" }}>{children}</p>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{children}</a>,
  ul: ({ children }) => <ul style={{ margin: "0 0 1rem", paddingLeft: "1.5rem" }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: "0 0 1rem", paddingLeft: "1.5rem" }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: "0.3rem", fontSize: "1rem", color: "var(--text)" }}>{children}</li>,
  blockquote: ({ children }) => <blockquote style={{ borderLeft: "3px solid var(--border)", paddingLeft: "1rem", color: "var(--text-muted)", margin: "1rem 0" }}>{children}</blockquote>,
  code: ({ children }) => <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.875em", background: "var(--bg-elevated)", padding: "0.1em 0.35em", borderRadius: "3px" }}>{children}</code>,
  hr: () => <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "2rem 0" }} />,
};

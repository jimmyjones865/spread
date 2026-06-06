export function makeSrcset(parts) {
  const entries = parts.filter(Boolean);
  return entries.length > 0 ? entries.join(", ") : null;
}

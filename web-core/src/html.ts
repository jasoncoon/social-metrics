import DOMPurify from "dompurify";

export function escapeText(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Sanitize third-party HTML (Mastodon notes and posts); links open in a new tab. */
export function sanitizeHtml(html: string) {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return clean.replaceAll("<a ", '<a target="_blank" rel="noopener noreferrer" ');
}

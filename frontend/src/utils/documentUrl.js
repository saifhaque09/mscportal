/**
 * Build a same-origin download URL for a backend file.
 *
 * The API hands back absolute signed URLs on a different host, and a browser
 * ignores the `download` attribute on cross-origin links — clicking one just
 * navigates to the file instead of saving it. Routing through the existing
 * proxy keeps the request same-origin, and `download=true` makes the proxy
 * send `Content-Disposition: attachment`.
 */
export function getDownloadUrl(fileUrl) {
  if (!fileUrl) return null;
  return `/api/proxy-document?url=${encodeURIComponent(fileUrl)}&download=true`;
}

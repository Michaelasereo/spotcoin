/**
 * Without custom middleware (proxy), derive path/search from headers Netlify / Next may send.
 */
export function pathnameFromHeaders(headerList: Headers): string {
  const raw = [
    headerList.get("x-nf-request-path"),
    headerList.get("x-forwarded-uri"),
    headerList.get("next-url"),
    headerList.get("x-invoke-path"),
  ].find((value) => value && value.length > 0);
  if (!raw) return "";
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(raw, "https://internal.local");
    return url.pathname;
  } catch {
    return raw.startsWith("/") ? raw.split("?")[0] : "";
  }
}

export function searchFromHeaders(headerList: Headers): string {
  const legacy = headerList.get("x-search");
  if (legacy !== null && legacy !== undefined) return legacy;
  const raw = headerList.get("x-forwarded-uri") ?? headerList.get("next-url");
  if (!raw) return "";
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(raw, "https://internal.local");
    return url.search;
  } catch {
    const q = raw.indexOf("?");
    return q >= 0 ? raw.slice(q) : "";
  }
}

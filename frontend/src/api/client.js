// Thin fetch wrapper — no HTTP client dependency, just the double-submit
// CSRF pattern the backend expects (backend/src/lib/csrf.js): read the
// CSRF cookie the server issued, echo it back as a header on every
// mutating request. `credentials: "include"` carries the session cookie
// on every call regardless of method, same as the read-only GETs need it
// too (attachSession runs on every route).
const CSRF_COOKIE_NAME = "__Host-bazaarhub-csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch(path, { method = "GET", body, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  let finalBody = body;

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      finalHeaders[CSRF_HEADER_NAME] = csrfToken;
    }
  }

  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: finalHeaders,
    body: finalBody,
  });

  const contentType = res.headers.get("content-type") || "";
  const responseBody = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(res.status, responseBody);
  }

  return responseBody;
}

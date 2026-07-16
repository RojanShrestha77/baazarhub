const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function getCsrfToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request(endpoint, options = {}) {
  const { method = "GET", body, headers = {}, ...rest } = options;
  const config = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    credentials: "include",
    ...rest,
  };
  if (body) config.body = JSON.stringify(body);
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const token = await getCsrfToken();
    if (token) config.headers["x-csrf-token"] = token;
  }
  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = res.status === 204 || res.status === 205 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error || data?.message || "Request failed", data);
  return data;
}

export const api = {
  get: (url, opts) => request(url, { ...opts }),
  post: (url, body, opts) => request(url, { method: "POST", body, ...opts }),
  patch: (url, body, opts) => request(url, { method: "PATCH", body, ...opts }),
  delete: (url, opts) => request(url, { method: "DELETE", ...opts }),
};
export { ApiError };

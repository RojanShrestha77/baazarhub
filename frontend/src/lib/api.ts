const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function getCsrfToken(): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  [key: string]: unknown;
}

async function request(endpoint: string, options: RequestOptions = {}): Promise<unknown> {
  const { method = "GET", body, headers = {}, ...rest } = options;
  const config: RequestInit & { credentials: RequestCredentials } = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    credentials: "include",
    ...rest,
  };
  if (body) config.body = JSON.stringify(body);
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const token = await getCsrfToken();
    if (token) (config.headers as Record<string, string>)["x-csrf-token"] = token;
  }
  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = res.status === 204 || res.status === 205 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error || data?.message || "Request failed", data);
  return data;
}

export const api = {
  get: (url: string, opts?: RequestOptions) => request(url, { ...opts }),
  post: (url: string, body?: unknown, opts?: RequestOptions) => request(url, { method: "POST", body, ...opts }),
  patch: (url: string, body?: unknown, opts?: RequestOptions) => request(url, { method: "PATCH", body, ...opts }),
  delete: (url: string, opts?: RequestOptions) => request(url, { method: "DELETE", ...opts }),
};

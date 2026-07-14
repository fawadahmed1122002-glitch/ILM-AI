const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class ApiError extends Error {
  status: number;
  code: string;
  detail: unknown;

  constructor(message: string, status: number, code: string, detail: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    // Handle structured error detail (e.g. tier gate returns {code, message, ...})
    const detail = data.detail;
    if (detail && typeof detail === "object" && "code" in detail) {
      throw new ApiError(
        (detail as {message: string}).message || "Request failed",
        res.status,
        (detail as {code: string}).code,
        detail
      );
    }
    // Handle simple string detail
    throw new ApiError(
      typeof detail === "string" ? detail : "Request failed",
      res.status,
      "API_ERROR",
      detail
    );
  }

  return data as T;
}

export const api = {
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>("POST", path, body, token),
  get: <T>(path: string, token?: string) =>
    request<T>("GET", path, undefined, token),
};

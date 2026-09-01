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

// FastAPI/Pydantic validation error item shape: { loc: (string|number)[], msg: string, type: string }
interface PydanticErrorItem {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
}

function isPydanticErrorArray(detail: unknown): detail is PydanticErrorItem[] {
  return Array.isArray(detail) && detail.length > 0 && typeof detail[0] === "object" && detail[0] !== null && "msg" in detail[0];
}

async function handleResponse<T>(res: Response): Promise<T> {
  let data: any;
  try {
    data = await res.json();
  } catch {
    // Non-JSON body (e.g. an HTML 502 from a proxy/CDN) -- surface a
    // typed ApiError instead of an unhandled SyntaxError.
    throw new ApiError("Invalid response from server", res.status, "BAD_GATEWAY", null);
  }

  if (!res.ok) {
    const detail = data.detail;

    // FastAPI/Pydantic 422 validation errors: detail is an array of {loc, msg, type}
    if (isPydanticErrorArray(detail)) {
      // Strip Pydantic's "Value error, " prefix that field_validator ValueErrors get wrapped with
      const messages = detail.map((d) => (d.msg ?? "Invalid input").replace(/^Value error,\s*/, ""));
      throw new ApiError(
        messages.join(" "),
        res.status,
        "VALIDATION_ERROR",
        detail
      );
    }

    // Handle structured error detail (e.g. tier gate returns {code, message, ...})
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

  return handleResponse<T>(res);
}

export const api = {
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>("POST", path, body, token),
  // Multipart form uploads (e.g. PDF ingestion) -- no Content-Type header
  // so the browser sets the multipart boundary itself.
  postForm: <T>(path: string, form: FormData, token?: string) => {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(`${BASE_URL}${path}`, { method: "POST", headers, body: form })
      .then((res) => handleResponse<T>(res));
  },
  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>("PATCH", path, body, token),
  get: <T>(path: string, token?: string) =>
    request<T>("GET", path, undefined, token),
};
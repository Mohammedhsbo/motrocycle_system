function normalizeApiBase(url: string) {
  const normalized = url.replace(/\/+$/, "");
  return normalized.endsWith("/api/v1") ? normalized : `${normalized}/api/v1`;
}

function normalizeEndpoint(endpoint: string) {
  return endpoint.replace(/^\/+/, "");
}

const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1");

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    headers.delete("Authorization");
  }

  const response = await fetch(`${API_BASE}/${normalizeEndpoint(endpoint)}`, {
    ...options,
    headers,
  });

  const responseText = await response.text();
  let parsedData: unknown;

  if (responseText) {
    try {
      parsedData = JSON.parse(responseText) as unknown;
    } catch {
      throw new ApiError(
        "INVALID_RESPONSE",
        response.ok
          ? "The server returned an invalid response"
          : response.statusText || "The server returned an invalid response",
        response.status,
      );
    }
  }

  if (parsedData === undefined) {
    if (!response.ok) {
      throw new ApiError("HTTP_ERROR", response.statusText || "An error occurred", response.status);
    }
    return { success: true };
  }

  const data = parsedData as ApiResponse<T>;

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.code || "UNKNOWN_ERROR",
      data.error?.message || "An error occurred",
      response.status,
      data.error?.details,
    );
  }

  return data;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    fetchApi<T>(endpoint, { ...options, method: "GET" }).then((response) => response.data as T),

  getWithMeta: <T>(endpoint: string, options?: RequestInit) =>
    fetchApi<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: "POST",
      body: body === undefined || typeof body === "string" ? body : JSON.stringify(body),
    }).then((response) => response.data as T),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body === undefined || typeof body === "string" ? body : JSON.stringify(body),
    }).then((response) => response.data as T),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    fetchApi<T>(endpoint, { ...options, method: "DELETE" }).then((response) => response.data as T),
};

export function setAuthToken(token: string | null) {
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("accessToken", token);
    } else {
      localStorage.removeItem("accessToken");
    }
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken");
  }
  return null;
}

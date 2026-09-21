export const API_BASE = import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: "include", // Essential for httpOnly cookies
  };

  try {
    const res = await fetch(url, config);

    // If 401 Unauthorized and not on an auth check/refresh endpoint
    if (
      res.status === 401 &&
      !endpoint.includes("/auth/refresh") &&
      !endpoint.includes("/auth/login") &&
      !endpoint.includes("/auth/signup")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiFetch<T>(endpoint, options));
      }

      isRefreshing = true;

      try {
        const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (refreshRes.ok) {
          processQueue(null);
          return await apiFetch<T>(endpoint, options);
        } else {
          processQueue(new Error("Refresh failed"));
          window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        }
      } catch (refreshErr) {
        processQueue(refreshErr);
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      } finally {
        isRefreshing = false;
      }
    }

    if (!res.ok) {
      let errData: any = {};
      try {
        errData = await res.json();
      } catch {
        errData = { detail: res.statusText };
      }
      const message = errData?.detail || `Request failed with status ${res.status}`;
      throw new ApiError(res.status, message, errData);
    }

    if (res.status === 204) {
      return {} as T;
    }
    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(0, err.message || "Network error. Please check your connection.");
  }
}

export const api = {
  get: <T = any>(endpoint: string) => apiFetch<T>(endpoint, { method: "GET" }),
  post: <T = any>(endpoint: string, body?: any) =>
    apiFetch<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T = any>(endpoint: string, body?: any) =>
    apiFetch<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(endpoint: string) =>
    apiFetch<T>(endpoint, { method: "DELETE" }),
};

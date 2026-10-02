// API Client helper

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("auth_token");

  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Only set Content-Type to JSON if body is not FormData
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = typeof data === "object" && data?.error ? data.error : (typeof data === "string" ? data : "حدث خطأ في الاتصال");
    throw new ApiError(errorMsg, response.status);
  }

  return data as T;
}

export function getFileViewUrl(documentId: string): string {
  const token = localStorage.getItem("auth_token") || "";
  return `/api/files/${documentId}/view?token=${encodeURIComponent(token)}`;
}

export function getFileDownloadUrl(documentId: string): string {
  const token = localStorage.getItem("auth_token") || "";
  return `/api/files/${documentId}/download?token=${encodeURIComponent(token)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 بايت";
  const k = 1024;
  const sizes = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

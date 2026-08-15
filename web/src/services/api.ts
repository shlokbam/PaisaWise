// Web browser uses 127.0.0.1, Android build uses Mac LAN IP via .env.android
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = localStorage.getItem("access_token");
  
  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If unauthorized, clean up and redirect to login
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errorData.detail || "Something went wrong");
  }

  // No content response
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function apiDownload(endpoint: string): Promise<Blob> {
  const token = localStorage.getItem("access_token");
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Failed to download file." }));
    throw new Error(errorData.detail || "Failed to download file.");
  }
  
  return response.blob();
}

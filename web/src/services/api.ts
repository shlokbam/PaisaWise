import { Capacitor } from '@capacitor/core';

// Web browser uses env variable or 127.0.0.1, Android native app connects to live Render backend cloud
const envUrl = import.meta.env.VITE_API_BASE_URL;

function getApiBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    if (envUrl && envUrl.startsWith("http") && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl;
    }
    return "https://paisawise-api.onrender.com/api/v1";
  }
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl;
  }
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://paisawise-api.onrender.com/api/v1";
  }
  return "http://127.0.0.1:8000/api/v1";
}

const API_BASE_URL = getApiBaseUrl();

import { getAuthToken, clearAuthTokens } from './storage';

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await getAuthToken();
  
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
    await clearAuthTokens();
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

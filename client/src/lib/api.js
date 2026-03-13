const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

function getToken() {
  return localStorage.getItem("curiohub_token");
}

export function setSession({ token, user }) {
  localStorage.setItem("curiohub_token", token);
  localStorage.setItem("curiohub_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("curiohub_token");
  localStorage.removeItem("curiohub_user");
}

export function getStoredUser() {
  const userRaw = localStorage.getItem("curiohub_user");
  if (!userRaw) return null;

  try {
    return JSON.parse(userRaw);
  } catch {
    return null;
  }
}

export async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export function getSocketUrl() {
  return API_URL;
}

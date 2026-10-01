import axios from 'axios';

// Vite only injects env vars whose name matches `envPrefix` (see vite.config.ts).
// BACKEND_API_URL is in that list, so it reaches the browser. An unlisted name
// resolves to undefined and silently falls back to '/api', pointing the API client
// back at this same Vercel origin and yielding a 404 on login.
// Vite only exposes env vars matching envPrefix (see vite.config.ts); an unlisted name silently falls back to '/api'.
const configuredBaseUrl = import.meta.env.BACKEND_API_URL || import.meta.env.VITE_API_URL;

if (!configuredBaseUrl && import.meta.env.PROD) {
  console.error('[config] BACKEND_API_URL is not set. API calls will hit /api on this origin instead of the backend.');
}

const apiBaseUrl = configuredBaseUrl || '/api';

const TOKEN_KEY = 'admin_token';

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Browsers block the third-party cookie between vercel.app and onrender.com, so the Bearer token is the reliable auth path.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function extractApiError(err: unknown, fallback: string): string {
  const response = (err as any)?.response;

  if (!response) {
    const code = (err as any)?.code;
    if (code === 'ERR_CANCELED') return 'Request cancelled.';
    return 'Cannot reach the API server. Check that the backend is running and that its CORS settings allow this origin.';
  }

  if (response.status === 404 && apiBaseUrl.startsWith('/')) {
    return `API endpoint not found at ${apiBaseUrl}/... on this origin. BACKEND_API_URL is probably not set, so the client is calling itself instead of the backend.`;
  }

  const data = response.data;
  const raw = data?.error;

  if (typeof raw === 'string') return raw;
  if (raw && typeof raw.message === 'string') return raw.message;
  if (typeof data?.message === 'string') return data.message;

  return fallback;
}

import axios from 'axios';

const apiBaseUrl = (import.meta as any).env?.BACKEND_API_URL || '/api';

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function extractApiError(err: unknown, fallback: string): string {
  const response = (err as any)?.response;

  if (!response) {
    const code = (err as any)?.code;
    if (code === 'ERR_CANCELED') return 'Request cancelled.';
    return 'Cannot reach the API server. Check that the backend is running and that its CORS settings allow this origin.';
  }

  const data = response.data;
  const raw = data?.error;

  if (typeof raw === 'string') return raw;
  if (raw && typeof raw.message === 'string') return raw.message;
  if (typeof data?.message === 'string') return data.message;

  return fallback;
}

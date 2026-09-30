import axios from 'axios';

const apiBaseUrl = (import.meta as any).env?.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

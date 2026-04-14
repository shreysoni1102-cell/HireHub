// Axios instance — auto-attaches JWT Bearer token from localStorage
import axios from 'axios';

/**
 * Base URL: use Vite env in production; dev can rely on proxy (/api -> server).
 */
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

/** Attach JWT from localStorage on every request */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hirehub_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;


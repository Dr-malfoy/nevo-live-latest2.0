import axios from "axios";

const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (isLocal ? '/api' : 'https://nevo-live.onrender.com/api');

const client = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const stored = localStorage.getItem("admin-auth");
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
    } catch {}
  }
  return config;
});

client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("admin-auth");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default client;

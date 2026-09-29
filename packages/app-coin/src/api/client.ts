import axios from "axios";

const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (isLocal ? '/api' : 'https://nevo-live.onrender.com/api');

const client = axios.create({ baseURL: API_BASE });
client.interceptors.request.use((c) => {
  const s = localStorage.getItem("coin-auth");
  if (s) {
    try {
      const d = JSON.parse(s);
      // zustand persist format: { state: { user, token, isAuth } }
      const token = d?.state?.token || d?.token;
      if (token) c.headers.Authorization = `Bearer ${token}`;
    } catch {}
  }
  return c;
});
client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("coin-auth");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);
export default client;

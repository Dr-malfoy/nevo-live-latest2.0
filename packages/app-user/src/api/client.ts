import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const isLocalWeb =
  !isNative &&
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE = isLocalWeb
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'https://nevo-live-latest.onrender.com/api');

const client = axios.create({
  baseURL: API_BASE,
});

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('app_device_id');
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('app_device_id', id);
  }
  return id;
}

client.interceptors.request.use((config) => {
  const deviceId = getDeviceId();
  if (deviceId) {
    config.headers['X-Device-Id'] = deviceId;
  }

  const stored = localStorage.getItem('auth-storage');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      const token = state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/register'
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default client;

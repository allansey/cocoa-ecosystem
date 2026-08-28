import axios from 'axios';

// Cache for short-lived read requests
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds max for fast fresh data

export const clearApiCache = (pattern?: string) => {
  if (!pattern) {
    cache.clear();
  } else {
    cache.forEach((_, key) => {
      if (key.includes(pattern)) cache.delete(key);
    });
  }
};

// Create an Axios instance with base URL for the backend API
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000, // 8 second timeout
});

// Add a request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state && state.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch (e) {
        console.error('Error parsing auth storage', e);
      }
    }
  }

  // Clear cache on write operations so UI updates immediately
  if (config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
    clearApiCache();
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Only cache pure read operations
    if (response.config.method?.toLowerCase() === 'get' && response.config.url) {
      cache.set(response.config.url, { data: response.data, timestamp: Date.now() });
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (!pathname.includes('/auth/login') && !pathname.includes('/auth/register')) {
        console.warn('Session expired or invalid token. Redirecting to login...');
        localStorage.removeItem('auth-storage');
        const localeMatch = pathname.match(/^\/(en|fr|tw)\b/);
        const locale = localeMatch ? localeMatch[1] : 'en';
        window.location.href = `/${locale}/auth/login`;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

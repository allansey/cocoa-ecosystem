import axios from 'axios';

// Simple cache for GET requests
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Create an Axios instance with base URL for the backend API
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add a request interceptor to attach the JWT token if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Attempt to get token from localStorage first (or Zustand store if you sync it to local storage)
    // Here we'll read it straight from Zustand's persisted state, or generic localStorage
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
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response caching for GET requests
api.interceptors.response.use(
  (response) => {
    // Cache GET requests
    if (response.config.method === 'get') {
      const cacheKey = response.config.url || '';
      cache.set(cacheKey, { data: response, timestamp: Date.now() });
    }
    return response;
  },
  async (error) => {
    const config = error.config;
    
    // Retry logic for failed requests (except auth endpoints)
    if (!config.retry) {
      config.retry = 0;
    }
    config.retry += 1;
    
    // Retry failed GET requests up to 3 times with exponential backoff
    if (
      config.method === 'get' &&
      config.retry <= 3 &&
      error.response?.status >= 500
    ) {
      const delay = Math.pow(2, config.retry) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }
    
    // Try to return cached data if available
    if (config.method === 'get') {
      const cacheKey = config.url || '';
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

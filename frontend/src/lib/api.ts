import axios from 'axios';

// Create an Axios instance with base URL for the backend API
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
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

export default api;

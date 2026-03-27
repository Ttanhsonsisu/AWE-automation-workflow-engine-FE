import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';

// API base URL - configured via Vite env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mock fetching token from localStorage/Zustand Auth Store (to be integrated with Keycloak OIDC later)
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token') || 'demo-token';
};

// ── Request Interceptor ──
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Attach Bearer token before sending request
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ── Response Interceptor ──
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Modify response data if backend uses a wrapper format (e.g., { data: T, isSuccess: bool })
    // return response.data;
    return response;
  },
  (error: AxiosError) => {
    // Global error handler
    if (error.response) {
      if (error.response.status === 401) {
        console.warn('Unauthorized access - Redirecting to login (Keycloak OIDC)');
        // dispatch logout / redirect login logic
      } else if (error.response.status === 403) {
        console.warn('Forbidden access');
      }
    } else if (error.request) {
      console.error('Network Error - No response received from server');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

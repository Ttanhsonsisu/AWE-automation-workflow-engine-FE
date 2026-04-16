import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';
import { getAccessToken, userManager } from '@/lib/keycloak';

// API base URL - configured via Vite env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor ──
// Automatically attaches the Keycloak access token to every outgoing request
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
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
    return response;
  },
  async (error: AxiosError) => {
    // Global error handler
    if (error.response) {
      if (error.response.status === 401) {
        console.warn('Unauthorized access – Redirecting to Keycloak login');
        // Token is expired or invalid — redirect to Keycloak login
        try {
          await userManager.signinRedirect();
        } catch (redirectError) {
          console.error('Failed to redirect to Keycloak:', redirectError);
        }
      } else if (error.response.status === 403) {
        console.warn('Forbidden access — insufficient permissions');
      }
    } else if (error.request) {
      console.error('Network Error — No response received from server');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

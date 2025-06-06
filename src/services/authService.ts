import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const VITE_AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || 'http://localhost:3001'; // Fallback for safety

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Token Management
export const storeTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  // Optionally, notify other parts of the app (e.g., via custom event or state management)
  // window.dispatchEvent(new Event('auth-tokens-cleared'));
};

// Axios Instance
const apiClient = axios.create({
  baseURL: `${VITE_AUTH_BACKEND_URL}/api/auth`, // Base path for all auth routes
});

// Request Interceptor: Add Authorization header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 errors and refresh token
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
        .then(token => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      const currentRefreshToken = getRefreshToken();

      if (currentRefreshToken) {
        try {
          const { data } = await apiClient.post<{ accessToken: string }>('/refresh-token', {
            token: currentRefreshToken,
          });
          const newAccessToken = data.accessToken;
          storeTokens(newAccessToken, currentRefreshToken); // Store new access token, refresh token remains the same or could be updated if backend sends a new one
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as Error, null);
          clearTokens();
          // Here you might want to redirect to login or trigger a global logout event
          console.error('Session expired. Please log in again.', refreshError);
          // window.location.href = '/login'; // Example redirect
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token available
        clearTokens();
        console.error('No refresh token. Please log in.');
        // window.location.href = '/login'; // Example redirect
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// API Functions (Types for request/response bodies)
interface AuthResponse {
  message: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

interface UserResponse {
  user: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
}

interface RefreshTokenResponse {
  accessToken: string;
  // refreshToken?: string; // If backend sends a new refresh token
}

export const register = async (email: string, password: string, fullName: string) => {
  try {
    const response = await apiClient.post<AuthResponse>('/register', { email, password, fullName });
    if (response.data.tokens) {
      storeTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }
    return response.data; // Contains user and tokens
  } catch (error) {
    console.error('Registration error:', error);
    throw error; // Re-throw for UI to handle
  }
};

export const login = async (email: string, password: string) => {
  try {
    const response = await apiClient.post<AuthResponse>('/login', { email, password });
    if (response.data.tokens) {
      storeTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }
    return response.data.user; // Return user data
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = async () => {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    console.warn('No refresh token found for logout.');
    clearTokens(); // Still clear local tokens
    return Promise.resolve({ message: "Logged out locally, no refresh token to send to server." });
  }
  try {
    const response = await apiClient.post('/logout', { refreshToken: currentRefreshToken });
    clearTokens();
    return response.data;
  } catch (error) {
    console.error('Logout error:', error);
    clearTokens(); // Clear tokens even if server call fails
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get<UserResponse>('/me');
    return response.data.user;
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

// Internal function for refreshing token, called by interceptor
// Exporting it also allows manual refresh if needed, though interceptor handles most cases.
export const refreshToken = async (): Promise<string | null> => {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    console.error('No refresh token available for manual refresh.');
    return null;
  }
  try {
    const response = await apiClient.post<RefreshTokenResponse>('/refresh-token', {
      token: currentRefreshToken,
    });
    const { accessToken } = response.data;
    // The backend might also send a new refresh token, handle if necessary:
    // const newRefreshToken = response.data.refreshToken || currentRefreshToken;
    storeTokens(accessToken, currentRefreshToken); // Assuming refresh token is not rotated for now by backend
    return accessToken;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    clearTokens(); // Critical: if refresh fails, clear session
    // window.location.href = '/login'; // Example redirect
    throw error;
  }
};

// Google OAuth
export const initiateGoogleLogin = (): void => {
  window.location.href = `${VITE_AUTH_BACKEND_URL}/api/auth/google`;
};

export const handleGoogleOAuthCallback = (accessToken: string, refreshToken: string): void => {
  storeTokens(accessToken, refreshToken);
};

// Password Reset
export const requestPasswordReset = async (email: string) => {
  try {
    const response = await apiClient.post('/request-password-reset', { email });
    return response.data; // Typically a success message: { message: "..." }
  } catch (error) {
    console.error('Request password reset error:', error);
    throw error; // Re-throw for the hook to handle
  }
};

export const resetPassword = async (token: string, newPassword: string) => {
  try {
    const response = await apiClient.post('/reset-password', { token, newPassword });
    return response.data; // Typically a success message: { message: "..." }
  } catch (error) {
    console.error('Reset password error:', error);
    throw error; // Re-throw for the hook to handle
  }
};

export default {
  storeTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  register,
  login,
  logout,
  getCurrentUser,
  refreshToken,
  initiateGoogleLogin,
  handleGoogleOAuthCallback,
  requestPasswordReset, // Added
  resetPassword, // Added
  apiClient
};

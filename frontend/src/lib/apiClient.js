import axios from 'axios';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('pogpp_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for logging
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling responses and errors
apiClient.interceptors.response.use(
  (response) => {
    // Log response time
    const endTime = new Date();
    const duration = endTime - response.config.metadata.startTime;
    console.debug(`API ${response.config.method.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`);
    
    return response;
  },
  (error) => {
    // Log error
    if (error.config) {
      const endTime = new Date();
      const duration = endTime - error.config.metadata.startTime;
      console.error(`API ${error.config.method.toUpperCase()} ${error.config.url} - ${error.response?.status || 'TIMEOUT'} (${duration}ms)`);
    }
    
    // Handle specific error cases
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('pogpp_token');
          window.location.href = '/login';
          break;
        case 403:
          // Forbidden
          console.error('Access forbidden:', error.response.data.message);
          break;
        case 429:
          // Rate limited
          console.warn('Rate limit exceeded:', error.response.data.message);
          break;
        case 500:
          // Server error
          console.error('Server error:', error.response.data.message);
          break;
        default:
          console.error('API error:', error.response.data.message);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
    } else {
      // Other error
      console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API methods
const apiMethods = {
  // Generic methods
  get: (url, config = {}) => apiClient.get(url, config),
  post: (url, data = {}, config = {}) => apiClient.post(url, data, config),
  put: (url, data = {}, config = {}) => apiClient.put(url, data, config),
  delete: (url, config = {}) => apiClient.delete(url, config),
  patch: (url, data = {}, config = {}) => apiClient.patch(url, data, config),

  // Authentication
  auth: {
    login: (walletAddress, signature, message, userInfo) =>
      apiClient.post('/auth/login', { walletAddress, signature, message, userInfo }),
    
    register: (walletAddress, signature, message, username, userInfo) =>
      apiClient.post('/auth/register', { walletAddress, signature, message, username, userInfo }),
    
    getProfile: () =>
      apiClient.get('/auth/profile'),
    
    updateProfile: (username) =>
      apiClient.put('/auth/profile', { username }),
    
    verifyWallet: (walletAddress, signature, message) =>
      apiClient.post('/auth/verify-wallet', { walletAddress, signature, message }),
    
    refreshToken: () =>
      apiClient.post('/auth/refresh'),
    
    logout: () =>
      apiClient.post('/auth/logout')
  },

  // Visits
  visits: {
    create: (visitData) =>
      apiClient.post('/visits', visitData),
    
    getAll: (params = {}) =>
      apiClient.get('/visits', { params }),
    
    getById: (id) =>
      apiClient.get(`/visits/${id}`),
    
    validate: (visitData) =>
      apiClient.post('/visits/validate', visitData),
    
    getByLocation: (locationId, params = {}) =>
      apiClient.get(`/visits/location/${locationId}`, { params }),
    
    verifyForNFT: (id) =>
      apiClient.post(`/visits/${id}/verify`),
    
    getUserStats: () =>
      apiClient.get('/visits/stats/user'),
    
    semanticSearch: (query, limit = 10) =>
      apiClient.post('/visits/semantic-search', { query, limit })
  },

  // Badges
  badges: {
    getAll: (params = {}) =>
      apiClient.get('/badges', { params }),
    
    mint: (visitId, badgeType = 'location') =>
      apiClient.post('/badges/mint', { visitId, badgeType }),
    
    getById: (tokenId) =>
      apiClient.get(`/badges/${tokenId}`),
    
    getByVisit: (visitId) =>
      apiClient.get(`/badges/visit/${visitId}`),
    
    transfer: (tokenId, toAddress) =>
      apiClient.post(`/badges/${tokenId}/transfer`, { toAddress }),
    
    getMetadata: (tokenId) =>
      apiClient.get(`/badges/metadata/${tokenId}`),
    
    getCollectionStats: () =>
      apiClient.get('/badges/collection/stats'),
    
    verify: (tokenId, walletAddress) =>
      apiClient.post('/badges/verify', { tokenId, walletAddress }),
    
    getLeaderboard: (params = {}) =>
      apiClient.get('/badges/leaderboard', { params })
  }
};

// Utility functions
const utils = {
  // Set authentication token
  setAuthToken: (token) => {
    if (token) {
      localStorage.setItem('pogpp_token', token);
      apiClient.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem('pogpp_token');
      delete apiClient.defaults.headers.Authorization;
    }
  },

  // Get authentication token
  getAuthToken: () => {
    return localStorage.getItem('pogpp_token');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('pogpp_token');
  },

  // Handle API errors
  handleError: (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      return {
        status,
        message: data.message || data.error || 'An error occurred',
        details: data.details || null
      };
    } else if (error.request) {
      // Request made but no response received
      return {
        status: 0,
        message: 'Network error - please check your connection',
        details: null
      };
    } else {
      // Something else happened
      return {
        status: 0,
        message: error.message || 'An unexpected error occurred',
        details: null
      };
    }
  },

  // Build query string from params
  buildQueryString: (params) => {
    const searchParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        searchParams.append(key, params[key]);
      }
    });
    
    return searchParams.toString();
  },

  // Format API response
  formatResponse: (response) => {
    return {
      data: response.data,
      status: response.status,
      headers: response.headers,
      timestamp: new Date().toISOString()
    };
  },

  // Cancel request
  createCancelToken: () => {
    return axios.CancelToken.source();
  }
};

// Export combined API client
const api = {
  ...apiMethods,
  utils,
  instance: apiClient
};

export default api;
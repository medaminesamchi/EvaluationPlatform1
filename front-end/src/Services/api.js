import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8081/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('governance_token');
    const url = config?.url || '';
    const isAuthEndpoint = url.startsWith('/auth/');
    
    if (token && !isAuthEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Token added to request:', token.substring(0, 20) + '...');
    } else {
      if (!token) {
        console.log('⚠️ No token found in localStorage!');
      } else {
        console.log('ℹ️ Skipping token for auth endpoint:', url);
      }
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      const code = error.response?.data?.error;
      const msg = error.response?.data?.message;
      const shouldLogout =
        error.response?.status === 401 ||
        code === 'token_expired' ||
        (typeof msg === 'string' && msg.toLowerCase().includes('jwt'));

      if (!shouldLogout) {
        return Promise.reject(error);
      }

      console.log(`🚫 ${error.response?.status} - Token expired or invalid`);
      localStorage.removeItem('governance_token');
      localStorage.removeItem('governance_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
import axios from 'axios';
import { toast } from 'react-toastify';

// const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://cpms-4qh0.onrender.comhttp://localhost:5000/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://cpms-4qh0.onrender.com/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🔄 API Request:', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', error.response?.status, error.response?.data);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Auth API Methods
export const authAPI = {
  adminLogin: (credentials) => api.post('/auth/admin/login', credentials),
  clientLogin: (credentials) => api.post('/auth/client/login', credentials),
  employeeLogin: (credentials) => api.post('/auth/employee/login', credentials),
  createAdmin: (data) => api.post('/auth/admin/create', data),
  createEmployee: (data) => api.post('/auth/employee/create', data),
  createClient: (data) => api.post('/auth/client/create', data),
};

// Client API Methods
export const clientAPI = {
  getAll: (params) => api.get('/clients', { params }),
  getById: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
  getExpiries: (params) => api.get('/clients/expiries', { params }),
  getStats: () => api.get('/clients/stats'),
};

// Employee API Methods
export const employeeAPI = {
  getAll: (params) => {
    console.log('📞 Calling employeeAPI.getAll with params:', params);
    return api.get('/employees', { params });
  },
  getById: (id) => {
    console.log('📞 Calling employeeAPI.getById with id:', id);
    return api.get(`/employees/${id}`);
  },
  create: (data) => {
    console.log('📞 Calling employeeAPI.create with data:', data);
    return api.post('/employees', data);
  },
  update: (id, data) => {
    console.log('📞 Calling employeeAPI.update with id:', id, 'data:', data);
    return api.put(`/employees/${id}`, data);
  },
  delete: (id) => {
    console.log('📞 Calling employeeAPI.delete with id:', id);
    return api.delete(`/employees/${id}`);
  },
  getStats: () => api.get('/employees/stats'),
};

// Project API Methods
export const projectAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getByClient: (clientId) => api.get(`/projects/client/${clientId}`),
};

// Payment API Methods
export const paymentAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
  getByClient: (clientId) => api.get(`/payments/client/${clientId}`),
  generateInvoice: (id) => api.get(`/payments/${id}/invoice`, { responseType: 'blob' }),
};

// Message API Methods - COMPLETE IMPLEMENTATION
export const messageAPI = {
  getAll: (params) => {
    console.log('📞 Calling messageAPI.getAll with params:', params);
    return api.get('/messages', { params });
  },
  getById: (id) => {
    console.log('📞 Calling messageAPI.getById with id:', id);
    return api.get(`/messages/${id}`);
  },
  send: (data) => {
    console.log('📞 Calling messageAPI.send with data:', data);
    return api.post('/messages', data);
  },
  markAsRead: (id) => {
    console.log('📞 Calling messageAPI.markAsRead with id:', id);
    return api.put(`/messages/${id}/read`);
  },
  reply: (id, data) => {
    console.log('📞 Calling messageAPI.reply with id:', id, 'data:', data);
    return api.post(`/messages/${id}/reply`, data);
  },
  getStats: () => {
    console.log('📞 Calling messageAPI.getStats');
    return api.get('/messages/stats');
  },
  // Get conversation between users
  getConversation: (userId) => {
    console.log('📞 Calling messageAPI.getConversation with userId:', userId);
    return api.get(`/messages/conversation/${userId}`);
  }
};

// Test API Connection
export const testAPI = {
  ping: () => api.get('/'),
  health: () => api.get('/health'),
};

// Export default api instance
export default api;

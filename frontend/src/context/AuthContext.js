import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, role = 'admin') => {
  try {
    let endpoint;
    
    // Role के अनुसार endpoint set करें
    switch(role) {
      case 'admin':
        endpoint = '/auth/admin/login';
        break;
      case 'employee':
        endpoint = '/auth/employee/login';
        break;
      case 'client':
        endpoint = '/auth/client/login';
        break;
      default:
        endpoint = '/auth/admin/login';
    }
    
    console.log(`Attempting ${role} login with endpoint:`, endpoint);
    
    const response = await api.post(endpoint, { email, password });
    const { token, user: userData } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    setUser(userData);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    return { success: true };
  } catch (error) {
    console.error('Login error:', error.response?.data);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Login failed' 
    };
  }
};



  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

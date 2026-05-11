import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

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
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));

  useEffect(() => {
    if (accessToken) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchUser = async () => {
    try {
      const response = await axios.get('http://localhost:8000/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      if (error.response?.status === 401) {
        // Token expiré, essayer de rafraîchir
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshAccessToken = async () => {
    try {
      const response = await axios.post('http://localhost:8000/auth/refresh', {
        refresh_token: refreshToken
      });
      const { access_token, refresh_token } = response.data;
      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      localStorage.setItem('accessToken', access_token);
      localStorage.setItem('refreshToken', refresh_token);
      await fetchUser();
    } catch (error) {
      console.error('Error refreshing token:', error);
      logout();
    }
  };

  const login = (access_token, refresh_token) => {
    setAccessToken(access_token);
    setRefreshToken(refresh_token);
    localStorage.setItem('accessToken', access_token);
    localStorage.setItem('refreshToken', refresh_token);
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const loginWithGoogle = async () => {
    try {
      const response = await axios.get('http://localhost:8000/auth/google/login');
      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error('Error initiating Google login:', error);
    }
  };

  const value = {
    user,
    loading,
    accessToken,
    login,
    logout,
    loginWithGoogle,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

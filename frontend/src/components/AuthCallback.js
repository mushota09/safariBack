import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      login(accessToken, refreshToken);
      // Rediriger vers la page d'où l'utilisateur venait ou vers l'accueil
      const returnUrl = localStorage.getItem('returnUrl') || '/';
      localStorage.removeItem('returnUrl');
      navigate(returnUrl);
    } else {
      navigate('/');
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
  );
};

export default AuthCallback;

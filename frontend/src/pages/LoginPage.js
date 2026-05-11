import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    email: '',
    nom_complet: '',
    numero_telephone: '',
    password: '',
    date_naissance: ''
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:8000/auth/login', loginData);
      const { access_token, refresh_token } = response.data;
      login(access_token, refresh_token);

      const returnUrl = localStorage.getItem('returnUrl') || '/';
      localStorage.removeItem('returnUrl');
      navigate(returnUrl);
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.detail || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Inscription
      await axios.post('http://localhost:8000/auth/register', registerData);

      // Auto-login après inscription - utiliser l'email comme username
      const username = registerData.email.split('@')[0];
      const loginResponse = await axios.post('http://localhost:8000/auth/login', {
        username: username,
        password: registerData.password
      });

      const { access_token, refresh_token } = loginResponse.data;
      login(access_token, refresh_token);

      const returnUrl = localStorage.getItem('returnUrl') || '/';
      localStorage.removeItem('returnUrl');
      navigate(returnUrl);
    } catch (error) {
      console.error('Register error:', error);
      setError(error.response?.data?.detail || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">
            {isLogin ? 'Connexion' : 'Inscription'}
          </h1>

          <div className="auth-tabs">
            <button
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Connexion
            </button>
            <button
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Inscription
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {isLogin ? (
            <form onSubmit={handleLoginSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Nom d'utilisateur</label>
                <input
                  type="text"
                  className="form-input"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mot de passe</label>
                <input
                  type="password"
                  className="form-input"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={loading}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Nom complet *</label>
                <input
                  type="text"
                  className="form-input"
                  value={registerData.nom_complet}
                  onChange={(e) => setRegisterData({ ...registerData, nom_complet: e.target.value })}
                  placeholder="Ex: Jean Kabongo"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  placeholder="exemple@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Téléphone *</label>
                <input
                  type="tel"
                  className="form-input"
                  value={registerData.numero_telephone}
                  onChange={(e) => setRegisterData({ ...registerData, numero_telephone: e.target.value })}
                  placeholder="+243 8XX XXX XXX"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mot de passe *</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-input"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    placeholder="Minimum 6 caractères"
                    minLength="6"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Date de naissance *</label>
                <input
                  type="date"
                  className="form-input"
                  value={registerData.date_naissance}
                  onChange={(e) => setRegisterData({ ...registerData, date_naissance: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={loading}
              >
                {loading ? 'Inscription...' : 'S\'inscrire'}
              </button>
            </form>
          )}

          <div className="auth-divider">
            <span>OU</span>
          </div>

          <button
            onClick={loginWithGoogle}
            className="btn btn-google"
            disabled={loading}
          >
            <span className="google-icon">G</span>
            Continuer avec Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

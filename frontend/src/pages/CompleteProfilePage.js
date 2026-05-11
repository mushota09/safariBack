import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './CompleteProfilePage.css';

function CompleteProfilePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    numero_telephone: '',
    date_naissance: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Récupérer les tokens depuis l'URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    console.log('URL params - access_token:', !!accessToken, 'refresh_token:', !!refreshToken);

    if (!accessToken || !refreshToken) {
      console.error('Missing tokens, redirecting to login');
      navigate('/login');
    } else {
      // Stocker temporairement les tokens
      sessionStorage.setItem('temp_access_token', accessToken);
      sessionStorage.setItem('temp_refresh_token', refreshToken);
      console.log('Tokens stored in sessionStorage');
    }
  }, [searchParams, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const accessToken = sessionStorage.getItem('temp_access_token');

      console.log('Access token exists:', !!accessToken);
      console.log('Form data:', formData);

      if (!accessToken) {
        throw new Error('Token manquant. Veuillez vous reconnecter.');
      }

      const response = await fetch('http://localhost:8000/auth/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Erreur lors de la complétion du profil');
      }

      // Profil complété avec succès
      const refreshToken = sessionStorage.getItem('temp_refresh_token');

      // Nettoyer le sessionStorage
      sessionStorage.removeItem('temp_access_token');
      sessionStorage.removeItem('temp_refresh_token');

      // Connecter l'utilisateur
      login(accessToken, refreshToken);

      // Rediriger vers la page d'accueil
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="complete-profile-page">
      <div className="complete-profile-container">
        <div className="complete-profile-header">
          <h1>Complétez votre profil</h1>
          <p>Pour finaliser votre inscription, veuillez fournir les informations suivantes</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="complete-profile-form">
          <div className="form-group">
            <label htmlFor="numero_telephone">Numéro de téléphone *</label>
            <input
              type="tel"
              id="numero_telephone"
              name="numero_telephone"
              value={formData.numero_telephone}
              onChange={handleChange}
              placeholder="+243 8XX XXX XXX"
              required
            />
            <small>Format: +243 suivi de votre numéro</small>
          </div>

          <div className="form-group">
            <label htmlFor="date_naissance">Date de naissance *</label>
            <input
              type="date"
              id="date_naissance"
              name="date_naissance"
              value={formData.date_naissance}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Finaliser mon inscription'}
          </button>
        </form>

        <div className="info-box">
          <p>
            <strong>Pourquoi ces informations ?</strong><br />
            Votre numéro de téléphone et date de naissance sont nécessaires pour:
          </p>
          <ul>
            <li>Pour vous contacter en cas d'urgence</li>
            <li>Vérifier votre identité lors de l'embarquement</li>
            <li>Respecter les réglementations maritimes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default CompleteProfilePage;

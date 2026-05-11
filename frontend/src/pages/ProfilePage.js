import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, accessToken, isAuthenticated, logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    try {
      await axios.post(
        'http://localhost:8000/auth/change-password',
        {
          old_password: passwordData.old_password,
          new_password: passwordData.new_password
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      setSuccess('Mot de passe modifié avec succès');
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setSuccess(null);
      }, 2000);
    } catch (error) {
      console.error('Error changing password:', error);
      setError(error.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-container">
          <div className="profile-header">
            <UserAvatar user={user} size="large" />
            <div className="profile-header-info">
              <h1 className="profile-name">{user.nom_complet || user.username}</h1>
              <p className="profile-username">@{user.username}</p>
            </div>
          </div>

          <div className="profile-sections">
            <div className="profile-section">
              <h2 className="section-title">Informations personnelles</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{user.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Téléphone</span>
                  <span className="info-value">{user.numero_telephone}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Nom d'utilisateur</span>
                  <span className="info-value">{user.username}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Statut</span>
                  <span className={`status-badge ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                    {user.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h2 className="section-title">Actions</h2>
              <div className="actions-grid">
                <button
                  onClick={() => navigate('/my-reservations')}
                  className="action-button"
                >
                  <span className="action-icon">🎫</span>
                  <span className="action-text">Mes réservations</span>
                </button>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="action-button"
                >
                  <span className="action-icon">🔒</span>
                  <span className="action-text">Changer le mot de passe</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="action-button action-danger"
                >
                  <span className="action-icon">🚪</span>
                  <span className="action-text">Se déconnecter</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Changer le mot de passe</h2>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Ancien mot de passe</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nouveau mot de passe</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Modification...' : 'Modifier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">⛴️</span>
          <span className="logo-text">Safari Fast</span>
        </Link>

        <nav className="nav">
          <Link to="/compagnies" className="nav-link">
            Programme
          </Link>

          {isAuthenticated ? (
            <div className="user-menu" ref={menuRef}>
              <button
                className="user-button"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <UserAvatar user={user} size="small" className="avatar-header" />
                <span className="user-name">{user?.nom_complet || user?.username}</span>
                <span className="dropdown-arrow">▼</span>
              </button>

              {showUserMenu && (
                <div className="user-dropdown">
                  <Link
                    to="/profile"
                    className="dropdown-item"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <span className="dropdown-icon">👤</span>
                    Mon profil
                  </Link>
                  <Link
                    to="/my-reservations"
                    className="dropdown-item"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <span className="dropdown-icon">🎫</span>
                    Mes réservations
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button
                    onClick={handleLogout}
                    className="dropdown-item dropdown-item-danger"
                  >
                    <span className="dropdown-icon">🚪</span>
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="login-button">
              Se connecter
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;

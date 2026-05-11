import React from 'react';
import './UserAvatar.css';

const UserAvatar = ({ user, size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'avatar-small',
    medium: 'avatar-medium',
    large: 'avatar-large'
  };

  const getInitial = () => {
    if (user?.nom_complet) {
      return user.nom_complet.charAt(0).toUpperCase();
    }
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className={`user-avatar-container ${sizeClasses[size]} ${className}`}>
      {user?.photo_profil ? (
        <img
          src={user.photo_profil}
          alt={user.nom_complet || user.username || 'User'}
          className="user-avatar-image"
        />
      ) : (
        <div className="user-avatar-initial">
          {getInitial()}
        </div>
      )}
    </div>
  );
};

export default UserAvatar;

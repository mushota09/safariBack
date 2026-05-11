import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import './VoyageCard.css';

const VoyageCard = ({ voyage }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
  };

  const formatTime = (dateString) => {
    return format(new Date(dateString), 'HH:mm', { locale: fr });
  };

  const calculateDuration = () => {
    const depart = new Date(voyage.date_depart_programme);
    const arrivee = new Date(voyage.date_arrivee_programmee);
    const diff = arrivee - depart;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h${minutes > 0 ? minutes : ''}`;
  };

  const handleClick = () => {
    navigate(`/voyage/${voyage.id}`);
  };

  return (
    <div className="voyage-card" onClick={handleClick}>
      <div className="voyage-header">
        <div className="compagnie-info">
          <span className="compagnie-icon">⛴️</span>
          <span className="compagnie-name">{voyage.bateau.nom}</span>
        </div>
        <div className="voyage-status">
          <span className={`status-badge status-${voyage.statut}`}>
            {voyage.statut}
          </span>
        </div>
      </div>

      <div className="voyage-route">
        <div className="route-point">
          <div className="port-name">{voyage.port_depart.nom}</div>
          <div className="port-code">{voyage.port_depart.code_international}</div>
          <div className="departure-time">{formatTime(voyage.date_depart_programme)}</div>
        </div>

        <div className="route-line">
          <div className="route-duration">{calculateDuration()}</div>
          <div className="route-arrow">→</div>
        </div>

        <div className="route-point">
          <div className="port-name">{voyage.port_arrivee.nom}</div>
          <div className="port-code">{voyage.port_arrivee.code_international}</div>
          <div className="arrival-time">{formatTime(voyage.date_arrivee_programmee)}</div>
        </div>
      </div>

      <div className="voyage-date">
        📅 {formatDate(voyage.date_depart_programme)}
      </div>

      <div className="voyage-details">
        <div className="detail-item">
          <span className="detail-icon">🎫</span>
          <span className="detail-text">
            Places vendues: {voyage.places_vendues_passagers}
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-icon">👥</span>
          <span className="detail-text">
            Places totales: {voyage.places_disponibles_passagers}
          </span>
        </div>
      </div>

      <div className="voyage-footer">
        <div className="price-info">
          {voyage.prix_promotionnel ? (
            <>
              <span className="price-original">{voyage.prix_base}€</span>
              <span className="price-promo">{voyage.prix_promotionnel}€</span>
            </>
          ) : (
            <span className="price">{voyage.prix_base}€</span>
          )}
          <span className="price-label">par personne</span>
        </div>
        <button className="btn btn-primary">
          Voir les détails
        </button>
      </div>
    </div>
  );
};

export default VoyageCard;

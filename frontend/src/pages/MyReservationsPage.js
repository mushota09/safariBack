import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './MyReservationsPage.css';

const MyReservationsPage = () => {
  const navigate = useNavigate();
  const { accessToken, isAuthenticated } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchReservations();
  }, [isAuthenticated]);

  const fetchReservations = async () => {
    try {
      const response = await axios.get('http://localhost:8000/reservations', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      setReservations(response.data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setError('Erreur lors du chargement des réservations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (statut) => {
    const statusMap = {
      'en_attente': 'warning',
      'confirme': 'success',
      'annule': 'danger',
      'expire': 'secondary',
      'termine': 'info'
    };
    return statusMap[statut] || 'secondary';
  };

  const getStatusLabel = (statut) => {
    const labelMap = {
      'en_attente': 'En attente',
      'confirme': 'Confirmé',
      'annule': 'Annulé',
      'expire': 'Expiré',
      'termine': 'Terminé'
    };
    return labelMap[statut] || statut;
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'dd MMMM yyyy à HH:mm', { locale: fr });
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="my-reservations-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Mes Réservations</h1>
          <p className="page-subtitle">
            {reservations.length} réservation{reservations.length > 1 ? 's' : ''}
          </p>
        </div>

        {reservations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎫</div>
            <h2>Aucune réservation</h2>
            <p>Vous n'avez pas encore effectué de réservation</p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              Rechercher un voyage
            </button>
          </div>
        ) : (
          <div className="reservations-list">
            {reservations.map((reservation) => (
              <div
                key={reservation.id}
                className="reservation-card"
                onClick={() => navigate(`/reservation-details/${reservation.id}`)}
              >
                <div className="reservation-header">
                  <div className="reservation-ref">
                    <span className="ref-label">Référence</span>
                    <span className="ref-value">{reservation.reference_reservation}</span>
                  </div>
                  <span className={`status-badge status-${getStatusBadgeClass(reservation.statut_reservation)}`}>
                    {getStatusLabel(reservation.statut_reservation)}
                  </span>
                </div>

                <div className="reservation-info">
                  <div className="info-row">
                    <span className="info-icon">📅</span>
                    <span className="info-text">
                      Réservé le {formatDate(reservation.date_reservation)}
                    </span>
                  </div>

                  <div className="info-row">
                    <span className="info-icon">👥</span>
                    <span className="info-text">
                      {reservation.nombre_passagers} passager{reservation.nombre_passagers > 1 ? 's' : ''}
                    </span>
                  </div>

                  {reservation.vehicule_inclus && (
                    <div className="info-row">
                      <span className="info-icon">🚗</span>
                      <span className="info-text">
                        Véhicule inclus ({reservation.type_vehicule})
                      </span>
                    </div>
                  )}

                  <div className="info-row">
                    <span className="info-icon">💰</span>
                    <span className="info-text price-text">
                      {reservation.montant_total.toFixed(2)}€
                    </span>
                  </div>
                </div>

                {reservation.statut_reservation === 'en_attente' && reservation.date_expiration_paiement && (
                  <div className="expiration-warning">
                    ⏰ Expire le {formatDate(reservation.date_expiration_paiement)}
                  </div>
                )}

                {reservation.statut_reservation === 'annule' && reservation.raison_annulation && (
                  <div className="cancellation-info">
                    <strong>Raison:</strong> {reservation.raison_annulation}
                  </div>
                )}

                <div className="reservation-actions">
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/reservation-details/${reservation.id}`);
                    }}
                  >
                    Voir les détails
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReservationsPage;

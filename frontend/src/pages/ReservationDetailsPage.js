import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './ReservationDetailsPage.css';

const ReservationDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, isAuthenticated } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchReservationDetails();
  }, [id, isAuthenticated]);

  const fetchReservationDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/reservations/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      setReservation(response.data);
    } catch (error) {
      console.error('Error fetching reservation:', error);
      setError('Erreur lors du chargement de la réservation');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    setCancelling(true);
    try {
      await axios.post(
        `http://localhost:8000/reservations/${id}/cancel`,
        { raison: cancelReason || 'Annulation par l\'utilisateur' },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      setShowCancelModal(false);
      fetchReservationDetails();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert(error.response?.data?.detail || 'Erreur lors de l\'annulation');
    } finally {
      setCancelling(false);
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
      'en_attente': 'En attente de paiement',
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

  const canCancel = reservation && ['en_attente', 'confirme'].includes(reservation.statut_reservation);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="container">
        <div className="error-message">{error || 'Réservation non trouvée'}</div>
        <button onClick={() => navigate('/my-reservations')} className="btn btn-primary">
          Retour à mes réservations
        </button>
      </div>
    );
  }

  return (
    <div className="reservation-details-page">
      <div className="container">
        <button onClick={() => navigate('/my-reservations')} className="back-button">
          ← Mes réservations
        </button>

        <div className="details-grid">
          <div className="details-main">
            <div className="details-card">
              <div className="details-header">
                <div>
                  <h1 className="details-title">Réservation</h1>
                  <p className="details-ref">{reservation.reference_reservation}</p>
                </div>
                <span className={`status-badge status-${getStatusBadgeClass(reservation.statut_reservation)}`}>
                  {getStatusLabel(reservation.statut_reservation)}
                </span>
              </div>

              <div className="details-section">
                <h2 className="section-title">Informations générales</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Date de réservation</span>
                    <span className="info-value">{formatDate(reservation.date_reservation)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Type</span>
                    <span className="info-value">{reservation.type_reservation}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Passagers</span>
                    <span className="info-value">{reservation.nombre_passagers}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Montant total</span>
                    <span className="info-value price">{reservation.montant_total.toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              {reservation.passagers_details && reservation.passagers_details.length > 0 && (
                <div className="details-section">
                  <h2 className="section-title">
                    Passagers enregistrés ({reservation.passagers_details.length})
                  </h2>
                  <div className="passagers-list">
                    {reservation.passagers_details.map((p, idx) => (
                      <div key={p.id} className="passager-row">
                        <div className="passager-row-header">
                          <span className="passager-row-number">Passager {idx + 1}</span>
                          {p.is_principal && (
                            <span className="passager-row-badge">Principal</span>
                          )}
                        </div>
                        <div className="info-grid">
                          <div className="info-item">
                            <span className="info-label">Nom complet</span>
                            <span className="info-value">{p.nom_complet}</span>
                          </div>
                          {p.email && (
                            <div className="info-item">
                              <span className="info-label">Email</span>
                              <span className="info-value">{p.email}</span>
                            </div>
                          )}
                          {p.telephone && (
                            <div className="info-item">
                              <span className="info-label">Téléphone</span>
                              <span className="info-value">{p.telephone}</span>
                            </div>
                          )}
                          {p.chambre_id && (
                            <div className="info-item">
                              <span className="info-label">Chambre</span>
                              <span className="info-value">#{p.chambre_id}</span>
                            </div>
                          )}
                          {p.lit_id && (
                            <div className="info-item">
                              <span className="info-label">Lit</span>
                              <span className="info-value">#{p.lit_id}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reservation.vehicules_details && reservation.vehicules_details.length > 0 ? (
                <div className="details-section">
                  <h2 className="section-title">
                    Véhicules enregistrés ({reservation.vehicules_details.length})
                  </h2>
                  <div className="vehicules-list">
                    {reservation.vehicules_details.map((v, idx) => (
                      <div key={v.id} className="vehicule-row">
                        <div className="vehicule-row-header">
                          <span className="vehicule-row-number">Véhicule {idx + 1}</span>
                          <span className="vehicule-row-badge">{v.type_vehicule}</span>
                        </div>
                        <div className="info-grid">
                          <div className="info-item">
                            <span className="info-label">Immatriculation</span>
                            <span className="info-value">{v.immatriculation}</span>
                          </div>
                          {v.marque && (
                            <div className="info-item">
                              <span className="info-label">Marque</span>
                              <span className="info-value">{v.marque}</span>
                            </div>
                          )}
                          {v.modele && (
                            <div className="info-item">
                              <span className="info-label">Modèle</span>
                              <span className="info-value">{v.modele}</span>
                            </div>
                          )}
                          {v.couleur && (
                            <div className="info-item">
                              <span className="info-label">Couleur</span>
                              <span className="info-value">{v.couleur}</span>
                            </div>
                          )}
                          {v.annee && (
                            <div className="info-item">
                              <span className="info-label">Année</span>
                              <span className="info-value">{v.annee}</span>
                            </div>
                          )}
                          {v.proprietaire_nom && (
                            <div className="info-item">
                              <span className="info-label">Propriétaire</span>
                              <span className="info-value">{v.proprietaire_nom}</span>
                            </div>
                          )}
                          {v.proprietaire_telephone && (
                            <div className="info-item">
                              <span className="info-label">Téléphone propriétaire</span>
                              <span className="info-value">{v.proprietaire_telephone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : reservation.vehicule_inclus && (
                <div className="details-section">
                  <h2 className="section-title">Véhicule</h2>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Type</span>
                      <span className="info-value">{reservation.type_vehicule}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Immatriculation</span>
                      <span className="info-value">{reservation.immatriculation_vehicule}</span>
                    </div>
                  </div>
                </div>
              )}

              {reservation.statut_reservation === 'annule' && (
                <div className="details-section">
                  <h2 className="section-title">Annulation</h2>
                  <div className="cancellation-box">
                    <div className="info-item">
                      <span className="info-label">Date d'annulation</span>
                      <span className="info-value">{formatDate(reservation.date_annulation)}</span>
                    </div>
                    {reservation.raison_annulation && (
                      <div className="info-item">
                        <span className="info-label">Raison</span>
                        <span className="info-value">{reservation.raison_annulation}</span>
                      </div>
                    )}
                    {reservation.frais_annulation > 0 && (
                      <div className="info-item">
                        <span className="info-label">Frais d'annulation</span>
                        <span className="info-value price">{reservation.frais_annulation.toFixed(2)}€</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="details-sidebar">
            {canCancel && (
              <div className="action-card">
                <h3 className="action-title">Actions</h3>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="btn btn-danger btn-large"
                >
                  Annuler la réservation
                </button>
                <p className="action-note">
                  Des frais d'annulation peuvent s'appliquer selon les conditions.
                </p>
              </div>
            )}

            {reservation.statut_reservation === 'confirme' && (
              <div className="action-card">
                <h3 className="action-title">Votre billet</h3>
                <p className="action-note">
                  Votre billet a été envoyé par email. Vous pouvez également le télécharger ici.
                </p>
                <button className="btn btn-secondary btn-large">
                  📄 Télécharger le PDF
                </button>
                <button className="btn btn-secondary btn-large">
                  📱 Afficher le QR Code
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Annuler la réservation</h2>
            <p className="modal-text">
              Êtes-vous sûr de vouloir annuler cette réservation ?
            </p>
            <div className="form-group">
              <label className="form-label">Raison de l'annulation (optionnel)</label>
              <textarea
                className="form-textarea"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows="3"
                placeholder="Expliquez pourquoi vous annulez..."
              />
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowCancelModal(false)}
                className="btn btn-secondary"
                disabled={cancelling}
              >
                Non, garder
              </button>
              <button
                onClick={handleCancelReservation}
                className="btn btn-danger"
                disabled={cancelling}
              >
                {cancelling ? 'Annulation...' : 'Oui, annuler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationDetailsPage;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './ReservationPage.css';

const ReservationPage = () => {
  const { voyageId } = useParams();
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const [voyage, setVoyage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    nombre_passagers: 1,
    vehicule_inclus: false,
    type_vehicule: '',
    immatriculation_vehicule: ''
  });

  useEffect(() => {
    fetchVoyageDetails();
  }, [voyageId]);

  const fetchVoyageDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/traversees`);
      const foundVoyage = response.data.find(v => v.id === parseInt(voyageId));
      if (foundVoyage) {
        setVoyage(foundVoyage);
      } else {
        setError('Voyage non trouvé');
      }
    } catch (error) {
      console.error('Error fetching voyage:', error);
      setError('Erreur lors du chargement du voyage');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!voyage) return 0;
    const prix = voyage.prix_promotionnel || voyage.prix_base;
    let total = prix * formData.nombre_passagers;
    if (formData.vehicule_inclus) {
      total += prix * 0.5; // 50% du prix pour le véhicule
    }
    return total.toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Créer la réservation
      const reservationData = {
        voyage_id: parseInt(voyageId),
        type_reservation: formData.vehicule_inclus ? 'mixte' : 'passager',
        nombre_passagers: formData.nombre_passagers,
        vehicule_inclus: formData.vehicule_inclus,
        type_vehicule: formData.vehicule_inclus ? formData.type_vehicule : null,
        immatriculation_vehicule: formData.vehicule_inclus ? formData.immatriculation_vehicule : null
      };

      const reservationResponse = await axios.post(
        'http://localhost:8000/reservations',
        reservationData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const reservation = reservationResponse.data;

      // Simuler le paiement
      const paiementData = {
        reservation_id: reservation.id,
        mode_paiement: 'carte',
        numero_carte: '4111111111111111',
        cvv: '123',
        date_expiration: '12/25'
      };

      await axios.post(
        'http://localhost:8000/paiements',
        paiementData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Error creating reservation:', error);
      setError(error.response?.data?.detail || 'Erreur lors de la réservation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error && !voyage) {
    return (
      <div className="container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container">
        <div className="success-message">
          <h2>✅ Réservation confirmée !</h2>
          <p>Votre billet a été envoyé par email à {user?.email}</p>
          <p>Redirection vers l'accueil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reservation-page">
      <div className="container">
        <button onClick={() => navigate(`/voyage/${voyageId}`)} className="back-button">
          ← Retour aux détails
        </button>

        <div className="reservation-grid">
          <div className="reservation-form-section">
            <div className="card">
              <h2 className="section-title">Informations de réservation</h2>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Nombre de passagers</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.nombre_passagers}
                    onChange={(e) => setFormData({ ...formData, nombre_passagers: parseInt(e.target.value) })}
                    min="1"
                    max={voyage?.places_disponibles_passagers}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.vehicule_inclus}
                      onChange={(e) => setFormData({ ...formData, vehicule_inclus: e.target.checked })}
                    />
                    <span>Inclure un véhicule</span>
                  </label>
                </div>

                {formData.vehicule_inclus && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Type de véhicule</label>
                      <select
                        className="form-select"
                        value={formData.type_vehicule}
                        onChange={(e) => setFormData({ ...formData, type_vehicule: e.target.value })}
                        required
                      >
                        <option value="">Sélectionnez un type</option>
                        <option value="voiture">Voiture</option>
                        <option value="moto">Moto</option>
                        <option value="camion">Camion</option>
                        <option value="bus">Bus</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Immatriculation</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.immatriculation_vehicule}
                        onChange={(e) => setFormData({ ...formData, immatriculation_vehicule: e.target.value })}
                        placeholder="AB-123-CD"
                        required
                      />
                    </div>
                  </>
                )}

                {error && <div className="error-message">{error}</div>}

                <button
                  type="submit"
                  className="btn btn-primary btn-large"
                  disabled={submitting}
                >
                  {submitting ? 'Traitement en cours...' : 'Confirmer et payer'}
                </button>
              </form>
            </div>
          </div>

          <div className="reservation-summary">
            <div className="card">
              <h3 className="section-title">Récapitulatif</h3>

              <div className="summary-item">
                <span>Voyage</span>
                <span>{voyage?.port_depart.nom} → {voyage?.port_arrivee.nom}</span>
              </div>

              <div className="summary-item">
                <span>Compagnie</span>
                <span>{voyage?.compagnie.nom}</span>
              </div>

              <div className="summary-item">
                <span>Bateau</span>
                <span>{voyage?.bateau.nom}</span>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-item">
                <span>Passagers</span>
                <span>{formData.nombre_passagers} × {voyage?.prix_promotionnel || voyage?.prix_base}€</span>
              </div>

              {formData.vehicule_inclus && (
                <div className="summary-item">
                  <span>Véhicule</span>
                  <span>1 × {((voyage?.prix_promotionnel || voyage?.prix_base) * 0.5).toFixed(2)}€</span>
                </div>
              )}

              <div className="summary-divider"></div>

              <div className="summary-total">
                <span>Total</span>
                <span className="total-price">{calculateTotal()}€</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationPage;

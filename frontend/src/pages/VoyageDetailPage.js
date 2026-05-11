import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useChambres } from '../hooks/useChambres';
import { usePassagers } from '../hooks/usePassagers';
import { useVehicules } from '../hooks/useVehicules';
import ChambreCard from '../components/reservation/ChambreCard';
import LitCard from '../components/reservation/LitCard';
import PassagerCard from '../components/reservation/PassagerCard';
import VehiculeCard from '../components/reservation/VehiculeCard';
import './VoyageDetailPage.css';

const VoyageDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loginWithGoogle, accessToken, user } = useAuth();

  const [voyage, setVoyage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reservation state
  const [reservationType, setReservationType] = useState('passager');
  const [reservationMode, setReservationMode] = useState('moi_meme');
  const [nombrePassagers, setNombrePassagers] = useState(1);
  const [nombreVehicules, setNombreVehicules] = useState(1);

  // CAS 1: MOI MÊME - Chambre selection
  const [chambreChoice, setChambreChoice] = useState('pour_tous');
  const [selectedChambre, setSelectedChambre] = useState(null);
  const [selectedLit, setSelectedLit] = useState(null);

  // Hooks
  const { chambres, loading: loadingChambres, getLitsDisponibles } = useChambres(showReservationForm && reservationType === 'passager' ? id : null);
  const {
    passagers,
    updatePassager,
    updatePassagerChambreChoice,
    selectChambreForPassager,
    selectLitForPassager,
    isLitOccupied,
    validatePassagers
  } = usePassagers(reservationMode, nombrePassagers, user);

  const {
    vehicules,
    updateVehicule,
    validateVehicules
  } = useVehicules(reservationType, nombreVehicules);

  useEffect(() => {
    fetchVoyageDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Reset when mode changes
  useEffect(() => {
    if (reservationMode === 'moi_meme') {
      setNombrePassagers(1);
    } else if (reservationMode === 'moi_et_autres' && nombrePassagers < 2) {
      setNombrePassagers(2);
    }
  }, [reservationMode, nombrePassagers]);

  const fetchVoyageDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/traversees`);
      const foundVoyage = response.data.find(v => v.id === parseInt(id));
      if (foundVoyage) {
        setVoyage(foundVoyage);
      } else {
        setError('Voyage non trouvé');
      }
    } catch (error) {
      console.error('Error fetching voyage details:', error);
      setError('Erreur lors du chargement des détails du voyage');
    } finally {
      setLoading(false);
    }
  };

  const handleReservation = () => {
    if (!isAuthenticated) {
      localStorage.setItem('returnUrl', `/voyage/${id}`);
      loginWithGoogle();
    } else {
      setShowReservationForm(true);
    }
  };

  const calculateTotalPrice = () => {
    if (!voyage) return '0.00';

    const prixBase = voyage.prix_promotionnel || voyage.prix_base;
    let total = 0;

    if (reservationType === 'passager') {
      if (reservationMode === 'moi_meme') {
        total = prixBase;
        if (chambreChoice === 'chambre' && selectedChambre && selectedLit) {
          const chambre = chambres.find(c => c.id === selectedChambre);
          if (chambre) {
            total += chambre.prix_base;
            const lit = chambre.lits_disponibles.find(l => l.id === selectedLit);
            if (lit) {
              total += lit.prix_supplementaire;
            }
          }
        }
      } else {
        // moi_et_autres ou les_autres
        passagers.forEach(passager => {
          total += prixBase;
          if (passager.chambre_id) {
            const chambre = chambres.find(c => c.id === passager.chambre_id);
            if (chambre) {
              total += chambre.prix_base;
              if (passager.lit_id) {
                const lit = chambre.lits_disponibles.find(l => l.id === passager.lit_id);
                if (lit) {
                  total += lit.prix_supplementaire;
                }
              }
            }
          }
        });
      }
    } else {
      // vehicule
      total = (prixBase * 0.5) * nombreVehicules;
    }

    return total.toFixed(2);
  };

  const handleSubmitReservation = async () => {
    setSubmitting(true);
    setError(null);

    try {
      let reservationData;

      if (reservationType === 'passager') {
        if (reservationMode === 'moi_meme') {
          // CAS 1: Ancienne API
          reservationData = {
            voyage_id: parseInt(id),
            type_reservation: reservationType,
            nombre_passagers: 1,
            vehicule_inclus: false,
            chambre_id: chambreChoice === 'chambre' ? selectedChambre : null,
            lit_id: chambreChoice === 'chambre' ? selectedLit : null
          };

          await axios.post(
            'http://localhost:8000/reservations',
            reservationData,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
        } else {
          // CAS 2 & 3: Nouvelle API
          const validation = validatePassagers();
          if (!validation.valid) {
            setError(validation.error);
            setSubmitting(false);
            return;
          }

          const passagersData = passagers.map(p => ({
            nom_complet: p.nom_complet,
            email: p.email || null,
            telephone: p.telephone || null,
            chambre_id: p.chambre_choice === 'chambre' ? p.chambre_id : null,
            lit_id: p.chambre_choice === 'chambre' ? p.lit_id : null
          }));

          reservationData = {
            voyage_id: parseInt(id),
            type_reservation: reservationType,
            reservation_mode: reservationMode,
            passagers: passagersData,
            vehicules: null
          };

          await axios.post(
            'http://localhost:8000/reservations/multiple',
            reservationData,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
        }
      } else {
        // VÉHICULE
        const validation = validateVehicules();
        if (!validation.valid) {
          setError(validation.error);
          setSubmitting(false);
          return;
        }

        const vehiculesData = vehicules.map(v => ({
          type_vehicule: v.type_vehicule,
          immatriculation: v.immatriculation,
          marque: v.marque || null,
          modele: v.modele || null,
          couleur: v.couleur || null,
          annee: v.annee || null,
          proprietaire_nom: v.proprietaire_nom || null,
          proprietaire_telephone: v.proprietaire_telephone || null
        }));

        reservationData = {
          voyage_id: parseInt(id),
          type_reservation: reservationType,
          reservation_mode: 'vehicule',
          passagers: null,
          vehicules: vehiculesData
        };

        await axios.post(
          'http://localhost:8000/reservations/multiple',
          reservationData,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      }

      console.log('✅ Reservation created');
      navigate(`/my-reservations`);
    } catch (error) {
      console.error('❌ Error creating reservation:', error);
      setError(error.response?.data?.detail || 'Erreur lors de la création de la réservation');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = () => {
    if (reservationType === 'passager') {
      if (!nombrePassagers || nombrePassagers <= 0) return false;

      if (reservationMode === 'moi_meme') {
        if (chambreChoice === 'chambre' && (!selectedChambre || !selectedLit)) {
          return false;
        }
        return true;
      }

      return validatePassagers().valid;
    } else {
      // vehicule
      // Vérifier si le bateau prend en charge les véhicules
      if (!voyage.bateau.capacite_vehicules || voyage.bateau.capacite_vehicules === 0) {
        return false;
      }

      // Vérifier s'il y a des places disponibles
      const placesDispoVehicules = voyage.places_disponibles_vehicules - voyage.places_vendues_vehicules;
      if (placesDispoVehicules <= 0) {
        return false;
      }

      if (!nombreVehicules || nombreVehicules <= 0) return false;
      if (nombreVehicules > placesDispoVehicules) {
        return false;
      }
      return validateVehicules().valid;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement des détails...</p>
      </div>
    );
  }

  if (error && !voyage) {
    return (
      <div className="container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/')} className="btn btn-secondary">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'EEEE dd MMMM yyyy', { locale: fr });
  };

  const formatTime = (dateString) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const calculateDuration = () => {
    const depart = new Date(voyage.date_depart_programme);
    const arrivee = new Date(voyage.date_arrivee_programmee);
    const diff = arrivee - depart;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
  };

  const getStatusLabel = (statut) => {
    const labels = {
      'programme': 'Programmé',
      'confirme': 'Confirmé',
      'en_cours': 'En cours',
      'termine': 'Terminé',
      'annule': 'Annulé',
      'retarde': 'Retardé'
    };
    return labels[statut] || statut;
  };

  const placesRestantes = voyage.places_disponibles_passagers;
  const tauxOccupation = ((voyage.places_vendues_passagers / (voyage.places_vendues_passagers + placesRestantes)) * 100).toFixed(0);

  return (
    <div className="voyage-detail-page">
      <div className="detail-hero">
        <div className="container">
          <button onClick={() => navigate(-1)} className="back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Retour
          </button>

          <div className="hero-content">
            <div className="hero-badge">
              <span className={`status-pill status-${voyage.statut}`}>
                {getStatusLabel(voyage.statut)}
              </span>
            </div>
            <h1 className="hero-title">{voyage.bateau.nom}</h1>
            <p className="hero-subtitle">Opéré par {voyage.compagnie.nom}</p>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="detail-layout">
          <div className="detail-main">
            {!showReservationForm ? (
              <>
                {/* Itinéraire */}
                <div className="card route-card">
                  <div className="card-header">
                    <h2>Itinéraire</h2>
                    <span className="duration-badge">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      {calculateDuration()}
                    </span>
                  </div>

                  <div className="route-timeline">
                    <div className="timeline-item">
                      <div className="timeline-marker departure"></div>
                      <div className="timeline-content">
                        <div className="timeline-label">Départ</div>
                        <div className="timeline-location">{voyage.port_depart.nom}</div>
                        <div className="timeline-time">{formatTime(voyage.date_depart_programme)}</div>
                        <div className="timeline-date">{formatDate(voyage.date_depart_programme)}</div>
                      </div>
                    </div>

                    <div className="timeline-connector"></div>

                    <div className="timeline-item">
                      <div className="timeline-marker arrival"></div>
                      <div className="timeline-content">
                        <div className="timeline-label">Arrivée</div>
                        <div className="timeline-location">{voyage.port_arrivee.nom}</div>
                        <div className="timeline-time">{formatTime(voyage.date_arrivee_programmee)}</div>
                        <div className="timeline-date">{formatDate(voyage.date_arrivee_programmee)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informations du bateau */}
                <div className="card">
                  <div className="card-header">
                    <h2>Informations du bateau</h2>
                  </div>
                  <div className="info-grid">
                    <div className="info-box">
                      <div className="info-icon">🚢</div>
                      <div className="info-content">
                        <div className="info-label">Bateau</div>
                        <div className="info-value">{voyage.bateau.nom}</div>
                      </div>
                    </div>
                    <div className="info-box">
                      <div className="info-icon">🏢</div>
                      <div className="info-content">
                        <div className="info-label">Compagnie</div>
                        <div className="info-value">{voyage.compagnie.nom}</div>
                      </div>
                    </div>
                    <div className="info-box">
                      <div className="info-icon">👥</div>
                      <div className="info-content">
                        <div className="info-label">Capacité totale</div>
                        <div className="info-value">{voyage.bateau.capacite_passagers} passagers</div>
                      </div>
                    </div>
                    {voyage.bateau.capacite_vehicules > 0 && (
                      <div className="info-box">
                        <div className="info-icon">🚗</div>
                        <div className="info-content">
                          <div className="info-label">Véhicules</div>
                          <div className="info-value">{voyage.bateau.capacite_vehicules} places</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Services disponibles */}
                <div className="card">
                  <div className="card-header">
                    <h2>Services disponibles</h2>
                  </div>
                  <div className="availability-section">
                    <div className="availability-main">
                      <div className="availability-number">{placesRestantes}</div>
                      <div className="availability-label">Places disponibles</div>
                      <div className="availability-bar">
                        <div className="availability-fill" style={{width: `${tauxOccupation}%`}}></div>
                      </div>
                      <div className="availability-text">{tauxOccupation}% réservé</div>
                    </div>

                    {placesRestantes < 10 && placesRestantes > 0 && (
                      <div className="availability-alert">
                        ⚠️ Plus que {placesRestantes} places disponibles !
                      </div>
                    )}

                    <div className="services-grid">
                      {voyage.bateau.wifi && (
                        <div className="service-item">
                          <span className="service-icon">📶</span>
                          <span>WiFi</span>
                        </div>
                      )}
                      {voyage.bateau.restaurant && (
                        <div className="service-item">
                          <span className="service-icon">🍽️</span>
                          <span>Restaurant</span>
                        </div>
                      )}
                      {voyage.bateau.clim && (
                        <div className="service-item">
                          <span className="service-icon">❄️</span>
                          <span>Climatisation</span>
                        </div>
                      )}
                      {voyage.bateau.cabines && (
                        <div className="service-item">
                          <span className="service-icon">🛏️</span>
                          <span>Cabines</span>
                        </div>
                      )}
                      {voyage.bateau.boutique && (
                        <div className="service-item">
                          <span className="service-icon">🛍️</span>
                          <span>Boutique</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Reservation Form */
              <div className="card reservation-form-card">
                <div className="card-header">
                  <h2>Réservation</h2>
                  <button
                    onClick={() => setShowReservationForm(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Annuler
                  </button>
                </div>

                <div className="reservation-form">
                  {/* Type de réservation */}
                  <div className="form-section">
                    <h3>Type de réservation</h3>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="reservationType"
                          value="passager"
                          checked={reservationType === 'passager'}
                          onChange={(e) => setReservationType(e.target.value)}
                        />
                        <span className="radio-text">Passager</span>
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="reservationType"
                          value="vehicule"
                          checked={reservationType === 'vehicule'}
                          onChange={(e) => setReservationType(e.target.value)}
                          disabled={!voyage.bateau.capacite_vehicules || voyage.bateau.capacite_vehicules === 0}
                        />
                        <span className="radio-text">Véhicule</span>
                      </label>
                    </div>

                    {/* Alertes pour véhicules */}
                    {reservationType === 'vehicule' && (
                      <>
                        {!voyage.bateau.capacite_vehicules || voyage.bateau.capacite_vehicules === 0 ? (
                          <div className="alert alert-warning">
                            ⚠️ Ce bateau ne prend pas en charge la réservation de véhicules.
                          </div>
                        ) : (voyage.places_disponibles_vehicules - voyage.places_vendues_vehicules) <= 0 ? (
                          <div className="alert alert-danger">
                            ❌ Il n'y a plus de places disponibles pour les véhicules sur ce voyage.
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>

                  {/* Pour qui - Seulement pour PASSAGER */}
                  {reservationType === 'passager' && (
                    <div className="form-section">
                      <h3>Pour</h3>
                      <div className="pour-qui-buttons">
                        <button
                          type="button"
                          className={`pour-qui-btn ${reservationMode === 'moi_meme' ? 'active' : ''}`}
                          onClick={() => setReservationMode('moi_meme')}
                        >
                          Moi même
                        </button>
                        <button
                          type="button"
                          className={`pour-qui-btn ${reservationMode === 'moi_et_autres' ? 'active' : ''}`}
                          onClick={() => setReservationMode('moi_et_autres')}
                        >
                          Moi et les autres
                        </button>
                        <button
                          type="button"
                          className={`pour-qui-btn ${reservationMode === 'les_autres' ? 'active' : ''}`}
                          onClick={() => setReservationMode('les_autres')}
                        >
                          Les autres
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Nombre de passagers - Seulement pour PASSAGER */}
                  {reservationType === 'passager' && (
                    <div className="form-section">
                      <h3>Nombre de passagers</h3>
                      <input
                        type="number"
                        className="form-input"
                        value={nombrePassagers}
                        onChange={(e) => setNombrePassagers(parseInt(e.target.value) || 0)}
                        min={reservationMode === 'moi_et_autres' ? 2 : 1}
                        max={Math.min(200, voyage.places_disponibles_passagers - voyage.places_vendues_passagers)}
                        disabled={reservationMode === 'moi_meme'}
                      />
                      <p className="form-help-text">
                        Places disponibles: {voyage.places_disponibles_passagers - voyage.places_vendues_passagers}
                      </p>
                    </div>
                  )}

                  {/* Nombre de véhicules - Seulement pour VÉHICULE */}
                  {reservationType === 'vehicule' && (
                    <div className="form-section">
                      <h3>Nombre de véhicules</h3>
                      <input
                        type="number"
                        className="form-input"
                        value={nombreVehicules}
                        onChange={(e) => setNombreVehicules(parseInt(e.target.value) || 0)}
                        min={1}
                        max={voyage.places_disponibles_vehicules - voyage.places_vendues_vehicules}
                      />
                      <p className="form-help-text">
                        Places disponibles: {voyage.places_disponibles_vehicules - voyage.places_vendues_vehicules} véhicules
                      </p>
                    </div>
                  )}

                  {/* CAS 1: MOI MÊME - Seulement pour PASSAGER */}
                  {reservationType === 'passager' && reservationMode === 'moi_meme' && (
                    <>
                      <div className="form-section">
                        <h3>Sélectionnez un niveau</h3>
                        <div className="radio-group">
                          <label className="radio-label">
                            <input
                              type="radio"
                              name="chambreChoice"
                              checked={chambreChoice === 'pour_tous'}
                              onChange={() => {
                                setChambreChoice('pour_tous');
                                setSelectedChambre(null);
                                setSelectedLit(null);
                              }}
                            />
                            <span className="radio-text">Pour tous</span>
                          </label>
                          <label className="radio-label">
                            <input
                              type="radio"
                              name="chambreChoice"
                              checked={chambreChoice === 'chambre'}
                              onChange={() => setChambreChoice('chambre')}
                            />
                            <span className="radio-text">Chambre</span>
                          </label>
                        </div>
                      </div>

                      {chambreChoice === 'chambre' && !selectedChambre && (
                        <div className="form-section">
                          <h3>Sélectionnez une chambre</h3>
                          {loadingChambres ? (
                            <div className="loading-text">Chargement des chambres...</div>
                          ) : (
                            <div className="chambres-grid">
                              {chambres.map(chambre => (
                                <ChambreCard
                                  key={chambre.id}
                                  chambre={chambre}
                                  selected={false}
                                  occupied={false}
                                  onSelect={() => setSelectedChambre(chambre.id)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {selectedChambre && (
                        <div className="form-section">
                          <h3>Sélectionnez un lit</h3>
                          <div className="lits-grid">
                            {getLitsDisponibles(selectedChambre).map(lit => (
                              <LitCard
                                key={lit.id}
                                lit={lit}
                                selected={selectedLit === lit.id}
                                occupied={false}
                                onSelect={() => setSelectedLit(lit.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* CAS 2 & 3: MOI ET LES AUTRES / LES AUTRES */}
                  {reservationType === 'passager' && (reservationMode === 'moi_et_autres' || reservationMode === 'les_autres') && (
                    <div className="form-section">
                      <h3>Informations des passagers ({passagers.length})</h3>
                      {passagers.map((passager, index) => (
                        <PassagerCard
                          key={passager.id}
                          passager={passager}
                          index={index}
                          chambres={chambres}
                          onUpdatePassager={updatePassager}
                          onUpdateChambreChoice={updatePassagerChambreChoice}
                          onSelectChambre={selectChambreForPassager}
                          onSelectLit={selectLitForPassager}
                          getLitsDisponibles={getLitsDisponibles}
                          isLitOccupied={isLitOccupied}
                        />
                      ))}
                    </div>
                  )}

                  {/* VÉHICULES */}
                  {reservationType === 'vehicule' && (
                    <div className="form-section">
                      <h3>Informations des véhicules ({vehicules.length})</h3>
                      {vehicules.map((vehicule, index) => (
                        <VehiculeCard
                          key={vehicule.id}
                          vehicule={vehicule}
                          index={index}
                          onUpdateVehicule={updateVehicule}
                        />
                      ))}
                    </div>
                  )}

                  {/* Prix total */}
                  <div className="form-section price-summary">
                    <h3>Prix total</h3>
                    <div className="total-price-display">{calculateTotalPrice()}€</div>
                  </div>

                  {error && <div className="error-message">{error}</div>}

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmitReservation}
                    className="btn btn-primary btn-block btn-lg"
                    disabled={submitting || !isFormValid()}
                  >
                    {submitting ? 'Traitement...' : 'Confirmer la réservation'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          {!showReservationForm && (
            <div className="detail-sidebar">
              <div className="booking-card sticky">
                <div className="price-section">
                  {voyage.prix_promotionnel ? (
                    <>
                      <div className="price-badge">Promotion</div>
                      <div className="price-original">${voyage.prix_base}</div>
                      <div className="price-current">${voyage.prix_promotionnel}</div>
                      <div className="price-savings">
                        Économisez ${(voyage.prix_base - voyage.prix_promotionnel).toFixed(2)}
                      </div>
                    </>
                  ) : (
                    <div className="price-current">${voyage.prix_base}</div>
                  )}
                  <div className="price-label">par personne</div>
                </div>

                <button
                  onClick={handleReservation}
                  className="btn btn-primary btn-block btn-lg"
                  disabled={placesRestantes === 0}
                >
                  {placesRestantes === 0 ? 'Complet' : 'Réserver maintenant'}
                </button>

                <div className="booking-features">
                  <div className="feature-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span>Confirmation immédiate</span>
                  </div>
                  <div className="feature-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span>Billet électronique</span>
                  </div>
                  <div className="feature-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/>
                    </svg>
                    <span>Annulation flexible</span>
                  </div>
                </div>

                <div className="help-section">
                  <p className="help-text">Besoin d'aide ?</p>
                  <a href="mailto:support@safarifast.com" className="help-link">
                    Contactez-nous
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoyageDetailPage;

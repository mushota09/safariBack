import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import SearchBar from '../components/SearchBar';
import VoyageCard from '../components/VoyageCard';
import './HomePage.css';

const HomePage = () => {
  const [voyages, setVoyages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nearestPort, setNearestPort] = useState(null);
  const [portTooFar, setPortTooFar] = useState(false);

  const fetchVoyages = useCallback(async (filters) => {
    console.log('🚢 fetchVoyages appelé avec filters:', filters);
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.port_depart) params.append('port_depart', filters.port_depart);
      if (filters.port_arrivee) params.append('port_arrivee', filters.port_arrivee);
      if (filters.date_min) params.append('date_min', filters.date_min);

      const url = `http://localhost:8000/traversees?${params.toString()}`;
      console.log('🌐 URL:', url);

      const response = await axios.get(url);
      console.log('📦 Voyages reçus:', response.data.length);
      setVoyages(response.data);
    } catch (error) {
      console.error('❌ Error fetching voyages:', error);
      setError('Erreur lors du chargement des traversées. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, []);

  const findNearestPort = useCallback(async (location) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/geographie/ports/nearest?latitude=${location.latitude}&longitude=${location.longitude}`
      );

      if (response.data) {
        const distance = response.data.distance_km;

        setNearestPort({
          ...response.data,
          distance: distance
        });

        // Vérifier si le port est dans un rayon de 200 km
        if (distance <= 200) {
          setPortTooFar(false);
          // Port dans le rayon, on charge les voyages de ce port
          // Le useEffect se chargera de fetchVoyages
        } else {
          setPortTooFar(true);
          // Port trop loin, charger TOUS les voyages
          fetchVoyages({});
        }
      } else {
        // Pas de port trouvé, charger TOUS les voyages
        setPortTooFar(true);
        fetchVoyages({});
      }
    } catch (error) {
      console.error('Error finding nearest port:', error);
      // Erreur, charger TOUS les voyages
      setPortTooFar(true);
      fetchVoyages({});
    }
  }, [fetchVoyages]);

  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          findNearestPort(location);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Géolocalisation refusée, charger TOUS les voyages
          fetchVoyages({});
        }
      );
    } else {
      // Géolocalisation non supportée, charger TOUS les voyages
      fetchVoyages({});
    }
  }, [findNearestPort, fetchVoyages]);

  useEffect(() => {
    getUserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (nearestPort && !portTooFar) {
      fetchVoyages({ port_depart: nearestPort.id });
    }
  }, [nearestPort, portTooFar, fetchVoyages]);

  const handleSearch = (filters) => {
    fetchVoyages(filters);
  };

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Réservez votre traversée en toute simplicité
          </h1>
          <p className="hero-subtitle">
            Trouvez et réservez les meilleurs billets de bateau pour vos voyages
          </p>
        </div>
      </div>

      <div className="container">
        <SearchBar onSearch={handleSearch} nearestPort={nearestPort} />

        {nearestPort && (
          <div className="port-title">
            <h2>Programme des Bateaux ({nearestPort.nom})</h2>
          </div>
        )}

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : voyages.length === 0 ? (
          <div className="no-results">
            <p>Aucune traversée disponible pour les critères sélectionnés.</p>
          </div>
        ) : (
          <div className="voyages-grid">
            {voyages.map(voyage => (
              <VoyageCard key={voyage.id} voyage={voyage} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;

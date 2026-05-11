import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import './ProgrammePage.css';

const ProgrammePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState(null);
  const [programme, setProgramme] = useState({ departs: [], arrivees: [] });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userLocation, setUserLocation] = useState(null);

  // Mettre à jour l'heure toutes les minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchProgramme = useCallback(async (portId) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8000/geographie/ports/${portId}/programme`);
      setProgramme(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement du programme:', error);
      setError('Erreur lors du chargement du programme');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPorts = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8000/geographie/ports');
      setPorts(response.data);

      if (response.data.length > 0 && !selectedPort) {
        // Sélectionner le premier port par défaut
        setSelectedPort(response.data[0]);
        fetchProgramme(response.data[0].id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des ports:', error);
      setError('Erreur lors du chargement des ports');
      setLoading(false);
    }
  }, [selectedPort, fetchProgramme]);

  const findNearestPort = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8000/geographie/ports/nearest', {
        params: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        }
      });

      if (response.data) {
        setSelectedPort(response.data);
        fetchProgramme(response.data.id);
      }

      // Charger aussi tous les ports pour le filtre
      fetchPorts();
    } catch (error) {
      console.error('Erreur lors de la recherche du port le plus proche:', error);
      fetchPorts();
    }
  }, [userLocation, fetchPorts, fetchProgramme]);

  // Récupérer la géolocalisation de l'utilisateur
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          // Continuer sans géolocalisation
          fetchPorts();
        }
      );
    } else {
      fetchPorts();
    }
  }, [fetchPorts]);

  // Trouver le port le plus proche quand on a la localisation
  useEffect(() => {
    if (userLocation) {
      findNearestPort();
    }
  }, [userLocation, findNearestPort]);

  const handlePortChange = (portId) => {
    const port = ports.find(p => p.id === parseInt(portId));
    setSelectedPort(port);
    fetchProgramme(portId);
  };

  const getStatusColor = (statut) => {
    switch (statut) {
      case 'planifie':
        return 'status-on-time';
      case 'en_cours':
        return 'status-boarding';
      case 'retarde':
        return 'status-delayed';
      case 'annule':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const getStatusLabel = (statut) => {
    switch (statut) {
      case 'planifie':
        return 'À L\'HEURE';
      case 'en_cours':
        return 'EMBARQUEMENT';
      case 'retarde':
        return 'RETARDÉ';
      case 'annule':
        return 'ANNULÉ';
      default:
        return statut;
    }
  };

  if (loading && !selectedPort) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement du programme...</p>
      </div>
    );
  }

  return (
    <div className="programme-page">
      <div className="programme-container">
        {/* Header */}
        <div className="programme-header">
          <div className="header-left">
            <button className="menu-button" onClick={() => navigate('/')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
            <div className="header-title">
              <h1>PROGRAMME</h1>
              <p className="port-name">{selectedPort?.ville?.nom || 'Chargement...'}</p>
            </div>
          </div>
          <div className="header-right">
            <div className="current-date">{format(currentTime, 'dd MMM', { locale: fr }).toUpperCase()}</div>
            <div className="current-time">{format(currentTime, 'HH:mm')}</div>
            <button className="search-button">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Filtre de port */}
        <div className="port-filter">
          <label htmlFor="port-select">Port:</label>
          <select
            id="port-select"
            value={selectedPort?.id || ''}
            onChange={(e) => handlePortChange(e.target.value)}
            className="port-select"
          >
            {ports.map(port => (
              <option key={port.id} value={port.id}>
                {port.nom} - {port.ville.nom}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Section Départs */}
        <div className="section">
          <h2 className="section-title">DÉPARTS</h2>
          <div className="table-header">
            <div className="col-bateau">BATEAU</div>
            <div className="col-destination">DESTINATION</div>
            <div className="col-date">DATE</div>
            <div className="col-heure">HEURE</div>
            <div className="col-status">STATUS</div>
          </div>
          <div className="table-body">
            {programme.departs.length === 0 ? (
              <div className="empty-state">Aucun départ prévu</div>
            ) : (
              programme.departs.map((depart) => (
                <div
                  key={depart.id}
                  className="table-row"
                  onClick={() => navigate(`/voyage/${depart.id}`)}
                >
                  <div className="col-bateau">
                    <span className="bateau-name">{depart.bateau.nom}</span>
                  </div>
                  <div className="col-destination">{depart.destination}</div>
                  <div className="col-date">{format(new Date(depart.date), 'dd MMM', { locale: fr }).toUpperCase()}</div>
                  <div className="col-heure">{depart.heure}</div>
                  <div className="col-status">
                    <span className={`status-badge ${getStatusColor(depart.statut)}`}>
                      {getStatusLabel(depart.statut)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section Arrivées */}
        <div className="section">
          <h2 className="section-title">ARRIVÉES</h2>
          <div className="table-header">
            <div className="col-bateau">BATEAU</div>
            <div className="col-destination">PROVENANCE</div>
            <div className="col-date">DATE</div>
            <div className="col-heure">HEURE</div>
            <div className="col-status">STATUS</div>
          </div>
          <div className="table-body">
            {programme.arrivees.length === 0 ? (
              <div className="empty-state">Aucune arrivée prévue</div>
            ) : (
              programme.arrivees.map((arrivee) => (
                <div key={arrivee.id} className="table-row">
                  <div className="col-bateau">
                    <span className="bateau-name">{arrivee.bateau.nom}</span>
                  </div>
                  <div className="col-destination">{arrivee.provenance}</div>
                  <div className="col-date">{format(new Date(arrivee.date), 'dd MMM', { locale: fr }).toUpperCase()}</div>
                  <div className="col-heure">{arrivee.heure}</div>
                  <div className="col-status">
                    <span className={`status-badge ${getStatusColor(arrivee.statut)}`}>
                      {getStatusLabel(arrivee.statut)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="programme-footer">
          <div className="footer-left">INFOS, QUAIS, HORAIRES & MODIFICATION</div>
          <div className="footer-right">TERMINAL MARITIME</div>
        </div>
      </div>
    </div>
  );
};

export default ProgrammePage;

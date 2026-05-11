import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SearchBar.css';

const SearchBar = ({ onSearch, nearestPort }) => {
  const [ports, setPorts] = useState([]);
  const [filters, setFilters] = useState({
    port_depart: '',
    port_arrivee: '',
    date_min: ''
  });

  useEffect(() => {
    fetchPorts();
  }, []);

  useEffect(() => {
    if (nearestPort) {
      setFilters(prev => ({ ...prev, port_depart: nearestPort.id }));
    }
  }, [nearestPort]);

  // Recherche progressive: déclencher la recherche à chaque changement
  useEffect(() => {
    if (filters.port_depart) {
      onSearch(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.port_depart, filters.port_arrivee, filters.date_min]);

  const fetchPorts = async () => {
    try {
      const response = await axios.get('http://localhost:8000/geographie/ports');
      console.log('Ports loaded:', response.data);
      setPorts(response.data);
    } catch (error) {
      console.error('Error fetching ports:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="search-bar">
      <div className="search-form">
        <div className="search-row">
          <div className="form-group">
            <label className="form-label">Départ</label>
            <select
              className="form-select"
              value={filters.port_depart}
              onChange={(e) => handleFilterChange('port_depart', e.target.value)}
            >
              <option value="">Sélectionner un port</option>
              {ports.map(port => (
                <option key={port.id} value={port.id}>
                  {port.nom} {port.ville ? `(${port.ville.nom})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Arrivée</label>
            <select
              className="form-select"
              value={filters.port_arrivee}
              onChange={(e) => handleFilterChange('port_arrivee', e.target.value)}
            >
              <option value="">Tous les ports</option>
              {ports.map(port => (
                <option key={port.id} value={port.id}>
                  {port.nom} {port.ville ? `(${port.ville.nom})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={filters.date_min}
              onChange={(e) => handleFilterChange('date_min', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;

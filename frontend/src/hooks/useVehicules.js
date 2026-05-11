import { useState, useEffect } from 'react';

// Fonction pour générer un ID unique simple
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useVehicules = (reservationType, nombreVehicules) => {
  const [vehicules, setVehicules] = useState([]);

  useEffect(() => {
    if (reservationType === 'vehicule') {
      initializeVehicules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationType, nombreVehicules]);

  const initializeVehicules = () => {
    const newVehicules = [];

    for (let i = 0; i < nombreVehicules; i++) {
      newVehicules.push(createEmptyVehicule());
    }

    setVehicules(newVehicules);
  };

  const createEmptyVehicule = () => ({
    id: generateId(),
    type_vehicule: 'voiture', // voiture, moto, camion, bus
    immatriculation: '',
    marque: '',
    modele: '',
    couleur: '',
    annee: '',
    proprietaire_nom: '',
    proprietaire_telephone: ''
  });

  const updateVehicule = (vehiculeId, field, value) => {
    setVehicules(prev =>
      prev.map(v =>
        v.id === vehiculeId ? { ...v, [field]: value } : v
      )
    );
  };

  const validateVehicules = () => {
    // Vérifier que tous les véhicules ont une immatriculation
    for (const vehicule of vehicules) {
      if (!vehicule.immatriculation.trim()) {
        return {
          valid: false,
          error: 'Tous les véhicules doivent avoir une immatriculation'
        };
      }

      // Type de véhicule obligatoire
      if (!vehicule.type_vehicule) {
        return {
          valid: false,
          error: 'Tous les véhicules doivent avoir un type'
        };
      }
    }

    // Vérifier les immatriculations uniques
    const immatriculations = vehicules.map(v => v.immatriculation.trim().toUpperCase());
    const uniqueImmatriculations = new Set(immatriculations);
    if (immatriculations.length !== uniqueImmatriculations.size) {
      return {
        valid: false,
        error: 'Les immatriculations doivent être uniques'
      };
    }

    return { valid: true };
  };

  return {
    vehicules,
    updateVehicule,
    validateVehicules
  };
};

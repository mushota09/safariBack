import { useState, useEffect } from 'react';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const usePassagers = (mode, nombrePassagers, user) => {
  const [passagers, setPassagers] = useState([]);

  useEffect(() => {
    initializePassagers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, nombrePassagers]);

  const createEmptyPassager = () => ({
    id: generateId(),
    nom_complet: '',
    email: '',
    telephone: '',
    chambre_choice: 'pour_tous',
    chambre_id: null,
    lit_id: null,
    is_current_user: false
  });

  const initializePassagers = () => {
    if (mode === 'moi_meme') {
      setPassagers([]);
      return;
    }

    const newPassagers = [];

    if (mode === 'moi_et_autres') {
      // Premier passager = utilisateur connecté
      newPassagers.push({
        id: generateId(),
        nom_complet: user?.nom_complet || '',
        email: user?.email || '',
        telephone: user?.numero_telephone || '',
        chambre_choice: 'pour_tous',
        chambre_id: null,
        lit_id: null,
        is_current_user: true
      });

      // Autres passagers
      for (let i = 1; i < nombrePassagers; i++) {
        newPassagers.push(createEmptyPassager());
      }
    } else if (mode === 'les_autres') {
      // Tous les passagers sont vides
      for (let i = 0; i < nombrePassagers; i++) {
        newPassagers.push(createEmptyPassager());
      }
    }

    setPassagers(newPassagers);
  };

  const updatePassager = (passagerId, field, value) => {
    setPassagers(prev => prev.map(p =>
      p.id === passagerId ? { ...p, [field]: value } : p
    ));
  };

  const updatePassagerChambreChoice = (passagerId, choice) => {
    setPassagers(prev => prev.map(p =>
      p.id === passagerId
        ? { ...p, chambre_choice: choice, chambre_id: null, lit_id: null }
        : p
    ));
  };

  const selectChambreForPassager = (passagerId, chambreId) => {
    setPassagers(prev => prev.map(p =>
      p.id === passagerId
        ? { ...p, chambre_id: chambreId, lit_id: null }
        : p
    ));
  };

  const selectLitForPassager = (passagerId, litId) => {
    setPassagers(prev => prev.map(p =>
      p.id === passagerId
        ? { ...p, lit_id: litId }
        : p
    ));
  };

  const isLitOccupied = (litId) => {
    return passagers.some(p => p.lit_id === litId);
  };

  const validatePassagers = () => {
    for (const passager of passagers) {
      if (!passager.nom_complet.trim()) {
        return { valid: false, error: 'Tous les noms complets sont obligatoires' };
      }

      if (passager.chambre_choice === 'chambre' && !passager.lit_id) {
        return { valid: false, error: 'Veuillez sélectionner un lit pour chaque passager ayant choisi une chambre' };
      }
    }

    // Vérifier conflits de lits
    const litsUtilises = passagers.filter(p => p.lit_id).map(p => p.lit_id);
    const litsUniques = new Set(litsUtilises);
    if (litsUtilises.length !== litsUniques.size) {
      return { valid: false, error: 'Deux passagers ne peuvent pas avoir le même lit' };
    }

    return { valid: true };
  };

  return {
    passagers,
    updatePassager,
    updatePassagerChambreChoice,
    selectChambreForPassager,
    selectLitForPassager,
    isLitOccupied,
    validatePassagers
  };
};

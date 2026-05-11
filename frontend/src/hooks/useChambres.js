import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useChambres = (voyageId) => {
  const [chambres, setChambres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchChambres = useCallback(async () => {
    if (!voyageId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `http://localhost:8000/reservations/voyage/${voyageId}/chambres-disponibles`
      );
      setChambres(response.data.chambres || []);
      console.log('🏠 Chambres disponibles:', response.data.chambres);
    } catch (error) {
      console.error('Error fetching chambres:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [voyageId]);

  useEffect(() => {
    fetchChambres();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voyageId]);

  const getChambreById = (chambreId) => {
    return chambres.find(c => c.id === chambreId);
  };

  const getLitsDisponibles = (chambreId) => {
    const chambre = getChambreById(chambreId);
    return chambre?.lits_disponibles || [];
  };

  return {
    chambres,
    loading,
    error,
    getChambreById,
    getLitsDisponibles,
    refetch: fetchChambres
  };
};

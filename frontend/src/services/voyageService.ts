/**
 * Service Voyages / Traversées / Géographie.
 */
import { api } from './api';

export interface Port {
  id: number;
  nom: string;
  code_international?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ville?: {
    id: number;
    nom: string;
    pays?: { id: number; nom: string; code: string };
  };
}

export interface TraverseeResult {
  voyage_id: number;
  bateau: { id: number; nom: string; photo_principale?: string | null };
  compagnie: { id: number; nom: string };
  port_depart: { id: number; nom: string };
  port_arrivee: { id: number; nom: string };
  date_depart_programme: string;
  date_arrivee_programmee: string;
  prix_base: number;
  prix_promotionnel?: number | null;
  statut: string;
  places_disponibles_passagers: number;
  places_disponibles_vehicules: number;
}

export interface Voyage {
  id: number;
  bateau_id: number;
  compagnie_id: number;
  port_depart_id: number;
  port_arrivee_id: number;
  date_depart_programme: string;
  date_arrivee_programmee: string;
  prix_base: number;
  prix_promotionnel?: number | null;
  statut: string;
  places_vendues_passagers: number;
  places_vendues_vehicules: number;
  places_disponibles_passagers: number;
  places_disponibles_vehicules: number;
  bateau?: { id: number; nom: string; photo_principale?: string | null };
  port_depart?: Port;
  port_arrivee?: Port;
}

export const voyageService = {
  ports: () => api.get<Port[]>('/geographie/ports', { auth: false }),
  nearestPort: (latitude: number, longitude: number) =>
    api.get<Port & { distance_km: number }>(
      '/geographie/ports/nearest',
      { auth: false, query: { latitude, longitude } },
    ),
  villes: () => api.get<any[]>('/geographie/villes', { auth: false }),
  searchTraversees: (params: {
    port_depart?: number;
    port_arrivee?: number;
    date_min?: string;
    date_max?: string;
    passagers?: number;
    vehicule?: boolean;
  }) => api.get<TraverseeResult[]>('/traversees', { auth: false, query: params }),
};

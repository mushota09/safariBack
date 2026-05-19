/**
 * Service de gestion des bateaux : flotte, structure (niveaux/chambres/lits),
 * et galerie d'images (photo principale + album).
 */
import { api } from './api';

export interface Bateau {
  id: number;
  compagnie_id: number;
  type_bateau_id?: number | null;
  nom: string;
  immatriculation: string;
  capacite_passagers: number;
  capacite_vehicules?: number | null;
  vitesse_croisiere?: number | null;
  clim: boolean;
  wifi: boolean;
  restaurant: boolean;
  boutique: boolean;
  cabines: boolean;
  en_maintenance: boolean;
  date_derniere_revision?: string | null;
  date_prochaine_revision?: string | null;
  photo_principale?: string | null;
  plan_bateau?: string | null;
  longueur?: number | null;
  tirant_eau?: number | null;
  puissance_moteur?: number | null;
}

export interface BateauCreate {
  compagnie_id: number;
  nom: string;
  immatriculation: string;
  capacite_passagers: number;
  capacite_vehicules?: number;
  en_maintenance?: boolean;
  photo_principale?: string | null;
  clim?: boolean;
  wifi?: boolean;
  restaurant?: boolean;
  boutique?: boolean;
  cabines?: boolean;
}

export interface ImageBateau {
  id: number;
  bateau_id: number;
  url: string;
  legende?: string | null;
  description?: string | null;
  est_principale: boolean;
  ordre: number;
}

export interface BateauGalerie {
  bateau_id: number;
  bateau_nom: string;
  photo_principale?: string | null;
  images: ImageBateau[];
}

export interface Niveau {
  id: number;
  bateau_id: number;
  numero_niveau: number;
  nom: string;
  multiplicateur_prix: number;
  description?: string | null;
}

export interface Chambre {
  id: number;
  niveau_id: number;
  numero_chambre: string;
  prix_base: number;
  type_chambre?: string | null;
  fenetre: boolean;
  salle_de_bain: boolean;
}

export interface Lit {
  id: number;
  chambre_id: number;
  numero_lit: string;
  disponible: boolean;
  prix_supplementaire: number;
  type_lit: 'simple' | 'double' | 'superpose';
  taille?: string | null;
}

export const bateauService = {
  // --- CRUD Bateau ---
  list: () => api.get<Bateau[]>('/bateaux', { query: { no_pagination: true } }),
  get: (id: number) => api.get<Bateau>(`/bateaux/${id}`),
  create: (data: BateauCreate) => api.post<Bateau>('/bateaux', data),
  update: (id: number, data: Partial<BateauCreate>) => api.put<Bateau>(`/bateaux/${id}`, data),
  remove: (id: number) => api.delete<{ message: string }>(`/bateaux/${id}`),

  // --- Galerie d'images ---
  galerie: (bateauId: number) => api.get<BateauGalerie>(`/bateaux/${bateauId}/images`),
  addImage: (
    bateauId: number,
    img: { url: string; legende?: string; description?: string; est_principale?: boolean; ordre?: number },
  ) => api.post<ImageBateau>(`/bateaux/${bateauId}/images`, img),
  updateImage: (
    bateauId: number,
    imageId: number,
    img: Partial<{ url: string; legende: string; description: string; est_principale: boolean; ordre: number }>,
  ) => api.put<ImageBateau>(`/bateaux/${bateauId}/images/${imageId}`, img),
  removeImage: (bateauId: number, imageId: number) =>
    api.delete<void>(`/bateaux/${bateauId}/images/${imageId}`),

  // --- Structure (niveaux/chambres/lits) ---
  structure: (bateauId: number) => api.get<{
    bateau_id: number;
    bateau_nom: string;
    niveaux: (Niveau & { chambres: (Chambre & { lits: Lit[] })[] })[];
  }>(`/bateaux/${bateauId}/structure`),

  saveStructure: (
    bateauId: number,
    niveaux: {
      id?: number;
      numero_niveau: number;
      nom: string;
      multiplicateur_prix: number;
      description?: string;
      chambres: {
        id?: number;
        numero_chambre: string;
        prix_base: number;
        type_chambre?: string;
        fenetre?: boolean;
        salle_de_bain?: boolean;
        lits: {
          id?: number;
          numero_lit: string;
          type_lit: 'simple' | 'double' | 'superpose';
          taille?: string;
          prix_supplementaire?: number;
          disponible?: boolean;
        }[];
      }[];
    }[],
  ) => api.put<{ bateau_id: number; niveaux: any[] }>(`/bateaux/${bateauId}/structure`, { niveaux }),
};

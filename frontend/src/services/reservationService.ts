/**
 * Service de réservation — alignement complet avec le backend FastAPI.
 *
 * Modes supportés (cf. `ReservationMode` côté backend) :
 *  - `moi_meme`      : l'utilisateur réserve uniquement pour lui
 *  - `moi_et_autres` : l'utilisateur + d'autres personnes
 *  - `les_autres`    : l'utilisateur réserve uniquement pour d'autres personnes
 *  - `vehicule`      : transport d'un véhicule (avec ou sans passagers)
 */
import { api } from './api';

export type TypeReservation = 'passager' | 'vehicule' | 'mixte';
export type ReservationMode = 'moi_meme' | 'moi_et_autres' | 'les_autres' | 'vehicule';
export type StatutReservation = 'en_attente' | 'confirme' | 'annule' | 'termine' | 'no_show';
export type TypeVehicule = 'voiture' | 'moto' | 'camion' | 'bus';

export interface PassagerInfo {
  nom_complet: string;
  email?: string;
  telephone?: string;
  chambre_id?: number | null;
  lit_id?: number | null;
}

export interface VehiculeInfo {
  type_vehicule: TypeVehicule;
  immatriculation: string;
  marque?: string;
  modele?: string;
  couleur?: string;
  annee?: string;
  proprietaire_nom?: string;
  proprietaire_telephone?: string;
}

export interface ReservationCreateMultiplePayload {
  voyage_id: number;
  type_reservation: TypeReservation;
  reservation_mode: ReservationMode;
  passagers?: PassagerInfo[];
  vehicules?: VehiculeInfo[];
  vehicule_inclus?: boolean;
  type_vehicule?: TypeVehicule;
  immatriculation_vehicule?: string;
}

export interface ReservationPassagerResponse {
  id: number;
  nom_complet: string;
  email?: string | null;
  telephone?: string | null;
  chambre_id?: number | null;
  lit_id?: number | null;
  is_principal: boolean;
  date_enregistrement: string;
}

export interface ReservationVehiculeResponse {
  id: number;
  type_vehicule: TypeVehicule;
  immatriculation: string;
  marque?: string | null;
  modele?: string | null;
  couleur?: string | null;
  annee?: string | null;
  proprietaire_nom?: string | null;
  proprietaire_telephone?: string | null;
  date_enregistrement: string;
}

export interface Reservation {
  id: number;
  reference_reservation: string;
  utilisateur_id: number;
  voyage_id: number;
  type_reservation: TypeReservation;
  reservation_mode?: ReservationMode | null;
  niveau_id?: number | null;
  chambre_id?: number | null;
  lit_id?: number | null;
  montant_total: number;
  date_reservation: string;
  date_expiration_paiement?: string | null;
  nombre_passagers: number;
  vehicule_inclus: boolean;
  type_vehicule?: TypeVehicule | null;
  immatriculation_vehicule?: string | null;
  statut_reservation: StatutReservation;
  frais_annulation?: number | null;
  date_annulation?: string | null;
  raison_annulation?: string | null;
  passagers_details: ReservationPassagerResponse[];
  vehicules_details: ReservationVehiculeResponse[];
}

export interface BateauStructure {
  bateau_id: number;
  bateau_nom: string;
  voyage_id: number;
  prix_base: number;
  prix_promotionnel?: number | null;
  has_niveaux: boolean;
  niveaux: {
    id: number;
    numero_niveau: number;
    nom: string;
    multiplicateur_prix: number;
    description?: string | null;
    chambres: {
      id: number;
      numero_chambre: string;
      prix_base: number;
      type_chambre?: string | null;
      fenetre: boolean;
      salle_de_bain: boolean;
      lits: {
        id: number;
        numero_lit: string;
        disponible: boolean;
        prix_supplementaire: number;
        type_lit: 'simple' | 'double' | 'superpose';
        taille?: string | null;
      }[];
    }[];
  }[];
}

export const reservationService = {
  list: () => api.get<Reservation[]>('/reservations'),

  get: (id: number) => api.get<Reservation>(`/reservations/${id}`),

  /** Création standard (1 passager principal). */
  createSimple: (payload: {
    voyage_id: number;
    type_reservation: TypeReservation;
    nombre_passagers: number;
    vehicule_inclus?: boolean;
    type_vehicule?: TypeVehicule;
    immatriculation_vehicule?: string;
    niveau_id?: number;
    chambre_id?: number;
    lit_id?: number;
  }) => api.post<Reservation>('/reservations', payload),

  /** Création multi-passagers (moi_meme / moi_et_autres / les_autres). */
  createMultiple: (payload: ReservationCreateMultiplePayload) =>
    api.post<Reservation>('/reservations/multiple', payload),

  cancel: (id: number, raison?: string) =>
    api.post<{ message: string; frais_annulation: number; montant_rembourse: number }>(
      `/reservations/${id}/cancel`,
      { raison },
    ),

  cancelPassager: (reservationId: number, passagerId: number, raison?: string) =>
    api.post<{ message: string; passager_id: number; montant_total: number }>(
      `/reservations/${reservationId}/passagers/${passagerId}/cancel`,
      { raison },
    ),

  /** Récupère la structure complète du bateau (niveaux/chambres/lits) pour un voyage. */
  voyageStructure: (voyageId: number) =>
    api.get<BateauStructure>(`/reservations/voyage/${voyageId}/structure`),
};

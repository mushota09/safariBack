/**
 * Service Embarquement (agent) — scan QR global ou individuel.
 *
 * - QR individuel : marque le passager comme embarqué directement.
 * - QR global : retourne la réservation + la liste des passagers,
 *   l'agent peut alors cocher 1 ou plusieurs personnes à faire embarquer.
 */
import { api } from './api';

export type ScanKind = 'global' | 'passager' | 'vehicule';

export interface ScanResolved {
  kind: ScanKind;
  numero_ticket: string;
  reference_reservation: string;
  voyage?: { id: number; libelle?: string } | null;
  bateau?: { id: number; nom: string } | null;
  // QR individuel passager
  nom_complet?: string;
  // QR véhicule
  immatriculation?: string;
  // Pour global : la liste des passagers/véhicules pour permettre la sélection
  passagers?: {
    id: number;
    nom_complet: string;
    email?: string | null;
    chambre_id?: number | null;
    statut: string;
    embarque: boolean;
    numero_ticket?: string | null;
  }[];
  vehicules?: {
    id: number;
    immatriculation: string;
    marque?: string | null;
    modele?: string | null;
    embarque: boolean;
    annule: boolean;
    numero_ticket?: string | null;
  }[];
  statut_reservation?: string;
  embarque?: boolean;
  date_embarquement?: string | null;
}

export interface BoardingResult {
  status: 'success' | 'already_boarded' | 'partial';
  kind: ScanKind;
  message: string;
  numero_ticket?: string;
  reference_reservation?: string;
  date_embarquement?: string;
  passagers_embarques?: { id: number; nom_complet: string }[];
}

export const embarquementService = {
  /**
   * Pré-vérification du QR : ne marque PAS l'embarquement.
   * Sert à afficher à l'agent les passagers à cocher (QR global).
   */
  verify: (code: string) =>
    api.post<ScanResolved>('/embarquement/verify', { code }, { adminApiKey: true }),

  /**
   * Embarque l'intégralité (cas passager/véhicule individuel ou global "tout cocher").
   */
  scan: (code: string) =>
    api.post<BoardingResult>('/embarquement/scan', { code }, { adminApiKey: true }),

  /**
   * Embarquement sélectif depuis un QR global : on coche une partie des passagers.
   */
  scanSelective: (code: string, passager_ids: number[], vehicule_ids: number[] = []) =>
    api.post<BoardingResult>(
      '/embarquement/scan/selective',
      { code, passager_ids, vehicule_ids },
      { adminApiKey: true },
    ),
};

export interface Port {
  id: string;
  name: string;
  ville: string;
  lat: number;
  lng: number;
}

export interface Voyage {
  id: string;
  bateau: string;
  depart: string;
  arrivee: string;
  date: string;
  prix_base: number;
  places_totales: number;
  places_vendues: number;
  statut: "programme" | "confirme" | "annule" | "retarde" | "complet" | "termine";
  photo: string;
}

export interface User {
  id: string;
  email: string;
  nom_complet: string;
  photo_profil?: string;
}

export interface Reservation {
  id: string;
  voyageId: string;
  type: "passager" | "vehicule" | "mixte";
  montant_total: number;
  statut: "en_attente" | "confirme" | "annule";
  date: string;
}

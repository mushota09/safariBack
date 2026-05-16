import { Reservation } from '../types';

const STORAGE_KEY = 'safari_reservations';

export interface SavedReservation {
    id: string;
    voyageId: string;
    type: 'passager' | 'vehicule' | 'mixte';
    forWhom: 'moi' | 'moi_autres' | 'autres' | 'personne';
    passengers: {
        name: string;
        email: string;
        phone: string;
        roomPref: 'tous' | 'chambre';
        selectedRoom: string | null;
        selectedBed: string | null;
    }[];
    vessel: string;
    vehicles?: {
        plate: string;
        model: string;
        color: string;
        platePhoto?: string | null;
        vehiclePhoto?: string | null;
    }[];
    recipient?: {
        name: string;
        phone: string;
        photo?: string | null;
    } | null;
    date: string;
    totalAmount: number;
    status: 'PAYÉ' | 'EN ATTENTE DE PAIEMENT' | 'ANNULÉ';
    paymentMethod: 'carte' | 'mobile';
    createdAt: string;
}

export const reservationService = {
    saveReservation: (reservation: Omit<SavedReservation, 'createdAt'>) => {
        const existing = reservationService.getReservations();
        const newReservation = {
            ...reservation,
            createdAt: new Date().toISOString()
        };
        const updated = [newReservation, ...existing];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return newReservation;
    },

    getReservations: (): SavedReservation[] => {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    getReservationById: (id: string): SavedReservation | undefined => {
        const reservations = reservationService.getReservations();
        return reservations.find(r => r.id === id);
    },

    deleteReservation: (id: string) => {
        const existing = reservationService.getReservations();
        const updated = existing.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    
    cancelReservation: (id: string) => {
        const existing = reservationService.getReservations();
        const updated = existing.map(r => r.id === id ? { ...r, status: 'ANNULÉ' as const } : r);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
};

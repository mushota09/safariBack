const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Port {
    id: number;
    nom: string;
    code_international: string;
    latitude?: number;
    longitude?: number;
    ville?: {
        id: number;
        nom: string;
        pays: {
            id: number;
            nom: string;
            code: string;
        };
    };
}

export interface NearestPort extends Port {
    distance_km: number;
}

export interface BateauInfo {
    id: number;
    nom: string;
    capacite_passagers: number;
    capacite_vehicules?: number;
    immatriculation?: string;
    vitesse_croisiere?: number;
    longueur?: number;
    tirant_eau?: number;
    puissance_moteur?: number;
    clim?: boolean;
    wifi?: boolean;
    restaurant?: boolean;
    boutique?: boolean;
    cabines?: boolean;
    en_maintenance?: boolean;
    date_derniere_revision?: string;
    date_prochaine_revision?: string;
    photo_principale?: string;
}

export interface CompagnieInfo {
    id: number;
    nom: string;
    telephone?: string;
    email?: string;
    site_web?: string;
    logo?: string;
    politique_annulation?: string;
}

export interface Traversee {
    id: number;
    port_depart: Port;
    port_arrivee: Port;
    bateau: BateauInfo;
    compagnie: CompagnieInfo;
    date_depart_programme: string;
    date_arrivee_programmee: string;
    prix_base: number;
    prix_promotionnel?: number;
    statut: string;
    places_disponibles_passagers: number;
    places_disponibles_vehicules: number;
    places_totales_passagers?: number;
    places_totales_vehicules?: number;
    places_vendues_passagers?: number;
    places_vendues_vehicules?: number;
    capitaine_nom?: string;
    equipage_nombre?: number;
    remarques?: string;
    retard_motif?: string;
}

export interface SearchParams {
    port_depart?: number;
    port_arrivee?: number;
    date_min?: string;
    date_max?: string;
    passagers?: number;
    vehicule?: boolean;
    page?: number;
    page_size?: number;
}

export const voyageService = {
    /**
     * Get all ports
     */
    getPorts: async (): Promise<Port[]> => {
        const response = await fetch(`${API_URL}/geographie/ports`);

        if (!response.ok) {
            throw new Error('Failed to fetch ports');
        }

        return response.json();
    },

    /**
     * Get nearest port based on user's location
     */
    getNearestPort: async (latitude: number, longitude: number): Promise<NearestPort> => {
        const response = await fetch(
            `${API_URL}/geographie/ports/nearest?latitude=${latitude}&longitude=${longitude}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch nearest port');
        }

        return response.json();
    },

    /**
     * Search for traversees/voyages
     */
    searchTraversees: async (params: SearchParams): Promise<Traversee[]> => {
        const queryParams = new URLSearchParams();

        if (params.port_depart) queryParams.append('port_depart', params.port_depart.toString());
        if (params.port_arrivee) queryParams.append('port_arrivee', params.port_arrivee.toString());
        if (params.date_min) queryParams.append('date_min', params.date_min);
        if (params.date_max) queryParams.append('date_max', params.date_max);
        if (params.passagers) queryParams.append('passagers', params.passagers.toString());
        if (params.vehicule !== undefined) queryParams.append('vehicule', params.vehicule.toString());
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.page_size) queryParams.append('page_size', params.page_size.toString());

        const response = await fetch(`${API_URL}/traversees?${queryParams.toString()}`);

        if (!response.ok) {
            throw new Error('Failed to search traversees');
        }

        return response.json();
    },

    /**
     * Get a single traversee by ID
     */
    getTraverseeById: async (id: number): Promise<Traversee> => {
        const response = await fetch(`${API_URL}/traversees/${id}`);

        if (!response.ok) {
            throw new Error('Failed to fetch traversee');
        }

        return response.json();
    },

    /**
     * Stream traversees (for real-time updates)
     */
    streamTraversees: async (
        params: SearchParams,
        onData: (traversee: Traversee) => void,
        onError?: (error: Error) => void,
        onComplete?: () => void
    ): Promise<void> => {
        const queryParams = new URLSearchParams();

        if (params.port_depart) queryParams.append('port_depart', params.port_depart.toString());
        if (params.port_arrivee) queryParams.append('port_arrivee', params.port_arrivee.toString());
        if (params.date_min) queryParams.append('date_min', params.date_min);
        if (params.date_max) queryParams.append('date_max', params.date_max);
        if (params.passagers) queryParams.append('passagers', params.passagers.toString());
        if (params.vehicule !== undefined) queryParams.append('vehicule', params.vehicule.toString());

        try {
            const response = await fetch(`${API_URL}/traversees/stream?${queryParams.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to stream traversees');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No reader available');
            }

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    onComplete?.();
                    break;
                }

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const traversee = JSON.parse(line);
                        onData(traversee);
                    } catch (e) {
                        console.error('Failed to parse traversee:', e);
                    }
                }
            }
        } catch (error) {
            onError?.(error as Error);
        }
    },

    /**
     * Get port programme (departures and arrivals)
     */
    getPortProgramme: async (
        portId: number,
        dateDebut?: string,
        dateFin?: string
    ): Promise<any[]> => {
        const queryParams = new URLSearchParams();
        if (dateDebut) queryParams.append('date_debut', dateDebut);
        if (dateFin) queryParams.append('date_fin', dateFin);

        const response = await fetch(
            `${API_URL}/geographie/ports/${portId}/programme?${queryParams.toString()}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch port programme');
        }

        // This is a streaming endpoint, so we need to read the stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const results: any[] = [];

        if (!reader) {
            throw new Error('No reader available');
        }

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const item = JSON.parse(line);
                    results.push(item);
                } catch (e) {
                    console.error('Failed to parse programme item:', e);
                }
            }
        }

        return results;
    },
};

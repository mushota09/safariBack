"""Router pour le module d'embarquement."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.embarquement.service import embarquement_service
from app.modules.embarquement.schemas import (
    ScanTicketResponse,
    MarquerEmbarquementRequest,
    MarquerEmbarquementResponse,
    AnnulerEmbarquementRequest,
    MarquerAbsentRequest,
    StatistiquesVoyageResponse,
    RechercheReservationResponse,
)

router = APIRouter(prefix="/embarquement", tags=["Embarquement"])


@router.get("/scan", response_model=ScanTicketResponse)
async def scanner_ticket_global(
    code: str = Query(
        ...,
        description="QR code signé (SAFARI:...) ou numéro de ticket direct"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Scanne un QR code de ticket global et retourne tous les détails.

    Permet de voir:
    - Les informations du ticket
    - La réservation associée
    - Tous les passagers avec leur statut d'embarquement
    - Tous les véhicules avec leur statut d'embarquement
    - Tous les colis avec leur statut d'embarquement

    **Usage Frontend:**
    1. Scanner le QR code global du ticket
    2. Afficher la liste des passagers/véhicules/colis
    3. Permettre la sélection individuelle ou "tout sélectionner"
    4. Appeler l'endpoint POST /embarquement/marquer pour valider
    """
    return await embarquement_service.scan_ticket_global(db, code)


@router.post(
    "/marquer/{numero_ticket}",
    response_model=MarquerEmbarquementResponse
)
async def marquer_embarquement(
    numero_ticket: str,
    selection: MarquerEmbarquementRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Marque l'embarquement des éléments sélectionnés.

    **Deux modes d'utilisation:**

    1. **Tout embarquer** (recommandé si toute la réservation embarque ensemble):
       ```json
       {
         "tout": true
       }
       ```

    2. **Sélection individuelle** (si embarquement progressif):
       ```json
       {
         "tout": false,
         "passagers_ids": [1, 2, 3],
         "vehicules_ids": [1],
         "colis_ids": []
       }
       ```

    **Comportement:**
    - Marque uniquement les éléments non encore embarqués
    - Si tous les éléments sont embarqués, le ticket global est marqué comme embarqué
    - Retourne les compteurs d'embarquement

    **Note:** Un même élément peut être marqué plusieurs fois (idempotent)
    """
    selection_dict = selection.model_dump()
    return await embarquement_service.marquer_embarquement(
        db,
        numero_ticket,
        selection_dict,
        agent_id=selection.agent_id,
        agent_nom=selection.agent_nom
    )


@router.post("/annuler/{numero_ticket}")
async def annuler_embarquement(
    numero_ticket: str,
    request: AnnulerEmbarquementRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Annule l'embarquement d'éléments déjà embarqués.

    **Cas d'usage:**
    - Passager ne monte finalement pas à bord
    - Erreur d'embarquement
    - Problème détecté après validation

    **Permissions:** Superviseur uniquement (à implémenter côté auth)

    **Requiert:**
    - Raison obligatoire (min 10 caractères)
    - ID agent et nom pour traçabilité
    - Liste des IDs à débarquer

    **Effet:**
    - Remet embarque = False
    - Efface date_embarquement et agent
    - Démarque le ticket global
    - Crée un log d'audit
    """
    return await embarquement_service.annuler_embarquement(
        db,
        numero_ticket,
        agent_id=request.agent_id,
        agent_nom=request.agent_nom,
        raison=request.raison,
        passagers_ids=request.passagers_ids,
        vehicules_ids=request.vehicules_ids,
        colis_ids=request.colis_ids,
    )


@router.post("/marquer-absents/{numero_ticket}")
async def marquer_absents(
    numero_ticket: str,
    request: MarquerAbsentRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Marque des éléments comme absents (no-show).

    **Différence avec "non embarqué":**
    - **Non embarqué**: En attente d'embarquement
    - **Absent**: Confirmé qu'il ne viendra pas

    **Utilité:**
    - Libérer mentalement les places
    - Statistiques précises
    - Gestion des remboursements

    **Note:** Uniquement pour éléments non encore embarqués
    """
    return await embarquement_service.marquer_absents(
        db,
        numero_ticket,
        agent_id=request.agent_id,
        agent_nom=request.agent_nom,
        passagers_ids=request.passagers_ids,
        colis_ids=request.colis_ids,
        raison=request.raison,
    )


@router.post("/verifier-identite")
async def verifier_identite(
    passager_id: int,
    agent_id: int,
    agent_nom: str,
    document_type: str,
    document_numero: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Vérifie et enregistre l'identité d'un passager.

    **Types de documents:**
    - passeport
    - cni (Carte Nationale d'Identité)
    - permis_conduire
    - attestation_identite
    - autre

    **Usage:**
    - Au moment de l'embarquement ou avant
    - Peut être requis pour passagers internationaux
    - Log dans EmbarquementLog

    **Champs mis à jour:**
    - identite_verifiee = True
    - document_verifie_type
    - document_verifie_numero
    """
    return await embarquement_service.verifier_identite(
        db,
        passager_id=passager_id,
        agent_id=agent_id,
        agent_nom=agent_nom,
        document_type=document_type,
        document_numero=document_numero,
    )


@router.get(
    "/statistiques/{voyage_id}",
    response_model=StatistiquesVoyageResponse
)
async def get_statistiques_voyage(
    voyage_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Retourne les statistiques d'embarquement en temps réel pour un voyage.

    **Informations fournies:**
    - Total réservations et taux embarquement
    - Passagers: attendus, embarqués, absents, en attente, taux
    - Véhicules: attendus, embarqués, en attente, taux
    - Colis: attendus, embarqués, absents, en attente
    - Dernière activité d'embarquement
    - Date de départ programmée

    **Usage:**
    - Dashboard superviseur
    - Monitoring temps réel
    - Détection retards probables
    """
    return await embarquement_service.get_statistiques_voyage(db, voyage_id)


@router.get("/voyage/{voyage_id}/reservations")
async def lister_reservations_voyage(
    voyage_id: int,
    filtre: str = Query(
        None,
        description="Filtre: tout, embarque, non_embarque, partiel"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Liste toutes les réservations d'un voyage avec statut d'embarquement.

    **Filtres disponibles:**
    - `tout`: Toutes les réservations (défaut)
    - `embarque`: Seulement complètement embarquées
    - `non_embarque`: Aucun élément embarqué
    - `partiel`: Embarquement partiel en cours

    **Pour chaque réservation:**
    - Référence et numéro de ticket
    - Compteurs (total et embarqués) par type
    - Flags: tout_embarque, partiellement_embarque, aucun_embarque
    - Info utilisateur
    """
    return await embarquement_service.lister_reservations_voyage(
        db, voyage_id, filtre
    )


@router.get("/recherche", response_model=RechercheReservationResponse)
async def rechercher_reservation(
    voyage_id: int = Query(..., description="ID du voyage (requis)"),
    nom: str = Query(None, description="Recherche dans noms de passagers"),
    reference: str = Query(None, description="Référence de réservation"),
    numero_ticket: str = Query(None, description="Numéro de ticket"),
    db: AsyncSession = Depends(get_db),
):
    """
    Recherche des réservations par différents critères.

    **Critères de recherche:**
    - `nom`: Recherche partielle dans les noms de passagers
    - `reference`: Recherche partielle dans les références de réservation
    - `numero_ticket`: Recherche partielle dans les numéros de tickets

    **Exemples:**
    ```
    GET /embarquement/recherche?voyage_id=10&nom=Dupont
    GET /embarquement/recherche?voyage_id=10&reference=RES-ABC
    GET /embarquement/recherche?voyage_id=10&numero_ticket=TKT-123
    ```

    **Note:** Recherche insensible à la casse (case-insensitive)
    """
    return await embarquement_service.rechercher_reservation(
        db,
        voyage_id=voyage_id,
        nom=nom,
        reference=reference,
        numero_ticket=numero_ticket,
    )

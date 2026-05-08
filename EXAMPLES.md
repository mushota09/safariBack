# 📖 Exemples d'Utilisation de l'API

## Table des Matières

1. [Authentification](#authentification)
2. [Recherche de Traversées](#recherche-de-traversées)
3. [Réservation](#réservation)
4. [Paiement](#paiement)
5. [WebSocket](#websocket)
6. [Administration](#administration)
7. [Expand & Pagination](#expand--pagination)

---

## Authentification

### Inscription

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "marie",
    "email": "marie@example.com",
    "numero_telephone": "+33612345678",
    "password": "SecurePass123!",
    "nom_complet": "Marie Dupont",
    "date_naissance": "1990-05-15",
    "langue_preferee": "fr"
  }'
```

**Réponse:**
```json
{
  "id": 1,
  "username": "marie",
  "email": "marie@example.com",
  "numero_telephone": "+33612345678",
  "nom_complet": "Marie Dupont",
  "date_naissance": "1990-05-15",
  "langue_preferee": "fr",
  "is_active": true,
  "is_superuser": false,
  "notification_email": true,
  "notification_sms": false
}
```

### Connexion

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "marie",
    "password": "SecurePass123!"
  }'
```

**Réponse:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Profil Utilisateur

```bash
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer <access_token>"
```

---

## Recherche de Traversées

### Recherche Simple

```bash
curl "http://localhost:8000/traversees"
```

### Recherche avec Filtres

```bash
curl "http://localhost:8000/traversees?\
port_depart=1&\
port_arrivee=2&\
date_min=2024-06-01T00:00:00&\
date_max=2024-06-30T23:59:59&\
passagers=2&\
vehicule=true&\
page=1&\
page_size=10"
```

**Réponse:**
```json
[
  {
    "id": 1,
    "port_depart": {
      "id": 1,
      "nom": "Port de Marseille",
      "code_international": "FRMRS"
    },
    "port_arrivee": {
      "id": 2,
      "nom": "Port de Barcelone",
      "code_international": "ESBCN"
    },
    "bateau": {
      "id": 1,
      "nom": "Méditerranée I",
      "capacite_passagers": 500,
      "capacite_vehicules": 100
    },
    "compagnie": {
      "id": 1,
      "nom": "Mediterranean Ferries"
    },
    "date_depart_programme": "2024-06-15T08:00:00Z",
    "date_arrivee_programmee": "2024-06-15T16:00:00Z",
    "prix_base": 80.0,
    "prix_promotionnel": null,
    "statut": "confirme",
    "places_disponibles_passagers": 450,
    "places_disponibles_vehicules": 85
  }
]
```

### Streaming des Résultats

```bash
curl "http://localhost:8000/traversees/stream?\
port_depart=1&\
port_arrivee=2&\
passagers=2"
```

**Réponse (NDJSON):**
```json
{"id":1,"port_depart":{"id":1,"nom":"Port de Marseille"},...}
{"id":2,"port_depart":{"id":1,"nom":"Port de Marseille"},...}
{"id":3,"port_depart":{"id":1,"nom":"Port de Marseille"},...}
```

---

## Réservation

### Créer une Réservation (Passagers seulement)

```bash
curl -X POST http://localhost:8000/reservations \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "voyage_id": 1,
    "type_reservation": "passager",
    "nombre_passagers": 2,
    "vehicule_inclus": false
  }'
```

**Réponse:**
```json
{
  "id": 1,
  "reference_reservation": "RES-A1B2C3D4E5F6",
  "utilisateur_id": 1,
  "voyage_id": 1,
  "type_reservation": "passager",
  "niveau_id": null,
  "chambre_id": null,
  "lit_id": null,
  "montant_total": 160.0,
  "date_reservation": "2024-06-01T10:30:00Z",
  "date_expiration_paiement": "2024-06-01T11:00:00Z",
  "nombre_passagers": 2,
  "vehicule_inclus": false,
  "type_vehicule": null,
  "immatriculation_vehicule": null,
  "statut_reservation": "en_attente",
  "frais_annulation": null,
  "date_annulation": null,
  "raison_annulation": null
}
```

### Créer une Réservation (Avec Véhicule)

```bash
curl -X POST http://localhost:8000/reservations \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "voyage_id": 1,
    "type_reservation": "mixte",
    "nombre_passagers": 4,
    "vehicule_inclus": true,
    "type_vehicule": "voiture",
    "immatriculation_vehicule": "AB-123-CD"
  }'
```

### Mes Réservations

```bash
curl http://localhost:8000/reservations \
  -H "Authorization: Bearer <access_token>"
```

### Détails d'une Réservation

```bash
curl http://localhost:8000/reservations/1 \
  -H "Authorization: Bearer <access_token>"
```

### Annuler une Réservation

```bash
curl -X POST http://localhost:8000/reservations/1/cancel \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "raison": "Changement de plans"
  }'
```

**Réponse:**
```json
{
  "message": "Reservation cancelled successfully",
  "frais_annulation": 20.0,
  "montant_rembourse": 140.0
}
```

---

## Paiement

### Payer par Carte Bancaire

```bash
curl -X POST http://localhost:8000/paiements \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reservation_id": 1,
    "mode_paiement": "carte",
    "numero_carte": "4111111111111111",
    "cvv": "123",
    "date_expiration": "12/25"
  }'
```

**Réponse:**
```json
{
  "id": 1,
  "reservation_id": 1,
  "montant": 160.0,
  "mode_paiement": "carte",
  "statut": "reussi",
  "reference_transaction": "TXN-A1B2C3D4E5F6",
  "date_paiement": "2024-06-01T10:35:00Z",
  "telephone_mobile": null,
  "operateur_mobile": null,
  "derniers_chiffres_carte": "1111",
  "message_erreur": null
}
```

### Payer par Mobile Money

```bash
curl -X POST http://localhost:8000/paiements \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reservation_id": 1,
    "mode_paiement": "mobile_money",
    "telephone_mobile": "+33612345678",
    "operateur_mobile": "Orange Money"
  }'
```

### Consulter un Paiement

```bash
curl http://localhost:8000/paiements/1 \
  -H "Authorization: Bearer <access_token>"
```

---

## WebSocket

### JavaScript

```javascript
// Connexion au WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/disponibilite/1');

// Événement de connexion
ws.onopen = () => {
  console.log('✅ Connecté au WebSocket');
};

// Réception des messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'connected') {
    console.log('Message de bienvenue:', data.message);
  } else if (data.type === 'heartbeat') {
    console.log('💓 Heartbeat reçu');
  } else {
    console.log('📊 Mise à jour de disponibilité:', data);
    // Mettre à jour l'interface utilisateur
    updateAvailability(data);
  }
};

// Gestion des erreurs
ws.onerror = (error) => {
  console.error('❌ Erreur WebSocket:', error);
};

// Fermeture de la connexion
ws.onclose = () => {
  console.log('🔌 Connexion fermée');
  // Reconnexion automatique après 5 secondes
  setTimeout(() => {
    console.log('🔄 Reconnexion...');
    connectWebSocket();
  }, 5000);
};

// Heartbeat (ping/pong)
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send('ping');
  }
}, 30000);

function updateAvailability(data) {
  document.getElementById('places-passagers').textContent =
    data.places_disponibles_passagers;
  document.getElementById('places-vehicules').textContent =
    data.places_disponibles_vehicules;
}
```

### Python

```python
import asyncio
import websockets
import json

async def listen_availability():
    uri = "ws://localhost:8000/ws/disponibilite/1"

    async with websockets.connect(uri) as websocket:
        print("✅ Connecté")

        # Recevoir les messages
        async for message in websocket:
            data = json.loads(message)
            print(f"📨 Reçu: {data}")

            if data.get('type') == 'heartbeat':
                # Répondre au heartbeat
                await websocket.send('ping')

asyncio.run(listen_availability())
```

---

## Administration

### Créer une Compagnie (Admin)

```bash
curl -X POST http://localhost:8000/compagnies \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Atlantic Ferries",
    "telephone": "+33491234567",
    "email": "contact@atlantic-ferries.com",
    "numero_licence": "FR-FERRY-002",
    "pays_immatriculation": "France",
    "taux_commission": 0.05,
    "politique_annulation": "Remboursement selon délai"
  }'
```

### Lister les Compagnies

```bash
curl http://localhost:8000/compagnies
```

### Mettre à Jour une Compagnie (Admin)

```bash
curl -X PUT http://localhost:8000/compagnies/1 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "taux_commission": 0.04
  }'
```

### Supprimer une Compagnie (Admin)

```bash
curl -X DELETE http://localhost:8000/compagnies/1 \
  -H "Authorization: Bearer <admin_token>"
```

---

## Expand & Pagination

### Expand Simple

```bash
# Charger les bateaux d'une compagnie
curl "http://localhost:8000/compagnies/1?expand=bateaux"
```

**Réponse:**
```json
{
  "id": 1,
  "nom": "Mediterranean Ferries",
  "bateaux": [
    {
      "id": 1,
      "nom": "Méditerranée I",
      "capacite_passagers": 500
    },
    {
      "id": 2,
      "nom": "Méditerranée II",
      "capacite_passagers": 600
    }
  ]
}
```

### Expand Multiple

```bash
# Charger plusieurs relations
curl "http://localhost:8000/compagnies/1?expand=bateaux,routes,promotions"
```

### Expand Imbriqué

```bash
# Charger des relations imbriquées
curl "http://localhost:8000/compagnies/1?expand=bateaux.niveaux.chambres,routes.port_depart"
```

### Pagination Standard

```bash
# Page 1, 20 éléments par page
curl "http://localhost:8000/compagnies?page=1&page_size=20"
```

**Réponse:**
```json
{
  "items": [...],
  "total": 50,
  "page": 1,
  "page_size": 20,
  "total_pages": 3,
  "has_next": true,
  "has_prev": false
}
```

### Sans Pagination

```bash
# Récupérer tous les résultats
curl "http://localhost:8000/compagnies?no_pagination=true"
```

---

## Embarquement

### Scanner un Billet

```bash
curl -X POST http://localhost:8000/embarquement/scan/TKT-A1B2C3D4E5 \
  -H "X-API-Key: admin_api_key_changez_moi"
```

**Réponse (Succès):**
```json
{
  "status": "success",
  "message": "Boarding successful",
  "numero_ticket": "TKT-A1B2C3D4E5",
  "reference_reservation": "RES-A1B2C3D4E5F6",
  "nombre_passagers": 2,
  "vehicule_inclus": false,
  "date_embarquement": "2024-06-15T07:45:00Z"
}
```

**Réponse (Déjà Embarqué):**
```json
{
  "status": "already_boarded",
  "message": "Ticket already used for boarding",
  "date_embarquement": "2024-06-15T07:45:00Z"
}
```

### Vérifier un Billet

```bash
curl http://localhost:8000/embarquement/verify/TKT-A1B2C3D4E5 \
  -H "X-API-Key: admin_api_key_changez_moi"
```

---

## Scénario Complet

### 1. Inscription et Connexion

```bash
# S'inscrire
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jean",
    "email": "jean@example.com",
    "numero_telephone": "+33698765432",
    "password": "MonMotDePasse123!",
    "nom_complet": "Jean Martin"
  }'

# Se connecter
TOKEN=$(curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jean",
    "password": "MonMotDePasse123!"
  }' | jq -r '.access_token')
```

### 2. Rechercher une Traversée

```bash
curl "http://localhost:8000/traversees?\
port_depart=1&\
port_arrivee=2&\
date_min=2024-06-15T00:00:00&\
passagers=2" | jq '.[0].id'
# Résultat: 1
```

### 3. Faire une Réservation

```bash
RESERVATION=$(curl -X POST http://localhost:8000/reservations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "voyage_id": 1,
    "type_reservation": "passager",
    "nombre_passagers": 2,
    "vehicule_inclus": false
  }' | jq -r '.id')
```

### 4. Payer la Réservation

```bash
curl -X POST http://localhost:8000/paiements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"reservation_id\": $RESERVATION,
    \"mode_paiement\": \"carte\",
    \"numero_carte\": \"4111111111111111\",
    \"cvv\": \"123\",
    \"date_expiration\": \"12/25\"
  }"
```

### 5. Recevoir le Billet par Email

Le billet est automatiquement envoyé par email avec:
- PDF du billet
- QR code pour l'embarquement
- Détails de la réservation

### 6. Embarquement

```bash
curl -X POST http://localhost:8000/embarquement/scan/TKT-XXXXXXXXXX \
  -H "X-API-Key: admin_api_key_changez_moi"
```

---

## 🎉 Félicitations !

Vous savez maintenant utiliser toutes les fonctionnalités de l'API !

Pour plus d'informations, consultez:
- Documentation interactive: `http://localhost:8000/docs`
- README: `README.md`
- Guide de démarrage: `QUICKSTART.md`

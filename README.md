# 🚢 Compagnie Bateau API

API complète de réservation de billets de bateau avec FastAPI, SQLAlchemy 2.0 asynchrone, WebSockets, Redis et PostgreSQL.

## 🎯 Fonctionnalités

- ✅ **Authentification JWT** complète (register, login, refresh)
- ✅ **CRUD complet** pour tous les modules
- ✅ **Système d'expand** pour charger les relations dynamiquement
- ✅ **Recherche de traversées** avec cache Redis et streaming
- ✅ **Réservations** avec verrou optimiste et expiration automatique
- ✅ **Paiement** avec simulateur et génération de tickets (PDF + QR code)
- ✅ **WebSockets** pour les mises à jour de disponibilité en temps réel
- ✅ **Embarquement** avec scan de QR code
- ✅ **Tâches périodiques** (expiration, nettoyage, etc.)
- ✅ **Rate limiting** et sécurité
- ✅ **Pagination** avec option no_pagination

## 📋 Prérequis

- Python 3.11+
- PostgreSQL 14+
- Redis 7+
- uv (gestionnaire de paquets Python)

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone <repo-url>
cd compagnie_bateau_api
```

### 2. Installer uv

```bash
# Windows
pip install uv

# Linux/Mac
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 3. Installer les dépendances

```bash
uv pip install -e .
```

### 4. Configuration

Copier `.env.example` vers `.env` et configurer:

```bash
cp .env.example .env
```

Éditer `.env` avec vos paramètres.

### 5. Démarrer les services avec Docker

```bash
docker-compose up -d postgres redis
```

### 6. Initialiser la base de données

```bash
# Créer les migrations
alembic revision --autogenerate -m "Initial migration"

# Appliquer les migrations
alembic upgrade head

# Peupler avec des données de test
python scripts/init_db.py
```

### 7. Lancer l'API

```bash
uvicorn app.main:app --reload
```

L'API sera disponible sur `http://localhost:8000`

Documentation interactive: `http://localhost:8000/docs`

## 📚 Documentation API

### Authentification

```bash
# Inscription
POST /auth/register
{
  "username": "john",
  "email": "john@example.com",
  "numero_telephone": "+33600000000",
  "password": "password123",
  "nom_complet": "John Doe"
}

# Connexion
POST /auth/login
{
  "username": "john",
  "password": "password123"
}

# Rafraîchir le token
POST /auth/refresh
{
  "refresh_token": "..."
}

# Profil utilisateur
GET /auth/me
Authorization: Bearer <access_token>
```

### Recherche de traversées

```bash
# Recherche standard (avec cache)
GET /traversees?port_depart=1&port_arrivee=2&date_min=2024-01-01&passagers=2&vehicule=true

# Streaming
GET /traversees/stream?port_depart=1&port_arrivee=2
```

### Réservations

```bash
# Créer une réservation
POST /reservations
Authorization: Bearer <access_token>
{
  "voyage_id": 1,
  "type_reservation": "passager",
  "nombre_passagers": 2,
  "vehicule_inclus": false
}

# Mes réservations
GET /reservations
Authorization: Bearer <access_token>

# Annuler une réservation
POST /reservations/{id}/cancel
Authorization: Bearer <access_token>
{
  "raison": "Changement de plans"
}
```

### Paiement

```bash
# Payer une réservation
POST /paiements
Authorization: Bearer <access_token>
{
  "reservation_id": 1,
  "mode_paiement": "carte",
  "numero_carte": "4111111111111111",
  "cvv": "123",
  "date_expiration": "12/25"
}
```

### WebSocket (Disponibilité en temps réel)

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/disponibilite/1');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Mise à jour:', data);
};

// Heartbeat
setInterval(() => {
  ws.send('ping');
}, 30000);
```

### Embarquement

```bash
# Scanner un billet
POST /embarquement/scan/{numero_ticket}
X-API-Key: admin_api_key_changez_moi

# Vérifier un billet
GET /embarquement/verify/{numero_ticket}
X-API-Key: admin_api_key_changez_moi
```

## 🔧 Système d'Expand

Chargez dynamiquement les relations avec le paramètre `expand`:

```bash
# Charger les bateaux d'une compagnie
GET /compagnies/1?expand=bateaux

# Charger plusieurs relations
GET /compagnies/1?expand=bateaux,routes,promotions

# Relations imbriquées
GET /compagnies/1?expand=bateaux.niveaux,routes.port_depart
```

## 📄 Pagination

Toutes les listes supportent la pagination:

```bash
# Avec pagination (défaut)
GET /compagnies?page=1&page_size=20

# Sans pagination (tous les résultats)
GET /compagnies?no_pagination=true
```

## 🔐 Sécurité

- JWT avec tokens d'accès et de rafraîchissement
- Mots de passe hashés avec bcrypt
- Rate limiting (100 req/min par IP)
- Clés API pour les endpoints sensibles
- CORS configuré
- Validation Pydantic

## 🧪 Tests

```bash
# Installer les dépendances de dev
uv pip install -e ".[dev]"

# Lancer les tests
pytest

# Avec couverture
pytest --cov=app --cov-report=html
```

## 📊 Architecture

```
app/
├── main.py                 # Point d'entrée FastAPI
├── config.py              # Configuration
├── database.py            # Connexion DB
├── redis_client.py        # Client Redis
├── dependencies.py        # Dépendances (auth, etc.)
├── websocket_manager.py   # Gestionnaire WebSocket
├── models/                # Modèles SQLAlchemy
│   ├── base.py
│   ├── utilisateur.py
│   ├── geographie.py
│   ├── compagnie.py
│   ├── route.py
│   ├── voyage.py
│   ├── reservation.py
│   ├── paiement.py
│   ├── ticket.py
│   ├── journal.py
│   ├── document.py
│   └── promotion.py
├── modules/               # Modules métier
│   ├── auth/
│   ├── compagnie/
│   ├── traversee/
│   ├── reservation/
│   ├── paiement/
│   ├── embarquement/
│   └── websocket/
├── services/              # Services transverses
│   ├── email.py
│   ├── paiement_simulateur.py
│   ├── pdf_generator.py
│   └── qrcode.py
├── tasks/                 # Tâches périodiques
│   └── scheduler.py
└── utils/                 # Utilitaires
    ├── expand.py
    └── pagination.py
```

## 🔄 Tâches périodiques

- **Expiration des réservations** : Toutes les minutes
- **Mise à jour des statuts** : Toutes les 10 minutes
- **Nettoyage des logs** : Tous les jours à 3h

## 🐳 Docker

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f api

# Arrêter
docker-compose down
```

## 📝 Credentials par défaut

Après `python scripts/init_db.py`:

- **Admin**: `username=admin`, `password=admin123`
- **User**: `username=testuser`, `password=test123`

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT

## 👨‍💻 Auteur

Développé avec ❤️ pour la gestion de réservations de billets de bateau

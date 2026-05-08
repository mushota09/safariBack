# 🚀 Guide de Démarrage Rapide

## Installation en 5 minutes

### 1. Prérequis

Assurez-vous d'avoir installé :
- Python 3.11+
- PostgreSQL 14+
- Redis 7+

### 2. Installation

```bash
# Cloner le projet
git clone <repo-url>
cd compagnie_bateau_api

# Installer uv
pip install uv

# Installer les dépendances
uv pip install -e .
```

### 3. Configuration

```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos paramètres
# Minimum requis:
# - DATABASE_URL
# - REDIS_URL
# - SECRET_KEY (générer une clé aléatoire longue)
```

### 4. Base de données

```bash
# Option 1: Utiliser Docker (recommandé)
docker-compose up -d postgres redis

# Option 2: Utiliser vos services locaux
# Assurez-vous que PostgreSQL et Redis sont démarrés

# Créer la base de données
createdb compagnie_bateau

# Appliquer les migrations
alembic upgrade head

# Peupler avec des données de test
python scripts/init_db.py
```

### 5. Lancer l'API

```bash
uvicorn app.main:app --reload
```

L'API est maintenant disponible sur `http://localhost:8000`

Documentation interactive : `http://localhost:8000/docs`

## 🎯 Premiers pas

### 1. Tester l'authentification

```bash
# S'inscrire
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "email": "john@example.com",
    "numero_telephone": "+33600000000",
    "password": "password123",
    "nom_complet": "John Doe"
  }'

# Se connecter
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "password123"
  }'

# Sauvegarder le token reçu
export TOKEN="<access_token>"
```

### 2. Rechercher des traversées

```bash
# Rechercher toutes les traversées disponibles
curl http://localhost:8000/traversees

# Rechercher avec filtres
curl "http://localhost:8000/traversees?port_depart=1&port_arrivee=2&passagers=2"
```

### 3. Faire une réservation

```bash
# Créer une réservation
curl -X POST http://localhost:8000/reservations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "voyage_id": 1,
    "type_reservation": "passager",
    "nombre_passagers": 2,
    "vehicule_inclus": false
  }'

# Sauvegarder l'ID de réservation
export RESERVATION_ID="<id>"
```

### 4. Payer la réservation

```bash
# Effectuer le paiement
curl -X POST http://localhost:8000/paiements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reservation_id": '$RESERVATION_ID',
    "mode_paiement": "carte",
    "numero_carte": "4111111111111111",
    "cvv": "123",
    "date_expiration": "12/25"
  }'
```

Vous recevrez un email avec votre billet en PDF et le QR code !

## 🔧 Commandes utiles

```bash
# Voir les logs en temps réel
docker-compose logs -f api

# Accéder à la base de données
docker-compose exec postgres psql -U postgres -d compagnie_bateau

# Accéder à Redis
docker-compose exec redis redis-cli

# Lancer les tests
pytest

# Créer une migration
alembic revision --autogenerate -m "Description"

# Appliquer les migrations
alembic upgrade head
```

## 📱 Tester le WebSocket

Créez un fichier HTML simple :

```html
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Test</title>
</head>
<body>
    <h1>Disponibilité en temps réel</h1>
    <div id="messages"></div>

    <script>
        const ws = new WebSocket('ws://localhost:8000/ws/disponibilite/1');

        ws.onopen = () => {
            console.log('Connected');
            document.getElementById('messages').innerHTML += '<p>✅ Connecté</p>';
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Message:', data);
            document.getElementById('messages').innerHTML +=
                `<p>📨 ${JSON.stringify(data, null, 2)}</p>`;
        };

        ws.onerror = (error) => {
            console.error('Error:', error);
        };

        // Heartbeat
        setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send('ping');
            }
        }, 30000);
    </script>
</body>
</html>
```

## 🐛 Dépannage

### Erreur de connexion à PostgreSQL

```bash
# Vérifier que PostgreSQL est démarré
docker-compose ps postgres

# Vérifier les logs
docker-compose logs postgres
```

### Erreur de connexion à Redis

```bash
# Vérifier que Redis est démarré
docker-compose ps redis

# Tester la connexion
docker-compose exec redis redis-cli ping
```

### Erreur d'import

```bash
# Réinstaller les dépendances
uv pip install -e . --force-reinstall
```

## 📚 Ressources

- Documentation API : `http://localhost:8000/docs`
- Documentation ReDoc : `http://localhost:8000/redoc`
- README complet : `README.md`

## 🎓 Exemples avancés

### Utiliser l'expand

```bash
# Charger les relations d'une compagnie
curl "http://localhost:8000/compagnies/1?expand=bateaux,routes"

# Relations imbriquées
curl "http://localhost:8000/compagnies/1?expand=bateaux.niveaux,routes.port_depart"
```

### Pagination

```bash
# Avec pagination
curl "http://localhost:8000/compagnies?page=1&page_size=10"

# Sans pagination (tous les résultats)
curl "http://localhost:8000/compagnies?no_pagination=true"
```

### Streaming

```bash
# Recevoir les résultats en streaming
curl "http://localhost:8000/traversees/stream?port_depart=1&port_arrivee=2"
```

## 🎉 Vous êtes prêt !

Votre API est maintenant opérationnelle. Consultez la documentation complète dans `README.md` pour plus de détails.

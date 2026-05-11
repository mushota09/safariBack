# 🚢 Safari Fast - Frontend

Application React complète pour la réservation de billets de bateau.

## 🎯 Fonctionnalités

### Authentification
- ✅ Inscription avec email/password
- ✅ Connexion avec email/password
- ✅ Connexion avec Google OAuth
- ✅ Gestion de profil utilisateur
- ✅ Changement de mot de passe
- ✅ Déconnexion

### Recherche et Réservation
- ✅ Géolocalisation automatique pour trouver le port le plus proche
- ✅ Recherche de voyages avec filtres (port, date, passagers, véhicule)
- ✅ Affichage des détails de voyage
- ✅ Création de réservation
- ✅ Paiement simulé

### Gestion des Réservations
- ✅ Liste de toutes mes réservations
- ✅ Détails d'une réservation
- ✅ Annulation de réservation
- ✅ Affichage des statuts
- ✅ Téléchargement PDF (préparé)
- ✅ Affichage QR Code (préparé)

### Compagnies
- ✅ Liste des compagnies de bateau
- ✅ Filtrage par compagnie

### Design
- ✅ Design professionnel et moderne
- ✅ Couleur primaire: #010312 (bleu foncé)
- ✅ Responsive (mobile, tablette, desktop)
- ✅ Animations fluides
- ✅ Icônes et emojis

## 📋 Prérequis

- Node.js 18+
- npm ou yarn
- Backend Safari Fast démarré sur `http://localhost:8000`

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm start

# Build pour production
npm run build
```

## 📁 Structure du Projet

```
frontend/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── Header.js              # Navigation et menu utilisateur
│   │   ├── Header.css
│   │   ├── SearchBar.js           # Barre de recherche avec filtres
│   │   ├── SearchBar.css
│   │   ├── VoyageCard.js          # Carte de voyage
│   │   ├── VoyageCard.css
│   │   ├── AuthCallback.js        # Callback Google OAuth
│   │   └── ...
│   ├── context/
│   │   └── AuthContext.js         # Contexte d'authentification
│   ├── pages/
│   │   ├── HomePage.js            # Page d'accueil avec recherche
│   │   ├── HomePage.css
│   │   ├── LoginPage.js           # Connexion/Inscription
│   │   ├── LoginPage.css
│   │   ├── ProfilePage.js         # Profil utilisateur
│   │   ├── ProfilePage.css
│   │   ├── CompagniesPage.js      # Liste des compagnies
│   │   ├── CompagniesPage.css
│   │   ├── VoyageDetailPage.js    # Détails d'un voyage
│   │   ├── VoyageDetailPage.css
│   │   ├── ReservationPage.js     # Formulaire de réservation
│   │   ├── ReservationPage.css
│   │   ├── MyReservationsPage.js  # Liste des réservations
│   │   ├── MyReservationsPage.css
│   │   ├── ReservationDetailsPage.js  # Détails d'une réservation
│   │   ├── ReservationDetailsPage.css
│   │   └── ...
│   ├── App.js                     # Composant principal avec routes
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## 🛣️ Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | HomePage | Recherche de voyages avec géolocalisation |
| `/login` | LoginPage | Connexion et inscription |
| `/compagnies` | CompagniesPage | Liste des compagnies |
| `/voyage/:id` | VoyageDetailPage | Détails d'un voyage |
| `/reservation/:voyageId` | ReservationPage | Formulaire de réservation |
| `/my-reservations` | MyReservationsPage | Liste des réservations |
| `/reservation-details/:id` | ReservationDetailsPage | Détails d'une réservation |
| `/profile` | ProfilePage | Profil utilisateur |
| `/auth/callback` | AuthCallback | Callback Google OAuth |

## 🔐 Authentification

### Email/Password

```javascript
// Inscription
POST http://localhost:8000/auth/register
{
  "username": "john",
  "email": "john@example.com",
  "numero_telephone": "+33600000000",
  "password": "password123",
  "nom_complet": "John Doe"
}

// Connexion
POST http://localhost:8000/auth/login
{
  "username": "john",
  "password": "password123"
}
```

### Google OAuth

1. Clic sur "Continuer avec Google"
2. Redirection vers Google
3. Autorisation
4. Callback vers `/auth/callback`
5. Tokens stockés dans localStorage

## 📱 Responsive

### Mobile (< 768px)
- Navigation simplifiée
- Menu utilisateur compact
- Grilles en colonne unique
- Formulaires adaptés

### Tablette (768px - 1024px)
- Grilles en 2 colonnes
- Navigation complète
- Espacement optimisé

### Desktop (> 1024px)
- Grilles en 3-4 colonnes
- Layout optimal
- Toutes les fonctionnalités visibles

## 🎨 Thème

```css
/* Couleurs principales */
--primary-color: #010312;      /* Bleu très foncé */
--secondary-color: #1a1f3a;    /* Bleu foncé */
--accent-color: #4a90e2;       /* Bleu clair */
--success-color: #28a745;      /* Vert */
--warning-color: #ffc107;      /* Jaune */
--danger-color: #dc3545;       /* Rouge */
--light-bg: #f8f9fa;           /* Gris clair */
--white: #ffffff;              /* Blanc */
```

## 🔧 Configuration

### Google OAuth

Modifier `GOOGLE_CLIENT_ID` dans `src/App.js`:

```javascript
const GOOGLE_CLIENT_ID = 'VOTRE_CLIENT_ID.apps.googleusercontent.com';
```

### URL Backend

Par défaut: `http://localhost:8000`

Pour changer, créer un fichier `.env`:

```
REACT_APP_API_URL=https://votre-api.com
```

Puis utiliser:

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

## 📦 Dépendances Principales

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.21.1",
  "@react-oauth/google": "^0.12.1",
  "axios": "^1.6.5",
  "date-fns": "^3.0.6"
}
```

## 🧪 Tests

Voir `../TESTING_GUIDE.md` pour le guide complet de test.

### Tests Rapides

```bash
# Vérifier que le backend est accessible
curl http://localhost:8000/health

# Démarrer le frontend
npm start

# Ouvrir http://localhost:3000
```

## 🚀 Déploiement

### Build Production

```bash
npm run build
```

Génère le dossier `build/` avec les fichiers optimisés.

### Servir en Production

```bash
# Avec serve
npm install -g serve
serve -s build -p 3000

# Avec nginx
# Copier le contenu de build/ vers /var/www/html/
```

### Variables d'Environnement

Créer `.env.production`:

```
REACT_APP_API_URL=https://api.safari-fast.com
REACT_APP_GOOGLE_CLIENT_ID=VOTRE_CLIENT_ID
```

## 📝 Scripts Disponibles

```bash
# Démarrer en développement
npm start

# Build pour production
npm run build

# Lancer les tests
npm test

# Éjecter la configuration (irréversible)
npm run eject
```

## 🐛 Dépannage

### Le frontend ne démarre pas

```bash
# Supprimer node_modules et réinstaller
rm -rf node_modules package-lock.json
npm install
```

### Erreur CORS

Vérifier que le backend autorise `http://localhost:3000` dans les CORS.

### Google OAuth ne fonctionne pas

1. Vérifier le Client ID dans `App.js`
2. Vérifier les URIs de redirection dans Google Cloud Console
3. Vérifier que le backend est accessible

### Géolocalisation ne fonctionne pas

1. Autoriser la géolocalisation dans le navigateur
2. Utiliser HTTPS en production (requis pour géolocalisation)

## 📚 Documentation

- [React Documentation](https://react.dev/)
- [React Router](https://reactrouter.com/)
- [Google OAuth](https://developers.google.com/identity/protocols/oauth2)
- [Axios](https://axios-http.com/)
- [date-fns](https://date-fns.org/)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT

## 👨‍💻 Auteur

Développé avec ❤️ pour Safari Fast

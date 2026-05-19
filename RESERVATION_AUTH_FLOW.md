# ✅ Flux d'authentification pour la réservation

## 🎯 Objectif

Adapter le bouton "Réserver Maintenant" selon l'état de connexion de l'utilisateur :
- **Non connecté** : Rediriger vers la page de connexion avec retour automatique
- **Connecté** : Rediriger vers la page de réservation

## 🔄 Flux complet

### Cas 1 : Utilisateur NON connecté

```
VoyageDetailPage
  ↓
  Clic sur "Se connecter pour réserver"
  ↓
  navigate('/login?redirect=/voyage/36')
  ↓
LoginPage
  ↓
  Connexion réussie (email/password OU Google OAuth)
  ↓
  navigate('/voyage/36')  ← Retour automatique
  ↓
VoyageDetailPage
  ↓
  Bouton devient "Réserver Maintenant"
  ↓
  Clic sur "Réserver Maintenant"
  ↓
  navigate('/reservation/36')
  ↓
ReservationPage
```

### Cas 2 : Utilisateur CONNECTÉ

```
VoyageDetailPage
  ↓
  Bouton affiche "Réserver Maintenant"
  ↓
  Clic sur "Réserver Maintenant"
  ↓
  navigate('/reservation/36')
  ↓
ReservationPage
```

### Cas 3 : Connexion via Google OAuth

```
VoyageDetailPage
  ↓
  Clic sur "Se connecter pour réserver"
  ↓
  navigate('/login?redirect=/voyage/36')
  ↓
LoginPage
  ↓
  Clic sur "Continuer avec Google"
  ↓
  sessionStorage.setItem('oauth_redirect', '/voyage/36')
  ↓
  Redirection vers Google
  ↓
Google OAuth
  ↓
  Backend callback
  ↓
  Redirection vers /auth/callback?access_token=...&refresh_token=...
  ↓
AuthCallbackPage
  ↓
  Stocke les tokens
  ↓
  Récupère oauth_redirect depuis sessionStorage
  ↓
  navigate('/voyage/36')  ← Retour automatique
  ↓
VoyageDetailPage
  ↓
  Bouton devient "Réserver Maintenant"
```

## 📝 Modifications apportées

### 1. VoyageDetailPage.tsx

#### A. Import de authService
```typescript
import { authService } from '../services/authService';
```

#### B. État d'authentification
```typescript
const [isAuthenticated, setIsAuthenticated] = useState(false);

useEffect(() => {
  setIsAuthenticated(authService.isAuthenticated());
}, []);
```

#### C. Fonction de gestion de réservation
```typescript
const handleReservation = () => {
  if (!isAuthenticated) {
    // Redirect to login with return URL
    navigate(`/login?redirect=/voyage/${id}`);
  } else {
    // Proceed to reservation
    navigate(`/reservation/${traversee!.id}`);
  }
};
```

#### D. Bouton adaptatif (Desktop)
```typescript
<button
  onClick={handleReservation}
  className="..."
>
  {isAuthenticated ? 'Réserver Maintenant' : 'Se connecter pour réserver'}
  <ChevronRight />
</button>
```

#### E. Bouton adaptatif (Mobile)
```typescript
<button
  onClick={handleReservation}
  className="..."
>
  {isAuthenticated
    ? `RESERVER ${formatCurrency(prixAffiche)}`
    : 'SE CONNECTER POUR RÉSERVER'
  }
  <ChevronRight />
</button>
```

### 2. LoginPage.tsx

#### A. Récupération du paramètre redirect
```typescript
import { useSearchParams } from 'react-router-dom';

const [searchParams] = useSearchParams();
const redirectUrl = searchParams.get('redirect') || '/';
```

#### B. Redirection après connexion email/password
```typescript
const handleLogin = async (e: React.FormEvent) => {
  // ...
  try {
    await authService.login({ username: email, password });
    navigate(redirectUrl);  // ← Utilise redirectUrl au lieu de '/'
  } catch (err) {
    // ...
  }
};
```

#### C. Stockage de la redirection pour OAuth
```typescript
const handleGoogleLogin = async () => {
  try {
    const authUrl = await authService.getGoogleAuthUrl();

    // Store redirect URL in sessionStorage for after OAuth callback
    if (redirectUrl !== '/') {
      sessionStorage.setItem('oauth_redirect', redirectUrl);
    }

    window.location.href = authUrl;
  } catch (err) {
    // ...
  }
};
```

### 3. AuthCallbackPage.tsx

#### A. Récupération de la redirection OAuth
```typescript
useEffect(() => {
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');

  if (accessToken && refreshToken) {
    // Store tokens
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);

    // Check for redirect URL from OAuth flow
    const redirectUrl = sessionStorage.getItem('oauth_redirect');
    if (redirectUrl) {
      sessionStorage.removeItem('oauth_redirect');
      setTimeout(() => {
        navigate(redirectUrl);  // ← Retour vers la page d'origine
      }, 1000);
    } else {
      // Redirect to home
      setTimeout(() => {
        navigate('/');
      }, 1000);
    }
  } else {
    navigate('/login');
  }
}, [searchParams, navigate]);
```

## 🎨 Expérience utilisateur

### Utilisateur non connecté

1. **Sur VoyageDetailPage**
   - Bouton affiche : "Se connecter pour réserver"
   - Couleur : Même style que "Réserver Maintenant"

2. **Clic sur le bouton**
   - Redirection vers `/login?redirect=/voyage/36`
   - L'URL contient le chemin de retour

3. **Sur LoginPage**
   - Formulaire de connexion normal
   - Bouton Google OAuth normal
   - Aucune indication visible du redirect (transparent pour l'utilisateur)

4. **Après connexion**
   - Retour automatique vers `/voyage/36`
   - Bouton devient "Réserver Maintenant"
   - L'utilisateur peut maintenant réserver

### Utilisateur connecté

1. **Sur VoyageDetailPage**
   - Bouton affiche : "Réserver Maintenant"
   - Affiche le prix sur mobile

2. **Clic sur le bouton**
   - Redirection directe vers `/reservation/36`
   - Pas de détour par la page de connexion

## 🔐 Sécurité

### sessionStorage vs localStorage

- **sessionStorage** : Utilisé pour `oauth_redirect`
  - Supprimé automatiquement à la fermeture de l'onglet
  - Évite les redirections indésirables lors de futures connexions
  - Plus sécurisé pour les URLs temporaires

- **localStorage** : Utilisé pour les tokens
  - Persiste entre les sessions
  - Permet de rester connecté

### Validation côté backend

Le backend doit également vérifier l'authentification lors de la création de réservation :
```python
@router.post("/reservations")
async def create_reservation(
    current_user: Annotated[Utilisateur, Depends(get_current_user)],
    # ...
):
    # L'utilisateur est garanti d'être authentifié ici
    pass
```

## 🧪 Tests à effectuer

### Test 1 : Utilisateur non connecté → Connexion email/password
1. Se déconnecter
2. Aller sur `/voyage/36`
3. Vérifier que le bouton affiche "Se connecter pour réserver"
4. Cliquer sur le bouton
5. Vérifier la redirection vers `/login?redirect=/voyage/36`
6. Se connecter avec email/password
7. Vérifier le retour automatique vers `/voyage/36`
8. Vérifier que le bouton affiche maintenant "Réserver Maintenant"
9. Cliquer sur "Réserver Maintenant"
10. Vérifier la redirection vers `/reservation/36`

### Test 2 : Utilisateur non connecté → Connexion Google OAuth
1. Se déconnecter
2. Aller sur `/voyage/36`
3. Cliquer sur "Se connecter pour réserver"
4. Sur LoginPage, cliquer sur "Continuer avec Google"
5. Se connecter avec Google
6. Vérifier le retour automatique vers `/voyage/36`
7. Vérifier que le bouton affiche "Réserver Maintenant"

### Test 3 : Utilisateur déjà connecté
1. Se connecter
2. Aller sur `/voyage/36`
3. Vérifier que le bouton affiche "Réserver Maintenant"
4. Cliquer sur le bouton
5. Vérifier la redirection directe vers `/reservation/36`

### Test 4 : Mobile
1. Ouvrir en mode mobile (DevTools)
2. Répéter les tests 1-3
3. Vérifier que le bouton mobile affiche :
   - "SE CONNECTER POUR RÉSERVER" (non connecté)
   - "RESERVER $50 USD" (connecté)

## 📊 Fichiers modifiés

1. **safarifast/frontend/src/pages/VoyageDetailPage.tsx**
   - Ajout de l'état `isAuthenticated`
   - Ajout de la fonction `handleReservation`
   - Modification des boutons (desktop + mobile)

2. **safarifast/frontend/src/pages/LoginPage.tsx**
   - Ajout de `useSearchParams`
   - Récupération du paramètre `redirect`
   - Redirection vers `redirectUrl` après connexion
   - Stockage de `oauth_redirect` dans sessionStorage

3. **safarifast/frontend/src/pages/AuthCallbackPage.tsx**
   - Récupération de `oauth_redirect` depuis sessionStorage
   - Redirection vers l'URL d'origine après OAuth

## 🎯 Résultat final

### Avant
```
Utilisateur non connecté → Clic "Réserver" → Page de réservation → ❌ Erreur 401
```

### Après
```
Utilisateur non connecté → Clic "Se connecter" → LoginPage → Connexion → Retour auto → Clic "Réserver" → ✅ Page de réservation
Utilisateur connecté → Clic "Réserver" → ✅ Page de réservation directement
```

## 🚀 Avantages

1. **Expérience fluide** : L'utilisateur revient exactement où il était
2. **Pas de friction** : Pas besoin de re-naviguer après connexion
3. **Transparent** : Le redirect est invisible pour l'utilisateur
4. **Sécurisé** : sessionStorage nettoyé automatiquement
5. **Compatible OAuth** : Fonctionne avec Google OAuth
6. **Mobile-friendly** : Texte adapté à la taille d'écran

---

**Date**: 2026-05-18
**Développeur**: Kiro AI Assistant
**Statut**: ✅ IMPLÉMENTÉ ET PRÊT POUR LES TESTS

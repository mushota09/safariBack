# 🔧 GOOGLE OAUTH - Débogage Complet

## ✅ Améliorations apportées

### 1. Frontend - CompleteProfilePage.tsx

#### A. Double méthode d'extraction des tokens
```typescript
// Méthode 1: useSearchParams (React Router)
const accessToken = searchParams.get('access_token');
const refreshToken = searchParams.get('refresh_token');

// Méthode 2: window.location (fallback)
const urlParams = new URLSearchParams(window.location.search);
const accessTokenFromWindow = urlParams.get('access_token');
const refreshTokenFromWindow = urlParams.get('refresh_token');

// Utiliser celle qui fonctionne
const finalAccessToken = accessToken || accessTokenFromWindow;
const finalRefreshToken = refreshToken || refreshTokenFromWindow;
```

#### B. Logs détaillés dans la console
```
🔍 CompleteProfilePage - Checking tokens from URL
Method 1 (useSearchParams):
  Access Token: eyJhbGciOiJIUzI1NiIs...
  Refresh Token: eyJhbGciOiJIUzI1NiIs...
Method 2 (window.location):
  Access Token: eyJhbGciOiJIUzI1NiIs...
  Refresh Token: eyJhbGciOiJIUzI1NiIs...
Full URL: http://localhost:3000/complete-profile?access_token=...
✅ Tokens stored in localStorage
Verification - Access Token stored: YES
Verification - Refresh Token stored: YES
```

#### C. Page d'erreur si tokens manquants
- Affiche un message d'erreur clair
- Liste les causes possibles
- Bouton pour retourner à la connexion
- Redirection automatique après 5 secondes

#### D. Page de chargement pendant traitement
- Spinner animé
- Message "Préparation..."
- Empêche la soumission du formulaire avant que les tokens soient prêts

#### E. Logs détaillés lors de la soumission
```
🚀 Submitting complete profile form
Access Token from localStorage: eyJhbGciOiJIUzI1NiIs...
📤 Sending payload: {numero_telephone: "+243...", date_naissance: "1990-01-01", ...}
📥 Response status: 200
✅ Profile completed successfully: {id: 1, email: "user@gmail.com", ...}
```

### 2. Backend - router.py

#### Logs détaillés dans le callback Google
```python
print(f"🔵 Google callback received with code: {code[:20]}...")
print(f"🔑 Got Google access token: {access_token[:20]}...")
print(f"👤 User info from Google: {user_info.get('email')}, {user_info.get('name')}")
print(f"✅ User authenticated/created: ID={user.id}, email={user.email}, phone={user.numero_telephone}")
print(f"🎫 JWT tokens created:")
print(f"   Access: {tokens['access_token'][:30]}...")
print(f"   Refresh: {tokens['refresh_token'][:30]}...")
print(f"📋 Profile complete: {profile_complete}")
print(f"➡️  Redirecting to: {frontend_url[:100]}...")
```

### 3. Backend - dependencies.py

#### Logs dans get_current_user_allow_inactive
```python
print(f"🔑 Decoding token: {token[:20]}...")
print(f"👤 User ID from token (string): {user_id_str}")
print(f"👤 User ID converted to int: {user_id}")
print(f"✅ User found: {user.email}, is_active: {user.is_active}")
```

## 🧪 Comment tester maintenant

### Étape 1: Démarrer le backend
```bash
cd safarifast
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Vérifier**: Le terminal backend doit afficher:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### Étape 2: Démarrer le frontend
```bash
cd safarifast/frontend
npm run dev
```

**Vérifier**: Le terminal frontend doit afficher:
```
VITE v... ready in ...ms
➜  Local:   http://localhost:3000/
```

### Étape 3: Ouvrir la console du navigateur
1. Aller sur http://localhost:3000/login
2. Appuyer sur F12
3. Aller dans l'onglet "Console"
4. **GARDER LA CONSOLE OUVERTE**

### Étape 4: Tester le flux Google OAuth
1. Cliquer sur "Continuer avec Google"
2. Se connecter avec un compte Google
3. **OBSERVER LES LOGS**

#### Dans le terminal BACKEND, vous devriez voir:
```
🔵 Google callback received with code: 4/0AY0e-g7...
🔑 Got Google access token: ya29.a0AfH6SMBw...
👤 User info from Google: user@gmail.com, John Doe
✅ User authenticated/created: ID=1, email=user@gmail.com, phone=None
🎫 JWT tokens created:
   Access: eyJhbGciOiJIUzI1NiIsInR5cCI...
   Refresh: eyJhbGciOiJIUzI1NiIsInR5cCI...
📋 Profile complete: False
➡️  Redirecting to: http://localhost:3000/complete-profile?access_token=eyJhbGciOiJIUzI1NiIsInR5cCI...
```

#### Dans la console du NAVIGATEUR, vous devriez voir:
```
🔍 CompleteProfilePage - Checking tokens from URL
Method 1 (useSearchParams):
  Access Token: eyJhbGciOiJIUzI1NiIs...
  Refresh Token: eyJhbGciOiJIUzI1NiIs...
Method 2 (window.location):
  Access Token: eyJhbGciOiJIUzI1NiIs...
  Refresh Token: eyJhbGciOiJIUzI1NiIs...
Full URL: http://localhost:3000/complete-profile?access_token=...&refresh_token=...
✅ Tokens stored in localStorage
Verification - Access Token stored: YES
Verification - Refresh Token stored: YES
```

### Étape 5: Remplir le formulaire
1. Date de naissance: Choisir une date
2. Numéro de téléphone: Entrer un numéro (ex: +243123456789)
3. (Optionnel) Autres champs
4. Cliquer sur "Finaliser l'inscription"

#### Dans la console du NAVIGATEUR, vous devriez voir:
```
🚀 Submitting complete profile form
Access Token from localStorage: eyJhbGciOiJIUzI1NiIs...
📤 Sending payload: {numero_telephone: "+243123456789", date_naissance: "1990-01-01", ...}
📥 Response status: 200
✅ Profile completed successfully: {id: 1, email: "user@gmail.com", ...}
```

#### Dans le terminal BACKEND, vous devriez voir:
```
🔍 Complete profile called for user: 1 - user@gmail.com
📞 Phone: +243123456789, DOB: 1990-01-01
🔑 Decoding token: eyJhbGciOiJIUzI1NiIs...
👤 User ID from token (string): 1
👤 User ID converted to int: 1
✅ User found: user@gmail.com, is_active: False
✅ Profile completed successfully for user: 1
```

### Étape 6: Vérification finale
- Vous devriez être redirigé vers la page d'accueil (/)
- Votre photo ou initiales devraient apparaître dans le header
- Vous êtes maintenant connecté !

## 🐛 Diagnostic des problèmes

### Problème A: "No tokens found in URL"

**Symptôme dans la console**:
```
❌ No tokens found in URL
This means the backend did not redirect with tokens.
```

**Causes possibles**:
1. Le backend n'est pas démarré
2. Le callback Google a échoué
3. Erreur dans la création des tokens

**Solution**:
1. Vérifier les logs du terminal backend
2. Chercher des erreurs ou exceptions
3. Vérifier que la ligne "➡️ Redirecting to:" apparaît
4. Copier l'URL de redirection et vérifier qu'elle contient `access_token` et `refresh_token`

### Problème B: "No access token found in localStorage"

**Symptôme dans la console**:
```
🚀 Submitting complete profile form
Access Token from localStorage: NOT FOUND
❌ No access token found in localStorage
```

**Causes possibles**:
1. Les tokens étaient dans l'URL mais n'ont pas été stockés
2. localStorage est bloqué (mode privé)
3. Les tokens ont été supprimés

**Solution**:
1. Vérifier dans l'onglet "Application" > "Local Storage" > "http://localhost:3000"
2. Chercher les clés `access_token` et `refresh_token`
3. Si elles n'existent pas, regarder les logs de la console au moment du chargement de la page
4. Vérifier que "✅ Tokens stored in localStorage" apparaît

### Problème C: Erreur 401 "Could not validate credentials"

**Symptôme**:
```
📥 Response status: 401
❌ Error response: {detail: "Could not validate credentials"}
```

**Causes possibles**:
1. Token mal formé
2. SECRET_KEY différente
3. Token expiré
4. User ID invalide

**Solution**:
1. Copier le token depuis localStorage
2. Aller sur https://jwt.io
3. Coller le token et vérifier:
   - Le token est bien formé (3 parties séparées par des points)
   - Le payload contient `sub` (user ID)
   - Le payload contient `exp` (expiration)
   - Le payload contient `type: "access"`
4. Vérifier les logs backend pour voir l'erreur exacte

### Problème D: Erreur 400 "Phone number already registered"

**Symptôme**:
```
❌ Error response: {detail: "Phone number already registered"}
```

**Solution**:
- Le numéro de téléphone est déjà utilisé par un autre compte
- Essayer avec un autre numéro
- Ou supprimer l'ancien compte de la base de données

## 📊 Checklist complète

Avant de tester, vérifier:

- [ ] Backend démarré sur http://localhost:8000
- [ ] Frontend démarré sur http://localhost:3000
- [ ] Console du navigateur ouverte (F12)
- [ ] Terminal backend visible
- [ ] Base de données PostgreSQL accessible
- [ ] Redis accessible
- [ ] Variables d'environnement configurées:
  - [ ] GOOGLE_CLIENT_ID
  - [ ] GOOGLE_CLIENT_SECRET
  - [ ] GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
  - [ ] SECRET_KEY
  - [ ] DATABASE_URL
  - [ ] REDIS_URL

## 🎯 Ce que vous devez me communiquer

Si le problème persiste, copiez-collez dans le chat:

### 1. Logs du terminal BACKEND
```
[Copier tout ce qui s'affiche quand vous testez]
```

### 2. Logs de la console du NAVIGATEUR
```
[Copier tout ce qui s'affiche dans la console]
```

### 3. URL dans la barre d'adresse
```
[Copier l'URL complète après la redirection Google]
```

### 4. Contenu de localStorage
1. F12 > Application > Local Storage > http://localhost:3000
2. Faire une capture d'écran ou copier les clés/valeurs

### 5. Variables d'environnement (sans les valeurs sensibles)
```bash
# Dans safarifast/.env
GOOGLE_CLIENT_ID=xxx...apps.googleusercontent.com (OUI/NON)
GOOGLE_CLIENT_SECRET=GOCSPX-xxx (OUI/NON)
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback (OUI/NON)
```

Avec ces informations, je pourrai identifier exactement où se situe le problème !

---

**Date**: 2026-05-18
**Statut**: 🔧 DEBUGGING AMÉLIORÉ
**Prochaine étape**: Tester et communiquer les logs

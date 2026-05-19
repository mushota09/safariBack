# 🧪 TEST GOOGLE OAUTH - Guide de débogage

## 🔍 Étapes de débogage

### 1. Vérifier que le backend est démarré
```bash
# Dans le terminal backend
cd safarifast
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Vérifier dans le navigateur: http://localhost:8000/docs

### 2. Vérifier que le frontend est démarré
```bash
# Dans le terminal frontend
cd safarifast/frontend
npm run dev
```

Vérifier dans le navigateur: http://localhost:3000

### 3. Ouvrir la console du navigateur
- Appuyer sur F12
- Aller dans l'onglet "Console"
- Garder la console ouverte pendant tout le test

### 4. Tester le flux Google OAuth

#### Étape A: Cliquer sur "Continuer avec Google"
1. Aller sur http://localhost:3000/login
2. Cliquer sur le bouton "Continuer avec Google"
3. **VÉRIFIER dans la console**: Devrait afficher l'URL Google

#### Étape B: Se connecter avec Google
1. Choisir un compte Google
2. Autoriser l'application
3. **OBSERVER**: Vous serez redirigé vers le backend

#### Étape C: Backend callback
Le backend va:
1. Échanger le code contre un token Google
2. Récupérer vos infos (email, nom, photo)
3. Créer ou trouver votre compte
4. Générer les tokens JWT
5. Rediriger vers le frontend

**VÉRIFIER l'URL de redirection dans la barre d'adresse**:
- Si profil complet: `http://localhost:3000/auth/callback?access_token=...&refresh_token=...`
- Si profil incomplet: `http://localhost:3000/complete-profile?access_token=...&refresh_token=...`

#### Étape D: Frontend - Page de complétion
**VÉRIFIER dans la console** (devrait afficher):
```
🔍 CompleteProfilePage - Checking tokens from URL
Access Token: eyJhbGciOiJIUzI1NiIs...
Refresh Token: eyJhbGciOiJIUzI1NiIs...
✅ Tokens stored in localStorage
Verification - Access Token stored: YES
Verification - Refresh Token stored: YES
```

**SI VOUS VOYEZ**:
```
Access Token: NOT FOUND
Refresh Token: NOT FOUND
❌ No tokens found in URL, redirecting to login
```

**ALORS LE PROBLÈME EST**: Les tokens ne sont pas dans l'URL !

#### Étape E: Remplir le formulaire
1. Remplir la date de naissance
2. Remplir le numéro de téléphone
3. (Optionnel) Remplir les autres champs
4. Cliquer sur "Finaliser l'inscription"

**VÉRIFIER dans la console** (devrait afficher):
```
🚀 Submitting complete profile form
Access Token from localStorage: eyJhbGciOiJIUzI1NiIs...
📤 Sending payload: {numero_telephone: "+243...", date_naissance: "1990-01-01", ...}
📥 Response status: 200
✅ Profile completed successfully: {id: 1, email: "user@gmail.com", ...}
```

**SI VOUS VOYEZ**:
```
Access Token from localStorage: NOT FOUND
❌ No access token found in localStorage
```

**ALORS LE PROBLÈME EST**: Les tokens n'ont pas été stockés dans localStorage !

## 🐛 Problèmes possibles et solutions

### Problème 1: Tokens pas dans l'URL
**Symptôme**: `Access Token: NOT FOUND` dans la console

**Causes possibles**:
1. Le backend ne redirige pas correctement
2. L'URL est tronquée (tokens trop longs)
3. Le navigateur bloque la redirection

**Solution**:
1. Vérifier les logs du backend (terminal backend)
2. Chercher la ligne avec la redirection:
   ```
   INFO: "GET /auth/google/callback?code=... HTTP/1.1" 307 Temporary Redirect
   ```
3. Vérifier que l'URL de redirection contient bien `access_token` et `refresh_token`

### Problème 2: Tokens pas stockés dans localStorage
**Symptôme**: Tokens dans l'URL mais `Access Token from localStorage: NOT FOUND`

**Causes possibles**:
1. React Router ne parse pas correctement les paramètres
2. localStorage est bloqué (mode privé du navigateur)
3. Le useEffect ne s'exécute pas

**Solution**:
1. Vérifier dans l'onglet "Application" > "Local Storage" > "http://localhost:3000"
2. Chercher les clés `access_token` et `refresh_token`
3. Si elles n'existent pas, le problème est dans le useEffect

### Problème 3: Token invalide
**Symptôme**: Token stocké mais erreur 401 du backend

**Causes possibles**:
1. Token mal formé
2. SECRET_KEY différente entre génération et validation
3. Token expiré

**Solution**:
1. Copier le token depuis localStorage
2. Aller sur https://jwt.io
3. Coller le token et vérifier son contenu
4. Vérifier que `sub` (user_id) existe

## 🔧 Test manuel avec curl

Si vous voulez tester le endpoint `/auth/complete-profile` manuellement:

```bash
# 1. D'abord, créer un utilisateur de test via Google OAuth
# (suivre le flux normal)

# 2. Copier le access_token depuis localStorage

# 3. Tester l'endpoint
curl -X POST http://localhost:8000/auth/complete-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI" \
  -d '{
    "numero_telephone": "+243123456789",
    "date_naissance": "1990-01-01",
    "nationalite": "Congolaise",
    "sexe": "masculin"
  }'
```

## 📊 Checklist de vérification

- [ ] Backend démarré sur port 8000
- [ ] Frontend démarré sur port 3000
- [ ] Console du navigateur ouverte
- [ ] Compte Google prêt pour le test
- [ ] Base de données accessible
- [ ] Redis accessible (pour les OTP)

## 🎯 Ce que vous devez me dire

Pour que je puisse vous aider, copiez-collez dans le chat:

1. **Les logs de la console du navigateur** (tout ce qui s'affiche quand vous testez)
2. **L'URL complète** dans la barre d'adresse après la redirection Google
3. **Le contenu de localStorage** (onglet Application > Local Storage)
4. **Les logs du backend** (terminal où tourne uvicorn)

Avec ces informations, je pourrai identifier exactement où se situe le problème !

---

**Note importante**: Si vous testez avec un compte Google qui existe déjà dans la base de données ET qui a déjà un `numero_telephone`, vous serez redirigé vers `/auth/callback` et non `/complete-profile`. Pour tester le flux de complétion, utilisez un nouveau compte Google ou supprimez le `numero_telephone` de votre compte dans la base de données.

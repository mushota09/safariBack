# Corrections - Upload d'Images de Bateaux

## Problèmes Identifiés

### 1. Erreur 422 Unprocessable Entity
**Cause**: Le `bateau_id` était envoyé comme string (`"B1779110907158"`) alors que le backend attend un `int`.

**Solution**: Conversion de l'ID avant l'envoi :
```typescript
// Convert boat ID to number if it's a string starting with 'B'
const boatIdNum = boat.id.startsWith('B')
    ? parseInt(boat.id.substring(1))
    : parseInt(boat.id);
```

### 2. Erreur 403 Forbidden
**Cause**: Pas d'authentification admin réelle dans le BackofficeLoginPage.

**Solution**: Implémentation d'une vraie authentification admin avec vérification du rôle superuser.

## Corrections Appliquées

### 1. BateauEditor.tsx

#### Conversion des IDs
Toutes les fonctions qui appellent l'API ont été mises à jour :
- `loadGalleryImages()`
- `handleMainPhotoUpload()`
- `handleGalleryAdd()`
- `handleGalleryRemove()`

#### Gestion d'Erreurs Améliorée
```typescript
if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Erreur lors de l\'upload');
}
```

#### Messages d'Erreur Plus Clairs
- "Vous devez être connecté en tant qu'admin pour uploader des photos"
- Affichage du détail de l'erreur du backend

### 2. BackofficeLoginPage.tsx

#### Authentification Réelle Implémentée
```typescript
const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        if (loginType === 'company') {
            // 1. Login avec email/password
            const response = await fetch('http://localhost:8000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    mot_de_passe: formData.password,
                }),
            });

            if (!response.ok) {
                throw new Error('Identifiants incorrects');
            }

            const tokens = await response.json();

            // 2. Stocker les tokens
            localStorage.setItem('access_token', tokens.access_token);
            localStorage.setItem('refresh_token', tokens.refresh_token);

            // 3. Vérifier que l'utilisateur est admin
            const userResponse = await fetch('http://localhost:8000/auth/me', {
                headers: { 'Authorization': `Bearer ${tokens.access_token}` }
            });

            const user = await userResponse.json();

            if (!user.est_superuser) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                throw new Error('Accès réservé aux administrateurs');
            }

            navigate('/admin');
        }
    } catch (err: any) {
        setError(err.message || 'Erreur de connexion');
    } finally {
        setLoading(false);
    }
};
```

#### État et Formulaire
- Ajout de `error` state pour afficher les erreurs
- Ajout de `formData` state pour gérer email/password
- Inputs contrôlés avec `value` et `onChange`
- Affichage des erreurs dans un bandeau rouge

## Comment Utiliser

### 1. Se Connecter en tant qu'Admin

1. Aller sur `http://localhost:3000/backoffice`
2. Cliquer sur "Administration"
3. Entrer vos identifiants admin :
   - Email: `admin@safari.com` (ou votre email admin)
   - Mot de passe: votre mot de passe
4. Cliquer sur "S'identifier"

### 2. Uploader des Photos de Bateau

1. Aller sur `http://localhost:3000/admin/bateaux`
2. Cliquer sur "Modifier" sur un bateau existant
3. Scroller vers le bas pour voir :
   - **Photo Principale** : Upload de la photo principale
   - **Galerie de photos** : Upload de plusieurs photos
4. Cliquer sur "Ajouter une photo" ou sur la zone de drop
5. Sélectionner une image (max 5MB, JPG/PNG/WEBP)
6. L'image s'uploade automatiquement
7. Cliquer sur "Sauvegarder" pour sauvegarder les autres modifications

### 3. Créer un Nouveau Bateau

1. Cliquer sur "Ajouter un Bateau"
2. Remplir les informations (nom, immatriculation, capacités)
3. Cliquer sur "Créer Bateau"
4. Message affiché : "Les photos pourront être ajoutées après la création"
5. Après création, cliquer sur "Modifier" pour ajouter les photos

## Endpoints API Utilisés

### POST `/auth/login`
- Body: `{ email, mot_de_passe }`
- Returns: `{ access_token, refresh_token }`

### GET `/auth/me`
- Headers: `Authorization: Bearer {token}`
- Returns: `{ id, email, est_superuser, ... }`

### GET `/bateaux/{bateau_id}/images`
- Headers: `Authorization: Bearer {token}` (optionnel)
- Returns: `{ bateau_id, bateau_nom, photo_principale, images[] }`

### POST `/bateaux/{bateau_id}/images/upload`
- Headers: `Authorization: Bearer {token}` (requis)
- Form Data: `file`, `est_principale`, `ordre`, `legende`
- Returns: `{ id, url, legende, est_principale, ordre }`

### DELETE `/bateaux/{bateau_id}/images/{image_id}`
- Headers: `Authorization: Bearer {token}` (requis)
- Returns: 204 No Content

## Validation

### Frontend
- ✅ Conversion des IDs string → int
- ✅ Authentification avec JWT token
- ✅ Vérification du rôle superuser
- ✅ Gestion d'erreurs améliorée
- ✅ Messages d'erreur clairs en français
- ✅ Formulaire de login contrôlé

### Backend
- ✅ Validation du type `bateau_id: int`
- ✅ Authentification requise (`get_current_superuser`)
- ✅ Validation de la taille du fichier (5MB max)
- ✅ Validation du type de fichier (images uniquement)

## Erreurs Possibles et Solutions

### 422 Unprocessable Entity
- **Cause**: ID invalide
- **Solution**: Vérifier que l'ID du bateau existe dans la base de données

### 403 Forbidden
- **Cause**: Pas connecté ou pas admin
- **Solution**: Se connecter avec un compte admin via `/backoffice`

### 401 Unauthorized
- **Cause**: Token expiré
- **Solution**: Se reconnecter

### 413 Payload Too Large
- **Cause**: Fichier trop volumineux
- **Solution**: Réduire la taille de l'image (max 5MB)

### 415 Unsupported Media Type
- **Cause**: Format de fichier non supporté
- **Solution**: Utiliser JPG, PNG ou WEBP

## Tests Effectués

- [x] Conversion ID string → int
- [x] Login admin avec email/password
- [x] Vérification du rôle superuser
- [x] Upload photo principale avec auth
- [x] Upload galerie avec auth
- [x] Suppression d'image avec auth
- [x] Affichage des erreurs
- [x] Gestion des tokens JWT
- [x] Validation des fichiers

## Fichiers Modifiés

1. `safarifast/frontend/src/pages/admin/BateauEditor.tsx`
   - Conversion des IDs
   - Gestion d'erreurs améliorée

2. `safarifast/frontend/src/pages/BackofficeLoginPage.tsx`
   - Authentification réelle
   - Vérification du rôle admin
   - Gestion d'erreurs

## Statut

✅ **CORRIGÉ** - Les erreurs 422 et 403 sont résolues. L'upload fonctionne maintenant correctement avec authentification admin.

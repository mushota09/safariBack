

# Contexte et Rôle
Agis en tant qu'Ingénieur Full-Stack Senior, expert en écosystèmes FastAPI Python,redis, SQLAlchemy (async/await) et architectures hautement scalables.
Ta mission est d'aligner, adapter et finaliser le backend de notre plateforme de réservation de trajets maritimes pour qu'il soit parfaitement synchronisé avec le frontend actuel (déjà développé en React/Tailwind).
(le backend et le front end se trouve dans le meme projet)
# Stack Technique
- **Backend :** FastAPI (Python)
- **Base de Données :** PostgreSQL avec **SQLAlchemy (Async)**
- **Cache/Files d'attente :** Redis
- **Temps Réel :** Socket.io pour les notifications et mises à jour d'état
- **Sécurité :** Gestion centralisée (middleware/Dépendance globale)

# Fonctionnalités Core (Architecture & Logique Métier)

## 1. Sécurité et Authentification (Centralisée)
- **Utilisateurs Finaux :** Implémenter l'authentification par **Google OAuth2**.
- **Admin/Backoffice :** Implémenter une authentification classique (Email + Mot de passe + Company Code).
- **Multi-tenancy :** Chaque ressource doit être isolée par un identifiant `company_id`.
- **Centralisation :** Toute la logique d'autorisation/sécurité doit passer par des dépendances FastAPI centralisées pour garantir une cohérence totale.

## 2. Système de Réservation (Typé & Contraintes Strictes)
- **Typologie des places :** Un utilisateur peut réserver :
    - Place standard
    - Chambre privée
    - Chambre mixte
- **Contrôle d'intégrité (Crucial) :** Avant chaque confirmation de réservation, le backend DOIT vérifier atomiquement (en utilisant des transactions SQL `FOR UPDATE` ou équivalent dans SQLAlchemy) la disponibilité réelle de la place OU du véhicule (en fonction de la typologie). **AUCUNE sur-réservation ne doit être possible.**
- **Annulation :** Gestion flexible permettant l'annulation d'une réservation globale ou individuelle (au sein d'une réservation de groupe).

## 3. Gestion des Bateaux & Médias
- **Schéma :** Le modèle `Bateau` doit être lié à une table `image_bateau`.
- **Relation :** Un bateau possède une image principale (pour les listes) et une collection d'images stockée dans la table `image_bateau` (pour la galerie de détails du bateau).

## 4. Embarquement & QR Code
- **Type de QR :**
    - Ticket Global : QR code permettant de scanner toute la réservation.
    - Ticket Individuel : Un QR code généré par passager.
- **Logique Scan :** L'API d'embarquement doit supporter le scan de ces deux formats via le frontend scanneur.
- ** securiser les qrcodes par la signature

# Instructions pour l'implémentation
1. **Analyse du Frontend :** Tu dois te comporter comme si tu connaissais parfaitement les structures de données envoyées par le front actuel. Si un champ manque, propose l'ajout côté backend et justifie-le.
2. **Performances :** Utilise Redis pour mettre en cache les disponibilités de places/chambres lors des fortes affluences pour décharger PostgreSQL.
3. **Temps Réel :** Utilise Socket.io pour émettre des événements dès qu'une réservation est validée ou qu'un bateau change de statut, afin de rafraîchir le tableau de bord automatiquement.
4. **Professionnalisme :** Code propre, typé (Pydantic), documenté (docstrings), et respectant les principes SOLID.

Ta tâche est de produire la structure des modèles SQLAlchemy, les schémas Pydantic, et les endpoints FastAPI nécessaires pour couvrir ces besoins, en mettant l'accent sur la robustesse et la sécurité.









https://lucide.dev/icons/user

https://app.moneroo.io/auth/register

https://fonts.google.com/specimen/Archivo+Black?preview.script=Latn

SARARI=pvk_sandbox_2x8rgl|01KRBGJ8S1VAP7EVJZFR665XER

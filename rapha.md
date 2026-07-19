




<!-- https://lobehub.com/skills/africandigitalassetframework-africa-stack-skills-airtel-money -->

https://lucide.dev/icons/user

https://app.moneroo.io/auth/register

https://fonts.google.com/specimen/Archivo+Black?preview.script=Latn

SARARI=pvk_sandbox_2x8rgl|01KRBGJ8S1VAP7EVJZFR665XER


sur la page de dashboard actuelle tu vas commencer par supprimer ce qui existe pour mettre ce que je viens de te partager

`GET /api/analytics/dashboard/direction`

**Schéma de la réponse :**
```json
{
  "date_generation": "2026-06-07T10:00:00Z",
  "kpi_financiers": {
    "ca_aujourdhui": 12500.00,
    "ca_mois_en_cours": 245000.00,
    "ca_annee": 1890000.00,
    "objectif_mois": 300000.00,
    "progression_objectif": 81.67,
    "panier_moyen": 85.50,
    "taux_conversion": 92.5
  },
  "kpi_operationnels": {
    "voyages_aujourdhui": 12,
    "voyages_en_cours": 3,
    "taux_ponctualite_jour": 87.5,
    "taux_remplissage_jour": 78.3,
    "incidents_jour": 1
  },
  "kpi_clients": {
    "reservations_aujourdhui": 48,
    "nouveaux_clients_aujourdhui": 12,
    "total_clients_actifs": 3420,
    "satisfaction_moyenne": 4.2
  },

}
```

## 2. DASHBOARD OPÉRATIONS
**URL API :** `GET /api/analytics/dashboard/operations`

**Schéma :**
```json
{
  "date_generation": "...",
  "voyages_aujourdhui": [
    {
      "voyage_id": 1,
      "reference": "VOY-001",
      "date_depart_programmee": "2026-06-07T08:00:00Z",
      "date_depart_reelle": "2026-06-07T08:15:00Z",
      "retard_minutes": 15,
      "nombre_reservations": 45,
      "montant_ca": 3825.00,
      "taux_embarquement": 88.9,
      "nombre_absents": 5
    }
  ],
  "taux_remplissage_jour": 78.3,
  "embarquements_en_cours": 2,
  "incidents_signales": 1
}
```

## 3. DASHBOARD FINANCES
**URL API :** `GET /api/analytics/dashboard/finances`

**Schéma :**
```json
{
  "date_generation": "...",
  "ca_jour": 12500.00,
  "ca_mois": 245000.00,
  "paiements_en_attente": 15,
  "montant_en_attente": 1275.00,
  "remboursements_en_attente": 3,
  "montant_remboursements": 425.00
}
```

**Éléments :**
- Grosses cartes monétaires avec devise (CDF ou USD)
- Graphique d'évolution CA mensuel (barres ou ligne)
- Widget paiements en attente avec montant
- Widget remboursements en attente

## 4. PAIEMENT — Formulaire de traitement
**URL API :** `POST /api/paiements`

**Schéma de la requête :**
```json
{
  "reservation_id": 123,
  "mode_paiement": "carte | mobile money | virement | especes",
  "numero_carte": "4111111111111111",
  "cvv": "123",
  "date_expiration": "12/28",
  "telephone_mobile": "+243812345678",
  "operateur_mobile": "orange | airtel | vodacom",
  "iban": "CD123456789",
  "ip_client": "192.168.1.1",
  "user_agent": "..."
}
```

**Schéma réponse :**
```json
{
  "id": 1,
  "reservation_id": 123,
  "montant": 8500.00,
  "mode_paiement": "carte",
  "statut": "reussi | echoue | en cours",
  "reference_transaction": "TXN-ABC123DEF456",
  "date_paiement": "2026-06-07T10:00:00Z",
  "telephone_mobile": null,
  "operateur_mobile": null,
  "derniers_chiffres_carte": "1111",
  "message_erreur": null
}
```

**Éléments du formulaire :**
- Selecteur de mode de paiement (4 modes : carte, mobile money, virement, espèces)
- Champs dynamiques selon le mode choisi
  - Carte : numéro, CVV, date d'expiration
  - Mobile Money : téléphone, opérateur (select)
  - Virement : IBAN
  - Espèces : pas de champ supplémentaire
- Montant affiché en lecture seule (récupéré depuis la réservation)
- Bouton "Payer" avec loader/spinner
- Messages de succès/échec avec détails
- Affichage de la référence transaction après succès

## 5. PAIEMENT — Détail et historique
**URL API :** `GET /api/paiements/{id}`

**Mêmes champs que la réponse ci-dessus + `GET /api/paiements/reservation/{reservation_id}`**

**Éléments :**
- Carte récapitulative du paiement avec statut (badge coloré)
- Montant en gros
- Mode de paiement avec icône
- Horodatage
- Derniers chiffres carte masqués (si carte)
- Opérateur + téléphone (si mobile money)
- Message d'erreur si échec (rouge)
- Bouton "Voir la réservation associée"


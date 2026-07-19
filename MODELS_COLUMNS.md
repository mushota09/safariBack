
# Liste complète des colonnes de chaque modèle

## 1. MODELS DE BASE

### ModeleDeBase (classe abstraite)
- `date_creation`: DateTime (timezone=True), server_default=func.now(), nullable=False
- `date_modification`: DateTime (timezone=True), onupdate=func.now(), nullable=True
- `actif`: Boolean, default=True, nullable=False


## 2. COMPAGNIE ET BATEAUX

### CompagnieBateau
- `id`: Integer, primary_key=True, index=True
- `nom`: String(200), unique=True, nullable=False, index=True
- `telephone`: String(20), nullable=True
- `email`: String(255), nullable=True
- `adresse_siege`: Text, nullable=True
- `site_web`: String(255), nullable=True
- `logo`: String(500), nullable=True
- `numero_licence`: String(50), unique=True, nullable=False, index=True
- `numero_registre`: String(50), nullable=True
- `pays_immatriculation`: String(100), nullable=True
- `date_creation_compagnie`: Date, nullable=True
- `taux_commission`: Float, default=0.0, nullable=False
- `politique_annulation`: Text, nullable=True
- `code_admin`: String(50), unique=True, nullable=True, index=True

### TypeBateau
- `id`: Integer, primary_key=True, index=True
- `compagnie_id`: Integer, ForeignKey("compagnie_bateau.id"), nullable=False, index=True
- `nom`: String(100), nullable=False, index=True
- `capacite`: Integer, nullable=True
- `description`: Text, nullable=True

### Bateau
- `id`: Integer, primary_key=True, index=True
- `compagnie_id`: Integer, ForeignKey("compagnie_bateau.id"), nullable=False, index=True
- `type_bateau_id`: Integer, ForeignKey("type_bateau.id"), nullable=True, index=True
- `nom`: String(200), nullable=False, index=True
- `immatriculation`: String(50), unique=True, nullable=False, index=True
- `capacite_passagers`: Integer, nullable=False
- `vitesse_croisiere`: Float, nullable=True
- `wifi`: Boolean, default=False, nullable=False
- `restaurant`: Boolean, default=False, nullable=False
- `boutique`: Boolean, default=False, nullable=False
- `jeux`: Boolean, default=False, nullable=False
- `salon_coiffure`: Boolean, default=False, nullable=False
- `en_maintenance`: Boolean, default=False, nullable=False
- `is_accepted_vehicule`: Boolean, default=False, nullable=False
- `date_derniere_revision`: Date, nullable=True
- `date_prochaine_revision`: Date, nullable=True
- `photo_principale`: String(500), nullable=True
- `plan_bateau`: String(500), nullable=True
- `longueur`: Float, nullable=True
- `largeur`: Float, nullable=True
- `tonnage`: Float, nullable=True
- `tirant_eau`: Float, nullable=True
- `puissance_moteur`: Float, nullable=True

### BateauCapaciteVehicule
- `id`: Integer, primary_key=True, index=True
- `bateau_id`: Integer, ForeignKey("bateau.id"), nullable=False, index=True
- `type_vehicule_id`: Integer, ForeignKey("type_vehicule.id"), nullable=False, index=True
- `capacite`: Integer, nullable=False

### Niveau
- `id`: Integer, primary_key=True, index=True
- `bateau_id`: Integer, ForeignKey("bateau.id"), nullable=False, index=True
- `numero_niveau`: Integer, nullable=False
- `nom`: String(100), nullable=False
- `multiplicateur_prix`: Float, default=0.0, nullable=False
- `description`: Text, nullable=True

### Chambre
- `id`: Integer, primary_key=True, index=True
- `niveau_id`: Integer, ForeignKey("niveau.id"), nullable=False, index=True
- `numero_chambre`: String(20), nullable=False, index=True
- `prix_base`: Float, nullable=False
- `type_chambre`: TypeChambre (Enum), nullable=False
- `fenetre`: Boolean, default=False, nullable=False
- `salle_de_bain`: Boolean, default=False, nullable=False
- `disponible`: Boolean, default=True, nullable=False

### Lit
- `id`: Integer, primary_key=True, index=True
- `chambre_id`: Integer, ForeignKey("chambre.id"), nullable=False, index=True
- `numero_lit`: String(20), nullable=False
- `disponible`: Boolean, default=True, nullable=False
- `prix_supplementaire`: Float, default=0.0, nullable=False
- `type_lit`: TypeLit (Enum), nullable=False
- `taille`: String(50), nullable=True

### Chaise
- `id`: Integer, primary_key=True, index=True
- `numero_chaise`: String(20), nullable=False
- `disponible`: Boolean, default=True, nullable=False
- `prix_supplementaire`: Float, default=0.0, nullable=False


## 3. DOCUMENTS VOYAGEURS

### DocumentVoyageur
- `id`: Integer, primary_key=True, index=True
- `utilisateur_id`: Integer, ForeignKey("utilisateur.id"), nullable=False, index=True
- `type_document`: TypeDocument (Enum), nullable=False
- `numero_document`: String(100), nullable=False, index=True
- `pays_emission`: String(100), nullable=False
- `date_delivrance`: Date, nullable=True
- `date_expiration`: Date, nullable=True
- `fichier_scan`: String(500), nullable=True
- `verifie`: Boolean, default=False, nullable=False


## 4. JOURNAL

### Journal
- `id`: Integer, primary_key=True, index=True
- `utilisateur_id`: Integer, ForeignKey("utilisateur.id"), nullable=True, index=True
- `action`: String(200), nullable=False, index=True
- `ip_adresse`: String(50), nullable=True
- `details`: Text, nullable=True
- `niveau_log`: NiveauLog (Enum), default=NiveauLog.INFO, nullable=False, index=True
- `date_creation`: DateTime (timezone=True), default=datetime.utcnow, nullable=False, index=True


## 5. PAIEMENT

### Paiement
- `id`: Integer, primary_key=True, index=True
- `reservation_id`: Integer, ForeignKey("reservation.id"), unique=True, nullable=False, index=True
- `montant`: Float, nullable=False
- `mode_paiement`: ModePaiement (Enum), nullable=False
- `statut`: StatutPaiement (Enum), default=StatutPaiement.initie, nullable=False, index=True
- `reference_transaction`: String(200), unique=True, nullable=False, index=True
- `date_paiement`: DateTime (timezone=True), nullable=True
- `telephone_mobile`: String(20), nullable=True
- `operateur_mobile`: String(50), nullable=True
- `derniers_chiffres_carte`: String(4), nullable=True
- `ip_client`: String(50), nullable=True
- `user_agent`: Text, nullable=True
- `message_erreur`: Text, nullable=True


## 6. PRICING

### PricingPassager
- `id`: Integer, primary_key=True, index=True
- `traversee_id`: Integer, ForeignKey("traversee.id", ondelete="CASCADE"), nullable=False, index=True
- `prix_standard`: Float, nullable=False
- `prix_premium`: Float, nullable=False
- `prix_vip`: Float, nullable=False
- `actif`: Boolean, default=True, nullable=False
- `date_creation`: DateTime (timezone=True), default=datetime.utcnow, nullable=False

### TypeVehicule
- `id`: Integer, primary_key=True, index=True
- `nom`: String(100), unique=True, nullable=False, index=True
- `description`: String(255), nullable=True
- `longueur_max_metres`: Float, nullable=True
- `largeur_max_metres`: Float, nullable=True
- `hauteur_max_metres`: Float, nullable=True
- `poids_max_tonnes`: Float, nullable=True
- `actif`: Boolean, default=True, nullable=False
- `date_creation`: DateTime (timezone=True), default=datetime.utcnow, nullable=False

### PricingVehicule
- `id`: Integer, primary_key=True, index=True
- `traversee_id`: Integer, ForeignKey("traversee.id", ondelete="CASCADE"), nullable=False, index=True
- `type_vehicule_id`: Integer, ForeignKey("type_vehicule.id", ondelete="RESTRICT"), nullable=False, index=True
- `prix`: Float, nullable=False
- `actif`: Boolean, default=True, nullable=False
- `date_creation`: DateTime (timezone=True), default=datetime.utcnow, nullable=False

### PricingColis
- `id`: Integer, primary_key=True, index=True
- `traversee_id`: Integer, ForeignKey("traversee.id", ondelete="CASCADE"), nullable=False, index=True
- `prix_par_kg`: Float, nullable=False
- `actif`: Boolean, default=True, nullable=False
- `date_creation`: DateTime (timezone=True), default=datetime.utcnow, nullable=False


## 7. PROMOTION

### Promotion
- `id`: Integer, primary_key=True, index=True
- `compagnie_id`: Integer, ForeignKey("compagnie_bateau.id"), nullable=False, index=True
- `code_promo`: String(50), unique=True, nullable=False, index=True
- `description`: Text, nullable=True
- `type_reduction`: TypeReduction (Enum), nullable=False
- `valeur_reduction`: Float, nullable=False
- `date_debut`: Date, nullable=False
- `date_fin`: Date, nullable=False
- `actif`: Boolean, default=True, nullable=False
- `nombre_utilisations_max`: Integer, nullable=True
- `nombre_utilisations`: Integer, default=0, nullable=False


## 8. REMBOURSEMENT

### Remboursement
- `id`: Integer, primary_key=True, index=True
- `reference_remboursement`: String(100), unique=True, nullable=False, index=True
- `reservation_id`: Integer, ForeignKey("reservation.id"), nullable=False, index=True
- `paiement_id`: Integer, ForeignKey("paiement.id"), nullable=False
- `passager_id`: Integer, ForeignKey("reservation_passager.id"), nullable=True, index=True
- `vehicule_id`: Integer, ForeignKey("reservation_vehicule.id"), nullable=True, index=True
- `colis_id`: Integer, ForeignKey("reservation_colis.id"), nullable=True, index=True
- `montant_paye`: Numeric(10,2), nullable=False
- `pourcentage_frais`: Numeric(5,2), nullable=False
- `montant_frais`: Numeric(10,2), nullable=False
- `montant_remboursement`: Numeric(10,2), nullable=False
- `date_demande`: DateTime (timezone=True), nullable=False, index=True
- `date_depart_voyage`: DateTime (timezone=True), nullable=False
- `delai_heures`: Numeric(10,2), nullable=False
- `statut`: String(50), nullable=False, index=True
- `raison_demande`: Text, nullable=False
- `raison_rejet`: Text, nullable=True
- `approuve_par_id`: Integer, ForeignKey("utilisateur.id"), nullable=True
- `approuve_par_nom`: String(200), nullable=True
- `date_approbation`: DateTime (timezone=True), nullable=True
- `rembourse_par_id`: Integer, ForeignKey("utilisateur.id"), nullable=True
- `rembourse_par_nom`: String(200), nullable=True
- `date_remboursement`: DateTime (timezone=True), nullable=True
- `numero_transaction`: String(100), nullable=True
- `methode_remboursement`: String(50), nullable=False
- `details_remboursement`: JSON, nullable=True
- `date_creation`: DateTime (timezone=True), default=datetime.utcnow, nullable=False
- `date_modification`: DateTime (timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False


## 9. RESERVATION

### Reservation
- `id`: Integer, primary_key=True, index=True
- `reference_reservation`: String(100), unique=True, nullable=False, index=True
- `utilisateur_id`: Integer, ForeignKey("utilisateur.id"), nullable=False, index=True
- `voyage_id`: Integer, ForeignKey("programme_voyage.id"), nullable=False, index=True
- `type_reservation`: TypeReservation (Enum), nullable=False
- `montant_total`: Float, nullable=False
- `date_reservation`: DateTime (timezone=True), default=datetime.utcnow, nullable=False
- `date_expiration_paiement`: DateTime (timezone=True), nullable=True
- `statut_reservation`: StatutReservation (Enum), default=StatutReservation.en_attente, nullable=False, index=True
- `frais_annulation`: Float, nullable=True
- `date_annulation`: DateTime (timezone=True), nullable=True
- `raison_annulation`: Text, nullable=True
- `is_front`: Boolean, default=False, nullable=False
- `expediteur_nom`: String(200), nullable=True
- `expediteur_telephone`: String(50), nullable=True
- `destinataire_nom`: String(200), nullable=True
- `destinataire_telephone`: String(50), nullable=True

### ReservationPassager
- `id`: Integer, primary_key=True, index=True
- `reservation_id`: Integer, ForeignKey("reservation.id", ondelete="CASCADE"), nullable=False, index=True
- `nom_complet`: String(200), nullable=False
- `email`: String(255), nullable=True
- `telephone`: String(50), nullable=True
- `date_naissance`: String(20), nullable=True
- `numero_identite`: String(100), nullable=True
- `classe_passager`: ClassePassager (Enum), default=ClassePassager.standard, nullable=False, index=True
- `niveau_id`: Integer, ForeignKey("niveau.id"), nullable=True, index=True
- `chambre_id`: Integer, ForeignKey("chambre.id"), nullable=True, index=True
- `lit_id`: Integer, ForeignKey("lit.id"), nullable=True, index=True
- `chaise_id`: Integer, ForeignKey("chaise.id"), nullable=True, index=True
- `is_principal`: Boolean, default=False, nullable=False
- `date_enregistrement`: DateTime (timezone=True), default=datetime.utcnow, nullable=False
- `montant`: Float, nullable=True
- `rembourse`: Boolean, default=False, nullable=False
- `frais_annulation`: Float, nullable=True
- `date_annulation`: DateTime (timezone=True), nullable=True
- `raison_annulation`: Text, nullable=True
- `embarque`: Boolean, default=False, nullable=False
- `date_embarquement`: DateTime (timezone=True), nullable=True
- `agent_embarquement_id`: Integer, ForeignKey("utilisateur.id"), nullable=True, index=True
- `agent_embarquement_nom`: String(200), nullable=True
- `identite_verifiee`: Boolean, default=False, nullable=False
- `document_verifie_type`: String(50), nullable=True
- `document_verifie_numero`: String(100), nullable=True

### ReservationVehicule
- `id`: Integer, primary_key=True, index=True
- `reservation_id`: Integer, ForeignKey("reservation.id", ondelete="CASCADE"), nullable=False, index=True
- `type_vehicule_id`: Integer, ForeignKey("type_vehicule.id", ondelete="RESTRICT"), nullable=False, index=True
- `immatriculation`: String(50), nullable=False, index=True
- `marque`: String(100), nullable=True
- `modele`: String(100), nullable=True
- `couleur`: String(50), nullable=True
- `annee`: String(10), nullable=True
- `date_enregistrement`: DateTime (timezone=True), default=datetime.utcnow, nullable=False
- `montant`: Float, nullable=True
- `rembourse`: Boolean, default=False, nullable=False
- `frais_annulation`: Float, nullable=True
- `date_annulation`: DateTime (timezone=True), nullable=True
- `raison_annulation`: Text, nullable=True
- `embarque`: Boolean, default=False, nullable=False
- `date_embarquement`: DateTime (timezone=True), nullable=True
- `agent_embarquement_id`: Integer, ForeignKey("utilisateur.id"), nullable=True, index=True
- `agent_embarquement_nom`: String(200), nullable=True

### ReservationColis
- `id`: Integer, primary_key=True, index=True
- `reservation_id`: Integer, ForeignKey("reservation.id", ondelete="CASCADE"), nullable=False, index=True
- `description_marchandises`: Text, nullable=False
- `poids_kg`: Float, nullable=False
- `montant_par_kg`: Float, nullable=False
- `montant_total`: Float, nullable=False
- `date_enregistrement`: DateTime (timezone=True), default=datetime.utcnow, nullable=False
- `rembourse`: Boolean, default=False, nullable=False
- `frais_annulation`: Float, nullable=True
- `date_annulation`: DateTime (timezone=True), nullable=True
- `raison_annulation`: Text, nullable=True
- `embarque`: Boolean, default=False, nullable=False
- `date_embarquement`: DateTime (timezone=True), nullable=True
- `agent_embarquement_id`: Integer, ForeignKey("utilisateur.id"), nullable=True, index=True
- `agent_embarquement_nom`: String(200), nullable=True
- `est_absent`: Boolean, default=False, nullable=False
- `date_marquage_absent`: DateTime (timezone=True), nullable=True
- `raison_absence`: String(500), nullable=True


## 10. TICKET

### Ticket
- `id`: Integer, primary_key=True, index=True
- `reservation_id`: Integer, ForeignKey("reservation.id"), unique=True, nullable=False, index=True
- `numero_ticket`: String(100), unique=True, nullable=False, index=True
- `qr_payload`: Text, nullable=False
- `qr_signature`: String(128), nullable=False
- `nombre_passagers`: Integer, default=0, nullable=False
- `nombre_vehicules`: Integer, default=0, nullable=False
- `nombre_colis`: Integer, default=0, nullable=False
- `pdf_genere`: Boolean, default=False, nullable=False
- `date_envoi_email`: DateTime (timezone=True), nullable=True
- `embarque`: Boolean, default=False, nullable=False
- `date_embarquement`: DateTime (timezone=True), nullable=True


## 11. TRAVERSEE ET TARIFS SAISONNIERS

### Traversee
- `id`: Integer, primary_key=True, index=True
- `compagnie_id`: Integer, ForeignKey("compagnie_bateau.id"), nullable=False, index=True
- `port_depart_id`: Integer, ForeignKey("port.id"), nullable=False, index=True
- `port_arrivee_id`: Integer, ForeignKey("port.id"), nullable=False, index=True
- `prix_base`: Float, nullable=False
- `distance_milles`: Float, nullable=True
- `duree_estimative`: Integer, nullable=True

### TarifSaisonnier
- `id`: Integer, primary_key=True, index=True
- `traversee_id`: Integer, ForeignKey("traversee.id"), nullable=False, index=True
- `type_saison`: TypeSaison (Enum), nullable=False
- `date_debut`: Date, nullable=False
- `date_fin`: Date, nullable=False
- `coefficient`: Float, default=1.0, nullable=False


## 12. UTILISATEURS

### Utilisateur
- `id`: Integer, primary_key=True, index=True
- `username`: String(50), unique=True, nullable=False, index=True
- `email`: String(255), unique=True, nullable=False, index=True
- `numero_telephone`: String(20), unique=True, nullable=True, index=True
- `hashed_password`: String(255), nullable=False
- `is_active`: Boolean, default=True, nullable=False
- `is_superuser`: Boolean, default=False, nullable=False
- `nom_complet`: String(200), nullable=True
- `photo_profil`: String(500), nullable=True
- `date_naissance`: Date, nullable=True
- `document_identite`: String(100), nullable=True, index=True
- `nationalite`: String(100), nullable=True
- `sexe`: SexeUtilisateur (Enum), nullable=True
- `langue_preferee`: String(5), default="fr", nullable=False
- `notification_email`: Boolean, default=True, nullable=False
- `notification_sms`: Boolean, default=False, nullable=False
- `role`: RoleUtilisateur (Enum), default=RoleUtilisateur.client, nullable=False, index=True
- `compagnie_id`: Integer, ForeignKey("compagnie_bateau.id"), nullable=True, index=True
- (Hérite de ModeleDeBase: `date_creation`, `date_modification`, `actif`)


## 13. VOYAGE (ProgrammeVoyage)

### ProgrammeVoyage
- `id`: Integer, primary_key=True, index=True
- `bateau_id`: Integer, ForeignKey("bateau.id"), nullable=False, index=True
- `compagnie_id`: Integer, ForeignKey("compagnie_bateau.id"), nullable=False, index=True
- `port_depart_id`: Integer, ForeignKey("port.id"), nullable=False, index=True
- `port_arrivee_id`: Integer, ForeignKey("port.id"), nullable=False, index=True
- `route_id`: Integer, ForeignKey("traversee.id"), nullable=True, index=True
- `date_depart_reel`: DateTime (timezone=True), nullable=True
- `date_arrivee_reelle`: DateTime (timezone=True), nullable=True
- `date_depart_programme`: DateTime (timezone=True), nullable=False, index=True
- `date_arrivee_programmee`: DateTime (timezone=True), nullable=False, index=True
- `prix_base`: Float, nullable=False
- `statut`: StatutVoyage (Enum), default=StatutVoyage.programme, nullable=False, index=True
- `places_vendues_passagers`: Integer, default=0, nullable=False
- `places_vendues_vehicules`: Integer, default=0, nullable=False
- `places_disponibles_passagers`: Integer, nullable=False
- `places_disponibles_vehicules`: Integer, nullable=False
- `prix_promotionnel`: Float, nullable=True
- `reduction_groupe`: Float, nullable=True
- `capitaine_nom`: String(200), nullable=True
- `equipage_nombre`: Integer, nullable=True
- `remarques`: Text, nullable=True
- `retard_motif`: Text, nullable=True
- `annulation_motif`: Text, nullable=True


## 14. GEOGRAPHIE (Pays, Ville, Port)

### Pays
- `id`: Integer, primary_key=True, index=True
- `nom`: String(100), unique=True, nullable=False, index=True
- `code`: String(3), unique=True, nullable=False, index=True

### Ville
- `id`: Integer, primary_key=True, index=True
- `pays_id`: Integer, ForeignKey("pays.id"), nullable=False, index=True
- `nom`: String(100), nullable=False, index=True
- `latitude`: Float, nullable=True
- `longitude`: Float, nullable=True

### Port
- `id`: Integer, primary_key=True, index=True
- `ville_id`: Integer, ForeignKey("ville.id"), nullable=False, index=True
- `nom`: String(200), nullable=False, index=True
- `latitude`: Float, nullable=True
- `longitude`: Float, nullable=True
- `adresse`: Text, nullable=True
- `horaires_ouverture`: String(10), nullable=True
- `horaires_fermeture`: String(10), nullable=True
- `capacite_quai`: Integer, nullable=True
- `code_international`: String(10), unique=True, nullable=False, index=True
- `installations`: Text, nullable=True


## 15. IMAGES BATEAUX

### ImageBateau
- `id`: Integer, primary_key=True, index=True
- `bateau_id`: Integer, ForeignKey("bateau.id", ondelete="CASCADE"), nullable=False, index=True
- `url`: String(500), nullable=False
- `legende`: String(255), nullable=True
- `description`: Text, nullable=True
- `est_principale`: Boolean, default=False, nullable=False
- `ordre`: Integer, default=0, nullable=False
- `date_ajout`: DateTime (timezone=True), server_default=func.now(), nullable=False


## 16. EQUIPAGE

### EquipageRole
- `id`: Integer, primary_key=True, index=True
- `nom`: String(100), unique=True, nullable=False, index=True
- `description`: Text, nullable=True
- `niveau_hierarchique`: Integer, nullable=True

### Certification
- `id`: Integer, primary_key=True, index=True
- `nom`: String(100), unique=True, nullable=False, index=True
- `description`: Text, nullable=True
- `duree_validite_mois`: Integer, nullable=True

### MembreEquipage
- `id`: Integer, primary_key=True, index=True
- `nom_complet`: String(200), nullable=False, index=True
- `sexe`: String(10), nullable=False
- `date_naissance`: Date, nullable=True
- `nationalite`: String(100), nullable=True
- `telephone`: String(20), nullable=True
- `email`: String(255), nullable=True
- `adresse`: Text, nullable=True
- `numero_licence`: String(50), unique=True, nullable=False, index=True
- `role_id`: Integer, ForeignKey("equipage_role.id"), nullable=False, index=True
- `bateau_id`: Integer, ForeignKey("bateau.id"), nullable=False, index=True
- `statut`: String(20), default=StatutEquipage.actif, nullable=False, index=True
- `date_embauche`: Date, nullable=True
- `date_fin_contrat`: Date, nullable=True
- `photo_profil`: String(500), nullable=True
- `photo_carte_identite`: String(500), nullable=True
- `annees_experience`: Integer, nullable=True
- `contact_urgence_nom`: String(200), nullable=True
- `contact_urgence_telephone`: String(20), nullable=True
- `date_creation`: DateTime (timezone=True), default=datetime.utcnow, nullable=False
- `date_modification`: DateTime (timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False

### EquipageCertification
- `id`: Integer, primary_key=True, index=True
- `membre_equipage_id`: Integer, ForeignKey("membre_equipage.id"), nullable=False, index=True
- `certification_id`: Integer, ForeignKey("certification.id"), nullable=False, index=True
- `date_obtention`: Date, nullable=False
- `date_expiration`: Date, nullable=True
- `numero_certificat`: String(100), nullable=True
- `organisme_delivrance`: String(200), nullable=True
- `est_valide`: Boolean, default=True, nullable=False


## 17. EMBARQUEMENT LOG

### EmbarquementLog
- `id`: Integer, primary_key=True, index=True
- `ticket_id`: Integer, ForeignKey("ticket.id"), nullable=False, index=True
- `numero_ticket`: String(100), nullable=False, index=True
- `agent_id`: Integer, ForeignKey("utilisateur.id"), nullable=False, index=True
- `agent_nom`: String(200), nullable=False
- `action`: String(50), nullable=False, index=True
- `date_action`: DateTime (timezone=True), default=datetime.utcnow, nullable=False, index=True
- `details`: JSON, nullable=True
- `commentaire`: Text, nullable=True

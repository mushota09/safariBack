# PROMPT POUR IA — Implémentation P2P Offline-First Embarquement Safari

> **Contexte** : Tu es un expert en développement Android Kotlin et en architectures distribuées offline-first. Tu dois implémenter le module embarquement P2P de l'application Safari.
> **Règle absolue** : Ne commence pas à coder. Lis tout ce prompt, pose des questions de clarification si nécessaire, puis établis un plan d'implémentation technique étape par étape avant d'écrire la moindre ligne de code.


## 1. CONTEXTE DU PROJET EXISTANT

### 1.1 Description générale
Safari est une API de réservation de billets de bateau (ferry) construite avec **FastAPI + SQLAlchemy 2.0 async + PostgreSQL + Redis**. Le backend est déjà complet et fonctionnel. L'application mobile Android (Kotlin) est en cours de développement.

### 1.2 Stack technique backend (déjà existante)
- **Framework** : FastAPI 0.109+ (Python 3.11+)
- **ORM** : SQLAlchemy 2.0 avec `asyncpg` (tout est asynchrone)
- **Base de données** : PostgreSQL (cloud Neon ou local)
- **Cache** : Redis 7 (cache + pub/sub)
- **Auth** : JWT (python-jose), Argon2 pour les mots de passe, Google OAuth 2.0
- **Email** : aiosmtplib + Jinja2 templates
- **PDF** : ReportLab (génération de billets)
- **QR Code** : qrcode[pil]
- **Signature tickets** : Clé privée côté backend (HMAC), payload JSON signé
- **Gestion des paquets** : `uv`

### 1.3 Architecture backend
Le backend est organisé en modules métiers sous `app/modules/` :
- `auth/` — Authentification JWT, register, login, refresh, Google OAuth, OTP reset
- `compagnie/` — CRUD compagnies, bateaux, types, galerie
- `traversee/` — Recherche de traversées avec cache Redis
- `reservation/` — Réservations unifiées (passager/véhicule/colis), verrou optimiste, front-office
- `paiement/` — Paiement simulé (carte, mobile money, virement, espèces), génération ticket PDF
- `embarquement/` — Scan QR code, vérification billet (API key sécurisée)
- `remboursement/` — Gestion des remboursements
- `equipage/` — Gestion membres d'équipage
- `websocket/` — Temps réel disponibilité par voyage
- `geographie/` — Ports, villes, coordonnées GPS
- `analytics/` — Dashboards, rapports financiers, opérationnels, clients

---

## 2. MODÈLES DE DONNÉES DU BACKEND (SQLALCHEMY 2.0)

### 2.1 Modèle de base (`app/models/base.py`)
```python
from datetime import datetime
from sqlalchemy import Boolean, DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class ModeleDeBase(Base):
    __abstract__ = True
    date_creation: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    date_modification: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    actif: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
```

### 2.2 Utilisateur (`app/models/utilisateur.py`)
```python
class RoleUtilisateur(str, enum.Enum):
    client = "client"
    admin_compagnie = "admin_compagnie"
    super_admin = "super_admin"
    agent = "agent"  # Personne qui scanne le QR code lors de l'embarquement

class SexeUtilisateur(str, enum.Enum):
    masculin = "masculin"
    feminin = "feminin"

class Utilisateur(ModeleDeBase):
    __tablename__ = "utilisateur"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    numero_telephone: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    nom_complet: Mapped[str | None] = mapped_column(String(200), nullable=True)
    photo_profil: Mapped[str | None] = mapped_column(String(500), nullable=True)
    date_naissance: Mapped[date | None] = mapped_column(Date, nullable=True)
    document_identite: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    nationalite: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sexe: Mapped[SexeUtilisateur | None] = mapped_column(SQLEnum(SexeUtilisateur), nullable=True)
    langue_preferee: Mapped[str] = mapped_column(String(5), default="fr", nullable=False)
    notification_email: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notification_sms: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    role: Mapped[RoleUtilisateur] = mapped_column(SQLEnum(RoleUtilisateur), default=RoleUtilisateur.client, nullable=False, index=True)
    compagnie_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("compagnie_bateau.id"), nullable=True, index=True)
    # Relations
    reservations: Mapped[List["Reservation"]] = relationship("Reservation", back_populates="utilisateur")
    journaux: Mapped[List["Journal"]] = relationship("Journal", back_populates="utilisateur")
    documents: Mapped[List["DocumentVoyageur"]] = relationship("DocumentVoyageur", back_populates="utilisateur")
```

**Important pour l'embarquement :** Le rôle `agent` est celui qui scanne les QR codes. Les agents peuvent être liés à une compagnie via `compagnie_id`.

### 2.3 Voyage (`app/models/voyage.py`)
```python
class StatutVoyage(str, enum.Enum):
    programme = "programme"
    confirme = "confirme"
    annule = "annule"
    retarde = "retarde"
    complet = "complet"
    termine = "termine"

class ProgrammeVoyage(Base):
    __tablename__ = "programme_voyage"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bateau_id: Mapped[int] = mapped_column(Integer, ForeignKey("bateau.id"), nullable=False, index=True)
    compagnie_id: Mapped[int] = mapped_column(Integer, ForeignKey("compagnie_bateau.id"), nullable=False, index=True)
    port_depart_id: Mapped[int] = mapped_column(Integer, ForeignKey("port.id"), nullable=False, index=True)
    port_arrivee_id: Mapped[int] = mapped_column(Integer, ForeignKey("port.id"), nullable=False, index=True)
    route_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("traversee.id"), nullable=True, index=True)
    date_depart_reel: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_arrivee_reelle: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_depart_programme: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    date_arrivee_programmee: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    prix_base: Mapped[float] = mapped_column(Float, nullable=False)
    statut: Mapped[StatutVoyage] = mapped_column(SQLEnum(StatutVoyage), default=StatutVoyage.programme, nullable=False, index=True)
    places_vendues_passagers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    places_vendues_vehicules: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    places_disponibles_passagers: Mapped[int] = mapped_column(Integer, nullable=False)
    places_disponibles_vehicules: Mapped[int] = mapped_column(Integer, nullable=False)
    prix_promotionnel: Mapped[float | None] = mapped_column(Float, nullable=True)
    reduction_groupe: Mapped[float | None] = mapped_column(Float, nullable=True)
    capitaine_nom: Mapped[str | None] = mapped_column(String(200), nullable=True)
    equipage_nombre: Mapped[int | None] = mapped_column(Integer, nullable=True)
    remarques: Mapped[str | None] = mapped_column(Text, nullable=True)
    retard_motif: Mapped[str | None] = mapped_column(Text, nullable=True)
    annulation_motif: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Relations
    bateau: Mapped["Bateau"] = relationship("Bateau", back_populates="voyages")
    compagnie: Mapped["CompagnieBateau"] = relationship("CompagnieBateau", back_populates="voyages")
    port_depart: Mapped["Port"] = relationship("Port", foreign_keys=[port_depart_id], back_populates="voyages_depart")
    port_arrivee: Mapped["Port"] = relationship("Port", foreign_keys=[port_arrivee_id], back_populates="voyages_arrivee")
    route: Mapped["Traversee | None"] = relationship("Traversee", back_populates="voyages")
    reservations: Mapped[List["Reservation"]] = relationship("Reservation", back_populates="voyage")
    pricing_passagers: Mapped[List["PricingPassager"]] = relationship("PricingPassager", back_populates="voyage", cascade="all, delete-orphan")
    pricing_vehicules: Mapped[List["PricingVehicule"]] = relationship("PricingVehicule", back_populates="voyage", cascade="all, delete-orphan")
    pricing_colis: Mapped[List["PricingColis"]] = relationship("PricingColis", back_populates="voyage", cascade="all, delete-orphan")
    def get_disponibilite(self) -> Dict[str, Any]:
        return {
            "voyage_id": self.id,
            "places_disponibles_passagers": self.places_disponibles_passagers - self.places_vendues_passagers,
            "places_disponibles_vehicules": self.places_disponibles_vehicules - self.places_vendues_vehicules,
            "places_totales_passagers": self.places_disponibles_passagers,
            "places_totales_vehicules": self.places_disponibles_vehicules,
            "places_vendues_passagers": self.places_vendues_passagers,
            "places_vendues_vehicules": self.places_vendues_vehicules,
            "statut": self.statut.value,
            "complet": (self.places_vendues_passagers >= self.places_disponibles_passagers or self.statut == StatutVoyage.complet)
        }
```

### 2.4 Réservation — Modèle principal (`app/models/reservation.py`)
```python
class ClassePassager(str, enum.Enum):
    standard = "standard"
    premium = "premium"
    vip = "vip"

class TypeReservation(str, enum.Enum):
    passager = "passager"
    vehicule = "vehicule"
    colis = "colis"

class StatutReservation(str, enum.Enum):
    en_attente = "en attente"
    confirme = "confirme"
    annule = "annule"
    termine = "termine"

class Reservation(Base):
    __tablename__ = "reservation"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reference_reservation: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    utilisateur_id: Mapped[int] = mapped_column(Integer, ForeignKey("utilisateur.id"), nullable=False, index=True)
    voyage_id: Mapped[int] = mapped_column(Integer, ForeignKey("programme_voyage.id"), nullable=False, index=True)
    type_reservation: Mapped[TypeReservation] = mapped_column(SQLEnum(TypeReservation), nullable=False)
    montant_total: Mapped[float] = mapped_column(Float, nullable=False)
    date_reservation: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    date_expiration_paiement: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    statut_reservation: Mapped[StatutReservation] = mapped_column(SQLEnum(StatutReservation), default=StatutReservation.en_attente, nullable=False, index=True)
    frais_annulation: Mapped[float | None] = mapped_column(Float, nullable=True)
    date_annulation: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raison_annulation: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_front: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # False = back-office, True = auto-réservation client
    # Contact expéditeur/destinataire (pour colis)
    expediteur_nom: Mapped[str | None] = mapped_column(String(200), nullable=True)
    expediteur_telephone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    destinataire_nom: Mapped[str | None] = mapped_column(String(200), nullable=True)
    destinataire_telephone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Relations
    utilisateur: Mapped["Utilisateur"] = relationship("Utilisateur", back_populates="reservations")
    voyage: Mapped["ProgrammeVoyage"] = relationship("ProgrammeVoyage", back_populates="reservations")
    paiement: Mapped["Paiement | None"] = relationship("Paiement", back_populates="reservation", uselist=False)
    ticket: Mapped["Ticket | None"] = relationship("Ticket", back_populates="reservation", uselist=False)
    passagers_details: Mapped[List["ReservationPassager"]] = relationship("ReservationPassager", back_populates="reservation", cascade="all, delete-orphan")
    vehicules_details: Mapped[List["ReservationVehicule"]] = relationship("ReservationVehicule", back_populates="reservation", cascade="all, delete-orphan")
    colis_details: Mapped[List["ReservationColis"]] = relationship("ReservationColis", back_populates="reservation", cascade="all, delete-orphan")
    @property
    def nombre_passagers(self) -> int:
        return len(self.passagers_details) if self.passagers_details else 0
    @property
    def nombre_vehicules(self) -> int:
        return len(self.vehicules_details) if self.vehicules_details else 0
    @property
    def nombre_colis(self) -> int:
        return len(self.colis_details) if self.colis_details else 0
```

### 2.5 Détails passager (`app/models/reservation.py` — `ReservationPassager`)
```python
class ReservationPassager(Base):
    __tablename__ = "reservation_passager"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(Integer, ForeignKey("reservation.id", ondelete="CASCADE"), nullable=False, index=True)
    nom_complet: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telephone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date_naissance: Mapped[str | None] = mapped_column(String(20), nullable=True)
    numero_identite: Mapped[str | None] = mapped_column(String(100), nullable=True)
    classe_passager: Mapped[ClassePassager] = mapped_column(SQLEnum(ClassePassager), default=ClassePassager.standard, nullable=False, index=True)
    niveau_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("niveau.id"), nullable=True, index=True)
    chambre_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("chambre.id"), nullable=True, index=True)
    lit_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("lit.id"), nullable=True, index=True)
    chaise_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("chaise.id"), nullable=True, index=True)
    is_principal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_enregistrement: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    montant: Mapped[float | None] = mapped_column(Float, nullable=True)
    rembourse: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    frais_annulation: Mapped[float | None] = mapped_column(Float, nullable=True)
    date_annulation: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raison_annulation: Mapped[str | None] = mapped_column(Text, nullable=True)
    # === EMBARQUEMENT ===
    embarque: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_embarquement: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    agent_embarquement_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("utilisateur.id"), nullable=True, index=True)
    agent_embarquement_nom: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # Vérification identité
    identite_verifiee: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    document_verifie_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    document_verifie_numero: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reservation: Mapped["Reservation"] = relationship("Reservation", back_populates="passagers_details")
```

**Champs critiques pour l'embarquement :**
- `embarque` (bool) — Le passager est-il monté à bord ?
- `date_embarquement` — Quand ?
- `agent_embarquement_id` — Qui l'a scanné ? (référence `utilisateur.id`)
- `agent_embarquement_nom` — Nom de l'agent (denormalisé pour l'audit)
- `identite_verifiee` — La pièce d'identité a-t-elle été vérifiée ?
- `document_verifie_type` / `document_verifie_numero` — Quel document a été vérifié ?

### 2.6 Détails véhicule (`app/models/reservation.py` — `ReservationVehicule`)
```python
class ReservationVehicule(Base):
    __tablename__ = "reservation_vehicule"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(Integer, ForeignKey("reservation.id", ondelete="CASCADE"), nullable=False, index=True)
    type_vehicule_id: Mapped[int] = mapped_column(Integer, ForeignKey("type_vehicule.id", ondelete="RESTRICT"), nullable=False, index=True)
    immatriculation: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    marque: Mapped[str | None] = mapped_column(String(100), nullable=True)
    modele: Mapped[str | None] = mapped_column(String(100), nullable=True)
    couleur: Mapped[str | None] = mapped_column(String(50), nullable=True)
    annee: Mapped[str | None] = mapped_column(String(10), nullable=True)
    date_enregistrement: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    montant: Mapped[float | None] = mapped_column(Float, nullable=True)
    rembourse: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    frais_annulation: Mapped[float | None] = mapped_column(Float, nullable=True)
    date_annulation: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raison_annulation: Mapped[str | None] = mapped_column(Text, nullable=True)
    # === EMBARQUEMENT ===
    embarque: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_embarquement: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    agent_embarquement_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("utilisateur.id"), nullable=True, index=True)
    agent_embarquement_nom: Mapped[str | None] = mapped_column(String(200), nullable=True)
    reservation: Mapped["Reservation"] = relationship("Reservation", back_populates="vehicules_details")
    type_vehicule: Mapped["TypeVehicule"] = relationship("TypeVehicule")
```

### 2.7 Détails colis (`app/models/reservation.py` — `ReservationColis`)
```python
class ReservationColis(Base):
    __tablename__ = "reservation_colis"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(Integer, ForeignKey("reservation.id", ondelete="CASCADE"), nullable=False, index=True)
    description_marchandises: Mapped[str] = mapped_column(Text, nullable=False)
    poids_kg: Mapped[float] = mapped_column(Float, nullable=False)
    montant_par_kg: Mapped[float] = mapped_column(Float, nullable=False)
    montant_total: Mapped[float] = mapped_column(Float, nullable=False)
    date_enregistrement: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    rembourse: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    frais_annulation: Mapped[float | None] = mapped_column(Float, nullable=True)
    date_annulation: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raison_annulation: Mapped[str | None] = mapped_column(Text, nullable=True)
    # === EMBARQUEMENT ===
    embarque: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_embarquement: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    agent_embarquement_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("utilisateur.id"), nullable=True, index=True)
    agent_embarquement_nom: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # Gestion des absents
    est_absent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_marquage_absent: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raison_absence: Mapped[str | None] = mapped_column(String(500), nullable=True)
    reservation: Mapped["Reservation"] = relationship("Reservation", back_populates="colis_details")
```

**Note sur les colis :** Ils ont un champ supplémentaire `est_absent` pour marquer les colis non récupérés.

### 2.8 Ticket (`app/models/ticket.py`)
```python
class Ticket(Base):
    __tablename__ = "ticket"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(Integer, ForeignKey("reservation.id"), nullable=False, unique=True, index=True)
    numero_ticket: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    qr_payload: Mapped[str | None] = mapped_column(Text, nullable=True)      # JSON signé du QR
    qr_signature: Mapped[str | None] = mapped_column(Text, nullable=True)      # Signature hex
    nombre_passagers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    nombre_vehicules: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    nombre_colis: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pdf_genere: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    embarque: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_embarquement: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_envoi_email: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reservation: Mapped["Reservation"] = relationship("Reservation", back_populates="ticket", uselist=False)
```

**Le QR code contient un payload JSON signé** qui inclut `reservation_id` et `reference_reservation`. La signature est vérifiée localement sur chaque appareil Android avec la clé publique du backend.

### 2.9 Embarquement Log (`app/models/embarquement_log.py`)
```python
class EmbarquementLog(Base):
    __tablename__ = "embarquement_log"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    numero_ticket: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    reservation_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    scan_par_agent_id: Mapped[int] = mapped_column(Integer, ForeignKey("utilisateur.id"), nullable=False, index=True)
    scan_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    statut_scan: Mapped[str] = mapped_column(String(50), nullable=False)  # "success", "duplicate", "invalid", "not_found"
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_agent: Mapped[str | None] = mapped_column(String(50), nullable=True)
    agent: Mapped["Utilisateur"] = relationship("Utilisateur")
```

### 2.10 Compagnie & Bateau (`app/models/compagnie.py` — extraits pertinents)
```python
class CompagnieBateau(Base):
    __tablename__ = "compagnie_bateau"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nom: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    numero_licence: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    code_admin: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)  # Code pour login admin backoffice
    # ... (autres champs)

class Bateau(Base):
    __tablename__ = "bateau"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    compagnie_id: Mapped[int] = mapped_column(Integer, ForeignKey("compagnie_bateau.id"), nullable=False, index=True)
    nom: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    immatriculation: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    capacite_passagers: Mapped[int] = mapped_column(Integer, nullable=False)
    # ... (wifi, restaurant, boutique, etc.)
    niveaux: Mapped[List["Niveau"]] = relationship("Niveau", back_populates="bateau", cascade="all, delete-orphan")
    voyages: Mapped[List["ProgrammeVoyage"]] = relationship("ProgrammeVoyage", back_populates="bateau")
```

### 2.11 Port (`app/models/geographie.py`)
```python
class Port(Base):
    __tablename__ = "port"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ville_id: Mapped[int] = mapped_column(Integer, ForeignKey("ville.id"), nullable=False, index=True)
    nom: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    code_international: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    adresse: Mapped[str | None] = mapped_column(Text, nullable=True)
    horaires_ouverture: Mapped[str | None] = mapped_column(String(10), nullable=True)
    horaires_fermeture: Mapped[str | None] = mapped_column(String(10), nullable=True)
    capacite_quai: Mapped[int | None] = mapped_column(Integer, nullable=True)
```

### 2.12 Ticket Signing (service backend `app/services/ticket_signing.py`)
Le backend signe les tickets avec HMAC. Le payload QR contient :
```json
{
  "reservation_id": 123,
  "reference": "RES-ABC123",
  "timestamp": "2024-01-15T10:00:00Z",
  "signature": "hex_hmac_sha256"
}
```
La **clé publique / clé HMAC** doit être embarquée dans l'app Android pour vérification offline.

---

## 3. L'API BACKEND EMBARQUEMENT EXISTANTE

### 3.1 Router embarquement (`app/modules/embarquement/router.py`)
```python
router = APIRouter(prefix="/embarquement", tags=["Embarquement"])

@router.post("/scan/{numero_ticket}")
async def scan_ticket(
    numero_ticket: str,
    api_key: bool = Depends(verify_api_key)
):
    """Scanner un billet — nécessite une clé API"""
    ...

@router.get("/verify/{numero_ticket}")
async def verify_ticket(
    numero_ticket: str,
    api_key: bool = Depends(verify_api_key)
):
    """Vérifier un billet sans le marquer comme embarqué"""
    ...
```

**Actuellement**, cette API nécessite une connexion internet et une clé API. Dans le scénario P2P, les agents ne l'appellent pas directement pendant l'embarquement. Ils utilisent leur base locale et communiquent entre eux. Le sync avec le backend se fait **après** l'embarquement.

---

## 4. SCÉNARIO UTILISATEUR COMPLET

### 4.1 Acteurs
| Acteur | Rôle |
|--------|------|
| **Responsable** | `RoleUtilisateur.admin_compagnie` ou `super_admin`. Il prépare l'embarquement. |
| **Agents (5+)** | `RoleUtilisateur.agent`. Ils sont rattachés à une `compagnie_id`. Ils scannent les QR. |
| **Passagers** | Clients avec un billet PDF/QR sur leur téléphone ou papier. |

### 4.2 Phase 1 : Préparation (au port, avec internet)
1. Le **Responsable** ouvre l'app Android "Safari  Embarquement" et s'authentifie avec JWT.
2. Il sélectionne le **voyage** du jour (ProgrammeVoyage). L'app appelle l'API backend : `GET /traversees/{voyage_id}` avec le token JWT.
3. L'app télécharge :
   - La **manifeste** : toutes les réservations confirmées pour ce voyage
   - Les **tickets** avec leurs signatures cryptographiques
   - Les **détails passagers** (nom, classe, lit, chambre, véhicule, colis)
   - La **clé publique HMAC** pour vérifier les QR codes offline
4. Le téléphone du Responsable active le **Hotspot WiFi** Android : `SAFARI-EMBARK-V123`
5. Les 5 agents se connectent à ce WiFi.
6. Chaque agent ouvre l'app, se connecte avec son compte agent, et entre dans le "mode embarquement".
7. L'app de chaque agent :
   - Lance un **serveur HTTP local** (Ktor embedded) sur le port `8080`
   - Annonce sa présence via **mDNS** (NSD Android) : `serviceType = _safari-embark._tcp`
   - Attend de recevoir la manifeste du Responsable
8. Le Responsable envoie la manifeste à tous les agents découverts via HTTP POST.
9. Chaque agent stocke la manifeste dans sa **base Room locale**.
10. Tous les écrans affichent : "Voyage Marseille → Tanger | 120 passagers | 4 agents connectés"

### 4.3 Phase 2 : Embarquement (mode P2P online)
**Scénario A — Scan normal d'un passager :**
1. Le **Passager Jean Martin** (réservation #42) présente son QR à l'**Agent A**.
2. L'**Agent A** scanne le QR. L'app :
   - Décode le payload JSON
   - Vérifie la **signature HMAC** avec la clé publique embarquée
   - Cherche dans la base locale : `ticket.numero_ticket == "TICK-ABC123"`
   - Vérifie : `ReservationPassager.embarque == false`
3. L'**Agent A** marque localement le passager comme `embarque = true`, `agent_embarquement_id = A`, `date_embarquement = now()`.
4. L'**Agent A** envoie un message HTTP POST à **B, C, D, E** :
   ```json
   {
     "type": "SCAN_EVENT",
     "ticket_numero": "TICK-ABC123",
     "reservation_id": 42,
     "passager_nom": "Jean Martin",
     "agent_id": "AGENT-A",
     "agent_nom": "Agent A",
     "timestamp_lamport": 42,
     "uuid_evenement": "uuid-unique",
     "payload_qr": "{...}",
     "signature_qr": "sha256:..."
   }
   ```
5. Les **Agents B, C, D, E** reçoivent le message. Ils mettent à jour leur base locale.
6. Les écrans de B, C, D, E grisent ou suppriment Jean Martin de leur liste.
7. L'écran de l'**Agent A** affiche **VERT** : "✓ Jean Martin — Embarqué | Lit 2A | Chambre 201"

**Scénario B — Tentative de scan double :**
1. Jean Martin (ou un fraudeur avec une copie) présente son QR à l'**Agent B**.
2. Le message de l'**Agent A** n'est pas encore arrivé chez B (latence réseau 200ms).
3. L'**Agent B** scanne. Sa base locale dit `embarque = false` (pas encore reçu le message de A).
4. L'**Agent B** marque localement et envoie à tous.
5. L'**Agent A** reçoit le message de B. Il compare :
   - A a scanné au timestamp Lamport **42**
   - B a scanné au timestamp Lamport **43**
   - Règle : **42 < 43**, donc A gagne.
6. L'**Agent A** envoie un message de correction à B : `CONFLICT_RESOLUTION(ticket_id, gagnant=A, timestamp=42)`.
7. L'**Agent B** reçoit la correction. Il met à jour sa base : le scan de A reste, le sien devient `duplicate = true`.
8. L'écran de l'**Agent B** passe au **ROUGE** : "⚠️ Déjà embarqué par Agent A à 14:02:15"
9. Le passager ne peut pas embarquer deux fois.

**Scénario C — Scan d'un véhicule :**
1. Le passager a une réservation avec véhicule. Le QR est le **même** pour le passager et le véhicule (ticket global).
2. L'**Agent A** scanne le QR. L'app affiche :
   - "✓ Jean Martin — Passager embarqué"
   - "🚗 Véhicule Renault Clio — AB-123-CD — Véhicule embarqué"
3. Le `ReservationVehicule.embarque` est aussi mis à jour.

**Scénario D — Scan d'un colis :**
1. Le passager a un colis. L'**Agent A** scanne le même QR.
2. L'app affiche : "📦 Colis 5kg — Embarqué"
3. `ReservationColis.embarque = true`.

**Scénario E — Passager non trouvé (QR falsifié) :**
1. L'**Agent A** scanne un QR. La signature est invalide ou le ticket n'existe pas dans la manifeste.
2. L'app affiche **ROUGE** : "❌ QR invalide — Passager non reconnu"
3. Le scan est refusé. Aucun message n'est envoyé aux autres agents.

**Scénario F — Passager avec document à vérifier :**
1. Le passager est en classe VIP ou porte un document spécial.
2. L'app affiche un **popup** : "Vérifier pièce d'identité". L'agent contrôle le document et appuie sur "Identité vérifiée".
3. `ReservationPassager.identite_verifiee = true` est mis à jour localement et broadcast.

### 4.4 Phase 3 : Panne réseau (mode offline)
1. L'**Agent C** s'éloigne du Hotspot. L'app détecte la perte de connexion.
2. L'app affiche : "⚠️ Mode Offline — Scans stockés localement"
3. L'**Agent C** scanne le passager #88. Le scan est mis dans `scans_queue`.
4. L'**Agent C** continue. Son app vérifie localement les doubles (si C scanne le même passager deux fois, l'app refuse).
5. L'**Agent D** (toujours connecté) scanne le passager #89. Le message est broadcast à A, B, E (mais pas C).
6. Les bases de A, B, D, E sont synchronisées. C est en retard.

### 4.5 Phase 4 : Reconnexion (resynchronisation)
1. L'**Agent C** revient à portée. L'app détecte le réseau.
2. L'app de C envoie sa `scans_queue` à tous les agents découverts.
3. Les agents A, B, D, E reçoivent les scans de C. Ils mettent à jour leur base.
4. L'app de C demande : "Quels scans ai-je manqués ?"
5. Les agents lui envoient les événements récents (tout ce qu'il a manqué depuis qu'il est parti).
6. C met à jour sa base. Toutes les bases sont convergentes.
7. L'app de C affiche : "✓ Synchronisé — 3 scans envoyés, 5 reçus"

### 4.6 Phase 5 : Fin d'embarquement & sync vers le cloud
1. Le **Responsable** appuie sur "Terminer l'embarquement".
2. Son app collecte l'état final de toutes les bases (ou utilise sa propre base qui est déjà convergente).
3. L'app se connecte au backend Cloud (4G ou WiFi internet) et envoie :
   - Liste des passagers embarqués (`ReservationPassager` avec `embarque=true`, `agent_embarquement_id`, `date_embarquement`)
   - Liste des véhicules embarqués
   - Liste des colis embarqués
   - Scans en conflit (pour audit)
   - No-shows (passagers non scannés)
4. L'API backend met à jour les tables et génère le rapport.

---

## 5. ARCHITECTURE TECHNIQUE ANDROID (KOTLIN)

### 5.1 Topologie réseau
- **Hotspot WiFi** : Un agent (idéalement le Responsable) active le partage de connexion Android. Cela crée un réseau local `192.168.43.x`.
- **Découverte** : `NsdManager` (Android Network Service Discovery) pour annoncer et découvrir les agents.
- **Communication** : HTTP REST entre agents. Chaque agent est à la fois client et serveur.

### 5.2 Composants internes de l'app
| Composant | Technologie | Rôle |
|-----------|-------------|------|
| **Base locale** | Room (SQLite) + Coroutines | Stockage offline de la manifeste et des scans |
| **Serveur HTTP** | Ktor embedded (CIO engine) | Réception des messages des autres agents |
| **Client HTTP** | Ktor client (OkHttp) | Envoi des scans aux autres agents |
| **Découverte** | NsdManager (mDNS) | Trouver les IP des autres agents sur le WiFi |
| **Scan QR** | CameraX + ML Kit Vision | Décodage des QR codes |
| **Sync** | WorkManager (Android Jetpack) | Tâches de resynchronisation en arrière-plan |
| **UI** | Jetpack Compose | Liste des passagers, indicateurs de statut |
| **Crypto** | BouncyCastle ou Java javax.crypto | Vérification HMAC des tickets offline |
| **Sérialisation** | Kotlinx Serialization | JSON des messages P2P |

### 5.3 Tables Room (base locale SQLite)
```kotlin
@Entity(tableName = "manifeste_passagers")
data class ManifestePassager(
    @PrimaryKey val ticketNumero: String,
    val reservationId: Int,
    val voyageId: Int,
    val passagerNom: String,
    val passagerEmail: String?,
    val passagerTelephone: String?,
    val passagerNumeroIdentite: String?,
    val classePassager: String, // "standard", "premium", "vip"
    val niveauId: Int?,
    val chambreId: Int?,
    val chambreNumero: String?,
    val litId: Int?,
    val litNumero: String?,
    val chaiseId: Int?,
    val vehiculeImmatriculation: String?,
    val vehiculeMarque: String?,
    val vehiculeModele: String?,
    val colisPoids: Double?,
    val colisDescription: String?,
    val qrPayload: String,        // JSON signé du QR
    val qrSignature: String,      // Signature HMAC
    val embarque: Boolean = false,
    val dateEmbarquement: Long? = null, // timestamp epoch
    val agentEmbarquementId: String? = null,
    val agentEmbarquementNom: String? = null,
    val identiteVerifiee: Boolean = false,
    val documentVerifieType: String? = null,
    val documentVerifieNumero: String? = null,
    val isDuplicate: Boolean = false,  // Pour les scans en conflit
    val conflictTimestamp: Long? = null,
    val syncStatus: String = "pending"   // "pending", "synced", "conflict"
)

@Entity(tableName = "scans_queue")
data class ScanQueue(
    @PrimaryKey val uuid: String = UUID.randomUUID().toString(),
    val ticketNumero: String,
    val reservationId: Int,
    val agentId: String,
    val agentNom: String,
    val timestampLamport: Int,
    val timestampLocal: Long,      // epoch millis
    val payloadQr: String,
    val signatureQr: String,
    val status: String = "pending", // "pending", "sent", "failed"
    val retryCount: Int = 0
)

@Entity(tableName = "annuaire_agents")
data class AgentPeer(
    @PrimaryKey val agentId: String,
    val agentNom: String,
    val ipAddress: String,
    val port: Int = 8080,
    val dernierContact: Long,       // epoch millis
    val isOnline: Boolean = true
)

@Entity(tableName = "etat_embarquement")
data class EtatEmbarquement(
    @PrimaryKey val voyageId: Int,
    val totalPassagers: Int,
    val embarques: Int = 0,
    val restants: Int = 0,
    val noShows: Int = 0,
    val mode: String = "online"     // "online", "offline", "syncing"
)
```

### 5.4 Protocole de messages P2P (HTTP JSON)

**Message 1 : Découverte (mDNS)**
```
Service: _safari-embark._tcp
Name: "Agent-A (Safari Fast)"
IP: 192.168.43.12
Port: 8080
TXT: agent_id=AGENT-A | agent_nom=Agent A | voyage_id=123
```

**Message 2 : Scan Event (POST /api/v1/scan)**
```json
{
  "type": "SCAN_EVENT",
  "ticket_numero": "TICK-ABC123",
  "reservation_id": 42,
  "passager_nom": "Jean Martin",
  "agent_id": "AGENT-A",
  "agent_nom": "Agent A",
  "timestamp_lamport": 42,
  "uuid_evenement": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp_local": 1705315320000,
  "payload_qr": "{\"reservation_id\":42,\"reference\":\"RES-ABC123\"}",
  "signature_qr": "sha256:abcd1234..."
}
```

**Message 3 : Conflict Resolution (POST /api/v1/conflict)**
```json
{
  "type": "CONFLICT_RESOLUTION",
  "ticket_numero": "TICK-ABC123",
  "gagnant_agent_id": "AGENT-A",
  "gagnant_timestamp_lamport": 42,
  "perdant_agent_id": "AGENT-B",
  "perdant_timestamp_lamport": 43,
  "raison": "ALREADY_SCANNED"
}
```

**Message 4 : Sync Request (POST /api/v1/sync)**
```json
{
  "type": "SYNC_REQUEST",
  "agent_id": "AGENT-C",
  "last_sync_timestamp": 1705315000000,
  "scans_queue": [
    { /* scans offline de C */ }
  ]
}
```

**Message 5 : Sync Response (POST /api/v1/sync)**
```json
{
  "type": "SYNC_RESPONSE",
  "agent_id": "AGENT-A",
  "scans_recus": 3,
  "scans_envoyes": [
    { /* scans que C a manqués */ }
  ],
  "etat_manifeste": [
    { "ticket_numero": "TICK-XYZ789", "embarque": true, "agent_id": "AGENT-D" }
  ]
}
```

**Message 6 : Heartbeat (GET /api/v1/heartbeat)**
```json
{
  "type": "HEARTBEAT",
  "agent_id": "AGENT-A",
  "timestamp": 1705315400000,
  "voyage_id": 123
}
```

### 5.5 Algorithme de résolution des conflits (Horloges de Lamport)

Chaque agent maintient un compteur entier local (`lamportClock`).

**Règles :**
1. Quand un agent effectue un scan local : `lamportClock += 1`, `timestamp = lamportClock`.
2. Quand un agent envoie un message : il inclut son `lamportClock`.
3. Quand un agent reçoit un message : `lamportClock = max(lamportClock, message.timestamp) + 1`.
4. Pour résoudre un conflit sur le même ticket :
   - Comparer les `timestamp_lamport`.
   - Le **plus petit** gagne (premier arrivé, premier servi).
   - Si égalité : comparer `agent_id` en ordre alphabétique (déterministe).

**Pourquoi pas les horloges physiques ?** Parce que les téléphones Android peuvent avoir des décalages de plusieurs secondes. Les horloges de Lamport garantissent un ordre causal cohherent.

### 5.6 Gestion du changement de leader (Hotspot)

Si le Responsable (qui a le Hotspot) s'éteint ou s'éloigne :
1. Les agents détectent la perte du réseau WiFi.
2. L'agent avec le **plus de batterie** (ou celui qui a été le plus longtemps dans le groupe) active son propre Hotspot.
3. Les autres agents se reconnectent à ce nouveau Hotspot.
4. Les bases se resynchronisent automatiquement via le protocole SYNC.

**Détection du changement :** Heartbeat toutes les 5 secondes. Si 3 heartbeats manqués, l'agent est considéré comme hors ligne.

---

## 6. EXIGENCES DE SÉCURITÉ

### 6.1 Vérification des tickets
- La **clé publique HMAC** du backend est embarquée dans l'app Android (dans les assets, chiffrée avec Android Keystore).
- Quand un QR est scanné, la signature est vérifiée **localement** sans connexion internet.
- Si la signature est invalide, le scan est refusé immédiatement.

### 6.2 Authentification des agents P2P
- Chaque agent possède un **token JWT** valide obtenu au login.
- Les messages P2P incluent un header `X-Agent-Token` avec le JWT.
- Le serveur HTTP de chaque agent vérifie le JWT avant d'accepter un message.
- Seuls les agents du même voyage (`voyage_id`) peuvent communiquer.

### 6.3 Audit et traçabilité
- Chaque scan est tracé avec : `agent_id`, `timestamp`, `ticket_numero`, `uuid_evenement`.
- Les scans en conflit (`duplicate`) sont conservés dans la base locale pour audit.
- Le sync vers le backend inclut tous les scans, y compris les duplicates.

### 6.4 Chiffrement des données locales
- La base Room SQLite est chiffrée avec **SQLCipher** (ou le chiffrement natif Android).
- Les données sensibles (JWT, clé HMAC) sont stockées dans **Android Keystore / EncryptedSharedPreferences**.

---

## 7. EXIGENCES DE L'UI / UX

### 7.1 Écran principal (liste des passagers)
- Liste des passagers du voyage avec recherche par nom ou numéro de ticket.
- Indicateurs visuels :
  - 🟢 Vert : Passager embarqué (afficher agent et heure)
  - 🟡 Jaune : Passager en cours de scan (afficher spinner)
  - 🔴 Rouge : Scan refusé / QR invalide
  - ⚪ Gris : Passager non scanné
- Filtrage rapide : "Tous", "À embarquer", "Embarqués", "No-shows".

### 7.2 Écran de scan
- Vue caméra plein écran (CameraX) avec overlay QR.
- Résultat immédiat :
  - **Vert** : "✓ Jean Martin — Embarqué | Lit 2A | Chambre 201"
  - **Rouge** : "⚠️ Déjà embarqué par Agent A à 14:02:15"
  - **Rouge** : "❌ QR invalide"
  - **Jaune** : "⏳ En cours de synchronisation..."
- Bouton "Vérifier identité" (pour les VIP ou documents spéciaux).
- Bouton "Rechercher manuellement" (si le QR est illisible).

### 7.3 Écran de statut réseau
- Indicateur en haut de l'écran :
  - 🟢 "Online — 4 agents connectés"
  - 🟡 "Offline — 3 scans en attente"
  - 🔴 "Reconnexion..."
- Bouton "Forcer la synchronisation".
- Bouton "Changer de Hotspot" (si le leader change).

### 7.4 Écran de fin d'embarquement (Responsable uniquement)
- Résumé : Total embarqués / Restants / No-shows / Véhicules / Colis.
- Bouton "Envoyer le rapport au Cloud".
- Affichage de la progression du sync.

---

## 8. INTEGRATION AVEC LE BACKEND (SYNC CLOUD)

### 8.1 Endpoint backend pour la sync
L'API backend doit exposer un endpoint pour recevoir les données d'embarquement en batch :

```
POST /api/v1/embarquement/sync-batch
Headers: Authorization: Bearer <JWT_ADMIN>
Body: {
  "voyage_id": 123,
  "embarquements": [
    {
      "reservation_passager_id": 456,
      "embarque": true,
      "date_embarquement": "2024-01-15T14:02:15Z",
      "agent_embarquement_id": 789,
      "agent_embarquement_nom": "Agent A",
      "identite_verifiee": true,
      "document_verifie_type": "passeport",
      "document_verifie_numero": "AB123456"
    },
    ...
  ],
  "vehicules": [ ... ],
  "colis": [ ... ],
  "scans_conflicts": [  // pour audit
    {
      "ticket_numero": "TICK-ABC123",
      "agent_gagnant": "Agent A",
      "agent_perdant": "Agent B",
      "timestamp_gagnant": "2024-01-15T14:02:15Z",
      "timestamp_perdant": "2024-01-15T14:02:16Z"
    }
  ],
  "no_shows": [  // passagers non scannés
    { "ticket_numero": "TICK-XYZ789", "passager_nom": "Marie Dupont" }
  ]
}
```

### 8.2 Mise à jour des modèles backend
Le backend doit mettre à jour :
- `ReservationPassager.embarque`, `date_embarquement`, `agent_embarquement_id`, `agent_embarquement_nom`, `identite_verifiee`, `document_verifie_type`, `document_verifie_numero`
- `ReservationVehicule.embarque`, `date_embarquement`, `agent_embarquement_id`, `agent_embarquement_nom`
- `ReservationColis.embarque`, `date_embarquement`, `agent_embarquement_id`, `agent_embarquement_nom`
- `Ticket.embarque`, `date_embarquement`
- Créer les entrées `EmbarquementLog` pour audit.

### 8.3 Endpoint pour télécharger la manifeste
```
GET /api/v1/embarquement/manifeste/{voyage_id}
Headers: Authorization: Bearer <JWT_AGENT>
Response: {
  "voyage": { ...ProgrammeVoyage... },
  "reservations": [
    {
      "reservation_id": 42,
      "reference": "RES-ABC123",
      "ticket_numero": "TICK-ABC123",
      "type_reservation": "passager",
      "passagers": [ ...ReservationPassager... ],
      "vehicules": [ ...ReservationVehicule... ],
      "colis": [ ...ReservationColis... ],
      "qr_payload": "{...}",
      "qr_signature": "sha256:..."
    }
  ],
  "hmac_public_key": "base64_encoded_key"  // Clé pour vérifier les QR offline
}
```

---

## 9. CONTRAINTES ET EXIGENCES NON-FONCTIONNELLES

1. **Performance** : Le scan doit être validé en moins de 500ms (vérification locale + broadcast P2P).
2. **Batterie** : L'app doit fonctionner 8h sans recharge. Le scan caméra s'éteint après 30s d'inactivité.
3. **Stockage** : La manifeste de 500 passagers doit tenir en moins de 10 Mo de stockage local.
4. **Résilience** : L'app doit survivre à la perte du réseau, au redémarrage de l'app, au changement de leader.
5. **Sécurité** : Les données locales sont chiffrées. Le JWT est stocké dans Android Keystore.
6. **Compatibilité** : Android 8+ (API 26). CameraX et Room sont compatibles.
7. **Accessibilité** : Le texte doit être lisible en plein soleil (contraste élevé, taille de police ajustable).

---

## 10. POINTS D'ATTENTION POUR L'IMPLEMENTATION

1. **Le timestamp Lamport** est un `Int` (incrémental), pas une date physique. Il ne doit jamais décroître.
2. **L'uuid_evenement** de chaque scan est unique. Il permet de détecter les messages dupliqués sur le réseau.
3. **Le payload QR** contient `reservation_id` et `reference`. La base locale est indexée par `ticket_numero` pour la recherche rapide.
4. **Le scan d'un ticket global** doit mettre à jour le passager, le véhicule ET le colis si présents. C'est un seul QR pour toute la réservation.
5. **La recherche manuelle** (si QR illisible) doit permettre de chercher par nom et marquer l'embarquement avec un **code PIN superviseur** (pour éviter les abus).
6. **Les no-shows** sont calculés à la fin : tous les passagers de la manifeste qui n'ont pas `embarque=true`.
7. **La clé HMAC** est la même pour toute la compagnie. Elle est rotatée périodiquement par le backend.

---

> **FIN DU PROMPT.** Tu as maintenant toutes les informations nécessaires pour concevoir et implémenter le module embarquement P2P offline-first de l'application Safari Fast Android. N'oublie pas de poser des questions de clarification avant de commencer le code.

"""
Module de génération de tickets personnalisés pour SafariFast
Génère des tickets visuels avec QR code, date et heure de départ
Design professionnel avec logo VIP et code-barres
"""
from PIL import Image, ImageDraw, ImageFont
import qrcode
from io import BytesIO
import os


def generate_custom_ticket(jour: str, heure_depart: str, qrcode_data: str, numero_reservation: str, name_boat: str, depart: str, dest: str, montant: str, niveau: str, chambre: str, chaise: str, output_path: str = None) -> Image.Image:
    """
    Génère un ticket personnalisé avec design professionnel

    Args:
        jour (str): Date du voyage (ex: "10 JULY")
        heure_depart (str): Heure de départ (ex: "10:00AM")
        qrcode_data (str): Données pour le QR code (ex: référence de réservation)
        numero_reservation (str): Numéro de réservation (ex: "RES-00-30-96-00")
        name_boat (str): Nom du bateau (ex: "OKAKO")
        depart (str): Ville de départ (ex: "KALEMIE")
        dest (str): Ville de destination (ex: "UVIRA")
        montant (str): Montant du ticket (ex: "50$")
        niveau (str): Numéro du niveau (ex: "01")
        chambre (str): Numéro de la chambre (ex: "05")
        chaise (str): Numéro de la chaise (ex: "12")
        output_path (str, optional): Chemin pour sauvegarder l'image. Si None, retourne l'image.

    Returns:
        Image.Image: Image PIL du ticket généré
    """

    # Dimensions du ticket
    width = 1024
    height = 420
    border_radius = 20  # Rayon pour les coins arrondis

    # Couleurs
    COLOR_PRIMARY = (1, 3, 18)  # #010312 - Couleur primaire de l'application
    COLOR_WHITE = (255, 255, 255)
    COLOR_GRAY = (200, 200, 200)
    COLOR_TRANSPARENT = (0, 0, 0, 0)

    # Créer l'image de base avec transparence pour les coins arrondis
    img = Image.new('RGBA', (width, height), COLOR_TRANSPARENT)

    # Créer un masque pour les coins arrondis
    mask = Image.new('L', (width, height), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, width, height], radius=border_radius, fill=255)

    # Créer l'image du ticket avec fond blanc
    ticket_img = Image.new('RGB', (width, height), COLOR_WHITE)
    draw = ImageDraw.Draw(ticket_img)

    # === PARTIE GAUCHE (COULEUR PRIMAIRE - SANS RAYURES) ===
    left_width = 720
    # Rectangle avec couleur primaire (les coins seront arrondis par le masque global)
    draw.rectangle([0, 0, left_width, height], fill=COLOR_PRIMARY)

    # === TEXTE "TICKET" ===
    try:
        # Essayer d'utiliser la police OCR-B
        font_title = ImageFont.truetype("OCRB.ttf", 90)
    except:
        try:
            font_title = ImageFont.truetype("OCR-B.ttf", 90)
        except:
            try:
                # Si OCR-B n'est pas disponible, utiliser Courier New (monospace)
                font_title = ImageFont.truetype("courbd.ttf", 90)  # Courier Bold
            except:
                try:
                    font_title = ImageFont.truetype("cour.ttf", 90)
                except:
                    font_title = ImageFont.load_default()

    ticket_text = "TICKET"
    ticket_bbox = draw.textbbox((0, 0), ticket_text, font=font_title)
    ticket_width = ticket_bbox[2] - ticket_bbox[0]
    ticket_x = 150  # Position fixe à gauche
    ticket_y = 50  # Remonté de 70 à 50
    draw.text((ticket_x, ticket_y), ticket_text, fill=COLOR_WHITE, font=font_title)

    # === DATE ET HEURE (SÉPARÉES) ===
    try:
        # Essayer d'utiliser la police OCR-B
        font_date = ImageFont.truetype("OCRB.ttf", 28)  # Réduit de 36 à 28
    except:
        try:
            font_date = ImageFont.truetype("OCR-B.ttf", 28)
        except:
            try:
                # Si OCR-B n'est pas disponible, utiliser Courier New (monospace)
                font_date = ImageFont.truetype("cour.ttf", 28)
            except:
                font_date = ImageFont.load_default()

    # Afficher l'heure en haut à droite
    heure_text = heure_depart.upper()
    heure_bbox = draw.textbbox((0, 0), heure_text, font=font_date)
    heure_width = heure_bbox[2] - heure_bbox[0]
    heure_x = left_width - heure_width - 80  # Déplacé de 30 à 80 (plus à gauche)
    heure_y = 200  # Descendu de 170 à 200
    draw.text((heure_x, heure_y), heure_text, fill=COLOR_WHITE, font=font_date)

    # Afficher le jour/date en dessous de l'heure
    jour_text = jour.upper()
    jour_bbox = draw.textbbox((0, 0), jour_text, font=font_date)
    jour_width = jour_bbox[2] - jour_bbox[0]
    jour_x = left_width - jour_width - 80  # Déplacé de 30 à 80 (plus à gauche)
    jour_y = 235  # Descendu de 205 à 235
    draw.text((jour_x, jour_y), jour_text, fill=COLOR_WHITE, font=font_date)

    # === DÉPART ET DESTINATION (À GAUCHE DE L'HEURE ET DATE) ===
    # Afficher le départ en haut (aligné avec l'heure)
    depart_text = depart.upper()
    depart_bbox = draw.textbbox((0, 0), depart_text, font=font_date)
    depart_width = depart_bbox[2] - depart_bbox[0]
    depart_x = heure_x - depart_width - 60  # Augmenté de 40 à 60 (20px plus d'espace)
    depart_y = 200  # Aligné avec l'heure
    draw.text((depart_x, depart_y), depart_text, fill=COLOR_WHITE, font=font_date)

    # Afficher la destination en bas (aligné avec la date)
    dest_text = dest.upper()
    dest_bbox = draw.textbbox((0, 0), dest_text, font=font_date)
    dest_width = dest_bbox[2] - dest_bbox[0]
    dest_x = jour_x - dest_width - 60  # Augmenté de 40 à 60 (20px plus d'espace)
    dest_y = 235  # Aligné avec la date
    draw.text((dest_x, dest_y), dest_text, fill=COLOR_WHITE, font=font_date)

    # === MONTANT (EN BAS, À GAUCHE DE DEST) ===
    try:
        # Police plus grande pour le montant
        font_montant = ImageFont.truetype("OCRB.ttf", 40)
    except:
        try:
            font_montant = ImageFont.truetype("OCR-B.ttf", 40)
        except:
            try:
                font_montant = ImageFont.truetype("courbd.ttf", 40)
            except:
                try:
                    font_montant = ImageFont.truetype("cour.ttf", 40)
                except:
                    font_montant = ImageFont.load_default()

    # Afficher le label "MONTANT" en haut (même taille que départ/dest)
    label_montant = "MONTANT"
    label_bbox = draw.textbbox((0, 0), label_montant, font=font_date)
    label_width = label_bbox[2] - label_bbox[0]
    label_x = dest_x - label_width - 50  # Augmenté de 30 à 50 (20px plus d'espace)
    label_y = 200  # En haut, aligné avec départ
    draw.text((label_x, label_y), label_montant, fill=COLOR_WHITE, font=font_date)

    # Afficher le montant en bas, aligné avec dest
    montant_text = montant.upper()
    montant_bbox = draw.textbbox((0, 0), montant_text, font=font_montant)
    montant_width = montant_bbox[2] - montant_bbox[0]
    montant_x = dest_x - montant_width - 50  # Augmenté de 30 à 50 (20px plus d'espace)
    montant_y = 230  # Aligné avec dest (235 - 5 pour ajustement visuel)
    draw.text((montant_x, montant_y), montant_text, fill=COLOR_WHITE, font=font_montant)

    # === GATE, ROW, SEAT ===
    try:
        font_label = ImageFont.truetype("arial.ttf", 20)
        font_value = ImageFont.truetype("arialbd.ttf", 32)
    except:
        font_label = ImageFont.load_default()
        font_value = ImageFont.load_default()

    # Labels
    labels = ["NIVEAU", "CHAMBRE", "CHAISE"]  # Changé de GATE, ROW, SEAT
    values = [niveau, chambre, chaise]  # Valeurs dynamiques
    label_y = 330  # Descendu de 300 à 330 (30px plus bas)
    label_spacing = 150
    start_x = 70  # Déplacé de 100 à 70 (30px de plus vers la gauche)

    for i, label in enumerate(labels):
        x = start_x + (i * label_spacing)
        draw.text((x, label_y), label, fill=COLOR_GRAY, font=font_label)
        draw.text((x + 20, label_y + 30), values[i], fill=COLOR_WHITE, font=font_value)

    # === NUMÉRO DE RÉSERVATION (BAS DROIT DE LA PARTIE NOIRE) ===
    try:
        # Essayer d'utiliser la police OCR-B
        font_reservation = ImageFont.truetype("OCRB.ttf", 24)
    except:
        try:
            font_reservation = ImageFont.truetype("OCR-B.ttf", 24)
        except:
            try:
                # Si OCR-B n'est pas disponible, utiliser Courier New (monospace)
                font_reservation = ImageFont.truetype("cour.ttf", 24)
            except:
                font_reservation = ImageFont.load_default()

    # Position en bas à droite de la partie noire
    reservation_bbox = draw.textbbox((0, 0), numero_reservation, font=font_reservation)
    reservation_width = reservation_bbox[2] - reservation_bbox[0]
    reservation_x = left_width - reservation_width - 30  # 30px du bord droit
    reservation_y = height - 50  # 50px du bas
    draw.text((reservation_x, reservation_y), numero_reservation, fill=COLOR_WHITE, font=font_reservation)

    # === LOGO VIP (TRÈS GRAND ET BIEN POSITIONNÉ) ===
    logo_path = os.path.join("app", "static_files", "vip.png")
    if os.path.exists(logo_path):
        try:
            logo = Image.open(logo_path)
            # Taille encore plus grande pour le logo VIP
            logo_size = (180, 180)  # Augmenté de 120x120 à 180x180
            logo = logo.resize(logo_size, Image.Resampling.LANCZOS)

            # Position du logo (en haut à droite de la section noire, bien centré)
            logo_x = left_width - 210  # Ajusté pour la nouvelle taille
            logo_y = 20  # Un peu plus haut

            # Coller le logo (avec transparence si disponible)
            if logo.mode == 'RGBA':
                ticket_img.paste(logo, (logo_x, logo_y), logo)
            else:
                ticket_img.paste(logo, (logo_x, logo_y))
        except Exception as e:
            print(f"Erreur lors du chargement du logo VIP: {e}")

    # === PARTIE DROITE (BLANCHE) ===
    right_x = left_width

    # Texte vertical avec nom du bateau en OCR-B
    try:
        font_boat = ImageFont.truetype("OCRB.ttf", 26)  # Réduit de 32 à 26
    except:
        try:
            font_boat = ImageFont.truetype("OCR-B.ttf", 26)
        except:
            try:
                font_boat = ImageFont.truetype("cour.ttf", 26)
            except:
                font_boat = ImageFont.load_default()

    boat_text = name_boat.upper()
    boat_x = right_x + 30
    boat_y = 40  # Remonté de 80 à 40 (40px plus haut)

    # Dessiner verticalement avec espacement réduit
    for i, char in enumerate(boat_text):
        draw.text((boat_x, boat_y + (i * 28)), char, fill=COLOR_PRIMARY, font=font_boat)  # Espacement réduit de 35 à 28

    # === QR CODE ===
    # Générer le QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=7,  # Augmenté de 5 à 7
        border=1,
    )
    qr.add_data(qrcode_data)
    qr.make(fit=True)

    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_img = qr_img.resize((200, 200), Image.Resampling.LANCZOS)  # Augmenté de 140x140 à 200x200

    # Position du QR code (déplacé vers la gauche et centré verticalement)
    qr_x = right_x + 50  # Déplacé de 160 à 50 (110px vers la gauche)
    qr_y = height - 220  # Ajusté pour la nouvelle taille
    ticket_img.paste(qr_img, (qr_x, qr_y))

    # === ANNÉE AU-DESSUS DU QR CODE (EFFET 3D) ===
    from datetime import datetime
    current_year = str(datetime.now().year)

    try:
        # Utiliser la même police que "TICKET"
        font_year = ImageFont.truetype("OCRB.ttf", 60)  # Même style que TICKET (90px réduit à 60 pour la partie blanche)
    except:
        try:
            font_year = ImageFont.truetype("OCR-B.ttf", 60)
        except:
            try:
                font_year = ImageFont.truetype("courbd.ttf", 60)
            except:
                try:
                    font_year = ImageFont.truetype("cour.ttf", 60)
                except:
                    font_year = ImageFont.load_default()

    # Centrer l'année au-dessus du QR code
    year_bbox = draw.textbbox((0, 0), current_year, font=font_year)
    year_width = year_bbox[2] - year_bbox[0]
    year_x = qr_x + (200 - year_width) // 2  # Centré sur le QR code
    year_y = qr_y - 100  # Remonté de 80 à 100 (20px plus haut)

    # Effet 3D: Dessiner plusieurs couches d'ombre
    shadow_color = (100, 100, 100)  # Gris foncé pour l'ombre
    # Ombre en profondeur (plusieurs couches)
    for offset in range(5, 0, -1):
        shadow_alpha = 255 - (offset * 40)  # Dégradé d'opacité
        shadow_gray = 255 - (offset * 30)
        draw.text((year_x + offset, year_y + offset), current_year,
                 fill=(shadow_gray, shadow_gray, shadow_gray), font=font_year)

    # Texte principal en couleur primaire
    draw.text((year_x, year_y), current_year, fill=COLOR_PRIMARY, font=font_year)

    # === LIGNE DE SÉPARATION ===
    # Ligne pointillée verticale entre les deux parties
    dash_length = 10
    gap_length = 5
    y = 0
    while y < height:
        draw.line([(left_width, y), (left_width, y + dash_length)],
                 fill=COLOR_GRAY, width=2)
        y += dash_length + gap_length

    # Appliquer le masque pour les coins arrondis
    img.paste(ticket_img, (0, 0), mask)

    # Convertir en RGB pour la sauvegarde
    final_img = Image.new('RGB', (width, height), COLOR_WHITE)
    final_img.paste(img, (0, 0), img)

    # Sauvegarder si un chemin est fourni
    if output_path:
        final_img.save(output_path, quality=95)
        print(f"✅ Ticket généré: {output_path}")

    return final_img


def generate_ticket_from_reservation(reservation_data: dict, output_path: str = None) -> Image.Image:
    """
    Génère un ticket à partir des données de réservation

    Args:
        reservation_data (dict): Dictionnaire contenant les données de réservation
            - date_depart: datetime
            - heure_depart: str
            - reference_reservation: str
        output_path (str, optional): Chemin pour sauvegarder l'image

    Returns:
        Image.Image: Image PIL du ticket généré
    """
    from datetime import datetime

    # Extraire les données
    date_depart = reservation_data.get("date_depart")
    heure_depart = reservation_data.get("heure_depart", "00:00")
    reference = reservation_data.get("reference_reservation", "UNKNOWN")

    # Formater la date
    if isinstance(date_depart, datetime):
        jour = date_depart.strftime("%d %B").upper()
    else:
        jour = str(date_depart)

    # Formater l'heure (enlever AM/PM)
    if "AM" in heure_depart.upper() or "PM" in heure_depart.upper():
        # Enlever AM/PM
        heure_depart = heure_depart.upper().replace("AM", "").replace("PM", "").strip()

    # Générer le ticket
    return generate_custom_ticket(jour, heure_depart, reference, reference, "OKAKO", "KALEMIE", "UVIRA", "50$", "01", "05", "12", output_path)


# === EXEMPLE D'UTILISATION ===
if __name__ == "__main__":
    # Créer le dossier tickets s'il n'existe pas
    os.makedirs("tickets", exist_ok=True)

    # Exemple 1: Génération simple
    print("🎫 Génération du ticket exemple...")
    ticket = generate_custom_ticket(
        jour="10 AVR",
        heure_depart="10:00",  # Sans AM
        qrcode_data="RES-ABC123XYZ",
        numero_reservation="RES-00-30-96-00",
        name_boat="OKAKO KALEMIE",
        depart="KALEMIE",
        dest="UVIRA",

        montant="50$",
        niveau="01",
        chambre="05",
        chaise="12",
        output_path="tickets/ticket_example.png"
    )

    # # Exemple 2: Avec données de réservation
    # from datetime import datetime

    # reservation_data = {
    #     "date_depart": datetime(2024, 7, 10),
    #     "heure_depart": "10:00",
    #     "reference_reservation": "RES-ABC123XYZ"
    # }

    # ticket2 = generate_ticket_from_reservation(
    #     reservation_data,
    #     output_path="tickets/ticket_from_reservation.png"
    # )

    # print("✅ Tickets générés avec succès!")
    # print("📁 Vérifiez le dossier 'tickets/'")

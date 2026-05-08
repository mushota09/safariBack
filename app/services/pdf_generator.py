import os
from datetime import datetime
from typing import Dict, Any
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from app.config import settings


class PDFGenerator:
    """Générateur de PDF pour les billets"""

    def __init__(self):
        self.pdf_dir = settings.PDF_DIR
        os.makedirs(self.pdf_dir, exist_ok=True)

    async def generate_ticket_pdf(
        self,
        ticket_data: Dict[str, Any],
        qr_code_path: str = None
    ) -> str:
        """
        Génère un PDF de billet.

        Retourne le chemin du fichier PDF généré.
        """
        filename = f"ticket_{ticket_data['numero_ticket']}.pdf"
        filepath = os.path.join(self.pdf_dir, filename)

        # Créer le document
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        story = []

        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#007bff'),
            alignment=TA_CENTER,
            spaceAfter=30
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#333333'),
            spaceAfter=12
        )

        normal_style = styles['Normal']

        # Titre
        title = Paragraph("BILLET DE BATEAU", title_style)
        story.append(title)
        story.append(Spacer(1, 0.5*cm))

        # Informations de réservation
        data = [
            ['Référence:', ticket_data.get('reference_reservation', 'N/A')],
            ['Numéro de billet:', ticket_data.get('numero_ticket', 'N/A')],
            ['', ''],
            ['Passager:', ticket_data.get('nom_passager', 'N/A')],
            ['Email:', ticket_data.get('email_passager', 'N/A')],
            ['', ''],
            ['Port de départ:', ticket_data.get('port_depart', 'N/A')],
            ['Port d\'arrivée:', ticket_data.get('port_arrivee', 'N/A')],
            ['Date de départ:', ticket_data.get('date_depart', 'N/A')],
            ['Date d\'arrivée:', ticket_data.get('date_arrivee', 'N/A')],
            ['', ''],
            ['Bateau:', ticket_data.get('nom_bateau', 'N/A')],
            ['Compagnie:', ticket_data.get('nom_compagnie', 'N/A')],
            ['', ''],
            ['Nombre de passagers:', str(ticket_data.get('nombre_passagers', 1))],
            ['Véhicule inclus:', 'Oui' if ticket_data.get('vehicule_inclus') else 'Non'],
        ]

        if ticket_data.get('vehicule_inclus'):
            data.append(['Type de véhicule:', ticket_data.get('type_vehicule', 'N/A')])
            data.append(['Immatriculation:', ticket_data.get('immatriculation_vehicule', 'N/A')])

        data.append(['', ''])
        data.append(['Montant total:', f"{ticket_data.get('montant_total', 0):.2f} €"])

        # Créer le tableau
        table = Table(data, colWidths=[6*cm, 10*cm])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#555555')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))

        story.append(table)
        story.append(Spacer(1, 1*cm))

        # QR Code
        if qr_code_path and os.path.exists(qr_code_path):
            try:
                qr_image = Image(qr_code_path, width=5*cm, height=5*cm)
                qr_label = Paragraph("Scannez ce code lors de l'embarquement", heading_style)
                story.append(qr_label)
                story.append(Spacer(1, 0.3*cm))
                story.append(qr_image)
            except Exception as e:
                print(f"Erreur lors de l'ajout du QR code: {e}")

        story.append(Spacer(1, 1*cm))

        # Instructions
        instructions = Paragraph(
            "<b>Instructions importantes:</b><br/>"
            "• Présentez-vous au port au moins 30 minutes avant le départ<br/>"
            "• Munissez-vous d'une pièce d'identité valide<br/>"
            "• Ce billet est nominatif et non transférable<br/>"
            "• En cas de perte, contactez immédiatement le service client",
            normal_style
        )
        story.append(instructions)

        # Générer le PDF
        doc.build(story)

        return filepath

    async def read_pdf(self, filepath: str) -> bytes:
        """Lit un fichier PDF et retourne son contenu en bytes"""
        with open(filepath, 'rb') as f:
            return f.read()


pdf_generator = PDFGenerator()

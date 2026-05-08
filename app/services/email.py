import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import List, Optional
from jinja2 import Template

from app.config import settings


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        attachments: Optional[List[tuple[str, bytes]]] = None
    ) -> bool:
        """Envoie un email avec pièces jointes optionnelles"""
        try:
            message = MIMEMultipart()
            message["From"] = self.from_email
            message["To"] = to_email
            message["Subject"] = subject

            # Corps HTML
            message.attach(MIMEText(html_content, "html"))

            # Pièces jointes
            if attachments:
                for filename, content in attachments:
                    part = MIMEApplication(content, Name=filename)
                    part["Content-Disposition"] = f'attachment; filename="{filename}"'
                    message.attach(part)

            # Envoyer l'email
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                start_tls=True
            )

            return True
        except Exception as e:
            print(f"Erreur lors de l'envoi de l'email: {e}")
            return False

    async def send_reservation_confirmation(
        self,
        to_email: str,
        reservation_data: dict,
        pdf_content: bytes = None
    ) -> bool:
        """Envoie un email de confirmation de réservation"""
        template = Template("""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f8f9fa; }
                .footer { text-align: center; padding: 20px; color: #6c757d; }
                .info { margin: 10px 0; }
                .label { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Confirmation de Réservation</h1>
                </div>
                <div class="content">
                    <p>Bonjour,</p>
                    <p>Votre réservation a été confirmée avec succès !</p>

                    <div class="info">
                        <span class="label">Référence:</span> {{ reference }}
                    </div>
                    <div class="info">
                        <span class="label">Voyage:</span> {{ port_depart }} → {{ port_arrivee }}
                    </div>
                    <div class="info">
                        <span class="label">Date de départ:</span> {{ date_depart }}
                    </div>
                    <div class="info">
                        <span class="label">Nombre de passagers:</span> {{ nombre_passagers }}
                    </div>
                    <div class="info">
                        <span class="label">Montant total:</span> {{ montant_total }} €
                    </div>

                    <p>Votre billet est en pièce jointe. Veuillez le présenter lors de l'embarquement.</p>

                    <p>Bon voyage !</p>
                </div>
                <div class="footer">
                    <p>{{ app_name }}</p>
                </div>
            </div>
        </body>
        </html>
        """)

        html_content = template.render(
            reference=reservation_data.get("reference"),
            port_depart=reservation_data.get("port_depart"),
            port_arrivee=reservation_data.get("port_arrivee"),
            date_depart=reservation_data.get("date_depart"),
            nombre_passagers=reservation_data.get("nombre_passagers"),
            montant_total=reservation_data.get("montant_total"),
            app_name=settings.APP_NAME
        )

        attachments = []
        if pdf_content:
            attachments.append((f"billet_{reservation_data.get('reference')}.pdf", pdf_content))

        return await self.send_email(
            to_email=to_email,
            subject=f"Confirmation de réservation - {reservation_data.get('reference')}",
            html_content=html_content,
            attachments=attachments
        )

    async def send_cancellation_email(
        self,
        to_email: str,
        reservation_data: dict
    ) -> bool:
        """Envoie un email d'annulation de réservation"""
        template = Template("""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f8f9fa; }
                .footer { text-align: center; padding: 20px; color: #6c757d; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Annulation de Réservation</h1>
                </div>
                <div class="content">
                    <p>Bonjour,</p>
                    <p>Votre réservation <strong>{{ reference }}</strong> a été annulée.</p>

                    {% if frais_annulation > 0 %}
                    <p>Frais d'annulation: {{ frais_annulation }} €</p>
                    <p>Montant remboursé: {{ montant_rembourse }} €</p>
                    {% else %}
                    <p>Remboursement intégral: {{ montant_total }} €</p>
                    {% endif %}

                    <p>Le remboursement sera effectué sous 5 à 7 jours ouvrés.</p>
                </div>
                <div class="footer">
                    <p>{{ app_name }}</p>
                </div>
            </div>
        </body>
        </html>
        """)

        html_content = template.render(
            reference=reservation_data.get("reference"),
            frais_annulation=reservation_data.get("frais_annulation", 0),
            montant_rembourse=reservation_data.get("montant_rembourse", 0),
            montant_total=reservation_data.get("montant_total", 0),
            app_name=settings.APP_NAME
        )

        return await self.send_email(
            to_email=to_email,
            subject=f"Annulation de réservation - {reservation_data.get('reference')}",
            html_content=html_content
        )


email_service = EmailService()

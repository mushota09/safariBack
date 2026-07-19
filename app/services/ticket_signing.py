"""Service de signature des tickets/QR codes.

Chaque QR code (global ou individuel) embarque un payload JSON signé avec HMAC
SHA-256 et la `SECRET_KEY` de l'application. À l'embarquement, la signature est
vérifiée pour empêcher la fabrication ou la copie de tickets.

Format du QR encodé:
    SAFARI:<base64url(payload_json)>.<base64url(hmac_sha256)>

Le scanner appelle `decode_qr_payload` qui:
  - Lève si le préfixe est invalide
  - Lève si la signature ne correspond pas
  - Retourne le payload décodé sinon
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import uuid
from datetime import datetime
from typing import Any, Dict, Literal

from app.config import settings


_PREFIX = "SAFARI:"
_SEP = "."


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    pad = "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode(data + pad)


def _sign(payload_bytes: bytes) -> bytes:
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).digest()


def sign_payload(payload: Dict[str, Any]) -> tuple[str, str, str]:
    """Sérialise et signe un payload.

    Renvoie ``(payload_json, signature_hex, qr_string)``.
    """
    payload_json = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    payload_bytes = payload_json.encode("utf-8")
    signature = _sign(payload_bytes)
    qr_string = f"{_PREFIX}{_b64url_encode(payload_bytes)}{_SEP}{_b64url_encode(signature)}"
    return payload_json, signature.hex(), qr_string


def verify_qr(qr_string: str) -> Dict[str, Any]:
    """Vérifie un QR code scanné et retourne le payload décodé.

    Lève ``ValueError`` en cas de format ou signature invalides.
    """
    if not qr_string or not qr_string.startswith(_PREFIX):
        raise ValueError("QR code format invalid (prefix)")

    body = qr_string[len(_PREFIX):]
    if _SEP not in body:
        raise ValueError("QR code format invalid (separator)")

    encoded_payload, encoded_sig = body.rsplit(_SEP, 1)

    try:
        payload_bytes = _b64url_decode(encoded_payload)
        signature = _b64url_decode(encoded_sig)
    except Exception as exc:  # pragma: no cover - défensif
        raise ValueError("QR code format invalid (encoding)") from exc

    expected = _sign(payload_bytes)
    if not hmac.compare_digest(expected, signature):
        raise ValueError("QR signature mismatch")

    try:
        return json.loads(payload_bytes.decode("utf-8"))
    except Exception as exc:  # pragma: no cover - défensif
        raise ValueError("QR payload invalid") from exc


def build_global_ticket(reservation_id: int, reference: str) -> tuple[str, Dict[str, Any], str, str]:
    """Construit un ticket global pour une réservation.

    Renvoie ``(numero_ticket, payload, signature_hex, qr_string)``.
    """
    numero = f"TKT-G-{uuid.uuid4().hex[:12].upper()}"
    payload: Dict[str, Any] = {
        "kind": "global",
        "ticket": numero,
        "reservation_id": reservation_id,
        "reference": reference,
        "issued_at": datetime.utcnow().isoformat() + "Z",
        "nonce": uuid.uuid4().hex,
    }
    _, sig_hex, qr = sign_payload(payload)
    return numero, payload, sig_hex, qr

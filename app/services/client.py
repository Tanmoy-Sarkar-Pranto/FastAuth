from sqlalchemy.orm import Session

from app.models.client import Client
from app.core.security import verify_password


def authenticate_client(db: Session, client_id: str, client_secret: str) -> Client | None:
    """Look up client by client_id and verify secret. Returns Client or None."""
    client = db.query(Client).filter(Client.client_id == client_id).first()

    if client is None:
        return None

    if not client.is_active:
        return None

    if not verify_password(client_secret, client.client_secret_hash):
        return None

    return client

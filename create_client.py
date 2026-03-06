"""
One-off script to create an OAuth2 client for testing.
Run inside the container:
  docker compose exec app python scripts/create_client.py
"""
from app.db.session import SessionLocal
from app.models.client import Client
from app.core.security import hash_password

CLIENT_ID = "test-client"
CLIENT_SECRET = "super-secret"
ALLOWED_SCOPES = "read write"
REDIRECT_URIS = "http://localhost:3000/callback"

db = SessionLocal()

existing = db.query(Client).filter(Client.client_id == CLIENT_ID).first()
if existing:
    print(f"Client '{CLIENT_ID}' already exists.")
else:
    client = Client(
        client_id=CLIENT_ID,
        client_secret_hash=hash_password(CLIENT_SECRET),
        allowed_scopes=ALLOWED_SCOPES,
        redirect_uris=REDIRECT_URIS,
    )
    db.add(client)
    db.commit()
    print(f"Client '{CLIENT_ID}' created with secret '{CLIENT_SECRET}'.")

db.close()

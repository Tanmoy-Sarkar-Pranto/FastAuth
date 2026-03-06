"""
Seed default scopes into the scopes table.
Run inside the container:
  docker compose exec app python create_scopes.py
"""
from app.db.session import SessionLocal
from app.models.scope import Scope

DEFAULT_SCOPES = [
    ("read", "Read access to resources"),
    ("write", "Write access to resources"),
    ("admin", "Administrative access"),
]

db = SessionLocal()

for name, description in DEFAULT_SCOPES:
    existing = db.query(Scope).filter(Scope.name == name).first()
    if existing:
        print(f"Scope '{name}' already exists.")
    else:
        db.add(Scope(name=name, description=description))
        print(f"Scope '{name}' created.")

db.commit()
db.close()

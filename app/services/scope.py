from sqlalchemy.orm import Session

from app.models.scope import Scope


def get_valid_scope_names(db: Session) -> set[str]:
    """Return all registered scope names."""
    return {row.name for row in db.query(Scope.name).all()}


def resolve_scopes(db: Session, requested: list[str], allowed: list[str]) -> list[str]:
    """
    Validate and resolve scopes for a token request.

    - If no scopes requested, return all scopes the client is allowed (that exist in registry).
    - If scopes requested, each must exist in the registry AND be allowed for the client.
    - Raises ValueError with reason if any requested scope is invalid or not permitted.
    """
    valid = get_valid_scope_names(db)
    allowed_set = set(allowed)

    if not requested:
        return sorted(allowed_set & valid)

    for s in requested:
        if s not in valid:
            raise ValueError(f"Scope '{s}' does not exist.")
        if s not in allowed_set:
            raise ValueError(f"Scope '{s}' is not permitted for this client.")

    return sorted(requested)

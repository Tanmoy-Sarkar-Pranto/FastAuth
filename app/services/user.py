from sqlalchemy.orm import Session

from app.models.user import User
from app.core.security import verify_password, hash_password


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, email: str, password: str) -> User:
    """Create a new user. Raises ValueError if email already exists."""
    existing = get_user_by_email(db, email)
    if existing:
        raise ValueError("A user with this email already exists.")

    user = User(
        email=email.lower().strip(),
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

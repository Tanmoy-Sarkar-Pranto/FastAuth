import base64

from fastapi import APIRouter
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey

from app.core.config import get_settings

router = APIRouter(tags=["discovery"])


def _int_to_base64url(n: int) -> str:
    length = (n.bit_length() + 7) // 8
    return base64.urlsafe_b64encode(n.to_bytes(length, "big")).rstrip(b"=").decode()


@router.get("/.well-known/jwks.json")
def jwks():
    settings = get_settings()

    with open(settings.public_key_path, "rb") as f:
        public_key = load_pem_public_key(f.read())

    assert isinstance(public_key, RSAPublicKey)
    numbers = public_key.public_numbers()

    return {
        "keys": [
            {
                "kty": "RSA",
                "use": "sig",
                "alg": "RS256",
                "kid": "1",  # static for now — proper rotation later
                "n": _int_to_base64url(numbers.n),
                "e": _int_to_base64url(numbers.e),
            }
        ]
    }

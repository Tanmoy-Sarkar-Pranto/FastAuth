import base64

from fastapi import APIRouter
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey

from app.core.config import get_settings

router = APIRouter(tags=["discovery"])


def _int_to_base64url(n: int) -> str:
    length = (n.bit_length() + 7) // 8
    return base64.urlsafe_b64encode(n.to_bytes(length, "big")).rstrip(b"=").decode()


@router.get("/.well-known/openid-configuration")
def openid_configuration():
    settings = get_settings()
    base = settings.issuer_url.rstrip("/")

    return {
        "issuer": base,
        "authorization_endpoint": f"{base}/api/v1/authorize",
        "token_endpoint": f"{base}/api/v1/token",
        "introspection_endpoint": f"{base}/api/v1/introspect",
        "jwks_uri": f"{base}/.well-known/jwks.json",
        "response_types_supported": ["code"],
        "grant_types_supported": [
            "authorization_code",
            "client_credentials",
            "password",
            "refresh_token",
        ],
        "token_endpoint_auth_methods_supported": ["client_secret_post"],
        "code_challenge_methods_supported": ["S256"],
    }


def _build_jwk(public_key_path: str, kid: str) -> dict:
    with open(public_key_path, "rb") as f:
        public_key = load_pem_public_key(f.read())
    assert isinstance(public_key, RSAPublicKey)
    numbers = public_key.public_numbers()
    return {
        "kty": "RSA",
        "use": "sig",
        "alg": "RS256",
        "kid": kid,
        "n": _int_to_base64url(numbers.n),
        "e": _int_to_base64url(numbers.e),
    }


@router.get("/.well-known/jwks.json")
def jwks():
    settings = get_settings()

    keys = [_build_jwk(settings.public_key_path, settings.key_id)]

    # Include secondary key during rotation so old tokens remain verifiable
    if settings.secondary_key_id and settings.secondary_public_key_path:
        keys.append(_build_jwk(settings.secondary_public_key_path, settings.secondary_key_id))

    return {"keys": keys}

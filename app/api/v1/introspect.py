from fastapi import APIRouter, Form
from pydantic import BaseModel

from app.core.jwt import decode_access_token

router = APIRouter(tags=["auth"])


class IntrospectionResponse(BaseModel):
    active: bool
    sub: str | None = None
    exp: int | None = None
    iat: int | None = None
    iss: str | None = None
    scope: str | None = None
    jti: str | None = None


@router.post("/introspect", response_model=IntrospectionResponse)
def introspect(token: str = Form(...)):
    payload = decode_access_token(token)

    if payload is None:
        return IntrospectionResponse(active=False)

    return IntrospectionResponse(
        active=True,
        sub=payload.get("sub"),
        exp=payload.get("exp"),
        iat=payload.get("iat"),
        iss=payload.get("iss"),
        scope=payload.get("scope"),
        jti=payload.get("jti"),
    )

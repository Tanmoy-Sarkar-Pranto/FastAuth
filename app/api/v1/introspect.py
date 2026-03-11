from fastapi import APIRouter, Depends, Form, Request
from pydantic import BaseModel

from app.core.jwt import decode_access_token
from app.core.rate_limit import make_rate_limiter
from app.core import audit

router = APIRouter(tags=["auth"])

_introspect_rate_limit = make_rate_limiter("introspect_rate_limit_requests", "rate_limit_introspect")


class IntrospectionResponse(BaseModel):
    active: bool
    sub: str | None = None
    exp: int | None = None
    iat: int | None = None
    iss: str | None = None
    scope: str | None = None
    jti: str | None = None


@router.post("/introspect", response_model=IntrospectionResponse, dependencies=[Depends(_introspect_rate_limit)])
def introspect(request: Request, token: str = Form(...)):
    ip = request.client.host
    payload = decode_access_token(token)

    if payload is None:
        audit.introspection_called(ip=ip, active=False)
        return IntrospectionResponse(active=False)

    audit.introspection_called(ip=ip, active=True)
    return IntrospectionResponse(
        active=True,
        sub=payload.get("sub"),
        exp=payload.get("exp"),
        iat=payload.get("iat"),
        iss=payload.get("iss"),
        scope=payload.get("scope"),
        jti=payload.get("jti"),
    )

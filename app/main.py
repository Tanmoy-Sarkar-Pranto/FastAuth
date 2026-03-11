import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings
from app.api.v1 import health, token, introspect, users, authorize
from app.api.v1.admin import clients as admin_clients
from app.api.v1.admin import users as admin_users
from app.api.v1.admin import scopes as admin_scopes
from app.api.v1.admin import stats as admin_stats
from app.api.v1.admin import audit_logs as admin_audit_logs
from app.api import well_known

logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if settings.admin_api_key == "change-me-in-production":
        if settings.app_env == "production":
            raise RuntimeError(
                "FATAL: ADMIN_API_KEY is set to the default value. "
                "Set a strong secret in .env before running in production."
            )
        else:
            print(
                "\n⚠  SECURITY WARNING: ADMIN_API_KEY is the default 'change-me-in-production'."
                " Change this before deploying to production.\n",
                flush=True,
            )
    yield


_SWAGGER_PATHS = {"/docs", "/redoc", "/openapi.json"}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to every response. Skips CSP for Swagger UI paths."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Skip CSP for Swagger/ReDoc — they load scripts and styles from cdn.jsdelivr.net
        if request.url.path not in _SWAGGER_PATHS:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "img-src 'self' data:; "
                "frame-ancestors 'none'"
            )
        return response


settings = get_settings()

app = FastAPI(title="FastAuth", version="1.0.0", lifespan=lifespan)

# Middleware registration — Starlette uses LIFO so last-added runs outermost (first).
# Proxy header trust is handled by uvicorn's --proxy-headers flag in docker-compose.yml.
# Desired order: CORSMiddleware → SecurityHeadersMiddleware → app
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(token.router, prefix="/api/v1")
app.include_router(introspect.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(authorize.router, prefix="/api/v1")
app.include_router(admin_clients.router, prefix="/api/v1")
app.include_router(admin_users.router, prefix="/api/v1")
app.include_router(admin_scopes.router, prefix="/api/v1")
app.include_router(admin_stats.router, prefix="/api/v1")
app.include_router(admin_audit_logs.router, prefix="/api/v1")
app.include_router(well_known.router)

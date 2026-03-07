from fastapi import FastAPI

from app.api.v1 import health, token, introspect, users, authorize
from app.api.v1.admin import clients as admin_clients
from app.api.v1.admin import users as admin_users
from app.api import well_known

app = FastAPI(title="FastAuth", version="1.0.0")

app.include_router(health.router, prefix="/api/v1")
app.include_router(token.router, prefix="/api/v1")
app.include_router(introspect.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(authorize.router, prefix="/api/v1")
app.include_router(admin_clients.router, prefix="/api/v1")
app.include_router(admin_users.router, prefix="/api/v1")
app.include_router(well_known.router)

from fastapi import FastAPI

from app.api.v1 import health, token

app = FastAPI(title="FastAuth", version="1.0.0")

app.include_router(health.router, prefix="/api/v1")
app.include_router(token.router, prefix="/api/v1")

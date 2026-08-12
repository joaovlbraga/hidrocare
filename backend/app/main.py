# Copyright (c) 2026 João Vitor de Lima Braga. All rights reserved.
# This software is the confidential and proprietary information of João Vitor de Lima Pellegrini Braga.
# System: HidroCare

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, balances, patients, vitals

Base.metadata.create_all(bind=engine)  # Trocar por Alembic em ambientes produtivos.

app = FastAPI(title="API Balanço Hídrico", version="0.1.0")
# Desenvolvimento local: aceita localhost e endereços privados da rede 192.168.x.x.
# Em produção, substitua por uma lista explícita do domínio HTTPS da instituição.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"^http://192\.168\.\d{1,3}\.\d{1,3}:3000$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(balances.router, prefix="/api/v1")
app.include_router(patients.router, prefix="/api/v1")
app.include_router(vitals.router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok"}

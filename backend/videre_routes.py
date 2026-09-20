"""
videre_routes.py — las rutas HTTP reales del producto, sobre FastAPI,
usando el motor de videre_engine.py. Se importa e incluye desde server.py.
"""
import os
import base64
import io
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from anthropic import Anthropic

try:
    from . import videre_engine as engine
except ImportError:
    import videre_engine as engine

router = APIRouter(prefix="/api/producto")
anthropic_client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


# ---------------------------------------------------------------------
# Modelos de entrada
# ---------------------------------------------------------------------
class OnboardingIn(BaseModel):
    historial: list[dict]


class ArchivoIn(BaseModel):
    nombre: str
    base64: str


class ImportarIn(BaseModel):
    archivos: list[ArchivoIn]


class GoogleSheetIn(BaseModel):
    url: str


class SupabaseIn(BaseModel):
    url: str
    api_key: str
    tabla: str


class TablasIn(BaseModel):
    tablas: dict  # { nombre: {cols, rows, profiled} } — lo que devolvió /perfilar


class MatchIn(BaseModel):
    match: dict


class ConfirmarIn(BaseModel):
    workspace_id: str
    match: dict
    merge: bool


class ResolverIn(BaseModel):
    workspace_id: str
    match: dict


class ConstruirIn(BaseModel):
    workspace_id: str
    tablas: dict
    resueltas: list[dict]


class ExportarIn(BaseModel):
    hojas: dict  # {nombreHoja: [ {col:val,...}, ... ]}


class PermisosIn(BaseModel):
    workspace_id: str
    set: dict | None = None


class ChatIn(BaseModel):
    workspace_id: str
    session_id: str
    rol: str
    pregunta: str
    datos: dict


def _get_db(request_app):
    return request_app.state.mongo_db if hasattr(request_app.state, "mongo_db") else None


# ---------------------------------------------------------------------
# 0. ONBOARDING — la conversación real
# ---------------------------------------------------------------------
@router.post("/onboarding")
def onboarding(payload: OnboardingIn):
    return engine.onboarding_pregunta(anthropic_client, payload.historial)


# ---------------------------------------------------------------------
# 0.5 IMPORTAR — archivo subido (CSV/XLSX), Google Sheet público, Supabase
# ---------------------------------------------------------------------
def _leer_archivo(nombre: str, contenido_b64: str) -> dict:
    raw = base64.b64decode(contenido_b64)
    if nombre.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(raw), dtype=str, keep_default_na=False)
    else:
        df = pd.read_excel(io.BytesIO(raw), dtype=str)
        df = df.fillna("")
    tabla_nombre = nombre.rsplit(".", 1)[0]
    return {tabla_nombre: {"cols": list(df.columns), "rows": df.values.tolist()}}


@router.post("/importar")
def importar(payload: ImportarIn):
    tablas_crudas = {}
    for a in payload.archivos:
        tablas_crudas.update(_leer_archivo(a.nombre, a.base64))
    return {"tablas": engine.perfilar_tablas(tablas_crudas)}


@router.post("/importar_google_sheet")
def importar_google_sheet(payload: GoogleSheetIn):
    import re as _re
    m = _re.search(r"/d/([a-zA-Z0-9-_]+)", payload.url)
    if not m:
        raise HTTPException(400, "No parece un link válido de Google Sheets.")
    gid_match = _re.search(r"gid=([0-9]+)", payload.url)
    gid = gid_match.group(1) if gid_match else "0"
    csv_url = f"https://docs.google.com/spreadsheets/d/{m.group(1)}/export?format=csv&gid={gid}"
    try:
        df = pd.read_csv(csv_url, dtype=str, keep_default_na=False)
    except Exception as e:
        raise HTTPException(400, f"No se pudo leer la hoja — ¿está compartida como 'cualquiera con el link'? ({e})")
    tablas_crudas = {"google_sheet": {"cols": list(df.columns), "rows": df.values.tolist()}}
    return {"tablas": engine.perfilar_tablas(tablas_crudas)}


@router.post("/importar_supabase")
def importar_supabase(payload: SupabaseIn):
    import requests
    endpoint = f"{payload.url.rstrip('/')}/rest/v1/{payload.tabla}?select=*"
    resp = requests.get(endpoint, headers={"apikey": payload.api_key, "Authorization": f"Bearer {payload.api_key}"})
    if not resp.ok:
        raise HTTPException(400, f"Supabase respondió {resp.status_code}: {resp.text}")
    filas = resp.json()
    if not filas:
        raise HTTPException(400, "La tabla existe pero no tiene filas, o el nombre está mal escrito.")
    cols = list(filas[0].keys())
    tablas_crudas = {payload.tabla: {"cols": cols, "rows": [[f.get(c) for c in cols] for f in filas]}}
    return {"tablas": engine.perfilar_tablas(tablas_crudas)}


# ---------------------------------------------------------------------
# 1-2. PERFILAR / ENCONTRAR COINCIDENCIAS
# ---------------------------------------------------------------------
class PerfilarIn(BaseModel):
    tablas: dict  # {nombre: {cols:[...], rows:[[...]]}} — crudo, sin perfilar todavía


@router.post("/perfilar")
def perfilar(payload: PerfilarIn):
    return {"tablas": engine.perfilar_tablas(payload.tablas)}


@router.post("/encontrar_coincidencias")
def encontrar_coincidencias(payload: TablasIn):
    return {"candidatos": engine.encontrar_coincidencias(payload.tablas)}


# ---------------------------------------------------------------------
# 3. RESOLVER / CONFIRMAR COINCIDENCIA
# ---------------------------------------------------------------------
@router.post("/resolver_coincidencia")
async def resolver_coincidencia(payload: ResolverIn, request: Request):
    db = request.app.state.mongo_db
    return await engine.resolver_coincidencia(db, payload.workspace_id, payload.match, anthropic_client)


@router.post("/confirmar_coincidencia")
async def confirmar_coincidencia(payload: ConfirmarIn, request: Request):
    db = request.app.state.mongo_db
    await engine.confirmar_coincidencia(db, payload.workspace_id, payload.match, payload.merge)
    return {"ok": True}


# ---------------------------------------------------------------------
# 4. CONSTRUIR ONTOLOGÍA
# ---------------------------------------------------------------------
@router.post("/construir_ontologia")
async def construir_ontologia(payload: ConstruirIn, request: Request):
    db = request.app.state.mongo_db
    ontologia = engine.construir_ontologia(payload.tablas, payload.resueltas)
    warnings = engine.check_consistency(payload.tablas, ontologia)
    version = await engine.guardar_version(db, payload.workspace_id, ontologia, warnings)
    return {"ontology": ontologia, "warnings": warnings, "version": version}


# ---------------------------------------------------------------------
# 5. EXPORTAR — arma un XLSX en memoria, nunca se guarda en el servidor
# ---------------------------------------------------------------------
@router.post("/exportar")
def exportar(payload: ExportarIn):
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        for nombre, filas in payload.hojas.items():
            pd.DataFrame(filas).to_excel(writer, sheet_name=nombre[:31], index=False)
    buf.seek(0)
    return {"archivo_base64": base64.b64encode(buf.read()).decode(), "nombre": "vidire_export.xlsx"}


# ---------------------------------------------------------------------
# 6. PERMISOS
# ---------------------------------------------------------------------
@router.post("/permisos")
async def permisos(payload: PermisosIn, request: Request):
    db = request.app.state.mongo_db
    if payload.set:
        await db.permisos.update_one({"workspace_id": payload.workspace_id}, {"$set": {"roles": payload.set}}, upsert=True)
        return {"ok": True}
    return {"permisos": await engine.get_permisos(db, payload.workspace_id)}


# ---------------------------------------------------------------------
# 7. CHAT — límite real + alcance restringido, nunca guarda la pregunta
# ---------------------------------------------------------------------
@router.post("/chat")
async def chat(payload: ChatIn, request: Request):
    db = request.app.state.mongo_db
    respuesta = await engine.chat_responder(
        db, payload.workspace_id, payload.session_id, payload.rol, payload.pregunta, payload.datos, anthropic_client
    )
    return {"respuesta": respuesta}

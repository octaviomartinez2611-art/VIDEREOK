import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from starlette.middleware.cors import CORSMiddleware

try:
    from . import videre_routes
except ImportError:
    import videre_routes

load_dotenv(Path(__file__).parent / '.env')
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
logger = logging.getLogger('videre')


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.access_requests.create_index('email', unique=True)
    app.state.mongo_db = db  # así videre_routes.py accede a la misma conexión, sin abrir otra
    yield
    client.close()


app = FastAPI(title='VIDERE', lifespan=lifespan)
api = APIRouter(prefix='/api')
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ['CORS_ORIGINS'].split(','),
    allow_credentials=False,
    allow_methods=['GET', 'POST'],
    allow_headers=['Content-Type'],
)


class AccessRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    company: str = Field(min_length=2, max_length=150)
    company_size: str
    consent: bool

    @field_validator('company_size')
    @classmethod
    def valid_size(cls, value):
        if value not in ['1–10', '11–50', '51–200', 'Más de 200']:
            raise ValueError('Seleccioná el tamaño de tu equipo.')
        return value

    @field_validator('consent')
    @classmethod
    def consent_required(cls, value):
        if not value:
            raise ValueError('Necesitamos tu consentimiento para contactarte.')
        return value


class AccessResponse(BaseModel):
    success: bool
    message: str


@api.get('/')
async def health():
    return {'name': 'VIDERE', 'status': 'ok'}


@api.post('/access-requests', response_model=AccessResponse, status_code=201)
async def request_access(payload: AccessRequest):
    """Idempotent registration. Never expose requests or reveal existing emails."""
    email = str(payload.email).lower()
    document = payload.model_dump(mode='json')
    document.update(email=email, id=str(uuid.uuid4()), created_at=datetime.now(timezone.utc).isoformat())
    try:
        await db.access_requests.update_one({'email': email}, {'$setOnInsert': document}, upsert=True)
    except Exception:
        logger.exception('Could not save access request')
        raise HTTPException(status_code=503, detail='No pudimos guardar tu solicitud. Intentá nuevamente en un momento.')
    return AccessResponse(success=True, message='Tu solicitud quedó registrada. Te contactaremos para conocer tu negocio.')


app.include_router(api)
app.include_router(videre_routes.router)
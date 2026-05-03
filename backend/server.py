from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_MIN = 60 * 24 * 7  # 7 days for mobile convenience

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Connect API")
api = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("connect")


# ---------- Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_TTL_MIN),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def serialize_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "avatar": u.get("avatar"),
        "bio": u.get("bio", ""),
        "created_at": u.get("created_at"),
    }


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    token = None
    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4)
    name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    token: str
    user: dict


class MessageIn(BaseModel):
    chat_id: str
    type: Literal["text", "voice", "image", "file"]
    text: Optional[str] = None
    media: Optional[str] = None  # base64 data URL
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    duration_ms: Optional[int] = None  # for voice


class ChatCreateIn(BaseModel):
    other_user_id: str


class CallCreateIn(BaseModel):
    other_user_id: str
    duration_sec: int = 0
    status: Literal["completed", "missed", "outgoing", "incoming"] = "completed"


# ---------- Auth Routes ----------
@api.post("/auth/register")
async def register(payload: RegisterIn):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "avatar": None,
        "bio": "",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_token(user["id"], email)
    return {"token": token, "user": serialize_user(user)}


@api.post("/auth/login")
async def login(payload: LoginIn):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], email)
    return {"token": token, "user": serialize_user(user)}


@api.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return serialize_user(current)


@api.post("/auth/logout")
async def logout(current=Depends(get_current_user)):
    return {"ok": True}


# ---------- Users ----------
@api.get("/users")
async def list_users(current=Depends(get_current_user)):
    users = await db.users.find({"id": {"$ne": current["id"]}}, {"_id": 0, "password_hash": 0}).to_list(200)
    return [serialize_user(u) for u in users]


# ---------- Chats ----------
def chat_key(a: str, b: str) -> str:
    return ":".join(sorted([a, b]))


@api.get("/chats")
async def list_chats(current=Depends(get_current_user)):
    chats = await db.chats.find({"members": current["id"]}, {"_id": 0}).to_list(500)
    # Enrich with other user + last message
    out = []
    for c in chats:
        other_id = next((m for m in c["members"] if m != current["id"]), None)
        other = await db.users.find_one({"id": other_id}, {"_id": 0, "password_hash": 0}) if other_id else None
        last_msg = await db.messages.find_one(
            {"chat_id": c["id"]}, sort=[("created_at", -1)], projection={"_id": 0}
        )
        out.append(
            {
                "id": c["id"],
                "type": c.get("type", "dm"),
                "other": serialize_user(other) if other else None,
                "last_message": last_msg,
                "updated_at": c.get("updated_at", c.get("created_at")),
            }
        )
    out.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
    return out


@api.post("/chats")
async def create_chat(payload: ChatCreateIn, current=Depends(get_current_user)):
    if payload.other_user_id == current["id"]:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")
    other = await db.users.find_one({"id": payload.other_user_id}, {"_id": 0})
    if not other:
        raise HTTPException(status_code=404, detail="User not found")
    key = chat_key(current["id"], payload.other_user_id)
    existing = await db.chats.find_one({"key": key}, {"_id": 0})
    if existing:
        return {"id": existing["id"], "type": existing.get("type", "dm")}
    chat = {
        "id": str(uuid.uuid4()),
        "key": key,
        "type": "dm",  # future: "space"
        "members": [current["id"], payload.other_user_id],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.chats.insert_one(chat)
    return {"id": chat["id"], "type": chat["type"]}


@api.get("/chats/{chat_id}")
async def get_chat(chat_id: str, current=Depends(get_current_user)):
    chat = await db.chats.find_one({"id": chat_id, "members": current["id"]}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    other_id = next((m for m in chat["members"] if m != current["id"]), None)
    other = await db.users.find_one({"id": other_id}, {"_id": 0, "password_hash": 0}) if other_id else None
    return {
        "id": chat["id"],
        "type": chat.get("type", "dm"),
        "other": serialize_user(other) if other else None,
    }


@api.get("/chats/{chat_id}/messages")
async def list_messages(chat_id: str, current=Depends(get_current_user)):
    chat = await db.chats.find_one({"id": chat_id, "members": current["id"]})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    msgs = await db.messages.find({"chat_id": chat_id}, {"_id": 0}).sort("created_at", 1).to_list(2000)
    return msgs


@api.post("/chats/{chat_id}/messages")
async def send_message(chat_id: str, payload: MessageIn, current=Depends(get_current_user)):
    chat = await db.chats.find_one({"id": chat_id, "members": current["id"]})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    msg = {
        "id": str(uuid.uuid4()),
        "chat_id": chat_id,
        "sender_id": current["id"],
        "sender_name": current["name"],
        "type": payload.type,
        "text": payload.text,
        "media": payload.media,
        "file_name": payload.file_name,
        "file_size": payload.file_size,
        "duration_ms": payload.duration_ms,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(msg)
    await db.chats.update_one({"id": chat_id}, {"$set": {"updated_at": msg["created_at"]}})
    msg.pop("_id", None)
    return msg


# ---------- Files Hub ----------
@api.get("/files")
async def list_files(current=Depends(get_current_user)):
    """Aggregate all non-text messages from chats current user belongs to."""
    user_chats = await db.chats.find({"members": current["id"]}, {"_id": 0, "id": 1}).to_list(500)
    chat_ids = [c["id"] for c in user_chats]
    msgs = await db.messages.find(
        {"chat_id": {"$in": chat_ids}, "type": {"$in": ["image", "file", "voice"]}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(1000)
    # attach sender info briefly
    sender_ids = list({m["sender_id"] for m in msgs})
    senders = {
        u["id"]: u
        for u in await db.users.find({"id": {"$in": sender_ids}}, {"_id": 0, "password_hash": 0}).to_list(500)
    }
    out = []
    for m in msgs:
        s = senders.get(m["sender_id"])
        out.append({**m, "sender": serialize_user(s) if s else None})
    return out


# ---------- Calls (mocked) ----------
@api.get("/calls")
async def list_calls(current=Depends(get_current_user)):
    calls = await db.calls.find({"members": current["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    out = []
    for c in calls:
        other_id = next((m for m in c["members"] if m != current["id"]), None)
        other = await db.users.find_one({"id": other_id}, {"_id": 0, "password_hash": 0}) if other_id else None
        out.append({**c, "other": serialize_user(other) if other else None})
    return out


@api.post("/calls")
async def create_call(payload: CallCreateIn, current=Depends(get_current_user)):
    other = await db.users.find_one({"id": payload.other_user_id}, {"_id": 0})
    if not other:
        raise HTTPException(status_code=404, detail="User not found")
    call = {
        "id": str(uuid.uuid4()),
        "members": [current["id"], payload.other_user_id],
        "initiator_id": current["id"],
        "duration_sec": payload.duration_sec,
        "status": payload.status,
        "created_at": now_iso(),
    }
    await db.calls.insert_one(call)
    call.pop("_id", None)
    return call


# ---------- Health ----------
@api.get("/")
async def root():
    return {"ok": True, "name": "Connect API"}


# ---------- Seed ----------
DEMO_USERS = [
    {"email": "ava@connect.app", "name": "Ava Fields", "password": "connect123",
     "bio": "Designer · loves slow mornings."},
    {"email": "leo@connect.app", "name": "Leo Marsh", "password": "connect123",
     "bio": "Writes letters · drinks tea."},
    {"email": "noor@connect.app", "name": "Noor Patel", "password": "connect123",
     "bio": "Architect · plant collector."},
    {"email": "sage@connect.app", "name": "Sage Okafor", "password": "connect123",
     "bio": "Runs on jazz and rain."},
]


async def seed():
    await db.users.create_index("email", unique=True)
    await db.chats.create_index("members")
    await db.messages.create_index([("chat_id", 1), ("created_at", 1)])
    await db.calls.create_index("members")

    # ensure all demo users
    user_ids = {}
    for u in DEMO_USERS:
        existing = await db.users.find_one({"email": u["email"]}, {"_id": 0})
        if existing:
            user_ids[u["email"]] = existing["id"]
            # refresh password to keep in sync
            await db.users.update_one(
                {"email": u["email"]},
                {"$set": {"password_hash": hash_password(u["password"]), "name": u["name"], "bio": u["bio"]}},
            )
        else:
            doc = {
                "id": str(uuid.uuid4()),
                "email": u["email"],
                "name": u["name"],
                "password_hash": hash_password(u["password"]),
                "avatar": None,
                "bio": u["bio"],
                "created_at": now_iso(),
            }
            await db.users.insert_one(doc)
            user_ids[u["email"]] = doc["id"]

    ava = user_ids["ava@connect.app"]
    leo = user_ids["leo@connect.app"]
    noor = user_ids["noor@connect.app"]
    sage = user_ids["sage@connect.app"]

    # only seed chats once
    if await db.chats.count_documents({}) > 0:
        return

    async def make_chat(a: str, b: str, msgs: list):
        chat = {
            "id": str(uuid.uuid4()),
            "key": chat_key(a, b),
            "type": "dm",
            "members": [a, b],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.chats.insert_one(chat)
        base_time = datetime.now(timezone.utc) - timedelta(hours=2)
        for i, m in enumerate(msgs):
            t = (base_time + timedelta(minutes=i * 3)).isoformat()
            doc = {
                "id": str(uuid.uuid4()),
                "chat_id": chat["id"],
                "sender_id": m["sender"],
                "sender_name": next(u["name"] for u in DEMO_USERS if user_ids[u["email"]] == m["sender"]),
                "type": m.get("type", "text"),
                "text": m.get("text"),
                "media": m.get("media"),
                "file_name": m.get("file_name"),
                "file_size": m.get("file_size"),
                "duration_ms": m.get("duration_ms"),
                "created_at": t,
            }
            await db.messages.insert_one(doc)
        await db.chats.update_one({"id": chat["id"]}, {"$set": {"updated_at": t}})

    await make_chat(ava, leo, [
        {"sender": leo, "text": "morning ☀️ how did the sketches go?"},
        {"sender": ava, "text": "slow but good. trying to keep things quiet."},
        {"sender": leo, "text": "sending you something I wrote last night"},
        {"sender": leo, "type": "file", "file_name": "letter-march.txt", "file_size": 1240},
        {"sender": ava, "text": "this is beautiful. thank you."},
        {"sender": ava, "type": "voice", "duration_ms": 7400},
    ])
    await make_chat(ava, noor, [
        {"sender": noor, "text": "the new place finally has light in the kitchen"},
        {"sender": noor, "type": "image", "file_name": "kitchen.jpg", "file_size": 88200},
        {"sender": ava, "text": "oh wow. plants will be so happy."},
        {"sender": noor, "text": "come over saturday?"},
    ])
    await make_chat(ava, sage, [
        {"sender": sage, "text": "playlist incoming"},
        {"sender": sage, "type": "file", "file_name": "rainy-jazz.m3u", "file_size": 540},
        {"sender": ava, "text": "perfect for tonight"},
    ])

    # seed a call
    await db.calls.insert_one({
        "id": str(uuid.uuid4()),
        "members": [ava, leo],
        "initiator_id": leo,
        "duration_sec": 184,
        "status": "completed",
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=4)).isoformat(),
    })


@app.on_event("startup")
async def on_startup():
    try:
        await seed()
        logger.info("Seed complete")
    except Exception as e:
        logger.exception(f"Seed failed: {e}")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# Mount router & CORS
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

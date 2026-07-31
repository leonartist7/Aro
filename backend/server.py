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

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------- Config ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("connect")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017")
DB_NAME = os.environ.get("DB_NAME", "connect")
JWT_SECRET = os.environ.get("JWT_SECRET", "supersecret-dev-token")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_MIN = 60 * 24 * 7  # 7 days for mobile convenience

if not os.environ.get("MONGO_URL") or not os.environ.get("DB_NAME") or not os.environ.get("JWT_SECRET"):
    logger.warning(
        "Missing backend env vars. Using local development defaults from backend/.env.example. "
        "Create backend/.env and set MONGO_URL, DB_NAME, and JWT_SECRET for a stable local backend."
    )

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Connect API")
api = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer(auto_error=False)


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
    type: Literal["text", "voice", "image", "file", "space_invite"]
    text: Optional[str] = None
    media: Optional[str] = None  # base64 data URL
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    duration_ms: Optional[int] = None  # for voice
    space_id: Optional[str] = None  # for space_invite
    space_name: Optional[str] = None


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
        "space_id": payload.space_id,
        "space_name": payload.space_name,
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


# ---------- Spaces (Phase 2) ----------
import asyncio
import re
import json as _json

# Curated audio library (royalty-free). Streamed direct from public CDN.
AUDIO_LIBRARY = [
    {
        "id": "rain-jazz",
        "title": "Rain & Jazz",
        "artist": "Ambient Loops",
        "duration_sec": 188,
        "cover_emoji": "🌧",
        "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    },
    {
        "id": "long-walk",
        "title": "Long Walk",
        "artist": "Ambient Loops",
        "duration_sec": 245,
        "cover_emoji": "🌿",
        "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    },
    {
        "id": "warm-light",
        "title": "Warm Light",
        "artist": "Ambient Loops",
        "duration_sec": 213,
        "cover_emoji": "🕯",
        "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    },
    {
        "id": "old-letters",
        "title": "Old Letters",
        "artist": "Ambient Loops",
        "duration_sec": 198,
        "cover_emoji": "✉️",
        "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    },
]


def _yt_id(url: str) -> Optional[str]:
    if not url:
        return None
    m = re.search(r"(?:youtu\.be/|youtube\.com/(?:watch\?v=|embed/|v/|shorts/))([\w-]{11})", url)
    if m:
        return m.group(1)
    # Accept bare 11-char id
    m2 = re.fullmatch(r"[\w-]{11}", url.strip())
    return m2.group(0) if m2 else None


# WebSocket connection pool, keyed by space id
class SpaceHub:
    def __init__(self):
        self.rooms: dict[str, set[WebSocket]] = {}
        self.lock = asyncio.Lock()

    async def join(self, space_id: str, ws: WebSocket):
        async with self.lock:
            self.rooms.setdefault(space_id, set()).add(ws)

    async def leave(self, space_id: str, ws: WebSocket):
        async with self.lock:
            if space_id in self.rooms:
                self.rooms[space_id].discard(ws)
                if not self.rooms[space_id]:
                    del self.rooms[space_id]

    async def broadcast(self, space_id: str, message: dict):
        sockets = list(self.rooms.get(space_id, []))
        dead = []
        for ws in sockets:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        if dead:
            async with self.lock:
                for ws in dead:
                    self.rooms.get(space_id, set()).discard(ws)


hub = SpaceHub()


def _serialize_space(s: dict, users_by_id: dict | None = None) -> dict:
    members = [users_by_id.get(m) if users_by_id else None for m in s.get("members", [])] if users_by_id else None
    return {
        "id": s["id"],
        "name": s.get("name") or "Untitled space",
        "creator_id": s.get("creator_id"),
        "members": s.get("members", []),
        "member_users": [serialize_user(u) for u in members if u] if members else [],
        "presence": s.get("presence", {}),
        "active_members": list(s.get("presence", {}).keys()),
        "mode": s.get("mode", "idle"),
        "content": s.get("content"),
        "state": s.get("state") or {
            "is_playing": False,
            "position_sec": 0.0,
            "host_id": s.get("creator_id"),
            "updated_at": s.get("created_at"),
        },
        "created_at": s.get("created_at"),
        "updated_at": s.get("updated_at"),
    }


async def _enrich_users(ids: list[str]) -> dict:
    users = await db.users.find({"id": {"$in": list(set(ids))}}, {"_id": 0, "password_hash": 0}).to_list(500)
    return {u["id"]: u for u in users}


# ---------- Models ----------
class SpaceCreateIn(BaseModel):
    name: Optional[str] = None
    member_ids: List[str] = []


class SpaceContentIn(BaseModel):
    type: Literal["youtube", "audio"]
    url: Optional[str] = None
    audio_id: Optional[str] = None
    upload_id: Optional[str] = None  # user-uploaded audio
    title: Optional[str] = None


class AudioUploadIn(BaseModel):
    title: str
    data_url: str  # base64 data URL
    duration_sec: Optional[float] = None


class SpaceStateIn(BaseModel):
    is_playing: bool
    position_sec: float


class SpaceMessageIn(BaseModel):
    text: str


class SpaceReactionIn(BaseModel):
    emoji: str


# ---------- Routes ----------
@api.get("/audio/library")
async def audio_library(current=Depends(get_current_user)):
    return AUDIO_LIBRARY


@api.get("/audio/uploads")
async def list_audio_uploads(current=Depends(get_current_user)):
    """User's uploaded audio files (metadata only, no base64 payload)."""
    uploads = await db.audio_uploads.find(
        {"uploader_id": current["id"]},
        {"_id": 0, "data_url": 0},
    ).sort("created_at", -1).to_list(200)
    return uploads


@api.get("/audio/uploads/{upload_id}")
async def get_audio_upload(upload_id: str, current=Depends(get_current_user)):
    """Fetch full audio upload (with base64) — used for playback."""
    u = await db.audio_uploads.find_one({"id": upload_id}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Upload not found")
    return u


@api.post("/audio/uploads")
async def upload_audio(payload: AudioUploadIn, current=Depends(get_current_user)):
    if not payload.data_url.startswith("data:"):
        raise HTTPException(status_code=400, detail="Must be a data URL")
    # rough size guard: reject > 14MB base64 (~10MB binary) to stay under Mongo doc limit
    if len(payload.data_url) > 14 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio is too large (max ~10MB)")
    doc = {
        "id": str(uuid.uuid4()),
        "uploader_id": current["id"],
        "uploader_name": current["name"],
        "title": payload.title.strip() or "Untitled audio",
        "data_url": payload.data_url,
        "duration_sec": payload.duration_sec,
        "cover_emoji": "🎙",
        "created_at": now_iso(),
    }
    await db.audio_uploads.insert_one(doc)
    return {"id": doc["id"], "title": doc["title"], "duration_sec": doc["duration_sec"]}


@api.post("/spaces")
async def create_space(payload: SpaceCreateIn, current=Depends(get_current_user)):
    members = list({current["id"], *payload.member_ids})
    space = {
        "id": str(uuid.uuid4()),
        "name": (payload.name or "").strip() or None,
        "creator_id": current["id"],
        "members": members,
        "presence": {},
        "mode": "idle",
        "content": None,
        "state": {
            "is_playing": False,
            "position_sec": 0.0,
            "host_id": current["id"],
            "updated_at": now_iso(),
        },
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.spaces.insert_one(space)
    return _serialize_space(space)


@api.get("/spaces")
async def list_spaces(current=Depends(get_current_user)):
    spaces = await db.spaces.find({"members": current["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    all_user_ids = {uid for s in spaces for uid in s.get("members", [])}
    users_by_id = await _enrich_users(list(all_user_ids))
    out = [_serialize_space(s, users_by_id) for s in spaces]
    active = [s for s in out if s["active_members"]]
    saved = [s for s in out if not s["active_members"]]
    return {"active": active, "saved": saved}


@api.get("/spaces/{space_id}")
async def get_space(space_id: str, current=Depends(get_current_user)):
    s = await db.spaces.find_one({"id": space_id, "members": current["id"]}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Space not found")
    users_by_id = await _enrich_users(s.get("members", []))
    return _serialize_space(s, users_by_id)


async def _ensure_member(space_id: str, user_id: str) -> dict:
    s = await db.spaces.find_one({"id": space_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Space not found")
    if user_id not in s.get("members", []):
        # auto-add (open join model for invited demo)
        await db.spaces.update_one({"id": space_id}, {"$addToSet": {"members": user_id}})
        s = await db.spaces.find_one({"id": space_id}, {"_id": 0})
    return s


@api.post("/spaces/{space_id}/join")
async def join_space(space_id: str, current=Depends(get_current_user)):
    await _ensure_member(space_id, current["id"])
    await db.spaces.update_one(
        {"id": space_id}, {"$set": {f"presence.{current['id']}": now_iso(), "updated_at": now_iso()}}
    )
    await hub.broadcast(space_id, {
        "type": "presence",
        "event": "join",
        "user_id": current["id"],
        "user_name": current["name"],
        "at": now_iso(),
    })
    s = await db.spaces.find_one({"id": space_id}, {"_id": 0})
    users_by_id = await _enrich_users(s.get("members", []))
    return _serialize_space(s, users_by_id)


@api.post("/spaces/{space_id}/leave")
async def leave_space(space_id: str, current=Depends(get_current_user)):
    s = await db.spaces.find_one({"id": space_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Space not found")
    await db.spaces.update_one(
        {"id": space_id},
        {"$unset": {f"presence.{current['id']}": ""}, "$set": {"updated_at": now_iso()}},
    )
    await hub.broadcast(space_id, {
        "type": "presence",
        "event": "leave",
        "user_id": current["id"],
        "user_name": current["name"],
        "at": now_iso(),
    })
    # Save a session memory entry once everyone leaves
    s = await db.spaces.find_one({"id": space_id}, {"_id": 0})
    presence = s.get("presence", {})
    if not presence:
        # Generate session summary if there was content
        content = s.get("content")
        if content:
            session = {
                "id": str(uuid.uuid4()),
                "type": "session",
                "space_id": space_id,
                "space_name": s.get("name") or "Untitled space",
                "summary": _build_session_summary(s),
                "content": content,
                "members": s.get("members", []),
                "created_at": now_iso(),
            }
            await db.space_sessions.insert_one(session)
    return {"ok": True}


def _build_session_summary(s: dict) -> dict:
    content = s.get("content") or {}
    title = content.get("title") or content.get("video_id") or "Shared moment"
    return {
        "title": title,
        "mode": s.get("mode", "idle"),
        "ended_at": now_iso(),
    }


@api.post("/spaces/{space_id}/content")
async def set_space_content(space_id: str, payload: SpaceContentIn, current=Depends(get_current_user)):
    await _ensure_member(space_id, current["id"])
    if payload.type == "youtube":
        vid = _yt_id(payload.url or "")
        if not vid:
            raise HTTPException(status_code=400, detail="Could not parse YouTube URL")
        content = {
            "type": "youtube",
            "url": payload.url,
            "video_id": vid,
            "title": payload.title or f"YouTube · {vid}",
        }
        mode = "video"
    else:  # audio
        # Uploaded audio takes precedence if provided
        if payload.upload_id:
            up = await db.audio_uploads.find_one({"id": payload.upload_id}, {"_id": 0})
            if not up:
                raise HTTPException(status_code=400, detail="Audio upload not found")
            content = {
                "type": "audio",
                "source": "upload",
                "upload_id": up["id"],
                "url": up["data_url"],
                "title": up["title"],
                "artist": up.get("uploader_name") or "You",
                "cover_emoji": up.get("cover_emoji", "🎙"),
                "duration_sec": up.get("duration_sec"),
            }
        else:
            track = next((a for a in AUDIO_LIBRARY if a["id"] == payload.audio_id), None)
            if not track:
                raise HTTPException(status_code=400, detail="Audio track not found")
            content = {
                "type": "audio",
                "source": "library",
                "audio_id": track["id"],
                "url": track["url"],
                "title": track["title"],
                "artist": track["artist"],
                "cover_emoji": track["cover_emoji"],
                "duration_sec": track["duration_sec"],
            }
        mode = "audio"
    state = {
        "is_playing": True,
        "position_sec": 0.0,
        "host_id": current["id"],
        "updated_at": now_iso(),
    }
    await db.spaces.update_one(
        {"id": space_id},
        {"$set": {"content": content, "mode": mode, "state": state, "updated_at": now_iso()}},
    )
    await hub.broadcast(space_id, {
        "type": "content",
        "content": content,
        "mode": mode,
        "state": state,
        "by": current["id"],
        "by_name": current["name"],
    })
    return {"ok": True, "content": content, "state": state}


@api.post("/spaces/{space_id}/state")
async def set_space_state(space_id: str, payload: SpaceStateIn, current=Depends(get_current_user)):
    await _ensure_member(space_id, current["id"])
    state = {
        "is_playing": payload.is_playing,
        "position_sec": max(0.0, float(payload.position_sec)),
        "host_id": current["id"],
        "updated_at": now_iso(),
    }
    await db.spaces.update_one(
        {"id": space_id}, {"$set": {"state": state, "updated_at": now_iso()}}
    )
    await hub.broadcast(space_id, {
        "type": "state",
        "state": state,
        "by": current["id"],
        "by_name": current["name"],
    })
    return state


@api.get("/spaces/{space_id}/messages")
async def list_space_messages(space_id: str, current=Depends(get_current_user)):
    await _ensure_member(space_id, current["id"])
    msgs = await db.space_messages.find({"space_id": space_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return msgs


@api.post("/spaces/{space_id}/messages")
async def send_space_message(space_id: str, payload: SpaceMessageIn, current=Depends(get_current_user)):
    await _ensure_member(space_id, current["id"])
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty message")
    msg = {
        "id": str(uuid.uuid4()),
        "space_id": space_id,
        "sender_id": current["id"],
        "sender_name": current["name"],
        "text": text,
        "created_at": now_iso(),
    }
    await db.space_messages.insert_one(msg)
    msg.pop("_id", None)
    await hub.broadcast(space_id, {"type": "message", "message": msg})
    return msg


@api.post("/spaces/{space_id}/reactions")
async def send_reaction(space_id: str, payload: SpaceReactionIn, current=Depends(get_current_user)):
    await _ensure_member(space_id, current["id"])
    emoji = payload.emoji[:8]
    await hub.broadcast(space_id, {
        "type": "reaction",
        "emoji": emoji,
        "by": current["id"],
        "by_name": current["name"],
        "at": now_iso(),
    })
    return {"ok": True}


@api.get("/space-sessions")
async def list_sessions(current=Depends(get_current_user)):
    sessions = await db.space_sessions.find({"members": current["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return sessions


# ---------- WebSocket ----------
def _verify_ws_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None


@app.websocket("/api/ws/spaces/{space_id}")
async def space_ws(websocket: WebSocket, space_id: str, token: str = Query(...)):
    payload = _verify_ws_token(token)
    if not payload:
        await websocket.close(code=4401)
        return
    user_id = payload["sub"]
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        await websocket.close(code=4401)
        return
    space = await db.spaces.find_one({"id": space_id}, {"_id": 0})
    if not space:
        await websocket.close(code=4404)
        return

    await websocket.accept()
    await hub.join(space_id, websocket)

    # mark presence
    await db.spaces.update_one(
        {"id": space_id},
        {"$addToSet": {"members": user_id}, "$set": {f"presence.{user_id}": now_iso(), "updated_at": now_iso()}},
    )
    await hub.broadcast(space_id, {
        "type": "presence",
        "event": "join",
        "user_id": user_id,
        "user_name": user["name"],
        "at": now_iso(),
    })

    # send current state snapshot
    refreshed = await db.spaces.find_one({"id": space_id}, {"_id": 0})
    users_by_id = await _enrich_users(refreshed.get("members", []))
    await websocket.send_json({"type": "snapshot", "space": _serialize_space(refreshed, users_by_id)})

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = _json.loads(data)
            except Exception:
                continue
            t = msg.get("type")
            if t == "ping":
                await websocket.send_json({"type": "pong"})
            # All other state changes go through HTTP POST endpoints which
            # then broadcast via hub. Keep WS read loop alive only.
    except WebSocketDisconnect:
        pass
    finally:
        await hub.leave(space_id, websocket)
        await db.spaces.update_one(
            {"id": space_id},
            {"$unset": {f"presence.{user_id}": ""}, "$set": {"updated_at": now_iso()}},
        )
        await hub.broadcast(space_id, {
            "type": "presence",
            "event": "leave",
            "user_id": user_id,
            "user_name": user["name"],
            "at": now_iso(),
        })


# Mount router & CORS
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

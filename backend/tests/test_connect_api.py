"""Connect API regression tests covering auth, users, chats, messages, files, calls."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
API = f"{BASE_URL}/api"

PRIMARY_EMAIL = "ava@connect.app"
PRIMARY_PASSWORD = "connect123"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth(session):
    r = session.post(f"{API}/auth/login", json={"email": PRIMARY_EMAIL, "password": PRIMARY_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return {"token": data["token"], "user": data["user"], "headers": {"Authorization": f"Bearer {data['token']}", "Content-Type": "application/json"}}


# ---------- Health ----------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- Auth ----------
class TestAuth:
    def test_login_success(self, auth):
        assert auth["user"]["email"] == PRIMARY_EMAIL
        assert auth["user"]["name"] == "Ava Fields"
        assert "id" in auth["user"]

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": PRIMARY_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, session, auth):
        r = session.get(f"{API}/auth/me", headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == PRIMARY_EMAIL

    def test_me_without_token_rejects(self, session):
        r = session.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_register_new_user(self, session):
        email = f"test_{uuid.uuid4().hex[:8]}@connect.app"
        r = session.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "TEST User"}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body and body["user"]["email"] == email
        # confirm /me works with new token
        me = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {body['token']}"}, timeout=15)
        assert me.status_code == 200
        assert me.json()["email"] == email

    def test_register_duplicate_rejected(self, session):
        r = session.post(f"{API}/auth/register", json={"email": PRIMARY_EMAIL, "password": "secret123", "name": "Dup"}, timeout=15)
        assert r.status_code == 400


# ---------- Users ----------
class TestUsers:
    def test_list_users_authed(self, session, auth):
        r = session.get(f"{API}/users", headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        users = r.json()
        emails = {u["email"] for u in users}
        # should include other 3 demo users but not self
        assert PRIMARY_EMAIL not in emails
        assert "leo@connect.app" in emails
        assert "noor@connect.app" in emails
        assert "sage@connect.app" in emails
        # No password_hash leaked
        for u in users:
            assert "password_hash" not in u
            assert "_id" not in u

    def test_list_users_unauthed(self, session):
        r = session.get(f"{API}/users", timeout=15)
        assert r.status_code == 401


# ---------- Chats ----------
class TestChats:
    def test_list_chats_seeded(self, session, auth):
        r = session.get(f"{API}/chats", headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        chats = r.json()
        assert len(chats) >= 3, f"expected ≥3 seeded chats, got {len(chats)}"
        for c in chats:
            assert "id" in c
            assert "other" in c and c["other"] is not None
            assert "name" in c["other"]
            assert "last_message" in c
            assert "_id" not in c

    def test_chats_unauthed(self, session):
        r = session.get(f"{API}/chats", timeout=15)
        assert r.status_code == 401

    def test_create_chat_idempotent(self, session, auth):
        users = session.get(f"{API}/users", headers=auth["headers"]).json()
        leo = next(u for u in users if u["email"] == "leo@connect.app")
        r1 = session.post(f"{API}/chats", json={"other_user_id": leo["id"]}, headers=auth["headers"], timeout=15)
        assert r1.status_code == 200
        id1 = r1.json()["id"]
        r2 = session.post(f"{API}/chats", json={"other_user_id": leo["id"]}, headers=auth["headers"], timeout=15)
        assert r2.status_code == 200
        assert r2.json()["id"] == id1, "chat creation must be idempotent for existing pair"

    def test_create_chat_self_rejected(self, session, auth):
        r = session.post(f"{API}/chats", json={"other_user_id": auth["user"]["id"]}, headers=auth["headers"], timeout=15)
        assert r.status_code == 400


# ---------- Messages ----------
class TestMessages:
    def _first_chat_id(self, session, auth):
        chats = session.get(f"{API}/chats", headers=auth["headers"]).json()
        return chats[0]["id"]

    def test_list_messages(self, session, auth):
        cid = self._first_chat_id(session, auth)
        r = session.get(f"{API}/chats/{cid}/messages", headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        msgs = r.json()
        assert isinstance(msgs, list) and len(msgs) > 0

    def test_send_text_message(self, session, auth):
        cid = self._first_chat_id(session, auth)
        body = {"chat_id": cid, "type": "text", "text": "TEST hello from pytest"}
        r = session.post(f"{API}/chats/{cid}/messages", json=body, headers=auth["headers"], timeout=15)
        assert r.status_code == 200, r.text
        msg = r.json()
        assert msg["type"] == "text"
        assert msg["text"] == "TEST hello from pytest"
        assert msg["sender_id"] == auth["user"]["id"]
        # verify persisted
        msgs = session.get(f"{API}/chats/{cid}/messages", headers=auth["headers"]).json()
        assert any(m["id"] == msg["id"] for m in msgs)

    def test_send_voice_message(self, session, auth):
        cid = self._first_chat_id(session, auth)
        body = {"chat_id": cid, "type": "voice", "duration_ms": 4200}
        r = session.post(f"{API}/chats/{cid}/messages", json=body, headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        msg = r.json()
        assert msg["type"] == "voice"
        assert msg["duration_ms"] == 4200

    def test_messages_unauthed(self, session, auth):
        cid = self._first_chat_id(session, auth)
        r = session.get(f"{API}/chats/{cid}/messages", timeout=15)
        assert r.status_code == 401


# ---------- Files ----------
class TestFiles:
    def test_list_files_returns_seeded(self, session, auth):
        r = session.get(f"{API}/files", headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        files = r.json()
        # Seed has 1 voice, 1 image, 2 files = 4 non-text messages
        non_text_types = {"voice", "image", "file"}
        assert len(files) >= 4, f"expected ≥4 seeded non-text msgs, got {len(files)}"
        for f in files:
            assert f["type"] in non_text_types
            assert "sender" in f and f["sender"] is not None
            assert "name" in f["sender"]

    def test_files_unauthed(self, session):
        r = session.get(f"{API}/files", timeout=15)
        assert r.status_code == 401


# ---------- Calls ----------
class TestCalls:
    def test_list_calls_seeded(self, session, auth):
        r = session.get(f"{API}/calls", headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        calls = r.json()
        assert len(calls) >= 1
        c = calls[0]
        assert c["status"] in {"completed", "missed", "outgoing", "incoming"}
        assert "other" in c and c["other"] is not None

    def test_create_call(self, session, auth):
        users = session.get(f"{API}/users", headers=auth["headers"]).json()
        sage = next(u for u in users if u["email"] == "sage@connect.app")
        r = session.post(f"{API}/calls", json={"other_user_id": sage["id"], "duration_sec": 42, "status": "outgoing"}, headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        call = r.json()
        assert call["duration_sec"] == 42
        assert call["status"] == "outgoing"

    def test_calls_unauthed(self, session):
        r = session.get(f"{API}/calls", timeout=15)
        assert r.status_code == 401

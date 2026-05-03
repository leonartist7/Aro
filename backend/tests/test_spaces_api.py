"""Phase-2 Spaces API tests: REST endpoints, audio library, chat-invite bridge, and WebSocket."""
import asyncio
import json
import os
import uuid

import pytest
import requests
import websockets

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://connect-mvp.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws/spaces"

PRIMARY_EMAIL = "ava@connect.app"
PRIMARY_PASSWORD = "connect123"
SECOND_EMAIL = "leo@connect.app"


def _login(session, email, password):
    r = session.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed ({email}): {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def ava(session):
    d = _login(session, PRIMARY_EMAIL, PRIMARY_PASSWORD)
    return {"token": d["token"], "user": d["user"],
            "headers": {"Authorization": f"Bearer {d['token']}", "Content-Type": "application/json"}}


@pytest.fixture(scope="module")
def leo(session):
    d = _login(session, SECOND_EMAIL, PRIMARY_PASSWORD)
    return {"token": d["token"], "user": d["user"],
            "headers": {"Authorization": f"Bearer {d['token']}", "Content-Type": "application/json"}}


# ---------- Audio Library ----------
class TestAudioLibrary:
    def test_library_has_4_curated_tracks(self, session, ava):
        r = session.get(f"{API}/audio/library", headers=ava["headers"], timeout=15)
        assert r.status_code == 200, r.text
        tracks = r.json()
        assert isinstance(tracks, list) and len(tracks) == 4
        ids = {t["id"] for t in tracks}
        titles = {t["title"] for t in tracks}
        assert ids == {"rain-jazz", "long-walk", "warm-light", "old-letters"}
        assert titles == {"Rain & Jazz", "Long Walk", "Warm Light", "Old Letters"}
        for t in tracks:
            for k in ("id", "title", "artist", "duration_sec", "cover_emoji", "url"):
                assert k in t, f"missing key {k}"
            assert t["url"].startswith("http")

    def test_library_requires_auth(self, session):
        r = session.get(f"{API}/audio/library", timeout=10)
        assert r.status_code == 401


# ---------- Space CRUD ----------
class TestSpaceCRUD:
    def test_create_space(self, session, ava, leo):
        payload = {"name": "TEST Ava+Leo", "member_ids": [leo["user"]["id"]]}
        r = session.post(f"{API}/spaces", json=payload, headers=ava["headers"], timeout=15)
        assert r.status_code == 200, r.text
        s = r.json()
        assert s["name"] == "TEST Ava+Leo"
        assert s["creator_id"] == ava["user"]["id"]
        assert ava["user"]["id"] in s["members"]
        assert leo["user"]["id"] in s["members"]
        assert s["mode"] == "idle"
        assert s["state"]["is_playing"] is False
        pytest.space_id = s["id"]

    def test_list_spaces(self, session, ava):
        r = session.get(f"{API}/spaces", headers=ava["headers"], timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "active" in body and "saved" in body
        all_ids = {s["id"] for s in body["active"] + body["saved"]}
        assert pytest.space_id in all_ids

    def test_get_space_with_member_users(self, session, ava):
        r = session.get(f"{API}/spaces/{pytest.space_id}", headers=ava["headers"], timeout=15)
        assert r.status_code == 200
        s = r.json()
        assert s["id"] == pytest.space_id
        assert len(s["member_users"]) == 2
        emails = {u["email"] for u in s["member_users"]}
        assert emails == {PRIMARY_EMAIL, SECOND_EMAIL}

    def test_get_space_not_found(self, session, ava):
        r = session.get(f"{API}/spaces/{uuid.uuid4()}", headers=ava["headers"], timeout=15)
        assert r.status_code == 404


# ---------- Content (YouTube / Audio) ----------
class TestSpaceContent:
    def test_set_youtube_content(self, session, ava):
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        r = session.post(f"{API}/spaces/{pytest.space_id}/content",
                         json={"type": "youtube", "url": url},
                         headers=ava["headers"], timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["content"]["type"] == "youtube"
        assert body["content"]["video_id"] == "dQw4w9WgXcQ"
        assert body["state"]["is_playing"] is True
        # verify GET reflects mode change
        g = session.get(f"{API}/spaces/{pytest.space_id}", headers=ava["headers"]).json()
        assert g["mode"] == "video"
        assert g["content"]["video_id"] == "dQw4w9WgXcQ"

    def test_set_youtube_invalid_url(self, session, ava):
        r = session.post(f"{API}/spaces/{pytest.space_id}/content",
                         json={"type": "youtube", "url": "not-a-url"},
                         headers=ava["headers"], timeout=15)
        assert r.status_code == 400

    def test_set_audio_content(self, session, ava):
        r = session.post(f"{API}/spaces/{pytest.space_id}/content",
                         json={"type": "audio", "audio_id": "rain-jazz"},
                         headers=ava["headers"], timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["content"]["type"] == "audio"
        assert body["content"]["title"] == "Rain & Jazz"
        assert body["content"]["cover_emoji"] == "🌧"
        g = session.get(f"{API}/spaces/{pytest.space_id}", headers=ava["headers"]).json()
        assert g["mode"] == "audio"

    def test_set_audio_unknown_track(self, session, ava):
        r = session.post(f"{API}/spaces/{pytest.space_id}/content",
                         json={"type": "audio", "audio_id": "nope"},
                         headers=ava["headers"], timeout=15)
        assert r.status_code == 400


# ---------- State sync ----------
class TestSpaceState:
    def test_update_state_sets_host(self, session, leo):
        # leo updates state → should become host_id
        r = session.post(f"{API}/spaces/{pytest.space_id}/state",
                         json={"is_playing": True, "position_sec": 42.5},
                         headers=leo["headers"], timeout=15)
        assert r.status_code == 200
        st = r.json()
        assert st["is_playing"] is True
        assert st["position_sec"] == 42.5
        assert st["host_id"] == leo["user"]["id"]
        # verify persistence
        g = session.get(f"{API}/spaces/{pytest.space_id}", headers=leo["headers"]).json()
        assert g["state"]["host_id"] == leo["user"]["id"]
        assert g["state"]["position_sec"] == 42.5


# ---------- Messages ----------
class TestSpaceMessages:
    def test_send_and_list(self, session, ava):
        r = session.post(f"{API}/spaces/{pytest.space_id}/messages",
                         json={"text": "TEST hello space"}, headers=ava["headers"], timeout=15)
        assert r.status_code == 200
        msg = r.json()
        assert msg["text"] == "TEST hello space"
        assert msg["sender_id"] == ava["user"]["id"]

        lst = session.get(f"{API}/spaces/{pytest.space_id}/messages", headers=ava["headers"]).json()
        assert any(m["id"] == msg["id"] for m in lst)

    def test_empty_text_rejected(self, session, ava):
        r = session.post(f"{API}/spaces/{pytest.space_id}/messages",
                         json={"text": "   "}, headers=ava["headers"], timeout=15)
        assert r.status_code == 400


# ---------- Reactions ----------
class TestReactions:
    def test_send_reaction(self, session, ava):
        r = session.post(f"{API}/spaces/{pytest.space_id}/reactions",
                         json={"emoji": "❤️"}, headers=ava["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- Chat → Space invite bridge ----------
class TestSpaceInviteMessage:
    def test_space_invite_message(self, session, ava, leo):
        # Create / get a DM chat ava↔leo
        chat = session.post(f"{API}/chats",
                            json={"other_user_id": leo["user"]["id"]},
                            headers=ava["headers"], timeout=15).json()
        cid = chat["id"]
        body = {
            "chat_id": cid,
            "type": "space_invite",
            "space_id": pytest.space_id,
            "space_name": "TEST Ava+Leo",
        }
        r = session.post(f"{API}/chats/{cid}/messages", json=body, headers=ava["headers"], timeout=15)
        assert r.status_code == 200, r.text
        msg = r.json()
        assert msg["type"] == "space_invite"
        assert msg["space_id"] == pytest.space_id
        assert msg["space_name"] == "TEST Ava+Leo"


# ---------- Leave ----------
class TestSpaceLeave:
    def test_leave(self, session, ava):
        r = session.post(f"{API}/spaces/{pytest.space_id}/leave", headers=ava["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- WebSocket ----------
@pytest.mark.asyncio
async def test_ws_connect_snapshot_and_presence(ava, leo):
    """Ava connects → receives snapshot. Leo connects → both see presence/join broadcast."""
    space_id = pytest.space_id
    url_ava = f"{WS_URL}/{space_id}?token={ava['token']}"
    url_leo = f"{WS_URL}/{space_id}?token={leo['token']}"

    async with websockets.connect(url_ava) as ws_ava:
        # Drain initial messages: server broadcasts presence.join to Ava's own socket
        # first, then sends a snapshot. Both must appear.
        got_snapshot = False
        for _ in range(3):
            raw = await asyncio.wait_for(ws_ava.recv(), timeout=10)
            m = json.loads(raw)
            if m.get("type") == "snapshot":
                assert m["space"]["id"] == space_id
                got_snapshot = True
                break
        assert got_snapshot, "Ava never received snapshot"

        async with websockets.connect(url_leo) as ws_leo:
            # Drain Leo's messages looking for snapshot
            leo_got_snapshot = False
            for _ in range(3):
                leo_raw = await asyncio.wait_for(ws_leo.recv(), timeout=10)
                if json.loads(leo_raw).get("type") == "snapshot":
                    leo_got_snapshot = True
                    break
            assert leo_got_snapshot

            # Ava should receive a presence join for Leo within a few messages
            got_leo_join = False
            for _ in range(5):
                try:
                    r = await asyncio.wait_for(ws_ava.recv(), timeout=5)
                except asyncio.TimeoutError:
                    break
                m = json.loads(r)
                if m.get("type") == "presence" and m.get("event") == "join" and m.get("user_id") == leo["user"]["id"]:
                    got_leo_join = True
                    break
            assert got_leo_join, "Ava did not receive presence.join for Leo"


@pytest.mark.asyncio
async def test_ws_invalid_token_rejected():
    url = f"{WS_URL}/{pytest.space_id}?token=garbage"
    with pytest.raises(Exception):
        async with websockets.connect(url) as ws:
            await asyncio.wait_for(ws.recv(), timeout=5)

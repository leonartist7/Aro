"""Phase-2.1 tests: audio uploads (list/create/get), space content sourced from upload, space-sessions."""
import base64
import os

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://connect-mvp.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

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


# tiny synthetic base64 audio payload (bytes are meaningless, endpoint only validates prefix + size)
_TINY_DATA_URL = "data:audio/mpeg;base64," + base64.b64encode(b"TEST audio bytes phase21").decode()


class TestAudioUploadsCRUD:
    def test_upload_requires_auth(self, session):
        r = session.post(f"{API}/audio/uploads", json={"title": "TEST no-auth", "data_url": _TINY_DATA_URL}, timeout=15)
        assert r.status_code in (401, 403)

    def test_upload_rejects_non_data_url(self, session, ava):
        r = session.post(f"{API}/audio/uploads",
                         json={"title": "TEST bad", "data_url": "https://example.com/audio.mp3"},
                         headers=ava["headers"], timeout=15)
        assert r.status_code == 400
        assert "data URL" in r.text or "data" in r.text.lower()

    def test_upload_rejects_oversize(self, session, ava):
        # >14MB string
        big = "data:audio/mpeg;base64," + ("A" * (14 * 1024 * 1024 + 10))
        r = session.post(f"{API}/audio/uploads",
                         json={"title": "TEST big", "data_url": big},
                         headers=ava["headers"], timeout=60)
        assert r.status_code == 400
        assert "large" in r.text.lower()

    def test_upload_create_returns_metadata_only(self, session, ava):
        r = session.post(f"{API}/audio/uploads",
                         json={"title": "TEST phase21 clip", "data_url": _TINY_DATA_URL, "duration_sec": 12.5},
                         headers=ava["headers"], timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert set(body.keys()) == {"id", "title", "duration_sec"}
        assert body["title"] == "TEST phase21 clip"
        assert body["duration_sec"] == 12.5
        pytest.upload_id = body["id"]

    def test_list_uploads_excludes_data_url(self, session, ava):
        r = session.get(f"{API}/audio/uploads", headers=ava["headers"], timeout=15)
        assert r.status_code == 200, r.text
        uploads = r.json()
        assert isinstance(uploads, list)
        # our created upload must be in the list
        found = next((u for u in uploads if u["id"] == pytest.upload_id), None)
        assert found is not None, "created upload not present in list"
        # LIST endpoint must NOT include data_url
        for u in uploads:
            assert "data_url" not in u, f"list endpoint leaked data_url on upload {u.get('id')}"
        # required metadata fields
        for k in ("id", "title", "uploader_id", "uploader_name", "cover_emoji", "created_at"):
            assert k in found, f"missing key {k} in list item"

    def test_get_single_upload_returns_data_url(self, session, ava):
        r = session.get(f"{API}/audio/uploads/{pytest.upload_id}", headers=ava["headers"], timeout=15)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["id"] == pytest.upload_id
        assert u["title"] == "TEST phase21 clip"
        assert "data_url" in u and u["data_url"].startswith("data:")

    def test_get_single_upload_404(self, session, ava):
        r = session.get(f"{API}/audio/uploads/does-not-exist", headers=ava["headers"], timeout=15)
        assert r.status_code == 404


class TestSpaceContentFromUpload:
    def test_create_space_and_set_upload_content(self, session, ava, leo):
        # create a fresh space
        r = session.post(f"{API}/spaces",
                         json={"name": "TEST phase21 upload space", "member_ids": [leo["user"]["id"]]},
                         headers=ava["headers"], timeout=15)
        assert r.status_code == 200
        pytest.space_id_p21 = r.json()["id"]

        # set audio content sourced from upload
        r = session.post(f"{API}/spaces/{pytest.space_id_p21}/content",
                         json={"type": "audio", "upload_id": pytest.upload_id},
                         headers=ava["headers"], timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        c = body["content"]
        assert c["type"] == "audio"
        assert c["source"] == "upload"
        assert c["upload_id"] == pytest.upload_id
        assert c["title"] == "TEST phase21 clip"
        assert c["cover_emoji"] == "🎙"
        assert c["url"].startswith("data:")
        assert c.get("artist")  # populated from uploader_name

        # verify persistence
        g = session.get(f"{API}/spaces/{pytest.space_id_p21}", headers=ava["headers"]).json()
        assert g["mode"] == "audio"
        assert g["content"]["source"] == "upload"
        assert g["content"]["upload_id"] == pytest.upload_id

    def test_upload_id_wins_over_audio_id(self, session, ava):
        # send BOTH audio_id (curated) + upload_id — upload_id must win
        r = session.post(f"{API}/spaces/{pytest.space_id_p21}/content",
                         json={"type": "audio", "audio_id": "rain-jazz", "upload_id": pytest.upload_id},
                         headers=ava["headers"], timeout=15)
        assert r.status_code == 200
        c = r.json()["content"]
        assert c["source"] == "upload"
        assert c["upload_id"] == pytest.upload_id
        assert c["title"] == "TEST phase21 clip"

    def test_curated_audio_id_still_works(self, session, ava):
        r = session.post(f"{API}/spaces/{pytest.space_id_p21}/content",
                         json={"type": "audio", "audio_id": "long-walk"},
                         headers=ava["headers"], timeout=15)
        assert r.status_code == 200
        c = r.json()["content"]
        assert c["source"] == "library"
        assert c["audio_id"] == "long-walk"
        assert c["title"] == "Long Walk"

    def test_unknown_upload_id_400(self, session, ava):
        r = session.post(f"{API}/spaces/{pytest.space_id_p21}/content",
                         json={"type": "audio", "upload_id": "does-not-exist"},
                         headers=ava["headers"], timeout=15)
        assert r.status_code == 400


class TestSpaceSessionsRegression:
    def test_space_sessions_list(self, session, ava):
        r = session.get(f"{API}/space-sessions", headers=ava["headers"], timeout=15)
        assert r.status_code == 200, r.text
        sess = r.json()
        assert isinstance(sess, list)
        for s in sess:
            for k in ("id", "space_id", "created_at", "members"):
                assert k in s

    def test_space_sessions_requires_auth(self, session):
        r = session.get(f"{API}/space-sessions", timeout=10)
        assert r.status_code in (401, 403)

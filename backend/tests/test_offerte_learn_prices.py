"""
Backend tests for Fase 1C — 'Ontbrekende prijzen aanvullen' / zelflerende offertegenerator.

Covers:
- POST /api/werkposten/learn-price  (create + update + price_history)
- POST /api/projects/{id}/offerte-generator/create-quote with learn_prices=true:
  * line WITH price WITHOUT work_item_id  → new werkpost is auto-created in the library
  * line WITH price + existing work_item_id → werkpost price updated + history logged
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://material-flow-40.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "liam"
ADMIN_PASS = "Liammail123"
PROJECT_ID = "PROJ-60A4159C"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth2/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"Auth failed: {r.status_code} {r.text}")
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    if not tok:
        pytest.skip("No token in response")
    return tok


@pytest.fixture(scope="module")
def auth_session(token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def created_werkpost_ids():
    return []


def _cleanup(session, ids):
    for wp_id in ids:
        try:
            session.delete(f"{API}/werkposten/{wp_id}", params={"soft": "false"}, timeout=15)
        except Exception:
            pass


# ============= /werkposten/learn-price =============

class TestLearnPriceEndpoint:
    """POST /api/werkposten/learn-price"""

    def test_create_new_werkpost_via_learn_price(self, auth_session, created_werkpost_ids):
        # Unique name so we definitely create
        unique = f"TEST_LearnPrice_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": unique,
            "category": "Tegelwerken",
            "unit": "m²",
            "vat_rate": 6.0,
            "default_source": "floor_area",
            "price": 350.0,
            "note": "initial create",
        }
        r = auth_session.post(f"{API}/werkposten/learn-price", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("created") is True
        assert data.get("name") == unique
        assert data.get("standard_price") == 350.0
        assert data.get("default_source") == "floor_area"
        assert data.get("unit") == "m²"
        assert "id" in data and data["id"].startswith("WP-")
        created_werkpost_ids.append(data["id"])

        # GET verify persistence
        g = auth_session.get(f"{API}/werkposten/{data['id']}", timeout=15)
        assert g.status_code == 200
        gd = g.json()
        assert gd["standard_price"] == 350.0
        assert gd["default_source"] == "floor_area"

    def test_update_existing_logs_price_history(self, auth_session, created_werkpost_ids):
        # Use the same name to update via name-match
        if not created_werkpost_ids:
            pytest.skip("Previous create test did not run")
        wp_id = created_werkpost_ids[0]
        # Fetch current name
        cur = auth_session.get(f"{API}/werkposten/{wp_id}", timeout=15).json()
        name = cur["name"]

        payload = {
            "name": name,  # match by name
            "category": "Tegelwerken",
            "unit": "m²",
            "vat_rate": 6.0,
            "price": 400.0,
            "note": "price bump",
        }
        r = auth_session.post(f"{API}/werkposten/learn-price", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("created") is False
        assert data["id"] == wp_id  # same werkpost updated
        assert data["standard_price"] == 400.0

        # GET history to confirm 350 -> 400 entry exists
        h = auth_session.get(f"{API}/werkposten/{wp_id}/history", timeout=15)
        assert h.status_code == 200
        hist = h.json().get("history") or []
        assert any(
            entry.get("old_price") == 350.0 and entry.get("new_price") == 400.0
            for entry in hist
        ), f"Expected 350→400 history entry, got: {hist}"

    def test_update_via_work_item_id_takes_precedence(self, auth_session, created_werkpost_ids):
        if not created_werkpost_ids:
            pytest.skip("No werkpost created")
        wp_id = created_werkpost_ids[0]
        # Use random name but include work_item_id → should still update existing
        payload = {
            "work_item_id": wp_id,
            "name": "any_name_should_be_ignored",
            "price": 425.0,
        }
        r = auth_session.post(f"{API}/werkposten/learn-price", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("created") is False
        assert data["id"] == wp_id
        assert data["standard_price"] == 425.0


# ============= /create-quote auto-create =============

class TestCreateQuoteAutoLearn:
    """create-quote with learn_prices=true auto-creates werkposten for priced lines without work_item_id."""

    def test_priced_line_without_work_item_id_creates_werkpost(self, auth_session, created_werkpost_ids):
        unique_label = f"TEST_AutoLearn_{uuid.uuid4().hex[:8]}"
        unique_price = 137.42  # uncommon → easy to verify

        payload = {
            "lines": [
                {
                    "description": unique_label,
                    "quantity": 5,
                    "unit_price": unique_price,
                    "vat_rate": 6.0,
                    "unit": "m²",
                    "item_type": "arbeid",
                    "source": "floor_area",
                    "work_item_id": None,
                    "category": "Tegelwerken",
                    "room_name": "Badkamer",
                }
            ],
            "title": f"TEST quote {uuid.uuid4().hex[:6]}",
            "learn_prices": True,
        }
        r = auth_session.post(
            f"{API}/projects/{PROJECT_ID}/offerte-generator/create-quote",
            json=payload,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "quote_id" in data
        assert data.get("prices_learned", 0) >= 1, f"Expected at least 1 learned, got {data}"

        # Verify werkpost exists in library
        # NOTE: GET /werkposten?search=... currently 500s (see backend bug), so we list all and filter client-side
        s = auth_session.get(f"{API}/werkposten", params={"include_inactive": "true"}, timeout=20)
        assert s.status_code == 200
        matches = [w for w in s.json() if w.get("name") == unique_label]
        assert len(matches) == 1, f"Expected 1 werkpost matching {unique_label}, got {matches}"
        wp = matches[0]
        assert abs(float(wp["standard_price"]) - unique_price) < 0.01
        assert wp.get("default_source") == "floor_area"
        assert wp.get("category") == "Tegelwerken"
        created_werkpost_ids.append(wp["id"])

    def test_priced_line_with_work_item_id_updates_existing(self, auth_session, created_werkpost_ids):
        # Create a werkpost first (with a known starting price)
        unique = f"TEST_AutoLearnExisting_{uuid.uuid4().hex[:8]}"
        create_resp = auth_session.post(
            f"{API}/werkposten",
            json={
                "name": unique,
                "category": "Schilderwerken",
                "unit": "m²",
                "standard_price": 25.0,
                "vat_rate": 6.0,
            },
            timeout=15,
        )
        assert create_resp.status_code == 200, create_resp.text
        wp_id = create_resp.json()["id"]
        created_werkpost_ids.append(wp_id)

        # Now create a quote that references this werkpost with a NEW price
        new_price = 28.5
        payload = {
            "lines": [
                {
                    "description": unique,
                    "quantity": 10,
                    "unit_price": new_price,
                    "vat_rate": 6.0,
                    "unit": "m²",
                    "item_type": "arbeid",
                    "source": "wall_area",
                    "work_item_id": wp_id,
                    "category": "Schilderwerken",
                    "room_name": "Badkamer",
                }
            ],
            "title": f"TEST quote update {uuid.uuid4().hex[:6]}",
            "learn_prices": True,
        }
        r = auth_session.post(
            f"{API}/projects/{PROJECT_ID}/offerte-generator/create-quote",
            json=payload,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("prices_learned", 0) >= 1

        # Verify price + history
        g = auth_session.get(f"{API}/werkposten/{wp_id}", timeout=15)
        assert g.status_code == 200
        wp = g.json()
        assert abs(float(wp["standard_price"]) - new_price) < 0.01

        h = auth_session.get(f"{API}/werkposten/{wp_id}/history", timeout=15).json()
        hist = h.get("history") or []
        assert any(
            entry.get("old_price") == 25.0 and abs(entry.get("new_price") - new_price) < 0.01
            for entry in hist
        ), f"Expected 25.0→{new_price} history entry, got {hist}"


# ============= CLEANUP =============

@pytest.fixture(scope="module", autouse=True)
def cleanup_after_module(auth_session, created_werkpost_ids):
    yield
    _cleanup(auth_session, created_werkpost_ids)

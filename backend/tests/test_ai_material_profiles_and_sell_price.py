"""
Phase 2D tests:
- AI material profile generation (replace + fill-skip modes) on werkposten.
- Materiaal sell_price (POST/PUT/GET).

NOTE: Limits to a maximum of 1 real AI call to keep costs low.
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://material-flow-40.preview.emergentagent.com").rstrip("/")
LOGIN_URL = f"{BASE_URL}/api/auth2/login"
USER = {"username": "liam", "password": "Liammail123"}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(LOGIN_URL, json=USER, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json().get("token")
    assert token
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# ============= Werkpost helpers =============

@pytest.fixture(scope="module")
def temp_werkpost_no_profile(client):
    """Create a fresh werkpost with NO material_profile to be used for the AI replace test."""
    payload = {
        "name": "TEST_AI Vloertegels 60x60",
        "category": "Tegelwerken",
        "unit": "m²",
        "labor_minutes": 60,
        "material_profile": [],
    }
    r = client.post(f"{BASE_URL}/api/werkposten", json=payload, timeout=30)
    assert r.status_code in (200, 201), f"create werkpost failed: {r.status_code} {r.text}"
    wp = r.json()
    yield wp
    # cleanup
    try:
        client.delete(f"{BASE_URL}/api/werkposten/{wp['id']}?hard=true", timeout=20)
    except Exception:
        pass


@pytest.fixture(scope="module")
def temp_werkpost_with_profile(client):
    """Create a werkpost with an existing material_profile to test fill-mode skip (no AI call)."""
    payload = {
        "name": "TEST_AI Werkpost met profiel",
        "category": "Algemeen",
        "unit": "m²",
        "labor_minutes": 30,
        "material_profile": [
            {
                "material_id": None,
                "material_name": "Dummy Materiaal",
                "quantity_per_unit": 1.0,
                "unit": "stuk",
                "status": "verplicht",
                "role": "basis",
                "waste_percent": 0,
            }
        ],
    }
    r = client.post(f"{BASE_URL}/api/werkposten", json=payload, timeout=30)
    assert r.status_code in (200, 201), f"create wp+profile failed: {r.status_code} {r.text}"
    wp = r.json()
    yield wp
    try:
        client.delete(f"{BASE_URL}/api/werkposten/{wp['id']}?hard=true", timeout=20)
    except Exception:
        pass


# ============= AI material profile =============

class TestAIMaterialProfile:
    def test_fill_mode_skips_when_profile_exists(self, client, temp_werkpost_with_profile):
        """Fill-mode op werkpost mét profiel → skipped:true, geen AI-call."""
        wid = temp_werkpost_with_profile["id"]
        r = client.post(
            f"{BASE_URL}/api/werkposten/{wid}/ai-material-profile",
            json={"mode": "fill"},
            timeout=30,
        )
        assert r.status_code == 200, f"unexpected {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("skipped") is True
        assert data.get("material_count", 0) >= 1

    def test_replace_mode_generates_profile(self, client, temp_werkpost_no_profile):
        """Replace-mode → AI genereert realistisch materiaalprofiel. (1 echte AI-call)"""
        wid = temp_werkpost_no_profile["id"]
        r = client.post(
            f"{BASE_URL}/api/werkposten/{wid}/ai-material-profile",
            json={"mode": "replace"},
            timeout=120,
        )
        assert r.status_code == 200, f"AI gen failed {r.status_code}: {r.text[:400]}"
        data = r.json()
        assert data.get("skipped") is False
        assert data.get("ai_generated") is True
        mat_count = data.get("material_count", 0)
        assert mat_count > 0, f"expected materials, got {mat_count}"

        wp = data.get("werkpost")
        assert wp and wp.get("id") == wid
        profile = wp.get("material_profile") or []
        assert len(profile) == mat_count

        # Validate structure of profile items
        sample = profile[0]
        for key in ("material_name", "quantity_per_unit", "unit", "status", "role"):
            assert key in sample, f"missing key {key} in profile item"
        assert sample["status"] in ("verplicht", "aanbevolen", "optioneel")
        assert sample["role"] in ("basis", "hulp")
        # waste_percent present (might be 0)
        assert "waste_percent" in sample

        # Persistence check: GET werkpost
        time.sleep(0.5)
        g = client.get(f"{BASE_URL}/api/werkposten/{wid}", timeout=30)
        assert g.status_code == 200
        saved = g.json()
        assert len(saved.get("material_profile") or []) == mat_count

    def test_404_for_unknown_werkpost(self, client):
        r = client.post(
            f"{BASE_URL}/api/werkposten/NON_EXISTENT_ID/ai-material-profile",
            json={"mode": "fill"},
            timeout=20,
        )
        assert r.status_code == 404


# ============= Materiaal sell_price =============

class TestMateriaalSellPrice:
    @pytest.fixture
    def created_material(self, client):
        payload = {
            "name": "TEST_AI Sellprice Materiaal",
            "category": "Algemeen",
            "unit": "stuk",
            "purchase_price": 10.00,
            "sell_price": 15.00,
        }
        r = client.post(f"{BASE_URL}/api/materiaal", json=payload, timeout=20)
        assert r.status_code in (200, 201), r.text
        mat = r.json()
        yield mat
        try:
            client.delete(f"{BASE_URL}/api/materiaal/{mat['id']}?soft=false", timeout=15)
        except Exception:
            pass

    def test_create_with_sell_price(self, created_material):
        assert created_material["purchase_price"] == 10.0
        assert created_material["sell_price"] == 15.0

    def test_get_returns_sell_price(self, client, created_material):
        r = client.get(f"{BASE_URL}/api/materiaal/{created_material['id']}", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["purchase_price"] == 10.0
        assert d["sell_price"] == 15.0

    def test_update_sell_price(self, client, created_material):
        r = client.put(
            f"{BASE_URL}/api/materiaal/{created_material['id']}",
            json={"sell_price": 22.5},
            timeout=20,
        )
        assert r.status_code == 200
        upd = r.json()
        assert upd["sell_price"] == 22.5
        assert upd["purchase_price"] == 10.0  # unchanged
        # Persist via GET
        g = client.get(f"{BASE_URL}/api/materiaal/{created_material['id']}", timeout=20)
        assert g.status_code == 200
        assert g.json()["sell_price"] == 22.5

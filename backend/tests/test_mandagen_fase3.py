"""Backend regression tests for Mandagen-engine (Fase 3 + 3B).
Covers config endpoints, generate, get grouped, manual lines, overrides
and the AI productivity profile endpoint."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://material-flow-40.preview.emergentagent.com").rstrip("/")
PROJECT_ID = "PROJ-0D7C9AC0"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(client):
    for _ in range(3):
        r = client.post(f"{BASE_URL}/api/auth/admin/login",
                        json={"username": "liam", "password": "Liammail123"})
        if r.status_code == 200:
            return r.json().get("session_token") or r.json().get("token")
    pytest.skip("auth login failed (rate limited or unavailable)")


@pytest.fixture(scope="module")
def auth_client(client, auth_token):
    client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return client


# ===== Global config =====
class TestGlobalConfig:
    def test_get_global_config(self, client):
        r = client.get(f"{BASE_URL}/api/mandagen/config")
        assert r.status_code == 200
        data = r.json()
        assert "hourly_rate" in data
        assert "hours_per_day" in data
        assert isinstance(data["hourly_rate"], (int, float))
        assert data["hourly_rate"] > 0

    def test_put_global_config(self, client):
        r = client.put(f"{BASE_URL}/api/mandagen/config",
                       json={"hourly_rate": 48.0, "hours_per_day": 8.0})
        assert r.status_code == 200
        data = r.json()
        assert data["hourly_rate"] == 48.0
        assert data["hours_per_day"] == 8.0
        # persistence
        r2 = client.get(f"{BASE_URL}/api/mandagen/config")
        assert r2.json()["hourly_rate"] == 48.0
        # restore default
        client.put(f"{BASE_URL}/api/mandagen/config",
                   json={"hourly_rate": 45.0, "hours_per_day": 8.0})


# ===== Per-project override =====
class TestProjectConfigOverride:
    def test_set_and_reset_project_override(self, client):
        r = client.put(f"{BASE_URL}/api/projects/{PROJECT_ID}/mandagen/config",
                       json={"hourly_rate": 55.0, "hours_per_day": 7.5})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["hourly_rate"] == 55.0
        assert data["hours_per_day"] == 7.5
        assert data.get("is_override") is True

        r2 = client.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/mandagen")
        assert r2.status_code == 200
        cfg = r2.json()["config"]
        assert cfg["hourly_rate"] == 55.0
        assert cfg["hours_per_day"] == 7.5
        assert cfg["day_rate"] == round(55.0 * 7.5, 2)
        assert cfg["is_override"] is True

        r3 = client.delete(f"{BASE_URL}/api/projects/{PROJECT_ID}/mandagen/config")
        assert r3.status_code == 200
        assert r3.json().get("is_override") is False


# ===== Generate + GET grouped =====
class TestGenerateAndGet:
    def test_generate(self, client):
        r = client.post(f"{BASE_URL}/api/projects/{PROJECT_ID}/mandagen/generate")
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("project_id", "created", "updated", "removed",
                  "quotes_scanned", "werkposten_aggregated", "missing_profiles"):
            assert k in data
        assert data["project_id"] == PROJECT_ID
        assert isinstance(data["missing_profiles"], list)

    def test_get_mandagen_structure(self, client):
        r = client.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/mandagen")
        assert r.status_code == 200
        data = r.json()
        assert "groups" in data and "totals" in data and "config" in data
        t = data["totals"]
        for k in ("total_man_days", "total_hours", "total_labor_cost", "line_count"):
            assert k in t
        # consistency: day_rate = hourly_rate * hours_per_day
        cfg = data["config"]
        assert round(cfg["hourly_rate"] * cfg["hours_per_day"], 2) == cfg["day_rate"]
        # groups sorted by discipline_order
        if len(data["groups"]) > 1:
            orders = [g["discipline_order"] for g in data["groups"]]
            assert orders == sorted(orders)
        # labor_cost per line equals effective_man_days * day_rate
        day_rate = cfg["day_rate"]
        for g in data["groups"]:
            for ln in g["lines"]:
                eff = ln.get("effective_man_days") or 0
                assert abs(ln["labor_cost"] - round(eff * day_rate, 2)) < 0.05


# ===== Manual line + override =====
class TestManualLinesAndOverride:
    def test_add_update_override_delete(self, client):
        # add
        r = client.post(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/mandagen/lines",
            json={"name": "TEST_manueel_regel", "category": "Algemeen",
                  "unit": "dag", "quantity": 1, "man_days": 2.0,
                  "notes": "test"},
        )
        assert r.status_code == 200, r.text
        line = r.json()
        line_id = line["id"]
        assert line["source"] == "manual"
        assert line["man_days"] == 2.0

        # override_man_days = 3.5 + ensure totals reflect
        r2 = client.put(f"{BASE_URL}/api/mandagen/lines/{line_id}",
                        json={"override_man_days": 3.5})
        assert r2.status_code == 200
        assert r2.json()["override_man_days"] == 3.5

        get_r = client.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/mandagen")
        found = None
        for g in get_r.json()["groups"]:
            for ln in g["lines"]:
                if ln["id"] == line_id:
                    found = ln
        assert found is not None
        assert found["effective_man_days"] == 3.5  # override wins
        day_rate = get_r.json()["config"]["day_rate"]
        assert abs(found["labor_cost"] - round(3.5 * day_rate, 2)) < 0.05

        # disable
        r3 = client.put(f"{BASE_URL}/api/mandagen/lines/{line_id}",
                        json={"enabled": False})
        assert r3.status_code == 200
        assert r3.json()["enabled"] is False

        # delete
        r4 = client.delete(f"{BASE_URL}/api/mandagen/lines/{line_id}")
        assert r4.status_code == 200
        assert r4.json().get("deleted") is True

        r5 = client.put(f"{BASE_URL}/api/mandagen/lines/{line_id}",
                        json={"override_man_days": 1})
        assert r5.status_code == 404


# ===== AI productivity profile =====
class TestAIProductivityProfile:
    def test_ai_fill_endpoint(self, client):
        # find a werkpost
        r = client.get(f"{BASE_URL}/api/werkposten?limit=200")
        assert r.status_code == 200
        wps = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
        if not wps:
            pytest.skip("no werkposten")
        # prefer one without profile to test 'fill'
        target = None
        for w in wps:
            prof = w.get("productivity_profile") or {}
            if not prof or float(prof.get("production_per_man_day") or 0) <= 0:
                target = w
                break
        if not target:
            # all already have profile → test skipped behaviour
            target = wps[0]
            r2 = client.post(f"{BASE_URL}/api/werkposten/{target['id']}/ai-productivity-profile",
                             json={"mode": "fill"}, timeout=60)
            assert r2.status_code == 200
            assert r2.json().get("skipped") is True
            return
        r3 = client.post(f"{BASE_URL}/api/werkposten/{target['id']}/ai-productivity-profile",
                         json={"mode": "fill"}, timeout=90)
        assert r3.status_code == 200, r3.text
        d = r3.json()
        assert d.get("skipped") is False
        prof = d.get("productivity_profile") or {}
        assert prof.get("production_per_man_day", 0) > 0
        assert prof.get("production_unit")

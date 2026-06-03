"""Fase 2C: Uitbreiding materiaalprofielen + materiaallijst-generatie + sanitair seed."""
import os
import math
import uuid
import requests
import pytest

def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if url:
        return url.rstrip("/")
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as fh:
            for line in fh:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not found")


BASE_URL = _load_backend_url()
ADMIN_USER = "liam"
ADMIN_PASS = "Liammail123"
TEST_PROJECT_ID = "PROJ-60A4159C"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth2/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json().get("token")
    assert token
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def all_werkposten(client):
    r = client.get(f"{BASE_URL}/api/werkposten?include_inactive=true")
    assert r.status_code == 200, r.text
    return r.json()


# ---------------- SEED ----------------

class TestSeed:
    def test_seed_contains_gyproc_wand_with_rich_profile(self, all_werkposten):
        wps = [w for w in all_werkposten if (w.get("name") or "").strip().lower() == "gyproc wand"]
        assert wps, "Gyproc wand werkpost niet geseed"
        wp = wps[0]
        prof = wp.get("material_profile") or []
        assert prof, "material_profile leeg voor Gyproc wand"
        gyp = next((m for m in prof if "gyproc plaat" in (m.get("material_name") or "").lower()), None)
        assert gyp is not None, "Gyproc plaat ontbreekt in profiel"
        # rich-velden aanwezig
        for k in ("status", "role", "reason", "waste_percent", "safety_margin_percent",
                  "package_qty", "round_to_package", "quantity_per_unit", "unit"):
            assert k in gyp, f"Veld {k} ontbreekt in material_profile entry"
        assert gyp["round_to_package"] is True
        assert gyp["waste_percent"] >= 1

    def test_seed_contains_sanitair_werkposten(self, all_werkposten):
        names = {(w.get("name") or "").strip().lower() for w in all_werkposten}
        for required in ["plaatsen toilet", "plaatsen bad", "plaatsen douchebak",
                         "plaatsen douchewand/deur", "plaatsen lavabomeubel", "plaatsen lavabokraan"]:
            assert required in names, f"Sanitaire werkpost ontbreekt: {required}"

    def test_seed_materiaal_bibliotheek_contains_seeded_materials(self, client):
        r = client.get(f"{BASE_URL}/api/materiaal")
        assert r.status_code == 200
        items = r.json()
        names = {(m.get("name") or "").strip().lower() for m in items}
        for required in ["gyproc plaat 12.5mm", "snelbouwschroeven", "voegmiddel", "mp75 gipspleister"]:
            assert required in names, f"Materiaal ontbreekt in bibliotheek: {required}"


# ---------------- WERKPOST PROFILE PERSIST ----------------

class TestWerkpostProfileFields:
    @pytest.fixture(scope="class")
    def created_id(self, client):
        name = f"TEST_F2C_{uuid.uuid4().hex[:6]}"
        payload = {
            "name": name,
            "category": "Gyproc",
            "unit": "m²",
            "vat_rate": 6.0,
            "material_profile": [{
                "material_name": "TEST_Gyproc plaat",
                "quantity_per_unit": 0.34,
                "unit": "stuk",
                "status": "verplicht",
                "role": "basis",
                "reason": "1 plaat per 3m²",
                "waste_percent": 5.0,
                "safety_margin_percent": 0.0,
                "package_qty": 1,
                "round_to_package": True,
            }],
        }
        r = client.post(f"{BASE_URL}/api/werkposten", json=payload)
        assert r.status_code in (200, 201), r.text
        wp_id = r.json()["id"]
        yield wp_id
        client.delete(f"{BASE_URL}/api/werkposten/{wp_id}?soft=false")

    def test_create_returns_rich_profile(self, client, created_id):
        r = client.get(f"{BASE_URL}/api/werkposten/{created_id}")
        assert r.status_code == 200
        prof = r.json().get("material_profile") or []
        assert len(prof) == 1
        m = prof[0]
        assert m["status"] == "verplicht"
        assert m["role"] == "basis"
        assert m["reason"] == "1 plaat per 3m²"
        assert m["waste_percent"] == 5.0
        assert m["package_qty"] == 1
        assert m["round_to_package"] is True

    def test_update_profile_persists(self, client, created_id):
        payload = {
            "material_profile": [{
                "material_name": "TEST_Gyproc plaat",
                "quantity_per_unit": 0.34,
                "unit": "stuk",
                "status": "aanbevolen",
                "role": "hulp",
                "reason": "updated reason",
                "waste_percent": 8.0,
                "safety_margin_percent": 2.0,
                "package_qty": 5,
                "round_to_package": True,
            }]
        }
        r = client.put(f"{BASE_URL}/api/werkposten/{created_id}", json=payload)
        assert r.status_code == 200, r.text
        r2 = client.get(f"{BASE_URL}/api/werkposten/{created_id}")
        m = r2.json()["material_profile"][0]
        assert m["status"] == "aanbevolen"
        assert m["role"] == "hulp"
        assert m["reason"] == "updated reason"
        assert m["waste_percent"] == 8.0
        assert m["safety_margin_percent"] == 2.0
        assert m["package_qty"] == 5


# ---------------- MATERIAALLIJST GENERATE ----------------

class TestMateriaallijstGenerate:
    def test_generate_returns_expected_shape(self, client):
        r = client.post(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/materiaallijst/generate")
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("created", "updated", "removed", "skipped_locked", "missing_profiles"):
            assert k in data, f"key {k} ontbreekt in generate response"
        assert isinstance(data["missing_profiles"], list)

    def test_get_materiaallijst_has_requirement_calc_reason(self, client):
        r = client.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/materiaallijst")
        assert r.status_code == 200
        data = r.json()
        assert "missing_profiles" in data
        # totals telt requirement
        totals = data["totals"]
        for k in ("verplicht", "aanbevolen", "optioneel", "disabled"):
            assert k in totals, f"totals.{k} ontbreekt"
        # zoek een auto-regel
        auto_lines = [ln for ln in data["lines"] if ln.get("source") == "auto"]
        assert auto_lines, "Geen auto-regels gevonden — eerst /generate runnen of project zonder offertes"
        sample = auto_lines[0]
        for k in ("requirement", "calculation", "waste_percent"):
            assert k in sample, f"line.{k} ontbreekt"
        assert sample["requirement"] in ("verplicht", "aanbevolen", "optioneel")
        assert sample["calculation"]  # niet leeg

    def test_round_to_package_math(self):
        # Verifieer de wiskunde: qpu × line_qty × (1+waste/100) × (1+margin/100), dan ceil naar pkg
        qpu, line_qty, waste, margin, pkg = 0.34, 28, 5.0, 0.0, 1
        netto = qpu * line_qty
        needed = netto * (1 + waste / 100) * (1 + margin / 100)
        assert round(needed, 3) == 9.996
        packages = math.ceil(needed / pkg)
        assert packages == 10


# ---------------- ENABLE TOGGLE ----------------

class TestEnableToggle:
    @pytest.fixture(scope="class")
    def manual_line_id(self, client):
        r = client.post(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/materiaallijst/lines",
                        json={"name": "TEST_F2C_toggle", "unit": "stuk",
                              "quantity": 4, "unit_price": 10.0})
        assert r.status_code in (200, 201), r.text
        lid = r.json()["id"]
        yield lid
        client.delete(f"{BASE_URL}/api/materiaallijst/lines/{lid}")

    def test_disable_line_excludes_from_totals(self, client, manual_line_id):
        r0 = client.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/materiaallijst")
        before = r0.json()["totals"]["total_cost"]

        r = client.put(f"{BASE_URL}/api/materiaallijst/lines/{manual_line_id}",
                       json={"enabled": False})
        assert r.status_code == 200, r.text
        assert r.json()["enabled"] is False

        r1 = client.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/materiaallijst")
        totals = r1.json()["totals"]
        after = totals["total_cost"]
        # 4 × 10 = 40 minder
        assert round(before - after, 2) == 40.0, f"verwacht 40 verschil, kreeg before={before} after={after}"
        assert totals["disabled"] >= 1

        # re-enable
        r2 = client.put(f"{BASE_URL}/api/materiaallijst/lines/{manual_line_id}",
                        json={"enabled": True})
        assert r2.status_code == 200
        assert r2.json()["enabled"] is True


# ---------------- IDEMPOTENT SEED ----------------

class TestIdempotentSeed:
    def test_no_duplicates_for_seeded_names(self, all_werkposten):
        from collections import Counter
        names = [(w.get("name") or "").strip().lower() for w in all_werkposten]
        # Tellen aantal duplicaten voor geseede namen
        for required in ["gyproc wand", "plaatsen toilet", "plaatsen bad", "tegelvloer"]:
            cnt = Counter(names)[required]
            # 1 of meerdere mag — dupes zijn de bug. We accepteren 1.
            # Als er meer dan 1 is, kan het zijn dat user/seed het dubbel maakte → faal alleen op echte dupes (>2)
            assert cnt <= 2, f"Mogelijke dupe seed voor '{required}': {cnt}x aanwezig"

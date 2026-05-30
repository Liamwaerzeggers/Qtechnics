"""
Backend tests for Fase 1C - Offertegenerator 2.0
Tests:
- /api/offerte-generator/sources (7 berekeningsbronnen)
- /api/room-templates CRUD + seeded defaults
- /api/projects/{id}/offerte-generator/suggest
- /api/projects/{id}/offerte-generator/create-quote (incl. zelflerend)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
USERNAME = "liam"
PASSWORD = "Liammail123"

TEST_PROJECT_ID = "PROJ-60A4159C"
TEST_LEAD_ID = "LEAD-35EF510F"

EXPECTED_SOURCES = {"floor_area", "ceiling_area", "wall_area_net", "wall_plus_ceiling",
                    "dagkanten", "perimeter", "manual"}
SEEDED_ROOM_TYPES = {"Badkamer", "Keuken", "Slaapkamer", "Living", "WC", "Hal"}


# ============= Fixtures =============

@pytest.fixture(scope="session")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth2/login",
                      json={"username": USERNAME, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Auth failed: {r.status_code} {r.text}"
    token = r.json().get("token")
    assert token
    return token


@pytest.fixture
def client(auth_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"})
    return s


# ============= Sources =============

class TestSources:
    def test_get_sources_returns_seven(self, client):
        r = client.get(f"{BASE_URL}/api/offerte-generator/sources", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        keys = {s["key"] for s in data}
        assert keys == EXPECTED_SOURCES, f"Expected {EXPECTED_SOURCES}, got {keys}"
        # check structure
        for s in data:
            assert "key" in s and "label" in s and "unit" in s and "explain" in s


# ============= Room templates =============

class TestRoomTemplates:
    def test_list_seeded_templates(self, client):
        r = client.get(f"{BASE_URL}/api/room-templates", timeout=15)
        assert r.status_code == 200
        tpls = r.json()
        assert isinstance(tpls, list)
        room_types = {t["room_type"] for t in tpls}
        for rt in SEEDED_ROOM_TYPES:
            assert rt in room_types, f"Seeded template '{rt}' missing"
        # validate badkamer has source mapping
        badk = next(t for t in tpls if t["room_type"] == "Badkamer")
        sources = {ln["source"] for ln in badk["lines"]}
        assert "floor_area" in sources
        assert "wall_area_net" in sources
        assert "dagkanten" in sources

    def test_crud_template(self, client):
        # CREATE
        payload = {
            "room_type": "TEST_Ruimte_1C",
            "description": "pytest template",
            "lines": [
                {"label": "TEST_Vloer", "category": "Tegelwerken",
                 "source": "floor_area", "item_type": "arbeid"},
                {"label": "TEST_Wand", "category": "Tegelwerken",
                 "source": "wall_area_net", "item_type": "arbeid"},
            ],
        }
        r = client.post(f"{BASE_URL}/api/room-templates", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["room_type"] == "TEST_Ruimte_1C"
        assert len(created["lines"]) == 2
        assert created["lines"][0]["source"] == "floor_area"
        tpl_id = created["id"]

        # GET (verify persisted)
        r2 = client.get(f"{BASE_URL}/api/room-templates/{tpl_id}", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["room_type"] == "TEST_Ruimte_1C"

        # UPDATE
        upd = {"description": "updated", "lines": [
            {"label": "TEST_Vloer2", "category": "Tegelwerken",
             "source": "ceiling_area", "item_type": "arbeid"}
        ]}
        r3 = client.put(f"{BASE_URL}/api/room-templates/{tpl_id}", json=upd, timeout=15)
        assert r3.status_code == 200
        body = r3.json()
        assert body["description"] == "updated"
        assert len(body["lines"]) == 1
        assert body["lines"][0]["source"] == "ceiling_area"

        # DELETE (hard)
        r4 = client.delete(f"{BASE_URL}/api/room-templates/{tpl_id}?soft=false", timeout=15)
        assert r4.status_code == 200
        assert r4.json().get("deleted") is True

        # GET 404
        r5 = client.get(f"{BASE_URL}/api/room-templates/{tpl_id}", timeout=15)
        assert r5.status_code == 404

    def test_delete_non_existing(self, client):
        r = client.delete(f"{BASE_URL}/api/room-templates/NOPE-XYZ?soft=false", timeout=15)
        assert r.status_code == 404


# ============= Suggest =============

class TestSuggest:
    def test_suggest_for_test_project(self, client):
        r = client.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/offerte-generator/suggest",
            json={}, timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["project_id"] == TEST_PROJECT_ID
        assert isinstance(data["rooms"], list)
        assert len(data["rooms"]) >= 1
        badk = next((r for r in data["rooms"] if (r.get("room_name") or "").lower().startswith("badkamer")), None)
        assert badk is not None, "No Badkamer room found in suggest"
        assert badk["has_template"] is True
        assert badk["template_room_type"] == "Badkamer"
        # Computed values from main agent: vloer 8m², wand 28.31m², dagkanten 7.9lm
        c = badk["computed"]
        assert abs(float(c.get("floor_area", 0)) - 8.0) < 0.5
        assert abs(float(c.get("wall_area", 0)) - 28.31) < 1.5
        assert abs(float(c.get("dagkanten_total_lm", 0)) - 7.9) < 1.0
        # Check lines: floor_area-line should have qty ≈ 8
        floor_lines = [ln for ln in badk["lines"] if ln["source"] == "floor_area"]
        assert len(floor_lines) >= 1
        assert abs(float(floor_lines[0]["quantity"]) - 8.0) < 0.5
        # source_label must be present
        for ln in badk["lines"]:
            assert ln.get("source_label")
            assert ln.get("id")

    def test_suggest_unknown_project_404(self, client):
        r = client.post(
            f"{BASE_URL}/api/projects/PROJ-DOES-NOT-EXIST/offerte-generator/suggest",
            json={}, timeout=15,
        )
        assert r.status_code == 404


# ============= Create quote (incl. zelflerend) =============

class TestCreateQuote:
    @pytest.fixture
    def suggest_payload(self, client):
        r = client.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/offerte-generator/suggest",
            json={}, timeout=20,
        )
        assert r.status_code == 200
        return r.json()

    def test_create_quote_persists_and_returns_id(self, client, suggest_payload):
        # take 2 first lines from the first room with a template
        badk = next(r for r in suggest_payload["rooms"] if r["has_template"])
        # Pick 2 lines: pad prices to ensure zelflerend triggers
        chosen = []
        for ln in badk["lines"][:2]:
            chosen.append({
                "description": ln["label"],
                "quantity": ln["quantity"] or 1.0,
                "unit_price": 42.5,
                "vat_rate": ln.get("vat_rate") or 6.0,
                "unit": ln.get("unit"),
                "item_type": ln.get("item_type") or "arbeid",
                "source": ln["source"],
                "work_item_id": ln.get("work_item_id"),
                "category": ln.get("category"),
                "room_name": badk["room_name"],
            })
        payload = {"lines": chosen, "room": badk["room_name"], "learn_prices": True}
        r = client.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/offerte-generator/create-quote",
            json=payload, timeout=20,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["quote_id"].startswith("OFF-")
        assert body["lead_id"] == TEST_LEAD_ID
        assert body["line_count"] == 2

        quote_id = body["quote_id"]
        # Verify quote exists via standard quotes endpoint
        rq = client.get(f"{BASE_URL}/api/quotes/{quote_id}", timeout=15)
        assert rq.status_code == 200, rq.text
        q = rq.json()
        assert q["id"] == quote_id
        assert q.get("lead_id") == TEST_LEAD_ID
        # totals recalculated?
        assert q.get("total_excl_vat", 0) > 0 or q.get("total_price", 0) > 0

        # Verify line items via standard items endpoint
        ri = client.get(f"{BASE_URL}/api/quotes/{quote_id}/items", timeout=15)
        assert ri.status_code == 200
        items = ri.json()
        assert len(items) == 2

    def test_create_quote_empty_lines_400(self, client):
        r = client.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/offerte-generator/create-quote",
            json={"lines": []}, timeout=15,
        )
        assert r.status_code == 400

    def test_create_quote_unknown_project_404(self, client):
        r = client.post(
            f"{BASE_URL}/api/projects/PROJ-NONE/offerte-generator/create-quote",
            json={"lines": [{"description": "x", "quantity": 1, "unit_price": 1, "vat_rate": 6}]},
            timeout=15,
        )
        assert r.status_code == 404

    def test_create_quote_project_without_lead_400(self, client):
        # Create a project without lead_id
        proj_payload = {"address": "TEST_NoLead_1C", "city": "Gent"}
        rp = client.post(f"{BASE_URL}/api/projects", json=proj_payload, timeout=15)
        if rp.status_code not in (200, 201):
            pytest.skip(f"Cannot create test project (status {rp.status_code}): {rp.text[:200]}")
        proj = rp.json()
        pid = proj.get("id") or proj.get("project_id")
        if not pid:
            pytest.skip("Created project has no id")
        try:
            # ensure lead_id is None (some implementations set defaults)
            if proj.get("lead_id"):
                pytest.skip("New projects always get a lead_id in this app, cannot test 400 path")
            r = client.post(
                f"{BASE_URL}/api/projects/{pid}/offerte-generator/create-quote",
                json={"lines": [{"description": "x", "quantity": 1, "unit_price": 1, "vat_rate": 6}]},
                timeout=15,
            )
            assert r.status_code == 400
        finally:
            client.delete(f"{BASE_URL}/api/projects/{pid}", timeout=10)


# ============= Zelflerend price write-back =============

class TestZelflerend:
    def test_price_writeback_to_werkpost(self, client):
        # Create a werkpost without standard_price
        wp_payload = {
            "name": "TEST_ZelflerendWerkpost_1C",
            "category": "Tegelwerken",
            "unit": "m²",
            "vat_rate": 6.0,
        }
        rw = client.post(f"{BASE_URL}/api/werkposten", json=wp_payload, timeout=15)
        assert rw.status_code in (200, 201), rw.text
        wp = rw.json()
        wp_id = wp["id"]
        try:
            # Send a quote line referencing it with a price
            payload = {
                "lines": [{
                    "description": "TEST_Zelflerend regel",
                    "quantity": 5.0, "unit_price": 77.0, "vat_rate": 6.0,
                    "unit": "m²", "item_type": "arbeid",
                    "source": "floor_area", "work_item_id": wp_id,
                    "category": "Tegelwerken",
                }],
                "learn_prices": True,
            }
            r = client.post(
                f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/offerte-generator/create-quote",
                json=payload, timeout=20,
            )
            assert r.status_code == 200, r.text
            assert r.json().get("prices_learned", 0) >= 1

            # Verify werkpost standard_price = 77.0
            rg = client.get(f"{BASE_URL}/api/werkposten/{wp_id}", timeout=15)
            assert rg.status_code == 200
            assert float(rg.json().get("standard_price") or 0) == 77.0

            # Second call with new price 88 should update + log to price_history
            payload2 = dict(payload)
            payload2["lines"] = [dict(payload["lines"][0], unit_price=88.0)]
            r2 = client.post(
                f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/offerte-generator/create-quote",
                json=payload2, timeout=20,
            )
            assert r2.status_code == 200
            rg2 = client.get(f"{BASE_URL}/api/werkposten/{wp_id}", timeout=15)
            assert rg2.status_code == 200
            body2 = rg2.json()
            assert float(body2.get("standard_price") or 0) == 88.0
            history = body2.get("price_history") or []
            assert any(float(h.get("old_price") or 0) == 77.0 and float(h.get("new_price") or 0) == 88.0
                       for h in history), f"price_history missing 77→88 entry: {history}"
        finally:
            # Hard delete the test werkpost
            client.delete(f"{BASE_URL}/api/werkposten/{wp_id}?soft=false", timeout=10)


# ============= Werkpost default_source field =============

class TestWerkpostDefaultSource:
    def test_create_werkpost_with_default_source(self, client):
        payload = {
            "name": "TEST_DefaultSource_1C",
            "category": "Tegelwerken",
            "unit": "m²",
            "vat_rate": 6.0,
            "standard_price": 50.0,
            "default_source": "floor_area",
        }
        r = client.post(f"{BASE_URL}/api/werkposten", json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        wp = r.json()
        wp_id = wp["id"]
        try:
            assert wp.get("default_source") == "floor_area", f"default_source not saved: {wp}"
            # GET to confirm persistence
            rg = client.get(f"{BASE_URL}/api/werkposten/{wp_id}", timeout=15)
            assert rg.json().get("default_source") == "floor_area"
        finally:
            client.delete(f"{BASE_URL}/api/werkposten/{wp_id}?soft=false", timeout=10)

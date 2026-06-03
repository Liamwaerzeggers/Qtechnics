"""
Backend tests for Fase 2 / 2B:
- Materiaalbibliotheek CRUD + learn-price (router /api/materiaal)
- Materiaallijst generator + line CRUD + order (router /api)

Auth via /api/auth2/login (liam / Liammail123).
Test project: PROJ-60A4159C.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://material-flow-40.preview.emergentagent.com").rstrip("/")
PROJECT_ID = "PROJ-60A4159C"


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth2/login",
                      json={"username": "liam", "password": "Liammail123"}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    token = r.json().get("token") or r.json().get("session_token") or r.json().get("access_token")
    if not token:
        pytest.skip(f"No token returned: {r.json()}")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def created_state():
    return {"material_ids": [], "werkpost_ids": [], "line_ids": [], "quote_ids": []}


# ============ Materiaalbibliotheek CRUD ============

class TestMateriaalBibliotheek:
    def test_create_material(self, auth_headers, created_state):
        suffix = uuid.uuid4().hex[:6].upper()
        payload = {
            "name": f"TEST_Tegellijm_{suffix}",
            "category": "TEST_Lijmen",
            "unit": "zak",
            "purchase_price": 12.0,
            "supplier": "TEST_Bouwshop",
            "sku": "TST-001",
            "package_qty": 25,
        }
        r = requests.post(f"{BASE_URL}/api/materiaal", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["id"].startswith("MAT-")
        assert d["name"] == payload["name"]
        assert d["purchase_price"] == 12.0
        assert d["supplier"] == "TEST_Bouwshop"
        assert d["unit"] == "zak"
        created_state["material_ids"].append(d["id"])
        created_state["mat_name"] = payload["name"]

    def test_list_with_search(self, auth_headers, created_state):
        mid = created_state["material_ids"][0]
        r = requests.get(f"{BASE_URL}/api/materiaal", params={"search": "TEST_Tegellijm"},
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        items = r.json()
        assert any(i["id"] == mid for i in items), "Created material not in search results"

    def test_list_by_category(self, auth_headers, created_state):
        r = requests.get(f"{BASE_URL}/api/materiaal", params={"category": "TEST_Lijmen"},
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200
        for i in r.json():
            assert i["category"] == "TEST_Lijmen"

    def test_get_single(self, auth_headers, created_state):
        mid = created_state["material_ids"][0]
        r = requests.get(f"{BASE_URL}/api/materiaal/{mid}", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == mid

    def test_categories_endpoint(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/materiaal/categories", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "categories" in d and "suppliers" in d
        assert "TEST_Lijmen" in d["categories"]
        assert "TEST_Bouwshop" in d["suppliers"]

    def test_update_logs_price_history(self, auth_headers, created_state):
        mid = created_state["material_ids"][0]
        r = requests.put(f"{BASE_URL}/api/materiaal/{mid}",
                         json={"purchase_price": 15.5, "price_change_note": "prijs gestegen"},
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["purchase_price"] == 15.5
        assert len(d.get("price_history") or []) >= 1
        entry = d["price_history"][-1]
        assert entry["old_price"] == 12.0
        assert entry["new_price"] == 15.5
        assert entry.get("note") == "prijs gestegen"

    def test_learn_price_updates_existing(self, auth_headers, created_state):
        name = created_state["mat_name"]
        r = requests.post(f"{BASE_URL}/api/materiaal/learn-price",
                          json={"name": name, "price": 18.0, "note": "auto-leer"},
                          headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["created"] is False
        assert d["purchase_price"] == 18.0
        # confirm via GET
        mid = created_state["material_ids"][0]
        g = requests.get(f"{BASE_URL}/api/materiaal/{mid}", headers=auth_headers, timeout=15).json()
        assert g["purchase_price"] == 18.0
        assert len(g["price_history"]) >= 2

    def test_learn_price_creates_new(self, auth_headers, created_state):
        new_name = f"TEST_Voegmiddel_{uuid.uuid4().hex[:6].upper()}"
        r = requests.post(f"{BASE_URL}/api/materiaal/learn-price",
                          json={"name": new_name, "price": 9.5, "unit": "kg",
                                "category": "TEST_Voegen", "supplier": "TEST_Bouwshop"},
                          headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["created"] is True
        assert d["purchase_price"] == 9.5
        created_state["material_ids"].append(d["id"])


# ============ Materiaallijst end-to-end ============

class TestMateriaallijst:
    """E2E: create werkpost with material_profile → create quote line for project →
    generate materiaallijst → verify aggregation, supplier grouping, status flows."""

    def test_create_werkpost_with_profile(self, auth_headers, created_state):
        mat = requests.get(f"{BASE_URL}/api/materiaal/{created_state['material_ids'][0]}",
                           headers=auth_headers, timeout=15).json()
        suffix = uuid.uuid4().hex[:6].upper()
        wp_payload = {
            "name": f"TEST_Tegelwerk_{suffix}",
            "discipline": "tegelwerk",
            "unit": "m²",
            "default_price": 80.0,
            "material_profile": [{
                "material_id": mat["id"],
                "material_name": mat["name"],
                "unit": mat["unit"],
                "quantity_per_unit": 0.25,
            }],
        }
        r = requests.post(f"{BASE_URL}/api/werkposten", json=wp_payload,
                          headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        wp = r.json()
        created_state["werkpost_ids"].append(wp["id"])
        created_state["wp"] = wp

    def test_create_quote_with_werkpost_line(self, auth_headers, created_state):
        wp = created_state["wp"]
        payload = {
            "title": f"TEST Materiaallijst {uuid.uuid4().hex[:6]}",
            "lines": [{
                "work_item_id": wp["id"],
                "description": wp["name"],
                "quantity": 8.0,
                "unit": "m²",
                "unit_price": 80.0,
            }],
        }
        r = requests.post(f"{BASE_URL}/api/projects/{PROJECT_ID}/offerte-generator/create-quote",
                          json=payload, headers=auth_headers, timeout=30)
        if r.status_code != 200:
            # Fallback: try plain /api/quotes
            r2 = requests.post(f"{BASE_URL}/api/quotes",
                               json={"project_id": PROJECT_ID, "title": payload["title"],
                                     "lines": payload["lines"]},
                               headers=auth_headers, timeout=30)
            assert r2.status_code in (200, 201), f"both quote endpoints failed: {r.text} | {r2.text}"
            q = r2.json()
        else:
            q = r.json()
        qid = q.get("id") or q.get("quote_id") or (q.get("quote") or {}).get("id")
        assert qid, f"no quote id returned: {q}"
        created_state["quote_ids"].append(qid)

    def test_generate_materiaallijst(self, auth_headers, created_state):
        time.sleep(0.5)
        r = requests.post(f"{BASE_URL}/api/projects/{PROJECT_ID}/materiaallijst/generate",
                          json={}, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["project_id"] == PROJECT_ID
        assert d["created"] + d["updated"] >= 1, f"no lines generated: {d}"
        assert d["quotes_scanned"] >= 1

    def test_get_materiaallijst_grouped(self, auth_headers, created_state):
        r = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/materiaallijst",
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "groups" in d and "totals" in d
        # Find our created material in lines (0.25 × 8 = 2.0 of TEST_Tegellijm)
        target = next((ln for ln in d["lines"]
                       if ln.get("name", "").startswith("TEST_Tegellijm")), None)
        assert target is not None, f"TEST_Tegellijm not in lines: {[ln['name'] for ln in d['lines']]}"
        assert abs(float(target["quantity"]) - 2.0) < 0.01
        assert target["supplier"] == "TEST_Bouwshop"
        assert target["status"] == "te_bestellen"
        created_state["test_line_id"] = target["id"]
        # supplier grouping
        sups = [g["supplier"] for g in d["groups"]]
        assert "TEST_Bouwshop" in sups

    def test_add_manual_line(self, auth_headers, created_state):
        r = requests.post(f"{BASE_URL}/api/projects/{PROJECT_ID}/materiaallijst/lines",
                          json={"name": f"TEST_Manual_{uuid.uuid4().hex[:5]}", "unit": "stuk",
                                "quantity": 3, "unit_price": 5.0, "supplier": "TEST_Manual_Sup"},
                          headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["source"] == "manual"
        created_state["manual_line_id"] = d["id"]

    def test_update_line_qty_and_status_geleverd(self, auth_headers, created_state):
        lid = created_state["manual_line_id"]
        r = requests.put(f"{BASE_URL}/api/materiaallijst/lines/{lid}",
                         json={"quantity": 4, "status": "geleverd"},
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["quantity"] == 4
        assert d["status"] == "geleverd"
        assert d.get("delivered_at"), "delivered_at not set"

    def test_order_creates_material_request(self, auth_headers, created_state):
        line_id = created_state["test_line_id"]
        r = requests.post(f"{BASE_URL}/api/projects/{PROJECT_ID}/materiaallijst/order",
                          json={"line_ids": [line_id], "create_material_requests": True},
                          headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ordered"] >= 1
        assert d["material_requests_created"] >= 1
        # Verify line now besteld with material_request_id
        g = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/materiaallijst",
                         headers=auth_headers, timeout=15).json()
        ln = next(ln for ln in g["lines"] if ln["id"] == line_id)
        assert ln["status"] == "besteld"
        assert ln.get("ordered_at")
        assert ln.get("material_request_id")

    def test_regenerate_skips_locked(self, auth_headers, created_state):
        r = requests.post(f"{BASE_URL}/api/projects/{PROJECT_ID}/materiaallijst/generate",
                          json={}, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        # Our TEST_Tegellijm line is now 'besteld' so regenerate should skip it
        assert d["skipped_locked"] >= 1, f"expected skipped_locked >=1, got: {d}"


# ============ Cleanup ============

class TestZCleanup:
    def test_cleanup(self, auth_headers, created_state):
        # delete materiaallijst lines for project that we created (TEST_ prefix)
        try:
            g = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/materiaallijst",
                             headers=auth_headers, timeout=15).json()
            for ln in g.get("lines", []):
                if (ln.get("name") or "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/materiaallijst/lines/{ln['id']}",
                                    headers=auth_headers, timeout=15)
        except Exception as e:
            print(f"cleanup lines err: {e}")
        # hard delete werkposten
        for wid in created_state["werkpost_ids"]:
            try:
                requests.delete(f"{BASE_URL}/api/werkposten/{wid}?soft=false",
                                headers=auth_headers, timeout=15)
            except Exception:
                pass
        # hard delete materials
        for mid in created_state["material_ids"]:
            try:
                requests.delete(f"{BASE_URL}/api/materiaal/{mid}?soft=false",
                                headers=auth_headers, timeout=15)
            except Exception:
                pass
        assert True

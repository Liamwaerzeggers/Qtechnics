"""
Backend tests for Werkpostbibliotheek (Fase 1B).
Endpoints under /api/werkposten — no auth required (same pattern as meetstaat).
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://material-flow-40.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api/werkposten"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_ids():
    return []


# ---------- LIST + CATEGORIES ----------

class TestListAndCategories:
    def test_list_werkposten(self, session):
        r = session.get(API, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)

    def test_list_with_filters(self, session):
        r = session.get(API, params={"include_inactive": True, "search": "x"}, timeout=20)
        assert r.status_code == 200

    def test_categories_endpoint(self, session):
        r = session.get(f"{API}/categories", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "discipline_order_map" in data
        assert isinstance(data["discipline_order_map"], dict)
        # Verify well-known discipline mappings
        assert data["discipline_order_map"].get("Gyproc") == 12
        assert data["discipline_order_map"].get("Afbraak") == 1
        assert data["discipline_order_map"].get("Oplevering") == 19
        assert "categories" in data


# ---------- CREATE ----------

class TestCreate:
    def test_create_with_known_category_auto_discipline_order(self, session, created_ids):
        payload = {
            "name": "TEST_Gyproc plafond",
            "description": "Test plafond werkpost",
            "category": "Gyproc",
            "unit": "m²",
            "standard_price": 25.50,
            "vat_rate": 6,
            "productivity_profile": {"production_per_man_day": 25.0, "production_unit": "m²"},
            "material_profile": [
                {"material_name": "Gyproc plaat 12.5mm", "quantity_per_unit": 0.34, "unit": "stuk"}
            ],
            "active": True,
        }
        r = session.post(API, json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["category"] == "Gyproc"
        assert data["standard_price"] == 25.50
        assert data["vat_rate"] == 6
        # Auto-discipline-order for Gyproc must be 12
        assert data["discipline_order"] == 12, f"Expected 12 for Gyproc, got {data['discipline_order']}"
        assert data["productivity_profile"]["production_per_man_day"] == 25.0
        assert len(data["material_profile"]) == 1
        assert data["material_profile"][0]["material_name"] == "Gyproc plaat 12.5mm"
        assert "id" in data and data["id"].startswith("WP-")
        created_ids.append(data["id"])

    def test_create_persists_via_get(self, session, created_ids):
        assert created_ids, "Previous create test must have run"
        wid = created_ids[0]
        r = session.get(f"{API}/{wid}", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == wid
        assert d["name"] == "TEST_Gyproc plafond"
        assert d["discipline_order"] == 12


# ---------- UPDATE + PRICE HISTORY ----------

class TestUpdatePriceHistory:
    def test_update_price_logs_history(self, session, created_ids):
        wid = created_ids[0]
        payload = {"standard_price": 30.00, "price_change_note": "TEST_prijsstijging materiaal"}
        r = session.put(f"{API}/{wid}", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["standard_price"] == 30.00
        assert len(d["price_history"]) >= 1
        last = d["price_history"][-1]
        assert last["old_price"] == 25.50
        assert last["new_price"] == 30.00
        assert last.get("note") == "TEST_prijsstijging materiaal"

    def test_history_endpoint(self, session, created_ids):
        wid = created_ids[0]
        r = session.get(f"{API}/{wid}/history", timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["current_price"] == 30.00
        assert isinstance(d["history"], list)
        assert len(d["history"]) >= 1
        assert d["history"][-1]["new_price"] == 30.00

    def test_update_non_price_field(self, session, created_ids):
        wid = created_ids[0]
        r = session.put(f"{API}/{wid}", json={"description": "TEST_updated description"}, timeout=20)
        assert r.status_code == 200
        assert r.json()["description"] == "TEST_updated description"


# ---------- DUPLICATE ----------

class TestDuplicate:
    def test_duplicate_creates_copy_with_kopie_suffix(self, session, created_ids):
        wid = created_ids[0]
        r = session.post(f"{API}/{wid}/duplicate", timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "(kopie)" in d["name"]
        assert d["id"] != wid
        # Reset price history on duplicate
        assert d["price_history"] == []
        # Same category + price preserved
        assert d["category"] == "Gyproc"
        assert d["standard_price"] == 30.00
        created_ids.append(d["id"])


# ---------- DELETE (soft + hard) ----------

class TestDelete:
    def test_soft_delete_deactivates(self, session, created_ids):
        wid = created_ids[-1]  # duplicate id
        r = session.delete(f"{API}/{wid}", timeout=20)
        assert r.status_code == 200
        assert r.json().get("deactivated") is True
        # Verify still exists but inactive
        g = session.get(f"{API}/{wid}", timeout=20)
        assert g.status_code == 200
        assert g.json()["active"] is False

    def test_default_list_excludes_inactive(self, session, created_ids):
        wid = created_ids[-1]
        r = session.get(API, timeout=20)
        ids = [i["id"] for i in r.json()]
        assert wid not in ids

    def test_include_inactive_returns_it(self, session, created_ids):
        wid = created_ids[-1]
        r = session.get(API, params={"include_inactive": True}, timeout=20)
        ids = [i["id"] for i in r.json()]
        assert wid in ids

    def test_hard_delete_removes(self, session, created_ids):
        # Hard delete all created ids
        for wid in created_ids:
            r = session.delete(f"{API}/{wid}", params={"soft": False}, timeout=20)
            assert r.status_code == 200, f"hard delete failed for {wid}: {r.text}"
            assert r.json().get("deleted") is True
            # Verify 404
            g = session.get(f"{API}/{wid}", timeout=20)
            assert g.status_code == 404


# ---------- ERRORS ----------

class TestErrors:
    def test_get_nonexistent(self, session):
        r = session.get(f"{API}/WP-DOESNOTEX", timeout=20)
        assert r.status_code == 404

    def test_update_nonexistent(self, session):
        r = session.put(f"{API}/WP-DOESNOTEX", json={"name": "x"}, timeout=20)
        assert r.status_code == 404

    def test_duplicate_nonexistent(self, session):
        r = session.post(f"{API}/WP-DOESNOTEX/duplicate", timeout=20)
        assert r.status_code == 404

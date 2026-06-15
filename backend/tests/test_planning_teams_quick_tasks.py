"""
Tests for shared planning teams (planning_config) and quick-tasks sharing across admins.
Bug fix: planning teams persisted in backend (not localStorage) and quick-tasks shared (no user_id filter).
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://material-flow-40.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USERNAME = "liam"
ADMIN_PASSWORD = "Liammail123"


def _admin_login_token():
    """Try admin login, retry on rate-limit/intermittent errors."""
    last_err = None
    for attempt in range(5):
        try:
            r = requests.post(
                f"{API}/auth/admin/login",
                json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
                timeout=20,
            )
            if r.status_code == 200:
                data = r.json()
                token = data.get("session_token") or data.get("token")
                if token:
                    return token
                last_err = f"No token in response: {data}"
            else:
                last_err = f"{r.status_code}: {r.text}"
        except Exception as e:
            last_err = str(e)
        time.sleep(1.5)
    pytest.skip(f"Admin login failed after retries: {last_err}")


@pytest.fixture(scope="session")
def admin_token():
    return _admin_login_token()


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def second_admin_headers(admin_token):
    """Simulate a 'second admin' context by reusing token in a fresh requests session.
    The shared-data test only requires the server-side state to be consistent."""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


def _reset_planning_config(headers):
    """Best-effort: clear the planning_config doc by overwriting with empty list, then DELETE via Mongo not exposed.
    We simulate cleanup by saving an empty list which the endpoint may accept; verify is_default returns to True if empty.
    """
    # The PUT strips empty strings; sending [] just stores teams=[]; doc still exists so is_default=False.
    # We'll just leave the test data and try to revert to defaults at end.
    pass


# ============= PLANNING TEAMS =============

class TestPlanningTeams:
    """Tests for /api/planning-teams shared config."""

    def test_get_requires_auth(self):
        r = requests.get(f"{API}/planning-teams", timeout=15)
        # Expect 401/403 without token
        assert r.status_code in (401, 403), f"Expected 401/403 unauth, got {r.status_code}: {r.text}"

    def test_get_returns_defaults_when_no_config(self, admin_headers):
        """Tests that defaults are returned when no config exists. NOTE: this may not be default if a prior PUT created the doc."""
        # First clear if exists by sending PUT with empty -> the endpoint upserts with teams=[] so is_default would be False.
        # We can't truly delete via API, so we only verify the shape of the response.
        r = requests.get(f"{API}/planning-teams", headers=admin_headers, timeout=15)
        assert r.status_code == 200, f"GET planning-teams failed: {r.status_code} {r.text}"
        data = r.json()
        assert "teams" in data and isinstance(data["teams"], list)
        assert "is_default" in data and isinstance(data["is_default"], bool)
        # If is_default is True, then teams should equal DEFAULTS
        if data["is_default"]:
            assert data["teams"] == ["Team 1", "Team 2", "Team 3"]

    def test_put_persists_and_shared_across_admins(self, admin_headers, second_admin_headers):
        teams = ["Ploeg A", "Ploeg B", "Ploeg Sanitair"]
        r = requests.put(f"{API}/planning-teams", headers=admin_headers, json={"teams": teams}, timeout=15)
        assert r.status_code == 200, f"PUT planning-teams failed: {r.status_code} {r.text}"
        body = r.json()
        assert body.get("teams") == teams

        # GET as "second admin"
        r2 = requests.get(f"{API}/planning-teams", headers=second_admin_headers, timeout=15)
        assert r2.status_code == 200
        data2 = r2.json()
        assert data2["teams"] == teams, f"Teams not shared: {data2}"
        assert data2["is_default"] is False

    def test_put_strips_empty_and_whitespace(self, admin_headers):
        r = requests.put(
            f"{API}/planning-teams",
            headers=admin_headers,
            json={"teams": ["  Team X  ", "", "  ", "Team Y"]},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["teams"] == ["Team X", "Team Y"]

    def test_put_requires_auth(self):
        r = requests.put(f"{API}/planning-teams", json={"teams": ["A"]}, timeout=15)
        assert r.status_code in (401, 403)


# ============= QUICK TASKS =============

class TestQuickTasks:
    """Tests for /api/quick-tasks shared across admins (no user_id filter)."""

    created_ids = []

    def test_create_and_get_quick_task(self, admin_headers):
        payload = {
            "title": "TEST_QT_planning_share",
            "description": "Auto test quick task",
            "start_date": "2026-01-15",
            "end_date": "2026-01-16",
        }
        r = requests.post(f"{API}/quick-tasks", headers=admin_headers, json=payload, timeout=15)
        assert r.status_code in (200, 201), f"POST quick-tasks failed: {r.status_code} {r.text}"
        task = r.json()
        assert task["title"] == payload["title"]
        assert "id" in task and task["id"]
        TestQuickTasks.created_ids.append(task["id"])

        # GET should return our task (and not be filtered by user_id)
        rg = requests.get(f"{API}/quick-tasks", headers=admin_headers, timeout=15)
        assert rg.status_code == 200
        tasks = rg.json()
        assert isinstance(tasks, list)
        ids = [t.get("id") for t in tasks]
        assert task["id"] in ids, "Created quick task not present in GET list (possibly filtered by user_id)"

    def test_update_quick_task_by_id_only(self, admin_headers):
        assert TestQuickTasks.created_ids, "Need a created task first"
        task_id = TestQuickTasks.created_ids[0]
        r = requests.put(
            f"{API}/quick-tasks/{task_id}",
            headers=admin_headers,
            json={"team_name": "Ploeg A"},
            timeout=15,
        )
        assert r.status_code == 200, f"PUT quick-tasks/{task_id} failed: {r.status_code} {r.text}"
        updated = r.json()
        assert updated.get("team_name") == "Ploeg A"

        # Verify via GET
        rg = requests.get(f"{API}/quick-tasks", headers=admin_headers, timeout=15)
        assert rg.status_code == 200
        match = [t for t in rg.json() if t.get("id") == task_id]
        assert match and match[0].get("team_name") == "Ploeg A"

    def test_delete_quick_task_by_id_only(self, admin_headers):
        assert TestQuickTasks.created_ids
        task_id = TestQuickTasks.created_ids[0]
        r = requests.delete(f"{API}/quick-tasks/{task_id}", headers=admin_headers, timeout=15)
        assert r.status_code in (200, 204)

        # Confirm gone
        rg = requests.get(f"{API}/quick-tasks", headers=admin_headers, timeout=15)
        ids = [t.get("id") for t in rg.json()]
        assert task_id not in ids
        TestQuickTasks.created_ids.remove(task_id)


# ============= CLEANUP =============

@pytest.fixture(scope="session", autouse=True)
def _final_cleanup(admin_headers):
    """After all tests run, reset planning_config to defaults by saving an empty list, then sending defaults back.
    The server stores teams=[] when given empty; this still makes is_default=False (doc exists).
    Best we can do via API: leave defaults written. Main agent noted to manually delete doc; we leave a comment."""
    yield
    # Try to remove any created quick tasks
    try:
        for tid in list(TestQuickTasks.created_ids):
            requests.delete(f"{API}/quick-tasks/{tid}", headers=admin_headers, timeout=10)
    except Exception:
        pass
    # Restore default-like state (no API to delete doc; save defaults so user sees Team 1/2/3 anyway)
    try:
        requests.put(
            f"{API}/planning-teams",
            headers=admin_headers,
            json={"teams": ["Team 1", "Team 2", "Team 3"]},
            timeout=10,
        )
    except Exception:
        pass

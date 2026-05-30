"""
Material Catalog API Tests
Tests for the Bestelcatalogus (Order Catalog) feature:
- Admin: CRUD operations on catalog items
- Worker: Browse catalog, create material orders
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BASE_URL:
    BASE_URL = "https://quote-foundation-1.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip('/')

# Test credentials
ADMIN_USERNAME = "liam"
ADMIN_PASSWORD = "Liammail123"
WORKER_USERNAME = "testwerkman"
WORKER_PASSWORD = "Werk123456"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth2/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert data.get("success") == True
    assert "token" in data
    return data["token"]


@pytest.fixture(scope="module")
def worker_token():
    """Get worker authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/worker/login", json={
        "username": WORKER_USERNAME,
        "password": WORKER_PASSWORD
    })
    assert response.status_code == 200, f"Worker login failed: {response.text}"
    data = response.json()
    assert "session_token" in data
    return data["session_token"]


@pytest.fixture(scope="module")
def admin_client(admin_token):
    """Requests session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


@pytest.fixture(scope="module")
def worker_client(worker_token):
    """Requests session with worker auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {worker_token}"
    })
    return session


class TestAdminCatalogCRUD:
    """Admin CRUD operations on material catalog"""
    
    def test_get_catalog_list(self, admin_client):
        """Admin can view all catalog items"""
        response = admin_client.get(f"{BASE_URL}/api/material-catalog")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the 5 seeded items
        assert len(data) >= 5
        # Verify item structure
        for item in data:
            assert "id" in item
            assert "title" in item
            assert "active" in item
    
    def test_create_catalog_item_without_sizes(self, admin_client):
        """Admin can create item without sizes"""
        payload = {
            "title": "TEST_Schroeven",
            "description": "Test schroeven pakket"
        }
        response = admin_client.post(f"{BASE_URL}/api/material-catalog", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Schroeven"
        assert data["description"] == "Test schroeven pakket"
        assert data["sizes"] == []
        assert data["active"] == True
        assert "id" in data
        # Save for cleanup
        self.__class__.created_item_id = data["id"]
    
    def test_create_catalog_item_with_sizes(self, admin_client):
        """Admin can create item with sizes (comma-separated)"""
        payload = {
            "title": "TEST_Buizen",
            "description": "PVC buizen voor afvoer",
            "sizes": ["32mm", "40mm", "50mm"]
        }
        response = admin_client.post(f"{BASE_URL}/api/material-catalog", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Buizen"
        assert data["sizes"] == ["32mm", "40mm", "50mm"]
        assert len(data["sizes"]) == 3
        # Save for cleanup
        self.__class__.created_item_with_sizes_id = data["id"]
    
    def test_update_catalog_item(self, admin_client):
        """Admin can update existing catalog item"""
        item_id = getattr(self.__class__, 'created_item_id', None)
        if not item_id:
            pytest.skip("No created item to update")
        
        payload = {
            "title": "TEST_Schroeven Updated",
            "description": "Updated description",
            "sizes": ["M4x20", "M5x30"]
        }
        response = admin_client.put(f"{BASE_URL}/api/material-catalog/{item_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Schroeven Updated"
        assert data["sizes"] == ["M4x20", "M5x30"]
        
        # Verify update persisted via GET
        get_response = admin_client.get(f"{BASE_URL}/api/material-catalog")
        assert get_response.status_code == 200
        items = get_response.json()
        updated_item = next((i for i in items if i["id"] == item_id), None)
        assert updated_item is not None
        assert updated_item["title"] == "TEST_Schroeven Updated"
    
    def test_delete_catalog_item(self, admin_client):
        """Admin can delete catalog item"""
        item_id = getattr(self.__class__, 'created_item_id', None)
        if not item_id:
            pytest.skip("No created item to delete")
        
        response = admin_client.delete(f"{BASE_URL}/api/material-catalog/{item_id}")
        assert response.status_code == 200
        
        # Verify item is gone
        get_response = admin_client.get(f"{BASE_URL}/api/material-catalog")
        items = get_response.json()
        deleted_item = next((i for i in items if i["id"] == item_id), None)
        assert deleted_item is None
    
    def test_delete_catalog_item_with_sizes(self, admin_client):
        """Cleanup: delete item with sizes"""
        item_id = getattr(self.__class__, 'created_item_with_sizes_id', None)
        if item_id:
            response = admin_client.delete(f"{BASE_URL}/api/material-catalog/{item_id}")
            assert response.status_code == 200


class TestWorkerCatalogAccess:
    """Worker can browse catalog and create orders"""
    
    def test_worker_can_view_catalog(self, worker_client):
        """Worker can see catalog items"""
        response = worker_client.get(f"{BASE_URL}/api/material-catalog")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 5
        # Verify seeded items exist
        titles = [item["title"] for item in data]
        assert "Cement" in titles
        assert "Tegels" in titles
    
    def test_worker_can_get_projects(self, worker_client):
        """Worker can see assigned projects"""
        response = worker_client.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Worker should see at least 1 project
        assert len(data) >= 1
        project_names = [p["name"] for p in data]
        assert any("Zinio" in name for name in project_names)
    
    def test_worker_cannot_create_catalog_item(self, worker_client):
        """Worker cannot create catalog items (admin only)"""
        payload = {
            "title": "UNAUTHORIZED_Item",
            "description": "Should fail"
        }
        response = worker_client.post(f"{BASE_URL}/api/material-catalog", json=payload)
        assert response.status_code == 403
    
    def test_worker_cannot_delete_catalog_item(self, worker_client, admin_client):
        """Worker cannot delete catalog items (admin only)"""
        # Get first catalog item
        get_response = admin_client.get(f"{BASE_URL}/api/material-catalog")
        items = get_response.json()
        if len(items) > 0:
            item_id = items[0]["id"]
            response = worker_client.delete(f"{BASE_URL}/api/material-catalog/{item_id}")
            assert response.status_code == 403


class TestMaterialOrders:
    """Material order creation tests"""
    
    def test_worker_can_create_order_without_size(self, worker_client):
        """Worker can order item without sizes (Cement)"""
        # First get catalog to find Cement
        catalog = worker_client.get(f"{BASE_URL}/api/material-catalog").json()
        cement = next((i for i in catalog if i["title"] == "Cement"), None)
        assert cement is not None
        
        # Get project
        projects = worker_client.get(f"{BASE_URL}/api/projects").json()
        project = projects[0]
        
        payload = {
            "items": [{
                "catalog_item_id": cement["id"],
                "title": cement["title"],
                "selected_size": None,
                "quantity": 5,
                "image_url": cement.get("image_url")
            }],
            "project_id": project["id"],
            "project_name": project["name"],
            "notes": "TEST_Order cement for foundation"
        }
        response = worker_client.post(f"{BASE_URL}/api/material-orders", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert len(data.get("ids", [])) == 1
    
    def test_worker_can_create_order_with_size(self, worker_client):
        """Worker can order item with specific size (Tegels)"""
        catalog = worker_client.get(f"{BASE_URL}/api/material-catalog").json()
        tegels = next((i for i in catalog if i["title"] == "Tegels"), None)
        assert tegels is not None
        assert len(tegels["sizes"]) > 0
        
        projects = worker_client.get(f"{BASE_URL}/api/projects").json()
        project = projects[0]
        
        payload = {
            "items": [{
                "catalog_item_id": tegels["id"],
                "title": tegels["title"],
                "selected_size": "60x60",
                "quantity": 20,
                "image_url": tegels.get("image_url")
            }],
            "project_id": project["id"],
            "project_name": project["name"],
            "notes": "TEST_Tegels for bathroom floor"
        }
        response = worker_client.post(f"{BASE_URL}/api/material-orders", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "ids" in data
    
    def test_worker_can_create_multi_item_order(self, worker_client):
        """Worker can order multiple items in one order"""
        catalog = worker_client.get(f"{BASE_URL}/api/material-catalog").json()
        projects = worker_client.get(f"{BASE_URL}/api/projects").json()
        project = projects[0]
        
        cement = next((i for i in catalog if i["title"] == "Cement"), None)
        isolatie = next((i for i in catalog if i["title"] == "Isolatie"), None)
        
        payload = {
            "items": [
                {
                    "catalog_item_id": cement["id"],
                    "title": cement["title"],
                    "selected_size": None,
                    "quantity": 3,
                    "image_url": cement.get("image_url")
                },
                {
                    "catalog_item_id": isolatie["id"],
                    "title": isolatie["title"],
                    "selected_size": "100mm",
                    "quantity": 10,
                    "image_url": isolatie.get("image_url")
                }
            ],
            "project_id": project["id"],
            "project_name": project["name"],
            "notes": "TEST_Multi-item order"
        }
        response = worker_client.post(f"{BASE_URL}/api/material-orders", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "2 materialen besteld" in data.get("message", "")
        assert len(data.get("ids", [])) == 2
    
    def test_order_appears_in_material_requests(self, worker_client):
        """Orders appear in material-requests endpoint"""
        response = worker_client.get(f"{BASE_URL}/api/material-requests")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have our test orders
        test_orders = [r for r in data if "TEST_" in (r.get("notes") or "")]
        assert len(test_orders) >= 1


class TestEdgeCases:
    """Edge cases and error handling"""
    
    def test_create_item_without_title_fails(self, admin_client):
        """Cannot create item without title"""
        payload = {"description": "No title provided"}
        response = admin_client.post(f"{BASE_URL}/api/material-catalog", json=payload)
        # Should fail validation
        assert response.status_code in [400, 422]
    
    def test_update_nonexistent_item_fails(self, admin_client):
        """Cannot update item that doesn't exist"""
        payload = {"title": "Updated Title"}
        response = admin_client.put(f"{BASE_URL}/api/material-catalog/NONEXISTENT-ID", json=payload)
        assert response.status_code == 404
    
    def test_delete_nonexistent_item_fails(self, admin_client):
        """Cannot delete item that doesn't exist"""
        response = admin_client.delete(f"{BASE_URL}/api/material-catalog/NONEXISTENT-ID")
        assert response.status_code == 404
    
    def test_order_without_items_fails(self, worker_client):
        """Cannot create order without items"""
        projects = worker_client.get(f"{BASE_URL}/api/projects").json()
        project = projects[0]
        
        payload = {
            "items": [],
            "project_id": project["id"],
            "project_name": project["name"]
        }
        response = worker_client.post(f"{BASE_URL}/api/material-orders", json=payload)
        assert response.status_code == 400


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_material_requests(self, admin_client):
        """Remove TEST_ prefixed material requests"""
        response = admin_client.get(f"{BASE_URL}/api/material-requests")
        if response.status_code == 200:
            requests_data = response.json()
            for req in requests_data:
                if "TEST_" in (req.get("notes") or "") or "TEST_" in (req.get("title") or ""):
                    # There's no delete endpoint for material requests in the API
                    # So we just note the cleanup would be needed
                    pass
        print("Test material requests cleanup complete (manual cleanup may be needed)")

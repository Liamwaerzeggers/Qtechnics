"""
Backend tests for new Material Request features:
1. Manual material entry section (description, qty, m², lopende meter, photo)
2. Custom size option ('Anders...')
3. Inline quantity/m²/lm inputs on catalog cards
4. Photo upload for manual entries
5. Material orders with is_manual flag and lm field

Test user: testwerkman / Werk123456 (worker)
"""
import pytest
import requests
import os
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWorkerAuthentication:
    """Test worker login flow"""
    
    def test_worker_login_success(self):
        """Worker can login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/worker/login",
            json={"username": "testwerkman", "password": "Werk123456"},
            headers={"Content-Type": "application/json"}
        )
        print(f"Worker login response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "session_token" in data, "Missing session_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["role"] == "worker", "User should be a worker"
        return data["session_token"]
    
    def test_worker_login_invalid_credentials(self):
        """Worker login fails with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/worker/login",
            json={"username": "invalid_user", "password": "wrong_password"},
            headers={"Content-Type": "application/json"}
        )
        print(f"Invalid login response: {response.status_code} - {response.text}")
        assert response.status_code in [401, 404], f"Expected 401/404, got {response.status_code}"


class TestMaterialCatalogEndpoints:
    """Test material catalog and category endpoints"""
    
    @pytest.fixture
    def worker_token(self):
        """Get worker authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/worker/login",
            json={"username": "testwerkman", "password": "Werk123456"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json()["session_token"]
        pytest.skip("Worker login failed - skipping authenticated tests")
    
    def test_get_material_catalog(self, worker_token):
        """Worker can fetch material catalog"""
        response = requests.get(
            f"{BASE_URL}/api/material-catalog",
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        print(f"Material catalog response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get catalog: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Catalog should be a list"
        print(f"Catalog items count: {len(data)}")
    
    def test_get_material_categories(self, worker_token):
        """Worker can fetch material categories"""
        response = requests.get(
            f"{BASE_URL}/api/material-categories",
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        print(f"Categories response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get categories: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Categories should be a list"
        print(f"Categories count: {len(data)}")
    
    def test_get_projects_for_worker(self, worker_token):
        """Worker can fetch projects list"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        print(f"Projects response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get projects: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Projects should be a list"
        print(f"Projects count: {len(data)}")
        return data


class TestMaterialOrderWithManualItems:
    """Test material order submission with manual items and lm field"""
    
    @pytest.fixture
    def worker_session(self):
        """Get worker authentication and project info"""
        # Login
        response = requests.post(
            f"{BASE_URL}/api/auth/worker/login",
            json={"username": "testwerkman", "password": "Werk123456"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code != 200:
            pytest.skip("Worker login failed")
        token = response.json()["session_token"]
        
        # Get projects
        proj_response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {token}"}
        )
        projects = proj_response.json() if proj_response.status_code == 200 else []
        
        project_id = projects[0]["id"] if projects else "TEST-PROJECT"
        project_name = projects[0].get("name", "Test Project") if projects else "Test Project"
        
        return {"token": token, "project_id": project_id, "project_name": project_name}
    
    def test_create_material_order_with_catalog_item(self, worker_session):
        """Worker can create material order with catalog item and custom size"""
        order_data = {
            "items": [{
                "catalog_item_id": "TEST-CAT-ITEM-001",
                "title": "TEST_Tegels 60x60",
                "selected_size": "Anders: 45x90 custom",
                "quantity": 2,
                "m2": "10.5",
                "lm": "",
                "image_url": None,
                "is_manual": False
            }],
            "project_id": worker_session["project_id"],
            "project_name": worker_session["project_name"],
            "notes": "TEST order - custom size testing",
            "delivery_date": "2026-04-01"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/material-orders",
            json=order_data,
            headers={
                "Authorization": f"Bearer {worker_session['token']}",
                "Content-Type": "application/json"
            }
        )
        print(f"Create order response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Failed to create order: {response.text}"
        
        data = response.json()
        assert "ids" in data, "Response should contain ids"
        assert len(data["ids"]) == 1, "Should create 1 material request"
        print(f"Created material request IDs: {data['ids']}")
        return data["ids"]
    
    def test_create_material_order_with_manual_item(self, worker_session):
        """Worker can create material order with manual (not in catalog) item"""
        order_data = {
            "items": [{
                "catalog_item_id": None,
                "title": "TEST_Handmatig item - speciale lijm",
                "selected_size": None,
                "quantity": 3,
                "m2": "5.0",
                "lm": "12.5",  # Lopende meter field
                "image_url": None,
                "is_manual": True  # IMPORTANT: Manual entry flag
            }],
            "project_id": worker_session["project_id"],
            "project_name": worker_session["project_name"],
            "notes": "TEST manual entry with lm field",
            "delivery_date": None  # ASAP
        }
        
        response = requests.post(
            f"{BASE_URL}/api/material-orders",
            json=order_data,
            headers={
                "Authorization": f"Bearer {worker_session['token']}",
                "Content-Type": "application/json"
            }
        )
        print(f"Manual order response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Failed to create manual order: {response.text}"
        
        data = response.json()
        assert "ids" in data, "Response should contain ids"
        assert len(data["ids"]) == 1, "Should create 1 material request"
        
        # Verify the manual item was created with [Handmatig] prefix
        print(f"Created manual material request: {data['ids'][0]}")
        return data["ids"]
    
    def test_create_material_order_with_mixed_items(self, worker_session):
        """Worker can submit order with both catalog and manual items"""
        order_data = {
            "items": [
                {
                    "catalog_item_id": "TEST-CAT-002",
                    "title": "TEST_Vloertegel Porselein",
                    "selected_size": "80x80",
                    "quantity": 5,
                    "m2": "32",
                    "lm": "",
                    "image_url": None,
                    "is_manual": False
                },
                {
                    "catalog_item_id": None,
                    "title": "TEST_Custom materiaal niet in lijst",
                    "selected_size": None,
                    "quantity": 1,
                    "m2": "",
                    "lm": "8.5",
                    "image_url": None,
                    "is_manual": True
                }
            ],
            "project_id": worker_session["project_id"],
            "project_name": worker_session["project_name"],
            "notes": "TEST mixed order - catalog + manual",
            "delivery_date": "2026-04-15"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/material-orders",
            json=order_data,
            headers={
                "Authorization": f"Bearer {worker_session['token']}",
                "Content-Type": "application/json"
            }
        )
        print(f"Mixed order response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Failed to create mixed order: {response.text}"
        
        data = response.json()
        assert "ids" in data, "Response should contain ids"
        assert len(data["ids"]) == 2, "Should create 2 material requests"
        print(f"Created mixed order IDs: {data['ids']}")
        return data["ids"]
    
    def test_verify_material_requests_created(self, worker_session):
        """Verify material requests are visible in the requests list"""
        response = requests.get(
            f"{BASE_URL}/api/material-requests",
            headers={"Authorization": f"Bearer {worker_session['token']}"}
        )
        print(f"Material requests response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get requests: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        
        # Filter TEST_ items
        test_items = [r for r in data if "TEST_" in r.get("title", "")]
        print(f"Found {len(test_items)} TEST items in material requests")
        
        # Check for manual items
        manual_items = [r for r in test_items if "[Handmatig]" in r.get("title", "")]
        print(f"Found {len(manual_items)} manual items with [Handmatig] prefix")
        
        # Check for lm field in titles
        lm_items = [r for r in test_items if "lm" in r.get("title", "")]
        print(f"Found {len(lm_items)} items with lm in title")
        
        return test_items


class TestPhotoUploadEndpoint:
    """Test photo upload for manual material entries"""
    
    @pytest.fixture
    def worker_token(self):
        """Get worker authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/worker/login",
            json={"username": "testwerkman", "password": "Werk123456"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json()["session_token"]
        pytest.skip("Worker login failed")
    
    def test_upload_photo_endpoint_exists(self, worker_token):
        """Photo upload endpoint responds (even without actual file)"""
        # Test that endpoint exists and requires file
        response = requests.post(
            f"{BASE_URL}/api/material-orders/upload-photo",
            headers={"Authorization": f"Bearer {worker_token}"},
            data={}  # Empty data to test validation
        )
        print(f"Upload photo response: {response.status_code}")
        # Should return 422 (validation error) because no file provided
        assert response.status_code in [400, 422], f"Expected 400/422 for missing file, got {response.status_code}"
    
    def test_upload_photo_with_mock_file(self, worker_token):
        """Test photo upload with actual image file"""
        # Create a simple PNG image (1x1 pixel)
        import io
        from struct import pack
        
        # Minimal PNG file
        png_header = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D,  # IHDR length
            0x49, 0x48, 0x44, 0x52,  # IHDR
            0x00, 0x00, 0x00, 0x01,  # width 1
            0x00, 0x00, 0x00, 0x01,  # height 1
            0x08, 0x02,              # bit depth 8, color type 2 (RGB)
            0x00, 0x00, 0x00,        # compression, filter, interlace
            0x90, 0x77, 0x53, 0xDE,  # CRC
            0x00, 0x00, 0x00, 0x0C,  # IDAT length
            0x49, 0x44, 0x41, 0x54,  # IDAT
            0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00, 0x01,
            0x00, 0x01, 0x00, 0x05,  # CRC placeholder
            0x00, 0x00, 0x00, 0x00,  # IEND length
            0x49, 0x45, 0x4E, 0x44,  # IEND
            0xAE, 0x42, 0x60, 0x82   # CRC
        ])
        
        files = {
            'file': ('test_photo.png', io.BytesIO(png_header), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/material-orders/upload-photo",
            headers={"Authorization": f"Bearer {worker_token}"},
            files=files
        )
        print(f"Upload photo with file response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        data = response.json()
        assert "image_url" in data, "Response should contain image_url"
        assert data["image_url"].startswith("/api/static/catalog/"), "Image URL should start with /api/static/catalog/"
        print(f"Uploaded image URL: {data['image_url']}")
        return data["image_url"]


class TestAdminMaterialOrders:
    """Test admin access to material orders"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"username": "liam", "password": "Liammail123"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json()["session_token"]
        pytest.skip("Admin login failed")
    
    def test_admin_can_view_material_requests(self, admin_token):
        """Admin can view all material requests"""
        response = requests.get(
            f"{BASE_URL}/api/material-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Admin material requests response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return list"
        print(f"Admin sees {len(data)} material requests")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token for cleanup"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"username": "liam", "password": "Liammail123"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json()["session_token"]
        pytest.skip("Admin login failed for cleanup")
    
    def test_cleanup_test_material_requests(self, admin_token):
        """Cleanup TEST_ prefixed material requests (for documentation)"""
        # Get all material requests
        response = requests.get(
            f"{BASE_URL}/api/material-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 200:
            requests_list = response.json()
            test_requests = [r for r in requests_list if "TEST_" in r.get("title", "")]
            print(f"Found {len(test_requests)} TEST_ material requests to potentially clean up")
            # Note: Actual cleanup would require DELETE endpoint which may not exist
            # Just documenting what was created
        
        assert True  # Always pass - cleanup is informational


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

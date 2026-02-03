"""
Test suite for Property Scraping and Work Item Labels features
- Property scraping works for generic realtor websites (not just Immoweb/Zimmo)
- POST /api/properties/scrape - accepts any URL and extracts property data
- WorkItemLabelsPage - displays all work items with current labels
- PUT /api/work-items/{id}/label - can change component_label via dropdown
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "test"
ADMIN_PASSWORD = "test123"
REALTOR_USERNAME = "liamtest"
REALTOR_PASSWORD = "test123"


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login(self):
        """Test admin can login with username/password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        assert data["user"]["role"] == "admin"
        print(f"✅ Admin login successful: {data['user']['name']}")
        return data["session_token"]


class TestPropertyScraping:
    """Property scraping endpoint tests"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    @pytest.fixture
    def realtor_session(self):
        """Get realtor session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/tenant/login",
            json={"username": REALTOR_USERNAME, "password": REALTOR_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Realtor login failed: {response.text}")
        return response.json()["session_token"]
    
    def test_scrape_endpoint_requires_auth(self):
        """Test that scrape endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/properties/scrape?url=https://example.com"
        )
        assert response.status_code == 401, "Scrape endpoint should require auth"
        print("✅ Scrape endpoint correctly requires authentication")
    
    def test_scrape_generic_website_admin(self, admin_session):
        """Test scraping a generic website as admin"""
        # Test with ERA.be URL (generic realtor website)
        test_url = "https://www.era.be/nl/te-koop/9000-gent"
        
        response = requests.post(
            f"{BASE_URL}/api/properties/scrape?url={test_url}",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Scrape failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "success" in data
        assert "data" in data
        assert "message" in data
        
        print(f"✅ Generic scrape response: success={data['success']}, message={data['message']}")
        
        # Check scraped data structure
        scraped = data["data"]
        assert "address" in scraped
        assert "asking_price" in scraped
        assert "living_area" in scraped
        assert "bedrooms" in scraped
        assert "bathrooms" in scraped
        assert "epc_score" in scraped
        
        print(f"   Scraped data: address={scraped.get('address', 'N/A')}, price={scraped.get('asking_price', 0)}")
    
    def test_scrape_immoweb_url(self, admin_session):
        """Test scraping an Immoweb URL (may be blocked by anti-bot)"""
        test_url = "https://www.immoweb.be/nl/zoekertje/huis/te-koop/gent/9000/12345678"
        
        response = requests.post(
            f"{BASE_URL}/api/properties/scrape?url={test_url}",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Scrape failed: {response.text}"
        data = response.json()
        
        # Immoweb may block scraping, but endpoint should still return valid response
        assert "success" in data
        assert "data" in data
        assert "message" in data
        
        print(f"✅ Immoweb scrape response: success={data['success']}, message={data['message']}")
    
    def test_scrape_zimmo_url(self, admin_session):
        """Test scraping a Zimmo URL"""
        test_url = "https://www.zimmo.be/nl/gent-9000/te-koop/huis/12345"
        
        response = requests.post(
            f"{BASE_URL}/api/properties/scrape?url={test_url}",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Scrape failed: {response.text}"
        data = response.json()
        
        assert "success" in data
        assert "data" in data
        print(f"✅ Zimmo scrape response: success={data['success']}, message={data['message']}")
    
    def test_scrape_as_realtor(self, realtor_session):
        """Test that realtors can also use the scrape endpoint"""
        test_url = "https://www.example-realtor.be/property/123"
        
        response = requests.post(
            f"{BASE_URL}/api/properties/scrape?url={test_url}",
            headers={"Authorization": f"Bearer {realtor_session}"}
        )
        
        assert response.status_code == 200, f"Realtor scrape failed: {response.text}"
        data = response.json()
        
        assert "success" in data
        assert "data" in data
        print(f"✅ Realtor can use scrape endpoint: {data['message']}")
    
    def test_scrape_invalid_url(self, admin_session):
        """Test scraping with invalid URL"""
        response = requests.post(
            f"{BASE_URL}/api/properties/scrape?url=not-a-valid-url",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        # Should return 200 with error message, not crash
        assert response.status_code == 200, f"Should handle invalid URL gracefully: {response.text}"
        data = response.json()
        assert "success" in data
        print(f"✅ Invalid URL handled gracefully: {data['message']}")


class TestWorkItemLabels:
    """Work Item Labels endpoint tests"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    @pytest.fixture
    def realtor_session(self):
        """Get realtor session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/tenant/login",
            json={"username": REALTOR_USERNAME, "password": REALTOR_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Realtor login failed: {response.text}")
        return response.json()["session_token"]
    
    def test_get_work_items(self, admin_session):
        """Test getting all work items"""
        response = requests.get(
            f"{BASE_URL}/api/work-items",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Get work items failed: {response.text}"
        work_items = response.json()
        
        assert isinstance(work_items, list)
        print(f"✅ Found {len(work_items)} work items")
        
        if len(work_items) > 0:
            # Check work item structure
            item = work_items[0]
            assert "id" in item
            assert "title" in item
            assert "unit" in item
            assert "price" in item
            print(f"   Sample work item: {item['title']} ({item['unit']}) - €{item['price']}")
        
        return work_items
    
    def test_create_work_item_for_label_test(self, admin_session):
        """Create a test work item for label testing"""
        response = requests.post(
            f"{BASE_URL}/api/work-items",
            headers={"Authorization": f"Bearer {admin_session}"},
            json={
                "title": "TEST_Label_Test_Item",
                "unit": "m²",
                "price": 25.0,
                "category": "Vloer"
            }
        )
        
        assert response.status_code in [200, 201], f"Create work item failed: {response.text}"
        work_item = response.json()
        
        assert "id" in work_item
        print(f"✅ Created test work item: {work_item['id']}")
        return work_item["id"]
    
    def test_update_work_item_label_vloer(self, admin_session):
        """Test updating work item with 'vloer' label"""
        # First get work items
        response = requests.get(
            f"{BASE_URL}/api/work-items",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        work_items = response.json()
        
        if len(work_items) == 0:
            pytest.skip("No work items to test with")
        
        work_item_id = work_items[0]["id"]
        
        # Update label
        response = requests.put(
            f"{BASE_URL}/api/work-items/{work_item_id}/label?component_label=vloer&room_types=all",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Update label failed: {response.text}"
        data = response.json()
        
        assert data.get("component_label") == "vloer"
        print(f"✅ Updated work item {work_item_id} with label 'vloer'")
    
    def test_update_work_item_label_muur(self, admin_session):
        """Test updating work item with 'muur' label"""
        response = requests.get(
            f"{BASE_URL}/api/work-items",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        work_items = response.json()
        
        if len(work_items) < 2:
            pytest.skip("Need at least 2 work items")
        
        work_item_id = work_items[1]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/work-items/{work_item_id}/label?component_label=muur&room_types=bathroom,kitchen",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Update label failed: {response.text}"
        data = response.json()
        
        assert data.get("component_label") == "muur"
        assert "bathroom" in data.get("room_types", [])
        print(f"✅ Updated work item {work_item_id} with label 'muur' for bathroom,kitchen")
    
    def test_update_work_item_label_plafond(self, admin_session):
        """Test updating work item with 'plafond' label"""
        response = requests.get(
            f"{BASE_URL}/api/work-items",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        work_items = response.json()
        
        if len(work_items) < 3:
            pytest.skip("Need at least 3 work items")
        
        work_item_id = work_items[2]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/work-items/{work_item_id}/label?component_label=plafond&room_types=all",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Update label failed: {response.text}"
        print(f"✅ Updated work item {work_item_id} with label 'plafond'")
    
    def test_update_work_item_invalid_label(self, admin_session):
        """Test that invalid labels are rejected"""
        response = requests.get(
            f"{BASE_URL}/api/work-items",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        work_items = response.json()
        
        if len(work_items) == 0:
            pytest.skip("No work items to test with")
        
        work_item_id = work_items[0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/work-items/{work_item_id}/label?component_label=invalid_label&room_types=all",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 400, f"Should reject invalid label: {response.text}"
        print("✅ Invalid label correctly rejected")
    
    def test_realtor_cannot_update_labels(self, realtor_session):
        """Test that realtors cannot update work item labels (admin only)"""
        response = requests.get(
            f"{BASE_URL}/api/work-items",
            headers={"Authorization": f"Bearer {realtor_session}"}
        )
        
        # Realtors might not have access to work items at all
        if response.status_code == 403:
            print("✅ Realtors correctly denied access to work items")
            return
        
        work_items = response.json()
        if len(work_items) == 0:
            pytest.skip("No work items to test with")
        
        work_item_id = work_items[0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/work-items/{work_item_id}/label?component_label=vloer&room_types=all",
            headers={"Authorization": f"Bearer {realtor_session}"}
        )
        
        assert response.status_code == 403, f"Realtor should not be able to update labels: {response.text}"
        print("✅ Realtor correctly denied label update access")
    
    def test_all_valid_labels(self, admin_session):
        """Test all valid component labels"""
        valid_labels = ["vloer", "muur", "plafond", "elektriciteit", "sanitair", "verwarming", "isolatie", "overig"]
        
        response = requests.get(
            f"{BASE_URL}/api/work-items",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        work_items = response.json()
        
        if len(work_items) == 0:
            pytest.skip("No work items to test with")
        
        work_item_id = work_items[0]["id"]
        
        for label in valid_labels:
            response = requests.put(
                f"{BASE_URL}/api/work-items/{work_item_id}/label?component_label={label}&room_types=all",
                headers={"Authorization": f"Bearer {admin_session}"}
            )
            assert response.status_code == 200, f"Label '{label}' should be valid: {response.text}"
        
        print(f"✅ All {len(valid_labels)} valid labels accepted")


class TestWorkItemsStats:
    """Test work items statistics for labels page"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    def test_work_items_have_label_field(self, admin_session):
        """Test that work items have component_label field"""
        response = requests.get(
            f"{BASE_URL}/api/work-items",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200
        work_items = response.json()
        
        with_label = 0
        without_label = 0
        
        for item in work_items:
            if item.get("component_label"):
                with_label += 1
            else:
                without_label += 1
        
        print(f"✅ Work items stats: {with_label} with label, {without_label} without label, {len(work_items)} total")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    def test_cleanup_test_work_items(self, admin_session):
        """Clean up test work items"""
        response = requests.get(
            f"{BASE_URL}/api/work-items",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        if response.status_code != 200:
            return
        
        work_items = response.json()
        deleted = 0
        
        for item in work_items:
            if item.get("title", "").startswith("TEST_"):
                del_response = requests.delete(
                    f"{BASE_URL}/api/work-items/{item['id']}",
                    headers={"Authorization": f"Bearer {admin_session}"}
                )
                if del_response.status_code in [200, 204]:
                    deleted += 1
        
        print(f"✅ Cleaned up {deleted} test work items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

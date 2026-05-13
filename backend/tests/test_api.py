"""
Backend API Tests for Max Q Interior Design Website
Tests: Projects API, Leads API, Status API, Image Upload
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://seo-blog-engine-4.preview.emergentagent.com').rstrip('/')


class TestHealthAndRoot:
    """Test basic API health and root endpoint"""
    
    def test_root_endpoint(self):
        """Test root API endpoint returns Hello World"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Hello World"


class TestProjectsAPI:
    """Test Projects CRUD operations"""
    
    def test_get_projects_list(self):
        """Test GET /api/projects returns list"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_project(self):
        """Test POST /api/projects creates a new project"""
        project_data = {
            "title": "TEST_Project_Badkamer_Renovatie",
            "category": "badkamer",
            "location": "Tessenderlo",
            "shortDescription": "Test badkamer renovatie project",
            "fullDescription": "Volledige beschrijving van het test project",
            "featured": False
        }
        response = requests.post(f"{BASE_URL}/api/projects", json=project_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["title"] == project_data["title"]
        assert data["category"] == project_data["category"]
        assert data["location"] == project_data["location"]
        
        # Store project ID for cleanup
        self.__class__.created_project_id = data["id"]
    
    def test_get_single_project(self):
        """Test GET /api/projects/{id} returns single project"""
        if not hasattr(self.__class__, 'created_project_id'):
            pytest.skip("No project created to test")
        
        project_id = self.__class__.created_project_id
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == project_id
        assert data["title"] == "TEST_Project_Badkamer_Renovatie"
    
    def test_update_project(self):
        """Test PUT /api/projects/{id} updates project"""
        if not hasattr(self.__class__, 'created_project_id'):
            pytest.skip("No project created to test")
        
        project_id = self.__class__.created_project_id
        update_data = {
            "title": "TEST_Updated_Project_Title",
            "featured": True
        }
        response = requests.put(f"{BASE_URL}/api/projects/{project_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == "TEST_Updated_Project_Title"
        assert data["featured"] == True
    
    def test_get_nonexistent_project(self):
        """Test GET /api/projects/{id} returns 404 for nonexistent project"""
        response = requests.get(f"{BASE_URL}/api/projects/nonexistent-id-12345")
        assert response.status_code == 404
    
    def test_delete_project(self):
        """Test DELETE /api/projects/{id} deletes project"""
        if not hasattr(self.__class__, 'created_project_id'):
            pytest.skip("No project created to test")
        
        project_id = self.__class__.created_project_id
        response = requests.delete(f"{BASE_URL}/api/projects/{project_id}")
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        assert get_response.status_code == 404


class TestLeadsAPI:
    """Test Leads/Aanvraag API"""
    
    def test_create_lead(self):
        """Test POST /api/leads creates a new lead"""
        lead_data = {
            "projectTypes": ["badkamer", "keuken"],
            "budget": "50k-100k",
            "timeline": "3-6months",
            "description": "Test lead voor badkamer en keuken renovatie",
            "firstName": "TEST_Jan",
            "lastName": "Janssen",
            "email": "test@example.com",
            "phone": "+32488123456",
            "street": "Teststraat 123",
            "city": "Tessenderlo",
            "postalCode": "3980"
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["firstName"] == "TEST_Jan"
        assert data["lastName"] == "Janssen"
        assert data["email"] == "test@example.com"
        assert "badkamer" in data["projectTypes"]
        
        # Store lead ID for cleanup
        self.__class__.created_lead_id = data["id"]
    
    def test_get_leads_list(self):
        """Test GET /api/leads returns list of leads"""
        response = requests.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_lead_invalid_email(self):
        """Test POST /api/leads with invalid email returns error"""
        lead_data = {
            "projectTypes": ["badkamer"],
            "budget": "50k-100k",
            "timeline": "3-6months",
            "description": "Test",
            "firstName": "Test",
            "lastName": "Test",
            "email": "invalid-email",  # Invalid email
            "phone": "+32488123456",
            "city": "Tessenderlo"
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 422  # Validation error
    
    def test_delete_lead(self):
        """Test DELETE /api/leads/{id} deletes lead"""
        if not hasattr(self.__class__, 'created_lead_id'):
            pytest.skip("No lead created to test")
        
        lead_id = self.__class__.created_lead_id
        response = requests.delete(f"{BASE_URL}/api/leads/{lead_id}")
        assert response.status_code == 200


class TestStatusAPI:
    """Test Status Check API"""
    
    def test_create_status_check(self):
        """Test POST /api/status creates status check"""
        status_data = {
            "client_name": "TEST_Client"
        }
        response = requests.post(f"{BASE_URL}/api/status", json=status_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["client_name"] == "TEST_Client"
        assert "timestamp" in data
    
    def test_get_status_checks(self):
        """Test GET /api/status returns list"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestSitemapAccess:
    """Test sitemap.xml accessibility"""
    
    def test_sitemap_accessible(self):
        """Test sitemap.xml is accessible"""
        response = requests.get(f"{BASE_URL}/sitemap.xml")
        # Sitemap should be served by frontend, check if accessible
        assert response.status_code in [200, 304]
        if response.status_code == 200:
            assert "xml" in response.headers.get("content-type", "").lower() or "urlset" in response.text


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Test suite for Max Q Before & After Photo Feature and Contact Form
Tests:
- Before/After images API (PUT /api/projects/{id}/images with beforeAfterImages)
- Projects API returns beforeAfterImages field
- Leads API (POST /api/leads for contact form)
- Bedankt page accessibility
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBeforeAfterFeature:
    """Tests for Before & After photo pairs feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_project_id = None
        yield
        # Cleanup: delete test project if created
        if self.test_project_id:
            try:
                requests.delete(f"{BASE_URL}/api/projects/{self.test_project_id}")
            except:
                pass
    
    def test_create_project_for_before_after(self):
        """Create a test project to use for before/after testing"""
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_BeforeAfter Project",
            "category": "badkamer",
            "location": "Tessenderlo",
            "shortDescription": "Test project for before/after feature",
            "fullDescription": "Full description for testing",
            "featured": False
        })
        assert response.status_code == 200, f"Failed to create project: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["title"] == "TEST_BeforeAfter Project"
        self.test_project_id = data["id"]
        print(f"Created test project: {self.test_project_id}")
        return data["id"]
    
    def test_update_project_with_before_after_images(self):
        """Test updating project with beforeAfterImages parameter"""
        # First create a project
        create_response = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_BeforeAfter Update",
            "category": "keuken",
            "location": "Ham",
            "shortDescription": "Test project for before/after update",
            "featured": False
        })
        assert create_response.status_code == 200
        project_id = create_response.json()["id"]
        self.test_project_id = project_id
        
        # Update with before/after images
        before_after_data = [
            {"before": "/api/images/test-before-1", "after": "/api/images/test-after-1"},
            {"before": "/api/images/test-before-2", "after": "/api/images/test-after-2"}
        ]
        
        params = {
            "mainImage": "/api/images/test-main",
            "galleryImages": json.dumps(["/api/images/gallery-1", "/api/images/gallery-2"]),
            "beforeAfterImages": json.dumps(before_after_data)
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/images",
            params=params
        )
        assert update_response.status_code == 200, f"Failed to update images: {update_response.text}"
        
        updated_data = update_response.json()
        assert "beforeAfterImages" in updated_data
        assert len(updated_data["beforeAfterImages"]) == 2
        assert updated_data["beforeAfterImages"][0]["before"] == "/api/images/test-before-1"
        assert updated_data["beforeAfterImages"][0]["after"] == "/api/images/test-after-1"
        print(f"Successfully updated project with beforeAfterImages: {updated_data['beforeAfterImages']}")
    
    def test_get_project_returns_before_after_images(self):
        """Test that GET /api/projects returns beforeAfterImages field"""
        # Create project with before/after images
        create_response = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_GetBeforeAfter",
            "category": "totaalproject",
            "location": "Hasselt",
            "shortDescription": "Test get before/after",
            "featured": False
        })
        assert create_response.status_code == 200
        project_id = create_response.json()["id"]
        self.test_project_id = project_id
        
        # Add before/after images
        before_after_data = [{"before": "/api/images/voor", "after": "/api/images/na"}]
        requests.put(
            f"{BASE_URL}/api/projects/{project_id}/images",
            params={"beforeAfterImages": json.dumps(before_after_data)}
        )
        
        # Get single project
        get_response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        assert get_response.status_code == 200
        project = get_response.json()
        assert "beforeAfterImages" in project
        assert len(project["beforeAfterImages"]) == 1
        print(f"GET single project returns beforeAfterImages: {project['beforeAfterImages']}")
        
        # Get all projects
        list_response = requests.get(f"{BASE_URL}/api/projects")
        assert list_response.status_code == 200
        projects = list_response.json()
        test_project = next((p for p in projects if p["id"] == project_id), None)
        assert test_project is not None
        assert "beforeAfterImages" in test_project
        print("GET all projects includes beforeAfterImages field")
    
    def test_project_model_has_before_after_images_field(self):
        """Verify Project model includes beforeAfterImages as empty list by default"""
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_DefaultBeforeAfter",
            "category": "maatkasten",
            "location": "Genk",
            "shortDescription": "Test default beforeAfterImages",
            "featured": False
        })
        assert response.status_code == 200
        data = response.json()
        self.test_project_id = data["id"]
        
        # New projects should have empty beforeAfterImages array
        assert "beforeAfterImages" in data
        assert isinstance(data["beforeAfterImages"], list)
        assert len(data["beforeAfterImages"]) == 0
        print("New project has empty beforeAfterImages array by default")


class TestContactFormAndLeads:
    """Tests for contact form submission to /api/leads"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_lead_id = None
        yield
        # Cleanup: delete test lead if created
        if self.test_lead_id:
            try:
                requests.delete(f"{BASE_URL}/api/leads/{self.test_lead_id}")
            except:
                pass
    
    def test_contact_form_creates_lead(self):
        """Test that contact form submission creates a lead"""
        lead_data = {
            "projectTypes": ["contact"],
            "budget": "onbekend",
            "timeline": "onbekend",
            "description": "Test onderwerp: Dit is een test bericht van het contactformulier",
            "firstName": "TEST_Contact",
            "lastName": "Formulier",
            "email": "test@example.com",
            "phone": "+32 123 456 789",
            "street": "",
            "city": "",
            "postalCode": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 200, f"Failed to create lead: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["firstName"] == "TEST_Contact"
        assert data["lastName"] == "Formulier"
        assert data["email"] == "test@example.com"
        assert "contact" in data["projectTypes"]
        self.test_lead_id = data["id"]
        print(f"Contact form created lead: {data['id']}")
    
    def test_leads_api_returns_all_leads(self):
        """Test GET /api/leads returns list of leads"""
        response = requests.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200
        leads = response.json()
        assert isinstance(leads, list)
        print(f"GET /api/leads returns {len(leads)} leads")
    
    def test_lead_delete(self):
        """Test DELETE /api/leads/{id}"""
        # Create a lead first
        lead_data = {
            "projectTypes": ["badkamer"],
            "budget": "25k-50k",
            "timeline": "1-3months",
            "description": "Test lead for deletion",
            "firstName": "TEST_Delete",
            "lastName": "Lead",
            "email": "delete@test.com",
            "phone": "+32 000 000 000",
            "street": "Test Street",
            "city": "Test City",
            "postalCode": "1234"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert create_response.status_code == 200
        lead_id = create_response.json()["id"]
        
        # Delete the lead
        delete_response = requests.delete(f"{BASE_URL}/api/leads/{lead_id}")
        assert delete_response.status_code == 200
        
        # Verify it's deleted (should not appear in list)
        list_response = requests.get(f"{BASE_URL}/api/leads")
        leads = list_response.json()
        assert not any(l["id"] == lead_id for l in leads)
        print(f"Lead {lead_id} successfully deleted")


class TestBedanktPage:
    """Tests for /bedankt thank you page"""
    
    def test_bedankt_page_accessible(self):
        """Test that /bedankt page is accessible"""
        response = requests.get(f"{BASE_URL}/bedankt", allow_redirects=True)
        # Frontend routes return 200 with React app
        assert response.status_code == 200
        print("/bedankt page is accessible")


class TestGoogleAdsTag:
    """Tests for Google Ads tag presence"""
    
    def test_google_ads_tag_in_html(self):
        """Verify Google Ads tag AW-951845364 is present"""
        response = requests.get(BASE_URL)
        assert response.status_code == 200
        assert "AW-951845364" in response.text
        print("Google Ads tag AW-951845364 found in HTML")


class TestProjectsAPI:
    """Additional tests for Projects API"""
    
    def test_get_all_projects(self):
        """Test GET /api/projects returns list"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        projects = response.json()
        assert isinstance(projects, list)
        print(f"GET /api/projects returns {len(projects)} projects")
        
        # Check that each project has expected fields
        for project in projects:
            assert "id" in project
            assert "title" in project
            assert "category" in project
            assert "location" in project
            assert "beforeAfterImages" in project
    
    def test_get_single_project(self):
        """Test GET /api/projects/{id}"""
        # First get list to find an existing project
        list_response = requests.get(f"{BASE_URL}/api/projects")
        projects = list_response.json()
        
        if len(projects) > 0:
            project_id = projects[0]["id"]
            response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
            assert response.status_code == 200
            project = response.json()
            assert project["id"] == project_id
            assert "beforeAfterImages" in project
            print(f"GET /api/projects/{project_id} returns project with beforeAfterImages")
        else:
            pytest.skip("No projects available to test")
    
    def test_get_nonexistent_project(self):
        """Test GET /api/projects/{id} with invalid ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/projects/nonexistent-id-12345")
        assert response.status_code == 404
        print("GET nonexistent project returns 404")


# Cleanup function to remove test data
def cleanup_test_projects():
    """Remove all TEST_ prefixed projects"""
    try:
        response = requests.get(f"{BASE_URL}/api/projects")
        if response.status_code == 200:
            projects = response.json()
            for project in projects:
                if project.get("title", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/projects/{project['id']}")
                    print(f"Cleaned up test project: {project['id']}")
    except Exception as e:
        print(f"Cleanup error: {e}")


def cleanup_test_leads():
    """Remove all TEST_ prefixed leads"""
    try:
        response = requests.get(f"{BASE_URL}/api/leads")
        if response.status_code == 200:
            leads = response.json()
            for lead in leads:
                if lead.get("firstName", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/leads/{lead['id']}")
                    print(f"Cleaned up test lead: {lead['id']}")
    except Exception as e:
        print(f"Cleanup error: {e}")


@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    """Cleanup test data after all tests"""
    yield
    cleanup_test_projects()
    cleanup_test_leads()

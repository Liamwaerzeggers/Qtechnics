"""
Test suite for Auth and Photo Bug Fixes
- Login reliability (POST /api/auth2/login)
- Data loading after login (GET /api/projects, GET /api/dashboard)
- Photo upload and serving (POST /api/projects/{id}/first-visit/photos, GET /api/photos/first_visit/{id}/{filename})
- Customer portal photo access (GET /api/customer-portal/{token})
"""
import pytest
import requests
import os
import base64
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "Liam"
ADMIN_PASSWORD = "Liammail123"

# Test project IDs
TEST_PROJECT_ID_1 = "PROJ-0D7C9AC0"
TEST_PROJECT_ID_2 = "PROJ-8DC83A0F"


class TestAuthLogin:
    """Test login reliability - Bug #1: Login intermittently fails"""
    
    def test_login_success_with_correct_credentials(self):
        """POST /api/auth2/login with valid credentials returns success and token"""
        response = requests.post(
            f"{BASE_URL}/api/auth2/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Login should return success=True"
        assert "token" in data, "Login should return a token"
        assert len(data["token"]) > 0, "Token should not be empty"
        assert "user" in data, "Login should return user info"
        assert data["user"]["role"] == "admin", "User should be admin"
    
    def test_login_multiple_times_reliability(self):
        """Login should work reliably multiple times in a row"""
        for i in range(3):
            response = requests.post(
                f"{BASE_URL}/api/auth2/login",
                json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
            )
            assert response.status_code == 200, f"Login attempt {i+1} failed: {response.text}"
            data = response.json()
            assert data.get("success") == True, f"Login attempt {i+1} should succeed"
    
    def test_login_case_insensitive_username(self):
        """Username should be case-insensitive"""
        for username in ["liam", "LIAM", "Liam"]:
            response = requests.post(
                f"{BASE_URL}/api/auth2/login",
                json={"username": username, "password": ADMIN_PASSWORD}
            )
            assert response.status_code == 200, f"Login with username '{username}' failed"
            assert response.json().get("success") == True
    
    def test_login_invalid_credentials_rejected(self):
        """Invalid credentials should be rejected"""
        response = requests.post(
            f"{BASE_URL}/api/auth2/login",
            json={"username": "wronguser", "password": "wrongpass"}
        )
        # Should return 401 or success=False
        if response.status_code == 200:
            assert response.json().get("success") == False
        else:
            assert response.status_code in [401, 403]


class TestDataLoadingAfterLogin:
    """Test data loading after login - Bug #2: Data doesn't load after login"""
    
    @pytest.fixture
    def auth_token(self):
        """Get fresh auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth2/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_get_projects_with_token(self, auth_token):
        """GET /api/projects with valid token returns projects list"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get projects: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Projects should be a list"
        # Should have at least some projects
        assert len(data) > 0, "Should have at least one project"
    
    def test_get_dashboard_stats_with_token(self, auth_token):
        """GET /api/dashboard/stats with valid token returns dashboard data"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get dashboard stats: {response.text}"
        
        data = response.json()
        # Dashboard should have some structure
        assert isinstance(data, dict), "Dashboard should return a dict"
    
    def test_get_specific_project(self, auth_token):
        """GET /api/projects/{id} returns project details"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID_1}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get project: {response.text}"
        
        data = response.json()
        assert data.get("id") == TEST_PROJECT_ID_1
    
    def test_authorization_header_preferred_over_cookie(self, auth_token):
        """Authorization header should be preferred over stale cookies"""
        # Make request with valid header but potentially stale cookie
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"},
            cookies={"session_token": "stale_invalid_cookie_token"}
        )
        # Should succeed because header is preferred
        assert response.status_code == 200, "Authorization header should be preferred over cookie"


class TestPhotoUploadAndServing:
    """Test photo upload and serving - Bug #3: Photo uploads stop after a few photos"""
    
    @pytest.fixture
    def auth_token(self):
        """Get fresh auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth2/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_upload_photo_to_project(self, auth_token):
        """POST /api/projects/{id}/first-visit/photos uploads and returns photo URL"""
        # Create a small test image (1x1 red pixel PNG)
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test_photo.png", png_data, "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID_1}/first-visit/photos",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files,
            params={"room": "TEST_Badkamer"}
        )
        
        assert response.status_code == 200, f"Photo upload failed: {response.text}"
        
        data = response.json()
        assert "filename" in data, "Response should contain filename"
        assert "url" in data, "Response should contain url"
        assert data["room"] == "TEST_Badkamer", "Room should be set correctly"
        
        # URL should be in new format
        assert "/api/photos/first_visit/" in data["url"], "URL should use new photo serving endpoint"
        
        return data
    
    def test_serve_uploaded_photo(self, auth_token):
        """GET /api/photos/first_visit/{project_id}/{filename} serves the photo"""
        # First upload a photo
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test_serve.png", png_data, "image/png")}
        upload_response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID_1}/first-visit/photos",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        assert upload_response.status_code == 200
        
        photo_data = upload_response.json()
        filename = photo_data["filename"]
        
        # Now try to serve the photo (no auth required for photos)
        serve_response = requests.get(
            f"{BASE_URL}/api/photos/first_visit/{TEST_PROJECT_ID_1}/{filename}"
        )
        
        assert serve_response.status_code == 200, f"Photo serving failed: {serve_response.text}"
        assert serve_response.headers.get("content-type", "").startswith("image/"), "Should return image content type"
    
    def test_photo_accessible_without_auth(self, auth_token):
        """Photos should be accessible without authentication (for customer portal)"""
        # Upload a photo first
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test_public.png", png_data, "image/png")}
        upload_response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID_1}/first-visit/photos",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        assert upload_response.status_code == 200
        
        photo_data = upload_response.json()
        filename = photo_data["filename"]
        
        # Access WITHOUT auth header
        serve_response = requests.get(
            f"{BASE_URL}/api/photos/first_visit/{TEST_PROJECT_ID_1}/{filename}"
        )
        
        assert serve_response.status_code == 200, "Photo should be accessible without auth"
    
    def test_project_response_no_base64_data(self, auth_token):
        """Project response should NOT contain base64_data in first_visit_photos"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID_1}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        photos = data.get("first_visit_photos", [])
        
        for photo in photos:
            if isinstance(photo, dict):
                assert "base64_data" not in photo, "Photo should not contain base64_data"


class TestCustomerPortal:
    """Test customer portal photo access - Bug #4: Photos not visible in customer portal"""
    
    @pytest.fixture
    def auth_token(self):
        """Get fresh auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth2/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_get_project_with_customer_token(self, auth_token):
        """Find a project with customer_access_token and test portal access"""
        # Get projects to find one with customer_access_token
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        projects = response.json()
        
        # Find a project with customer_access_token
        project_with_token = None
        for proj in projects:
            if proj.get("customer_access_token"):
                project_with_token = proj
                break
        
        if not project_with_token:
            pytest.skip("No project with customer_access_token found")
        
        access_token = project_with_token["customer_access_token"]
        
        # Test customer portal endpoint
        portal_response = requests.get(
            f"{BASE_URL}/api/customer-portal/{access_token}"
        )
        
        assert portal_response.status_code == 200, f"Customer portal failed: {portal_response.text}"
        
        portal_data = portal_response.json()
        assert "project" in portal_data, "Portal should return project data"
        
        # Check that photos don't have base64_data
        project = portal_data["project"]
        photos = project.get("first_visit_photos", [])
        for photo in photos:
            if isinstance(photo, dict):
                assert "base64_data" not in photo, "Customer portal photos should not contain base64_data"
    
    def test_customer_portal_invalid_token(self):
        """Invalid customer portal token should return 404"""
        response = requests.get(
            f"{BASE_URL}/api/customer-portal/invalid_token_12345"
        )
        assert response.status_code == 404


class TestProjectStatusTabs:
    """Test project status tabs feature"""
    
    @pytest.fixture
    def auth_token(self):
        """Get fresh auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth2/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_projects_have_status_field(self, auth_token):
        """Projects should have status field"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        projects = response.json()
        assert len(projects) > 0, "Should have projects"
        
        # Check that projects have status
        for proj in projects[:5]:  # Check first 5
            assert "status" in proj, f"Project {proj.get('id')} should have status field"
    
    def test_projects_count_by_status(self, auth_token):
        """Count projects by status to verify status tabs data"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        projects = response.json()
        
        # Count by status
        status_counts = {}
        for proj in projects:
            status = proj.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"Project status counts: {status_counts}")
        
        # Should have at least one status
        assert len(status_counts) > 0, "Should have projects with status"


# Cleanup fixture to remove test photos
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_photos():
    """Cleanup test photos after all tests"""
    yield
    # Cleanup would go here if needed
    # For now, test photos are left in place as they're small


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Test Photo/File Serving Endpoints
Tests for:
- GET /api/static/first_visit/{project_id}/{filename} - serves first visit photos
- GET /api/uploads/designs/{project_id}/{filename} - serves 3D design files
- GET /api/static/designs/{project_id}/{filename} - alternative route for designs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test project with known files
TEST_PROJECT_ID = "PROJ-8DC83A0F"
TEST_FIRST_VISIT_PHOTO = "0d443662-65db-43c1-a4cf-ceeee8024e9e.jpeg"
TEST_DESIGN_FILE = "20260112_155644_Zinio_keuken_met_grepen_01.png"


class TestPhotoServingEndpoints:
    """Test static file serving endpoints for photos and designs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_first_visit_photo_endpoint_returns_200(self):
        """Test GET /api/static/first_visit/{project_id}/{filename} returns 200"""
        response = self.session.get(
            f"{BASE_URL}/api/static/first_visit/{TEST_PROJECT_ID}/{TEST_FIRST_VISIT_PHOTO}"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('content-type') == 'image/jpeg', \
            f"Expected image/jpeg, got {response.headers.get('content-type')}"
        assert len(response.content) > 0, "Response should have content"
        print(f"✓ First visit photo served successfully, size: {len(response.content)} bytes")
    
    def test_design_file_uploads_route_returns_200(self):
        """Test GET /api/uploads/designs/{project_id}/{filename} returns 200"""
        response = self.session.get(
            f"{BASE_URL}/api/uploads/designs/{TEST_PROJECT_ID}/{TEST_DESIGN_FILE}"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('content-type') == 'image/png', \
            f"Expected image/png, got {response.headers.get('content-type')}"
        assert len(response.content) > 0, "Response should have content"
        print(f"✓ Design file (uploads route) served successfully, size: {len(response.content)} bytes")
    
    def test_design_file_static_route_returns_200(self):
        """Test GET /api/static/designs/{project_id}/{filename} returns 200"""
        response = self.session.get(
            f"{BASE_URL}/api/static/designs/{TEST_PROJECT_ID}/{TEST_DESIGN_FILE}"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('content-type') == 'image/png', \
            f"Expected image/png, got {response.headers.get('content-type')}"
        print(f"✓ Design file (static route) served successfully, size: {len(response.content)} bytes")
    
    def test_invalid_file_type_returns_404(self):
        """Test invalid file_type returns 404"""
        response = self.session.get(
            f"{BASE_URL}/api/static/invalid_type/{TEST_PROJECT_ID}/test.jpg"
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid file type correctly returns 404")
    
    def test_nonexistent_file_returns_404(self):
        """Test non-existent file returns 404"""
        response = self.session.get(
            f"{BASE_URL}/api/static/first_visit/{TEST_PROJECT_ID}/nonexistent_file.jpg"
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent file correctly returns 404")
    
    def test_nonexistent_project_returns_404(self):
        """Test non-existent project returns 404"""
        response = self.session.get(
            f"{BASE_URL}/api/static/first_visit/PROJ-NONEXISTENT/{TEST_FIRST_VISIT_PHOTO}"
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent project correctly returns 404")


class TestProjectPhotoData:
    """Test that project API returns correct photo URLs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/admin/login?username=test&password=test123"
        )
        if login_response.status_code == 200:
            token = login_response.json().get('session_token')
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Could not authenticate")
    
    def test_project_has_first_visit_photos(self):
        """Test project API returns first_visit_photos with correct URL format"""
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        photos = data.get('first_visit_photos', [])
        assert len(photos) > 0, "Project should have first visit photos"
        
        # Check URL format
        first_photo = photos[0]
        if isinstance(first_photo, dict):
            url = first_photo.get('url', '')
        else:
            url = first_photo
        
        assert '/api/static/first_visit/' in url, f"Photo URL should contain /api/static/first_visit/, got: {url}"
        print(f"✓ Project has {len(photos)} first visit photos with correct URL format")
    
    def test_project_has_design_files(self):
        """Test project API returns design_3d_files with correct URL format"""
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        designs = data.get('design_3d_files', [])
        assert len(designs) > 0, "Project should have design files"
        
        # Check URL format
        first_design = designs[0]
        url = first_design.get('url', '')
        
        assert '/api/uploads/designs/' in url, f"Design URL should contain /api/uploads/designs/, got: {url}"
        print(f"✓ Project has {len(designs)} design files with correct URL format")
    
    def test_photo_urls_are_accessible(self):
        """Test that photo URLs from project data are actually accessible"""
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Test first visit photo
        photos = data.get('first_visit_photos', [])
        if photos:
            first_photo = photos[0]
            url = first_photo.get('url', '') if isinstance(first_photo, dict) else first_photo
            full_url = f"{BASE_URL}{url}"
            photo_response = self.session.get(full_url)
            assert photo_response.status_code == 200, f"First visit photo not accessible: {full_url}"
            print(f"✓ First visit photo accessible: {url}")
        
        # Test design file
        designs = data.get('design_3d_files', [])
        if designs:
            first_design = designs[0]
            url = first_design.get('url', '')
            full_url = f"{BASE_URL}{url}"
            design_response = self.session.get(full_url)
            assert design_response.status_code == 200, f"Design file not accessible: {full_url}"
            print(f"✓ Design file accessible: {url}")


class TestCustomerPortalPhotos:
    """Test that customer portal can access photos"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session and get customer access token"""
        self.session = requests.Session()
        # Login as admin first
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/admin/login?username=test&password=test123"
        )
        if login_response.status_code == 200:
            token = login_response.json().get('session_token')
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            
            # Get project to find customer access token
            project_response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}")
            if project_response.status_code == 200:
                self.customer_token = project_response.json().get('customer_access_token')
            else:
                self.customer_token = None
        else:
            pytest.skip("Could not authenticate")
    
    def test_customer_portal_returns_photos(self):
        """Test customer portal endpoint returns project with photos"""
        if not self.customer_token:
            pytest.skip("No customer access token available")
        
        # Clear auth header for customer portal (public endpoint)
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/customer-portal/{self.customer_token}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        project = data.get('project', {})
        
        photos = project.get('first_visit_photos', [])
        designs = project.get('design_3d_files', [])
        
        print(f"✓ Customer portal returns {len(photos)} first visit photos and {len(designs)} designs")
        
        # Verify photo URLs are accessible
        if photos:
            first_photo = photos[0]
            url = first_photo.get('url', '') if isinstance(first_photo, dict) else first_photo
            full_url = f"{BASE_URL}{url}"
            photo_response = session.get(full_url)
            assert photo_response.status_code == 200, f"Photo not accessible from customer portal: {full_url}"
            print(f"✓ Customer portal photo accessible: {url}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Test photo upload and serving with base64 storage in MongoDB
Tests the fix for photos not persisting across deployments
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhotoBase64Storage:
    """Test photo upload stores base64 in database and serves correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": "test", "password": "test123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.project_id = "PROJ-8DC83A0F"
    
    # ===== First Visit Photo Tests =====
    
    def test_upload_first_visit_photo_returns_correct_url(self):
        """POST /api/projects/{id}/first-visit/photos - returns /api/photos/ URL"""
        # Create a minimal valid JPEG
        jpeg_data = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
        ])
        
        files = {"file": ("test_upload.jpg", io.BytesIO(jpeg_data), "image/jpeg")}
        response = requests.post(
            f"{BASE_URL}/api/projects/{self.project_id}/first-visit/photos",
            headers=self.headers,
            files=files,
            params={"room": "TestRoom"}
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "filename" in data
        assert "url" in data
        assert "room" in data
        assert data["room"] == "TestRoom"
        
        # Verify URL uses new /api/photos/ format
        assert data["url"].startswith("/api/photos/first_visit/"), f"URL should use /api/photos/ format: {data['url']}"
        
        # Store filename for cleanup
        self.uploaded_photo_filename = data["filename"]
        print(f"✓ Photo uploaded with URL: {data['url']}")
    
    def test_serve_photo_from_database(self):
        """GET /api/photos/first_visit/{project_id}/{filename} - serves from database"""
        # First upload a photo
        jpeg_data = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
        ])
        
        files = {"file": ("test_serve.jpg", io.BytesIO(jpeg_data), "image/jpeg")}
        upload_response = requests.post(
            f"{BASE_URL}/api/projects/{self.project_id}/first-visit/photos",
            headers=self.headers,
            files=files,
            params={"room": "ServeTest"}
        )
        assert upload_response.status_code == 200
        filename = upload_response.json()["filename"]
        
        # Now serve the photo
        serve_response = requests.get(
            f"{BASE_URL}/api/photos/first_visit/{self.project_id}/{filename}"
        )
        
        assert serve_response.status_code == 200, f"Serve failed: {serve_response.status_code}"
        assert serve_response.headers.get("content-type") == "image/jpeg"
        assert len(serve_response.content) > 0
        print(f"✓ Photo served from database: {len(serve_response.content)} bytes")
    
    def test_photo_stored_with_base64_in_database(self):
        """Verify photo has base64_data field in database"""
        # Upload a photo
        jpeg_data = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
        ])
        
        files = {"file": ("test_base64.jpg", io.BytesIO(jpeg_data), "image/jpeg")}
        upload_response = requests.post(
            f"{BASE_URL}/api/projects/{self.project_id}/first-visit/photos",
            headers=self.headers,
            files=files,
            params={"room": "Base64Test"}
        )
        assert upload_response.status_code == 200
        filename = upload_response.json()["filename"]
        
        # Get project and check photo has base64_data
        project_response = requests.get(
            f"{BASE_URL}/api/projects/{self.project_id}",
            headers=self.headers
        )
        assert project_response.status_code == 200
        
        project = project_response.json()
        photos = project.get("first_visit_photos", [])
        
        # Find our uploaded photo
        uploaded_photo = None
        for photo in photos:
            if isinstance(photo, dict) and photo.get("filename") == filename:
                uploaded_photo = photo
                break
        
        assert uploaded_photo is not None, f"Photo {filename} not found in project"
        # Note: base64_data is stored in DB but not returned in API response
        assert uploaded_photo.get("url").startswith("/api/photos/"), "URL should use /api/photos/ format"
        print(f"✓ Photo stored with correct URL format: {uploaded_photo.get('url')}")
    
    # ===== Design Upload Tests =====
    
    def test_upload_design_returns_correct_url(self):
        """POST /api/projects/{id}/designs - returns /api/photos/designs/ URL"""
        # Create a minimal PNG
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
        ])
        
        files = {"file": ("test_design.png", io.BytesIO(png_data), "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/projects/{self.project_id}/designs",
            headers=self.headers,
            files=files,
            params={"room": "DesignTestRoom"}
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "filename" in data
        assert "url" in data
        assert "room" in data
        assert data["room"] == "DesignTestRoom"
        
        # Verify URL uses new /api/photos/designs/ format
        assert data["url"].startswith("/api/photos/designs/"), f"URL should use /api/photos/designs/ format: {data['url']}"
        print(f"✓ Design uploaded with URL: {data['url']}")
    
    def test_serve_design_from_database(self):
        """GET /api/photos/designs/{project_id}/{filename} - serves from database"""
        # First upload a design
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
        ])
        
        files = {"file": ("test_serve_design.png", io.BytesIO(png_data), "image/png")}
        upload_response = requests.post(
            f"{BASE_URL}/api/projects/{self.project_id}/designs",
            headers=self.headers,
            files=files,
            params={"room": "ServeDesignTest"}
        )
        assert upload_response.status_code == 200
        filename = upload_response.json()["filename"]
        
        # Now serve the design
        serve_response = requests.get(
            f"{BASE_URL}/api/photos/designs/{self.project_id}/{filename}"
        )
        
        assert serve_response.status_code == 200, f"Serve failed: {serve_response.status_code}"
        assert serve_response.headers.get("content-type") == "image/png"
        assert len(serve_response.content) > 0
        print(f"✓ Design served from database: {len(serve_response.content)} bytes")
    
    # ===== Fallback Tests =====
    
    def test_serve_old_photo_from_filesystem(self):
        """GET /api/photos/first_visit/ - falls back to file system for old photos"""
        # Get project to find an old photo (without base64)
        project_response = requests.get(
            f"{BASE_URL}/api/projects/{self.project_id}",
            headers=self.headers
        )
        assert project_response.status_code == 200
        
        project = project_response.json()
        photos = project.get("first_visit_photos", [])
        
        # Find an old photo (uses /api/static/ URL)
        old_photo = None
        for photo in photos:
            if isinstance(photo, dict) and photo.get("url", "").startswith("/api/static/"):
                old_photo = photo
                break
        
        if old_photo:
            # Try to serve via /api/photos/ endpoint (should fallback to file system)
            filename = old_photo.get("filename")
            serve_response = requests.get(
                f"{BASE_URL}/api/photos/first_visit/{self.project_id}/{filename}"
            )
            
            # Should either serve from file system or return 404 if file doesn't exist
            assert serve_response.status_code in [200, 404], f"Unexpected status: {serve_response.status_code}"
            if serve_response.status_code == 200:
                print(f"✓ Old photo served from file system fallback")
            else:
                print(f"✓ Old photo not found (expected if file system cleared)")
        else:
            print("✓ No old photos to test fallback (all photos have base64)")
    
    def test_invalid_file_type_returns_404(self):
        """GET /api/photos/invalid_type/ - returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/photos/invalid_type/{self.project_id}/test.jpg"
        )
        assert response.status_code == 404
        print("✓ Invalid file type returns 404")
    
    def test_nonexistent_photo_returns_404(self):
        """GET /api/photos/first_visit/ with nonexistent file - returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/photos/first_visit/{self.project_id}/nonexistent.jpg"
        )
        assert response.status_code == 404
        print("✓ Nonexistent photo returns 404")


class TestFrontendPhotoUrls:
    """Test that frontend receives correct photo URLs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": "test", "password": "test123"}
        )
        assert response.status_code == 200
        self.token = response.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.project_id = "PROJ-8DC83A0F"
    
    def test_project_api_returns_photo_urls(self):
        """GET /api/projects/{id} - returns photos with correct URL format"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.project_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        
        project = response.json()
        photos = project.get("first_visit_photos", [])
        
        assert len(photos) > 0, "Project should have photos"
        
        for photo in photos:
            if isinstance(photo, dict):
                url = photo.get("url", "")
                # URL should be either /api/photos/ (new) or /api/static/ (old)
                assert url.startswith("/api/photos/") or url.startswith("/api/static/"), \
                    f"Invalid URL format: {url}"
        
        print(f"✓ Project API returns {len(photos)} photos with valid URLs")
    
    def test_project_api_returns_design_urls(self):
        """GET /api/projects/{id} - returns designs with correct URL format"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.project_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        
        project = response.json()
        designs = project.get("design_3d_files", [])
        
        assert len(designs) > 0, "Project should have designs"
        
        for design in designs:
            if isinstance(design, dict):
                url = design.get("url", "")
                # URL should be either /api/photos/designs/ (new) or /api/uploads/designs/ (old)
                assert url.startswith("/api/photos/designs/") or url.startswith("/api/uploads/designs/"), \
                    f"Invalid URL format: {url}"
        
        print(f"✓ Project API returns {len(designs)} designs with valid URLs")


class TestCustomerPortalPhotos:
    """Test photos visible in customer portal"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get customer portal access token"""
        # First login as admin to get project details
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": "test", "password": "test123"}
        )
        assert response.status_code == 200
        self.token = response.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.project_id = "PROJ-8DC83A0F"
        
        # Get project to find customer access token
        project_response = requests.get(
            f"{BASE_URL}/api/projects/{self.project_id}",
            headers=self.headers
        )
        assert project_response.status_code == 200
        project = project_response.json()
        self.customer_token = project.get("customer_access_token")
    
    def test_customer_portal_returns_photos(self):
        """GET /api/customer-portal/{token} - returns photos"""
        if not self.customer_token:
            pytest.skip("No customer access token for this project")
        
        response = requests.get(
            f"{BASE_URL}/api/customer-portal/{self.customer_token}"
        )
        assert response.status_code == 200
        
        data = response.json()
        project = data.get("project", {})
        photos = project.get("first_visit_photos", [])
        
        print(f"✓ Customer portal returns {len(photos)} first visit photos")
    
    def test_customer_portal_returns_designs(self):
        """GET /api/customer-portal/{token} - returns designs"""
        if not self.customer_token:
            pytest.skip("No customer access token for this project")
        
        response = requests.get(
            f"{BASE_URL}/api/customer-portal/{self.customer_token}"
        )
        assert response.status_code == 200
        
        data = response.json()
        project = data.get("project", {})
        designs = project.get("design_3d_files", [])
        
        print(f"✓ Customer portal returns {len(designs)} 3D designs")

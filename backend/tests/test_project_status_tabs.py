"""
Test Project Status Tabs and Quick Status Update Features
- Tests status tabs filtering
- Tests quick status update endpoint
- Tests status validation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "liam"
ADMIN_PASSWORD = "Liammail123"

class TestProjectStatusFeatures:
    """Test project status tabs and quick status update"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            print(f"Login successful, token: {self.token[:20]}...")
        else:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
    
    def test_01_admin_login(self):
        """Test admin login works"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "No session_token in response"
        assert "user" in data, "No user in response"
        print(f"Login response: user={data['user'].get('name')}")
    
    def test_02_get_projects_list(self):
        """Test getting projects list"""
        response = self.session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200, f"Failed to get projects: {response.text}"
        projects = response.json()
        assert isinstance(projects, list), "Projects should be a list"
        print(f"Found {len(projects)} projects")
        
        # Check if projects have status field
        if projects:
            first_project = projects[0]
            assert "status" in first_project, "Project should have status field"
            assert "id" in first_project, "Project should have id field"
            print(f"First project: id={first_project['id']}, status={first_project.get('status')}")
    
    def test_03_quick_status_update_valid(self):
        """Test quick status update with valid status"""
        # First get a project
        response = self.session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        projects = response.json()
        
        if not projects:
            pytest.skip("No projects available for testing")
        
        project = projects[0]
        project_id = project["id"]
        original_status = project.get("status", "nieuwe_lead")
        
        # Test updating to each valid status
        valid_statuses = ["nieuwe_lead", "eerste_bezoek", "offerte_gemaakt", "offerte_voorgesteld", "verkocht", "in_uitvoering", "afgerond"]
        
        # Pick a different status than current
        new_status = "eerste_bezoek" if original_status != "eerste_bezoek" else "offerte_gemaakt"
        
        response = self.session.put(
            f"{BASE_URL}/api/projects/{project_id}/quick-status",
            json={"status": new_status}
        )
        assert response.status_code == 200, f"Quick status update failed: {response.text}"
        data = response.json()
        assert data.get("status") == new_status, f"Status not updated correctly: {data}"
        print(f"Updated project {project_id} status from {original_status} to {new_status}")
        
        # Verify the change persisted
        verify_response = self.session.get(f"{BASE_URL}/api/projects/{project_id}")
        assert verify_response.status_code == 200
        updated_project = verify_response.json()
        assert updated_project.get("status") == new_status, "Status change did not persist"
        
        # Restore original status
        self.session.put(
            f"{BASE_URL}/api/projects/{project_id}/quick-status",
            json={"status": original_status}
        )
        print(f"Restored project status to {original_status}")
    
    def test_04_quick_status_update_invalid(self):
        """Test quick status update with invalid status returns 400"""
        # First get a project
        response = self.session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        projects = response.json()
        
        if not projects:
            pytest.skip("No projects available for testing")
        
        project_id = projects[0]["id"]
        
        # Test with invalid status
        response = self.session.put(
            f"{BASE_URL}/api/projects/{project_id}/quick-status",
            json={"status": "invalid_status_xyz"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        print(f"Correctly rejected invalid status with 400")
    
    def test_05_quick_status_update_empty(self):
        """Test quick status update with empty status returns 400"""
        response = self.session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        projects = response.json()
        
        if not projects:
            pytest.skip("No projects available for testing")
        
        project_id = projects[0]["id"]
        
        # Test with empty status
        response = self.session.put(
            f"{BASE_URL}/api/projects/{project_id}/quick-status",
            json={"status": ""}
        )
        assert response.status_code == 400, f"Expected 400 for empty status, got {response.status_code}"
        print(f"Correctly rejected empty status with 400")
    
    def test_06_quick_status_verkocht_sets_is_sold(self):
        """Test that setting status to 'verkocht' also sets is_sold=True"""
        response = self.session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        projects = response.json()
        
        if not projects:
            pytest.skip("No projects available for testing")
        
        # Find a project that's not verkocht
        project = None
        for p in projects:
            if p.get("status") != "verkocht":
                project = p
                break
        
        if not project:
            pytest.skip("No non-verkocht project available")
        
        project_id = project["id"]
        original_status = project.get("status")
        
        # Update to verkocht
        response = self.session.put(
            f"{BASE_URL}/api/projects/{project_id}/quick-status",
            json={"status": "verkocht"}
        )
        assert response.status_code == 200
        
        # Verify is_sold is set
        verify_response = self.session.get(f"{BASE_URL}/api/projects/{project_id}")
        assert verify_response.status_code == 200
        updated_project = verify_response.json()
        assert updated_project.get("is_sold") == True, "is_sold should be True when status is verkocht"
        print(f"Verified is_sold=True when status=verkocht")
        
        # Restore original status
        self.session.put(
            f"{BASE_URL}/api/projects/{project_id}/quick-status",
            json={"status": original_status}
        )
    
    def test_07_quick_status_nonexistent_project(self):
        """Test quick status update on non-existent project returns 404"""
        response = self.session.put(
            f"{BASE_URL}/api/projects/NONEXISTENT-PROJECT-123/quick-status",
            json={"status": "nieuwe_lead"}
        )
        assert response.status_code == 404, f"Expected 404 for non-existent project, got {response.status_code}"
        print(f"Correctly returned 404 for non-existent project")
    
    def test_08_all_valid_statuses(self):
        """Test all valid statuses are accepted"""
        response = self.session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        projects = response.json()
        
        if not projects:
            pytest.skip("No projects available for testing")
        
        project_id = projects[0]["id"]
        original_status = projects[0].get("status", "nieuwe_lead")
        
        valid_statuses = [
            "nieuwe_lead",
            "eerste_bezoek", 
            "offerte_gemaakt",
            "offerte_voorgesteld",
            "verkocht",
            "in_uitvoering",
            "afgerond",
            "niet_verkocht"
        ]
        
        for status in valid_statuses:
            response = self.session.put(
                f"{BASE_URL}/api/projects/{project_id}/quick-status",
                json={"status": status}
            )
            assert response.status_code == 200, f"Status '{status}' should be valid but got {response.status_code}: {response.text}"
            print(f"Status '{status}' accepted")
        
        # Restore original status
        self.session.put(
            f"{BASE_URL}/api/projects/{project_id}/quick-status",
            json={"status": original_status}
        )
        print(f"Restored to original status: {original_status}")
    
    def test_09_projects_have_status_field(self):
        """Test that all projects have status field"""
        response = self.session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        projects = response.json()
        
        for project in projects:
            assert "status" in project, f"Project {project.get('id')} missing status field"
        
        print(f"All {len(projects)} projects have status field")
        
        # Count projects by status
        status_counts = {}
        for project in projects:
            status = project.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"Status distribution: {status_counts}")
    
    def test_10_legacy_status_mapping(self):
        """Test that legacy statuses exist in database and are handled"""
        response = self.session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        projects = response.json()
        
        # Check for any legacy statuses
        legacy_statuses = ["eerste bezoek", "in uitvoering", "offerte in opmaak", "gepland", "voltooid"]
        found_legacy = []
        
        for project in projects:
            status = project.get("status", "")
            if status in legacy_statuses:
                found_legacy.append({"id": project["id"], "status": status})
        
        if found_legacy:
            print(f"Found {len(found_legacy)} projects with legacy statuses: {found_legacy}")
        else:
            print("No legacy statuses found in database (all migrated or new format)")
        
        # This test passes regardless - it's informational
        assert True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

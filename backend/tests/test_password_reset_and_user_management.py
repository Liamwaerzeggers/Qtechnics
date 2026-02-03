"""
Test Password Reset and User Management Features
- Password reset for admins (POST /api/admins/{admin_id}/reset-password)
- Password reset for workers (POST /api/workers/{worker_id}/reset-password)
- Delete admin functionality
- Delete worker functionality
- Add new admin functionality
- Add new worker functionality
- Toggle worker active/inactive status
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUserManagement:
    """Test admin and worker CRUD operations and password reset"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin and get session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": "test", "password": "test123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Admin login failed - cannot proceed with tests")
        
        # Extract session token from cookies
        self.session_token = login_response.cookies.get('session_token')
        if self.session_token:
            self.session.cookies.set('session_token', self.session_token)
        
        yield
        
        # Cleanup: Delete test-created users
        self._cleanup_test_users()
    
    def _cleanup_test_users(self):
        """Delete all TEST_ prefixed users"""
        try:
            # Get all workers and delete TEST_ ones
            workers_resp = self.session.get(f"{BASE_URL}/api/workers")
            if workers_resp.status_code == 200:
                for worker in workers_resp.json():
                    if worker.get('name', '').startswith('TEST_') or worker.get('username', '').startswith('TEST_'):
                        self.session.delete(f"{BASE_URL}/api/workers/{worker['id']}")
            
            # Get all admins and delete TEST_ ones
            admins_resp = self.session.get(f"{BASE_URL}/api/admins")
            if admins_resp.status_code == 200:
                for admin in admins_resp.json():
                    if admin.get('name', '').startswith('TEST_') or admin.get('username', '').startswith('TEST_'):
                        self.session.delete(f"{BASE_URL}/api/admins/{admin['id']}")
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    # ============= WORKER TESTS =============
    
    def test_create_worker(self):
        """Test creating a new worker"""
        unique_id = str(uuid.uuid4())[:8]
        worker_data = {
            "name": f"TEST_Worker_{unique_id}",
            "username": f"TEST_worker_{unique_id}",
            "password": "testpass123"
        }
        
        response = self.session.post(f"{BASE_URL}/api/workers", json=worker_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["name"] == worker_data["name"]
        assert data["username"] == worker_data["username"]
        assert data["is_active"] == True
        
        # Verify worker was created by fetching it
        workers_resp = self.session.get(f"{BASE_URL}/api/workers")
        assert workers_resp.status_code == 200
        workers = workers_resp.json()
        created_worker = next((w for w in workers if w["id"] == data["id"]), None)
        assert created_worker is not None, "Created worker not found in list"
        
        return data["id"]
    
    def test_get_workers_list(self):
        """Test getting list of workers"""
        response = self.session.get(f"{BASE_URL}/api/workers")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_toggle_worker_status(self):
        """Test toggling worker active/inactive status"""
        # First create a worker
        unique_id = str(uuid.uuid4())[:8]
        worker_data = {
            "name": f"TEST_ToggleWorker_{unique_id}",
            "username": f"TEST_toggle_{unique_id}",
            "password": "testpass123"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/workers", json=worker_data)
        assert create_resp.status_code == 200
        worker_id = create_resp.json()["id"]
        
        # Toggle to inactive
        toggle_resp = self.session.post(f"{BASE_URL}/api/workers/{worker_id}/toggle")
        assert toggle_resp.status_code == 200
        assert toggle_resp.json()["is_active"] == False
        
        # Toggle back to active
        toggle_resp2 = self.session.post(f"{BASE_URL}/api/workers/{worker_id}/toggle")
        assert toggle_resp2.status_code == 200
        assert toggle_resp2.json()["is_active"] == True
    
    def test_delete_worker(self):
        """Test deleting a worker"""
        # First create a worker
        unique_id = str(uuid.uuid4())[:8]
        worker_data = {
            "name": f"TEST_DeleteWorker_{unique_id}",
            "username": f"TEST_delete_{unique_id}",
            "password": "testpass123"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/workers", json=worker_data)
        assert create_resp.status_code == 200
        worker_id = create_resp.json()["id"]
        
        # Delete the worker
        delete_resp = self.session.delete(f"{BASE_URL}/api/workers/{worker_id}")
        assert delete_resp.status_code == 200
        
        # Verify worker is deleted
        workers_resp = self.session.get(f"{BASE_URL}/api/workers")
        workers = workers_resp.json()
        deleted_worker = next((w for w in workers if w["id"] == worker_id), None)
        assert deleted_worker is None, "Worker should be deleted"
    
    def test_reset_worker_password(self):
        """Test resetting worker password"""
        # First create a worker
        unique_id = str(uuid.uuid4())[:8]
        worker_data = {
            "name": f"TEST_ResetWorker_{unique_id}",
            "username": f"TEST_reset_{unique_id}",
            "password": "oldpassword123"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/workers", json=worker_data)
        assert create_resp.status_code == 200
        worker_id = create_resp.json()["id"]
        
        # Reset password
        new_password = "newpassword456"
        reset_resp = self.session.post(
            f"{BASE_URL}/api/workers/{worker_id}/reset-password",
            params={"new_password": new_password}
        )
        
        assert reset_resp.status_code == 200, f"Expected 200, got {reset_resp.status_code}: {reset_resp.text}"
        data = reset_resp.json()
        assert "message" in data
        assert data["message"] == "Password reset successfully"
        assert "worker_name" in data
        
        # Verify worker can login with new password
        login_resp = self.session.post(
            f"{BASE_URL}/api/auth/worker/login",
            params={"username": worker_data["username"], "password": new_password}
        )
        assert login_resp.status_code == 200, f"Worker should be able to login with new password: {login_resp.text}"
    
    def test_reset_worker_password_invalid_worker(self):
        """Test resetting password for non-existent worker"""
        reset_resp = self.session.post(
            f"{BASE_URL}/api/workers/INVALID-WORKER-ID/reset-password",
            params={"new_password": "newpassword123"}
        )
        
        assert reset_resp.status_code == 404
    
    def test_reset_worker_password_short_password(self):
        """Test resetting password with too short password"""
        # First create a worker
        unique_id = str(uuid.uuid4())[:8]
        worker_data = {
            "name": f"TEST_ShortPwWorker_{unique_id}",
            "username": f"TEST_shortpw_{unique_id}",
            "password": "oldpassword123"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/workers", json=worker_data)
        assert create_resp.status_code == 200
        worker_id = create_resp.json()["id"]
        
        # Try to reset with short password
        reset_resp = self.session.post(
            f"{BASE_URL}/api/workers/{worker_id}/reset-password",
            params={"new_password": "short"}  # Less than 6 chars
        )
        
        assert reset_resp.status_code == 422, "Should reject password shorter than 6 characters"
    
    # ============= ADMIN TESTS =============
    
    def test_create_admin(self):
        """Test creating a new admin"""
        unique_id = str(uuid.uuid4())[:8]
        admin_data = {
            "name": f"TEST_Admin_{unique_id}",
            "username": f"TEST_admin_{unique_id}",
            "email": f"TEST_admin_{unique_id}@test.com",
            "password": "testpass123"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admins", json=admin_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["name"] == admin_data["name"]
        assert data["username"] == admin_data["username"]
        assert data["email"] == admin_data["email"]
        
        # Verify admin was created by fetching it
        admins_resp = self.session.get(f"{BASE_URL}/api/admins")
        assert admins_resp.status_code == 200
        admins = admins_resp.json()
        created_admin = next((a for a in admins if a.get("id") == data["id"] or a.get("_id") == data["id"]), None)
        assert created_admin is not None, "Created admin not found in list"
        
        return data["id"]
    
    def test_get_admins_list(self):
        """Test getting list of admins"""
        response = self.session.get(f"{BASE_URL}/api/admins")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_admin(self):
        """Test deleting an admin"""
        # First create an admin
        unique_id = str(uuid.uuid4())[:8]
        admin_data = {
            "name": f"TEST_DeleteAdmin_{unique_id}",
            "username": f"TEST_deladmin_{unique_id}",
            "email": f"TEST_deladmin_{unique_id}@test.com",
            "password": "testpass123"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/admins", json=admin_data)
        assert create_resp.status_code == 200
        admin_id = create_resp.json()["id"]
        
        # Delete the admin
        delete_resp = self.session.delete(f"{BASE_URL}/api/admins/{admin_id}")
        assert delete_resp.status_code == 200
        
        # Verify admin is deleted
        admins_resp = self.session.get(f"{BASE_URL}/api/admins")
        admins = admins_resp.json()
        deleted_admin = next((a for a in admins if a.get("id") == admin_id or a.get("_id") == admin_id), None)
        assert deleted_admin is None, "Admin should be deleted"
    
    def test_reset_admin_password(self):
        """Test resetting admin password"""
        # First create an admin
        unique_id = str(uuid.uuid4())[:8]
        admin_data = {
            "name": f"TEST_ResetAdmin_{unique_id}",
            "username": f"TEST_resetadmin_{unique_id}",
            "email": f"TEST_resetadmin_{unique_id}@test.com",
            "password": "oldpassword123"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/admins", json=admin_data)
        assert create_resp.status_code == 200
        admin_id = create_resp.json()["id"]
        
        # Reset password
        new_password = "newpassword456"
        reset_resp = self.session.post(
            f"{BASE_URL}/api/admins/{admin_id}/reset-password",
            params={"new_password": new_password}
        )
        
        assert reset_resp.status_code == 200, f"Expected 200, got {reset_resp.status_code}: {reset_resp.text}"
        data = reset_resp.json()
        assert "message" in data
        assert data["message"] == "Password reset successfully"
        assert "admin_name" in data
        
        # Verify admin can login with new password
        login_resp = self.session.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": admin_data["username"], "password": new_password}
        )
        assert login_resp.status_code == 200, f"Admin should be able to login with new password: {login_resp.text}"
    
    def test_reset_admin_password_invalid_admin(self):
        """Test resetting password for non-existent admin"""
        reset_resp = self.session.post(
            f"{BASE_URL}/api/admins/INVALID-ADMIN-ID/reset-password",
            params={"new_password": "newpassword123"}
        )
        
        assert reset_resp.status_code == 404
    
    def test_reset_admin_password_short_password(self):
        """Test resetting admin password with too short password"""
        # First create an admin
        unique_id = str(uuid.uuid4())[:8]
        admin_data = {
            "name": f"TEST_ShortPwAdmin_{unique_id}",
            "username": f"TEST_shortpwadmin_{unique_id}",
            "email": f"TEST_shortpwadmin_{unique_id}@test.com",
            "password": "oldpassword123"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/admins", json=admin_data)
        assert create_resp.status_code == 200
        admin_id = create_resp.json()["id"]
        
        # Try to reset with short password
        reset_resp = self.session.post(
            f"{BASE_URL}/api/admins/{admin_id}/reset-password",
            params={"new_password": "short"}  # Less than 6 chars
        )
        
        assert reset_resp.status_code == 422, "Should reject password shorter than 6 characters"


class TestAuthenticationFlow:
    """Test authentication flows for admins and workers"""
    
    def test_admin_login_success(self):
        """Test successful admin login"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": "test", "password": "test123"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "session_token" in data
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": "invalid", "password": "wrongpassword"}
        )
        
        assert response.status_code == 401
    
    def test_get_current_user(self):
        """Test getting current authenticated user"""
        session = requests.Session()
        
        # First login
        login_resp = session.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": "test", "password": "test123"}
        )
        assert login_resp.status_code == 200
        
        # Get current user
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200
        data = me_resp.json()
        # User ID can be in 'id' or '_id' field depending on user type
        assert "id" in data or "_id" in data
        assert "name" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

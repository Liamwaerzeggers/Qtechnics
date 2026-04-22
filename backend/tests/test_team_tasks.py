"""
Test suite for Team Task System
Tests: CRUD operations, assignment, completion, team members endpoint
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "Liam"
ADMIN_PASSWORD = "Liammail123"


class TestTeamTaskSystem:
    """Team Task System endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token for admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth2/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("token")
            self.user = data.get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code} - {login_response.text}")
        
        yield
        
        # Cleanup: Delete test tasks created during tests
        self._cleanup_test_tasks()
    
    def _cleanup_test_tasks(self):
        """Delete tasks created during testing (prefixed with TEST_)"""
        try:
            tasks_res = self.session.get(f"{BASE_URL}/api/team-tasks")
            if tasks_res.status_code == 200:
                for task in tasks_res.json():
                    if task.get("title", "").startswith("TEST_"):
                        self.session.delete(f"{BASE_URL}/api/team-tasks/{task['id']}")
        except:
            pass
    
    # ============= AUTH TEST =============
    def test_admin_login(self):
        """Test admin login via /api/auth2/login"""
        response = requests.post(
            f"{BASE_URL}/api/auth2/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        assert "user" in data
        print(f"✓ Admin login successful, user: {data['user'].get('name', data['user'].get('username'))}")
    
    # ============= GET TEAM TASKS =============
    def test_get_team_tasks(self):
        """Test GET /api/team-tasks returns task list"""
        response = self.session.get(f"{BASE_URL}/api/team-tasks")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/team-tasks returned {len(data)} tasks")
    
    def test_get_unassigned_tasks(self):
        """Test GET /api/team-tasks/unassigned returns only unassigned open tasks"""
        response = self.session.get(f"{BASE_URL}/api/team-tasks/unassigned")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # Verify all returned tasks are unassigned and not completed
        for task in data:
            assert task.get("assigned_to") is None, f"Task {task['id']} should be unassigned"
            assert task.get("completed") == False, f"Task {task['id']} should not be completed"
        print(f"✓ GET /api/team-tasks/unassigned returned {len(data)} unassigned tasks")
    
    def test_get_my_tasks(self):
        """Test GET /api/team-tasks/my returns tasks assigned to current user"""
        response = self.session.get(f"{BASE_URL}/api/team-tasks/my")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # Verify all returned tasks are assigned to current user
        for task in data:
            assert task.get("assigned_to") == self.user.get("id"), f"Task {task['id']} should be assigned to current user"
        print(f"✓ GET /api/team-tasks/my returned {len(data)} tasks for current user")
    
    # ============= GET TEAM MEMBERS =============
    def test_get_team_members(self):
        """Test GET /api/team-members returns team members with required fields"""
        response = self.session.get(f"{BASE_URL}/api/team-members")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least one team member"
        
        # Verify structure of team members
        for member in data:
            assert "id" in member, "Member should have id"
            assert "name" in member, "Member should have name"
            assert "role" in member, "Member should have role"
        
        print(f"✓ GET /api/team-members returned {len(data)} members")
        for m in data[:3]:  # Print first 3
            print(f"  - {m['name']} ({m['role']})")
    
    # ============= CREATE TASK =============
    def test_create_task_minimal(self):
        """Test POST /api/team-tasks creates task with minimal data"""
        task_data = {
            "title": f"TEST_Task_{uuid.uuid4().hex[:6]}",
            "task_type": "overig"
        }
        response = self.session.post(f"{BASE_URL}/api/team-tasks", json=task_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["title"] == task_data["title"]
        assert data["task_type"] == "overig"
        assert data["status"] == "open"
        assert data["assigned_to"] is None
        print(f"✓ Created task: {data['id']} - {data['title']}")
    
    def test_create_task_with_all_fields(self):
        """Test POST /api/team-tasks with all fields"""
        task_data = {
            "title": f"TEST_FullTask_{uuid.uuid4().hex[:6]}",
            "description": "Test description for full task",
            "task_type": "nieuwe_lead"
        }
        response = self.session.post(f"{BASE_URL}/api/team-tasks", json=task_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["title"] == task_data["title"]
        assert data["description"] == task_data["description"]
        assert data["task_type"] == "nieuwe_lead"
        print(f"✓ Created full task: {data['id']}")
    
    def test_create_task_all_types(self):
        """Test creating tasks with all valid task types"""
        task_types = [
            "nieuwe_lead", "eerste_bezoek", "offerte_maken", 
            "materiaal_bestellen", "planning", "opvolging", 
            "administratie", "overig"
        ]
        
        for task_type in task_types:
            task_data = {
                "title": f"TEST_Type_{task_type}_{uuid.uuid4().hex[:4]}",
                "task_type": task_type
            }
            response = self.session.post(f"{BASE_URL}/api/team-tasks", json=task_data)
            assert response.status_code == 200, f"Failed for type {task_type}: {response.text}"
            data = response.json()
            assert data["task_type"] == task_type
        
        print(f"✓ All {len(task_types)} task types created successfully")
    
    # ============= ASSIGN TASK =============
    def test_assign_task(self):
        """Test PUT /api/team-tasks/{id}/assign assigns task to member"""
        # First create a task
        task_data = {"title": f"TEST_AssignTask_{uuid.uuid4().hex[:6]}", "task_type": "overig"}
        create_res = self.session.post(f"{BASE_URL}/api/team-tasks", json=task_data)
        assert create_res.status_code == 200
        task_id = create_res.json()["id"]
        
        # Get team members
        members_res = self.session.get(f"{BASE_URL}/api/team-members")
        assert members_res.status_code == 200
        members = members_res.json()
        assert len(members) > 0, "Need at least one team member"
        
        assignee = members[0]
        
        # Assign task
        assign_res = self.session.put(
            f"{BASE_URL}/api/team-tasks/{task_id}/assign",
            json={"assigned_to": assignee["id"]}
        )
        assert assign_res.status_code == 200, f"Failed: {assign_res.text}"
        
        data = assign_res.json()
        assert data["assigned_to"] == assignee["id"]
        assert data["status"] == "assigned"
        print(f"✓ Task {task_id} assigned to {assignee['name']}")
        
        # Verify persistence via GET
        get_res = self.session.get(f"{BASE_URL}/api/team-tasks")
        tasks = get_res.json()
        assigned_task = next((t for t in tasks if t["id"] == task_id), None)
        assert assigned_task is not None
        assert assigned_task["assigned_to"] == assignee["id"]
        assert assigned_task["status"] == "assigned"
        print(f"✓ Assignment persisted correctly")
    
    def test_assign_task_missing_assignee(self):
        """Test assign task fails without assigned_to"""
        # Create task
        task_data = {"title": f"TEST_NoAssignee_{uuid.uuid4().hex[:6]}", "task_type": "overig"}
        create_res = self.session.post(f"{BASE_URL}/api/team-tasks", json=task_data)
        task_id = create_res.json()["id"]
        
        # Try to assign without assignee
        assign_res = self.session.put(
            f"{BASE_URL}/api/team-tasks/{task_id}/assign",
            json={}
        )
        assert assign_res.status_code == 400, f"Should fail: {assign_res.text}"
        print(f"✓ Assign without assignee correctly returns 400")
    
    # ============= COMPLETE TASK =============
    def test_complete_task(self):
        """Test PUT /api/team-tasks/{id}/complete marks task as done"""
        # Create and assign task to self
        task_data = {"title": f"TEST_CompleteTask_{uuid.uuid4().hex[:6]}", "task_type": "overig"}
        create_res = self.session.post(f"{BASE_URL}/api/team-tasks", json=task_data)
        task_id = create_res.json()["id"]
        
        # Assign to self (admin can complete any task)
        self.session.put(
            f"{BASE_URL}/api/team-tasks/{task_id}/assign",
            json={"assigned_to": self.user["id"]}
        )
        
        # Complete task
        complete_res = self.session.put(f"{BASE_URL}/api/team-tasks/{task_id}/complete")
        assert complete_res.status_code == 200, f"Failed: {complete_res.text}"
        
        data = complete_res.json()
        assert "completed_at" in data
        print(f"✓ Task {task_id} completed at {data['completed_at']}")
        
        # Verify persistence
        get_res = self.session.get(f"{BASE_URL}/api/team-tasks")
        tasks = get_res.json()
        completed_task = next((t for t in tasks if t["id"] == task_id), None)
        assert completed_task is not None
        assert completed_task["completed"] == True
        assert completed_task["status"] == "completed"
        print(f"✓ Completion persisted correctly")
    
    def test_complete_nonexistent_task(self):
        """Test completing non-existent task returns 404"""
        response = self.session.put(f"{BASE_URL}/api/team-tasks/NONEXISTENT-TASK/complete")
        assert response.status_code == 404
        print(f"✓ Complete non-existent task correctly returns 404")
    
    # ============= DELETE TASK =============
    def test_delete_task(self):
        """Test DELETE /api/team-tasks/{id} removes task"""
        # Create task
        task_data = {"title": f"TEST_DeleteTask_{uuid.uuid4().hex[:6]}", "task_type": "overig"}
        create_res = self.session.post(f"{BASE_URL}/api/team-tasks", json=task_data)
        task_id = create_res.json()["id"]
        
        # Delete task
        delete_res = self.session.delete(f"{BASE_URL}/api/team-tasks/{task_id}")
        assert delete_res.status_code == 200, f"Failed: {delete_res.text}"
        print(f"✓ Task {task_id} deleted")
        
        # Verify removal
        get_res = self.session.get(f"{BASE_URL}/api/team-tasks")
        tasks = get_res.json()
        deleted_task = next((t for t in tasks if t["id"] == task_id), None)
        assert deleted_task is None, "Task should be deleted"
        print(f"✓ Task removal verified")
    
    def test_delete_nonexistent_task(self):
        """Test deleting non-existent task returns 404"""
        response = self.session.delete(f"{BASE_URL}/api/team-tasks/NONEXISTENT-TASK")
        assert response.status_code == 404
        print(f"✓ Delete non-existent task correctly returns 404")
    
    # ============= FILTER VERIFICATION =============
    def test_completed_tasks_not_in_unassigned(self):
        """Test completed tasks don't appear in unassigned endpoint"""
        # Create, assign, and complete a task
        task_data = {"title": f"TEST_FilterTest_{uuid.uuid4().hex[:6]}", "task_type": "overig"}
        create_res = self.session.post(f"{BASE_URL}/api/team-tasks", json=task_data)
        task_id = create_res.json()["id"]
        
        # Complete it (admin can complete unassigned tasks)
        self.session.put(
            f"{BASE_URL}/api/team-tasks/{task_id}/assign",
            json={"assigned_to": self.user["id"]}
        )
        self.session.put(f"{BASE_URL}/api/team-tasks/{task_id}/complete")
        
        # Check unassigned endpoint
        unassigned_res = self.session.get(f"{BASE_URL}/api/team-tasks/unassigned")
        unassigned_tasks = unassigned_res.json()
        
        # Task should not be in unassigned (it's completed)
        found = any(t["id"] == task_id for t in unassigned_tasks)
        assert not found, "Completed task should not appear in unassigned"
        print(f"✓ Completed tasks correctly filtered from unassigned endpoint")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

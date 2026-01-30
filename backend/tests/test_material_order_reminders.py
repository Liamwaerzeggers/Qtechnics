"""
Test Material Order Reminders Feature
- POST /api/projects/{id}/scheduled-days/{period_id}/materials - accepts order_reminder_date
- PUT /api/projects/{id}/scheduled-days/{period_id}/materials/{material_id} - can update is_ordered status
- GET /api/dashboard/material-reminders - returns materials where order_reminder_date <= today and is_ordered=false
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMaterialOrderReminders:
    """Test material order reminder functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with test credentials
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/admin-login",
            json={"username": "test", "password": "test123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        self.session_token = data.get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        # Get or create a test project
        self.project_id = self._get_or_create_test_project()
        self.period_id = self._ensure_work_period_exists()
        
        yield
        
        # Cleanup: Remove test materials
        self._cleanup_test_materials()
    
    def _get_or_create_test_project(self):
        """Get existing project or create one for testing"""
        # Try to get existing projects
        response = self.session.get(f"{BASE_URL}/api/projects")
        if response.status_code == 200:
            projects = response.json()
            if projects:
                return projects[0]["id"]
        
        # Create a lead first
        lead_response = self.session.post(
            f"{BASE_URL}/api/leads",
            json={
                "name": "TEST_Material_Reminder_Lead",
                "email": "test_material@example.com",
                "phone": "0123456789",
                "address": "Test Address",
                "project_type": "Renovatie"
            }
        )
        if lead_response.status_code == 200:
            lead = lead_response.json()
            # Get the auto-created project
            projects_response = self.session.get(f"{BASE_URL}/api/projects")
            if projects_response.status_code == 200:
                projects = projects_response.json()
                for p in projects:
                    if p.get("lead_id") == lead["id"]:
                        return p["id"]
        
        pytest.skip("Could not get or create test project")
    
    def _ensure_work_period_exists(self):
        """Ensure the project has at least one work period"""
        response = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}")
        assert response.status_code == 200
        project = response.json()
        
        scheduled_days = project.get("scheduled_days", [])
        if scheduled_days:
            return scheduled_days[0]["id"]
        
        # Create a work period
        today = datetime.now().strftime("%Y-%m-%d")
        next_week = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        new_period = {
            "id": f"TEST-PERIOD-{datetime.now().timestamp()}",
            "start_date": today,
            "end_date": next_week,
            "description": "Test Work Period for Material Reminders"
        }
        
        update_response = self.session.put(
            f"{BASE_URL}/api/projects/{self.project_id}",
            json={"scheduled_days": [new_period]}
        )
        assert update_response.status_code == 200, f"Failed to create work period: {update_response.text}"
        
        return new_period["id"]
    
    def _cleanup_test_materials(self):
        """Remove test materials created during tests"""
        try:
            response = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}")
            if response.status_code == 200:
                project = response.json()
                scheduled_days = project.get("scheduled_days", [])
                for period in scheduled_days:
                    materials = period.get("materials", [])
                    for mat in materials:
                        if mat.get("name", "").startswith("TEST_"):
                            self.session.delete(
                                f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{period['id']}/materials/{mat['id']}"
                            )
        except Exception:
            pass
    
    # ============= POST Material with order_reminder_date =============
    
    def test_add_material_with_order_reminder_date(self):
        """Test adding material with order_reminder_date field"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials",
            json={
                "name": "TEST_Material_With_Reminder",
                "quantity": 10,
                "unit": "stuk",
                "notes": "Test material with order reminder",
                "order_reminder_date": today
            }
        )
        
        assert response.status_code == 200, f"Failed to add material: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "material" in data
        
        material = data["material"]
        assert material["name"] == "TEST_Material_With_Reminder"
        assert material["quantity"] == 10
        assert material["unit"] == "stuk"
        assert material["order_reminder_date"] == today
        assert material["is_ordered"] == False
        assert "id" in material
        
        # Store for later tests
        self.test_material_id = material["id"]
        print(f"✓ Material created with order_reminder_date: {material['id']}")
    
    def test_add_material_without_order_reminder_date(self):
        """Test adding material without order_reminder_date (should be None)"""
        response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials",
            json={
                "name": "TEST_Material_No_Reminder",
                "quantity": 5,
                "unit": "m²"
            }
        )
        
        assert response.status_code == 200, f"Failed to add material: {response.text}"
        data = response.json()
        
        material = data["material"]
        assert material["name"] == "TEST_Material_No_Reminder"
        assert material.get("order_reminder_date") is None
        assert material["is_ordered"] == False
        print(f"✓ Material created without order_reminder_date: {material['id']}")
    
    def test_add_material_with_past_order_date(self):
        """Test adding material with order_reminder_date in the past"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials",
            json={
                "name": "TEST_Material_Past_Date",
                "quantity": 3,
                "unit": "doos",
                "order_reminder_date": yesterday
            }
        )
        
        assert response.status_code == 200, f"Failed to add material: {response.text}"
        data = response.json()
        
        material = data["material"]
        assert material["order_reminder_date"] == yesterday
        print(f"✓ Material created with past order_reminder_date: {material['id']}")
    
    # ============= PUT Material - Update is_ordered status =============
    
    def test_update_material_mark_as_ordered(self):
        """Test marking a material as ordered"""
        # First create a material
        today = datetime.now().strftime("%Y-%m-%d")
        create_response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials",
            json={
                "name": "TEST_Material_To_Order",
                "quantity": 2,
                "unit": "stuk",
                "order_reminder_date": today
            }
        )
        assert create_response.status_code == 200
        material_id = create_response.json()["material"]["id"]
        
        # Mark as ordered
        update_response = self.session.put(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials/{material_id}",
            json={"is_ordered": True}
        )
        
        assert update_response.status_code == 200, f"Failed to update material: {update_response.text}"
        data = update_response.json()
        assert data.get("success") == True
        
        # Verify the update persisted
        project_response = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}")
        assert project_response.status_code == 200
        project = project_response.json()
        
        # Find the material
        material_found = False
        for period in project.get("scheduled_days", []):
            for mat in period.get("materials", []):
                if mat["id"] == material_id:
                    assert mat["is_ordered"] == True, "Material should be marked as ordered"
                    material_found = True
                    break
        
        assert material_found, "Material not found in project"
        print(f"✓ Material marked as ordered: {material_id}")
    
    def test_update_material_unmark_as_ordered(self):
        """Test unmarking a material as ordered (set is_ordered=false)"""
        # First create and mark as ordered
        today = datetime.now().strftime("%Y-%m-%d")
        create_response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials",
            json={
                "name": "TEST_Material_Unmark",
                "quantity": 1,
                "unit": "stuk",
                "order_reminder_date": today
            }
        )
        assert create_response.status_code == 200
        material_id = create_response.json()["material"]["id"]
        
        # Mark as ordered first
        self.session.put(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials/{material_id}",
            json={"is_ordered": True}
        )
        
        # Now unmark
        update_response = self.session.put(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials/{material_id}",
            json={"is_ordered": False}
        )
        
        assert update_response.status_code == 200
        
        # Verify
        project_response = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}")
        project = project_response.json()
        
        for period in project.get("scheduled_days", []):
            for mat in period.get("materials", []):
                if mat["id"] == material_id:
                    assert mat["is_ordered"] == False, "Material should be unmarked"
                    print(f"✓ Material unmarked as ordered: {material_id}")
                    return
    
    def test_update_material_change_order_reminder_date(self):
        """Test updating the order_reminder_date of a material"""
        # Create material
        today = datetime.now().strftime("%Y-%m-%d")
        create_response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials",
            json={
                "name": "TEST_Material_Change_Date",
                "quantity": 1,
                "unit": "stuk",
                "order_reminder_date": today
            }
        )
        assert create_response.status_code == 200
        material_id = create_response.json()["material"]["id"]
        
        # Update order_reminder_date
        new_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        update_response = self.session.put(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials/{material_id}",
            json={"order_reminder_date": new_date}
        )
        
        assert update_response.status_code == 200
        
        # Verify
        project_response = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}")
        project = project_response.json()
        
        for period in project.get("scheduled_days", []):
            for mat in period.get("materials", []):
                if mat["id"] == material_id:
                    assert mat["order_reminder_date"] == new_date
                    print(f"✓ Material order_reminder_date updated: {material_id}")
                    return
    
    # ============= GET Material Reminders =============
    
    def test_get_material_reminders_returns_due_materials(self):
        """Test that material-reminders endpoint returns materials with order_reminder_date <= today"""
        # Create a material with today's date
        today = datetime.now().strftime("%Y-%m-%d")
        create_response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials",
            json={
                "name": "TEST_Material_Due_Today",
                "quantity": 5,
                "unit": "stuk",
                "order_reminder_date": today
            }
        )
        assert create_response.status_code == 200
        material_id = create_response.json()["material"]["id"]
        
        # Get material reminders
        response = self.session.get(f"{BASE_URL}/api/dashboard/material-reminders")
        
        assert response.status_code == 200, f"Failed to get reminders: {response.text}"
        reminders = response.json()
        
        # Should be a list
        assert isinstance(reminders, list)
        
        # Find our material in the reminders
        found = False
        for reminder in reminders:
            assert "project_id" in reminder
            assert "project_name" in reminder
            assert "period_id" in reminder
            assert "materials" in reminder
            
            for mat in reminder.get("materials", []):
                if mat.get("id") == material_id:
                    found = True
                    assert mat["name"] == "TEST_Material_Due_Today"
                    assert "days_overdue" in mat
                    break
        
        assert found, "Material with today's order date should appear in reminders"
        print(f"✓ Material reminders endpoint returns due materials")
    
    def test_get_material_reminders_excludes_ordered_materials(self):
        """Test that ordered materials are excluded from reminders"""
        # Create a material with today's date
        today = datetime.now().strftime("%Y-%m-%d")
        create_response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials",
            json={
                "name": "TEST_Material_Ordered",
                "quantity": 3,
                "unit": "stuk",
                "order_reminder_date": today
            }
        )
        assert create_response.status_code == 200
        material_id = create_response.json()["material"]["id"]
        
        # Mark as ordered
        self.session.put(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials/{material_id}",
            json={"is_ordered": True}
        )
        
        # Get material reminders
        response = self.session.get(f"{BASE_URL}/api/dashboard/material-reminders")
        assert response.status_code == 200
        reminders = response.json()
        
        # Our ordered material should NOT be in the reminders
        for reminder in reminders:
            for mat in reminder.get("materials", []):
                assert mat.get("id") != material_id, "Ordered material should not appear in reminders"
        
        print(f"✓ Ordered materials are excluded from reminders")
    
    def test_get_material_reminders_excludes_future_dates(self):
        """Test that materials with future order_reminder_date are excluded"""
        # Create a material with future date
        future_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
        create_response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials",
            json={
                "name": "TEST_Material_Future",
                "quantity": 2,
                "unit": "stuk",
                "order_reminder_date": future_date
            }
        )
        assert create_response.status_code == 200
        material_id = create_response.json()["material"]["id"]
        
        # Get material reminders
        response = self.session.get(f"{BASE_URL}/api/dashboard/material-reminders")
        assert response.status_code == 200
        reminders = response.json()
        
        # Our future material should NOT be in the reminders
        for reminder in reminders:
            for mat in reminder.get("materials", []):
                assert mat.get("id") != material_id, "Future dated material should not appear in reminders"
        
        print(f"✓ Future dated materials are excluded from reminders")
    
    def test_get_material_reminders_includes_overdue_materials(self):
        """Test that overdue materials (past order_reminder_date) are included with days_overdue"""
        # Create a material with yesterday's date
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        create_response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials",
            json={
                "name": "TEST_Material_Overdue",
                "quantity": 4,
                "unit": "stuk",
                "order_reminder_date": yesterday
            }
        )
        assert create_response.status_code == 200
        material_id = create_response.json()["material"]["id"]
        
        # Get material reminders
        response = self.session.get(f"{BASE_URL}/api/dashboard/material-reminders")
        assert response.status_code == 200
        reminders = response.json()
        
        # Find our overdue material
        found = False
        for reminder in reminders:
            for mat in reminder.get("materials", []):
                if mat.get("id") == material_id:
                    found = True
                    assert mat["days_overdue"] >= 1, "Should show at least 1 day overdue"
                    break
        
        assert found, "Overdue material should appear in reminders"
        print(f"✓ Overdue materials are included with days_overdue count")
    
    # ============= Error Cases =============
    
    def test_add_material_to_nonexistent_period(self):
        """Test adding material to non-existent work period returns 404"""
        response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/NONEXISTENT-PERIOD/materials",
            json={
                "name": "TEST_Material_Bad_Period",
                "quantity": 1,
                "unit": "stuk"
            }
        )
        
        assert response.status_code == 404
        print(f"✓ Adding material to non-existent period returns 404")
    
    def test_update_nonexistent_material(self):
        """Test updating non-existent material returns 404"""
        response = self.session.put(
            f"{BASE_URL}/api/projects/{self.project_id}/scheduled-days/{self.period_id}/materials/NONEXISTENT-MAT",
            json={"is_ordered": True}
        )
        
        assert response.status_code == 404
        print(f"✓ Updating non-existent material returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

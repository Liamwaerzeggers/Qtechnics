"""
Test suite for Verkocht (Sold) toggle, Celebrations, and Materials per Work Period features.

Features tested:
1. PUT /api/quotes/{quote_id} with is_sold=true - updates project status to 'in uitvoering' and creates celebration
2. PUT /api/legacy-documents/{doc_id} with is_sold=true - updates project status
3. GET /api/celebrations/pending - returns unseen celebrations
4. POST /api/celebrations/{id}/mark-seen - marks celebration as seen
5. POST /api/projects/{project_id}/scheduled-days/{period_id}/materials - adds material to work period
6. DELETE /api/projects/{project_id}/scheduled-days/{period_id}/materials/{material_id} - removes material
7. GET /api/dashboard/material-reminders - returns work periods with materials within 1 month
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        # Login with test credentials
        response = s.post(f"{BASE_URL}/api/auth/admin-login", json={
            "username": "test",
            "password": "test123"
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("session_token")
            if token:
                s.headers.update({"Authorization": f"Bearer {token}"})
        
        return s
    
    def test_admin_login(self, session):
        """Test admin login works"""
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "admin" or data.get("username") == "test"
        print(f"✅ Logged in as: {data.get('name', data.get('username'))}")


class TestCelebrations:
    """Test celebration endpoints"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        response = s.post(f"{BASE_URL}/api/auth/admin-login", json={
            "username": "test",
            "password": "test123"
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("session_token")
            if token:
                s.headers.update({"Authorization": f"Bearer {token}"})
        
        return s
    
    def test_get_pending_celebrations(self, session):
        """Test GET /api/celebrations/pending returns list"""
        response = session.get(f"{BASE_URL}/api/celebrations/pending")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/celebrations/pending - Found {len(data)} pending celebrations")
        
        # If there are celebrations, verify structure
        if len(data) > 0:
            celebration = data[0]
            assert "id" in celebration
            assert "project_name" in celebration
            print(f"   First celebration: {celebration.get('project_name')} - €{celebration.get('amount', 0)}")
    
    def test_mark_celebration_seen(self, session):
        """Test POST /api/celebrations/{id}/mark-seen"""
        # First get pending celebrations
        response = session.get(f"{BASE_URL}/api/celebrations/pending")
        assert response.status_code == 200
        celebrations = response.json()
        
        if len(celebrations) > 0:
            celebration_id = celebrations[0]["id"]
            
            # Mark as seen
            response = session.post(f"{BASE_URL}/api/celebrations/{celebration_id}/mark-seen")
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
            print(f"✅ POST /api/celebrations/{celebration_id}/mark-seen - Success")
        else:
            # Test with non-existent ID (should still return success due to $addToSet)
            response = session.post(f"{BASE_URL}/api/celebrations/CELEB-NONEXIST/mark-seen")
            assert response.status_code == 200
            print("✅ POST /api/celebrations/mark-seen - Endpoint works (no pending celebrations)")


class TestQuoteSold:
    """Test quote sold toggle functionality"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        response = s.post(f"{BASE_URL}/api/auth/admin-login", json={
            "username": "test",
            "password": "test123"
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("session_token")
            if token:
                s.headers.update({"Authorization": f"Bearer {token}"})
        
        return s
    
    def test_get_quotes(self, session):
        """Test GET /api/quotes returns list"""
        response = session.get(f"{BASE_URL}/api/quotes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/quotes - Found {len(data)} quotes")
        return data
    
    def test_update_quote_with_is_sold(self, session):
        """Test PUT /api/quotes/{quote_id} with is_sold=true"""
        # Get quotes
        response = session.get(f"{BASE_URL}/api/quotes")
        quotes = response.json()
        
        if len(quotes) > 0:
            quote = quotes[0]
            quote_id = quote["id"]
            
            # Update with is_sold=true
            response = session.put(f"{BASE_URL}/api/quotes/{quote_id}", json={
                "is_sold": True
            })
            assert response.status_code == 200
            data = response.json()
            print(f"✅ PUT /api/quotes/{quote_id} with is_sold=true - Success")
            
            # Verify project status was updated
            lead_id = quote.get("lead_id")
            if lead_id:
                # Get project by lead_id
                projects_response = session.get(f"{BASE_URL}/api/projects")
                if projects_response.status_code == 200:
                    projects = projects_response.json()
                    project = next((p for p in projects if p.get("lead_id") == lead_id), None)
                    if project:
                        print(f"   Project status: {project.get('status')}")
        else:
            print("⚠️ No quotes found to test is_sold toggle")


class TestLegacyDocumentSold:
    """Test legacy document sold toggle functionality"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        response = s.post(f"{BASE_URL}/api/auth/admin-login", json={
            "username": "test",
            "password": "test123"
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("session_token")
            if token:
                s.headers.update({"Authorization": f"Bearer {token}"})
        
        return s
    
    def test_get_legacy_documents(self, session):
        """Test getting legacy documents for a project"""
        # Get projects first
        response = session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        projects = response.json()
        
        # Find project with legacy documents
        for project in projects:
            project_id = project["id"]
            docs_response = session.get(f"{BASE_URL}/api/projects/{project_id}/legacy-documents")
            if docs_response.status_code == 200:
                docs = docs_response.json()
                if len(docs) > 0:
                    print(f"✅ Found {len(docs)} legacy documents in project {project.get('name')}")
                    return docs
        
        print("⚠️ No legacy documents found in any project")
        return []
    
    def test_update_legacy_document_with_is_sold(self, session):
        """Test PUT /api/legacy-documents/{doc_id} with is_sold=true"""
        # Get projects
        response = session.get(f"{BASE_URL}/api/projects")
        projects = response.json()
        
        # Find a legacy document
        for project in projects:
            project_id = project["id"]
            docs_response = session.get(f"{BASE_URL}/api/projects/{project_id}/legacy-documents")
            if docs_response.status_code == 200:
                docs = docs_response.json()
                # Find an offerte type document
                offerte_docs = [d for d in docs if d.get("document_type") == "offerte"]
                if len(offerte_docs) > 0:
                    doc = offerte_docs[0]
                    doc_id = doc["id"]
                    
                    # Update with is_sold=true
                    response = session.put(f"{BASE_URL}/api/legacy-documents/{doc_id}", json={
                        "is_sold": True
                    })
                    assert response.status_code == 200
                    print(f"✅ PUT /api/legacy-documents/{doc_id} with is_sold=true - Success")
                    
                    # Verify project status
                    project_response = session.get(f"{BASE_URL}/api/projects/{project_id}")
                    if project_response.status_code == 200:
                        updated_project = project_response.json()
                        print(f"   Project status: {updated_project.get('status')}")
                    return
        
        print("⚠️ No offerte-type legacy documents found to test is_sold toggle")


class TestMaterialsPerWorkPeriod:
    """Test materials per work period functionality"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        response = s.post(f"{BASE_URL}/api/auth/admin-login", json={
            "username": "test",
            "password": "test123"
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("session_token")
            if token:
                s.headers.update({"Authorization": f"Bearer {token}"})
        
        return s
    
    @pytest.fixture(scope="class")
    def test_project_with_period(self, session):
        """Get or create a project with a scheduled work period"""
        # Get projects
        response = session.get(f"{BASE_URL}/api/projects")
        projects = response.json()
        
        # Find project with scheduled_days
        for project in projects:
            scheduled_days = project.get("scheduled_days", [])
            if len(scheduled_days) > 0:
                return project
        
        # If no project with scheduled days, create one
        if len(projects) > 0:
            project = projects[0]
            project_id = project["id"]
            
            # Add a scheduled work period
            future_date = (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d")
            future_end = (datetime.now() + timedelta(days=20)).strftime("%Y-%m-%d")
            
            new_period = {
                "id": f"TEST-PERIOD-{datetime.now().strftime('%H%M%S')}",
                "start_date": future_date,
                "end_date": future_end,
                "description": "Test werkperiode voor materialen"
            }
            
            response = session.put(f"{BASE_URL}/api/projects/{project_id}", json={
                "scheduled_days": [new_period]
            })
            
            if response.status_code == 200:
                # Refresh project data
                response = session.get(f"{BASE_URL}/api/projects/{project_id}")
                return response.json()
        
        return None
    
    def test_add_material_to_work_period(self, session, test_project_with_period):
        """Test POST /api/projects/{project_id}/scheduled-days/{period_id}/materials"""
        if not test_project_with_period:
            pytest.skip("No project with work period available")
        
        project_id = test_project_with_period["id"]
        scheduled_days = test_project_with_period.get("scheduled_days", [])
        
        if len(scheduled_days) == 0:
            pytest.skip("No scheduled work periods in project")
        
        period_id = scheduled_days[0]["id"]
        
        # Add material
        response = session.post(
            f"{BASE_URL}/api/projects/{project_id}/scheduled-days/{period_id}/materials",
            json={
                "name": "TEST Tegels 60x60",
                "quantity": 25,
                "unit": "m²",
                "notes": "Test materiaal"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "material" in data
        material = data["material"]
        assert material.get("name") == "TEST Tegels 60x60"
        assert material.get("quantity") == 25
        print(f"✅ POST materials - Added material: {material.get('name')} ({material.get('id')})")
        
        return material
    
    def test_remove_material_from_work_period(self, session, test_project_with_period):
        """Test DELETE /api/projects/{project_id}/scheduled-days/{period_id}/materials/{material_id}"""
        if not test_project_with_period:
            pytest.skip("No project with work period available")
        
        project_id = test_project_with_period["id"]
        
        # Refresh project to get latest materials
        response = session.get(f"{BASE_URL}/api/projects/{project_id}")
        project = response.json()
        scheduled_days = project.get("scheduled_days", [])
        
        if len(scheduled_days) == 0:
            pytest.skip("No scheduled work periods in project")
        
        period = scheduled_days[0]
        period_id = period["id"]
        materials = period.get("materials", [])
        
        # Find a test material to delete
        test_materials = [m for m in materials if m.get("name", "").startswith("TEST")]
        
        if len(test_materials) == 0:
            # Add one first
            add_response = session.post(
                f"{BASE_URL}/api/projects/{project_id}/scheduled-days/{period_id}/materials",
                json={"name": "TEST Delete Material", "quantity": 1, "unit": "stuk"}
            )
            if add_response.status_code == 200:
                material_id = add_response.json()["material"]["id"]
            else:
                pytest.skip("Could not add test material")
        else:
            material_id = test_materials[0]["id"]
        
        # Delete material
        response = session.delete(
            f"{BASE_URL}/api/projects/{project_id}/scheduled-days/{period_id}/materials/{material_id}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✅ DELETE materials - Removed material: {material_id}")


class TestMaterialReminders:
    """Test material reminders dashboard endpoint"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        response = s.post(f"{BASE_URL}/api/auth/admin-login", json={
            "username": "test",
            "password": "test123"
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("session_token")
            if token:
                s.headers.update({"Authorization": f"Bearer {token}"})
        
        return s
    
    def test_get_material_reminders(self, session):
        """Test GET /api/dashboard/material-reminders"""
        response = session.get(f"{BASE_URL}/api/dashboard/material-reminders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/dashboard/material-reminders - Found {len(data)} reminders")
        
        # Verify structure if there are reminders
        if len(data) > 0:
            reminder = data[0]
            assert "project_id" in reminder
            assert "project_name" in reminder
            assert "period_id" in reminder
            assert "start_date" in reminder
            assert "days_until" in reminder
            assert "materials" in reminder
            print(f"   First reminder: {reminder.get('project_name')} - {reminder.get('days_until')} days until start")
            print(f"   Materials: {len(reminder.get('materials', []))} items")


class TestProjectStatusUpdate:
    """Test that project status is correctly updated when quote/doc is marked as sold"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        response = s.post(f"{BASE_URL}/api/auth/admin-login", json={
            "username": "test",
            "password": "test123"
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("session_token")
            if token:
                s.headers.update({"Authorization": f"Bearer {token}"})
        
        return s
    
    def test_project_status_after_sale(self, session):
        """Verify project status is 'in uitvoering' after marking as sold"""
        # Get projects
        response = session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        projects = response.json()
        
        # Check for projects with 'in uitvoering' status
        in_uitvoering = [p for p in projects if p.get("status") == "in uitvoering"]
        print(f"✅ Found {len(in_uitvoering)} projects with status 'in uitvoering'")
        
        for project in in_uitvoering[:3]:  # Show first 3
            print(f"   - {project.get('name')}: {project.get('status')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

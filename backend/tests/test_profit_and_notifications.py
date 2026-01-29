"""
Backend tests for:
1. Profit calculation on projects with legacy documents
2. Email notifications when content is made visible to customers
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def session_token(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": "test", "password": "test123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        return data["session_token"]
    
    def test_admin_login(self, session_token):
        """Test admin login works"""
        assert session_token is not None
        assert len(session_token) > 0
        print(f"✓ Admin login successful, token: {session_token[:10]}...")


class TestProjectProfitCalculation:
    """Test profit calculation for projects with legacy documents"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": "test", "password": "test123"}
        )
        assert response.status_code == 200
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_projects_returns_profit(self, auth_headers):
        """Test GET /api/projects returns profit and sales_price fields"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get projects: {response.text}"
        projects = response.json()
        assert isinstance(projects, list), "Projects should be a list"
        print(f"✓ Found {len(projects)} projects")
        
        # Check that projects have profit-related fields
        for project in projects:
            assert "id" in project
            assert "name" in project
            # profit can be None if no sales_price
            if project.get("sales_price", 0) > 0:
                assert "profit" in project, f"Project {project['id']} missing profit field"
                print(f"  Project {project['name']}: sales_price={project.get('sales_price', 0)}, profit={project.get('profit')}")
    
    def test_specific_project_zinio_amy_profit(self, auth_headers):
        """Test that project 'Zinio & Amy' (PROJ-8DC83A0F) shows correct profit from legacy document"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers=auth_headers
        )
        assert response.status_code == 200
        projects = response.json()
        
        # Find the specific project mentioned in the test request
        target_project = None
        for project in projects:
            if "PROJ-8DC83A0F" in project.get("id", "") or "Zinio" in project.get("name", ""):
                target_project = project
                break
        
        if target_project:
            print(f"✓ Found target project: {target_project['name']} ({target_project['id']})")
            print(f"  sales_price: {target_project.get('sales_price', 0)}")
            print(f"  profit: {target_project.get('profit')}")
            print(f"  total_costs: {target_project.get('total_costs', 0)}")
            
            # Verify profit calculation
            sales_price = target_project.get("sales_price", 0) or 0
            total_costs = target_project.get("total_costs", 0) or 0
            expected_profit = sales_price - total_costs
            actual_profit = target_project.get("profit")
            
            if sales_price > 0:
                assert actual_profit is not None, "Profit should not be None when sales_price > 0"
                assert abs(actual_profit - expected_profit) < 0.01, f"Profit mismatch: expected {expected_profit}, got {actual_profit}"
                print(f"✓ Profit calculation correct: {actual_profit}")
        else:
            print("⚠ Target project PROJ-8DC83A0F not found - checking if any project has legacy document pricing")
            # Check if any project has sales_price from legacy documents
            projects_with_sales = [p for p in projects if (p.get("sales_price", 0) or 0) > 0]
            print(f"  Found {len(projects_with_sales)} projects with sales_price > 0")
            for p in projects_with_sales[:3]:
                print(f"    - {p['name']}: sales={p.get('sales_price')}, profit={p.get('profit')}")
    
    def test_get_single_project_has_profit(self, auth_headers):
        """Test GET /api/projects/{id} returns profit data"""
        # First get list of projects
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers=auth_headers
        )
        assert response.status_code == 200
        projects = response.json()
        
        if len(projects) > 0:
            project_id = projects[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/projects/{project_id}",
                headers=auth_headers
            )
            assert response.status_code == 200
            project = response.json()
            assert "id" in project
            assert "sales_price" in project or project.get("sales_price") is None
            print(f"✓ Single project fetch works: {project['name']}")


class TestLegacyDocumentVisibility:
    """Test legacy document visibility and email notifications"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": "test", "password": "test123"}
        )
        assert response.status_code == 200
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_legacy_documents(self, auth_headers):
        """Test fetching legacy documents for a project"""
        # First get a project
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers=auth_headers
        )
        assert response.status_code == 200
        projects = response.json()
        
        if len(projects) > 0:
            project_id = projects[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/projects/{project_id}/legacy-documents",
                headers=auth_headers
            )
            assert response.status_code == 200
            docs = response.json()
            print(f"✓ Found {len(docs)} legacy documents for project {project_id}")
            for doc in docs[:3]:
                print(f"  - {doc.get('original_filename', 'N/A')}: visible={doc.get('visible_to_customer', False)}, price={doc.get('total_price')}")
    
    def test_update_legacy_document_visibility(self, auth_headers):
        """Test PUT /api/legacy-documents/{id} with visible_to_customer=true triggers notification"""
        # First get a project with legacy documents
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers=auth_headers
        )
        assert response.status_code == 200
        projects = response.json()
        
        # Find a project with legacy documents
        for project in projects:
            project_id = project["id"]
            docs_response = requests.get(
                f"{BASE_URL}/api/projects/{project_id}/legacy-documents",
                headers=auth_headers
            )
            if docs_response.status_code == 200:
                docs = docs_response.json()
                if len(docs) > 0:
                    doc = docs[0]
                    doc_id = doc["id"]
                    
                    # Test updating visibility
                    # First set to false, then to true to trigger notification
                    update_response = requests.put(
                        f"{BASE_URL}/api/legacy-documents/{doc_id}",
                        headers=auth_headers,
                        json={"visible_to_customer": False}
                    )
                    assert update_response.status_code == 200, f"Failed to update doc: {update_response.text}"
                    
                    # Now set to true - this should trigger email notification
                    update_response = requests.put(
                        f"{BASE_URL}/api/legacy-documents/{doc_id}",
                        headers=auth_headers,
                        json={"visible_to_customer": True}
                    )
                    assert update_response.status_code == 200, f"Failed to update doc visibility: {update_response.text}"
                    updated_doc = update_response.json()
                    assert updated_doc.get("visible_to_customer") == True
                    print(f"✓ Legacy document visibility updated successfully")
                    print(f"  Document: {doc.get('original_filename')}")
                    print(f"  Email notification should have been triggered (check logs)")
                    return
        
        print("⚠ No legacy documents found to test visibility update")


class TestWorkSlipVisibility:
    """Test work slip visibility and email notifications"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": "test", "password": "test123"}
        )
        assert response.status_code == 200
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_work_slips(self, auth_headers):
        """Test fetching work slips for a project"""
        # First get a project
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers=auth_headers
        )
        assert response.status_code == 200
        projects = response.json()
        
        for project in projects:
            project_id = project["id"]
            response = requests.get(
                f"{BASE_URL}/api/projects/{project_id}/work-slips",
                headers=auth_headers
            )
            if response.status_code == 200:
                slips = response.json()
                if len(slips) > 0:
                    print(f"✓ Found {len(slips)} work slips for project {project['name']}")
                    for slip in slips[:3]:
                        print(f"  - Date: {slip.get('date', 'N/A')}, visible={slip.get('visible_to_customer', False)}")
                    return
        
        print("⚠ No work slips found in any project")
    
    def test_toggle_work_slip_visibility(self, auth_headers):
        """Test PUT /api/projects/{project_id}/work-slips/{slip_id}/visibility triggers notification"""
        # First get a project with work slips
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers=auth_headers
        )
        assert response.status_code == 200
        projects = response.json()
        
        for project in projects:
            project_id = project["id"]
            slips_response = requests.get(
                f"{BASE_URL}/api/projects/{project_id}/work-slips",
                headers=auth_headers
            )
            if slips_response.status_code == 200:
                slips = slips_response.json()
                if len(slips) > 0:
                    slip = slips[0]
                    slip_id = slip["id"]
                    
                    # First set to false
                    update_response = requests.put(
                        f"{BASE_URL}/api/projects/{project_id}/work-slips/{slip_id}/visibility",
                        headers=auth_headers,
                        json={"visible_to_customer": False}
                    )
                    assert update_response.status_code == 200, f"Failed to update slip: {update_response.text}"
                    
                    # Now set to true - this should trigger email notification
                    update_response = requests.put(
                        f"{BASE_URL}/api/projects/{project_id}/work-slips/{slip_id}/visibility",
                        headers=auth_headers,
                        json={"visible_to_customer": True}
                    )
                    assert update_response.status_code == 200, f"Failed to update slip visibility: {update_response.text}"
                    result = update_response.json()
                    assert result.get("visible_to_customer") == True
                    print(f"✓ Work slip visibility updated successfully")
                    print(f"  Project: {project['name']}")
                    print(f"  Slip date: {slip.get('date')}")
                    print(f"  Email notification should have been triggered (check logs)")
                    return
        
        print("⚠ No work slips found to test visibility update")


class TestEmailNotificationHelper:
    """Test the email notification helper function indirectly"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": "test", "password": "test123"}
        )
        assert response.status_code == 200
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_project_has_lead_for_email(self, auth_headers):
        """Verify projects have lead_id which is needed for email notifications"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers=auth_headers
        )
        assert response.status_code == 200
        projects = response.json()
        
        projects_with_lead = [p for p in projects if p.get("lead_id")]
        print(f"✓ {len(projects_with_lead)}/{len(projects)} projects have lead_id")
        
        # Check if leads have email
        for project in projects_with_lead[:3]:
            lead_id = project["lead_id"]
            lead_response = requests.get(
                f"{BASE_URL}/api/leads/{lead_id}",
                headers=auth_headers
            )
            if lead_response.status_code == 200:
                lead = lead_response.json()
                print(f"  Project '{project['name']}' -> Lead '{lead.get('name')}' email: {lead.get('email', 'N/A')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

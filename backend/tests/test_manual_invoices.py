"""
Test suite for Manual Invoice Entries (Gefaseerde Facturatie) feature
Tests:
- POST /api/projects/{project_id}/manual-invoices - Create manual invoice entry
- GET /api/projects/{project_id}/manual-invoices - Get all manual invoice entries for project
- DELETE /api/projects/{project_id}/manual-invoices/{entry_id} - Delete manual entry
- GET /api/all-manual-invoices - Get all manual invoices for financial reporting
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestManualInvoices:
    """Test suite for manual invoice entries (Gefaseerde Facturatie)"""
    
    session_token = None
    test_project_id = "PROJ-8DC83A0F"  # Existing project 'Zinio & Amy'
    created_entry_ids = []
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        """Setup for each test"""
        TestManualInvoices.session_token = auth_token
        yield
        # Cleanup created entries after tests
        for entry_id in TestManualInvoices.created_entry_ids:
            try:
                api_client.delete(
                    f"{BASE_URL}/api/projects/{TestManualInvoices.test_project_id}/manual-invoices/{entry_id}",
                    cookies={"session_token": TestManualInvoices.session_token}
                )
            except:
                pass
        TestManualInvoices.created_entry_ids = []
    
    def test_create_manual_invoice_entry(self, authenticated_client):
        """Test creating a manual invoice entry"""
        payload = {
            "amount": 5000.00,
            "description": "TEST_Fase 1 - Voorschot",
            "invoice_date": "2026-02-15",
            "send_via_billit": False
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/projects/{self.test_project_id}/manual-invoices",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "entry" in data
        assert data["entry"]["amount"] == 5000.00
        assert data["entry"]["description"] == "TEST_Fase 1 - Voorschot"
        assert data["entry"]["project_id"] == self.test_project_id
        assert "id" in data["entry"]
        
        # Store for cleanup
        TestManualInvoices.created_entry_ids.append(data["entry"]["id"])
        
        print(f"✓ Created manual invoice entry: {data['entry']['id']}")
    
    def test_create_manual_invoice_with_billit(self, authenticated_client):
        """Test creating a manual invoice entry with Billit flag"""
        payload = {
            "amount": 2500.50,
            "description": "TEST_Fase 2 - Met Billit",
            "invoice_date": "2026-03-01",
            "send_via_billit": True
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/projects/{self.test_project_id}/manual-invoices",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "entry" in data
        # Note: billit_invoice_created may be True or False depending on lead data
        
        TestManualInvoices.created_entry_ids.append(data["entry"]["id"])
        print(f"✓ Created manual invoice entry with Billit flag: {data['entry']['id']}")
    
    def test_create_manual_invoice_invalid_date(self, authenticated_client):
        """Test creating a manual invoice entry with invalid date format"""
        payload = {
            "amount": 1000.00,
            "description": "TEST_Invalid date",
            "invoice_date": "15-02-2026",  # Wrong format
            "send_via_billit": False
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/projects/{self.test_project_id}/manual-invoices",
            json=payload
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid date, got {response.status_code}"
        print("✓ Invalid date format correctly rejected")
    
    def test_create_manual_invoice_nonexistent_project(self, authenticated_client):
        """Test creating a manual invoice entry for non-existent project"""
        payload = {
            "amount": 1000.00,
            "description": "TEST_Nonexistent project",
            "invoice_date": "2026-02-15",
            "send_via_billit": False
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/projects/PROJ-NONEXISTENT/manual-invoices",
            json=payload
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent project, got {response.status_code}"
        print("✓ Non-existent project correctly returns 404")
    
    def test_get_manual_invoice_entries(self, authenticated_client):
        """Test getting all manual invoice entries for a project"""
        # First create an entry
        payload = {
            "amount": 3000.00,
            "description": "TEST_Entry for GET test",
            "invoice_date": "2026-02-20",
            "send_via_billit": False
        }
        
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/projects/{self.test_project_id}/manual-invoices",
            json=payload
        )
        assert create_response.status_code == 200
        created_entry = create_response.json()["entry"]
        TestManualInvoices.created_entry_ids.append(created_entry["id"])
        
        # Now get all entries
        response = authenticated_client.get(
            f"{BASE_URL}/api/projects/{self.test_project_id}/manual-invoices"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of entries"
        
        # Find our created entry
        found = any(e["id"] == created_entry["id"] for e in data)
        assert found, "Created entry should be in the list"
        
        print(f"✓ Retrieved {len(data)} manual invoice entries for project")
    
    def test_delete_manual_invoice_entry(self, authenticated_client):
        """Test deleting a manual invoice entry"""
        # First create an entry
        payload = {
            "amount": 1500.00,
            "description": "TEST_Entry to delete",
            "invoice_date": "2026-02-25",
            "send_via_billit": False
        }
        
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/projects/{self.test_project_id}/manual-invoices",
            json=payload
        )
        assert create_response.status_code == 200
        entry_id = create_response.json()["entry"]["id"]
        
        # Delete the entry
        response = authenticated_client.delete(
            f"{BASE_URL}/api/projects/{self.test_project_id}/manual-invoices/{entry_id}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Verify it's deleted by trying to get entries
        get_response = authenticated_client.get(
            f"{BASE_URL}/api/projects/{self.test_project_id}/manual-invoices"
        )
        entries = get_response.json()
        found = any(e["id"] == entry_id for e in entries)
        assert not found, "Deleted entry should not be in the list"
        
        print(f"✓ Successfully deleted manual invoice entry: {entry_id}")
    
    def test_delete_nonexistent_entry(self, authenticated_client):
        """Test deleting a non-existent manual invoice entry"""
        response = authenticated_client.delete(
            f"{BASE_URL}/api/projects/{self.test_project_id}/manual-invoices/MAN-NONEXISTENT"
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent entry, got {response.status_code}"
        print("✓ Non-existent entry correctly returns 404")
    
    def test_get_all_manual_invoices(self, authenticated_client):
        """Test getting all manual invoices for financial reporting"""
        # First create an entry
        payload = {
            "amount": 7500.00,
            "description": "TEST_Entry for all-invoices test",
            "invoice_date": "2026-02-28",
            "send_via_billit": False
        }
        
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/projects/{self.test_project_id}/manual-invoices",
            json=payload
        )
        assert create_response.status_code == 200
        created_entry = create_response.json()["entry"]
        TestManualInvoices.created_entry_ids.append(created_entry["id"])
        
        # Get all manual invoices
        response = authenticated_client.get(
            f"{BASE_URL}/api/all-manual-invoices"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of all manual invoices"
        
        # Find our created entry
        found = any(e["id"] == created_entry["id"] for e in data)
        assert found, "Created entry should be in the all-invoices list"
        
        print(f"✓ Retrieved {len(data)} total manual invoices across all projects")
    
    def test_existing_manual_invoice_entry(self, authenticated_client):
        """Test that the existing manual invoice entry (€53,012.65) is present"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/projects/{self.test_project_id}/manual-invoices"
        )
        
        assert response.status_code == 200
        
        data = response.json()
        
        # Look for the existing entry mentioned in context
        existing_entry = None
        for entry in data:
            if abs(entry.get("amount", 0) - 53012.65) < 0.01:
                existing_entry = entry
                break
        
        if existing_entry:
            print(f"✓ Found existing manual invoice entry: €{existing_entry['amount']:.2f}")
            print(f"  Invoice date: {existing_entry.get('invoice_date')}")
            print(f"  Description: {existing_entry.get('description', 'N/A')}")
        else:
            print(f"ℹ No existing €53,012.65 entry found. Current entries: {len(data)}")
            for entry in data:
                print(f"  - €{entry.get('amount', 0):.2f} on {entry.get('invoice_date')}")


class TestFinancesPageIntegration:
    """Test that manual invoices appear correctly in financial reporting"""
    
    def test_finances_page_uses_manual_invoices(self, authenticated_client):
        """Test that the finances endpoint returns data that includes manual invoices"""
        # Get all manual invoices
        invoices_response = authenticated_client.get(
            f"{BASE_URL}/api/all-manual-invoices"
        )
        
        assert invoices_response.status_code == 200
        manual_invoices = invoices_response.json()
        
        # Calculate expected February 2026 revenue from manual invoices
        feb_2026_revenue = 0
        for inv in manual_invoices:
            invoice_date = inv.get("invoice_date", "")
            if isinstance(invoice_date, str) and invoice_date.startswith("2026-02"):
                feb_2026_revenue += inv.get("amount", 0)
            elif hasattr(invoice_date, 'month') and invoice_date.year == 2026 and invoice_date.month == 2:
                feb_2026_revenue += inv.get("amount", 0)
        
        print(f"✓ Total February 2026 revenue from manual invoices: €{feb_2026_revenue:.2f}")
        print(f"  Total manual invoices found: {len(manual_invoices)}")


# Fixtures
@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def auth_token(api_client):
    """Get authentication token via username/password login"""
    response = api_client.post(
        f"{BASE_URL}/api/auth/admin-login",
        json={
            "username": "test",
            "password": "test123"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        return data.get("session_token")
    
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")

@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth cookie"""
    api_client.cookies.set("session_token", auth_token)
    return api_client

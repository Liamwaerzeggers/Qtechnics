"""
Multi-Tenant Platform Tests
Tests for: Realtors, Investors, Subcontractors, Properties, Rooms, Renovation Calculator
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "test"
ADMIN_PASSWORD = "test123"
REALTOR_USERNAME = "immogent"
REALTOR_PASSWORD = "test123"


class TestAdminLogin:
    """Test admin login functionality"""
    
    def test_admin_login_success(self):
        """Admin can login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert "session_token" in data
        assert data["user"]["role"] == "admin"
        return data["session_token"]


class TestRealtorManagement:
    """Test realtor CRUD operations (admin only)"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    def test_create_realtor(self, admin_session):
        """Admin can create a new realtor"""
        unique_id = str(uuid.uuid4())[:8]
        realtor_data = {
            "company_name": f"TEST_Makelaar_{unique_id}",
            "contact_name": f"Test Contact {unique_id}",
            "email": f"test_{unique_id}@makelaar.be",
            "phone": "0471234567",
            "username": f"test_realtor_{unique_id}",
            "password": "testpass123"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/realtors",
            json=realtor_data,
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Create realtor failed: {response.text}"
        data = response.json()
        assert "realtor_id" in data
        assert "username" in data
        assert data["username"] == realtor_data["username"]
        
        # Cleanup - delete the realtor
        delete_response = requests.delete(
            f"{BASE_URL}/api/realtors/{data['realtor_id']}",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert delete_response.status_code == 200
    
    def test_get_realtors(self, admin_session):
        """Admin can list all realtors"""
        response = requests.get(
            f"{BASE_URL}/api/realtors",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Get realtors failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)


class TestInvestorManagement:
    """Test investor CRUD operations (admin only)"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    def test_create_investor(self, admin_session):
        """Admin can create a new investor"""
        unique_id = str(uuid.uuid4())[:8]
        investor_data = {
            "name": f"TEST_Investor_{unique_id}",
            "email": f"test_{unique_id}@investor.be",
            "phone": "0471234567",
            "username": f"test_investor_{unique_id}",
            "password": "testpass123",
            "target_roi": 12.5
        }
        
        response = requests.post(
            f"{BASE_URL}/api/investors",
            json=investor_data,
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Create investor failed: {response.text}"
        data = response.json()
        assert "investor_id" in data
        assert "username" in data
        assert data["username"] == investor_data["username"]
    
    def test_get_investors(self, admin_session):
        """Admin can list all investors"""
        response = requests.get(
            f"{BASE_URL}/api/investors",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Get investors failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)


class TestSubcontractorManagement:
    """Test subcontractor CRUD operations (admin only)"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    def test_create_subcontractor(self, admin_session):
        """Admin can create a new subcontractor"""
        unique_id = str(uuid.uuid4())[:8]
        subcontractor_data = {
            "company_name": f"TEST_Dakwerken_{unique_id}",
            "contact_name": f"Test Dakwerker {unique_id}",
            "email": f"test_{unique_id}@dakwerken.be",
            "phone": "0471234567",
            "vat_number": "BE0123456789",
            "category": "dak"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/subcontractors",
            json=subcontractor_data,
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Create subcontractor failed: {response.text}"
        data = response.json()
        assert "subcontractor_id" in data
        assert "message" in data
    
    def test_get_subcontractors(self, admin_session):
        """Admin can list all subcontractors"""
        response = requests.get(
            f"{BASE_URL}/api/subcontractors",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Get subcontractors failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)


class TestTenantLogin:
    """Test tenant (realtor/investor) login"""
    
    def test_realtor_login_success(self):
        """Realtor can login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/tenant/login",
            params={"username": REALTOR_USERNAME, "password": REALTOR_PASSWORD}
        )
        
        assert response.status_code == 200, f"Realtor login failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert "session_token" in data
        assert data["user"]["role"] == "realtor"
        return data["session_token"]
    
    def test_realtor_login_invalid_credentials(self):
        """Realtor login fails with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/tenant/login",
            params={"username": "invalid_user", "password": "wrongpass"}
        )
        
        assert response.status_code == 401


class TestPropertyManagement:
    """Test property CRUD operations"""
    
    @pytest.fixture
    def realtor_session(self):
        """Get realtor session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/tenant/login",
            params={"username": REALTOR_USERNAME, "password": REALTOR_PASSWORD}
        )
        assert response.status_code == 200, f"Realtor login failed: {response.text}"
        return response.json()["session_token"]
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    def test_realtor_create_property(self, realtor_session):
        """Realtor can create a new property (or hits limit)"""
        unique_id = str(uuid.uuid4())[:8]
        property_data = {
            "address": f"TEST_Teststraat {unique_id}",
            "postal_code": "9000",
            "city": "Gent",
            "living_area": 150.0,
            "plot_area": 200.0,
            "bedrooms": 3,
            "bathrooms": 2,
            "construction_year": 1990,
            "epc_score": "D",
            "epc_value": 350.0,
            "asking_price": 350000.0,
            "rooms": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/properties",
            json=property_data,
            headers={"Authorization": f"Bearer {realtor_session}"}
        )
        
        # Either succeeds (200) or hits property limit (403)
        assert response.status_code in [200, 403], f"Unexpected status: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "property_id" in data
        else:
            # Property limit reached - this is expected behavior
            assert "limiet" in response.json().get("detail", "").lower()
    
    def test_realtor_get_own_properties(self, realtor_session):
        """Realtor can view their own properties"""
        response = requests.get(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {realtor_session}"}
        )
        
        assert response.status_code == 200, f"Get properties failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Verify tenant isolation - all properties should belong to this realtor
        for prop in data:
            assert prop.get("owner_type") == "realtor"
    
    def test_admin_can_see_all_properties(self, admin_session):
        """Admin can see all properties"""
        response = requests.get(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Get properties failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)


class TestPropertyRooms:
    """Test adding rooms to properties"""
    
    @pytest.fixture
    def realtor_session(self):
        """Get realtor session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/tenant/login",
            params={"username": REALTOR_USERNAME, "password": REALTOR_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    def test_existing_property_has_rooms(self, realtor_session):
        """Verify existing property has rooms with correct area calculations"""
        # Get existing property (PROP-5398B857)
        response = requests.get(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {realtor_session}"}
        )
        assert response.status_code == 200
        properties = response.json()
        
        # Find property with rooms
        property_with_rooms = None
        for prop in properties:
            if len(prop.get("rooms", [])) > 0:
                property_with_rooms = prop
                break
        
        assert property_with_rooms is not None, "No property with rooms found"
        
        # Verify room area calculations
        for room in property_with_rooms["rooms"]:
            length = room.get("length", 0)
            width = room.get("width", 0)
            height = room.get("height", 2.7)
            
            expected_floor_area = length * width
            expected_wall_area = 2 * (length + width) * height
            
            assert room.get("floor_area") == expected_floor_area, f"Floor area mismatch for {room['name']}"
            # Wall area might have floating point differences
            assert abs(room.get("wall_area", 0) - expected_wall_area) < 0.01, f"Wall area mismatch for {room['name']}"


class TestRenovationCalculator:
    """Test renovation calculation functionality"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    @pytest.fixture
    def realtor_session(self):
        """Get realtor session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/tenant/login",
            params={"username": REALTOR_USERNAME, "password": REALTOR_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    def test_get_existing_calculation(self, realtor_session):
        """Test getting an existing renovation calculation"""
        # First get properties to find one with a calculation
        response = requests.get(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {realtor_session}"}
        )
        assert response.status_code == 200
        properties = response.json()
        
        # Find a property with a calculation
        property_with_calc = None
        for prop in properties:
            if prop.get("renovation_calculation_id"):
                property_with_calc = prop
                break
        
        if property_with_calc:
            calc_response = requests.get(
                f"{BASE_URL}/api/properties/{property_with_calc['id']}/calculation",
                headers={"Authorization": f"Bearer {realtor_session}"}
            )
            assert calc_response.status_code == 200
            calc_data = calc_response.json()
            assert "total_realistic" in calc_data
    
    def test_existing_calculation_has_correct_structure(self, realtor_session):
        """Verify existing renovation calculation has correct structure"""
        # Get properties to find one with calculation
        response = requests.get(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {realtor_session}"}
        )
        assert response.status_code == 200
        properties = response.json()
        
        # Find property with calculation
        property_with_calc = None
        for prop in properties:
            if prop.get("renovation_calculation_id"):
                property_with_calc = prop
                break
        
        if property_with_calc:
            calc_response = requests.get(
                f"{BASE_URL}/api/properties/{property_with_calc['id']}/calculation",
                headers={"Authorization": f"Bearer {realtor_session}"}
            )
            assert calc_response.status_code == 200
            calc_data = calc_response.json()
            
            # Verify calculation structure
            assert "total_realistic" in calc_data
            assert "total_min" in calc_data
            assert "total_max" in calc_data
            assert "room_calculations" in calc_data
            
            # Verify min < realistic < max
            assert calc_data["total_min"] <= calc_data["total_realistic"]
            assert calc_data["total_realistic"] <= calc_data["total_max"]


class TestWorkItemLabels:
    """Test work item component labels for renovation calculator"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    def test_get_work_items(self, admin_session):
        """Admin can get work items"""
        response = requests.get(
            f"{BASE_URL}/api/work-items",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        assert response.status_code == 200, f"Get work items failed: {response.text}"
        data = response.json()
        # API returns object with total and work_items keys
        assert "work_items" in data or isinstance(data, list)
        if "work_items" in data:
            assert isinstance(data["work_items"], list)
    
    def test_update_work_item_label_invalid(self, admin_session):
        """Invalid component label is rejected"""
        # First get a work item
        response = requests.get(
            f"{BASE_URL}/api/work-items",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            work_items = data.get("work_items", data) if isinstance(data, dict) else data
            
            if len(work_items) > 0:
                work_item_id = work_items[0]["id"]
                
                # Try to set invalid label
                label_response = requests.put(
                    f"{BASE_URL}/api/work-items/{work_item_id}/label",
                    params={"component_label": "invalid_label", "room_types": "all"},
                    headers={"Authorization": f"Bearer {admin_session}"}
                )
                
                assert label_response.status_code == 400


class TestTenantIsolation:
    """Test that tenants can only see their own data"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    @pytest.fixture
    def realtor_session(self):
        """Get realtor session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/tenant/login",
            params={"username": REALTOR_USERNAME, "password": REALTOR_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    def test_realtor_cannot_access_admin_endpoints(self, realtor_session):
        """Realtor cannot access admin-only endpoints"""
        # Try to create a realtor (admin only)
        response = requests.post(
            f"{BASE_URL}/api/realtors",
            json={
                "company_name": "Unauthorized",
                "contact_name": "Test",
                "email": "test@test.be",
                "phone": "0471234567",
                "username": "unauthorized",
                "password": "test123"
            },
            headers={"Authorization": f"Bearer {realtor_session}"}
        )
        
        assert response.status_code == 403
    
    def test_realtor_only_sees_own_properties(self, realtor_session, admin_session):
        """Realtor only sees their own properties, not admin's"""
        # Get realtor's properties
        realtor_props = requests.get(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {realtor_session}"}
        )
        assert realtor_props.status_code == 200
        
        # All properties should belong to this realtor
        for prop in realtor_props.json():
            assert prop.get("owner_type") == "realtor"


# Cleanup test data
class TestCleanup:
    """Cleanup test data created during tests"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    def test_cleanup_test_properties(self, admin_session):
        """Clean up TEST_ prefixed properties"""
        response = requests.get(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        if response.status_code == 200:
            for prop in response.json():
                if prop.get("address", "").startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/properties/{prop['id']}",
                        headers={"Authorization": f"Bearer {admin_session}"}
                    )
        
        assert True  # Cleanup always passes

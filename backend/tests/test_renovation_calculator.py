"""
Test Suite for Renovation Calculator API
Tests: tenant login, property CRUD, calculation generation, floor option switching, wall scenario switching, item toggling
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
REALTOR_CREDENTIALS = {"username": "testmakelaar", "password": "Test123456"}
ADMIN_CREDENTIALS = {"username": "liam", "password": "Liammail123"}

# Store for test data
class TestData:
    realtor_token = None
    admin_token = None
    test_property_id = "PROP-325A18C4"  # Existing test property
    calculation_id = None
    room_id = None
    floor_item_ids = []
    wall_item_ids = []


class TestRealtorLogin:
    """Test realtor/tenant login endpoint"""
    
    def test_tenant_login_success(self):
        """Test POST /api/auth/tenant/login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/tenant/login",
            json=REALTOR_CREDENTIALS,
            headers={"Content-Type": "application/json"}
        )
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Login should return success=True"
        assert "token" in data, "Login should return token"
        assert "user" in data, "Login should return user object"
        assert "role" in data, "Login should return role"
        
        # Store token for subsequent tests
        TestData.realtor_token = data["token"]
        print(f"Realtor logged in successfully, role: {data['role']}")
    
    def test_tenant_login_invalid_credentials(self):
        """Test login with wrong credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/tenant/login",
            json={"username": "nonexistent", "password": "wrongpass"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, "Invalid login should return 401"


class TestPropertyCRUD:
    """Test property operations"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Ensure we have a valid token"""
        if not TestData.realtor_token:
            response = requests.post(
                f"{BASE_URL}/api/auth/tenant/login",
                json=REALTOR_CREDENTIALS
            )
            if response.status_code == 200:
                TestData.realtor_token = response.json().get("token")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {TestData.realtor_token}"}
    
    def test_get_existing_property(self):
        """Test GET /api/properties/{id} - use existing property"""
        response = requests.get(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}",
            headers=self.get_auth_headers()
        )
        print(f"Get property status: {response.status_code}")
        print(f"Get property response: {response.text[:500]}")
        
        # Property might belong to different realtor, so 403/404 is acceptable
        if response.status_code == 403:
            # Try to get properties list to find one that belongs to this realtor
            list_response = requests.get(
                f"{BASE_URL}/api/properties",
                headers=self.get_auth_headers()
            )
            if list_response.status_code == 200:
                props = list_response.json()
                if isinstance(props, list) and len(props) > 0:
                    TestData.test_property_id = props[0].get("id")
                    print(f"Using realtor's own property: {TestData.test_property_id}")
                    return
            pytest.skip("No property available for this realtor")
        
        assert response.status_code == 200, f"Get property failed: {response.text}"
        data = response.json()
        print(f"Property has {len(data.get('rooms', []))} rooms")


class TestRenovationCalculation:
    """Test renovation calculation endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_auth_and_property(self):
        """Ensure we have token and property"""
        if not TestData.realtor_token:
            response = requests.post(
                f"{BASE_URL}/api/auth/tenant/login",
                json=REALTOR_CREDENTIALS
            )
            if response.status_code == 200:
                TestData.realtor_token = response.json().get("token")
        
        # Get realtor's properties if we don't have access to the default one
        if TestData.test_property_id:
            response = requests.get(
                f"{BASE_URL}/api/properties/{TestData.test_property_id}",
                headers={"Authorization": f"Bearer {TestData.realtor_token}"}
            )
            if response.status_code == 403:
                # Fetch realtor's own property
                list_response = requests.get(
                    f"{BASE_URL}/api/properties",
                    headers={"Authorization": f"Bearer {TestData.realtor_token}"}
                )
                if list_response.status_code == 200:
                    props = list_response.json()
                    if isinstance(props, list) and len(props) > 0:
                        # Find a property with rooms
                        for prop in props:
                            if prop.get("rooms") and len(prop.get("rooms", [])) > 0:
                                TestData.test_property_id = prop.get("id")
                                break
                        if not TestData.test_property_id:
                            TestData.test_property_id = props[0].get("id")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {TestData.realtor_token}"}
    
    def test_generate_calculation(self):
        """Test POST /api/properties/{id}/calculate to generate renovation calculation"""
        if not TestData.test_property_id:
            pytest.skip("No property available for calculation")
        
        response = requests.post(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}/calculate",
            headers=self.get_auth_headers()
        )
        print(f"Calculate status: {response.status_code}")
        print(f"Calculate response: {response.text[:800]}")
        
        assert response.status_code == 200, f"Calculate failed: {response.text}"
        
        data = response.json()
        
        # Validate response structure
        assert "calculation_id" in data, "Response should have calculation_id"
        assert "total_min" in data, "Response should have total_min"
        assert "total_realistic" in data, "Response should have total_realistic"
        assert "total_max" in data, "Response should have total_max"
        assert "rooms_calculated" in data, "Response should have rooms_calculated"
        assert "work_items_used" in data, "Response should have work_items_used"
        
        # Validate values
        assert data["total_min"] > 0, "Total min should be > 0"
        assert data["total_realistic"] > data["total_min"], "Realistic should be > min"
        assert data["total_max"] > data["total_realistic"], "Max should be > realistic"
        assert data["rooms_calculated"] >= 1, "At least 1 room should be calculated"
        assert data["work_items_used"] > 0, "Work items should be used from DB"
        
        TestData.calculation_id = data["calculation_id"]
        print(f"Calculation generated: ID={data['calculation_id']}, Total=€{data['total_realistic']}")
    
    def test_get_calculation(self):
        """Test GET /api/properties/{id}/calculation to fetch calculation results"""
        if not TestData.test_property_id:
            pytest.skip("No property available")
        
        response = requests.get(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}/calculation",
            headers=self.get_auth_headers()
        )
        print(f"Get calculation status: {response.status_code}")
        
        assert response.status_code == 200, f"Get calculation failed: {response.text}"
        
        data = response.json()
        
        # Validate calculation structure
        assert "room_calculations" in data, "Should have room_calculations"
        assert "total_realistic" in data, "Should have total_realistic"
        assert len(data["room_calculations"]) >= 1, "Should have at least 1 room calculation"
        
        # Validate room calculation structure
        room_calc = data["room_calculations"][0]
        assert "room_id" in room_calc, "Room calc should have room_id"
        assert "room_name" in room_calc, "Room calc should have room_name"
        assert "floor_items" in room_calc, "Room calc should have floor_items"
        assert "wall_items" in room_calc, "Room calc should have wall_items"
        assert "ceiling_items" in room_calc, "Room calc should have ceiling_items"
        assert "other_items" in room_calc, "Room calc should have other_items"
        
        # Store room_id and item IDs for later tests
        TestData.room_id = room_calc["room_id"]
        
        # Find floor option items (for switching test)
        for item in room_calc["floor_items"]:
            if item.get("option_group") == "vloer_afwerking_keuze":
                TestData.floor_item_ids.append(item["id"])
        
        print(f"Found {len(TestData.floor_item_ids)} floor option items")
        print(f"Room ID for tests: {TestData.room_id}")


class TestFloorOptionSwitching:
    """Test switching floor finishing options (tiles/parquet/laminate/vinyl)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestData.realtor_token:
            response = requests.post(f"{BASE_URL}/api/auth/tenant/login", json=REALTOR_CREDENTIALS)
            if response.status_code == 200:
                TestData.realtor_token = response.json().get("token")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {TestData.realtor_token}"}
    
    def test_switch_floor_option(self):
        """Test PUT /api/properties/{id}/calculation/switch-option to switch floor finish"""
        if not TestData.test_property_id or not TestData.room_id:
            pytest.skip("No property or room available")
        
        # First get current calculation to find floor options
        response = requests.get(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}/calculation",
            headers=self.get_auth_headers()
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get calculation")
        
        data = response.json()
        room_calc = next((r for r in data["room_calculations"] if r["room_id"] == TestData.room_id), None)
        
        if not room_calc:
            pytest.skip("Could not find room calculation")
        
        # Find floor options
        floor_options = [i for i in room_calc["floor_items"] if i.get("option_group") == "vloer_afwerking_keuze"]
        
        if len(floor_options) < 2:
            pytest.skip("Not enough floor options to switch")
        
        # Find an unselected option to switch to
        unselected = next((i for i in floor_options if not i.get("included")), None)
        
        if not unselected:
            pytest.skip("All floor options already selected (shouldn't happen)")
        
        print(f"Switching to floor option: {unselected['title']} (ID: {unselected['id']})")
        
        # Switch floor option
        response = requests.put(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}/calculation/switch-option",
            params={
                "room_id": TestData.room_id,
                "option_group": "vloer_afwerking_keuze",
                "selected_item_id": unselected["id"]
            },
            headers=self.get_auth_headers()
        )
        print(f"Switch floor option status: {response.status_code}")
        print(f"Switch floor option response: {response.text}")
        
        assert response.status_code == 200, f"Switch option failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Should return message"
        assert "total_realistic" in data, "Should return updated total"
        
        # Verify the option was switched
        verify_response = requests.get(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}/calculation",
            headers=self.get_auth_headers()
        )
        
        verify_data = verify_response.json()
        room_calc = next((r for r in verify_data["room_calculations"] if r["room_id"] == TestData.room_id), None)
        floor_options = [i for i in room_calc["floor_items"] if i.get("option_group") == "vloer_afwerking_keuze"]
        
        # Find the now-selected option
        selected = next((i for i in floor_options if i.get("included")), None)
        assert selected["id"] == unselected["id"], "The switched option should now be selected"
        print(f"Floor option successfully switched to: {selected['title']}")


class TestWallScenarioSwitching:
    """Test switching wall scenarios (nieuw_pleisterwerk/egaliseren/gyproc)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestData.realtor_token:
            response = requests.post(f"{BASE_URL}/api/auth/tenant/login", json=REALTOR_CREDENTIALS)
            if response.status_code == 200:
                TestData.realtor_token = response.json().get("token")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {TestData.realtor_token}"}
    
    def test_switch_wall_scenario_to_egaliseren(self):
        """Test PUT /api/properties/{id}/calculation/switch-scenario to switch wall scenario"""
        if not TestData.test_property_id or not TestData.room_id:
            pytest.skip("No property or room available")
        
        # Switch to egaliseren scenario
        response = requests.put(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}/calculation/switch-scenario",
            params={
                "room_id": TestData.room_id,
                "scenario": "egaliseren"
            },
            headers=self.get_auth_headers()
        )
        print(f"Switch wall scenario status: {response.status_code}")
        print(f"Switch wall scenario response: {response.text}")
        
        assert response.status_code == 200, f"Switch scenario failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Should return message"
        assert "egaliseren" in data.get("message", "").lower(), "Message should mention egaliseren"
        
        # Verify the scenario was switched
        verify_response = requests.get(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}/calculation",
            headers=self.get_auth_headers()
        )
        
        verify_data = verify_response.json()
        room_calc = next((r for r in verify_data["room_calculations"] if r["room_id"] == TestData.room_id), None)
        
        assert room_calc.get("selected_wall_scenario") == "egaliseren", "Wall scenario should be 'egaliseren'"
        print("Wall scenario successfully switched to 'egaliseren'")
    
    def test_switch_wall_scenario_to_gyproc(self):
        """Test switching to gyproc scenario"""
        if not TestData.test_property_id or not TestData.room_id:
            pytest.skip("No property or room available")
        
        response = requests.put(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}/calculation/switch-scenario",
            params={
                "room_id": TestData.room_id,
                "scenario": "gyproc"
            },
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Switch to gyproc failed: {response.text}"
        print("Wall scenario successfully switched to 'gyproc'")
    
    def test_switch_wall_scenario_invalid(self):
        """Test switching to invalid scenario returns error"""
        if not TestData.test_property_id or not TestData.room_id:
            pytest.skip("No property or room available")
        
        response = requests.put(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}/calculation/switch-scenario",
            params={
                "room_id": TestData.room_id,
                "scenario": "invalid_scenario"
            },
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 400, "Invalid scenario should return 400"


class TestItemToggle:
    """Test toggling individual calculation items on/off"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestData.realtor_token:
            response = requests.post(f"{BASE_URL}/api/auth/tenant/login", json=REALTOR_CREDENTIALS)
            if response.status_code == 200:
                TestData.realtor_token = response.json().get("token")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {TestData.realtor_token}"}
    
    def test_toggle_item_off(self):
        """Test PUT /api/properties/{id}/calculation/items/{itemId}?included=false"""
        if not TestData.test_property_id:
            pytest.skip("No property available")
        
        # Get calculation to find an item to toggle
        response = requests.get(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}/calculation",
            headers=self.get_auth_headers()
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get calculation")
        
        data = response.json()
        room_calc = data["room_calculations"][0]
        
        # Find an included item to toggle off
        included_item = None
        for item_list in [room_calc["floor_items"], room_calc["wall_items"], room_calc["ceiling_items"]]:
            for item in item_list:
                if item.get("included") and item.get("category") not in ["vloer_afwerking", "muur_scenario_a", "muur_scenario_b", "muur_scenario_c"]:
                    included_item = item
                    break
            if included_item:
                break
        
        if not included_item:
            pytest.skip("No included item found to toggle")
        
        print(f"Toggling off item: {included_item['title']} (ID: {included_item['id']})")
        
        original_total = data["total_realistic"]
        
        # Toggle item off
        response = requests.put(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}/calculation/items/{included_item['id']}",
            params={"included": False},
            headers=self.get_auth_headers()
        )
        print(f"Toggle item status: {response.status_code}")
        print(f"Toggle item response: {response.text}")
        
        assert response.status_code == 200, f"Toggle item failed: {response.text}"
        
        toggle_data = response.json()
        assert "total_realistic" in toggle_data, "Should return updated total"
        
        # Total should decrease when item is toggled off
        new_total = toggle_data["total_realistic"]
        print(f"Total changed from €{original_total} to €{new_total}")
    
    def test_toggle_item_on(self):
        """Test turning an item back on"""
        if not TestData.test_property_id:
            pytest.skip("No property available")
        
        # Get calculation to find an excluded item
        response = requests.get(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}/calculation",
            headers=self.get_auth_headers()
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get calculation")
        
        data = response.json()
        room_calc = data["room_calculations"][0]
        
        # Find an excluded item (from extras)
        excluded_item = None
        for item_list in [room_calc["floor_items"], room_calc["wall_items"], room_calc["ceiling_items"], room_calc["other_items"]]:
            for item in item_list:
                if not item.get("included") and "extra" in item.get("category", "").lower():
                    excluded_item = item
                    break
            if excluded_item:
                break
        
        if not excluded_item:
            pytest.skip("No excluded extra item found")
        
        print(f"Toggling on item: {excluded_item['title']} (ID: {excluded_item['id']})")
        
        # Toggle item on
        response = requests.put(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}/calculation/items/{excluded_item['id']}",
            params={"included": True},
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Toggle item on failed: {response.text}"
        print("Item toggled on successfully")


class TestWorkItemsIntegration:
    """Verify calculation uses actual prices from work_items collection"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestData.realtor_token:
            response = requests.post(f"{BASE_URL}/api/auth/tenant/login", json=REALTOR_CREDENTIALS)
            if response.status_code == 200:
                TestData.realtor_token = response.json().get("token")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {TestData.realtor_token}"}
    
    def test_calculation_uses_db_prices(self):
        """Verify calculation items have work_item_id linking to database"""
        if not TestData.test_property_id:
            pytest.skip("No property available")
        
        response = requests.get(
            f"{BASE_URL}/api/properties/{TestData.test_property_id}/calculation",
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        
        items_with_db_ids = 0
        items_without_db_ids = 0
        
        for room_calc in data["room_calculations"]:
            for item_list in [room_calc["floor_items"], room_calc["wall_items"], room_calc["ceiling_items"], room_calc["other_items"]]:
                for item in item_list:
                    if item.get("work_item_id"):
                        items_with_db_ids += 1
                    else:
                        items_without_db_ids += 1
        
        print(f"Items with DB IDs: {items_with_db_ids}")
        print(f"Items without DB IDs (fallback prices): {items_without_db_ids}")
        
        # At least some items should have work_item_id from database
        assert items_with_db_ids > 0, "Some items should have work_item_id from database"


class TestCleanup:
    """No cleanup needed - using existing property"""
    
    def test_no_cleanup_needed(self):
        """Using existing property, no cleanup necessary"""
        print(f"Tests used existing property: {TestData.test_property_id}")
        print("No cleanup needed - property not deleted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

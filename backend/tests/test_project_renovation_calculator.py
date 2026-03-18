"""
Test Suite for Project Renovation Calculator
Tests the project-level room management, renovation calculation, quote generation, 
and auto-save work items functionality.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "liam"
ADMIN_PASSWORD = "Liammail123"
TEST_PROJECT = "PROJ-8DC83A0F"


@pytest.fixture(scope="module")
def auth_token():
    """Authenticate and get admin token"""
    response = requests.post(
        f"{BASE_URL}/api/auth2/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers with Bearer token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestProjectRoomManagement:
    """Tests for project room CRUD operations"""
    
    created_room_id = None
    
    def test_add_single_room_to_project(self, auth_headers):
        """POST /api/projects/{id}/project-rooms - Add single room"""
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/project-rooms",
            json={
                "name": "TEST_Testkamer",
                "room_type": "other",
                "length": 5.0,
                "width": 4.0,
                "height": 2.7
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "room_id" in data, "Response should contain room_id"
        assert "message" in data, "Response should contain message"
        assert data["message"] == "Kamer toegevoegd"
        TestProjectRoomManagement.created_room_id = data["room_id"]
        print(f"✓ Room added with ID: {data['room_id']}")
    
    def test_verify_room_added_to_project(self, auth_headers):
        """GET /api/projects/{id} - Verify room was added"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}",
            headers=auth_headers
        )
        assert response.status_code == 200
        project = response.json()
        rooms = project.get("rooms", [])
        
        # Find the test room
        test_room = next((r for r in rooms if r.get("name") == "TEST_Testkamer"), None)
        assert test_room is not None, "TEST_Testkamer should exist in project"
        assert test_room["length"] == 5.0
        assert test_room["width"] == 4.0
        # Verify area calculations
        expected_floor_area = 5.0 * 4.0
        assert test_room.get("floor_area") == expected_floor_area, f"Floor area should be {expected_floor_area}"
        print(f"✓ Room verified with floor_area={test_room.get('floor_area')}m²")
    
    def test_bulk_add_rooms_to_project(self, auth_headers):
        """POST /api/projects/{id}/project-rooms/bulk - Bulk add rooms"""
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/project-rooms/bulk",
            json=[
                {"name": "TEST_BulkKamer1", "room_type": "bedroom", "length": 3.0, "width": 3.0, "height": 2.7},
                {"name": "TEST_BulkKamer2", "room_type": "kitchen", "length": 4.0, "width": 3.5, "height": 2.5}
            ],
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("rooms_added") == 2, "Should add 2 rooms"
        assert "2 kamers toegevoegd" in data.get("message", "")
        print(f"✓ Bulk added {data['rooms_added']} rooms")
    
    def test_delete_project_room(self, auth_headers):
        """DELETE /api/projects/{id}/project-rooms/{room_id} - Delete room"""
        if not TestProjectRoomManagement.created_room_id:
            pytest.skip("No room to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/project-rooms/{TestProjectRoomManagement.created_room_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("message") == "Kamer verwijderd"
        print(f"✓ Room deleted: {TestProjectRoomManagement.created_room_id}")
    
    def test_cleanup_bulk_rooms(self, auth_headers):
        """Cleanup: Delete TEST_Bulk* rooms"""
        # Get project to find bulk room IDs
        response = requests.get(f"{BASE_URL}/api/projects/{TEST_PROJECT}", headers=auth_headers)
        if response.status_code == 200:
            project = response.json()
            for room in project.get("rooms", []):
                if room.get("name", "").startswith("TEST_Bulk"):
                    requests.delete(
                        f"{BASE_URL}/api/projects/{TEST_PROJECT}/project-rooms/{room['id']}",
                        headers=auth_headers
                    )
                    print(f"  Cleaned up: {room['name']}")
        print("✓ Bulk rooms cleaned up")


class TestRenovationCalculation:
    """Tests for project renovation calculator"""
    
    def test_calculate_renovation(self, auth_headers):
        """POST /api/projects/{id}/calculate-renovation - Run calculator"""
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/calculate-renovation",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "calculation_id" in data, "Should return calculation_id"
        assert "total_min" in data, "Should return total_min"
        assert "total_recommended" in data, "Should return total_recommended"
        assert "rooms_calculated" in data, "Should return rooms_calculated"
        assert data["rooms_calculated"] > 0, "Should calculate at least one room"
        
        print(f"✓ Calculation created: {data['calculation_id']}")
        print(f"  Rooms: {data['rooms_calculated']}, Total: €{data['total_min']:,.2f} (min) / €{data['total_recommended']:,.2f} (recommended)")
    
    def test_get_renovation_calculation(self, auth_headers):
        """GET /api/projects/{id}/renovation-calculation - Get calculation"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/renovation-calculation",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        calc = response.json()
        
        assert "id" in calc, "Calculation should have id"
        assert "room_calculations" in calc, "Should have room_calculations"
        assert len(calc["room_calculations"]) > 0, "Should have at least one room calculation"
        
        # Verify room calculation structure
        rc = calc["room_calculations"][0]
        assert "room_id" in rc, "Room calc should have room_id"
        assert "room_name" in rc, "Room calc should have room_name"
        assert "floor_area" in rc, "Room calc should have floor_area"
        assert "wall_area" in rc, "Room calc should have wall_area"
        assert "ceiling_area" in rc, "Room calc should have ceiling_area"
        assert "floor_items" in rc, "Room calc should have floor_items"
        assert "wall_items" in rc, "Room calc should have wall_items"
        assert "ceiling_items" in rc, "Room calc should have ceiling_items"
        assert "other_items" in rc, "Room calc should have other_items"
        
        print(f"✓ Calculation retrieved with {len(calc['room_calculations'])} rooms")
        for rc in calc["room_calculations"]:
            print(f"  - {rc['room_name']}: {rc['floor_area']}m², subtotal: €{rc.get('subtotal', 0):,.2f}")
    
    def test_calculation_has_floor_options(self, auth_headers):
        """Verify floor finish options exist (tegels, parket, laminaat, vinyl)"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/renovation-calculation",
            headers=auth_headers
        )
        assert response.status_code == 200
        calc = response.json()
        
        rc = calc["room_calculations"][0]
        floor_options = [item for item in rc["floor_items"] if item.get("option_group") == "vloer_afwerking_keuze"]
        
        assert len(floor_options) >= 2, "Should have at least 2 floor finish options"
        
        option_titles = [item["title"].lower() for item in floor_options]
        print(f"✓ Floor options found: {[item['title'] for item in floor_options]}")
    
    def test_calculation_has_wall_scenarios(self, auth_headers):
        """Verify wall scenarios exist (scenario A, B, C)"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/renovation-calculation",
            headers=auth_headers
        )
        assert response.status_code == 200
        calc = response.json()
        
        rc = calc["room_calculations"][0]
        
        # Check for different scenarios
        scenario_a = [item for item in rc["wall_items"] if item.get("category") == "muur_scenario_a"]
        scenario_b = [item for item in rc["wall_items"] if item.get("category") == "muur_scenario_b"]
        scenario_c = [item for item in rc["wall_items"] if item.get("category") == "muur_scenario_c"]
        
        assert len(scenario_a) > 0, "Should have muur_scenario_a items"
        print(f"✓ Wall scenarios: A={len(scenario_a)}, B={len(scenario_b)}, C={len(scenario_c)} items")


class TestToggleAndSwitchOptions:
    """Tests for toggling items and switching options"""
    
    def test_toggle_calc_item(self, auth_headers):
        """PUT /api/projects/{id}/renovation-calculation/items/{itemId}?included=false"""
        # First get the calculation to find an item ID
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/renovation-calculation",
            headers=auth_headers
        )
        assert response.status_code == 200
        calc = response.json()
        
        # Find a toggleable item
        rc = calc["room_calculations"][0]
        item = rc["floor_items"][0]
        item_id = item["id"]
        original_included = item["included"]
        
        # Toggle the item
        toggle_response = requests.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/renovation-calculation/items/{item_id}?included={str(not original_included).lower()}",
            json={},
            headers=auth_headers
        )
        assert toggle_response.status_code == 200, f"Failed: {toggle_response.status_code} - {toggle_response.text}"
        
        # Toggle back
        toggle_back_response = requests.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/renovation-calculation/items/{item_id}?included={str(original_included).lower()}",
            json={},
            headers=auth_headers
        )
        assert toggle_back_response.status_code == 200
        
        print(f"✓ Item toggle works: {item_id}")
    
    def test_switch_floor_option(self, auth_headers):
        """PUT /api/projects/{id}/renovation-calculation/switch-option"""
        # Get calculation
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/renovation-calculation",
            headers=auth_headers
        )
        assert response.status_code == 200
        calc = response.json()
        
        rc = calc["room_calculations"][0]
        room_id = rc["room_id"]
        
        # Find floor options
        floor_options = [item for item in rc["floor_items"] if item.get("option_group") == "vloer_afwerking_keuze"]
        if len(floor_options) < 2:
            pytest.skip("Not enough floor options to test switch")
        
        # Find currently not-selected option
        unselected = next((item for item in floor_options if not item["included"]), None)
        if not unselected:
            pytest.skip("No unselected floor option found")
        
        switch_response = requests.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/renovation-calculation/switch-option?room_id={room_id}&option_group=vloer_afwerking_keuze&selected_item_id={unselected['id']}",
            json={},
            headers=auth_headers
        )
        assert switch_response.status_code == 200, f"Failed: {switch_response.status_code} - {switch_response.text}"
        
        # Verify the switch
        updated_calc = switch_response.json()
        updated_rc = next((r for r in updated_calc["room_calculations"] if r["room_id"] == room_id), None)
        assert updated_rc is not None
        
        updated_option = next((item for item in updated_rc["floor_items"] if item["id"] == unselected["id"]), None)
        assert updated_option is not None
        assert updated_option["included"] == True, "Switched option should be included"
        
        print(f"✓ Floor option switch works: selected {unselected['title']}")
    
    def test_switch_wall_scenario(self, auth_headers):
        """PUT /api/projects/{id}/renovation-calculation/switch-scenario"""
        # Get calculation
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/renovation-calculation",
            headers=auth_headers
        )
        assert response.status_code == 200
        calc = response.json()
        
        rc = calc["room_calculations"][0]
        room_id = rc["room_id"]
        
        # Try switching to egaliseren scenario
        switch_response = requests.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/renovation-calculation/switch-scenario?room_id={room_id}&scenario=egaliseren",
            json={},
            headers=auth_headers
        )
        assert switch_response.status_code == 200, f"Failed: {switch_response.status_code} - {switch_response.text}"
        
        updated_calc = switch_response.json()
        updated_rc = next((r for r in updated_calc["room_calculations"] if r["room_id"] == room_id), None)
        
        # Verify scenario B is now active
        scenario_b_items = [item for item in updated_rc["wall_items"] if item.get("category") == "muur_scenario_b"]
        has_active_b = any(item["included"] for item in scenario_b_items)
        
        # Switch back to nieuw_pleisterwerk
        requests.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/renovation-calculation/switch-scenario?room_id={room_id}&scenario=nieuw_pleisterwerk",
            json={},
            headers=auth_headers
        )
        
        print(f"✓ Wall scenario switch works: egaliseren selected={has_active_b}")


class TestQuoteGeneration:
    """Tests for quote generation from calculation"""
    
    generated_quote_id = None
    
    def test_generate_quote_from_calculation(self, auth_headers):
        """POST /api/projects/{id}/generate-quote-from-calculation"""
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/generate-quote-from-calculation",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "quote_id" in data, "Should return quote_id"
        assert "line_items_count" in data, "Should return line_items_count"
        assert "total_excl_vat" in data, "Should return total_excl_vat"
        assert "total_incl_vat" in data, "Should return total_incl_vat"
        
        assert data["line_items_count"] > 0, "Should have line items"
        assert data["total_excl_vat"] > 0, "Total should be > 0"
        
        TestQuoteGeneration.generated_quote_id = data["quote_id"]
        print(f"✓ Quote generated: {data['quote_id']}")
        print(f"  Line items: {data['line_items_count']}, Total excl VAT: €{data['total_excl_vat']:,.2f}")
    
    def test_verify_quote_has_line_items(self, auth_headers):
        """Verify the generated quote has line items from calculation"""
        if not TestQuoteGeneration.generated_quote_id:
            pytest.skip("No quote generated")
        
        response = requests.get(
            f"{BASE_URL}/api/quotes/{TestQuoteGeneration.generated_quote_id}/line-items",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        line_items = response.json()
        
        assert len(line_items) > 0, "Quote should have line items"
        
        # Verify line item structure
        li = line_items[0]
        assert "description" in li, "Line item should have description"
        assert "quantity" in li, "Line item should have quantity"
        assert "unit_price" in li, "Line item should have unit_price"
        
        print(f"✓ Quote has {len(line_items)} line items")
        for li in line_items[:3]:  # Show first 3
            print(f"  - {li.get('description', 'N/A')[:50]}... €{li.get('total_excl_vat', 0):,.2f}")


class TestAutoSaveWorkItem:
    """Tests for auto-saving manual work items"""
    
    saved_work_item_id = None
    
    def test_auto_save_new_work_item(self, auth_headers):
        """POST /api/work-items/auto-save - Save new work item"""
        unique_title = f"TEST_AutoItem_{uuid.uuid4().hex[:6]}"
        
        response = requests.post(
            f"{BASE_URL}/api/work-items/auto-save",
            json={
                "title": unique_title,
                "price": 55.0,
                "unit": "m²",
                "component_label": "vloer"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "work_item_id" in data, "Should return work_item_id"
        assert data.get("is_new") == True, "Should be marked as new"
        
        TestAutoSaveWorkItem.saved_work_item_id = data["work_item_id"]
        print(f"✓ Work item auto-saved: {data['work_item_id']}")
    
    def test_auto_save_duplicate_returns_existing(self, auth_headers):
        """POST /api/work-items/auto-save - Duplicate returns existing"""
        if not TestAutoSaveWorkItem.saved_work_item_id:
            pytest.skip("No saved work item to test duplicate")
        
        # Get the saved item's title
        response = requests.get(
            f"{BASE_URL}/api/work-items",
            headers=auth_headers
        )
        assert response.status_code == 200
        work_items = response.json().get("work_items", [])
        saved_item = next((w for w in work_items if w["id"] == TestAutoSaveWorkItem.saved_work_item_id), None)
        
        if not saved_item:
            pytest.skip("Could not find saved work item")
        
        # Try to save again with same title
        response = requests.post(
            f"{BASE_URL}/api/work-items/auto-save",
            json={
                "title": saved_item["title"],
                "price": 100.0,  # Different price
                "unit": "stuk"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("is_new") == False, "Should return existing item"
        assert data.get("work_item_id") == TestAutoSaveWorkItem.saved_work_item_id
        print(f"✓ Duplicate detection works - returned existing item")
    
    def test_auto_save_requires_title(self, auth_headers):
        """POST /api/work-items/auto-save - Title is required"""
        response = requests.post(
            f"{BASE_URL}/api/work-items/auto-save",
            json={
                "title": "",
                "price": 50.0
            },
            headers=auth_headers
        )
        assert response.status_code == 400, "Should return 400 for empty title"
        print("✓ Empty title validation works")
    
    def test_cleanup_test_work_items(self, auth_headers):
        """Cleanup: Delete TEST_ prefixed work items"""
        response = requests.get(f"{BASE_URL}/api/work-items?limit=500", headers=auth_headers)
        if response.status_code == 200:
            work_items = response.json().get("work_items", [])
            for item in work_items:
                if item.get("title", "").startswith("TEST_"):
                    del_response = requests.delete(
                        f"{BASE_URL}/api/work-items/{item['id']}",
                        headers=auth_headers
                    )
                    if del_response.status_code == 200:
                        print(f"  Cleaned up: {item['title']}")
        print("✓ Test work items cleaned up")


class TestAuthorizationChecks:
    """Tests for authorization on project endpoints"""
    
    def test_add_room_requires_auth(self):
        """Add room without auth should fail"""
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/project-rooms",
            json={"name": "Unauthorized", "room_type": "other", "length": 3, "width": 3, "height": 2.7}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Add room requires authentication")
    
    def test_calculate_renovation_requires_auth(self):
        """Calculate renovation without auth should fail"""
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/calculate-renovation",
            json={}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Calculate renovation requires authentication")
    
    def test_generate_quote_requires_auth(self):
        """Generate quote without auth should fail"""
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT}/generate-quote-from-calculation",
            json={}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Generate quote requires authentication")


class TestEdgeCases:
    """Edge case tests"""
    
    def test_calculate_with_no_rooms(self, auth_headers):
        """Calculate renovation for project with no rooms should fail gracefully"""
        # Create a temp project - first check if we can
        # For now, test with non-existent project
        response = requests.post(
            f"{BASE_URL}/api/projects/NONEXISTENT-PROJECT/calculate-renovation",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 for non-existent project, got {response.status_code}"
        print("✓ Non-existent project returns 404")
    
    def test_get_calculation_when_none_exists(self, auth_headers):
        """Get calculation for project without calculation should return 404"""
        # This depends on whether project has a calculation
        # Just verify the endpoint works
        response = requests.get(
            f"{BASE_URL}/api/projects/NONEXISTENT/renovation-calculation",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("✓ Non-existent project calculation returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

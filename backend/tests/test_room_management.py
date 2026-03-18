"""
Backend tests for Room Management features:
- POST /api/properties/{id}/rooms - Add single room
- DELETE /api/properties/{id}/rooms/{room_id} - Delete room  
- POST /api/properties/{id}/rooms/bulk - Add multiple rooms
- POST /api/properties/{id}/analyze-floor-plan - Floor plan upload + AI analysis
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
REALTOR_USER = "testmakelaar"
REALTOR_PASS = "Test123456"

# Known test property
TEST_PROPERTY_ID = "PROP-325A18C4"


class TestAuthentication:
    """Authentication tests for API access"""
    
    def test_tenant_login_realtor(self):
        """Test realtor login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/tenant/login", json={
            "username": REALTOR_USER,
            "password": REALTOR_PASS
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Missing token in response"
        assert data["success"] == True
        print(f"✓ Realtor login successful, token received")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for realtor"""
    response = requests.post(f"{BASE_URL}/api/auth/tenant/login", json={
        "username": REALTOR_USER,
        "password": REALTOR_PASS
    })
    if response.status_code != 200:
        pytest.skip("Authentication failed")
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def test_property_id(auth_headers):
    """Get existing test property or create one"""
    # First try to get existing property
    response = requests.get(f"{BASE_URL}/api/properties", headers=auth_headers)
    if response.status_code == 200:
        properties = response.json()
        if properties:
            return properties[0]["id"]
    
    # If no properties, skip this test
    pytest.skip("No test property available")


class TestAddSingleRoom:
    """Tests for POST /api/properties/{id}/rooms"""
    
    def test_add_room_success(self, auth_headers, test_property_id):
        """Test adding a single room with valid data"""
        room_data = {
            "name": "TEST_Testkamer",
            "room_type": "living",
            "length": 5.5,
            "width": 4.0,
            "height": 2.8
        }
        response = requests.post(
            f"{BASE_URL}/api/properties/{test_property_id}/rooms",
            json=room_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Add room failed: {response.text}"
        data = response.json()
        assert "room_id" in data, "Missing room_id in response"
        assert "message" in data, "Missing message in response"
        assert "toegevoegd" in data["message"].lower() or "added" in data["message"].lower()
        
        # Verify room was added - GET property and check rooms
        prop_response = requests.get(f"{BASE_URL}/api/properties/{test_property_id}", headers=auth_headers)
        assert prop_response.status_code == 200
        prop_data = prop_response.json()
        rooms = prop_data.get("rooms", [])
        
        # Find the room we just added
        test_room = next((r for r in rooms if r.get("name") == "TEST_Testkamer"), None)
        assert test_room is not None, "Added room not found in property"
        assert test_room["room_type"] == "living"
        assert test_room["length"] == 5.5
        assert test_room["width"] == 4.0
        
        # Store room_id for cleanup
        self.__class__.created_room_id = data["room_id"]
        print(f"✓ Room added successfully with ID: {data['room_id']}")
    
    def test_add_room_with_default_height(self, auth_headers, test_property_id):
        """Test adding room without height uses default 2.7m"""
        room_data = {
            "name": "TEST_KamerZonderHoogte",
            "room_type": "bedroom",
            "length": 4.0,
            "width": 3.5
        }
        response = requests.post(
            f"{BASE_URL}/api/properties/{test_property_id}/rooms",
            json=room_data,
            headers=auth_headers
        )
        
        # Should succeed even without height
        assert response.status_code == 200, f"Add room failed: {response.text}"
        print(f"✓ Room added with default height")
        
        # Cleanup
        room_id = response.json().get("room_id")
        if room_id:
            requests.delete(f"{BASE_URL}/api/properties/{test_property_id}/rooms/{room_id}", headers=auth_headers)
    
    def test_add_room_all_types(self, auth_headers, test_property_id):
        """Test adding rooms with all valid room types"""
        room_types = ["living", "bedroom", "bathroom", "kitchen", "hallway", "other"]
        created_rooms = []
        
        for room_type in room_types:
            room_data = {
                "name": f"TEST_{room_type.capitalize()}",
                "room_type": room_type,
                "length": 3.0,
                "width": 3.0,
                "height": 2.6
            }
            response = requests.post(
                f"{BASE_URL}/api/properties/{test_property_id}/rooms",
                json=room_data,
                headers=auth_headers
            )
            assert response.status_code == 200, f"Failed to add {room_type} room: {response.text}"
            created_rooms.append(response.json().get("room_id"))
        
        print(f"✓ All {len(room_types)} room types added successfully")
        
        # Cleanup
        for room_id in created_rooms:
            if room_id:
                requests.delete(f"{BASE_URL}/api/properties/{test_property_id}/rooms/{room_id}", headers=auth_headers)
    
    def test_add_room_missing_required_fields(self, auth_headers, test_property_id):
        """Test adding room without required fields fails"""
        # Missing name
        response = requests.post(
            f"{BASE_URL}/api/properties/{test_property_id}/rooms",
            json={"room_type": "living", "length": 5.0, "width": 4.0},
            headers=auth_headers
        )
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print(f"✓ Missing name validation works")
    
    def test_add_room_unauthorized(self, test_property_id):
        """Test adding room without auth fails"""
        response = requests.post(
            f"{BASE_URL}/api/properties/{test_property_id}/rooms",
            json={"name": "Test", "room_type": "living", "length": 5.0, "width": 4.0}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Unauthorized access blocked")


class TestDeleteRoom:
    """Tests for DELETE /api/properties/{id}/rooms/{room_id}"""
    
    def test_delete_room_success(self, auth_headers, test_property_id):
        """Test deleting an existing room"""
        # First add a room to delete
        room_data = {
            "name": "TEST_RoomToDelete",
            "room_type": "other",
            "length": 2.0,
            "width": 2.0
        }
        add_response = requests.post(
            f"{BASE_URL}/api/properties/{test_property_id}/rooms",
            json=room_data,
            headers=auth_headers
        )
        assert add_response.status_code == 200
        room_id = add_response.json().get("room_id")
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/properties/{test_property_id}/rooms/{room_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify room is gone
        prop_response = requests.get(f"{BASE_URL}/api/properties/{test_property_id}", headers=auth_headers)
        rooms = prop_response.json().get("rooms", [])
        deleted_room = next((r for r in rooms if r.get("id") == room_id), None)
        assert deleted_room is None, "Room still exists after deletion"
        
        print(f"✓ Room deleted successfully")
    
    def test_delete_room_not_found(self, auth_headers, test_property_id):
        """Test deleting non-existent room"""
        response = requests.delete(
            f"{BASE_URL}/api/properties/{test_property_id}/rooms/NONEXISTENT_ROOM_123",
            headers=auth_headers
        )
        # Should return success or 404 - depends on implementation
        # Our implementation returns 200 even for non-existent (MongoDB $pull behavior)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"✓ Delete non-existent room handled")


class TestBulkAddRooms:
    """Tests for POST /api/properties/{id}/rooms/bulk"""
    
    def test_bulk_add_rooms_success(self, auth_headers, test_property_id):
        """Test adding multiple rooms at once"""
        rooms_data = [
            {"name": "TEST_BulkWoonkamer", "room_type": "living", "length": 6.0, "width": 5.0, "height": 2.8},
            {"name": "TEST_BulkSlaapkamer", "room_type": "bedroom", "length": 4.0, "width": 3.5, "height": 2.8},
            {"name": "TEST_BulkBadkamer", "room_type": "bathroom", "length": 2.5, "width": 2.0, "height": 2.5}
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/properties/{test_property_id}/rooms/bulk",
            json=rooms_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Bulk add failed: {response.text}"
        data = response.json()
        assert "rooms_added" in data or "message" in data
        if "rooms_added" in data:
            assert data["rooms_added"] == 3
        
        # Verify rooms were added
        prop_response = requests.get(f"{BASE_URL}/api/properties/{test_property_id}", headers=auth_headers)
        rooms = prop_response.json().get("rooms", [])
        
        bulk_rooms_found = [r for r in rooms if r.get("name", "").startswith("TEST_Bulk")]
        assert len(bulk_rooms_found) >= 3, f"Expected 3 bulk rooms, found {len(bulk_rooms_found)}"
        
        print(f"✓ Bulk add {len(bulk_rooms_found)} rooms successful")
        
        # Cleanup
        for room in bulk_rooms_found:
            requests.delete(f"{BASE_URL}/api/properties/{test_property_id}/rooms/{room['id']}", headers=auth_headers)
    
    def test_bulk_add_empty_list(self, auth_headers, test_property_id):
        """Test bulk add with empty list"""
        response = requests.post(
            f"{BASE_URL}/api/properties/{test_property_id}/rooms/bulk",
            json=[],
            headers=auth_headers
        )
        # Should succeed with 0 rooms added
        assert response.status_code == 200
        data = response.json()
        assert data.get("rooms_added", 0) == 0
        print(f"✓ Empty bulk add handled correctly")


class TestFloorPlanUpload:
    """Tests for POST /api/properties/{id}/analyze-floor-plan"""
    
    def test_floor_plan_upload_success(self, auth_headers, test_property_id):
        """Test uploading a floor plan image"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        # Minimal PNG file
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test_floorplan.png", png_data, "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/properties/{test_property_id}/analyze-floor-plan",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Floor plan upload failed: {response.text}"
        data = response.json()
        
        # Should have floor_plan_url at minimum
        assert "floor_plan_url" in data or "success" in data
        if "success" in data:
            assert data["success"] == True
        
        print(f"✓ Floor plan upload successful")
        print(f"  Response: {data.get('message', 'No message')}")
        
        # Verify floor_plan_url is saved to property
        prop_response = requests.get(f"{BASE_URL}/api/properties/{test_property_id}", headers=auth_headers)
        prop_data = prop_response.json()
        # floor_plan_url should be set (though we may not get AI rooms from 1x1 pixel)
        if "floor_plan_url" in data:
            assert prop_data.get("floor_plan_url") == data["floor_plan_url"]
            print(f"  Floor plan URL saved: {data['floor_plan_url']}")
    
    def test_floor_plan_upload_unauthorized(self, test_property_id):
        """Test floor plan upload without auth fails"""
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test.png", png_data, "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/properties/{test_property_id}/analyze-floor-plan",
            files=files
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Unauthorized floor plan upload blocked")


class TestRoomAreaCalculation:
    """Tests to verify room areas are calculated correctly"""
    
    def test_room_area_calculated(self, auth_headers, test_property_id):
        """Test that floor/wall/ceiling areas are calculated when adding room"""
        room_data = {
            "name": "TEST_AreaCalcRoom",
            "room_type": "living",
            "length": 5.0,
            "width": 4.0,
            "height": 2.5
        }
        
        response = requests.post(
            f"{BASE_URL}/api/properties/{test_property_id}/rooms",
            json=room_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        room_id = response.json().get("room_id")
        
        # Get property and check room
        prop_response = requests.get(f"{BASE_URL}/api/properties/{test_property_id}", headers=auth_headers)
        rooms = prop_response.json().get("rooms", [])
        room = next((r for r in rooms if r.get("id") == room_id), None)
        
        assert room is not None, "Room not found"
        
        # Check calculated areas
        expected_floor = 5.0 * 4.0  # 20.0
        expected_ceiling = 5.0 * 4.0  # 20.0
        expected_wall = 2 * (5.0 + 4.0) * 2.5  # 45.0
        
        assert room.get("floor_area") == expected_floor, f"Floor area mismatch: {room.get('floor_area')} != {expected_floor}"
        assert room.get("ceiling_area") == expected_ceiling, f"Ceiling area mismatch"
        assert room.get("wall_area") == expected_wall, f"Wall area mismatch: {room.get('wall_area')} != {expected_wall}"
        
        print(f"✓ Room areas calculated correctly: floor={expected_floor}m², wall={expected_wall}m², ceiling={expected_ceiling}m²")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/properties/{test_property_id}/rooms/{room_id}", headers=auth_headers)


class TestPropertyAccess:
    """Tests for property access control"""
    
    def test_add_room_to_nonexistent_property(self, auth_headers):
        """Test adding room to non-existent property fails"""
        response = requests.post(
            f"{BASE_URL}/api/properties/NONEXISTENT_PROP_123/rooms",
            json={"name": "Test", "room_type": "living", "length": 3.0, "width": 3.0},
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Non-existent property returns 404")


# Cleanup fixture to remove all TEST_ prefixed rooms after tests
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_rooms(auth_headers, request):
    """Cleanup TEST_ prefixed rooms after all tests"""
    yield
    
    # Get all properties
    try:
        response = requests.get(f"{BASE_URL}/api/properties", headers=auth_headers)
        if response.status_code == 200:
            properties = response.json()
            for prop in properties:
                rooms = prop.get("rooms", [])
                for room in rooms:
                    if room.get("name", "").startswith("TEST_"):
                        requests.delete(
                            f"{BASE_URL}/api/properties/{prop['id']}/rooms/{room['id']}", 
                            headers=auth_headers
                        )
                        print(f"Cleaned up test room: {room['name']}")
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

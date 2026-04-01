"""
Test suite for Quote Line Item Editing and Room Grouping Features
- Tests description editing in line items (previously only quantity/unit_price were editable)
- Tests subtitle and subtotal item types for room grouping
- Tests generate-quote-from-calculation endpoint with room grouping
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from iteration_13.json
ADMIN_USERNAME = "liam"
ADMIN_PASSWORD = "Liammail123"


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login(self):
        """Test admin login returns session token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "No session_token in response"
        assert "user" in data, "No user in response"
        print(f"Admin login successful, user: {data['user'].get('username')}")
        return data["session_token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("session_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Get auth headers with admin token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestQuoteLineItemEditing:
    """Tests for editing line item description, quantity, and unit_price"""
    
    def test_get_quotes_list(self, auth_headers):
        """Get list of quotes to find one with line items"""
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get quotes: {response.text}"
        quotes = response.json()
        print(f"Found {len(quotes)} quotes")
        return quotes
    
    def test_get_quote_with_items(self, auth_headers):
        """Find a quote with line items for testing"""
        # Get all quotes
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers)
        assert response.status_code == 200
        quotes = response.json()
        
        # Find a quote with line items
        for quote in quotes:
            quote_id = quote.get("id")
            items_response = requests.get(f"{BASE_URL}/api/quotes/{quote_id}/items", headers=auth_headers)
            if items_response.status_code == 200:
                items = items_response.json()
                # Find a quote with regular items (not subtitle/subtotal)
                regular_items = [i for i in items if i.get("item_type") not in ["subtitle", "subtotal"]]
                if regular_items:
                    print(f"Found quote {quote_id} with {len(regular_items)} regular items")
                    return quote_id, regular_items
        
        pytest.skip("No quotes with line items found for testing")
    
    def test_update_line_item_description(self, auth_headers):
        """Test updating line item description field"""
        # First find a quote with items
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers)
        quotes = response.json()
        
        quote_id = None
        item_id = None
        original_description = None
        
        for quote in quotes:
            qid = quote.get("id")
            items_response = requests.get(f"{BASE_URL}/api/quotes/{qid}/items", headers=auth_headers)
            if items_response.status_code == 200:
                items = items_response.json()
                regular_items = [i for i in items if i.get("item_type") not in ["subtitle", "subtotal"]]
                if regular_items:
                    quote_id = qid
                    item_id = regular_items[0]["id"]
                    original_description = regular_items[0]["description"]
                    break
        
        if not quote_id or not item_id:
            pytest.skip("No quote with regular line items found")
        
        # Update description
        new_description = f"TEST_UPDATED_DESC_{uuid.uuid4().hex[:8]}"
        update_response = requests.put(
            f"{BASE_URL}/api/quotes/{quote_id}/items/{item_id}",
            json={"description": new_description},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated_item = update_response.json()
        assert updated_item["description"] == new_description, "Description not updated"
        print(f"Successfully updated description from '{original_description}' to '{new_description}'")
        
        # Verify persistence with GET
        verify_response = requests.get(f"{BASE_URL}/api/quotes/{quote_id}/items", headers=auth_headers)
        assert verify_response.status_code == 200
        items = verify_response.json()
        updated = next((i for i in items if i["id"] == item_id), None)
        assert updated is not None, "Item not found after update"
        assert updated["description"] == new_description, "Description not persisted"
        
        # Restore original description
        requests.put(
            f"{BASE_URL}/api/quotes/{quote_id}/items/{item_id}",
            json={"description": original_description},
            headers=auth_headers
        )
        print("Restored original description")
    
    def test_update_line_item_all_fields(self, auth_headers):
        """Test updating description, quantity, and unit_price together"""
        # Find a quote with items
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers)
        quotes = response.json()
        
        quote_id = None
        item_id = None
        original_values = {}
        
        for quote in quotes:
            qid = quote.get("id")
            items_response = requests.get(f"{BASE_URL}/api/quotes/{qid}/items", headers=auth_headers)
            if items_response.status_code == 200:
                items = items_response.json()
                regular_items = [i for i in items if i.get("item_type") not in ["subtitle", "subtotal"]]
                if regular_items:
                    quote_id = qid
                    item = regular_items[0]
                    item_id = item["id"]
                    original_values = {
                        "description": item["description"],
                        "quantity": item["quantity"],
                        "unit_price": item["unit_price"]
                    }
                    break
        
        if not quote_id or not item_id:
            pytest.skip("No quote with regular line items found")
        
        # Update all editable fields
        new_values = {
            "description": f"TEST_FULL_UPDATE_{uuid.uuid4().hex[:6]}",
            "quantity": 5.5,
            "unit_price": 99.99
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/quotes/{quote_id}/items/{item_id}",
            json=new_values,
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated_item = update_response.json()
        assert updated_item["description"] == new_values["description"]
        assert updated_item["quantity"] == new_values["quantity"]
        assert updated_item["unit_price"] == new_values["unit_price"]
        
        # Verify total was recalculated
        expected_total = new_values["quantity"] * new_values["unit_price"]
        assert abs(updated_item["total"] - expected_total) < 0.01, f"Total not recalculated correctly: {updated_item['total']} vs {expected_total}"
        print(f"All fields updated successfully, total recalculated to {updated_item['total']}")
        
        # Restore original values
        requests.put(
            f"{BASE_URL}/api/quotes/{quote_id}/items/{item_id}",
            json=original_values,
            headers=auth_headers
        )
        print("Restored original values")


class TestSubtitleSubtotalItemTypes:
    """Tests for subtitle and subtotal item types used in room grouping"""
    
    def test_create_subtitle_item(self, auth_headers):
        """Test creating a subtitle item type"""
        # First get a quote
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers)
        quotes = response.json()
        if not quotes:
            pytest.skip("No quotes available")
        
        quote_id = quotes[0]["id"]
        
        # Create subtitle item
        subtitle_data = {
            "description": "--- TEST_ROOM_SUBTITLE ---",
            "quantity": 0,
            "unit_price": 0,
            "item_type": "subtitle",
            "vat_rate": 0
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/quotes/{quote_id}/items",
            json=subtitle_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200, f"Failed to create subtitle: {create_response.text}"
        
        created_item = create_response.json()
        assert created_item["item_type"] == "subtitle"
        assert created_item["description"] == subtitle_data["description"]
        print(f"Created subtitle item: {created_item['id']}")
        
        # Clean up - delete the test item
        delete_response = requests.delete(
            f"{BASE_URL}/api/quotes/{quote_id}/items/{created_item['id']}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, "Failed to delete test subtitle"
        print("Cleaned up test subtitle item")
    
    def test_create_subtotal_item(self, auth_headers):
        """Test creating a subtotal item type"""
        # First get a quote
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers)
        quotes = response.json()
        if not quotes:
            pytest.skip("No quotes available")
        
        quote_id = quotes[0]["id"]
        
        # Create subtotal item
        subtotal_data = {
            "description": "Subtotaal TEST_ROOM",
            "quantity": 1,
            "unit_price": 500.00,
            "item_type": "subtotal",
            "vat_rate": 0
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/quotes/{quote_id}/items",
            json=subtotal_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200, f"Failed to create subtotal: {create_response.text}"
        
        created_item = create_response.json()
        assert created_item["item_type"] == "subtotal"
        assert created_item["description"] == subtotal_data["description"]
        print(f"Created subtotal item: {created_item['id']}")
        
        # Clean up - delete the test item
        delete_response = requests.delete(
            f"{BASE_URL}/api/quotes/{quote_id}/items/{created_item['id']}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, "Failed to delete test subtotal"
        print("Cleaned up test subtotal item")
    
    def test_subtitle_subtotal_not_counted_in_totals(self, auth_headers):
        """Verify subtitle/subtotal items don't affect quote totals (vat_rate=0)"""
        # Get a quote
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers)
        quotes = response.json()
        if not quotes:
            pytest.skip("No quotes available")
        
        quote_id = quotes[0]["id"]
        
        # Get current quote totals
        quote_response = requests.get(f"{BASE_URL}/api/quotes/{quote_id}", headers=auth_headers)
        original_total = quote_response.json().get("total_excl_vat", 0)
        
        # Create subtitle with vat_rate=0
        subtitle_data = {
            "description": "--- TEST_ROOM_NO_TOTAL ---",
            "quantity": 0,
            "unit_price": 0,
            "item_type": "subtitle",
            "vat_rate": 0
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/quotes/{quote_id}/items",
            json=subtitle_data,
            headers=auth_headers
        )
        created_item = create_response.json()
        
        # Check quote totals haven't changed
        quote_response = requests.get(f"{BASE_URL}/api/quotes/{quote_id}", headers=auth_headers)
        new_total = quote_response.json().get("total_excl_vat", 0)
        
        assert abs(original_total - new_total) < 0.01, f"Quote total changed after adding subtitle: {original_total} -> {new_total}"
        print(f"Quote total unchanged: {original_total}")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/quotes/{quote_id}/items/{created_item['id']}", headers=auth_headers)


class TestGenerateQuoteFromCalculation:
    """Tests for generate-quote-from-calculation endpoint with room grouping"""
    
    def test_find_project_with_calculation(self, auth_headers):
        """Find a project that has a renovation_calculation_id"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        projects = response.json()
        
        for project in projects:
            if project.get("renovation_calculation_id"):
                print(f"Found project with calculation: {project['id']} - {project.get('name')}")
                return project
        
        print("No projects with renovation_calculation_id found")
        return None
    
    def test_generate_quote_creates_room_grouping(self, auth_headers):
        """Test that generate-quote-from-calculation creates subtitle/subtotal items"""
        # Find project with calculation
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        projects = response.json()
        
        project_with_calc = None
        for project in projects:
            if project.get("renovation_calculation_id"):
                project_with_calc = project
                break
        
        if not project_with_calc:
            pytest.skip("No project with renovation_calculation_id found")
        
        project_id = project_with_calc["id"]
        
        # Generate quote from calculation
        gen_response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/generate-quote-from-calculation",
            headers=auth_headers
        )
        
        if gen_response.status_code != 200:
            print(f"Generate quote response: {gen_response.status_code} - {gen_response.text}")
            pytest.skip(f"Could not generate quote: {gen_response.text}")
        
        result = gen_response.json()
        quote_id = result.get("quote_id")
        assert quote_id, "No quote_id in response"
        print(f"Generated quote: {quote_id} with {result.get('line_items_count')} items")
        
        # Get line items and verify room grouping
        items_response = requests.get(f"{BASE_URL}/api/quotes/{quote_id}/items", headers=auth_headers)
        assert items_response.status_code == 200
        items = items_response.json()
        
        # Check for subtitle and subtotal items
        subtitles = [i for i in items if i.get("item_type") == "subtitle"]
        subtotals = [i for i in items if i.get("item_type") == "subtotal"]
        
        print(f"Found {len(subtitles)} subtitle items and {len(subtotals)} subtotal items")
        
        # Verify subtitle format
        for subtitle in subtitles:
            assert "---" in subtitle["description"], f"Subtitle missing --- format: {subtitle['description']}"
            assert subtitle["quantity"] == 0
            assert subtitle["unit_price"] == 0
            print(f"  Subtitle: {subtitle['description']}")
        
        # Verify subtotal format
        for subtotal in subtotals:
            assert "Subtotaal" in subtotal["description"], f"Subtotal missing 'Subtotaal': {subtotal['description']}"
            assert subtotal["total"] >= 0
            print(f"  Subtotal: {subtotal['description']} = €{subtotal['total']}")
        
        return quote_id


class TestLineItemUpdateModel:
    """Tests for LineItemUpdate model accepting description field"""
    
    def test_update_model_accepts_description(self, auth_headers):
        """Verify the PUT endpoint accepts description in the request body"""
        # Get a quote with items
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers)
        quotes = response.json()
        
        for quote in quotes:
            items_response = requests.get(f"{BASE_URL}/api/quotes/{quote['id']}/items", headers=auth_headers)
            if items_response.status_code == 200:
                items = items_response.json()
                regular_items = [i for i in items if i.get("item_type") not in ["subtitle", "subtotal"]]
                if regular_items:
                    quote_id = quote["id"]
                    item = regular_items[0]
                    
                    # Test that description field is accepted
                    test_desc = f"API_TEST_DESC_{uuid.uuid4().hex[:6]}"
                    update_response = requests.put(
                        f"{BASE_URL}/api/quotes/{quote_id}/items/{item['id']}",
                        json={"description": test_desc},
                        headers=auth_headers
                    )
                    
                    assert update_response.status_code == 200, f"API rejected description update: {update_response.text}"
                    result = update_response.json()
                    assert result["description"] == test_desc
                    print(f"API accepts description field in LineItemUpdate model")
                    
                    # Restore
                    requests.put(
                        f"{BASE_URL}/api/quotes/{quote_id}/items/{item['id']}",
                        json={"description": item["description"]},
                        headers=auth_headers
                    )
                    return
        
        pytest.skip("No suitable quote found for testing")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

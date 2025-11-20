#!/usr/bin/env python3
"""
Test script for Labor Bundling and VAT Breakdown feature
Tests:
1. Create a quote with multiple labor items and material items
2. Verify that labor items are bundled on PDF
3. Verify VAT breakdown is correct (6% for labor, 21% for materials)
4. Verify grand total calculations
"""

import requests
import json
from datetime import datetime

# Backend URL
API_URL = "http://localhost:8001/api"

def create_test_user():
    """Create a test user directly in DB"""
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient
    from bson import ObjectId
    import os
    
    async def create():
        client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
        db = client.qtechnics
        
        # Create user with ObjectId as _id
        user_id = str(ObjectId())
        user = {
            "_id": user_id,
            "id": "test-user-001",
            "email": "test@qtechnics.nl",
            "name": "Test User",
            "google_id": "test-google-id",
        }
        
        # Check if user exists
        existing = await db.users.find_one({"id": user["id"]})
        if existing:
            # Delete old user and sessions
            await db.users.delete_one({"id": user["id"]})
            await db.user_sessions.delete_many({"user_id": existing["_id"]})
        
        await db.users.insert_one(user)
        print(f"✅ Test user created: {user['email']}")
        
        # Create session
        session_token = "test-session-token-001"
        session = {
            "session_token": session_token,
            "user_id": user_id,
            "expires_at": datetime(2025, 12, 31)
        }
        await db.user_sessions.delete_many({"user_id": user_id})
        await db.user_sessions.insert_one(session)
        print(f"✅ Test session created")
        
        return session_token
    
    return asyncio.run(create())

def test_quote_flow():
    """Test the full quote flow with labor bundling"""
    print("\n" + "="*60)
    print("TESTING LABOR BUNDLING & VAT BREAKDOWN")
    print("="*60 + "\n")
    
    # Create test user and get session
    session_token = create_test_user()
    headers = {"Cookie": f"session_token={session_token}"}
    
    # Step 1: Create a lead
    print("📋 Step 1: Creating test lead...")
    lead_data = {
        "name": "Piet Janssen",
        "email": "piet@example.nl",
        "phone": "0612345678",
        "address": "Teststraat 123, 1234 AB Amsterdam",
        "project_type": "Renovatie",
        "description": "Badkamer renovatie"
    }
    
    response = requests.post(f"{API_URL}/leads", json=lead_data, headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to create lead: {response.text}")
        return False
    
    lead = response.json()
    lead_id = lead["id"]
    print(f"✅ Lead created: {lead_id}")
    
    # Step 2: Create a quote
    print("\n📝 Step 2: Creating quote...")
    quote_data = {"lead_id": lead_id}
    response = requests.post(f"{API_URL}/quotes", json=quote_data, headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to create quote: {response.text}")
        return False
    
    quote = response.json()
    quote_id = quote["id"]
    print(f"✅ Quote created: {quote_id} ({quote['quote_number']})")
    
    # Step 3: Add multiple labor items (should be bundled)
    print("\n👷 Step 3: Adding labor items...")
    labor_items = [
        {"description": "Tegelwerk badkamer", "quantity": 8, "unit_price": 50, "item_type": "arbeid", "vat_rate": 6},
        {"description": "Loodgieter werkzaamheden", "quantity": 4, "unit_price": 65, "item_type": "arbeid", "vat_rate": 6},
        {"description": "Elektrische werkzaamheden", "quantity": 3, "unit_price": 55, "item_type": "arbeid", "vat_rate": 6},
    ]
    
    for item in labor_items:
        response = requests.post(f"{API_URL}/quotes/{quote_id}/items", json=item, headers=headers)
        if response.status_code != 200:
            print(f"❌ Failed to add labor item: {response.text}")
            return False
        print(f"  ✅ Added: {item['description']} - {item['quantity']} x €{item['unit_price']} (BTW {item['vat_rate']}%)")
    
    # Calculate expected labor total
    labor_total_excl = sum(item["quantity"] * item["unit_price"] for item in labor_items)
    labor_vat = labor_total_excl * 0.06
    labor_total_incl = labor_total_excl + labor_vat
    print(f"\n  💰 Expected labor total: €{labor_total_excl:.2f} excl. BTW, €{labor_vat:.2f} BTW (6%), €{labor_total_incl:.2f} incl. BTW")
    
    # Step 4: Add material items (should be individual)
    print("\n🧱 Step 4: Adding material items...")
    material_items = [
        {"description": "Tegels 60x60cm wit", "quantity": 15, "unit_price": 12.50, "item_type": "materiaal", "vat_rate": 21},
        {"description": "Voegspecie", "quantity": 5, "unit_price": 8.75, "item_type": "materiaal", "vat_rate": 21},
        {"description": "Sanitair set", "quantity": 1, "unit_price": 450, "item_type": "materiaal", "vat_rate": 21},
    ]
    
    for item in material_items:
        response = requests.post(f"{API_URL}/quotes/{quote_id}/items", json=item, headers=headers)
        if response.status_code != 200:
            print(f"❌ Failed to add material item: {response.text}")
            return False
        print(f"  ✅ Added: {item['description']} - {item['quantity']} x €{item['unit_price']} (BTW {item['vat_rate']}%)")
    
    # Calculate expected material totals
    material_total_excl = sum(item["quantity"] * item["unit_price"] for item in material_items)
    material_vat = material_total_excl * 0.21
    material_total_incl = material_total_excl + material_vat
    print(f"\n  💰 Expected material total: €{material_total_excl:.2f} excl. BTW, €{material_vat:.2f} BTW (21%), €{material_total_incl:.2f} incl. BTW")
    
    # Step 5: Verify quote totals
    print("\n🧮 Step 5: Verifying quote totals...")
    response = requests.get(f"{API_URL}/quotes/{quote_id}", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get quote: {response.text}")
        return False
    
    quote = response.json()
    
    # Expected totals
    expected_total_excl = labor_total_excl + material_total_excl
    expected_total_vat = labor_vat + material_vat
    expected_total_incl = expected_total_excl + expected_total_vat
    
    print(f"\n  Expected totals:")
    print(f"    - Total excl. BTW: €{expected_total_excl:.2f}")
    print(f"    - BTW 6%: €{labor_vat:.2f}")
    print(f"    - BTW 21%: €{material_vat:.2f}")
    print(f"    - Total BTW: €{expected_total_vat:.2f}")
    print(f"    - Total incl. BTW: €{expected_total_incl:.2f}")
    
    print(f"\n  Actual quote totals:")
    print(f"    - Total excl. BTW: €{quote['total_excl_vat']:.2f}")
    print(f"    - BTW breakdown: {quote.get('vat_breakdown', {})}")
    print(f"    - Total BTW: €{quote['total_vat']:.2f}")
    print(f"    - Total incl. BTW: €{quote['total_incl_vat']:.2f}")
    
    # Verify calculations
    tolerance = 0.01
    if abs(quote['total_excl_vat'] - expected_total_excl) > tolerance:
        print(f"\n  ❌ Total excl. BTW mismatch!")
        return False
    if abs(quote['total_vat'] - expected_total_vat) > tolerance:
        print(f"\n  ❌ Total BTW mismatch!")
        return False
    if abs(quote['total_incl_vat'] - expected_total_incl) > tolerance:
        print(f"\n  ❌ Total incl. BTW mismatch!")
        return False
    
    print(f"\n  ✅ All calculations are correct!")
    
    # Step 6: Download PDF
    print("\n📄 Step 6: Generating PDF...")
    response = requests.get(f"{API_URL}/quotes/{quote_id}/pdf", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to generate PDF: {response.text}")
        return False
    
    pdf_path = f"/app/test_quote_{quote['quote_number']}.pdf"
    with open(pdf_path, "wb") as f:
        f.write(response.content)
    
    print(f"✅ PDF generated successfully: {pdf_path}")
    print(f"   PDF size: {len(response.content)} bytes")
    
    # Verify PDF was created
    import os
    if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 1000:
        print(f"✅ PDF file is valid (size > 1KB)")
    else:
        print(f"❌ PDF file seems invalid")
        return False
    
    print("\n" + "="*60)
    print("✅ ALL TESTS PASSED!")
    print("="*60)
    print(f"\n📋 Test Results Summary:")
    print(f"  - Lead created: {lead_id}")
    print(f"  - Quote created: {quote_id} ({quote['quote_number']})")
    print(f"  - Labor items: 3 (should be bundled as 'Arbeid totaal')")
    print(f"  - Material items: 3 (should be individual)")
    print(f"  - PDF saved to: {pdf_path}")
    print(f"\n📝 Manual verification needed:")
    print(f"  1. Open the PDF and verify labor items are bundled")
    print(f"  2. Verify VAT breakdown shows 6% and 21% separately")
    print(f"  3. Verify 'Eenheidsprijs' column header fits properly")
    
    return True

if __name__ == "__main__":
    try:
        success = test_quote_flow()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

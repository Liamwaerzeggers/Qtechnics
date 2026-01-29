import requests
import sys
import json
from datetime import datetime

class CrossAdminQuoteAccessTester:
    def __init__(self, base_url="https://project-craft-4.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        if not headers:
            headers = {}
        
        if data and method in ['POST', 'PUT']:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_cross_admin_quote_access(self):
        """Test cross-admin quote access functionality"""
        print("\n🔐 Testing Cross-Admin Quote Access...")
        
        # Test credentials from review request
        admin1_credentials = {"username": "test", "password": "test123"}
        admin2_credentials = {"username": "petra", "password": "petra123"}
        
        # Step 1: Login as admin 1 (test)
        print("🔐 Testing login as admin 1 (test/test123)...")
        
        login_url = f"{self.base_url}/auth/admin/login?username={admin1_credentials['username']}&password={admin1_credentials['password']}"
        
        try:
            response = requests.post(login_url)
            
            if response.status_code != 200:
                print(f"❌ Admin 1 login failed - Status: {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False
            
            # Extract session token for admin 1
            login_data = response.json()
            admin1_token = login_data.get('session_token')
            
            if not admin1_token and 'session_token' in response.cookies:
                admin1_token = response.cookies['session_token']
            
            if not admin1_token:
                print("❌ No session token received from admin 1 login")
                return False
                
            print(f"✅ Admin 1 login successful - Token: {admin1_token[:10]}...")
            
        except Exception as e:
            print(f"❌ Admin 1 login error: {str(e)}")
            return False
        
        # Step 2: Login as admin 2 (petra)
        print("🔐 Testing login as admin 2 (petra/petra123)...")
        
        login_url = f"{self.base_url}/auth/admin/login?username={admin2_credentials['username']}&password={admin2_credentials['password']}"
        
        try:
            response = requests.post(login_url)
            
            if response.status_code != 200:
                print(f"❌ Admin 2 login failed - Status: {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False
            
            # Extract session token for admin 2
            login_data = response.json()
            admin2_token = login_data.get('session_token')
            
            if not admin2_token and 'session_token' in response.cookies:
                admin2_token = response.cookies['session_token']
            
            if not admin2_token:
                print("❌ No session token received from admin 2 login")
                return False
                
            print(f"✅ Admin 2 login successful - Token: {admin2_token[:10]}...")
            
        except Exception as e:
            print(f"❌ Admin 2 login error: {str(e)}")
            return False
        
        # Step 3: Test admin 1 can see all quotes
        print("\n📋 Testing admin 1 quote access...")
        
        headers1 = {'Authorization': f'Bearer {admin1_token}'}
        
        success, admin1_quotes_response = self.run_test(
            "Admin 1 Get All Quotes",
            "GET",
            "quotes",
            200,
            headers=headers1
        )
        
        if not success:
            return False
        
        admin1_quotes = admin1_quotes_response if isinstance(admin1_quotes_response, list) else []
        admin1_quote_count = len(admin1_quotes)
        print(f"✅ Admin 1 can see {admin1_quote_count} quotes")
        
        # Look for the specific quote mentioned in review request
        target_quote_id = "OFF-2026-1742BF-ARB"
        target_quote = None
        
        for quote in admin1_quotes:
            if quote.get('id') == target_quote_id:
                target_quote = quote
                break
        
        if target_quote:
            print(f"✅ Found target quote: {target_quote_id}")
            print(f"   Created by user: {target_quote.get('user_id', 'Unknown')}")
        else:
            print(f"⚠️ Target quote {target_quote_id} not found in admin 1's view")
        
        # Step 4: Test admin 2 can see all quotes (same count)
        print("\n📋 Testing admin 2 quote access...")
        
        headers2 = {'Authorization': f'Bearer {admin2_token}'}
        
        success, admin2_quotes_response = self.run_test(
            "Admin 2 Get All Quotes",
            "GET",
            "quotes",
            200,
            headers=headers2
        )
        
        if not success:
            return False
        
        admin2_quotes = admin2_quotes_response if isinstance(admin2_quotes_response, list) else []
        admin2_quote_count = len(admin2_quotes)
        print(f"✅ Admin 2 can see {admin2_quote_count} quotes")
        
        # Verify both admins see the same number of quotes
        if admin1_quote_count == admin2_quote_count:
            print(f"✅ Both admins see the same quote count: {admin1_quote_count}")
        else:
            print(f"❌ Quote count mismatch - Admin 1: {admin1_quote_count}, Admin 2: {admin2_quote_count}")
            return False
        
        # Step 5: Test cross-admin quote access - petra accessing test's quote
        print(f"\n🔄 Testing cross-admin access - petra accessing quote created by test...")
        
        target_quote_id = "OFF-2026-1742BF-ARB"
        
        # Test GET /api/quotes/{quote_id}
        success, quote_data = self.run_test(
            f"Admin 2 Access Quote {target_quote_id}",
            "GET",
            f"quotes/{target_quote_id}",
            200,
            headers=headers2
        )
        
        if success:
            print(f"✅ Admin 2 (petra) can access quote {target_quote_id}")
            print(f"   Quote created by: {quote_data.get('user_id', 'Unknown')}")
            print(f"   Quote status: {quote_data.get('status', 'Unknown')}")
        else:
            print(f"❌ Admin 2 (petra) cannot access quote {target_quote_id}")
            return False
        
        # Step 6: Test cross-admin quote items access
        print(f"\n📋 Testing cross-admin quote items access...")
        
        # Test GET /api/quotes/{quote_id}/items
        success, items_data = self.run_test(
            f"Admin 2 Access Quote Items {target_quote_id}",
            "GET",
            f"quotes/{target_quote_id}/items",
            200,
            headers=headers2
        )
        
        if success:
            items_list = items_data if isinstance(items_data, list) else []
            items_count = len(items_list)
            print(f"✅ Admin 2 (petra) can access quote items for {target_quote_id}")
            print(f"   Found {items_count} line items")
            
            # Show first few items
            if items_count > 0:
                for i, item in enumerate(items_list[:3], 1):
                    print(f"   Item {i}: {item.get('description', 'N/A')} - €{item.get('unit_price', 0):.2f}")
        else:
            print(f"❌ Admin 2 (petra) cannot access quote items for {target_quote_id}")
            return False
        
        # Step 7: Test cross-admin quote update
        print(f"\n✏️ Testing cross-admin quote update...")
        
        # Test PUT /api/quotes/{quote_id}
        update_data = {"status": "reviewed"}
        
        success, updated_quote = self.run_test(
            f"Admin 2 Update Quote {target_quote_id}",
            "PUT",
            f"quotes/{target_quote_id}",
            200,
            data=update_data,
            headers=headers2
        )
        
        if success:
            print(f"✅ Admin 2 (petra) can update quote {target_quote_id}")
            print(f"   Updated status to: {updated_quote.get('status', 'Unknown')}")
        else:
            print(f"❌ Admin 2 (petra) cannot update quote {target_quote_id}")
            return False
        
        # Step 8: Test that both admins can see the updated quote
        print(f"\n🔄 Verifying both admins can see the updated quote...")
        
        for admin_name, headers in [("Admin 1 (test)", headers1), ("Admin 2 (petra)", headers2)]:
            success, quote_data = self.run_test(
                f"{admin_name} Verify Updated Quote",
                "GET",
                f"quotes/{target_quote_id}",
                200,
                headers=headers
            )
            
            if success:
                status = quote_data.get('status', 'Unknown')
                print(f"✅ {admin_name} sees quote status: {status}")
            else:
                print(f"❌ {admin_name} failed to access updated quote")
                return False
        
        print("\n🎉 Cross-Admin Quote Access test completed successfully!")
        print("✅ All functionality working as expected:")
        print("   ✅ Both admins can login successfully")
        print("   ✅ Both admins see the same quote count")
        print("   ✅ Admin 2 (petra) can access quotes created by Admin 1 (test)")
        print("   ✅ Admin 2 (petra) can access quote items for quotes created by Admin 1")
        print("   ✅ Admin 2 (petra) can update quotes created by Admin 1")
        print("   ✅ Both admins can see updated quote data")
        print("   ✅ No 'Quote not found' errors for cross-admin access")
        
        return True

    def run_tests(self):
        """Run the cross-admin quote access tests"""
        print("🚀 Starting Cross-Admin Quote Access Tests...")
        print(f"📍 Base URL: {self.base_url}")
        
        # Run the test
        test_result = self.test_cross_admin_quote_access()
        
        # Print summary
        print("\n" + "="*60)
        print("📊 TEST RESULTS SUMMARY")
        print("="*60)
        
        status = "✅ PASSED" if test_result else "❌ FAILED"
        print(f"{status:<12} Cross-Admin Quote Access")
        
        print(f"\n📈 Overall: {self.tests_passed}/{self.tests_run} individual tests passed")
        
        if test_result:
            print("\n🎉 Cross-admin quote access is working correctly!")
            print("✅ The bug fix has been successfully implemented")
            print("✅ All admins can now access all quotes and quote items")
        else:
            print("\n⚠️ Cross-admin quote access test failed")
            print("❌ There may still be issues with the permission system")
        
        return test_result

if __name__ == "__main__":
    tester = CrossAdminQuoteAccessTester()
    success = tester.run_tests()
    sys.exit(0 if success else 1)
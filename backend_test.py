import requests
import sys
import json
from datetime import datetime
import subprocess
import os

class OfferteAPITester:
    def __init__(self, base_url="https://dualbill.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'leads': [],
            'quotes': [],
            'projects': [],
            'line_items': []
        }

    def setup_test_user(self):
        """Create test user and session using MongoDB"""
        print("🔧 Setting up test user and session...")
        
        # Generate unique identifiers
        timestamp = str(int(datetime.now().timestamp()))
        user_email = f"test.user.{timestamp}@example.com"
        session_token = f"test_session_{timestamp}"
        
        # MongoDB commands to create test user and session
        # Note: Backend uses email as _id for users
        mongo_commands = f"""
        use('test_database');
        var userEmail = '{user_email}';
        var sessionToken = '{session_token}';
        db.users.insertOne({{
            _id: userEmail,
            email: userEmail,
            name: 'Test User {timestamp}',
            picture: 'https://via.placeholder.com/150',
            created_at: new Date().toISOString()
        }});
        db.user_sessions.insertOne({{
            user_id: userEmail,
            session_token: sessionToken,
            expires_at: new Date(Date.now() + 7*24*60*60*1000),
            created_at: new Date()
        }});
        print('Setup complete');
        """
        
        try:
            result = subprocess.run(['mongosh', '--eval', mongo_commands], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                self.session_token = session_token
                self.user_id = user_email
                print(f"✅ Test user created: {user_email}")
                print(f"✅ Session token: {session_token}")
                return True
            else:
                print(f"❌ MongoDB setup failed: {result.stderr}")
                return False
        except Exception as e:
            print(f"❌ MongoDB setup error: {str(e)}")
            return False

    def cleanup_test_data(self):
        """Clean up test data from MongoDB"""
        if not self.user_id:
            return
            
        print("🧹 Cleaning up test data...")
        cleanup_commands = f"""
        use('test_database');
        db.users.deleteMany({{_id: '{self.user_id}'}});
        db.user_sessions.deleteMany({{user_id: '{self.user_id}'}});
        db.leads.deleteMany({{user_id: '{self.user_id}'}});
        db.quotes.deleteMany({{user_id: '{self.user_id}'}});
        db.line_items.deleteMany({{quote_id: {{$in: {json.dumps(self.created_resources['quotes']) if self.created_resources['quotes'] else []}}}}});
        db.projects.deleteMany({{user_id: '{self.user_id}'}});
        db.materials.deleteMany({{user_id: '{self.user_id}'}});
        print('Cleanup complete');
        """
        
        try:
            subprocess.run(['mongosh', '--eval', cleanup_commands], 
                          capture_output=True, text=True, timeout=30)
            print("✅ Test data cleaned up")
        except Exception as e:
            print(f"⚠️ Cleanup warning: {str(e)}")

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        
        if self.session_token:
            headers['Authorization'] = f'Bearer {self.session_token}'
        
        if data and not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers)
                else:
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

    def test_auth(self):
        """Test authentication endpoints"""
        print("\n📋 Testing Authentication...")
        
        # Test /auth/me endpoint
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success and response.get('email'):
            print(f"   User: {response.get('name')} ({response.get('email')})")
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📊 Testing Dashboard Stats...")
        
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success:
            stats = ['total_leads', 'total_quotes', 'total_projects', 'total_materials']
            for stat in stats:
                if stat in response:
                    print(f"   {stat}: {response[stat]}")
        
        return success

    def test_leads_crud(self):
        """Test leads CRUD operations"""
        print("\n👥 Testing Leads CRUD...")
        
        # Create lead
        lead_data = {
            "name": "Test Lead",
            "email": "testlead@example.com",
            "phone": "+31612345678",
            "address": "Test Straat 123, Amsterdam",
            "project_type": "Renovatie",
            "description": "Test project beschrijving"
        }
        
        success, response = self.run_test(
            "Create Lead",
            "POST",
            "leads",
            200,
            data=lead_data
        )
        
        if not success:
            return False
            
        lead_id = response.get('id')
        self.created_resources['leads'].append(lead_id)
        print(f"   Created lead: {lead_id}")
        
        # Get all leads
        success, response = self.run_test(
            "Get All Leads",
            "GET",
            "leads",
            200
        )
        
        if not success:
            return False
            
        # Get specific lead
        success, response = self.run_test(
            "Get Specific Lead",
            "GET",
            f"leads/{lead_id}",
            200
        )
        
        if success and response.get('name') == lead_data['name']:
            print(f"   Lead details verified: {response.get('name')}")
        
        return success

    def test_quotes_and_line_items(self):
        """Test quotes and line items with automatic calculation"""
        print("\n💰 Testing Quotes and Line Items...")
        
        if not self.created_resources['leads']:
            print("❌ No leads available for quote creation")
            return False
            
        lead_id = self.created_resources['leads'][0]
        
        # Create quote
        success, response = self.run_test(
            "Create Quote",
            "POST",
            "quotes",
            200,
            data={"lead_id": lead_id}
        )
        
        if not success:
            return False
            
        quote_id = response.get('id')
        self.created_resources['quotes'].append(quote_id)
        print(f"   Created quote: {quote_id}")
        
        # Add line items to test automatic calculation
        line_items = [
            {
                "description": "Arbeid - Schilderwerk",
                "quantity": 8.0,
                "unit_price": 45.0,
                "item_type": "arbeid"
            },
            {
                "description": "Materiaal - Verf",
                "quantity": 5.0,
                "unit_price": 25.0,
                "item_type": "materiaal"
            },
            {
                "description": "Overig - Transport",
                "quantity": 1.0,
                "unit_price": 50.0,
                "item_type": "overig"
            }
        ]
        
        for item in line_items:
            success, response = self.run_test(
                f"Add Line Item - {item['description']}",
                "POST",
                f"quotes/{quote_id}/items",
                200,
                data=item
            )
            
            if success:
                item_id = response.get('id')
                self.created_resources['line_items'].append(item_id)
                expected_total = item['quantity'] * item['unit_price']
                actual_total = response.get('total', 0)
                print(f"   Item total: €{actual_total:.2f} (expected: €{expected_total:.2f})")
        
        # Get updated quote to check automatic totals calculation
        success, response = self.run_test(
            "Get Updated Quote (Check Totals)",
            "GET",
            f"quotes/{quote_id}",
            200
        )
        
        if success:
            subtotal_labor = response.get('subtotal_labor', 0)
            subtotal_material = response.get('subtotal_material', 0)
            total_price = response.get('total_price', 0)
            
            print(f"   Subtotal Labor: €{subtotal_labor:.2f}")
            print(f"   Subtotal Material: €{subtotal_material:.2f}")
            print(f"   Total Price: €{total_price:.2f}")
            
            # Verify calculations
            expected_labor = 8.0 * 45.0  # 360.0
            expected_material = 5.0 * 25.0  # 125.0
            expected_total = expected_labor + expected_material + 50.0  # 535.0
            
            if (abs(subtotal_labor - expected_labor) < 0.01 and 
                abs(subtotal_material - expected_material) < 0.01 and
                abs(total_price - expected_total) < 0.01):
                print("   ✅ Automatic calculations verified!")
            else:
                print(f"   ❌ Calculation mismatch - Expected total: €{expected_total:.2f}")
        
        # Test line item deletion and recalculation
        if self.created_resources['line_items']:
            item_to_delete = self.created_resources['line_items'][0]
            success, response = self.run_test(
                "Delete Line Item",
                "DELETE",
                f"quotes/{quote_id}/items/{item_to_delete}",
                200
            )
            
            if success:
                # Check if totals were recalculated
                success, response = self.run_test(
                    "Verify Recalculation After Delete",
                    "GET",
                    f"quotes/{quote_id}",
                    200
                )
                
                if success:
                    new_total = response.get('total_price', 0)
                    print(f"   New total after deletion: €{new_total:.2f}")
        
        return True

    def test_materials_catalog(self):
        """Test materials catalog functionality"""
        print("\n🔧 Testing Materials Catalog...")
        
        # Create a test CSV content
        csv_content = """sku,name,price,description,category,brand
TEST001,Test Schroef,0.15,M6x20 schroef,Bevestiging,TestBrand
TEST002,Test Verf,25.50,Witte muurverf 5L,Verf,TestBrand
TEST003,Test Boor,12.75,HSS boor 8mm,Gereedschap,TestBrand"""
        
        # Test CSV upload (create temporary file)
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(csv_content)
            temp_csv_path = f.name
        
        try:
            with open(temp_csv_path, 'rb') as f:
                files = {'file': ('test_materials.csv', f, 'text/csv')}
                success, response = self.run_test(
                    "Upload Materials CSV",
                    "POST",
                    "materials/upload",
                    200,
                    files=files
                )
                
                if success:
                    count = response.get('count', 0)
                    print(f"   Uploaded {count} materials")
        finally:
            os.unlink(temp_csv_path)
        
        # Test materials search
        success, response = self.run_test(
            "Search Materials",
            "GET",
            "materials/search?q=Test",
            200
        )
        
        if success:
            results = response.get('results', [])
            count = response.get('count', 0)
            print(f"   Found {count} materials matching 'Test'")
            for material in results[:2]:  # Show first 2 results
                print(f"   - {material.get('name')} (€{material.get('price', 0):.2f})")
        
        return success

    def test_projects(self):
        """Test projects functionality"""
        print("\n🗓️ Testing Projects...")
        
        if not self.created_resources['quotes']:
            print("❌ No quotes available for project creation")
            return False
            
        quote_id = self.created_resources['quotes'][0]
        
        # Create project
        project_data = {
            "quote_id": quote_id,
            "name": "Test Renovatie Project",
            "start_date": "2024-01-15T00:00:00Z",
            "end_date": "2024-02-15T00:00:00Z",
            "notes": "Test project notities"
        }
        
        success, response = self.run_test(
            "Create Project",
            "POST",
            "projects",
            200,
            data=project_data
        )
        
        if not success:
            return False
            
        project_id = response.get('id')
        print(f"   Created project: {project_id}")
        
        # Get project details
        success, response = self.run_test(
            "Get Project Details",
            "GET",
            f"projects/{project_id}",
            200
        )
        
        if success and response.get('name') == project_data['name']:
            print(f"   Project verified: {response.get('name')}")
        
        # Update project status
        success, response = self.run_test(
            "Update Project Status",
            "PUT",
            f"projects/{project_id}",
            200,
            data={"status": "in uitvoering"}
        )
        
        if success:
            print(f"   Status updated to: {response.get('status')}")
        
        return success

    def test_export_functionality(self):
        """Test PDF and Excel export"""
        print("\n📄 Testing Export Functionality...")
        
        if not self.created_resources['quotes']:
            print("❌ No quotes available for export testing")
            return False
            
        quote_id = self.created_resources['quotes'][0]
        
        # Test PDF export
        success, _ = self.run_test(
            "Export Quote PDF",
            "GET",
            f"quotes/{quote_id}/export/pdf",
            200
        )
        
        if success:
            print("   ✅ PDF export successful")
        
        # Test Excel export
        success, _ = self.run_test(
            "Export Quote Excel",
            "GET",
            f"quotes/{quote_id}/export/excel",
            200
        )
        
        if success:
            print("   ✅ Excel export successful")
        
        return success

def main():
    print("🚀 Starting Offerte Dashboard API Tests")
    print("=" * 50)
    
    tester = OfferteAPITester()
    
    # Setup test environment
    if not tester.setup_test_user():
        print("❌ Failed to setup test environment")
        return 1
    
    try:
        # Run all tests
        test_results = []
        
        test_results.append(("Authentication", tester.test_auth()))
        test_results.append(("Dashboard Stats", tester.test_dashboard_stats()))
        test_results.append(("Leads CRUD", tester.test_leads_crud()))
        test_results.append(("Quotes & Line Items", tester.test_quotes_and_line_items()))
        test_results.append(("Materials Catalog", tester.test_materials_catalog()))
        test_results.append(("Projects", tester.test_projects()))
        test_results.append(("Export Functionality", tester.test_export_functionality()))
        
        # Print results summary
        print("\n" + "=" * 50)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 50)
        
        for test_name, result in test_results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:<25} {status}")
        
        print(f"\nOverall: {tester.tests_passed}/{tester.tests_run} tests passed")
        
        # Determine success
        all_passed = all(result for _, result in test_results)
        if all_passed:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️ Some tests failed")
            return 1
            
    finally:
        # Cleanup
        tester.cleanup_test_data()

if __name__ == "__main__":
    sys.exit(main())
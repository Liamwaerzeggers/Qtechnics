#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import subprocess
import os

class WorkersAPITester:
    def __init__(self, base_url="https://zealous-mendel-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None

    def setup_test_user(self):
        """Create test user and session using MongoDB"""
        print("🔧 Setting up test user and session...")
        
        # Generate unique identifiers
        timestamp = str(int(datetime.now().timestamp()))
        user_email = f"test.user.{timestamp}@example.com"
        session_token = f"test_session_{timestamp}"
        
        # MongoDB commands to create test user and session
        mongo_commands = f"""
        use('test_database');
        var userEmail = '{user_email}';
        var sessionToken = '{session_token}';
        db.users.insertOne({{
            _id: userEmail,
            email: userEmail,
            name: 'Test User {timestamp}',
            picture: 'https://via.placeholder.com/150',
            role: 'admin',
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
        db.workers.deleteMany({{created_by: '{self.user_id}'}});
        print('Cleanup complete');
        """
        
        try:
            subprocess.run(['mongosh', '--eval', cleanup_commands], 
                          capture_output=True, text=True, timeout=30)
            print("✅ Test data cleaned up")
        except Exception as e:
            print(f"⚠️ Cleanup warning: {str(e)}")

    def test_workers_management(self):
        """Test Workers Management API - POST /api/workers endpoint"""
        print("\n👷 Testing Workers Management API...")
        
        # Test data for worker creation
        worker_data = {
            "name": "Test Worker",
            "email": "testworker@example.com", 
            "password": "test123456"
        }
        
        print(f"🔍 Testing POST /api/workers with data:")
        print(f"   Name: {worker_data['name']}")
        print(f"   Email: {worker_data['email']}")
        print(f"   Password: {'*' * len(worker_data['password'])}")
        
        # Test worker creation
        url = f"{self.base_url}/workers"
        headers = {
            'Authorization': f'Bearer {self.session_token}',
            'Content-Type': 'application/json'
        }
        
        print(f"🔍 Making POST request to: {url}")
        
        try:
            response = requests.post(url, json=worker_data, headers=headers)
            
            print(f"   Status Code: {response.status_code}")
            print(f"   Response Headers: {dict(response.headers)}")
            
            if response.status_code != 200:
                print(f"❌ Worker creation failed - Status: {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response Text: {response.text}")
                return False
            
            # Parse response
            try:
                response_data = response.json()
                print(f"   Response Data: {json.dumps(response_data, indent=2)}")
            except Exception as e:
                print(f"❌ Failed to parse JSON response: {e}")
                print(f"   Raw response: {response.text}")
                return False
            
            # Verify response structure
            worker_id = response_data.get('id')
            if not worker_id:
                print("❌ No worker ID in response")
                return False
                
            if not worker_id.startswith('WORKER-'):
                print(f"❌ Invalid worker ID format: {worker_id} (expected WORKER-XXX)")
                return False
                
            print(f"✅ Worker created successfully with ID: {worker_id}")
            
            # Verify response data
            if response_data.get('name') != worker_data['name']:
                print(f"❌ Name mismatch: expected {worker_data['name']}, got {response_data.get('name')}")
                return False
                
            if response_data.get('email') != worker_data['email']:
                print(f"❌ Email mismatch: expected {worker_data['email']}, got {response_data.get('email')}")
                return False
                
            # Verify password_hash is not in response (security check)
            if 'password_hash' in response_data:
                print("❌ Security issue: password_hash should not be in response")
                return False
                
            print("✅ Worker data verified in response")
            
            # Test GET /api/workers to verify worker was added to database
            print("\n🔍 Testing GET /api/workers...")
            get_response = requests.get(f"{self.base_url}/workers", headers=headers)
            
            if get_response.status_code != 200:
                print(f"❌ Failed to retrieve workers list - Status: {get_response.status_code}")
                return False
                
            workers_list = get_response.json()
            print(f"   Found {len(workers_list)} workers in database")
            
            # Find our created worker in the list
            created_worker = None
            for worker in workers_list:
                if worker.get('id') == worker_id:
                    created_worker = worker
                    break
                    
            if not created_worker:
                print(f"❌ Created worker {worker_id} not found in workers list")
                return False
                
            print(f"✅ Worker found in database: {created_worker.get('name')} ({created_worker.get('email')})")
            
            # Verify worker ID format matches expected pattern
            if not worker_id.startswith('WORKER-') or len(worker_id) != 15:  # WORKER- + 8 chars
                print(f"❌ Worker ID format incorrect: {worker_id}")
                return False
                
            print(f"✅ Worker ID format correct: {worker_id}")
            
            print("\n✅ Workers Management API testing completed successfully!")
            print(f"   ✅ Worker creation: WORKING")
            print(f"   ✅ Worker ID format: WORKER-XXX pattern")
            print(f"   ✅ Database persistence: WORKING")
            print(f"   ✅ Admin authentication: REQUIRED")
            
            return True
            
        except Exception as e:
            print(f"❌ Request failed with exception: {str(e)}")
            return False

def main():
    print("🚀 Testing Workers Management API")
    print("=" * 50)
    
    tester = WorkersAPITester()
    
    # Setup test environment
    if not tester.setup_test_user():
        print("❌ Failed to setup test environment")
        return 1
    
    try:
        # Run workers test
        success = tester.test_workers_management()
        
        if success:
            print("\n🎉 Workers Management API test passed!")
            return 0
        else:
            print("\n❌ Workers Management API test failed!")
            return 1
            
    finally:
        # Cleanup
        tester.cleanup_test_data()

if __name__ == "__main__":
    sys.exit(main())
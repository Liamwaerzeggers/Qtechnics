#!/usr/bin/env python3
"""
Worker Project Visibility Debug Test
====================================

This script specifically tests the issue where workers can't see projects.
It will:
1. Create a test admin user and projects
2. Create a test worker user
3. Test worker login functionality
4. Debug GET /api/projects with worker session
5. Check database directly for projects
6. Analyze the backend query logic

Based on review request: Workers should see ALL projects (not filtered by user_id)
"""

import requests
import subprocess
import json
from datetime import datetime, timezone, timedelta
import sys
import os

class WorkerProjectDebugger:
    def __init__(self, base_url="https://zealous-mendel-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_session_token = None
        self.admin_user_id = None
        self.worker_session_token = None
        self.worker_user_id = None
        self.created_projects = []
        
    def log(self, message, level="INFO"):
        """Enhanced logging with timestamps"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def setup_admin_user(self):
        """Create admin user and session"""
        self.log("Setting up admin user...")
        
        timestamp = str(int(datetime.now().timestamp()))
        admin_email = f"admin.test.{timestamp}@qtechnics.nl"
        admin_session = f"admin_session_{timestamp}"
        
        mongo_commands = f"""
        use('test_database');
        var adminEmail = '{admin_email}';
        var sessionToken = '{admin_session}';
        
        // Create admin user
        db.users.insertOne({{
            _id: adminEmail,
            email: adminEmail,
            name: 'Admin Test User',
            role: 'admin',
            picture: 'https://via.placeholder.com/150',
            created_at: new Date().toISOString()
        }});
        
        // Create admin session
        db.user_sessions.insertOne({{
            user_id: adminEmail,
            session_token: sessionToken,
            expires_at: new Date(Date.now() + 7*24*60*60*1000),
            created_at: new Date()
        }});
        
        print('Admin setup complete');
        """
        
        try:
            result = subprocess.run(['mongosh', '--eval', mongo_commands], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                self.admin_session_token = admin_session
                self.admin_user_id = admin_email
                self.log(f"✅ Admin user created: {admin_email}")
                return True
            else:
                self.log(f"❌ Admin setup failed: {result.stderr}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Admin setup error: {str(e)}", "ERROR")
            return False
    
    def setup_worker_user(self):
        """Create worker user directly in database"""
        self.log("Setting up worker user...")
        
        timestamp = str(int(datetime.now().timestamp()))
        worker_email = f"worker.test.{timestamp}@qtechnics.nl"
        worker_id = f"WORKER-{timestamp[:8].upper()}"
        
        # Create password hash (simple for testing)
        import hashlib
        password_hash = hashlib.sha256("testpassword123".encode()).hexdigest()
        
        mongo_commands = f"""
        use('test_database');
        var workerEmail = '{worker_email}';
        var workerId = '{worker_id}';
        var passwordHash = '{password_hash}';
        
        // Create worker user in workers collection
        db.workers.insertOne({{
            id: workerId,
            email: workerEmail,
            name: 'Test Worker',
            password_hash: passwordHash,
            created_by: '{self.admin_user_id}',
            created_at: new Date(),
            is_active: true
        }});
        
        // Also create in users collection with worker role (using worker ID as _id)
        db.users.insertOne({{
            _id: workerId,
            email: workerEmail,
            name: 'Test Worker',
            role: 'worker',
            created_at: new Date().toISOString()
        }});
        
        print('Worker setup complete');
        """
        
        try:
            result = subprocess.run(['mongosh', '--eval', mongo_commands], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                self.worker_user_id = worker_email
                self.log(f"✅ Worker user created: {worker_email}")
                self.log(f"✅ Worker ID: {worker_id}")
                return True, worker_email, "testpassword123"
            else:
                self.log(f"❌ Worker setup failed: {result.stderr}", "ERROR")
                return False, None, None
        except Exception as e:
            self.log(f"❌ Worker setup error: {str(e)}", "ERROR")
            return False, None, None
    
    def create_test_projects(self):
        """Create test projects using admin session"""
        self.log("Creating test projects with admin user...")
        
        if not self.admin_session_token:
            self.log("❌ No admin session available", "ERROR")
            return False
        
        # First create a lead
        lead_data = {
            "name": "Test Klant voor Worker Test",
            "email": "testklant@example.com",
            "phone": "+31612345678",
            "address": "Test Straat 123, Amsterdam",
            "project_type": "Renovatie",
            "description": "Test project voor worker visibility test"
        }
        
        headers = {'Authorization': f'Bearer {self.admin_session_token}'}
        
        try:
            # Create lead
            response = requests.post(f"{self.base_url}/leads", json=lead_data, headers=headers)
            if response.status_code != 200:
                self.log(f"❌ Failed to create lead: {response.status_code} - {response.text}", "ERROR")
                return False
            
            lead = response.json()
            lead_id = lead.get('id')
            self.log(f"✅ Created lead: {lead_id}")
            
            # Create quote
            quote_data = {"lead_id": lead_id}
            response = requests.post(f"{self.base_url}/quotes", json=quote_data, headers=headers)
            if response.status_code != 200:
                self.log(f"❌ Failed to create quote: {response.status_code} - {response.text}", "ERROR")
                return False
            
            quote = response.json()
            quote_id = quote.get('id')
            self.log(f"✅ Created quote: {quote_id}")
            
            # Create multiple projects
            project_names = [
                "Badkamer Renovatie - Worker Test 1",
                "Keuken Verbouwing - Worker Test 2", 
                "Schilderwerk - Worker Test 3"
            ]
            
            for i, project_name in enumerate(project_names):
                project_data = {
                    "quote_id": quote_id,
                    "name": project_name,
                    "start_date": f"2024-0{i+1}-15T00:00:00Z",
                    "end_date": f"2024-0{i+2}-15T00:00:00Z",
                    "notes": f"Test project {i+1} voor worker visibility test",
                    "status": "gepland"
                }
                
                response = requests.post(f"{self.base_url}/projects", json=project_data, headers=headers)
                if response.status_code != 200:
                    self.log(f"❌ Failed to create project {i+1}: {response.status_code} - {response.text}", "ERROR")
                    continue
                
                project = response.json()
                project_id = project.get('id')
                self.created_projects.append(project_id)
                self.log(f"✅ Created project {i+1}: {project_id} - {project_name}")
            
            self.log(f"✅ Total projects created: {len(self.created_projects)}")
            return len(self.created_projects) > 0
            
        except Exception as e:
            self.log(f"❌ Error creating projects: {str(e)}", "ERROR")
            return False
    
    def test_worker_login(self, worker_email, worker_password):
        """Test worker login via POST /api/auth/worker/login"""
        self.log("Testing worker login...")
        
        # Worker login expects query parameters, not JSON body
        params = {
            "email": worker_email,
            "password": worker_password
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/worker/login", params=params)
            
            self.log(f"Worker login response status: {response.status_code}")
            
            if response.status_code == 200:
                login_response = response.json()
                self.worker_session_token = login_response.get('session_token')
                user_data = login_response.get('user', {})
                
                self.log(f"✅ Worker login successful!")
                self.log(f"   Session token: {self.worker_session_token[:20]}...")
                self.log(f"   User email: {user_data.get('email')}")
                self.log(f"   User role: {user_data.get('role')}")
                self.log(f"   User name: {user_data.get('name')}")
                
                return True
            else:
                self.log(f"❌ Worker login failed: {response.status_code}", "ERROR")
                try:
                    error_detail = response.json()
                    self.log(f"   Error details: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response text: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Worker login error: {str(e)}", "ERROR")
            return False
    
    def test_worker_projects_access(self):
        """Test GET /api/projects with worker session - THE MAIN DEBUG POINT"""
        self.log("🔍 DEBUGGING: Testing worker access to projects...")
        
        if not self.worker_session_token:
            self.log("❌ No worker session token available", "ERROR")
            return False
        
        headers = {'Authorization': f'Bearer {self.worker_session_token}'}
        
        try:
            self.log(f"Making GET request to: {self.base_url}/projects")
            self.log(f"Using worker session token: {self.worker_session_token[:20]}...")
            
            response = requests.get(f"{self.base_url}/projects", headers=headers)
            
            self.log(f"Response status code: {response.status_code}")
            self.log(f"Response headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                projects = response.json()
                self.log(f"✅ Projects API call successful!")
                self.log(f"   Number of projects returned: {len(projects)}")
                
                if len(projects) == 0:
                    self.log("❌ ISSUE FOUND: Worker sees 0 projects (should see all projects)", "ERROR")
                    self.log("   This matches the reported issue: 'Nog geen projecten'", "ERROR")
                else:
                    self.log("✅ Worker can see projects!")
                    for i, project in enumerate(projects[:3]):  # Show first 3
                        self.log(f"   Project {i+1}: {project.get('id')} - {project.get('name')}")
                        self.log(f"     Status: {project.get('status')}")
                        self.log(f"     Created by user_id: {project.get('user_id')}")
                
                return len(projects) > 0
                
            elif response.status_code == 401:
                self.log("❌ Worker session is not authenticated properly", "ERROR")
                try:
                    error_detail = response.json()
                    self.log(f"   Auth error: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response: {response.text}", "ERROR")
                return False
                
            else:
                self.log(f"❌ Unexpected response: {response.status_code}", "ERROR")
                try:
                    error_detail = response.json()
                    self.log(f"   Error: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error testing worker projects access: {str(e)}", "ERROR")
            return False
    
    def check_database_projects(self):
        """Check database directly for projects"""
        self.log("🔍 DEBUGGING: Checking database directly for projects...")
        
        mongo_commands = f"""
        use('test_database');
        
        // Count total projects in database
        var totalProjects = db.projects.countDocuments({{}});
        print('Total projects in database: ' + totalProjects);
        
        // Show all projects with key fields
        var projects = db.projects.find({{}}, {{id: 1, name: 1, user_id: 1, status: 1, _id: 0}}).toArray();
        print('Projects in database:');
        projects.forEach(function(project) {{
            print('  ID: ' + project.id + ', Name: ' + project.name + ', User: ' + project.user_id + ', Status: ' + project.status);
        }});
        
        // Check if our created projects exist
        var createdProjectIds = {json.dumps(self.created_projects)};
        createdProjectIds.forEach(function(projectId) {{
            var project = db.projects.findOne({{id: projectId}});
            if (project) {{
                print('✅ Found created project: ' + projectId + ' - ' + project.name);
            }} else {{
                print('❌ Missing created project: ' + projectId);
            }}
        }});
        """
        
        try:
            result = subprocess.run(['mongosh', '--eval', mongo_commands], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                self.log("Database check output:")
                for line in result.stdout.strip().split('\n'):
                    if line.strip():
                        self.log(f"   {line}")
                return True
            else:
                self.log(f"❌ Database check failed: {result.stderr}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Database check error: {str(e)}", "ERROR")
            return False
    
    def debug_worker_session(self):
        """Debug worker session validity"""
        self.log("🔍 DEBUGGING: Checking worker session validity...")
        
        if not self.worker_session_token:
            self.log("❌ No worker session token to debug", "ERROR")
            return False
        
        # Check session in database - worker sessions are in 'sessions' collection, not 'user_sessions'
        mongo_commands = f"""
        use('test_database');
        
        var sessionToken = '{self.worker_session_token}';
        
        // Check in sessions collection (for workers)
        var session = db.sessions.findOne({{session_token: sessionToken}});
        if (session) {{
            print('✅ Worker session found in sessions collection');
            print('  User ID: ' + session.user_id);
            print('  Expires at: ' + session.expires_at);
            print('  Created at: ' + session.created_at);
            
            // Check if worker exists by ID
            var worker = db.workers.findOne({{id: session.user_id}});
            if (worker) {{
                print('✅ Worker found in workers collection');
                print('  Email: ' + worker.email);
                print('  Name: ' + worker.name);
                print('  Active: ' + worker.is_active);
            }} else {{
                print('❌ Worker not found for session user_id: ' + session.user_id);
            }}
            
            // Also check if user exists in users collection
            var user = db.users.findOne({{_id: session.user_id}});
            if (user) {{
                print('✅ User found in users collection');
                print('  Email: ' + user.email);
                print('  Name: ' + user.name);
                print('  Role: ' + user.role);
            }} else {{
                print('❌ User not found in users collection for ID: ' + session.user_id);
            }}
        }} else {{
            print('❌ Session not found in sessions collection');
            
            // Also check user_sessions collection just in case
            var userSession = db.user_sessions.findOne({{session_token: sessionToken}});
            if (userSession) {{
                print('⚠️ Found session in user_sessions collection instead');
                print('  User ID: ' + userSession.user_id);
            }} else {{
                print('❌ Session not found in user_sessions collection either');
            }}
        }}
        """
        
        try:
            result = subprocess.run(['mongosh', '--eval', mongo_commands], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                self.log("Session debug output:")
                for line in result.stdout.strip().split('\n'):
                    if line.strip():
                        self.log(f"   {line}")
                return True
            else:
                self.log(f"❌ Session debug failed: {result.stderr}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Session debug error: {str(e)}", "ERROR")
            return False
    
    def test_admin_projects_access(self):
        """Test admin access to projects for comparison"""
        self.log("🔍 COMPARISON: Testing admin access to projects...")
        
        if not self.admin_session_token:
            self.log("❌ No admin session token available", "ERROR")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_session_token}'}
        
        try:
            response = requests.get(f"{self.base_url}/projects", headers=headers)
            
            if response.status_code == 200:
                projects = response.json()
                self.log(f"✅ Admin sees {len(projects)} projects")
                
                for i, project in enumerate(projects[:3]):  # Show first 3
                    self.log(f"   Project {i+1}: {project.get('id')} - {project.get('name')}")
                    self.log(f"     Created by user_id: {project.get('user_id')}")
                
                return True
            else:
                self.log(f"❌ Admin projects access failed: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error testing admin projects access: {str(e)}", "ERROR")
            return False
    
    def analyze_backend_logic(self):
        """Analyze the backend logic for GET /api/projects"""
        self.log("🔍 ANALYSIS: Backend logic for GET /api/projects")
        self.log("From server.py lines 932-948:")
        self.log("   if current_user.role == 'worker':")
        self.log("       projects = await db.projects.find({}, {'_id': 0}).to_list(1000)")
        self.log("   else:")
        self.log("       projects = await db.projects.find({'user_id': current_user.id}, {'_id': 0}).to_list(1000)")
        self.log("")
        self.log("EXPECTED BEHAVIOR:")
        self.log("   - Workers should see ALL projects (no user_id filter)")
        self.log("   - Admins should see only their own projects (with user_id filter)")
        self.log("")
        self.log("POSSIBLE ISSUES:")
        self.log("   1. Worker role not being detected correctly")
        self.log("   2. Worker session/authentication issue")
        self.log("   3. Database query issue")
        self.log("   4. Projects not actually in database")
    
    def cleanup(self):
        """Clean up test data"""
        self.log("🧹 Cleaning up test data...")
        
        cleanup_commands = f"""
        use('test_database');
        
        // Clean up admin user
        if ('{self.admin_user_id}') {{
            db.users.deleteMany({{_id: '{self.admin_user_id}'}});
            db.user_sessions.deleteMany({{user_id: '{self.admin_user_id}'}});
            db.leads.deleteMany({{user_id: '{self.admin_user_id}'}});
            db.quotes.deleteMany({{user_id: '{self.admin_user_id}'}});
            db.projects.deleteMany({{user_id: '{self.admin_user_id}'}});
            db.line_items.deleteMany({{quote_id: {{$regex: /^OFF-/}}}});
        }}
        
        // Clean up worker user
        if ('{self.worker_user_id}') {{
            db.workers.deleteMany({{email: '{self.worker_user_id}'}});
            db.sessions.deleteMany({{user_id: {{$regex: /^WORKER-/}}}});
            
            // Find worker ID to clean up users collection
            var worker = db.workers.findOne({{email: '{self.worker_user_id}'}});
            if (worker) {{
                db.users.deleteMany({{_id: worker.id}});
            }}
        }}
        
        print('Cleanup complete');
        """
        
        try:
            subprocess.run(['mongosh', '--eval', cleanup_commands], 
                          capture_output=True, text=True, timeout=30)
            self.log("✅ Cleanup completed")
        except Exception as e:
            self.log(f"⚠️ Cleanup warning: {str(e)}", "WARN")

def main():
    print("🔍 WORKER PROJECT VISIBILITY DEBUG TEST")
    print("=" * 60)
    print("Issue: Workers can't see projects - they see 'Nog geen projecten'")
    print("Expected: Workers should see ALL projects (not filtered by user_id)")
    print("=" * 60)
    
    debugger = WorkerProjectDebugger()
    
    try:
        # Step 1: Setup admin user and create projects
        debugger.log("STEP 1: Setting up admin user and creating test projects")
        if not debugger.setup_admin_user():
            debugger.log("❌ Failed to setup admin user", "ERROR")
            return 1
        
        if not debugger.create_test_projects():
            debugger.log("❌ Failed to create test projects", "ERROR")
            return 1
        
        # Step 2: Setup worker user
        debugger.log("STEP 2: Setting up worker user")
        success, worker_email, worker_password = debugger.setup_worker_user()
        if not success:
            debugger.log("❌ Failed to setup worker user", "ERROR")
            return 1
        
        # Step 3: Test worker login
        debugger.log("STEP 3: Testing worker login")
        if not debugger.test_worker_login(worker_email, worker_password):
            debugger.log("❌ Worker login failed", "ERROR")
            return 1
        
        # Step 4: Debug worker session
        debugger.log("STEP 4: Debugging worker session")
        debugger.debug_worker_session()
        
        # Step 5: Check database for projects
        debugger.log("STEP 5: Checking database for projects")
        debugger.check_database_projects()
        
        # Step 6: Test admin access (for comparison)
        debugger.log("STEP 6: Testing admin access to projects (comparison)")
        debugger.test_admin_projects_access()
        
        # Step 7: Test worker access to projects (THE MAIN TEST)
        debugger.log("STEP 7: Testing worker access to projects (MAIN DEBUG POINT)")
        worker_can_see_projects = debugger.test_worker_projects_access()
        
        # Step 8: Analyze backend logic
        debugger.log("STEP 8: Analyzing backend logic")
        debugger.analyze_backend_logic()
        
        # Final analysis
        print("\n" + "=" * 60)
        print("🔍 FINAL ANALYSIS")
        print("=" * 60)
        
        if worker_can_see_projects:
            debugger.log("✅ RESULT: Worker CAN see projects - issue may be resolved", "SUCCESS")
            return 0
        else:
            debugger.log("❌ RESULT: Worker CANNOT see projects - issue confirmed", "ERROR")
            debugger.log("This confirms the reported issue: 'Nog geen projecten'", "ERROR")
            debugger.log("", "ERROR")
            debugger.log("RECOMMENDED ACTIONS:", "ERROR")
            debugger.log("1. Check if worker role is being detected correctly in get_current_user()", "ERROR")
            debugger.log("2. Verify worker session is valid and not expired", "ERROR")
            debugger.log("3. Check if the database query logic is working as expected", "ERROR")
            debugger.log("4. Test the backend endpoint directly with curl", "ERROR")
            return 1
    
    finally:
        debugger.cleanup()

if __name__ == "__main__":
    sys.exit(main())
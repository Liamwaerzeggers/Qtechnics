#!/usr/bin/env python3
"""
Quick test to verify worker project access is working
"""

import requests
import subprocess
import hashlib
from datetime import datetime

def create_test_worker():
    """Create a test worker in the database"""
    timestamp = str(int(datetime.now().timestamp()))
    worker_email = f"testworker.{timestamp}@qtechnics.nl"
    worker_id = f"WORKER-{timestamp[:8].upper()}"
    password = "testpass123"
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    mongo_commands = f"""
    use('test_database');
    
    // Create worker
    db.workers.insertOne({{
        id: '{worker_id}',
        email: '{worker_email}',
        name: 'Test Worker Quick',
        password_hash: '{password_hash}',
        created_by: 'test@qtechnics.nl',
        created_at: new Date(),
        is_active: true
    }});
    
    // Create user entry
    db.users.insertOne({{
        _id: '{worker_id}',
        email: '{worker_email}',
        name: 'Test Worker Quick',
        role: 'worker',
        created_at: new Date().toISOString()
    }});
    
    print('Worker created: {worker_email}');
    """
    
    try:
        result = subprocess.run(['mongosh', '--eval', mongo_commands], 
                              capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            print(f"✅ Created test worker: {worker_email}")
            return worker_email, password
        else:
            print(f"❌ Failed to create worker: {result.stderr}")
            return None, None
    except Exception as e:
        print(f"❌ Error creating worker: {str(e)}")
        return None, None

def test_worker_login_and_projects(email, password):
    """Test worker login and project access"""
    base_url = "https://build-portal-5.preview.emergentagent.com/api"
    
    # Test login
    print(f"🔍 Testing login for {email}...")
    params = {"email": email, "password": password}
    
    try:
        response = requests.post(f"{base_url}/auth/worker/login", params=params)
        
        if response.status_code != 200:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
        
        login_data = response.json()
        session_token = login_data.get('session_token')
        user_data = login_data.get('user', {})
        
        print(f"✅ Login successful!")
        print(f"   User: {user_data.get('name')} ({user_data.get('email')})")
        print(f"   Role: {user_data.get('role')}")
        
        # Test projects access
        print(f"🔍 Testing projects access...")
        headers = {'Authorization': f'Bearer {session_token}'}
        
        response = requests.get(f"{base_url}/projects", headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Projects access failed: {response.status_code} - {response.text}")
            return False
        
        projects = response.json()
        print(f"✅ Projects access successful!")
        print(f"   Number of projects visible: {len(projects)}")
        
        if len(projects) > 0:
            print(f"   Sample projects:")
            for i, project in enumerate(projects[:3]):
                print(f"     {i+1}. {project.get('name')} (Status: {project.get('status')})")
        
        return len(projects) > 0
        
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        return False

def cleanup_test_worker(email):
    """Clean up test worker"""
    mongo_commands = f"""
    use('test_database');
    
    var worker = db.workers.findOne({{email: '{email}'}});
    if (worker) {{
        db.users.deleteOne({{_id: worker.id}});
        db.workers.deleteOne({{email: '{email}'}});
        db.sessions.deleteMany({{user_id: worker.id}});
        print('Cleanup complete for {email}');
    }}
    """
    
    try:
        subprocess.run(['mongosh', '--eval', mongo_commands], 
                      capture_output=True, text=True, timeout=30)
        print(f"✅ Cleaned up test worker: {email}")
    except Exception as e:
        print(f"⚠️ Cleanup warning: {str(e)}")

def main():
    print("🚀 Quick Worker Project Access Test")
    print("=" * 40)
    
    # Create test worker
    email, password = create_test_worker()
    if not email:
        print("❌ Failed to create test worker")
        return 1
    
    try:
        # Test worker functionality
        success = test_worker_login_and_projects(email, password)
        
        print("\n" + "=" * 40)
        if success:
            print("🎉 SUCCESS: Worker can login and see projects!")
            print("✅ The issue has been RESOLVED")
            return 0
        else:
            print("❌ FAILURE: Worker cannot access projects")
            print("❌ The issue is NOT resolved")
            return 1
            
    finally:
        # Cleanup
        cleanup_test_worker(email)

if __name__ == "__main__":
    exit(main())
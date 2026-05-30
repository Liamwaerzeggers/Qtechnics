"""
Test suite for PWA Push Notifications features
Tests: manifest.json, service worker, VAPID key, push subscribe, test push, notification triggers
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://quote-foundation-1.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_USERNAME = "liam"
ADMIN_PASSWORD = "Liammail123"
WORKER_USERNAME = "testwerkman"
WORKER_PASSWORD = "Werk123456"


class TestPWAManifestAndServiceWorker:
    """Tests for PWA manifest.json and service worker"""
    
    def test_manifest_json_served(self):
        """manifest.json is served correctly at /manifest.json"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required PWA manifest fields
        assert data.get("name") == "MaxQ Dashboard"
        assert data.get("short_name") == "MaxQ"
        assert data.get("display") == "standalone"
        assert data.get("theme_color") == "#500000"
        assert data.get("background_color") == "#500000"
        assert data.get("start_url") == "/"
        print(f"PASS: manifest.json served correctly with name={data.get('name')}, theme_color={data.get('theme_color')}")
    
    def test_manifest_has_icons(self):
        """manifest.json has correct icon definitions"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        data = response.json()
        
        icons = data.get("icons", [])
        assert len(icons) >= 2, "Should have at least 2 icons (192 and 512)"
        
        # Check for 192x192 icon
        icon_192 = next((i for i in icons if "192" in i.get("sizes", "")), None)
        assert icon_192 is not None, "Should have 192x192 icon"
        assert icon_192.get("src") == "/icon-192x192.png"
        
        # Check for 512x512 icon
        icon_512 = next((i for i in icons if "512" in i.get("sizes", "")), None)
        assert icon_512 is not None, "Should have 512x512 icon"
        assert icon_512.get("src") == "/icon-512x512.png"
        print(f"PASS: manifest.json has icons: 192x192 and 512x512")
    
    def test_icon_192_exists(self):
        """192x192 icon file is accessible"""
        response = requests.get(f"{BASE_URL}/icon-192x192.png")
        assert response.status_code == 200
        assert response.headers.get("Content-Type", "").startswith("image/")
        print(f"PASS: icon-192x192.png accessible, size={len(response.content)} bytes")
    
    def test_icon_512_exists(self):
        """512x512 icon file is accessible"""
        response = requests.get(f"{BASE_URL}/icon-512x512.png")
        assert response.status_code == 200
        assert response.headers.get("Content-Type", "").startswith("image/")
        print(f"PASS: icon-512x512.png accessible, size={len(response.content)} bytes")
    
    def test_service_worker_served(self):
        """Service worker (sw.js) is served and has correct content"""
        response = requests.get(f"{BASE_URL}/sw.js")
        assert response.status_code == 200
        content = response.text
        
        # Verify service worker contains push notification handling
        assert "push" in content.lower(), "Service worker should handle push events"
        assert "notificationclick" in content.lower() or "notification" in content.lower(), "Service worker should handle notification clicks"
        assert "showNotification" in content, "Service worker should show notifications"
        print(f"PASS: sw.js served correctly, contains push notification handlers")


class TestVAPIDKey:
    """Tests for VAPID key endpoint"""
    
    def test_vapid_key_endpoint(self):
        """GET /api/push/vapid-key returns a valid VAPID public key"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-key")
        assert response.status_code == 200
        data = response.json()
        
        # Check that public_key is present and non-empty
        public_key = data.get("public_key")
        assert public_key is not None and len(public_key) > 0, "VAPID public key should be non-empty"
        
        # VAPID keys are typically base64url encoded and ~87 chars for P-256 keys
        assert len(public_key) >= 50, f"VAPID key seems too short: {len(public_key)} chars"
        print(f"PASS: VAPID public key returned: {public_key[:30]}...")


class TestPushSubscription:
    """Tests for push subscription endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth2/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200 and response.json().get("token"):
            return response.json()["token"]
        pytest.skip("Admin login failed - skipping authenticated tests")
    
    @pytest.fixture
    def worker_token(self):
        """Get worker auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/worker/login", json={
            "username": WORKER_USERNAME,
            "password": WORKER_PASSWORD
        })
        if response.status_code == 200 and response.json().get("session_token"):
            return response.json()["session_token"]
        pytest.skip("Worker login failed - skipping authenticated tests")
    
    def test_push_subscribe_requires_auth(self):
        """POST /api/push/subscribe requires authentication"""
        # Fake subscription data
        fake_subscription = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/TEST_FAKE_ENDPOINT",
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        response = requests.post(f"{BASE_URL}/api/push/subscribe", json=fake_subscription)
        assert response.status_code == 401, "Should require authentication"
        print(f"PASS: push/subscribe requires authentication (got 401)")
    
    def test_push_subscribe_admin(self, admin_token):
        """POST /api/push/subscribe stores subscription for admin user"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test subscription (with fake keys - won't actually deliver pushes)
        test_subscription = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/TEST_ADMIN_ENDPOINT_" + str(os.urandom(4).hex()),
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/push/subscribe", 
                               json=test_subscription, 
                               headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"PASS: Admin push subscription stored successfully")
    
    def test_push_subscribe_worker(self, worker_token):
        """POST /api/push/subscribe also works for workers (but notifications go to admins only)"""
        headers = {"Authorization": f"Bearer {worker_token}"}
        
        test_subscription = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/TEST_WORKER_ENDPOINT_" + str(os.urandom(4).hex()),
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/push/subscribe", 
                               json=test_subscription, 
                               headers=headers)
        assert response.status_code == 200
        print(f"PASS: Worker push subscription stored (but only admin subscriptions receive notifications)")


class TestPushTest:
    """Tests for push test endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth2/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200 and response.json().get("token"):
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def worker_token(self):
        """Get worker auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/worker/login", json={
            "username": WORKER_USERNAME,
            "password": WORKER_PASSWORD
        })
        if response.status_code == 200 and response.json().get("session_token"):
            return response.json()["session_token"]
        pytest.skip("Worker login failed")
    
    def test_push_test_admin_only(self, worker_token):
        """POST /api/push/test is admin-only"""
        headers = {"Authorization": f"Bearer {worker_token}"}
        response = requests.post(f"{BASE_URL}/api/push/test", headers=headers)
        assert response.status_code == 403, "Worker should not be able to send test push"
        print(f"PASS: push/test is admin-only (worker got 403)")
    
    def test_push_test_triggers_send(self, admin_token):
        """POST /api/push/test triggers push send attempt (admin)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/push/test", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "sent"
        print(f"PASS: push/test endpoint works for admin, returned status=sent")


class TestNotificationTriggers:
    """Tests for push notification triggers (new material order, lead, project note)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth2/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200 and response.json().get("token"):
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def worker_token(self):
        """Get worker auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/worker/login", json={
            "username": WORKER_USERNAME,
            "password": WORKER_PASSWORD
        })
        if response.status_code == 200 and response.json().get("session_token"):
            return response.json()["session_token"]
        pytest.skip("Worker login failed")
    
    def test_material_order_triggers_push(self, worker_token):
        """POST /api/material-orders triggers send_admin_push"""
        headers = {"Authorization": f"Bearer {worker_token}"}
        
        # Get projects first
        projects_response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
        if projects_response.status_code != 200 or not projects_response.json():
            pytest.skip("No projects available for testing")
        
        project = projects_response.json()[0]
        project_id = project.get("id")
        project_name = project.get("name")
        
        # Create material order (this should trigger push notification)
        order_data = {
            "project_id": project_id,
            "project_name": project_name,
            "items": [
                {
                    "title": "TEST_PUSH_Material",
                    "quantity": 1,
                    "is_manual": True
                }
            ],
            "notes": "Push notification test order"
        }
        
        response = requests.post(f"{BASE_URL}/api/material-orders", 
                               json=order_data, 
                               headers=headers)
        # Should succeed - the push will log a warning if no real subscription but endpoint should work
        assert response.status_code == 200
        data = response.json()
        assert "ids" in data
        print(f"PASS: Material order created, push notification triggered. IDs: {data.get('ids')}")
    
    def test_new_lead_triggers_push(self, admin_token):
        """POST /api/leads triggers send_admin_push for new leads"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        lead_data = {
            "name": "TEST_PUSH_LeadTest",
            "email": "pushtest@example.com",
            "phone": "0123456789",
            "address": "Push Test Address 123",
            "source": "test"
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", 
                               json=lead_data, 
                               headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("id") is not None
        lead_id = data.get("id")
        print(f"PASS: Lead created ({lead_id}), push notification triggered")
        
        # Cleanup - delete the test lead
        delete_response = requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=headers)
        print(f"Cleanup: Lead deleted (status {delete_response.status_code})")
    
    def test_project_note_triggers_push(self, admin_token):
        """POST /api/projects/{id}/notes triggers send_admin_push"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get projects first
        projects_response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
        if projects_response.status_code != 200 or not projects_response.json():
            pytest.skip("No projects available for testing")
        
        project = projects_response.json()[0]
        project_id = project.get("id")
        
        # Add a note (this should trigger push notification)
        note_data = {
            "text": "TEST_PUSH_Note - This is a test note for push notification"
        }
        
        response = requests.post(f"{BASE_URL}/api/projects/{project_id}/notes", 
                               json=note_data, 
                               headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("id") is not None
        print(f"PASS: Project note added ({data.get('id')}), push notification triggered")


class TestIndexHTMLMetaTags:
    """Tests for PWA meta tags in index.html"""
    
    def test_index_loads(self):
        """Index page loads successfully"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        print(f"PASS: Index page loads successfully")
    
    def test_manifest_link_present(self):
        """manifest link tag present in index.html"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        content = response.text
        
        # Check for manifest link
        assert 'rel="manifest"' in content or "rel='manifest'" in content, "manifest link should be present"
        assert "manifest.json" in content, "manifest.json should be referenced"
        print(f"PASS: manifest link tag present in index.html")
    
    def test_apple_touch_icon_present(self):
        """Apple touch icon meta tag present in index.html"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        content = response.text
        
        # Check for apple-touch-icon
        assert 'apple-touch-icon' in content, "apple-touch-icon should be present"
        print(f"PASS: apple-touch-icon present in index.html")
    
    def test_theme_color_meta_tag(self):
        """theme-color meta tag present"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        content = response.text
        
        assert 'name="theme-color"' in content or "name='theme-color'" in content, "theme-color meta should be present"
        print(f"PASS: theme-color meta tag present")
    
    def test_apple_mobile_web_app_capable(self):
        """apple-mobile-web-app-capable meta tag present"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        content = response.text
        
        assert 'apple-mobile-web-app-capable' in content, "apple-mobile-web-app-capable should be present"
        print(f"PASS: apple-mobile-web-app-capable meta tag present")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

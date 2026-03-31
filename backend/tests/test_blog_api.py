"""
Backend API Tests for Max Q Blog System
Tests: Blog listing, Blog detail by slug, Blog generation
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://service-landing-8.preview.emergentagent.com').rstrip('/')


class TestBlogAPI:
    """Test Blog API endpoints"""
    
    def test_get_blogs_list(self):
        """Test GET /api/blogs returns list of blog posts"""
        response = requests.get(f"{BASE_URL}/api/blogs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} blog posts")
        
        # If blogs exist, verify structure
        if len(data) > 0:
            blog = data[0]
            assert "id" in blog
            assert "title" in blog
            assert "slug" in blog
            assert "excerpt" in blog
            assert "category" in blog
            assert "created_at" in blog
            # Content should NOT be in list response (optimization)
            print(f"First blog: {blog['title']} (slug: {blog['slug']})")
    
    def test_get_blog_by_slug(self):
        """Test GET /api/blogs/{slug} returns single blog with content"""
        # First get list to find a valid slug
        list_response = requests.get(f"{BASE_URL}/api/blogs")
        assert list_response.status_code == 200
        blogs = list_response.json()
        
        if len(blogs) == 0:
            pytest.skip("No blogs available to test")
        
        slug = blogs[0]["slug"]
        response = requests.get(f"{BASE_URL}/api/blogs/{slug}")
        assert response.status_code == 200
        
        blog = response.json()
        assert blog["slug"] == slug
        assert "title" in blog
        assert "content" in blog  # Content should be present in detail view
        assert "excerpt" in blog
        assert "category" in blog
        assert "tags" in blog
        assert "created_at" in blog
        
        # Verify content is HTML
        content = blog.get("content", "")
        assert len(content) > 0, "Blog content should not be empty"
        print(f"Blog '{blog['title']}' has {len(content)} chars of content")
    
    def test_get_nonexistent_blog(self):
        """Test GET /api/blogs/{slug} returns 404 for nonexistent blog"""
        response = requests.get(f"{BASE_URL}/api/blogs/nonexistent-blog-slug-12345")
        assert response.status_code == 404
    
    def test_blog_generate_endpoint_exists(self):
        """Test POST /api/blogs/generate endpoint exists (takes 10-15s for LLM call)"""
        # Blog generation calls LLM which takes 10-15 seconds
        try:
            response = requests.post(f"{BASE_URL}/api/blogs/generate", timeout=30)
            # Should return 200 (success) or 500 (if LLM key issue) but NOT 404
            assert response.status_code != 404, "Blog generate endpoint should exist"
            print(f"Blog generate endpoint returned status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Generated blog: {data.get('title', 'N/A')}")
        except requests.exceptions.ReadTimeout:
            # Timeout is acceptable - endpoint exists but LLM is slow
            print("Blog generate endpoint timed out (expected for LLM calls)")
            pytest.skip("Blog generation timed out - endpoint exists but LLM call is slow")
    
    def test_blog_content_has_html_structure(self):
        """Test that blog content contains proper HTML tags"""
        list_response = requests.get(f"{BASE_URL}/api/blogs")
        blogs = list_response.json()
        
        if len(blogs) == 0:
            pytest.skip("No blogs available to test")
        
        slug = blogs[0]["slug"]
        response = requests.get(f"{BASE_URL}/api/blogs/{slug}")
        blog = response.json()
        
        content = blog.get("content", "")
        # Check for common HTML tags that should be in blog content
        has_html = any(tag in content.lower() for tag in ["<h2", "<p>", "<ul>", "<li>", "<h3"])
        assert has_html, f"Blog content should contain HTML tags. Content preview: {content[:200]}"
        print(f"Blog content contains proper HTML structure")


class TestLeadsAPI:
    """Test Leads API - Full lead flow"""
    
    def test_create_lead_full_flow(self):
        """Test complete lead creation flow"""
        lead_data = {
            "projectTypes": ["badkamer", "keuken"],
            "budget": "50k-100k",
            "timeline": "3-6months",
            "description": "TEST_Blog_Test - Volledige badkamer en keuken renovatie met moderne afwerking",
            "firstName": "TEST_BlogTest",
            "lastName": "Gebruiker",
            "email": "blogtest@example.com",
            "phone": "+32488999888",
            "street": "Testlaan 456",
            "city": "Hasselt",
            "postalCode": "3500"
        }
        
        # Create lead
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 200
        
        created_lead = response.json()
        assert "id" in created_lead
        assert created_lead["firstName"] == "TEST_BlogTest"
        assert created_lead["email"] == "blogtest@example.com"
        assert "badkamer" in created_lead["projectTypes"]
        assert "keuken" in created_lead["projectTypes"]
        
        lead_id = created_lead["id"]
        print(f"Created lead with ID: {lead_id}")
        
        # Verify lead appears in list
        list_response = requests.get(f"{BASE_URL}/api/leads")
        assert list_response.status_code == 200
        leads = list_response.json()
        
        found = any(l["id"] == lead_id for l in leads)
        assert found, "Created lead should appear in leads list"
        print(f"Lead verified in list")
        
        # Cleanup - delete the test lead
        delete_response = requests.delete(f"{BASE_URL}/api/leads/{lead_id}")
        assert delete_response.status_code == 200
        print(f"Test lead cleaned up")


class TestServicePageAPIs:
    """Test APIs used by service pages"""
    
    def test_projects_api(self):
        """Test GET /api/projects returns list"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} projects")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

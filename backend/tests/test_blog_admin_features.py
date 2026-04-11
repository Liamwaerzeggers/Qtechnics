"""
Test suite for Blog Admin features:
- Blog topics CRUD (custom topics queue)
- Blog generation with custom topic priority
- Blog list and delete
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://service-landing-8.preview.emergentagent.com').rstrip('/')


class TestBlogTopicsAPI:
    """Tests for custom blog topics queue endpoints"""
    
    def test_get_blog_topics(self):
        """GET /api/blog-topics returns list of custom topics"""
        response = requests.get(f"{BASE_URL}/api/blog-topics")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/blog-topics returned {len(data)} topics")
    
    def test_create_blog_topic(self):
        """POST /api/blog-topics creates a new custom topic"""
        unique_topic = f"TEST_topic_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/blog-topics",
            json={"topic": unique_topic}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["topic"] == unique_topic
        print(f"✓ POST /api/blog-topics created topic: {unique_topic}")
        
        # Verify topic appears in list
        list_response = requests.get(f"{BASE_URL}/api/blog-topics")
        topics = list_response.json()
        topic_texts = [t.get('topic', '') for t in topics]
        assert unique_topic in topic_texts, "Created topic should appear in list"
        print(f"✓ Created topic verified in GET /api/blog-topics list")
        
        # Cleanup - delete the test topic
        topic_id = data["id"]
        delete_response = requests.delete(f"{BASE_URL}/api/blog-topics/{topic_id}")
        assert delete_response.status_code == 200
        print(f"✓ Cleanup: deleted test topic {topic_id}")
    
    def test_create_topic_empty_validation(self):
        """POST /api/blog-topics with empty topic returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/blog-topics",
            json={"topic": ""}
        )
        assert response.status_code == 400
        print("✓ POST /api/blog-topics with empty topic returns 400")
    
    def test_delete_blog_topic(self):
        """DELETE /api/blog-topics/:id removes a topic"""
        # First create a topic
        unique_topic = f"TEST_delete_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/blog-topics",
            json={"topic": unique_topic}
        )
        assert create_response.status_code == 200
        topic_id = create_response.json()["id"]
        
        # Delete the topic
        delete_response = requests.delete(f"{BASE_URL}/api/blog-topics/{topic_id}")
        assert delete_response.status_code == 200
        print(f"✓ DELETE /api/blog-topics/{topic_id} succeeded")
        
        # Verify topic no longer in list
        list_response = requests.get(f"{BASE_URL}/api/blog-topics")
        topics = list_response.json()
        topic_ids = [t.get('id', '') for t in topics]
        assert topic_id not in topic_ids, "Deleted topic should not appear in list"
        print("✓ Deleted topic verified removed from list")
    
    def test_delete_nonexistent_topic(self):
        """DELETE /api/blog-topics/:id with invalid ID returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/blog-topics/{fake_id}")
        assert response.status_code == 404
        print("✓ DELETE /api/blog-topics with invalid ID returns 404")


class TestBlogsAPI:
    """Tests for blog posts endpoints"""
    
    def test_get_blogs(self):
        """GET /api/blogs returns list of published blogs"""
        response = requests.get(f"{BASE_URL}/api/blogs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/blogs returned {len(data)} blogs")
        
        # Verify blog structure
        if len(data) > 0:
            blog = data[0]
            assert "id" in blog
            assert "title" in blog
            assert "slug" in blog
            assert "category" in blog
            assert "created_at" in blog
            print(f"✓ Blog structure verified: {blog['title'][:50]}...")
    
    def test_get_blogs_with_published_only_false(self):
        """GET /api/blogs?published_only=false returns all blogs"""
        response = requests.get(f"{BASE_URL}/api/blogs?published_only=false")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/blogs?published_only=false returned {len(data)} blogs")
    
    def test_get_blog_by_slug(self):
        """GET /api/blogs/:slug returns a single blog"""
        # First get list to find a valid slug
        list_response = requests.get(f"{BASE_URL}/api/blogs")
        blogs = list_response.json()
        
        if len(blogs) > 0:
            slug = blogs[0]["slug"]
            response = requests.get(f"{BASE_URL}/api/blogs/{slug}")
            assert response.status_code == 200
            data = response.json()
            assert data["slug"] == slug
            assert "content" in data  # Full content should be included
            print(f"✓ GET /api/blogs/{slug} returned blog with content")
        else:
            pytest.skip("No blogs available to test")
    
    def test_get_blog_nonexistent_slug(self):
        """GET /api/blogs/:slug with invalid slug returns 404"""
        response = requests.get(f"{BASE_URL}/api/blogs/nonexistent-slug-12345")
        assert response.status_code == 404
        print("✓ GET /api/blogs with invalid slug returns 404")


class TestExistingCustomTopic:
    """Test that the existing custom topic is present"""
    
    def test_existing_custom_topic_present(self):
        """Verify 'Tips voor kleine badkamers in een appartement' topic exists"""
        response = requests.get(f"{BASE_URL}/api/blog-topics")
        assert response.status_code == 200
        topics = response.json()
        
        expected_topic = "Tips voor kleine badkamers in een appartement"
        topic_texts = [t.get('topic', '') for t in topics]
        
        assert expected_topic in topic_texts, f"Expected topic '{expected_topic}' not found in queue"
        print(f"✓ Custom topic '{expected_topic}' found in queue")


class TestBlogSitemap:
    """Test blog sitemap endpoint"""
    
    def test_blog_sitemap_xml(self):
        """GET /api/sitemap-blogs.xml returns valid XML"""
        response = requests.get(f"{BASE_URL}/api/sitemap-blogs.xml")
        assert response.status_code == 200
        assert "application/xml" in response.headers.get("content-type", "")
        assert "<?xml" in response.text
        assert "<urlset" in response.text
        print("✓ GET /api/sitemap-blogs.xml returns valid XML sitemap")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

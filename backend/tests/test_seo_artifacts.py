"""
Test SEO artifacts for Max Q website:
- llms.txt accessibility and content
- robots.txt with both sitemaps
- sitemap.xml with 993+ URLs
- Dynamic blog sitemap at /api/sitemap-blogs.xml
- Backend API endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSEOArtifacts:
    """Test SEO-related static files and endpoints"""
    
    def test_llms_txt_accessible(self):
        """Test llms.txt is accessible"""
        response = requests.get(f"{BASE_URL}/llms.txt", timeout=10)
        assert response.status_code == 200, f"llms.txt not accessible: {response.status_code}"
        print(f"PASS: llms.txt accessible, size: {len(response.text)} bytes")
    
    def test_llms_txt_contains_locations(self):
        """Test llms.txt contains all 91 locations"""
        response = requests.get(f"{BASE_URL}/llms.txt", timeout=10)
        assert response.status_code == 200
        content = response.text
        
        # Check key locations from all 3 provinces
        locations = [
            # Limburg
            "Tessenderlo", "Ham", "Hasselt", "Genk", "Beringen", "Leopoldsburg", 
            "Lommel", "Pelt", "Tongeren", "Sint-Truiden", "Maasmechelen",
            # Antwerpen (Kempen)
            "Geel", "Mol", "Turnhout", "Herentals", "Kasterlee", "Arendonk",
            # Vlaams-Brabant
            "Diest", "Leuven", "Aarschot", "Tienen"
        ]
        
        missing = [loc for loc in locations if loc not in content]
        assert len(missing) == 0, f"Missing locations in llms.txt: {missing}"
        print(f"PASS: All {len(locations)} key locations found in llms.txt")
    
    def test_llms_txt_contains_services(self):
        """Test llms.txt contains all key services"""
        response = requests.get(f"{BASE_URL}/llms.txt", timeout=10)
        assert response.status_code == 200
        content = response.text
        
        services = [
            "Badkamer renoveren",
            "Keuken renoveren", 
            "Totaalrenovatie",
            "Interieur renoveren",
            "Huis renoveren",
            "Woning renoveren",
            "Maatkasten",
            "Vloerverwarming",
            "Elektriciteit renovatie",
            "Sanitair renovatie"
        ]
        
        missing = [svc for svc in services if svc not in content]
        assert len(missing) == 0, f"Missing services in llms.txt: {missing}"
        print(f"PASS: All {len(services)} key services found in llms.txt")
    
    def test_llms_txt_contains_service_location_urls(self):
        """Test llms.txt contains service+location URLs"""
        response = requests.get(f"{BASE_URL}/llms.txt", timeout=10)
        assert response.status_code == 200
        content = response.text
        
        # Check for service+location URL patterns
        expected_urls = [
            "https://maxq.be/diensten/badkamer-renoveren/tessenderlo",
            "https://maxq.be/diensten/keuken-renoveren/ham",
            "https://maxq.be/diensten/totaalrenovatie/hasselt",
            "https://maxq.be/diensten/interieur-renoveren/genk"
        ]
        
        missing = [url for url in expected_urls if url not in content]
        assert len(missing) == 0, f"Missing service+location URLs: {missing}"
        print(f"PASS: Service+location URLs found in llms.txt")
    
    def test_llms_txt_size(self):
        """Test llms.txt is approximately 15KB"""
        response = requests.get(f"{BASE_URL}/llms.txt", timeout=10)
        assert response.status_code == 200
        size = len(response.text)
        assert size > 10000, f"llms.txt too small: {size} bytes (expected >10KB)"
        assert size < 30000, f"llms.txt too large: {size} bytes (expected <30KB)"
        print(f"PASS: llms.txt size is {size} bytes (~{size/1024:.1f}KB)")
    
    def test_robots_txt_accessible(self):
        """Test robots.txt is accessible"""
        response = requests.get(f"{BASE_URL}/robots.txt", timeout=10)
        assert response.status_code == 200, f"robots.txt not accessible: {response.status_code}"
        print(f"PASS: robots.txt accessible")
    
    def test_robots_txt_references_both_sitemaps(self):
        """Test robots.txt references both sitemap.xml and sitemap-blogs.xml"""
        response = requests.get(f"{BASE_URL}/robots.txt", timeout=10)
        assert response.status_code == 200
        content = response.text
        
        assert "sitemap.xml" in content, "robots.txt missing sitemap.xml reference"
        assert "sitemap-blogs.xml" in content, "robots.txt missing sitemap-blogs.xml reference"
        print(f"PASS: robots.txt references both sitemaps")
    
    def test_sitemap_xml_accessible(self):
        """Test sitemap.xml is accessible"""
        response = requests.get(f"{BASE_URL}/sitemap.xml", timeout=10)
        assert response.status_code == 200, f"sitemap.xml not accessible: {response.status_code}"
        print(f"PASS: sitemap.xml accessible")
    
    def test_sitemap_xml_url_count(self):
        """Test sitemap.xml has 993+ URLs"""
        response = requests.get(f"{BASE_URL}/sitemap.xml", timeout=10)
        assert response.status_code == 200
        content = response.text
        
        url_count = content.count("<url>")
        assert url_count >= 993, f"sitemap.xml has only {url_count} URLs (expected 993+)"
        print(f"PASS: sitemap.xml has {url_count} URLs")
    
    def test_sitemap_xml_valid_structure(self):
        """Test sitemap.xml has valid XML structure"""
        response = requests.get(f"{BASE_URL}/sitemap.xml", timeout=10)
        assert response.status_code == 200
        content = response.text
        
        assert '<?xml version="1.0"' in content, "Missing XML declaration"
        assert '<urlset' in content, "Missing urlset element"
        assert '</urlset>' in content, "Missing closing urlset"
        assert '<loc>' in content, "Missing loc elements"
        print(f"PASS: sitemap.xml has valid XML structure")


class TestDynamicBlogSitemap:
    """Test dynamic blog sitemap endpoint"""
    
    def test_blog_sitemap_accessible(self):
        """Test /api/sitemap-blogs.xml is accessible"""
        response = requests.get(f"{BASE_URL}/api/sitemap-blogs.xml", timeout=10)
        assert response.status_code == 200, f"Blog sitemap not accessible: {response.status_code}"
        print(f"PASS: /api/sitemap-blogs.xml accessible")
    
    def test_blog_sitemap_valid_xml(self):
        """Test blog sitemap returns valid XML"""
        response = requests.get(f"{BASE_URL}/api/sitemap-blogs.xml", timeout=10)
        assert response.status_code == 200
        content = response.text
        
        assert '<?xml version="1.0"' in content, "Missing XML declaration"
        assert '<urlset' in content, "Missing urlset element"
        assert '</urlset>' in content, "Missing closing urlset"
        assert 'https://maxq.be/blog' in content, "Missing blog index URL"
        print(f"PASS: Blog sitemap has valid XML structure")
    
    def test_blog_sitemap_content_type(self):
        """Test blog sitemap returns XML content type"""
        response = requests.get(f"{BASE_URL}/api/sitemap-blogs.xml", timeout=10)
        assert response.status_code == 200
        content_type = response.headers.get('content-type', '')
        assert 'xml' in content_type.lower(), f"Expected XML content type, got: {content_type}"
        print(f"PASS: Blog sitemap content-type is XML")


class TestBackendAPIs:
    """Test backend API endpoints"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PASS: API root returns: {data}")
    
    def test_api_blogs_list(self):
        """Test /api/blogs returns blog list"""
        response = requests.get(f"{BASE_URL}/api/blogs", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of blogs"
        print(f"PASS: /api/blogs returns {len(data)} blogs")
    
    def test_api_projects_list(self):
        """Test /api/projects returns project list"""
        response = requests.get(f"{BASE_URL}/api/projects", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of projects"
        print(f"PASS: /api/projects returns {len(data)} projects")


class TestFrontendPages:
    """Test frontend page accessibility"""
    
    def test_homepage_loads(self):
        """Test homepage loads correctly"""
        response = requests.get(f"{BASE_URL}/", timeout=10)
        assert response.status_code == 200
        assert "Max Q" in response.text or "maxq" in response.text.lower()
        print(f"PASS: Homepage loads correctly")
    
    def test_blog_page_loads(self):
        """Test /blog page loads"""
        response = requests.get(f"{BASE_URL}/blog", timeout=10)
        assert response.status_code == 200
        print(f"PASS: /blog page loads")
    
    def test_service_page_loads(self):
        """Test service page /diensten/badkamer-renoveren loads"""
        response = requests.get(f"{BASE_URL}/diensten/badkamer-renoveren", timeout=10)
        assert response.status_code == 200
        print(f"PASS: /diensten/badkamer-renoveren loads")
    
    def test_service_location_page_loads(self):
        """Test service+location page /diensten/keuken-renoveren/geel loads"""
        response = requests.get(f"{BASE_URL}/diensten/keuken-renoveren/geel", timeout=10)
        assert response.status_code == 200
        print(f"PASS: /diensten/keuken-renoveren/geel loads")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

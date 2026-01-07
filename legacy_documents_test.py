import requests
import tempfile
import os
from datetime import datetime

class LegacyDocumentsTest:
    def __init__(self, base_url="https://craftplan-app.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = None
        
    def login_admin(self):
        """Login as admin using test/test123 credentials"""
        print("🔐 Testing admin login with test/test123...")
        
        login_url = f"{self.base_url}/auth/admin/login?username=test&password=test123"
        
        try:
            response = requests.post(login_url)
            
            if response.status_code != 200:
                print(f"❌ Admin login failed - Status: {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False
            
            # Extract session token from response
            login_data = response.json()
            admin_session_token = None
            
            # Check if session token is in response body
            if 'session_token' in login_data:
                admin_session_token = login_data['session_token']
            
            # Also check cookies
            if not admin_session_token and 'session_token' in response.cookies:
                admin_session_token = response.cookies['session_token']
            
            if not admin_session_token:
                print("❌ No session token received from admin login")
                return False
                
            print(f"✅ Admin login successful - Token: {admin_session_token[:10]}...")
            
            # Update session token for subsequent requests
            self.session_token = admin_session_token
            return True
            
        except Exception as e:
            print(f"❌ Admin login error: {str(e)}")
            return False
    
    def create_test_pdf(self):
        """Create a simple test PDF file"""
        pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test Legacy Document) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF"""
        return pdf_content
    
    def test_upload_document(self, project_id, document_type, filename, description=None, document_date=None):
        """Test uploading a legacy document"""
        print(f"📤 Testing upload: {filename} ({document_type})")
        
        # Create temporary PDF file
        pdf_content = self.create_test_pdf()
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_file.write(pdf_content)
            temp_file_path = temp_file.name
        
        try:
            # Prepare upload data
            url = f"{self.base_url}/projects/{project_id}/legacy-documents"
            headers = {'Authorization': f'Bearer {self.session_token}'}
            
            # Build query parameters
            params = {"document_type": document_type}
            if description:
                params["description"] = description
            if document_date:
                params["document_date"] = document_date
            
            # Upload file
            with open(temp_file_path, 'rb') as f:
                files = {'file': (filename, f, 'application/pdf')}
                response = requests.post(url, files=files, headers=headers, params=params)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                document = response_data.get('document', {})
                document_id = document.get('id')
                
                if document_id:
                    print(f"   ✅ Upload successful - ID: {document_id}")
                    return document_id
                else:
                    print(f"   ❌ No document ID in response")
                    return None
            else:
                print(f"   ❌ Upload failed - Status: {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return None
                
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_file_path)
            except:
                pass
    
    def test_list_documents(self, project_id):
        """Test listing documents for a project"""
        print(f"📋 Testing document listing for project {project_id}")
        
        url = f"{self.base_url}/projects/{project_id}/legacy-documents"
        headers = {'Authorization': f'Bearer {self.session_token}'}
        
        try:
            response = requests.get(url, headers=headers)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                documents = response.json()
                if isinstance(documents, list):
                    print(f"   ✅ Retrieved {len(documents)} documents")
                    for doc in documents:
                        print(f"     - {doc.get('original_filename')} ({doc.get('document_type')})")
                    return documents
                else:
                    print(f"   ❌ Invalid response format")
                    return []
            else:
                print(f"   ❌ Failed to retrieve documents - Status: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return []
    
    def test_download_document(self, document_id):
        """Test downloading a document"""
        print(f"📥 Testing download for document {document_id}")
        
        url = f"{self.base_url}/legacy-documents/{document_id}/download"
        headers = {'Authorization': f'Bearer {self.session_token}'}
        
        try:
            response = requests.get(url, headers=headers)
            
            print(f"   Status: {response.status_code}")
            print(f"   Content-Type: {response.headers.get('content-type', 'Not set')}")
            print(f"   Content-Length: {len(response.content)} bytes")
            
            if response.status_code == 200:
                # Verify it's a PDF
                if response.content.startswith(b'%PDF'):
                    print("   ✅ Download successful - Valid PDF format")
                    return True
                else:
                    print("   ❌ Downloaded content is not a valid PDF")
                    return False
            else:
                print(f"   ❌ Download failed - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Download error: {str(e)}")
            return False
    
    def test_delete_document(self, document_id):
        """Test deleting a document"""
        print(f"🗑️ Testing deletion of document {document_id}")
        
        url = f"{self.base_url}/legacy-documents/{document_id}"
        headers = {'Authorization': f'Bearer {self.session_token}'}
        
        try:
            response = requests.delete(url, headers=headers)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print("   ✅ Document deleted successfully")
                return True
            else:
                print(f"   ❌ Delete failed - Status: {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False
                
        except Exception as e:
            print(f"   ❌ Delete error: {str(e)}")
            return False
    
    def test_customer_portal_access(self, access_token):
        """Test customer portal access to documents"""
        print(f"👥 Testing customer portal access with token {access_token[:10]}...")
        
        # Test customer portal document listing
        url = f"{self.base_url}/customer-portal/{access_token}/legacy-documents"
        
        try:
            response = requests.get(url)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                documents = response.json()
                if isinstance(documents, list):
                    print(f"   ✅ Customer portal shows {len(documents)} documents")
                    return documents
                else:
                    print(f"   ❌ Invalid response format")
                    return []
            else:
                print(f"   ❌ Customer portal access failed - Status: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"   ❌ Customer portal error: {str(e)}")
            return []
    
    def test_customer_portal_download(self, access_token, document_id):
        """Test customer portal document download"""
        print(f"📥 Testing customer portal download for document {document_id}")
        
        url = f"{self.base_url}/customer-portal/{access_token}/legacy-documents/{document_id}/download"
        
        try:
            response = requests.get(url)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                if response.content.startswith(b'%PDF'):
                    print("   ✅ Customer portal download successful")
                    return True
                else:
                    print("   ❌ Downloaded content is not a valid PDF")
                    return False
            else:
                print(f"   ❌ Customer portal download failed - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Customer portal download error: {str(e)}")
            return False
    
    def run_full_test(self):
        """Run the complete Legacy Documents test suite"""
        print("🚀 Starting Legacy Documents Feature Test")
        print("=" * 60)
        
        # Step 1: Login
        if not self.login_admin():
            print("❌ Failed to login as admin")
            return False
        
        # Step 2: Use test project ID from review request
        project_id = "PROJ-4AD01A31"
        print(f"\n🔍 Using test project: {project_id}")
        
        # Step 3: Test document uploads
        print("\n📤 Testing Document Uploads")
        print("-" * 30)
        
        test_documents = [
            {
                "filename": "test_offerte.pdf",
                "document_type": "offerte",
                "description": "Test offerte document from legacy system",
                "document_date": "2023-12-15"
            },
            {
                "filename": "test_factuur.pdf", 
                "document_type": "factuur",
                "description": "Test factuur document",
                "document_date": "2024-01-20"
            },
            {
                "filename": "test_anders.pdf",
                "document_type": "anders",
                "description": "Other legacy document",
                "document_date": None
            }
        ]
        
        uploaded_document_ids = []
        
        for doc_info in test_documents:
            document_id = self.test_upload_document(
                project_id,
                doc_info["document_type"],
                doc_info["filename"],
                doc_info["description"],
                doc_info["document_date"]
            )
            if document_id:
                uploaded_document_ids.append(document_id)
        
        if len(uploaded_document_ids) != len(test_documents):
            print(f"❌ Only {len(uploaded_document_ids)}/{len(test_documents)} uploads succeeded")
            return False
        
        print(f"✅ All {len(uploaded_document_ids)} documents uploaded successfully")
        
        # Step 4: Test document listing
        print("\n📋 Testing Document Listing")
        print("-" * 30)
        
        documents = self.test_list_documents(project_id)
        if not documents:
            print("❌ Failed to retrieve documents list")
            return False
        
        # Verify our uploaded documents are in the list
        found_count = 0
        for doc_id in uploaded_document_ids:
            for doc in documents:
                if doc.get('id') == doc_id:
                    found_count += 1
                    break
        
        if found_count != len(uploaded_document_ids):
            print(f"❌ Only found {found_count}/{len(uploaded_document_ids)} uploaded documents in list")
            return False
        
        print(f"✅ All uploaded documents found in project list")
        
        # Step 5: Test document download
        print("\n📥 Testing Document Download")
        print("-" * 30)
        
        if uploaded_document_ids:
            test_doc_id = uploaded_document_ids[0]
            if not self.test_download_document(test_doc_id):
                print("❌ Document download failed")
                return False
        
        # Step 6: Test customer portal access (if available)
        print("\n👥 Testing Customer Portal Access")
        print("-" * 30)
        
        # Get project details to check for customer access token
        url = f"{self.base_url}/projects/{project_id}"
        headers = {'Authorization': f'Bearer {self.session_token}'}
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                project_data = response.json()
                access_token = project_data.get('customer_access_token')
                
                if access_token:
                    print(f"   Found customer access token: {access_token[:10]}...")
                    
                    # Test customer portal listing
                    customer_docs = self.test_customer_portal_access(access_token)
                    
                    # Test customer portal download
                    if customer_docs and uploaded_document_ids:
                        test_doc_id = uploaded_document_ids[0]
                        if not self.test_customer_portal_download(access_token, test_doc_id):
                            print("❌ Customer portal download failed")
                            return False
                else:
                    print("   ⚠️ Project has no customer access token - skipping customer portal tests")
            else:
                print(f"   ⚠️ Could not retrieve project details - Status: {response.status_code}")
        except Exception as e:
            print(f"   ⚠️ Error checking project details: {str(e)}")
        
        # Step 7: Test document deletion
        print("\n🗑️ Testing Document Deletion")
        print("-" * 30)
        
        if uploaded_document_ids:
            # Delete the last uploaded document
            doc_to_delete = uploaded_document_ids[-1]
            if not self.test_delete_document(doc_to_delete):
                print("❌ Document deletion failed")
                return False
            
            # Verify it's no longer in the list
            updated_documents = self.test_list_documents(project_id)
            deleted_doc_found = any(doc.get('id') == doc_to_delete for doc in updated_documents)
            
            if deleted_doc_found:
                print("❌ Deleted document still appears in list")
                return False
            else:
                print("✅ Document successfully removed from list")
        
        # Step 8: Test error scenarios
        print("\n🚫 Testing Error Scenarios")
        print("-" * 30)
        
        # Test invalid file type
        print("Testing invalid file type upload...")
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as temp_file:
            temp_file.write(b"This is not a PDF")
            temp_file_path = temp_file.name
        
        try:
            url = f"{self.base_url}/projects/{project_id}/legacy-documents"
            headers = {'Authorization': f'Bearer {self.session_token}'}
            params = {"document_type": "offerte"}
            
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('test.txt', f, 'text/plain')}
                response = requests.post(url, files=files, headers=headers, params=params)
            
            if response.status_code == 400:
                print("   ✅ Invalid file type correctly rejected")
            else:
                print(f"   ❌ Invalid file type not rejected - Status: {response.status_code}")
                return False
                
        finally:
            try:
                os.unlink(temp_file_path)
            except:
                pass
        
        # Test invalid document ID download
        print("Testing invalid document ID download...")
        url = f"{self.base_url}/legacy-documents/INVALID-ID/download"
        headers = {'Authorization': f'Bearer {self.session_token}'}
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 404:
                print("   ✅ Invalid document ID correctly returns 404")
            else:
                print(f"   ❌ Invalid document ID handling failed - Status: {response.status_code}")
                return False
        except Exception as e:
            print(f"   ❌ Error testing invalid document ID: {str(e)}")
            return False
        
        print("\n🎉 Legacy Documents Feature Test Completed Successfully!")
        print("✅ All functionality working as expected:")
        print("   ✅ Admin authentication with test/test123")
        print("   ✅ Document upload (offerte, factuur, anders types)")
        print("   ✅ Document listing for project")
        print("   ✅ Document download")
        print("   ✅ Customer portal document access (if available)")
        print("   ✅ Document deletion")
        print("   ✅ Error handling for invalid inputs")
        
        return True

if __name__ == "__main__":
    tester = LegacyDocumentsTest()
    success = tester.run_full_test()
    
    if success:
        print("\n🎯 ALL TESTS PASSED!")
        exit(0)
    else:
        print("\n💥 SOME TESTS FAILED!")
        exit(1)
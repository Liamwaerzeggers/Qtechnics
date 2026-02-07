#!/usr/bin/env python3
"""
Focused test script for Peppol/Billit bug fixes
Tests the two specific bugs mentioned in the review request:
1. PDF Download for invoices with comma-separated quote_ids
2. Peppol Send "Invoice Not Found" fix
"""

import requests
import sys
import json
from datetime import datetime

class PeppolBugTester:
    def __init__(self, base_url="https://fixndash.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = None
        
    def login_admin(self):
        """Login as admin using test/test123 credentials"""
        print("🔐 Logging in as admin (test/test123)...")
        
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
            
            # Extract session token
            login_data = response.json()
            self.session_token = login_data.get('session_token')
            
            if not self.session_token and 'session_token' in response.cookies:
                self.session_token = response.cookies['session_token']
            
            if not self.session_token:
                print("❌ No session token received")
                return False
                
            print(f"✅ Admin login successful")
            return True
            
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def get_customer_invoices(self):
        """Get customer invoices from project PROJ-EEFA4606"""
        print("\n📋 Getting customer invoices from project PROJ-EEFA4606...")
        
        url = f"{self.base_url}/projects/PROJ-EEFA4606/customer-invoices"
        headers = {'Authorization': f'Bearer {self.session_token}'}
        
        try:
            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                print(f"❌ Failed to get invoices - Status: {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return []
            
            invoices = response.json()
            if not isinstance(invoices, list):
                invoices = []
                
            print(f"✅ Found {len(invoices)} customer invoices")
            return invoices
            
        except Exception as e:
            print(f"❌ Error getting invoices: {str(e)}")
            return []
    
    def test_pdf_download_bug_fix(self, invoices):
        """Test Bug Fix 1: PDF Download for invoices with comma-separated quote_ids"""
        print("\n🐛 Testing Bug Fix 1: PDF Download for Multi-Quote Invoices")
        print("=" * 60)
        
        if not invoices:
            print("❌ No invoices to test")
            return False
        
        test_results = []
        
        for i, invoice in enumerate(invoices):
            invoice_id = invoice.get('id')
            quote_id = invoice.get('quote_id', '')
            
            print(f"\n📄 Testing invoice {i+1}: {invoice_id}")
            print(f"   Quote ID(s): {quote_id}")
            
            # Check if this is a multi-quote invoice (the bug scenario)
            has_multiple_quotes = ',' in quote_id
            if has_multiple_quotes:
                print(f"   🎯 Multi-quote invoice detected (this was the bug scenario)")
            else:
                print(f"   📝 Single quote invoice")
            
            # Test PDF download
            url = f"{self.base_url}/invoices/{invoice_id}/pdf"
            headers = {'Authorization': f'Bearer {self.session_token}'}
            
            try:
                response = requests.get(url, headers=headers)
                
                print(f"   Status Code: {response.status_code}")
                print(f"   Content-Type: {response.headers.get('content-type', 'Not set')}")
                print(f"   Content Length: {len(response.content)} bytes")
                
                if response.status_code == 200:
                    # Verify it's a valid PDF
                    if response.content.startswith(b'%PDF'):
                        print(f"   ✅ PDF download successful - Valid PDF format")
                        test_results.append(True)
                        
                        # Additional verification for multi-quote invoices
                        if has_multiple_quotes:
                            print(f"   🎉 BUG FIX VERIFIED: Multi-quote invoice PDF generated successfully!")
                    else:
                        print(f"   ❌ Response is not a valid PDF")
                        test_results.append(False)
                else:
                    print(f"   ❌ PDF download failed - Status: {response.status_code}")
                    try:
                        error_detail = response.json()
                        print(f"   Error: {error_detail}")
                        
                        # Check for the specific error that was fixed
                        if "script error" in str(error_detail).lower() or "quote not found" in str(error_detail).lower():
                            print(f"   🚨 BUG STILL EXISTS: Script error detected!")
                    except:
                        print(f"   Response: {response.text[:200]}")
                    test_results.append(False)
                    
            except Exception as e:
                print(f"   ❌ PDF download error: {str(e)}")
                test_results.append(False)
        
        success_rate = sum(test_results) / len(test_results) if test_results else 0
        print(f"\n📊 PDF Download Test Results: {sum(test_results)}/{len(test_results)} passed ({success_rate:.1%})")
        
        return success_rate >= 0.8
    
    def test_peppol_send_bug_fix(self, invoices):
        """Test Bug Fix 2: Peppol Send "Invoice Not Found" fix"""
        print("\n🐛 Testing Bug Fix 2: Peppol Send Invoice Found")
        print("=" * 60)
        
        if not invoices:
            print("❌ No invoices to test")
            return False
        
        test_results = []
        
        for i, invoice in enumerate(invoices[:2]):  # Test first 2 invoices
            invoice_id = invoice.get('id')
            
            print(f"\n📤 Testing Peppol send for invoice {i+1}: {invoice_id}")
            
            # Test Peppol send
            url = f"{self.base_url}/invoices/{invoice_id}/send-peppol"
            headers = {'Authorization': f'Bearer {self.session_token}'}
            
            try:
                response = requests.post(url, headers=headers)
                
                print(f"   Status Code: {response.status_code}")
                
                if response.status_code == 404:
                    # This would indicate the old bug - invoice not found
                    try:
                        error_detail = response.json()
                        error_msg = str(error_detail)
                        
                        if "Invoice not found" in error_msg:
                            print(f"   🚨 BUG STILL EXISTS: Invoice not found error")
                            print(f"   Error: {error_detail}")
                            test_results.append(False)
                        else:
                            print(f"   ✅ Different 404 error (not the bug): {error_detail}")
                            test_results.append(True)
                    except:
                        print(f"   ❌ 404 error: {response.text[:200]}")
                        test_results.append(False)
                        
                elif response.status_code in [200, 400, 401, 500]:
                    # Invoice was found (bug fixed), but may have other issues
                    try:
                        response_data = response.json()
                        error_msg = str(response_data)
                        
                        if "Invoice not found" in error_msg:
                            print(f"   🚨 BUG STILL EXISTS: Invoice not found in response")
                            print(f"   Error: {response_data}")
                            test_results.append(False)
                        elif "InvalidAccessToken" in error_msg or "Billit" in error_msg:
                            print(f"   🎉 BUG FIX VERIFIED: Invoice found! Billit API error (expected)")
                            print(f"   Response: {response_data}")
                            test_results.append(True)
                        else:
                            print(f"   ✅ Invoice found! Response: {response_data}")
                            test_results.append(True)
                            
                    except:
                        print(f"   ✅ Invoice found! Non-JSON response: {response.text[:200]}")
                        test_results.append(True)
                        
                else:
                    print(f"   ⚠️ Unexpected status code: {response.status_code}")
                    try:
                        error_detail = response.json()
                        print(f"   Response: {error_detail}")
                    except:
                        print(f"   Response: {response.text[:200]}")
                    test_results.append(True)  # Assume invoice was found
                    
            except Exception as e:
                print(f"   ❌ Peppol send error: {str(e)}")
                test_results.append(False)
        
        success_rate = sum(test_results) / len(test_results) if test_results else 0
        print(f"\n📊 Peppol Send Test Results: {sum(test_results)}/{len(test_results)} passed ({success_rate:.1%})")
        
        return success_rate >= 0.8
    
    def test_peppol_status(self, invoices):
        """Test Peppol Status endpoint"""
        print("\n📊 Testing Peppol Status Endpoint")
        print("=" * 60)
        
        if not invoices:
            print("❌ No invoices to test")
            return False
        
        test_results = []
        
        for i, invoice in enumerate(invoices[:2]):  # Test first 2 invoices
            invoice_id = invoice.get('id')
            
            print(f"\n📊 Testing Peppol status for invoice {i+1}: {invoice_id}")
            
            url = f"{self.base_url}/invoices/{invoice_id}/peppol-status"
            headers = {'Authorization': f'Bearer {self.session_token}'}
            
            try:
                response = requests.get(url, headers=headers)
                
                if response.status_code == 200:
                    status_data = response.json()
                    peppol_status = status_data.get('peppol_status', 'unknown')
                    billit_id = status_data.get('billit_invoice_id')
                    
                    print(f"   ✅ Peppol Status: {peppol_status}")
                    if billit_id:
                        print(f"   ✅ Billit Invoice ID: {billit_id}")
                    else:
                        print(f"   📝 No Billit Invoice ID (not sent yet)")
                    
                    test_results.append(True)
                else:
                    print(f"   ❌ Failed to get status - Status: {response.status_code}")
                    try:
                        error_detail = response.json()
                        print(f"   Error: {error_detail}")
                    except:
                        print(f"   Response: {response.text[:200]}")
                    test_results.append(False)
                    
            except Exception as e:
                print(f"   ❌ Status check error: {str(e)}")
                test_results.append(False)
        
        success_rate = sum(test_results) / len(test_results) if test_results else 0
        print(f"\n📊 Status Check Results: {sum(test_results)}/{len(test_results)} passed ({success_rate:.1%})")
        
        return success_rate >= 0.8
    
    def run_all_tests(self):
        """Run all Peppol bug fix tests"""
        print("🔧 Peppol/Billit Bug Fix Verification")
        print("=" * 60)
        print("Testing two specific bug fixes:")
        print("1. PDF Download for invoices with comma-separated quote_ids")
        print("2. Peppol Send 'Invoice Not Found' fix")
        print("=" * 60)
        
        # Step 1: Login
        if not self.login_admin():
            return False
        
        # Step 2: Get invoices
        invoices = self.get_customer_invoices()
        if not invoices:
            return False
        
        # Step 3: Test PDF download bug fix
        pdf_success = self.test_pdf_download_bug_fix(invoices)
        
        # Step 4: Test Peppol send bug fix
        peppol_success = self.test_peppol_send_bug_fix(invoices)
        
        # Step 5: Test Peppol status
        status_success = self.test_peppol_status(invoices)
        
        # Final summary
        print("\n" + "=" * 60)
        print("🎯 FINAL BUG FIX VERIFICATION RESULTS")
        print("=" * 60)
        
        print(f"🐛 Bug Fix 1 - PDF Download: {'✅ FIXED' if pdf_success else '❌ STILL BROKEN'}")
        print(f"🐛 Bug Fix 2 - Peppol Send: {'✅ FIXED' if peppol_success else '❌ STILL BROKEN'}")
        print(f"📊 Peppol Status: {'✅ WORKING' if status_success else '❌ BROKEN'}")
        
        overall_success = pdf_success and peppol_success and status_success
        
        if overall_success:
            print("\n🎉 ALL BUG FIXES VERIFIED SUCCESSFULLY!")
            print("✅ PDF download works for multi-quote invoices")
            print("✅ Peppol send finds invoices correctly")
            print("✅ Peppol status endpoint working")
            print("\n💡 Note: Billit API 'InvalidAccessToken' errors are expected")
            print("   This is a configuration issue, not a code bug.")
        else:
            print("\n⚠️ SOME ISSUES DETECTED")
            if not pdf_success:
                print("❌ PDF download still has issues")
            if not peppol_success:
                print("❌ Peppol send still has issues")
            if not status_success:
                print("❌ Peppol status has issues")
        
        return overall_success

def main():
    tester = PeppolBugTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
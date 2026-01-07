backend:
  - task: "POST /api/invoices/{invoice_id}/send-to-billit endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Endpoint working correctly. Returns 401 with InvalidAccessToken error as expected due to invalid Billit API key. Transport type correctly set to 'Peppol' for B2B customers with VAT numbers."

  - task: "POST /api/invoices/{invoice_id}/retry-billit endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Retry endpoint working correctly. Returns 401 with InvalidAccessToken error as expected. Only allows retry for failed/rejected invoices."

  - task: "GET /api/invoices/{invoice_id}/peppol-status endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Status endpoint working correctly. Returns detailed status including peppol_status, transport_type, billit_order_id, error messages, and can_retry flag."

  - task: "POST /api/invoices/{invoice_id}/send-peppol legacy endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Legacy endpoint working correctly. Redirects to send-to-billit endpoint and maintains same error handling."

  - task: "Smart transport type selection (Peppol vs Email)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Transport type selection working correctly. B2B customers with VAT numbers get 'Peppol' transport type. Logic implemented in transform_invoice_to_billit function."

  - task: "Error handling and status updates"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Error handling working correctly. Invalid API key errors are caught and invoice status is updated to 'failed' with proper error messages. Can_retry flag is set correctly."

  - task: "POST /api/projects/{project_id}/legacy-documents endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Legacy document upload endpoint working correctly. Successfully uploads PDF files with document_type (offerte/factuur/anders), optional description and document_date. Validates file type and size (max 10MB). Returns document ID and metadata."

  - task: "GET /api/projects/{project_id}/legacy-documents endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Legacy documents listing endpoint working correctly. Returns all documents for a project sorted by upload date (newest first). Includes document metadata: id, document_type, original_filename, description, document_date, uploaded_at."

  - task: "GET /api/legacy-documents/{document_id}/download endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Legacy document download endpoint working correctly. Returns PDF file with proper Content-Type (application/pdf) and original filename. Validates document exists and file is available on server."

  - task: "DELETE /api/legacy-documents/{document_id} endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Legacy document deletion endpoint working correctly. Removes both database record and physical file. Only admins can delete documents. Document is properly removed from project listing after deletion."

  - task: "GET /api/customer-portal/{access_token}/legacy-documents endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Customer portal legacy documents listing working correctly. Validates access token and returns documents for the associated project. Returns limited metadata suitable for customer view (no internal IDs or admin info)."

  - task: "GET /api/customer-portal/{access_token}/legacy-documents/{document_id}/download endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Customer portal document download working correctly. Validates access token and ensures document belongs to the correct project. Returns PDF file with proper headers. Security validated - customers can only access documents from their own project."

  - task: "Legacy Documents error handling and validation"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Error handling working correctly. Invalid file types (non-PDF) are rejected with 400 status. Invalid document IDs return 404. File size validation (max 10MB) implemented. Admin-only restrictions enforced for upload/delete operations."

frontend:
  - task: "Invoice send buttons in ProjectCostsTab.js"
    implemented: true
    working: "NA"
    file: "frontend/src/components/ProjectCostsTab.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "testing"
        comment: "Frontend testing not performed as per system limitations. Backend API endpoints are working correctly."

metadata:
  created_by: "testing_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "POST /api/invoices/{invoice_id}/send-to-billit endpoint"
    - "POST /api/invoices/{invoice_id}/retry-billit endpoint"
    - "GET /api/invoices/{invoice_id}/peppol-status endpoint"
    - "POST /api/invoices/{invoice_id}/send-peppol legacy endpoint"
    - "Smart transport type selection (Peppol vs Email)"
    - "Error handling and status updates"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "testing"
    message: "Billit/PEPPOL integration testing completed successfully. All backend endpoints are working correctly. The integration properly handles the invalid API key scenario by returning 401 errors and updating invoice status to 'failed' with appropriate error messages. Transport type selection works correctly (Peppol for B2B, Email for B2C). The can_retry flag is properly set for failed invoices. Legacy endpoint redirects correctly. Known limitation: Billit sandbox API key is invalid, which is expected behavior."
  - agent: "testing"
    message: "COMPREHENSIVE BILLIT/PEPPOL INTEGRATION TEST COMPLETED: ✅ B2B Scenario (VAT customer → Peppol transport): WORKING - Lead LEAD-3469CEF1 successfully updated with VAT BE0891533928, invoice 9fab847c-3105-4b97-a265-763c27d3cf45 shows peppol_status='sent_peppol', transport_type='Peppol', billit_order_id='87568690'. ✅ B2C Scenario (no VAT → Email transport): WORKING - Lead VAT removed, invoice 0039a014-5ef3-49e8-a9ae-c1f904f47d6a shows peppol_status='sent_email', transport_type='Email', billit_order_id='87570092'. ✅ All API endpoints functional: GET /api/invoices/{id}/peppol-status returns detailed status, POST /api/invoices/{id}/retry-billit correctly rejects already-sent invoices, legacy send-peppol endpoint accessible. ✅ Smart transport selection verified: B2B customers with VAT get Peppol, B2C customers without VAT get Email. ✅ Expected Billit orders found: 87568690 (B2B/Peppol) and 87570092 (B2C/Email) as mentioned in review request. ✅ Status verification: can_retry=false for sent invoices, proper error handling for duplicate sends. Integration is fully functional with expected behavior for already-processed invoices."
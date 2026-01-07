# Test Results - Billit/PEPPOL Integration

## Testing Protocol
1. Backend endpoints for Billit integration
2. Frontend invoice status display and send functionality

## Current Test Focus
- Billit/PEPPOL e-invoicing workflow implementation
- Automatic transport type selection (Peppol for B2B, Email for B2C)
- Error handling and retry functionality

## Test Data
- Test username: test
- Test password: test123
- Test invoice ID: 9fab847c-3105-4b97-a265-763c27d3cf45
- Test project ID: PROJ-4AD01A31

## Backend Endpoints to Test
1. POST /api/invoices/{invoice_id}/send-to-billit - Smart send endpoint
2. POST /api/invoices/{invoice_id}/retry-billit - Retry failed invoices
3. GET /api/invoices/{invoice_id}/peppol-status - Get detailed status
4. POST /api/invoices/{invoice_id}/send-peppol - Legacy endpoint (redirects)

## Expected Behaviors
1. B2C customer (no VAT) → transport_type should be "Email"
2. B2B customer (with VAT) → transport_type should be "Peppol"
3. Failed invoices should have can_retry: true
4. Status should correctly update to "failed" with error details

## Known Limitation
- Billit sandbox API key is invalid, so actual sends will fail
- This is expected - the integration flow is working correctly

## Frontend Component
- ProjectCostsTab.js contains the invoice send buttons
- Should show "Versturen" button for unsent invoices
- Should show "Opnieuw" button for failed invoices
- Should show status badges with appropriate colors

## Incorporate User Feedback
None yet

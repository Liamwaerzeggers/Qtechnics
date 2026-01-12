# Test Result Document

## Testing Protocol
Testing nieuwe features:
1. Quote aanmaken (fix voor alle admins)
2. Legacy documents met prijs en zichtbaarheid
3. Customer portal foto fix

## Current Test Focus

### Feature 1: Quote Aanmaken
- Alle admins kunnen nu quotes aanmaken voor alle leads
- Fix: verwijderd user_id check bij lead lookup

### Feature 2: Legacy Documents met Prijs
- Upload legacy document met total_price
- Prijs wordt opgeteld bij project sales_price
- Zichtbaarheid toggle voor klantenportaal
- API endpoints:
  - POST /api/projects/{id}/legacy-documents?total_price=X
  - PUT /api/legacy-documents/{id} (visible_to_customer, total_price)

### Feature 3: Customer Portal Fix
- getPhotoUrl functie ondersteunt nu zowel string als object formaat
- Werkt voor first_visit_photos en designs

## Test Endpoints
- POST /api/quotes (met lead_id)
- POST /api/projects/{id}/legacy-documents
- PUT /api/legacy-documents/{id}
- GET /api/customer-portal/{token}

## User Credentials
- Username: test
- Password: test123

# Test Result Document

## Testing Protocol
Testing nieuwe features voor offertes:
1. Auto-add materialen/arbeid naar catalogus
2. Optionele foto upload bij materialen
3. Inline bewerking van prijs en hoeveelheid

## Current Test Focus

### Feature 1: Auto-add naar catalogus
- Bij toevoegen van nieuw custom materiaal aan offerte -> automatisch toegevoegd aan materialen catalogus
- Bij toevoegen van nieuw custom werk item aan offerte -> automatisch toegevoegd aan werk items catalogus

### Feature 2: Foto upload bij materiaal
- Custom materiaal toevoegen met optionele foto
- Foto wordt opgeslagen bij materiaal in catalogus
- API endpoint: POST /api/materials/create-with-image (multipart form)

### Feature 3: Inline bewerking prijzen
- Prijs en hoeveelheid bewerkbaar in offerte line items
- Klik op edit icon -> inline editing mode
- Opslaan of annuleren

### Feature 4: Visuele materiaallijst in PDF
- Bij PDF export: extra pagina's met foto's en namen van materialen
- Alleen materialen met afbeeldingen worden getoond

## Test Endpoints
- POST /api/materials/auto-add?name=X&price=Y&unit=Z
- POST /api/materials/create-with-image (FormData: name, price, unit, file)
- PUT /api/quotes/{quote_id}/items/{item_id} (JSON: quantity, unit_price)

## User Credentials
- Username: test
- Password: test123
- Role: Admin

## Incorporate User Feedback
- Gebruiker wil prijs EN hoeveelheid kunnen aanpassen na toevoegen
- Gebruiker wil materialen automatisch toevoegen aan catalogus
- Gebruiker wil foto's bij materialen kunnen uploaden (1x doen, dan automatisch beschikbaar)

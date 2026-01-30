# Q-Technics Project Management - PRD

## Originele Probleemstelling
Full-stack bouwprojectbeheerapplicatie voor Q-Technics met functies voor:
- Lead management
- Offerte generatie (PDF/Excel)
- Project planning en tracking
- Financieel overzicht (kosten, omzet, winst)
- Klantenportaal met foto's, werkbonnen en documenten
- Werkmannen interface (vereenvoudigd)
- Catalogus beheer (materialen en arbeid)
- Facturatie (Billit/PEPPOL integratie)

## Architectuur
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB
- **3rd Party**: Billit, Resend (email), emergentintegrations (AI), canvas-confetti

## Geïmplementeerde Features

### 2025-01-30 (Deze sessie)
- [x] **"Verkocht" Toggle** - Switch op offertes en legacy documenten om aan te geven dat offerte verkocht is
- [x] **Projectstatus Update** - Project status wordt automatisch "in uitvoering" bij verkoop
- [x] **Viering Animatie** - Confetti + popup wanneer admin inlogt na nieuwe verkoop
- [x] **Materialen per Werk** - Materialen koppelen aan specifieke geplande werkperiodes
- [x] **Materiaal Herinneringen** - API voor werkperiodes met materialen die binnen 1 maand starten

### 2025-01-29
- [x] **Gefaseerde Facturatie** - Handmatig factuurbedragen registreren met specifieke datum
- [x] **Winstberekening fix** - Correct profit weergave voor projecten met legacy documenten
- [x] **Email notificaties** - Automatische email naar klant bij nieuwe portaal content

### Eerder geïmplementeerd
- [x] Inline bewerking offerte items (prijs/hoeveelheid)
- [x] Auto-toevoegen materialen aan catalogus met foto-upload
- [x] Visuele materiaallijst PDF bij offertes
- [x] Legacy documenten met totaalprijs en zichtbaarheidsoptie
- [x] Inklapbare secties in klantenportaal

## Nieuwe Features Details

### "Verkocht" Toggle
- Switch bij elke offerte en legacy document (type offerte)
- Groen gemarkeerd met "VERKOCHT" badge wanneer actief
- Zet projectstatus automatisch naar "in uitvoering"
- Meerdere offertes per project kunnen verkocht zijn

### Viering Animatie
- Confetti-effect bij eerste login na nieuwe verkoop
- Toont projectnaam en verkoopbedrag
- Eenmalig per admin per verkocht project
- "Volgende Viering!" knop bij meerdere nieuwe verkopen

### Materialen per Werkperiode
- Uitklapbare "Materialen" sectie per gepland werk
- Selecteer uit catalogus of voeg nieuw materiaal toe
- Velden: naam, aantal, eenheid (stuk, m², kg, etc.)
- API voor herinneringen 1 maand voor aanvang

## API Endpoints

### Nieuw (Verkocht & Celebrations)
- `PUT /api/quotes/{quote_id}` - Met `is_sold` parameter
- `PUT /api/legacy-documents/{doc_id}` - Met `is_sold` parameter
- `GET /api/celebrations/pending` - Onbekeken vieringen
- `POST /api/celebrations/{id}/mark-seen` - Markeer als gezien

### Nieuw (Materialen per Werk)
- `POST /api/projects/{id}/scheduled-days/{period_id}/materials` - Materiaal toevoegen
- `DELETE /api/projects/{id}/scheduled-days/{period_id}/materials/{material_id}` - Verwijderen
- `GET /api/dashboard/material-reminders` - Werkperiodes met materialen binnen 1 maand

## Backlog

### P0 - Kritiek
- [ ] Foto's niet zichtbaar in productie (vereist user bevestiging)

### P1 - Hoog
- [ ] Room Configurator afmaken (prototype)
- [ ] Geverifieerd Resend domein voor productie emails
- [ ] Dashboard widget met materiaalherinneringen

### P2 - Medium
- [ ] Backend API stabiliteit verbeteren
- [ ] server.py refactoren naar package structuur

### P3 - Laag
- [ ] Data migratie script (preview → productie)

## Test Credentials
- Username: `test` | Password: `test123`
- Username: `petra` | Password: `test123`

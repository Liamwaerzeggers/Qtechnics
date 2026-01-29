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
- **3rd Party**: Billit, Resend (email), emergentintegrations (AI)

## Geïmplementeerde Features

### 2025-01-29 (Deze sessie)
- [x] **Winstberekening fix** - Project overzichtspagina toont nu correct winst voor projecten met legacy documenten
- [x] **Email notificaties** - Automatische email naar klant bij nieuwe content in portaal (Resend)
- [x] **Gefaseerde Facturatie** - Handmatig factuurbedragen registreren met specifieke datum voor correcte maandelijkse rapportage in Financiën

### Eerder geïmplementeerd
- [x] Inline bewerking offerte items (prijs/hoeveelheid)
- [x] Auto-toevoegen materialen aan catalogus met foto-upload
- [x] Visuele materiaallijst PDF bij offertes
- [x] Legacy documenten met totaalprijs en zichtbaarheidsoptie
- [x] Inklapbare secties in klantenportaal

## Nieuwe Feature: Gefaseerde Facturatie

### Gebruik
In het Financieel tabblad van een project:
1. Klik op "Registratie Toevoegen"
2. Vul bedrag in (incl. BTW)
3. Kies factuurdatum (bepaalt in welke maand de omzet verschijnt)
4. Optioneel: beschrijving (bijv. "Fase 1", "Voorschot")
5. Optioneel: zet "Verstuur via Billit" aan om ook een echte factuur te versturen

### Resultaat
- Omzet wordt toegewezen aan de gekozen maand in Financiën pagina
- Percentage gefactureerd wordt getoond (van totale verkoopprijs)
- Overzicht van alle registraties met verwijder-optie

## Backlog

### P0 - Kritiek
- [ ] Foto's niet zichtbaar in productie (vereist user bevestiging)

### P1 - Hoog
- [ ] Room Configurator afmaken (prototype)
- [ ] Geverifieerd Resend domein voor productie emails

### P2 - Medium
- [ ] Backend API stabiliteit verbeteren
- [ ] server.py refactoren naar package structuur

### P3 - Laag
- [ ] Data migratie script (preview → productie)

## API Endpoints

### Nieuw (Gefaseerde Facturatie)
- `POST /api/projects/{project_id}/manual-invoices` - Registratie toevoegen
- `GET /api/projects/{project_id}/manual-invoices` - Alle registraties ophalen
- `DELETE /api/projects/{project_id}/manual-invoices/{entry_id}` - Registratie verwijderen
- `GET /api/all-manual-invoices` - Alle registraties voor financiële rapportage

### Recent gewijzigd
- `GET /api/projects` - Nu met correcte profit berekening (incl. legacy docs)
- `PUT /api/legacy-documents/{id}` - Trigger email notificatie bij visible_to_customer=true
- `PUT /api/projects/{id}/work-slips/{slip_id}/visibility` - Trigger email notificatie

## Test Credentials
- Username: `test` | Password: `test123`
- Username: `petra` | Password: `test123`

## Belangrijke Notities
- Preview en productie hebben **gescheiden databases**
- Resend test sender kan alleen naar geverifieerde emails sturen
- Bij problemen met foto's in productie: eerst checken of data in productie DB bestaat
- Gefaseerde facturatie: omzet wordt toegewezen aan maand van factuurdatum, niet projectdatum

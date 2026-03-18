# Max Q Project Management - PRD

## Rebranding (Januari 2025)
- **Bedrijfsnaam**: Max Q (voorheen Q-Technics)
- **Logo**: maxq_logo.png
- **Primaire kleur**: #500000 (bordeaux rood)
- **Secundaire kleur**: #3a190b (donker bruin)
- **Accent kleur**: #7a1f1f (lichter bordeaux)

## Originele Probleemstelling
Full-stack bouwprojectbeheerapplicatie voor Max Q met functies voor:
- Lead management
- Offerte generatie (PDF/Excel)
- Project planning en tracking
- Financieel overzicht (kosten, omzet, winst)
- Klantenportaal met foto's, werkbonnen en documenten
- Werkmannen interface (vereenvoudigd)
- Catalogus beheer (materialen en arbeid)
- Facturatie (Billit/PEPPOL integratie)

## Multi-Tenant Platform Uitbreiding (Februari 2025)

### Nieuwe Rollen
| Rol | Code | Toegang |
|-----|------|---------|
| Max Q Admin | `admin` | Alles |
| Werkman | `worker` | Beperkt (projecten, werkbonnen) |
| Onderaannemer | `subcontractor` | Eigen prijzen, toegewezen opdrachten |
| Makelaar | `realtor` | Eigen panden, renovatiecalculaties |
| Investeerder | `investor` | Eigen/gedeelde panden, rendement |

### Geïmplementeerd (Fase 1) - Volledig
- [x] Datamodel - Property, Room, RenovationCalculation, Subcontractor, RealtorProfile, InvestorProfile
- [x] Rollen & Authenticatie - Tenant login via `/api/auth/tenant/login` (JSON body)
- [x] Makelaar Dashboard - Panden beheren, kamers toevoegen, renovatieberekening
- [x] **Renovatiecalculator met Live Prijzen** - Scenario-based berekening gekoppeld aan work_items DB collectie
- [x] **Renovatiecalculator op Projectniveau** - Zelfde systeem als bij panden, gekoppeld aan offerte generatie
- [x] **Offerte uit Berekening** - Automatisch offerte aanmaken met alle geselecteerde calculator items
- [x] **Auto-save Werkposten** - Handmatig toegevoegde items worden opgeslagen in DB voor hergebruik
- [x] Kamers toevoegen aan bestaand pand/project (handmatig + grondplan AI)
- [x] Grondplan Upload met AI Analyse (GPT-4o Vision)
- [x] Tenant Beheer - Admin kan makelaars, investeerders en onderaannemers aanmaken/beheren
- [x] Mailto Welkomst-email
- [x] Property Scraping - Werkt met Immoweb, Zimmo, Immoscoop EN elke makelaar website
- [x] Werkposten Labels Pagina - Admin kan labels toewijzen aan werkposten
- [x] Materiaal Aanvraag Systeem - Tweetalig (NL/UA) formulier voor werkmannen
- [x] Notificatie Banners - Uitklapbare MaterialRequestBanner en WorkerTaskBanner

### Renovatiecalculator - Functionaliteiten
- **Vloerwerken**: Voorbereiding (afbraak + egaliseren) + afwerking keuze (tegels/parket/laminaat/vinyl) via radio buttons
- **Muurwerken**: 3 scenario's (nieuw pleisterwerk / egaliseren / gyproc) + schilderwerk optioneel
- **Plafondwerken**: Afbraak + gyproc + schilderwerk optioneel
- **Elektriciteit**: Spots, schakelaars, stopcontacten (automatisch berekend per m²)
- **Sanitair**: Alleen voor badkamer/keuken (uit DB)
- **Overig**: Items met label "overig" als optionele extras
- **Extra opties**: Collapsible secties per categorie voor aanvullende werkposten uit DB
- **Live Prijzen**: Alle prijzen komen uit `work_items` collectie, met labels voor categorisatie
- **m² weergave**: Elke sectie toont oppervlakte
- **Kamerhoogte**: Invoerbaar, standaard 2.55m, gebruikt voor muur berekening

### Nog te implementeren (Fase 2+)
- [ ] Onderaannemers prijzen - Integreren in renovatiecalculaties
- [ ] Investeerder dashboard - ROI berekeningen, winstinzicht
- [ ] Pand delen - Makelaar kan pand delen met investeerder

## Architectuur
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB

## API Endpoints

### Renovatie Calculator
- `POST /api/properties/{id}/calculate` - Berekening genereren met live DB prijzen
- `GET /api/properties/{id}/calculation` - Berekening ophalen
- `PUT /api/properties/{id}/calculation/items/{itemId}?included=true/false` - Item aan/uit
- `PUT /api/properties/{id}/calculation/switch-option` - Vloer optie wisselen
- `PUT /api/properties/{id}/calculation/switch-scenario` - Muur scenario wisselen

### Auth
- `POST /api/auth2/login` - Admin login (JSON body)
- `POST /api/auth/tenant/login` - Makelaar/Investeerder login (JSON body)
- `POST /api/auth/worker/login` - Werkman login

### Materiaal Aanvragen
- `POST /api/material-requests` - Nieuwe aanvraag
- `GET /api/material-requests` - Alle aanvragen ophalen
- `PUT /api/material-requests/{id}` - Status bijwerken

## Inloggegevens
- **Admin**: `liam` / `Liammail123`
- **Makelaar**: `testmakelaar` / `Test123456`
- **Werkman**: `testwerkman` / `Werk123456`

### Project Offerte Workflow
1. Upload grondplan OF voeg kamers handmatig toe
2. Bereken renovatie (calculator met live DB prijzen)
3. Pas opties aan (vloer afwerking, muur scenario, extras)
4. Genereer offerte uit berekening
5. Voeg handmatig extra posten toe (worden auto-saved in DB)
6. Koppel materialen uit catalogus

### API Endpoints - Project Calculator
- `POST /api/projects/{id}/project-rooms` - Kamer toevoegen
- `DELETE /api/projects/{id}/project-rooms/{room_id}` - Kamer verwijderen
- `POST /api/projects/{id}/project-rooms/bulk` - Bulk kamers toevoegen
- `POST /api/projects/{id}/analyze-floor-plan` - Upload + AI analyse
- `POST /api/projects/{id}/calculate-renovation` - Berekening starten
- `GET /api/projects/{id}/renovation-calculation` - Berekening ophalen
- `PUT /api/projects/{id}/renovation-calculation/items/{id}` - Item togglen
- `PUT /api/projects/{id}/renovation-calculation/switch-option` - Vloer optie
- `PUT /api/projects/{id}/renovation-calculation/switch-scenario` - Muur scenario
- `POST /api/projects/{id}/generate-quote-from-calculation` - Offerte genereren
- `POST /api/work-items/auto-save` - Werkpost auto-save

## Bekende Issues
- `server.py` is 10.700+ regels - moet gerefactored worden naar routers/services/models
- Foto upload limiet van 5 - moet onderzocht worden

## Configuratie
- **Uurtarief werkbonnen**: €34/uur (aangepast van €30, maart 2025)

## Volgende Prioriteiten
1. Foto upload limiet van 5 fixen
2. Server.py refactoring - opsplitsen in modules
3. Realtor MVP features afmaken (Room Configurator)
4. Onderaannemers Module (Fase 2)
5. Investeerders Module (Fase 3)
6. Commerciële logica (Abonnementen)

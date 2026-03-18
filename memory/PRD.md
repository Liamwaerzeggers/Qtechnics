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

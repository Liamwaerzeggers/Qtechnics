# Max Q Project Management - PRD

## Rebranding (Januari 2025)
- **Bedrijfsnaam**: Max Q (voorheen Q-Technics)
- **Logo**: maxq_logo.png
- **Primaire kleur**: #500000 (bordeaux rood)
- **Secundaire kleur**: #3a190b (donker bruin)
- **Accent kleur**: #7a1f1f (lichter bordeaux)

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

## Multi-Tenant Platform Uitbreiding (Februari 2025)

### Nieuwe Rollen
| Rol | Code | Toegang |
|-----|------|---------|
| Max Q Admin | `admin` | Alles |
| Werkman | `worker` | Beperkt (projecten, werkbonnen) |
| Onderaannemer | `subcontractor` | Eigen prijzen, toegewezen opdrachten |
| Makelaar | `realtor` | Eigen panden, renovatiecalculaties |
| Investeerder | `investor` | Eigen/gedeelde panden, rendement |

### Geïmplementeerd (Fase 1)
- [x] **Datamodel** - Property, Room, RenovationCalculation, Subcontractor, RealtorProfile, InvestorProfile
- [x] **Rollen & Authenticatie** - Tenant login via `/api/auth/tenant/login`
- [x] **Makelaar Dashboard** - Panden beheren, kamers toevoegen, renovatieberekening
- [x] **Renovatiecalculator** - Automatische berekening op basis van kamerdimensies en werkposten met labels
- [x] **Tenant Beheer** - Admin kan makelaars, investeerders en onderaannemers aanmaken/beheren
- [x] **Mailto Welkomst-email** - Bij aanmaken van makelaar/investeerder wordt Outlook geopend met credentials
- [x] **Property Scraping** - Werkt met Immoweb, Zimmo, Immoscoop EN elke makelaar website
- [x] **Werkposten Labels Pagina** - Admin kan labels (vloer/muur/plafond/etc) toewijzen aan werkposten

### Nog te implementeren (Fase 2+)
- [ ] **Onderaannemers prijzen** - Integreren in renovatiecalculaties
- [ ] **Investeerder dashboard** - ROI berekeningen, winstinzicht
- [ ] **Pand delen** - Makelaar kan pand delen met investeerder

## Architectuur
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB
- **3rd Party**: Billit, Resend (email), emergentintegrations (AI), canvas-confetti

## Nieuwe API Endpoints (Multi-Tenant)

### Realtors
- `POST /api/realtors` - Nieuwe makelaar aanmaken (admin only)
- `GET /api/realtors` - Alle makelaars ophalen (admin only)
- `DELETE /api/realtors/{id}` - Makelaar verwijderen

### Investors
- `POST /api/investors` - Nieuwe investeerder aanmaken
- `GET /api/investors` - Alle investeerders ophalen

### Subcontractors
- `POST /api/subcontractors` - Nieuwe onderaannemer
- `GET /api/subcontractors` - Alle onderaannemers
- `POST /api/subcontractors/{id}/prices` - Prijs toevoegen
- `GET /api/subcontractors/{id}/prices` - Prijzen ophalen

### Properties
- `POST /api/properties` - Nieuw pand toevoegen
- `GET /api/properties` - Eigen panden ophalen (tenant isolated)
- `GET /api/properties/{id}` - Pand details
- `PUT /api/properties/{id}` - Pand bewerken
- `DELETE /api/properties/{id}` - Pand verwijderen
- `POST /api/properties/{id}/rooms` - Kamer toevoegen
- `PUT /api/properties/{id}/rooms/{room_id}` - Kamer bewerken
- `DELETE /api/properties/{id}/rooms/{room_id}` - Kamer verwijderen
- `POST /api/properties/{id}/share` - Pand delen met investeerder

### Renovation Calculator
- `POST /api/properties/{id}/calculate` - Berekening uitvoeren
- `GET /api/properties/{id}/calculation` - Berekening ophalen
- `PUT /api/properties/{id}/calculation/items/{item_id}` - Item in/uitsluiten

### Work Items
- `PUT /api/work-items/{id}/label` - Component label toekennen (vloer, muur, plafond, etc.)

### Auth
- `POST /api/auth/tenant/login` - Login voor makelaars/investeerders

## Geïmplementeerde Features (Eerder)

### 2025-02-03 (Deze sessie)
- [x] **Wachtwoord Reset** - Admins kunnen wachtwoorden resetten
- [x] **Multi-Tenant Platform** - Makelaars, investeerders, onderaannemers
- [x] **Renovatiecalculator** - Automatische berekening per kamer
- [x] **Tenant Dashboard** - Makelaar kan panden beheren
- [x] **Mailto Welkomst-email** - Bij aanmaken accounts

### 2025-01-30
- [x] **"Verkocht" Toggle** - Switch op offertes en legacy documenten
- [x] **Viering Animatie** - Confetti bij nieuwe verkoop
- [x] **Materialen per Werk** - Materialen koppelen aan werkperiodes
- [x] **Gamification Banner** - Team Sales Leaderboard

### 2025-01-29
- [x] **Gefaseerde Facturatie** - Handmatig factuurbedragen registreren
- [x] **Email notificaties** - Automatische email naar klant bij nieuwe portaal content

## Backlog

### P0 - Kritiek
- [ ] Foto's niet zichtbaar in productie (user verificatie nodig)
- [ ] Login fix (eerste admin setup) verificatie na deployment

### P1 - Hoog
- [ ] Property scraping (Immoweb/Zimmo/Immoscoop)
- [ ] Room Configurator afmaken
- [ ] Geverifieerd Resend domein voor productie emails

### P2 - Medium
- [ ] Backend API stabiliteit verbeteren
- [ ] server.py refactoren naar package structuur

### P3 - Laag
- [ ] Investeerder ROI dashboard
- [ ] Onderaannemers prijzen in calculatie

## Test Credentials
- **Admin:** `test` / `test123`
- **Makelaar:** `liamtest` / `test123`
- **Makelaar (test):** `immogent` / `test123`

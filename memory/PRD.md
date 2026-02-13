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

## Laatste Updates (Februari 2025)

### Authenticatie Systeem - Volledig Herschreven
- **Nieuw auth systeem** (`/api/auth2/`) met simpele token-based auth
- Token opslag in `localStorage` onder beide keys (`auth_token` en `session_token`) voor compatibiliteit
- Hardcoded admin "Liam" werkt met `Liammail123` of `Liammail123.`
- Alle API calls gebruiken nu `Authorization: Bearer` headers ipv cookies

### Kalender Verbeteringen
- **Teams hernoemen** - Klik op potlood icoon bij team naam
- **Taken afvinken** - Ronde checkbox naast elke taak in team tiles en kalender
- **Voltooide taken** - Verdwijnen uit team tiles, blijven zichtbaar in kalender (grijs/doorgestreept)
- **Aanmoedigende berichten** bij voltooien van taak met confetti animatie

### Project Notities Systeem (Nieuw!)
- **Algemene notities sectie** per project (`project_notes` array in Project model)
- **ProjectNotesBanner component** - Zichtbaar bovenaan elke project pagina, ongeacht actieve tab
- **Bullet point weergave** - Eerste bezoek notities + algemene notities in één overzicht
- **Notitie als taak toewijzen** - Admin kan notitie omzetten naar taak voor medewerker
- **Worker taak systeem** - `worker_tasks` collection in database

### Worker Task Banner (Nieuw!)
- **Globale notificatie banner** voor werkmannen
- **Popup bovenaan elk scherm** met openstaande taken
- **Navigatie** tussen meerdere taken
- **Direct voltooien** met confetti animatie en aanmoedigende boodschap
- **Minimaliseren** naar klein icoon in rechterhoek

## API Endpoints

### Project Notities
- `GET /api/projects/{id}/notes` - Alle notities ophalen
- `POST /api/projects/{id}/notes` - Nieuwe notitie toevoegen
- `PUT /api/projects/{id}/notes/{note_id}` - Notitie bewerken
- `DELETE /api/projects/{id}/notes/{note_id}` - Notitie verwijderen
- `POST /api/projects/{id}/notes/{note_id}/assign` - Notitie toewijzen aan medewerker

### Worker Tasks
- `GET /api/worker-tasks/my` - Mijn taken ophalen
- `GET /api/worker-tasks/pending` - Openstaande taken
- `PUT /api/worker-tasks/{id}/seen` - Taak als gezien markeren
- `PUT /api/worker-tasks/{id}/complete` - Taak voltooien
- `GET /api/admin/worker-tasks` - Admin: alle taken

## Database Schema Wijzigingen

### Project Model
```javascript
{
  // ... bestaande velden
  project_notes: [{
    id: string,
    text: string,
    created_at: string,
    created_by: string,
    created_by_name: string,
    is_task: boolean,
    assigned_to: string | null,
    assigned_to_name: string | null,
    task_id: string | null,
    task_completed: boolean,
    task_completed_at: string | null
  }]
}
```

### Worker Tasks Collection
```javascript
{
  id: string,           // "TASK-XXXXXXXX"
  project_id: string,
  project_name: string,
  note_id: string,
  text: string,
  assigned_to: string,  // Worker ID
  assigned_to_name: string,
  assigned_by: string,  // Admin ID
  assigned_by_name: string,
  created_at: string,
  completed: boolean,
  completed_at: string | null,
  seen: boolean
}
```

### QuickTask Model Update
```javascript
{
  // ... bestaande velden
  completed: boolean,
  completed_at: string | null
}
```

## Bestanden Gewijzigd/Toegevoegd
- `/app/backend/server.py` - Project notes en worker tasks endpoints
- `/app/backend/auth_simple.py` - Nieuw simpel auth systeem
- `/app/frontend/src/components/ProjectNotesBanner.js` - Nieuw
- `/app/frontend/src/components/WorkerTaskBanner.js` - Nieuw
- `/app/frontend/src/components/DashboardLayout.js` - WorkerTaskBanner toegevoegd
- `/app/frontend/src/pages/ProjectDetailPage.js` - ProjectNotesBanner toegevoegd
- `/app/frontend/src/pages/CalendarPage.js` - Team rename en taak afvinken
- `/app/frontend/src/pages/Dashboard.js` - Auth headers fix
- `/app/frontend/src/pages/ProjectsPage.js` - Auth headers fix
- Alle andere pages - `withCredentials: true` vervangen door `headers: getAuthHeaders()`

## Inloggegevens
- **Admin**: `liam` / `Liammail123` (of `Liammail123.`)
- **Test account (preview)**: `test` / `test123`

## Bekende Issues
- `server.py` is 9000+ regels - moet gerefactored worden naar routers/services/models
- Foto upload limiet van 5 - moet onderzocht worden

## Volgende Prioriteiten
1. Server.py refactoring - opsplitsen in modules
2. Realtor MVP features afmaken
3. Onderaannemers Module (Fase 2)
4. Investeerders Module (Fase 3)

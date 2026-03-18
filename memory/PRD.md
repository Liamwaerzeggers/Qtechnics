# Max Q - Renovation Project Management Platform

## Original Problem Statement
Full-stack Realtor/Project Management tool for renovation projects. Key features include lead management, quote generation, project planning, worker management, material tracking, and a renovation cost calculator.

## Core Requirements
- Lead management with property scraping
- Quote generation (PDF/Excel) with Billit/PEPPOL integration
- Project management with planning, costs, work slips
- Worker management with task assignment
- Renovation calculator connected to live work_items prices
- Floor plan AI analysis (GPT-4o Vision)
- Customer portal with messaging
- Material request system
- Bilingual worker UI (Dutch/Ukrainian)

## Tech Stack
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI (Python) - monolith server.py
- **Database**: MongoDB
- **3rd Party**: OpenAI GPT-4o Vision, Resend (Email), Billit (Payments), canvas-confetti, beautifulsoup4/httpx (scraping), pillow-heif

## User Roles
- **Admin**: Full access to all features
- **Worker (Werkman)**: Limited view - projects, work slips, material requests, calendar. UI is bilingual NL/UA.
- **Realtor (Makelaar)**: Property management, renovation calculator
- **Investor**: Future module (not yet built)

## What's Been Implemented

### Completed Features
- [x] Lead management with CRUD
- [x] Quote generation system
- [x] Project management (CRUD, planning, costs, work slips)
- [x] Renovation calculator connected to live prices (work_items DB)
- [x] Room management & floor plan AI analysis (GPT-4o Vision)
- [x] Project-level calculator & quoting system
- [x] Worker hourly rate updated to €34
- [x] Customer portal with messaging
- [x] Material request system (fully bilingual)
- [x] Team planning calendar with drag & drop
- [x] Gamification (sales leaderboard, milestones)
- [x] Worker task assignment from project notes
- [x] **Bilingual Worker UI (NL/UA)** - COMPLETED 2026-03-18
  - Sidebar navigation (Dashboard/Панель, Projecten/Проєкти, etc.)
  - Dashboard page (hides Leads/Offertes for workers, bilingual titles)
  - Projects page (bilingual title, search, instruction, address display)
  - Work slip page (fully bilingual form)
  - Material request page (fully bilingual)
  - Calendar page (bilingual headers, buttons, tips)
  - Worker task banner (bilingual labels)
- [x] **Project address on worker project cards** - COMPLETED 2026-03-18
  - Backend enriches projects with lead_address for workers
  - Address shown with MapPin icon on project cards
  - Address included in search filter

### Pending Issues
- **Issue 2: Internal Server Error on Task Assignment** - P1, USER VERIFICATION PENDING
- **Issue 3: 5 Photo Upload Limit** - P2, NOT STARTED
- **Issue 4: server.py Refactor** - P2, NOT STARTED (monolith >11K lines)
- **Issue 5: Property Scraping limitations** - P3, NOT STARTED

### Upcoming Tasks
- (P1) Refactor server.py into routers/services/models
- (P2) Phase 2 - Subcontractors Module
- (P2) Phase 3 - Investors Module
- (P3) Commercial Logic (subscriptions & payments)
- (P3) Data Migration for Old Photos

## Key API Endpoints
- `GET /api/projects` - Returns projects (workers see only visible_to_workers, enriched with lead_address)
- `POST /api/projects/{id}/rooms` - Add room to project
- `POST /api/projects/{id}/analyze-floor-plan` - AI floor plan analysis
- `GET /api/projects/{id}/calculate-renovation` - Calculate renovation costs
- `POST /api/projects/{id}/generate-quote-from-calculation` - Generate quote
- `POST /api/work-items/auto-add` - Save manual quote lines for reuse

## Key DB Schema
- **projects**: rooms[], floor_plan_url, renovation_calculation_id, lead_address (virtual)
- **renovation_calculations**: property_id (optional), linked to projects
- **work_items**: live pricing for calculator
- **leads**: address field used to enrich worker project view

## Test Credentials
- Admin: liam / Liammail123
- Worker: testwerkman / Werk123456
- Realtor: testmakelaar / Test123456

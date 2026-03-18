# Max Q - Renovation Project Management Platform

## Original Problem Statement
Full-stack Realtor/Project Management tool for renovation projects.

## Tech Stack
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI (Python) - monolith server.py
- **Database**: MongoDB
- **3rd Party**: OpenAI GPT-4o Vision, Resend, Billit, canvas-confetti, beautifulsoup4/httpx, pillow-heif

## Completed Features
- [x] Lead management, Quote generation, Project management
- [x] Renovation calculator (live prices), Room mgmt, Floor plan AI
- [x] Project-level calculator & quoting, Worker hourly rate €34
- [x] Customer portal, Team planning calendar
- [x] Bilingual Worker UI (NL/UA) — all worker pages
- [x] Project address on worker project cards
- [x] **Material Catalog System** — Categories (NL+UA), items (NL+UA), image upload, sizes
- [x] **Worker ordering** — Browse catalog by category, cart, size/qty selection, project/werf, delivery date
- [x] **Mobile responsive** — Compact header, wrapping tabs, collapsible categories, date picker

## Pending Issues
- Issue 2: Task Assignment Error — P1, USER VERIFICATION PENDING
- Issue 3: 5 Photo Upload Limit — P2, NOT STARTED
- Issue 4: server.py Refactor — P2, NOT STARTED (>11K lines)
- Issue 5: Property Scraping — P3, NOT STARTED

## Upcoming Tasks
- (P1) Refactor server.py into routers/services/models
- (P2) Phase 2 — Subcontractors Module
- (P2) Phase 3 — Investors Module
- (P3) Commercial Logic (subscriptions & payments)
- (P3) Data Migration for Old Photos

## Key API Endpoints (Material Catalog)
- GET/POST /api/material-categories — CRUD categories (name + name_ua)
- GET/POST/PUT/DELETE /api/material-catalog — CRUD items (title, title_ua, category_id, sizes)
- POST /api/material-catalog/{id}/upload-image — Upload item image
- POST /api/material-orders — Worker submits order (items, project, delivery_date, notes)

## Test Credentials
- Admin: liam / Liammail123
- Worker: testwerkman / Werk123456
- Realtor: testmakelaar / Test123456

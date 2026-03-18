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
- Material catalog & ordering system with categories
- Bilingual worker UI (Dutch/Ukrainian)

## Tech Stack
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI (Python) - monolith server.py
- **Database**: MongoDB
- **3rd Party**: OpenAI GPT-4o Vision, Resend (Email), Billit (Payments), canvas-confetti, beautifulsoup4/httpx (scraping), pillow-heif

## User Roles
- **Admin**: Full access — manages categories, catalog items (with images, sizes, UA translations)
- **Worker (Werkman)**: Limited view — projects (with address), material ordering from catalog, work slips, calendar. UI is bilingual NL/UA.
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
- [x] Team planning calendar with drag & drop
- [x] Gamification (sales leaderboard, milestones)
- [x] Worker task assignment from project notes
- [x] **Bilingual Worker UI (NL/UA)** — All worker-visible pages fully translated
- [x] **Project address on worker project cards** — Backend enriches with lead_address
- [x] **Material Catalog System with Categories** — COMPLETED 2026-03-18
  - Admin: Create/edit/delete categories (with NL + UA names)
  - Admin: Add items to categories (title NL/UA, description, sizes, image upload)
  - Worker: Browse catalog grouped by category with NL/UA translations
  - Worker: Add items to cart, choose size, set quantity, select delivery project
  - Worker: Submit orders that create material_requests in the system
  - Orders visible in "Mijn Bestellingen / Мої Замовлення" tab

### Pending Issues
- **Issue 2: Internal Server Error on Task Assignment** — P1, USER VERIFICATION PENDING
- **Issue 3: 5 Photo Upload Limit** — P2, NOT STARTED
- **Issue 4: server.py Refactor** — P2, NOT STARTED (monolith >11K lines)
- **Issue 5: Property Scraping limitations** — P3, NOT STARTED

### Upcoming Tasks
- (P1) Refactor server.py into routers/services/models
- (P2) Phase 2 — Subcontractors Module
- (P2) Phase 3 — Investors Module
- (P3) Commercial Logic (subscriptions & payments)
- (P3) Data Migration for Old Photos

## Key API Endpoints (Material Catalog)
- `GET /api/material-categories` — List all categories
- `POST /api/material-categories` — Create category (name + name_ua)
- `PUT /api/material-categories/{id}` — Update category
- `DELETE /api/material-categories/{id}` — Delete category (unlinks items)
- `GET /api/material-catalog` — List all catalog items
- `POST /api/material-catalog` — Create item (title, title_ua, category_id, sizes, description)
- `PUT /api/material-catalog/{id}` — Update item
- `DELETE /api/material-catalog/{id}` — Delete item
- `POST /api/material-catalog/{id}/upload-image` — Upload item image
- `POST /api/material-orders` — Worker submits order (creates material_requests)

## Key DB Schema
- **material_categories**: id, name, name_ua, sort_order
- **material_catalog**: id, category_id, title, title_ua, description, image_url, sizes[], active
- **material_requests**: Created from catalog orders with title, quantity, photo_url, project_id
- **projects**: rooms[], floor_plan_url, renovation_calculation_id, lead_address (virtual)

## Test Credentials
- Admin: liam / Liammail123
- Worker: testwerkman / Werk123456
- Realtor: testmakelaar / Test123456

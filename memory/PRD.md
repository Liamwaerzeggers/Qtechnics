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

## What's Been Implemented

### Completed Features
- [x] Lead management with CRUD
- [x] Quote generation system
- [x] Project management (CRUD, planning, costs, work slips)
- [x] Renovation calculator connected to live prices
- [x] Room management & floor plan AI analysis (GPT-4o Vision)
- [x] Project-level calculator & quoting system
- [x] Worker hourly rate updated to €34
- [x] Customer portal with messaging
- [x] Team planning calendar with drag & drop
- [x] Bilingual Worker UI (NL/UA) — All worker-visible pages
- [x] Project address on worker project cards
- [x] **Material Catalog with Categories** — COMPLETED 2026-03-18
  - Categories with NL + UA names, collapsible on mobile + desktop
  - Items with NL + UA titles, sizes, descriptions, image upload
  - Worker catalog browser grouped by category
  - Order flow: cart, size selection, quantity, project/werf selection
- [x] **Mobile responsive Material page** — COMPLETED 2026-03-18
  - Compact header on mobile
  - Wrapping tabs
  - Collapsible categories with chevron toggle
  - Responsive card sizing and text

### Pending Issues
- **Issue 2: Task Assignment Error** — P1, USER VERIFICATION PENDING
- **Issue 3: 5 Photo Upload Limit** — P2, NOT STARTED
- **Issue 4: server.py Refactor** — P2, NOT STARTED (>11K lines)
- **Issue 5: Property Scraping** — P3, NOT STARTED

### Upcoming Tasks
- (P1) Refactor server.py
- (P2) Phase 2 — Subcontractors Module
- (P2) Phase 3 — Investors Module
- (P3) Commercial Logic
- (P3) Data Migration

## Test Credentials
- Admin: liam / Liammail123
- Worker: testwerkman / Werk123456
- Realtor: testmakelaar / Test123456

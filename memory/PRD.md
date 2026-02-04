# Max Q Interior Design Website - PRD

## Original Problem Statement
Clone van de interior design website maxq.be met alle functionaliteiten, aangepast kleurenschema (#500000, #3a190b, #202020), en uitgebreid met admin panel voor projecten en leads beheer.

## Core Requirements
1. **Website Pages:**
   - Homepage met hero, services, projecten preview, testimonials, CTA
   - Renoveren pagina met alle diensten
   - Projecten pagina met filtering en klikbare detail pagina's
   - Contact pagina met formulier
   - Multi-step lead formulier (/start)

2. **Admin Functionaliteit:**
   - Admin login (/admin) met credentials admin/maxq2024
   - Dashboard met tabs voor Projecten en Aanvragen
   - CRUD voor projecten met bestandsupload
   - Lead overzicht met detail popup

3. **Integraties:**
   - Webhook naar dashboard.qtechnics.be voor lead synchronisatie
   - Email notificaties via Resend (niet geconfigureerd)

## What's Been Implemented
- [x] Homepage met alle secties
- [x] Renoveren pagina
- [x] Projecten pagina met database integratie
- [x] Project detail pagina met fotogalerij
- [x] Contact pagina
- [x] Multi-step lead formulier (/start)
- [x] Admin login (frontend-only auth)
- [x] Admin dashboard met Projecten tab
- [x] Admin dashboard met Aanvragen tab
- [x] Bestandsupload voor projectafbeeldingen
- [x] Webhook synchronisatie code (endpoint 404 op bestemming)
- [x] Logo vergroot en "Powered by Qtechnics" branding
- [x] Scroll-to-top bij navigatie
- [x] Deployment blockers opgelost

## Architecture
```
/app
├── backend/
│   ├── .env (MONGO_URL, DB_NAME, CORS_ORIGINS, RECIPIENT_EMAILS, QTECHNICS_WEBHOOK_URL, QTECHNICS_API_KEY)
│   ├── requirements.txt
│   ├── server.py (FastAPI met alle endpoints)
│   └── uploads/ (geüploade afbeeldingen)
└── frontend/
    ├── .env (REACT_APP_BACKEND_URL)
    ├── package.json
    └── src/
        ├── App.js (Router met ScrollToTop)
        └── components/
            ├── Header.jsx (met Qtechnics branding)
            ├── Footer.jsx (met Qtechnics branding)
            ├── AdminDashboard.jsx (Projecten + Aanvragen tabs)
            ├── ProjectDetail.jsx (met fotogalerij)
            └── ...
```

## Key API Endpoints
- `GET/POST /api/projects` - Projecten lijst/aanmaken
- `GET/PUT/DELETE /api/projects/{id}` - Project CRUD
- `PUT /api/projects/{id}/images` - Project afbeeldingen updaten
- `POST /api/upload` - Bestand uploaden
- `GET/POST /api/leads` - Leads lijst/aanmaken
- `DELETE /api/leads/{id}` - Lead verwijderen

## Database Schema
**projects:** id, title, category, location, shortDescription, fullDescription, mainImage, galleryImages[], featured, created_at
**leads:** id, firstName, lastName, email, phone, street, city, postalCode, projectTypes[], budget, timeline, description, created_at

## Pending/Backlog
### P0 (Kritiek)
- [ ] Webhook endpoint activeren op dashboard.qtechnics.be

### P1 (Belangrijk)
- [ ] Resend API key configureren voor email notificaties
- [ ] Backend authenticatie voor admin (nu frontend-only)

### P2 (Nice-to-have)
- [ ] Privacybeleid pagina
- [ ] Algemene voorwaarden pagina
- [ ] Admin dashboard voor leads statistieken

## Credentials
- **Admin Panel:** /admin → username: admin, password: maxq2024
- **QTechnics Webhook:** API Key in backend/.env

## Last Updated
2026-02-04

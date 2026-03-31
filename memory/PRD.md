# Max Q Interior Design Website - PRD

## Original Problem Statement
Clone van de interior design website maxq.be met alle functionaliteiten, aangepast kleurenschema (#500000, #3a190b, #202020), en uitgebreid met admin panel voor projecten en leads beheer. SEO/GEO optimalisatie met dynamische landingspagina's per dienst en locatie.

## Core Requirements
1. Website Pages: Homepage, Renoveren, Projecten, Contact, Multi-step lead form (/start)
2. Admin Dashboard: Projects CRUD, Leads management
3. Lead Webhook: Auto-sync naar dashboard.qtechnics.be
4. SEO/GEO: robots.txt, sitemap.xml, llms.txt, Schema.org, dynamische locatie/dienst pagina's
5. Persistent image uploads via MongoDB Base64

## Architecture
```
/app
├── backend/
│   ├── server.py         # FastAPI endpoints, Webhook, DB image storage
│   ├── .env, requirements.txt
│   └── tests/test_api.py
└── frontend/
    ├── public/           # robots.txt, sitemap.xml (992 URLs), llms.txt, manifest.json
    └── src/
        ├── App.js        # Router + ScrollToTop
        └── components/   # All React components
```

## What's Been Implemented

### Session 1 (2026-02-06)
- [x] Full site: Homepage, Renoveren, Projecten, Contact, Start form
- [x] Admin dashboard (frontend-only mock auth)
- [x] Lead webhook to dashboard.qtechnics.be
- [x] Base64 image storage in MongoDB
- [x] SEO: robots.txt, sitemap.xml, llms.txt, Schema.org, FAQ
- [x] LocationPage.jsx - 91 locaties binnen 30km van Oostham
- [x] UI: Logo, branding, ScrollToTop, phone number

### Session 2 (2026-03-31)
- [x] ServicePage.jsx - 25 diensten SEO landingspagina's
- [x] Dienst + Locatie combinaties (bijv. /diensten/badkamer-renoveren/tessenderlo)
- [x] Alle 91 locaties per provincie gegroepeerd op dienst pagina's
- [x] Sitemap uitgebreid naar 992 URLs met dienst+locatie matrix
- [x] Schema.org Service structured data op dienst pagina's
- [x] Canonical URLs en Open Graph meta tags
- [x] Locatie-specifieke unieke content per combinatie
- [x] Cross-linking: andere diensten in locatie, nabijgelegen gemeenten

## Key Technical Details
- **Frontend**: React, React Router, TailwindCSS, React Helmet
- **Backend**: FastAPI, Motor (async MongoDB), Httpx (webhook)
- **Images**: Base64 in MongoDB (persists across deployments)
- **SEO**: 25 diensten × 91 locaties = dynamische landingspagina's

## Pending/Backlog
### P1
- [ ] Backend JWT authenticatie voor admin (nu frontend-only mock)
- [ ] Resend email bevestigingen activeren (EMERGENT_EMAIL_API_KEY nodig)
- [ ] Webhook endpoint valideren op dashboard.qtechnics.be

### P2
- [ ] Blog sectie voor extra SEO content
- [ ] Privacybeleid & Algemene voorwaarden pagina's
- [ ] Admin dashboard statistieken
- [ ] Google Search Console indienen

## Credentials
- **Admin Panel:** /admin (username: admin, password: maxq2024) - MOCKED frontend-only

## Last Updated
2026-03-31

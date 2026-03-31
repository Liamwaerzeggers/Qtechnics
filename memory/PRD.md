# Max Q Interior Design Website - PRD

## Original Problem Statement
Clone van de interior design website maxq.be met alle functionaliteiten, aangepast kleurenschema (#500000, #3a190b, #202020), en uitgebreid met admin panel voor projecten en leads beheer. SEO/GEO optimalisatie met dynamische landingspagina's per dienst en locatie. Automatische blog generatie met AI.

## Core Requirements
1. Website Pages: Homepage, Renoveren, Projecten, Blog, Contact, Multi-step lead form (/start)
2. Admin Dashboard: Projects CRUD, Leads management
3. Lead Webhook: Auto-sync naar dashboard.qtechnics.be
4. SEO/GEO: robots.txt, sitemap.xml (992 URLs), llms.txt, Schema.org, dynamische locatie/dienst pagina's
5. Persistent image uploads via MongoDB Base64
6. AI Blog: Dagelijks automatisch gegenereerde blogartikelen in het Nederlands

## Architecture
```
/app
├── backend/
│   ├── server.py         # FastAPI endpoints, Webhook, Blog AI generation, DB image storage
│   ├── .env              # MONGO_URL, EMERGENT_LLM_KEY, webhook keys
│   ├── requirements.txt
│   └── tests/            # test_api.py, test_blog_api.py
└── frontend/
    ├── public/           # robots.txt, sitemap.xml (992 URLs), llms.txt, manifest.json
    └── src/
        ├── App.js        # Router + ScrollToTop
        └── components/
            ├── BlogPage.jsx      # Blog listing with category filters
            ├── BlogDetail.jsx    # Blog article with prose HTML rendering
            ├── ServicePage.jsx   # 25 diensten SEO pagina's
            ├── LocationPage.jsx  # 91 locaties SEO pagina's
            └── ...
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
- [x] Dienst + Locatie combinaties (/diensten/:service/:location)
- [x] Alle 91 locaties per provincie gegroepeerd op dienst pagina's
- [x] Sitemap uitgebreid naar 992 URLs
- [x] Schema.org Service structured data + canonical URLs + Open Graph
- [x] Locatie-specifieke unieke content per combinatie
- [x] Cross-linking: andere diensten + nabijgelegen gemeenten
- [x] Blog/Kennisbank systeem met AI-generatie (GPT via emergentintegrations)
- [x] Blog listing pagina met categorie filters (/blog)
- [x] Blog detail pagina met prose HTML rendering (/blog/:slug)
- [x] Dagelijkse automatische blog publicatie (asyncio background task)
- [x] 30 voorgedefinieerde renovatie-gerelateerde topics
- [x] @tailwindcss/typography voor blog content styling
- [x] Blog navigatie link in header
- [x] Schema.org BlogPosting structured data
- [x] Offerte flow getest: CTA → /start → DB → admin dashboard → webhook

## Key API Endpoints
- POST /api/leads - Lead aanmaken (+ webhook + email)
- GET /api/leads - Alle leads ophalen
- GET /api/blogs - Blog listing (zonder content)
- GET /api/blogs/:slug - Volledige blog post
- POST /api/blogs/generate - Nieuw AI blogartikel genereren
- DELETE /api/blogs/:id - Blog verwijderen
- POST /api/upload - Afbeelding uploaden (base64 MongoDB)
- GET /api/images/:id - Afbeelding serveren

## Pending/Backlog
### P1
- [ ] Backend JWT authenticatie voor admin (nu frontend-only mock)
- [ ] Resend email bevestigingen activeren
- [ ] Blog beheer in admin dashboard (verwijderen/bewerken)

### P2
- [ ] Privacybeleid en Algemene voorwaarden pagina's
- [ ] Admin dashboard statistieken
- [ ] Google Search Console indienen
- [ ] Content sanitization voor blog HTML (XSS preventie)

## Credentials
- **Admin Panel:** /admin (username: admin, password: maxq2024) - MOCKED frontend-only

## Last Updated
2026-03-31

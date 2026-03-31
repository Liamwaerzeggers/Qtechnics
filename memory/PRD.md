# Max Q Interior Design Website - PRD

## Original Problem Statement
Clone van de interior design website maxq.be met alle functionaliteiten, aangepast kleurenschema (#500000, #3a190b, #202020), en uitgebreid met admin panel voor projecten en leads beheer. SEO/GEO optimalisatie met dynamische landingspagina's per dienst en locatie. Automatische blog generatie met AI. Maximale vindbaarheid op Google, ChatGPT en Gemini.

## Architecture
```
/app
├── backend/
│   ├── server.py         # FastAPI: API endpoints, Webhook, Blog AI gen, sitemap-blogs.xml
│   ├── .env              # MONGO_URL, EMERGENT_LLM_KEY, webhook keys
│   └── tests/            # test_api.py, test_blog_api.py, test_seo_artifacts.py
└── frontend/
    ├── public/
    │   ├── robots.txt         # References both sitemaps
    │   ├── sitemap.xml        # 993 static URLs (dienst+locatie matrix)
    │   ├── llms.txt           # 15KB AI-optimized content, all 91 locations
    │   ├── index.html         # Schema.org with 91 areaServed municipalities
    │   └── manifest.json
    └── src/
        ├── App.js
        └── components/
            ├── BlogPage.jsx, BlogDetail.jsx      # Blog/Kennisbank
            ├── ServicePage.jsx                    # 25 diensten SEO pagina's
            ├── LocationPage.jsx                   # 91 locaties SEO pagina's
            ├── AdminDashboard.jsx                 # Projecten + Leads beheer
            └── Header, Footer, Homepage, etc.
```

## What's Been Implemented
### Session 1 (2026-02-06)
- [x] Full site: Homepage, Renoveren, Projecten, Contact, Start form
- [x] Admin dashboard with Projects CRUD + Leads tab
- [x] Lead webhook to dashboard.qtechnics.be
- [x] Base64 image storage in MongoDB
- [x] SEO basics: robots.txt, sitemap.xml, llms.txt, Schema.org, FAQ
- [x] LocationPage.jsx - 91 locaties binnen 30km van Oostham

### Session 2 (2026-03-31)
- [x] ServicePage.jsx - 25 diensten SEO landingspagina's
- [x] Dienst+Locatie combinaties (alle 91 dorpen x top diensten)
- [x] Sitemap uitgebreid naar 993 URLs
- [x] Blog/Kennisbank met AI-generatie (GPT via emergentintegrations)
- [x] Dagelijkse automatische blog publicatie
- [x] llms.txt uitgebreid naar 15KB met alle 91 locaties en diensten
- [x] Schema.org areaServed uitgebreid naar alle 91 gemeenten
- [x] Blog sitemap endpoint (/api/sitemap-blogs.xml)
- [x] Google Search Console verificatie-tag voorbereid (commented)
- [x] robots.txt verwijst naar beide sitemaps
- [x] Canonical URLs, Open Graph, Schema.org BlogPosting + Service

## Pending/Backlog
### P1
- [ ] Backend JWT authenticatie voor admin (nu frontend-only mock)
- [ ] Blog beheer in admin dashboard (bewerken/verwijderen)
- [ ] Resend email bevestigingen activeren

### P2
- [ ] Google Search Console verificatie-tag activeren (gebruiker moet domein verifiëren)
- [ ] Privacybeleid & Algemene voorwaarden pagina's
- [ ] Content sanitization voor blog HTML
- [ ] Admin dashboard statistieken

## Credentials
- Admin Panel: /admin (username: admin, password: maxq2024) - MOCKED frontend-only

## Last Updated
2026-03-31

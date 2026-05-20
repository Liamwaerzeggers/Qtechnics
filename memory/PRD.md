# Max Q Interior Design Website - PRD

## Original Problem Statement
Clone van maxq.be met admin panel, lead management, SEO/GEO optimalisatie, AI blog met custom topics, Google Ads, Resend email, privacy policy en algemene voorwaarden.

## Architecture
```
/app
├── backend/
│   ├── server.py         # FastAPI: API, Webhook, Blog AI, Email, Custom Topics
│   └── .env              # MONGO_URL, EMERGENT_LLM_KEY, RESEND_API_KEY, webhook keys
└── frontend/
    ├── public/            # robots.txt, sitemap.xml (998+ URLs), llms.txt, index.html (Google tags)
    └── src/components/
        ├── AdminDashboard.jsx    # Tabs: Projecten, Aanvragen, Blog
        ├── BlogAdmin.jsx         # Blog beheer + custom topics
        ├── BlogPage/Detail.jsx   # Blog frontend
        ├── ServicePage.jsx       # 25 diensten SEO
        ├── LocationPage.jsx      # 91 locaties SEO
        ├── ProjectDetail.jsx     # Voor & Na foto's
        ├── PrivacyPolicy.jsx     # GDPR/AVG compliant
        ├── AlgemeneVoorwaarden.jsx # Belgische AV (BE 0891.533.928)
        └── BedanktPage.jsx       # Conversie tracking
```

## Implemented Features
- [x] Full site: Homepage, Renoveren, Projecten, Blog, Contact, Start, Bedankt
- [x] Admin dashboard: Projecten CRUD + Leads + Blog beheer
- [x] Voor & Na foto's op projecten
- [x] Lead webhook + Resend email (info@maxq.be → liam.waerzeggers@qtechnics.be)
- [x] AI Blog: dagelijkse auto-generatie, custom topics prioriteit, SEO + CTA links
- [x] Blog beheer: lijst, verwijderen, custom topics queue, handmatig genereren
- [x] 25 diensten × 91 locaties SEO pagina's, sitemap 998+ URLs
- [x] Google Analytics + GTM + Google Ads tags
- [x] /bedankt conversie-pagina
- [x] Privacybeleid (GDPR/AVG) + Algemene Voorwaarden (Belgisch recht)
- [x] llms.txt 15KB (9 medewerkers, Van Gestel, 25+ jaar)
- [x] Cookie banner + Cookiebeleid (Google Consent Mode v2)
- [x] Breadcrumbs (BreadcrumbList schema) op ProjectDetail/BlogDetail/ServicePage/LocationPage/Calculator
- [x] InternalLinks component (Featured Calculator CTA + 6 diensten + 12 locaties) op Home/Blog/BlogDetail/Contact/Bedankt/Renoveren/Projecten/Service/Location pagina's
- [x] Renovatie Prijscalculator (/calculator) - link bait tool met FAQ schema voor backlinks
- [x] Echte Google reviews als slider (3-up, autoplay, 10 reviews) op homepage met Google branding + Schema.org Review markup voor rich snippets
- [x] **SEO Pillar Page** `/premies-en-renovatieplicht-2026` (Mijn VerbouwPremie 2026 gids + EPC renovatieplicht + FAQPage schema + premie tabel)
- [x] **AI SEO Brain (Backend)** - dagelijkse cron `auto_seo_brain_daily()` die via LLM trending zoektermen onderzoekt, smart blog topic kiest, Q&A genereert voor llms.txt, opslaat in MongoDB en Resend email dagrapport stuurt
- [x] **Dynamic /api/llms.txt** endpoint dat statische llms.txt + live Q&A pairs serveert voor AI crawlers
- [x] Endpoints: `/api/seo/trends`, `/api/seo/qa`, `/api/seo/runs`, `/api/seo/run-now`
- [x] FAQ uitgebreid met intent vragen (Premies 2026, Renovatieplicht, "renoveren zonder breken") met FAQPage schema
- [x] llms.txt verrijkt met premies sectie + 7 AI-optimized Q&A's

## Pending/Backlog
### P1
- [ ] Backend JWT authenticatie voor admin (nu frontend-only mock)

### P2
- [ ] Blog artikelen bewerken (edit functie)
- [ ] Admin dashboard statistieken

## Credentials
- Admin: /admin (username: admin, password: maxq2024) - MOCKED

## Last Updated
2026-04-11

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

## Pending/Backlog
### P1
- [ ] Backend JWT authenticatie voor admin (nu frontend-only mock)

### P2
- [ ] Blog artikelen bewerken (edit functie)
- [ ] Cookie banner/consent
- [ ] Admin dashboard statistieken

## Credentials
- Admin: /admin (username: admin, password: maxq2024) - MOCKED

## Last Updated
2026-04-11

# Max Q Interior Design Website - PRD

## Original Problem Statement
Clone van de interior design website maxq.be met admin panel, lead management, SEO/GEO optimalisatie, AI blog, en Google Ads integratie.

## Architecture
```
/app
├── backend/
│   ├── server.py         # FastAPI: API, Webhook, Blog AI, Email (Resend)
│   ├── .env              # MONGO_URL, EMERGENT_LLM_KEY, RESEND_API_KEY, webhook keys
│   └── tests/
└── frontend/
    ├── public/            # robots.txt, sitemap.xml (998 URLs), llms.txt (15KB), index.html (Schema.org + Google tags)
    └── src/components/    # React components
```

## Implemented Features
- [x] Full site: Homepage, Renoveren, Projecten, Blog, Contact, Start form, Bedankt
- [x] Admin dashboard: Projects CRUD + Leads tab
- [x] **Voor & Na foto's** op projecten (optioneel, meerdere paren, VOOR/NA stempels, 3D effect)
- [x] Lead webhook naar dashboard.qtechnics.be
- [x] Email notificaties via Resend (info@maxq.be → liam.waerzeggers@qtechnics.be)
- [x] Blog/Kennisbank met dagelijkse AI-generatie (GPT)
- [x] 25 diensten SEO pagina's × 91 locaties
- [x] Sitemap 998 URLs, llms.txt 15KB met 9 medewerkers + Van Gestel
- [x] Google Analytics (G-JV778J3RZ6), GTM (GTM-PDVDGBTN), Google Ads (AW-951845364)
- [x] /bedankt conversie-pagina (noindex) voor Google Ads tracking
- [x] Contact + Start formulier → /bedankt redirect

## Pending/Backlog
### P1
- [ ] Backend JWT authenticatie voor admin (nu frontend-only mock)
- [ ] Blog beheer in admin dashboard

### P2
- [ ] Privacybeleid & Algemene voorwaarden
- [ ] Admin dashboard statistieken

## Credentials
- Admin: /admin (username: admin, password: maxq2024) - MOCKED

## Last Updated
2026-04-04

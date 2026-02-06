# Max Q Interior Design Website - PRD

## Original Problem Statement
Clone van de interior design website maxq.be met alle functionaliteiten, aangepast kleurenschema (#500000, #3a190b, #202020), en uitgebreid met admin panel voor projecten en leads beheer.

## Core Requirements
1. **Website Pages:**
   - Homepage met hero, services, projecten preview, testimonials, FAQ, CTA
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

### UI/Branding (2026-02-06)
- [x] Logo vergroot (h-14)
- [x] "Powered by Qtechnics" met link naar qtechnicsrenovaties.be
- [x] Browser titel: "Max Q | Renovaties & Interieur in Limburg"
- [x] Custom favicon
- [x] Scroll-to-top bij navigatie

### SEO & AI Optimalisatie (2026-02-06)
- [x] Meta tags (title, description, keywords, geo)
- [x] Open Graph & Twitter Cards
- [x] Schema.org LocalBusiness structured data
- [x] Schema.org FAQPage structured data
- [x] robots.txt met AI crawler permissions
- [x] llms.txt voor AI-systemen
- [x] sitemap.xml
- [x] manifest.json voor PWA
- [x] FAQ sectie met 6 veelgestelde vragen

### Eerder Geïmplementeerd
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
- [x] Webhook synchronisatie code

## Architecture
```
/app
├── backend/
│   ├── .env
│   ├── requirements.txt
│   ├── server.py
│   └── uploads/
└── frontend/
    ├── public/
    │   ├── index.html (SEO meta tags, structured data)
    │   ├── robots.txt
    │   ├── sitemap.xml
    │   ├── llms.txt
    │   └── manifest.json
    ├── .env
    └── src/
        ├── App.js
        └── components/
            ├── Header.jsx
            ├── Footer.jsx
            ├── Hero.jsx (SEO optimized)
            ├── FAQ.jsx (met FAQPage schema)
            ├── AdminDashboard.jsx
            ├── ProjectDetail.jsx
            └── ...
```

## SEO Files
- **robots.txt**: AI crawlers (GPTBot, ChatGPT-User, anthropic-ai, PerplexityBot) explicitly allowed
- **llms.txt**: Complete bedrijfsinformatie voor AI-systemen
- **sitemap.xml**: Alle pagina's met prioriteit en update frequentie
- **Structured Data**: LocalBusiness, FAQPage, BreadcrumbList

## Pending/Backlog
### P0 (Kritiek)
- [ ] Website deployen naar maxq.be domein
- [ ] Indienen bij Google Search Console

### P1 (Belangrijk)
- [ ] Webhook endpoint activeren op dashboard.qtechnics.be
- [ ] Resend API key configureren
- [ ] Google Business Profile aanmaken/updaten
- [ ] Backend authenticatie voor admin

### P2 (Nice-to-have)
- [ ] Blog sectie voor extra SEO content
- [ ] Privacybeleid & Algemene voorwaarden pagina's
- [ ] Admin dashboard statistieken

## Credentials
- **Admin Panel:** /admin → username: admin, password: maxq2024

## Last Updated
2026-02-06

# PRD - MaxQ Offerte & Project Dashboard

## Origineel Probleem
Alles-in-één constructie management platform (MaxQ) met multi-role, tweetalig (NL/UA), materiaal bestelsysteem, PWA + push notificaties.

## Kernfuncties (Geïmplementeerd)
- Multi-role auth (Admin, Worker, Realtor, Investor)
- Lead & Offerte Management met PDF/Excel export
- Project lifecycle management, werkbonnen, kalender
- Materiaal catalogus & bestelsysteem (inline invoer, handmatige items, custom afmetingen)
- PWA met push notificaties voor admin
- MongoDB bestandsopslag (overleeft redeployments)
- **Robuuste financiële herberekening** (`recalculate_project_sales`)

## Architectuur
```
Frontend: React + TailwindCSS + Shadcn/UI
Backend: FastAPI + MongoDB (Motor)
Push: Web Push API + pywebpush + VAPID
File Storage: MongoDB stored_files collection
```

## Recent Opgeloste Bugs
### Dubbele Verkoopprijs & Goedgekeurde Offertes (0) Bug
**Oorzaak**: Bij delete van legacy offerte werd sales_price niet teruggedraaid. Incrementele berekeningen raakten uit sync.
**Oplossing**: 
- Nieuwe `recalculate_project_sales()` helper die ALTIJD vanuit brondata herberekent (quotes + legacy docs)
- Aangeroepen bij upload, delete, toggle sold, en quote goedkeuring
- Frontend auto-recalculate bij openen project detail
- Financieel tab toont nu ook legacy offertes in "Goedgekeurde Offertes" sectie
- `POST /api/projects/{id}/recalculate-financials` endpoint voor handmatige herberekening

## Bekende Issues
- P1: Taaktoewijzing fout (user verificatie pending)
- P2: 5 foto upload limiet
- P2: server.py refactoring (>11,500 regels)
- P3: Property scraping beperkingen

## Backlog
- P1: server.py refactoring naar route modules
- P2: Onderaannemers Module
- P2: Investeerders Module
- P3: Commerciële logica (abonnementen)
- P3: MongoDB opslag voor alle uploads

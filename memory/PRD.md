# PRD - MaxQ Offerte & Project Dashboard

## Origineel Probleem
Alles-in-één constructie management platform met multi-role, tweetalig, materiaal bestelsysteem, PWA + push notificaties.

## Kernfuncties (Geïmplementeerd)
- Multi-role auth (Admin, Worker, Realtor, Investor)
- Lead & Offerte Management, Project lifecycle, werkbonnen, kalender
- Materiaal catalogus & bestelsysteem (inline invoer, handmatige items)
- PWA met push notificaties voor admin
- MongoDB bestandsopslag (overleeft redeployments)
- Robuuste financiële herberekening vanuit brondata
- Offerte regelitem omschrijving bewerken (inline edit)
- Per-kamer groepering met subtitels en subtotalen (UI + PDF export)
- Project status workflow met 8 statussen, kleurcodes, tabs en zoekfunctie
- Slimme renovatie berekening met correcte plafond afbraak/opbouw scheiding

## Recent Opgeloste Issues (april 2026)
### Project Status & Filtering
- 8 project statussen: Nieuwe Lead, Eerste Bezoek, Offerte Gemaakt, Offerte Voorgesteld, Verkocht, In Uitvoering, Afgerond, Niet Verkocht
- Horizontale status tabs met aantallen onder sales leaderboard
- Kleurgecodeerde tegels met gekleurde linkerrand
- Status dropdown op elke tegel voor snel wijzigen
- Zoekbalk voor projecten op naam/adres
- "Verkocht" status gekoppeld aan bestaande sales mechanisme
- Legacy status mapping voor bestaande projecten
- Backend PUT /api/projects/{id}/quick-status endpoint

### Auth Bug Fix - Cookie/Token Conflict
- Root cause: get_current_user gaf prioriteit aan (mogelijk verlopen) cookies boven geldige Authorization headers
- Fix: Authorization header heeft nu voorrang op cookies
- Oude sessies worden opgeruimd bij nieuwe login
- Cookies worden gewist bij uitloggen en bij 401 responses
- Frontend verwijdert oude cookies/tokens voor elke login poging

### Offerte Omschrijving & Per-Kamer Groepering
- Omschrijving inline bewerkbaar in QuoteDetailPage
- generate-quote-from-calculation groepeert per kamer met subtitels/subtotalen
- PDF export toont kamer-groepering met donkerrode headers

### Plafond Dubbele Afbraak Bug
- find_work_item_price exclude_pattern voorkomt dubbele afbraak match

## Bekende Issues
- P1: Taaktoewijzing fout (user verificatie pending)
- P2: 5 foto upload limiet
- P2: server.py refactoring (>11,600 regels)

## Backlog
- P1: server.py refactoring naar route modules
- P2: Onderaannemers Module
- P2: Investeerders Module
- P3: Commerciële logica / abonnementen & betalingen

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

## Recent Opgeloste Issues (maart 2026)
### Financieel Tab - Brondata Berekening
- Frontend berekent ALTIJD vanuit brondata (quotes + legacy docs + invoice uploads)
- Vertrouwt niet meer op project.sales_price of project.total_costs

### Aankoop Factuur Upload - Handmatig Bedrag
- PDF upload + handmatig bedrag invoer (incl. BTW) + omschrijving
- Geen OCR/scanning meer — betrouwbare handmatige invoer
- Factuurkosten worden automatisch bij Totale Kosten geteld
- Facturen opgeslagen in MongoDB (overleeft redeployments)
- Delete herberekent kosten automatisch

### Gefaseerde Facturatie & Admin Toegang
- Alle invoice endpoints gefixeerd: admin krijgt toegang zonder user_id filter
- Deelfacturen werken nu ook met legacy offertes als basis

## Bekende Issues
- P1: Taaktoewijzing fout (user verificatie pending)
- P2: 5 foto upload limiet
- P2: server.py refactoring (>11,600 regels)

## Backlog
- P1: server.py refactoring naar route modules
- P2: Onderaannemers Module / Investeerders Module
- P3: Commerciële logica / MongoDB voor alle uploads

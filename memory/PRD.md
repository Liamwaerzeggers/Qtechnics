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
- Per-kamer groepering met subtitels en subtotalen (zowel in UI als PDF export)

## Recent Opgeloste Issues (april 2026)
### Offerte Omschrijving Bewerking & Per-Kamer Groepering
- Omschrijving (description) van offerteregelitems is nu inline bewerkbaar in QuoteDetailPage
- generate-quote-from-calculation groepeert items per kamer met:
  - Subtitel rij (donkerrood header met kamernaam)
  - Subtotaal rij (rood geaccentueerde samenvatting per kamer)
- Subtitle/subtotal items tellen NIET mee in quote totalen (geen dubbeltelling)
- PDF export toont kamer-groepering met:
  - Donkerrode kamer-header rijen
  - Lichtroze subtotaalrijen per kamer met bedrag
  - Werkt voor nieuwe offertes (subtitle items) EN bestaande offertes (parsing van kamer-prefix)

### Financieel Tab - Brondata Berekening
- Frontend berekent ALTIJD vanuit brondata (quotes + legacy docs + invoice uploads)

### Aankoop Factuur Upload - Handmatig Bedrag
- PDF upload + handmatig bedrag invoer (incl. BTW) + omschrijving

## Bekende Issues
- P1: Taaktoewijzing fout (user verificatie pending)
- P2: 5 foto upload limiet
- P2: server.py refactoring (>11,600 regels)

## Backlog
- P1: server.py refactoring naar route modules
- P2: Onderaannemers Module
- P2: Investeerders Module
- P3: Commerciële logica / abonnementen & betalingen

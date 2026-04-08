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
- Slimme renovatie berekening met correcte plafond afbraak/opbouw scheiding

## Recent Opgeloste Issues (april 2026)
### Offerte Omschrijving Bewerking & Per-Kamer Groepering
- Omschrijving van offerteregelitems is nu inline bewerkbaar
- Items worden per kamer gegroepeerd met subtitel en subtotaal
- PDF export toont kamer-groepering met donkerrode headers en subtotalen
- Werkt voor nieuwe EN bestaande offertes

### Plafond Dubbele Afbraak Bug
- find_work_item_price zocht "gyproc" en vond "Afbraak plafond gyproc" als eerste match
- Opgelost met exclude_pattern parameter: afbraak items worden nu overgeslagen bij opbouw-zoekactie
- Resultaat: correct afbraak plafond (€25/m²) + opbouw witte gyproc (€150/m²)

## Bekende Issues
- P1: Taaktoewijzing fout (user verificatie pending)
- P2: 5 foto upload limiet
- P2: server.py refactoring (>11,600 regels)

## Backlog
- P1: server.py refactoring naar route modules
- P2: Onderaannemers Module
- P2: Investeerders Module
- P3: Commerciële logica / abonnementen & betalingen

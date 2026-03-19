# PRD - MaxQ Offerte & Project Dashboard

## Origineel Probleem
Alles-in-één constructie management platform met multi-role, tweetalig, materiaal bestelsysteem, PWA + push notificaties.

## Kernfuncties (Geïmplementeerd)
- Multi-role auth (Admin, Worker, Realtor, Investor)
- Lead & Offerte Management, Project lifecycle, werkbonnen, kalender
- Materiaal catalogus & bestelsysteem (inline invoer, handmatige items)
- PWA met push notificaties voor admin
- MongoDB bestandsopslag (overleeft redeployments)
- Robuuste financiële herberekening (`recalculate_project_sales`)

## Recent Opgeloste Bugs (maart 2026)
### 1. Dubbele Verkoopprijs
- Frontend berekent nu ALTIJD vanuit brondata (quotes + legacy docs), vertrouwt niet meer op `project.sales_price`
- Backend recalculate functie als extra veiligheid

### 2. "Kon factuur niet aanmaken: Project not found"
- Oorzaak: `user_id` filter in project queries — projecten hebben niet altijd `user_id`
- Fix: Admins krijgen nu toegang tot alle projecten in ALLE endpoints
- Gefixte endpoints: create_invoice, upload_invoice, get_invoices, delete_invoice, update_invoice, export_invoice_pdf, get_quote_materials

### 3. Aankoop Factuur Upload
- Zelfde `user_id` filter probleem als issue 2 — nu gefixeerd

## Bekende Issues
- P1: Taaktoewijzing fout (user verificatie pending)
- P2: 5 foto upload limiet
- P2: server.py refactoring (>11,600 regels)

## Backlog
- P1: server.py refactoring naar route modules
- P2: Onderaannemers Module / Investeerders Module
- P3: Commerciële logica / MongoDB voor alle uploads

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
- Team taaksysteem met notificatiebalk, e-mail notificaties, 8 taaktypes
- Foto's opgeslagen in aparte stored_files collectie (geen 16MB limiet meer)

## Recent Geïmplementeerd (april 2026)

### Team Taaksysteem
- 8 taaktypes: Nieuwe Lead, Eerste Bezoek, Offerte Maken, Materiaal Bestellen, Planning, Opvolging, Administratie, Overig
- Automatische taak bij nieuwe lead (open + onverdeeld)
- Notificatiebalk bovenaan ELKE pagina: toont onverdeelde taken (rood) + jouw taken (groen)
- Uitklapbaar met toewijzen/voltooien knoppen
- Taken pagina (/tasks) met Actief/Voltooid/Alle filters, aanmaak dialog, toewijzing, voltooiing, verwijdering
- E-mail notificatie via Resend bij toewijzing met link naar dashboard
- Backend: GET/POST /api/team-tasks, PUT assign/complete, DELETE, GET /team-members

### Auth & Navigatie Stabiliteit
- 401 interceptor: soft event ipv page reload, debounced, cascade-preventie
- Promise.allSettled ipv Promise.all op data-fetch pagina's
- Authorization header voorrang boven cookies

### Foto Opslag Fix
- Base64 data in aparte stored_files collectie (niet in project document)
- Geen MongoDB 16MB document limiet meer → 20+ foto's mogelijk
- Photo serving: zoekt stored_files → project doc (legacy) → filesystem

### Project Status & Filtering
- 8 statussen met kleurcodes, horizontale tabs met aantallen
- Status dropdown op projecttegels, zoekbalk

### Offerte Verbeteringen
- Omschrijving inline bewerkbaar
- Per-kamer groepering met subtitels/subtotalen in UI en PDF

### Sidebar Taak Badge (feb 2026)
- Rode badge in linker sidebar naast "Taken" met aantal openstaande taken (onverdeeld + eigen)
- Werkt op desktop én mobiel, ververst elke 30s
- data-testid: `task-count-badge-desktop` en `task-count-badge`

### Browser Push Notificaties voor Taken (feb 2026)
- VAPID key converter fix: raw 32-byte scalar base64url (pywebpush compatibel)
- Nieuwe `send_user_push(user_id, ...)` helper (push naar specifieke gebruiker)
- Push bij `POST /team-tasks` (direct toegewezen) + `PUT /team-tasks/{id}/assign`
- Service Worker + subscription ook geactiveerd voor workers (naast admins)
- Automatische opruiming van verlopen (410) en corrupte (base64) subscriptions

### Wekelijkse Samenvattings-e-mail (feb 2026)
- APScheduler cron: elke maandag 07:00 Europe/Brussels (`weekly_task_summary`)
- Per teamlid: openstaande taken + afgelopen week voltooide taken
- Leden zonder activiteit worden overgeslagen (geen noise)
- Admin endpoint `POST /api/team-tasks/send-weekly-summary[?target_user_id=X]` voor handmatige trigger/test
- Verstuurd via Resend van `noreply@maxq.be`

### Team Prestaties Widget (feb 2026)
- Inklapbaar widget bovenaan `/tasks` (alleen voor admins)
- Per teamlid: voltooid deze week/maand, openstaand (kleur bij >5), gemiddelde doorlooptijd, totaal voltooid
- Top-performer badge bij koploper van de week
- Client-side berekening uit bestaande tasks state (geen extra API calls)
- **Klik op rij**: filtert takenlijst op dat teamlid (toggle aan/uit); chip bovenaan met aantal en "Wis filter"
- **Herverdeel-knop** per teamlid (niet gebonden aan een minimum): dialog met openstaande taken, bulk-toewijzing of per-taak toewijzing aan collega; gebruikt bestaande `/api/team-tasks/{id}/assign` endpoint waardoor push- en e-mailnotificaties automatisch verstuurd worden

### Taak Voltooiings-Animatie (feb 2026)
- `TaskCompletionCelebration` overlay bij het voltooien van een taak op `/tasks`
- Canvas-confetti burst (bordeaux/goud/groen/blauw/roze) vanuit onderhoeken
- Random icoon (Trophy, Sparkles, PartyPopper, Star, Award, Medal, Rocket, Flame) met bounce animatie
- Mix van 18 Nederlandse berichten: 7 serieuze ("Mission accomplished", "Solide werk") + 11 grappige ("Boem. Taak geveld.", "De concurrentie huilt.")
- Serieuze berichten: bordeaux kleurpalet; grappige: amber/warm palet
- Auto-dismiss na 2.2s

### iOS / Mobile Robustness (feb 2026)
- `axios.defaults.timeout = 30000` zodat iOS niet oneindig blijft wachten (iOS kill achtergrond-tabs stil)
- Auto retry op GET/HEAD bij netwerk/timeout fouten (1 retry, 800ms backoff)
- Handmatige opnieuw-mail knop per taak (`POST /api/team-tasks/{id}/resend-email`)
- Backend middleware: `Cache-Control: no-store` op alle `/api/auth*` endpoints (voorkomt stale login response cache op iOS)
- Nieuwe `ConnectivityBanner` component toont sticky rood banner bij offline status

### PDF Branding Refresh: Offertes & Facturen (feb 2026)
- Nieuw `pdf_branding.py` module met gedeelde building blocks (header, info-blokken, items-tabel, totals box, signature/payment footers)
- Bordeaux #500000 hoofdaccent in heel het document
- Header: logo links + "OFFERTE" / "FACTUUR" titel rechts + meta-info (nummer, datum, geldig tot, status)
- KLANT + PROJECT info in twee-koloms blok, gescheiden door subtiele divider
- Items-tabel met bordeaux header band + per-kamer groepering behouden + subtotalen
- Totals box rechts naast voorwaarden links, eindigt met bordeaux "TOTAAL TE BETALEN" band
- **Offertes**: signature footer met "Naam & handtekening klant" + "Datum"
- **Facturen**: payment footer met IBAN, BTW-nummer en gestructureerde mededeling
- Visuele materiaaloverzicht (offertes) op aparte pagina behouden
- Bedrijfsgegevens: Kantoor Gerhees 118 3945 Ham + Toonzaal Diamantstraat 8 2200 Herentals + 0488 15 20 28 + info@maxq.be
- MaxQ logo (transparante achtergrond) in header

### Rich-text Omschrijvingen op Offerteregels (mrt 2026)
- Markdown ondersteund in offerte-regel omschrijvingen: `**vet**`, `*cursief*`, `## Subkop`, `- bullet`, lege regel = paragraaf
- Backend `markdown_to_paragraph_html` helper in `pdf_branding.py` die markdown → ReportLab-Paragraph HTML (`<b>`, `<font color>`, `<br/>`, `<i>`) omzet
- Eerste regel volledig in `**...**` wordt automatisch een prominente bordeaux heading (size 11)
- Frontend: `<input>` vervangen door `<textarea>` (6 rijen) in zowel toevoegen-form als edit-mode + tip-tekst
- Nieuw `DescriptionView` component voor weergave in UI: parsed bullets, koppen en bold inline
- Visueel gevalideerd via PDF render: hoofdtitel bordeaux+vet, subkoppen bordeaux+vet, bullets geïndenteerd

### Digitale Klant-bevestiging op Offertes (mei 2026)
- Klant kan offertes digitaal bevestigen via het klantenportaal — geen handtekening op papier nodig
- Nieuwe Quote-velden: `customer_signed_at`, `customer_signed_name`, `customer_signed_ip`
- Endpoint `POST /api/customer-portal/{token}/quotes/{id}/sign` (publiek, alleen via portal-token), valideert naam (min 2 chars) + akkoord-checkbox, slaat IP op (X-Forwarded-For aware), markeert quote als `approved`
- Idempotent: tweede poging geeft 400 "Deze offerte is al digitaal bevestigd"
- Admin krijgt **push-notificatie** + **e-mail** zodra een klant tekent
- Customer portal toont nu ook draft/concept quotes met dynamische status-badges: "Wacht op jouw bevestiging" / "✓ Door jou bevestigd"
- Modal met naam-input + akkoord-checkbox; bij confirm verschijnt "Digitaal bevestigd" badge in de quote-card
- PDF-footer toont automatisch een bordeaux "DIGITAAL BEVESTIGD" stamp met naam + UTC-timestamp i.p.v. lege handtekeninglijnen

### Eenheid Aanpasbaar bij Arbeid-items (mei 2026)
- `LineItem`/`LineItemCreate`/`LineItemUpdate` Pydantic models: nieuwe `unit` veld
- Toevoegen-form: eenheid-dropdown verschijnt nu altijd voor arbeid (was alleen bij custom material)
- Edit-mode: nieuwe eenheid-selector (m², m, stuk, uur, dag, forfait, doos, rol, kg, liter)
- View-mode toont nu *"qty unit × prijs"* zodat de eenheid zichtbaar is

### Offerte Dupliceren binnen Project (mei 2026)
- Nieuw endpoint `POST /api/quotes/{id}/duplicate` (admin-only): kloont quote + alle line_items met nieuwe ID's
- Status reset naar `concept`, alle signing/sold/peppol-vlaggen gewist; titel krijgt *"(kopie)"* suffix
- Frontend: "Kopiëren"-knop met Copy-icoon op elke quote-card in de project-detail pagina
- Bevestigingsdialoog + toast met aantal gekopieerde regels

### Offerte Zichtbaarheid in Klantenportaal (mei 2026)
- Nieuw veld `visible_to_customer: bool = False` (default **onzichtbaar**) op `Quote` model en `QuoteUpdate`
- Endpoint `GET /api/customer-portal/{access_token}` filtert quotes nu op `visible_to_customer: true` (naast bestaande status-filter)
- Bestaande quotes zonder dit veld → standaard verborgen (user moet bewust zichtbaar maken)
- Frontend: Eye/EyeOff toggle-knop op elke quote-card in `ProjectDetailPage` (naast "Kopiëren") en in de Status-card van `QuoteDetailPage`
- Toggle wordt opgeslagen via bestaande `PUT /api/quotes/{id}` endpoint
- E2E getest met curl: toggle true → quote verschijnt in portal; toggle false → verdwijnt

## Bekende Issues
- P2: server.py refactoring (>12.000 regels) - technische schuld

## Backlog
- P1: server.py refactoring naar route modules
- P2: Onderaannemers Module
- P2: Investeerders Module
- P3: Commerciële logica / abonnementen & betalingen

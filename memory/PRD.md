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

### Multi-line Omschrijvingen behouden in PDF + Aanpasbare Sectie-Titels (mei 2026)
- **Bug fix**: enters/nieuwe regels in line-item omschrijvingen werden in de PDF samengeplakt op één regel (gold voor MATERIAAL en OVERIG in offerte-PDF, en alle types in factuur-PDF). Beide PDF generators routen nu door `markdown_to_paragraph_html` zodat `\n` correct als `<br/>` rendert. Arbeid-regex `^Room: rest$` werkt nu enkel op de eerste regel zodat extra regels behouden blijven.
- **Aanpasbare sectie-titels**: Quote heeft twee nieuwe optionele velden `labor_section_title` (default "ARBEID") en `material_section_title` (default "MATERIALEN"). User kan deze in de Status-card op `QuoteDetailPage` aanpassen om bv. "MATERIALEN" te hernoemen naar "POSTEN" wanneer de items per onderdeel getoond worden maar geen materiaal zijn.
- PDF gebruikt deze waarden in zowel offerte als factuur (factuur leest het van het gelinkte quote-record).
- E2E getest: titels in DB opgeslagen, PDF rendert met juiste headers.

### Item-Type wisselen na aanmaak (mei 2026)
- In de edit-mode van een line-item kan je nu het type wisselen (Arbeid/Materiaal/Overig). Backend recalculeert automatisch de offerte-totalen.
- Geen backend wijziging nodig: `LineItemUpdate` ondersteunde `item_type` al.

### Korting % per Regel (mei 2026)
- Nieuw veld `discount_percent: float = 0.0` op `LineItem`/`LineItemCreate`/`LineItemUpdate`.
- Backend berekent `total_excl_vat = quantity * unit_price * (1 - discount/100)`. BTW en quote-totalen volgen automatisch.
- Frontend: extra "Korting %" input in zowel het Item-toevoegen dialog als in de edit-mode (met live preview van het bedrag na korting).
- View-mode toont een groene badge "-X% korting" wanneer er een korting actief is.
- PDF (offerte + factuur) toont een groen "(-X% korting)" suffix naast de item-omschrijving voor arbeid, materiaal en overig.
- E2E getest: 10% korting op €1000 → €900 excl. BTW, 25% korting → €750. PDF toont "(-25% korting)".

### Foto Upload Mobiel Bug Fix (mei 2026)
- Root cause: duplicate `headers` JS-key in 7 upload-handlers gooide de Authorization header weg + zette een corrupte Content-Type zonder boundary. Resultaat: requests faalden onregelmatig en bestanden waren nadien niet meer te openen.
- Fix in `ProjectFirstVisitTab.js` (parallel uploads + retry + per-file feedback + 120s timeout), `ProjectWorkSlipPage.js` (parallel via Promise.all), en de overige 5 files (header-bug + timeout).

### AI Offerte Agent — Claude Sonnet 4.5 Vision (mei 2026)
- Nieuwe module `/app/backend/ai_quote_agent.py` met FastAPI router `/api/ai-quote-agent/*` (start-session, list, get, message, apply, delete).
- Model: `claude-sonnet-4-5-20250929` via `emergentintegrations` + `EMERGENT_LLM_KEY`. Vision support — input images worden automatisch naar PNG getranscodeerd + max 1600px resize voor payload-controle.
- System prompt instrueert agent als calculator/offerte-specialist die scope-vragen stelt en gestructureerd JSON-voorstel teruggeeft met arbeid + materialen + rationale + open vragen.
- Context: agent krijgt project info + uittreksel materialen/arbeid catalogus (40 items elk) bij elke beurt.
- Inputs ondersteund: grondplan (vision), tekstbeschrijving, foto's bestaande ruimte, afmetingen-formulier per kamer.
- Sessies blijven persistent in `ai_agent_sessions` collectie, multi-turn met laatste 10 berichten als preamble.
- Frontend pagina `AIQuoteAgentPage.js` op `/projects/:projectId/ai-offerte`: split-view chat (links) + live proposal panel met checkboxes (rechts). Bottom-right "Maak offerte van selectie" creëert nieuwe concept-offerte met de gekozen regels.
- Knop "✨ AI offerte" naast "Nieuwe Offerte" op `ProjectDetailPage`.
- E2E getest: grondplan-image (badkamer 4×3m + toilet 2×2m) → Claude leest dimensies correct, 21 regels voorstel (14 arbeid + 7 materiaal), €10.867 estimate excl, 6% BTW correct toegepast, succesvol omgezet naar quote OFF-2026-350718.

### Fase 1 — Meetstaat Module (mei 2026)

Onderdeel van het Max Q Project Intelligence Platform V3 — eerste fase van de uitbreiding waarbij Meetstaat de centrale bron van waarheid wordt voor alle afgeleide modules (offertes, materialen, bestellingen, mandagen, planning).

**Backend** (nieuwe module `/app/backend/meetstaat.py`, geregistreerd via `meetstaat_router`):
- Pydantic models: `Room`, `Window`, `Door` met manuele override-velden voor vloer/plafond/wand
- 10 endpoints onder `/api/projects/{project_id}/meetstaat/*` en `/api/meetstaat/{rooms,windows,doors}/{id}`
- `compute_room_metrics()`: deterministische berekening van:
  - Vloer/plafond = L × B
  - Bruto wand = 2(L+B) × H
  - Volume = vloer × H
  - Wand **netto** = bruto − raamoppervlak − deuroppervlak (voor pleister/gyproc/schilder)
  - Dagkanten raam = 2×B + 2×H (lm, volledige perimeter)
  - Dagkanten deur = 2×B + H (lm, perimeter min vloer)
- Standaard dagkant prijs €35/lm (per ruimte overschrijfbaar)
- Project totals: vloer/plafond/wand netto/volume/raam-count/deur-count/dagkanten-lm/dagkanten-kost
- E2E getest met Badkamer 4×3×2.6m + 1 raam (1×1) + 1 deur (0.9×2.1): alle 10 berekeningen exact ✓

**Frontend** (nieuw component `/app/frontend/src/pages/ProjectMeetstaatTab.js`):
- Nieuw tab "📏 Meetstaat" tussen "Eerste Bezoek" en "3D Ontwerpen" in `ProjectDetailPage`
- Ruimte-presets (Living, Keuken, Badkamer, … 11 templates) of vrije naamkeuze
- Expandable kamer-cards met inline editing (lengte/breedte/hoogte/dagkant-prijs autosave on blur)
- Per kamer: ramen en deuren management met label/breedte/hoogte/dagkant-diepte
- Live berekeningen per kamer: vloer/plafond/wand bruto/wand netto/volume/raamopp./deuropp./dagkanten-kost
- Project totalen-kaart bovenaan (bordeaux highlight voor dagkanten-kost)
- Manuele overrides voor vloer/plafond/wand in een details-collapsable sectie
- Override-indicator (↻ badge) als override actief is

**Hoofdprincipe (uit spec):** Meetstaat = bron van waarheid. Toekomstige fases (offerte 2.0, materialen, bestellingen, mandagen, planning) lezen hieruit. Manuele overrides blijven altijd mogelijk.

## Fase 1B — Werkpostbibliotheek (AFGEROND, getest iteratie 17 — 100%)
**Backend** (`/app/backend/werkposten.py`, router geregistreerd in server.py op `/api/werkposten`):
- WorkItem model: name, description, category, unit, standard_price, vat_rate, material_profile[], productivity_profile, discipline_order, active, price_history[]
- Zelflerende prijslogica: prijswijziging via PUT wordt automatisch gelogd in `price_history` (old/new/note/changed_at)
- Auto discipline_order o.b.v. DISCIPLINE_ORDER map (19 disciplines, Afbraak→Oplevering) wanneer categorie matcht en order=default(18)
- CRUD endpoints: GET (lijst, filter op category/search/include_inactive), GET /categories, GET /{id}, POST, PUT, DELETE (soft/hard), POST /{id}/duplicate, GET /{id}/history
- Leest uit bestaande `work_items` collectie met legacy-normalisatie (title→name, price_per_m2→standard_price)
- Pytest suite: `/app/backend/tests/test_werkposten.py` (16 tests, allemaal groen)
- 2 bugs gefixt tijdens bouw: dubbele `name` kwarg in duplicate + ObjectId-serialisatie na insert

**Frontend** (`/app/frontend/src/pages/WerkpostenPage.js`, route `/werkposten`, sidebar item "Werkposten"):
- Lijst gegroepeerd per categorie (collapsible), zoeken op naam, filter op categorie, "Inactieve tonen" toggle
- Form-dialog: naam, omschrijving, categorie (datalist disciplines), eenheid, standaardprijs, BTW, volgorde, productiviteitsprofiel (toggle + waarde/eenheid), materiaalprofiel (dynamische rijen), actief-toggle, reden-prijswijziging
- Acties per item: bewerken, dupliceren, deactiveren/activeren, prijshistoriek-dialog
- Badges tonen prijs/eenheid, BTW%, productiviteit/mandag, aantal materialen, aantal prijswijzigingen

## Bekende Issues
- P2: server.py refactoring (>12.000 regels) - technische schuld

## Fase 1C — Offertegenerator 2.0 (AFGEROND, getest iteratie 18 — 100%)
**Kernflow:** Meetstaat → automatische werkpostvoorstellen mét juiste hoeveelheden → gebruiker controleert/bewerkt → offerte aangemaakt (zelflerend op prijzen).

**Backend** (`/app/backend/offerte_generator.py`, router op `/api`):
- `SOURCE_REGISTRY` (berekeningsbronnen): floor_area, ceiling_area, wall_area_net, wall_plus_ceiling, dagkanten, perimeter, manual. Elke bron leidt de hoeveelheid af uit `compute_room_metrics` van de meetstaat.
- Werkpost krijgt veld `default_source` (welke meetstaat-waarde standaard de hoeveelheid invult).
- Ruimte-type templates ("AI voorstelregels") — collectie `room_templates`, CRUD via `/api/room-templates`, idempotente seed van 6 defaults (Badkamer, Keuken, Slaapkamer, Living, WC, Hal). Elke regel = label + categorie + bron + item_type + optionele werkpost-koppeling.
- `POST /api/projects/{id}/offerte-generator/suggest` — leest meetstaat, matcht template op ruimtenaam, berekent per regel de hoeveelheid uit de bron, matcht werkpost (op id of naam) voor prijs/BTW, sorteert op discipline-volgorde. Optionele `room_template_map` override per ruimte.
- `POST /api/projects/{id}/offerte-generator/create-quote` — maakt echte offerte + line_items voor de lead van het project, bewaart `source` + `work_item_id` per regel (traceerbaarheid), draait `recalculate_quote_totals`. Zelflerend: ingevulde/gewijzigde prijzen worden teruggeschreven naar de werkpost + gelogd in prijshistoriek.
- `GET /api/offerte-generator/sources` — bronnenlijst voor frontend.
- LineItem-model (server.py) uitgebreid met `source` + `work_item_id` zodat herkomst zichtbaar blijft bij heropenen offerte.
- Pytest: `/app/backend/tests/test_offerte_generator.py` (11 tests groen).

**Frontend:**
- `OfferteGeneratorModal.js` — geopend via "⚡ Genereer offerte" knop bovenaan de Meetstaat-tab (alleen zichtbaar als er ruimtes zijn). Toont per ruimte voorgestelde regels (bewerkbaar: aantal/eenheidsprijs/BTW/type + in/uitvinken), template-keuze per ruimte, bron-label per regel, live totalen, waarschuwing bij ontbrekende prijzen → "Offerte aanmaken" → navigeert naar de nieuwe offerte.
- `RuimteTemplatesPage.js` — eigen sidebar-item "Ruimte-templates", volledige CRUD met regels (label/categorie/bron/type).
- Werkposten-form: nieuw veld "Standaard hoeveelheid-bron".

## Backlog
- P1: server.py refactoring naar route modules
- P2: Fase 1.5 — AI plan-upload module (auto ruimtes invullen o.b.v. AI vision)
- P2: Onderaannemers Module
- P2: Investeerders Module
- P3: Fase 2/2B Materiaalbibliotheek + ECK + automatische bestellingen
- P3: Fase 3/3B Productiviteitsbibliotheek + mandagen-berekening
- P3: Commerciële logica / abonnementen & betalingen

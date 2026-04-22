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

## Bekende Issues
- P2: server.py refactoring (>12.000 regels) - technische schuld

## Backlog
- P1: server.py refactoring naar route modules
- P2: Onderaannemers Module
- P2: Investeerders Module
- P3: Commerciële logica / abonnementen & betalingen

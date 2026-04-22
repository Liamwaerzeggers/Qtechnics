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

## Kritieke Bugfixes (april 2026)

### Auth Stabiliteit - Navigatie Crasht Platform
- **Root cause**: 401 interceptor deed `window.location.href = '/'` (full page reload) bij ELKE 401 response
- **Cascade effect**: Eén gefaalde API call → alle tokens gewist → andere API calls falen ook → complete logout
- **Fix**: Soft event-systeem (`auth-expired` custom event), debounced 401 handler, skip auth-requests
- **Extra**: `Promise.allSettled` i.p.v. `Promise.all` op data-fetch pagina's

### Foto Upload Stopt Na Paar Foto's
- **Root cause**: Base64 data opgeslagen IN project document → MongoDB 16MB document limiet bereikt
- **Fix**: Foto data nu in aparte `stored_files` collectie, project houdt alleen URL referentie
- **Serving**: Zoekt eerst in stored_files, dan in project doc (legacy), dan filesystem

### Login Intermittent Ongeldig
- **Root cause**: get_current_user gaf prioriteit aan verlopen cookies boven geldige Authorization header
- **Fix**: Authorization header heeft voorrang, database error handling, indexes voor snellere lookups

### Klantenportaal Foto's Niet Zichtbaar
- **Root cause**: base64_data werd meegestuurd in response (gigantische payload), of foto niet vindbaar
- **Fix**: base64_data gestript uit alle project responses, foto serving endpoint doorzoekt 3 bronnen

## Bekende Issues
- P1: Taaktoewijzing fout (user verificatie pending)
- P2: 5 foto upload limiet
- P2: server.py refactoring (>11,600 regels)

## Backlog
- P1: server.py refactoring naar route modules
- P2: Onderaannemers Module
- P2: Investeerders Module
- P3: Commerciële logica / abonnementen & betalingen

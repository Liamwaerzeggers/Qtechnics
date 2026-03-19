# PRD - MaxQ Offerte & Project Dashboard

## Origineel Probleem
Bouw een alles-in-één constructie management platform (MaxQ) met:
- Lead management, offerte generatie, project planning
- Multi-role systeem: Admin, Werkman (Worker), Makelaar (Realtor), Investeerder (Investor)
- Tweetalige worker UI (Nederlands/Oekraïens)
- Materiaal catalogus & bestelsysteem
- PWA met push notificaties voor admin

## Kernfuncties (Geïmplementeerd)

### PWA (Progressive Web App)
- **manifest.json**: App naam "MaxQ Dashboard", iconen 192x192 en 512x512, theme #500000
- **Service Worker**: Push notification handling, notificationclick met navigatie
- **Installeerbaar**: Op iOS (Toevoegen aan startscherm) en Android
- **Push Notificaties** (alleen admin):
  1. Nieuwe materiaalbestelling van werkman
  2. Nieuwe project notitie
  3. Nieuwe lead
  4. Nieuwe sale (offerte verkocht)
- **VAPID keys**: Opgeslagen als base64 DER in .env, geconverteerd naar PEM bij startup
- **Subscription opslag**: MongoDB `push_subscriptions` collection

### Gebruikersbeheer & Auth
- Google OAuth + wachtwoord login voor admins
- Worker login (NL/UA tweetalig)
- Makelaar/Investeerder login
- Rol-gebaseerde toegang

### Lead & Offerte Management
- Lead pipeline (CRUD, status tracking)
- Offerte generator (PDF/Excel export)
- Billit/PEPPOL integratie

### Project Planning
- Project lifecycle management
- Werkbon systeem
- Kalender met planning
- Taaktoewijzing

### Materiaal Bestelsysteem
- Admin catalogusbeheer met categorieën (NL/UA namen)
- Worker materiaal bestelling met inline invoer, custom afmeting, handmatige invoer
- **Afbeelding opslag in MongoDB** (via `stored_files` collection)

### Bestandsopslag
- MongoDB-gebaseerde file storage voor catalogus afbeeldingen
- Upload via `POST /api/material-catalog/{id}/upload-image` en `POST /api/material-orders/upload-photo`
- Serving via `GET /api/files/{file_id}`

## Architectuur
```
Frontend: React + TailwindCSS + Shadcn/UI
Backend: FastAPI + MongoDB (Motor)
Auth: Google OAuth + wachtwoord
Push: Web Push API + pywebpush + VAPID
File Storage: MongoDB stored_files collection (base64)
Integraties: Billit, OpenAI, Resend
```

## Bekende Issues
- P1: Taaktoewijzing fout (fix deployed, user verificatie pending)
- P2: 5 foto upload limiet
- P2: server.py refactoring (>11,500 regels)
- P3: Property scraping beperkingen

## Backlog
- P1: server.py refactoring naar route modules
- P1: Productie afbeeldingen opnieuw uploaden via admin panel
- P2: Phase 2 - Onderaannemers Module
- P2: Phase 3 - Investeerders Module
- P3: Commerciële logica (abonnementen & betalingen)
- P3: MongoDB opslag voor alle uploads (floor plans, werkbonnen, etc.)

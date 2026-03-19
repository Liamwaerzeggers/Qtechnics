# PRD - MaxQ Offerte & Project Dashboard

## Origineel Probleem
Bouw een alles-in-één constructie management platform (MaxQ) met:
- Lead management, offerte generatie, project planning
- Multi-role systeem: Admin, Werkman (Worker), Makelaar (Realtor), Investeerder (Investor)
- Tweetalige worker UI (Nederlands/Oekraïens)
- Materiaal catalogus & bestelsysteem

## Kernfuncties (Geïmplementeerd)
### Gebruikersbeheer & Auth
- Google OAuth + wachtwoord login voor admins
- Worker login (NL/UA tweetalig)
- Makelaar/Investeerder login
- Rol-gebaseerde toegang

### Lead & Offerte Management
- Lead pipeline (CRUD, status tracking)
- Offerte generator (PDF/Excel export)
- Billit/PEPPOL integratie
- Property scraping

### Project Planning
- Project lifecycle management
- Werkbon systeem
- Kalender met planning
- Taaktoewijzing

### Materiaal Bestelsysteem
- Admin catalogusbeheer met categorieën (NL/UA namen)
- Worker materiaal bestelling met:
  - Catalogus browse (ingeklapte categorieën)
  - **Inline invoer op tegels**: Aantal (+/-), m², lopende meter direct op cataloguskaart
  - **Custom afmeting**: "Anders..." optie in afmeting dropdown
  - **Handmatige invoer**: Sectie "Niet in catalogus?" voor items buiten catalogus (beschrijving, aantal, m², lm, foto upload)
  - Winkelwagen met project selectie, leveringsdatum
- Backend verwerking met [Handmatig] prefix voor custom items

### Overige Modules
- Onderhoudsdossiers
- Floor plan analyse (GPT-4o Vision)
- Email notificaties (Resend)

## Architectuur
```
Frontend: React + TailwindCSS + Shadcn/UI
Backend: FastAPI + MongoDB (Motor)
Auth: Google OAuth + wachtwoord
Integraties: Billit, OpenAI, Resend
```

## Bekende Issues
- P1: Taaktoewijzing fout (fix deployed, user verificatie pending)
- P2: 5 foto upload limiet
- P2: server.py refactoring (>11,400 regels)
- P3: Property scraping beperkingen

## Backlog (Toekomstige Taken)
- P1: server.py refactoring naar route modules
- P2: Phase 2 - Onderaannemers Module
- P2: Phase 3 - Investeerders Module
- P3: Commerciële logica (abonnementen & betalingen)
- P3: Data migratie oude foto's

# Test Credentials

## Admin (username login)
- Login via landingspagina → knop "Beheerder Login (gebruikersnaam)"
- Endpoint: `POST /api/auth/admin/login` met JSON `{"username":"liam","password":"Liammail123"}`
- Response-veld: `session_token` (NIET `token`). Frontend bewaart in localStorage `auth_token` + `session_token`.
- Username: `liam`
- Password: `Liammail123`

## Notes
- Werkposten module endpoints: `/api/werkposten` (GET/POST), `/api/werkposten/{id}` (GET/PUT/DELETE), `/api/werkposten/{id}/duplicate`, `/api/werkposten/{id}/history`, `/api/werkposten/categories`
- Frontend Werkpostbibliotheek pagina: route `/werkposten` (sidebar item "Werkposten")

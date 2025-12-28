# Test Result Documentation

## Current Test: Financieel Tab - Goedgekeurde Offerte Koppeling

### Test Objective
Verify that when a quote is approved ("goedgekeurd"), it correctly appears in the project's Financieel tab with the correct totals.

### Previous Issue
- The frontend was using `.find()` to get the first approved quote
- When multiple quotes were approved, the wrong quote's totals were shown
- Fix: Changed to sort approved quotes by date descending and use the most recent one

### Fix Applied
- Modified `/app/frontend/src/pages/ProjectDetailPage.js`
- Now sorts approved quotes by date (descending) and selects the most recent one

### Test Steps
1. Login as admin (test/test123)
2. Navigate to project PROJ-EEFA4606
3. Click on "Financieel" tab
4. Verify that the "Verkoopprijs" shows €3132.30 (from most recent approved quote OFF-2025-63F04A)
5. Verify that "Winst" is correctly calculated

### Expected Results
- Verkoopprijs: €3132.30
- Winst: €1962.30 (€3132.30 - €1170.00 kosten)
- Winstmarge: 62.6%

### Test Credentials
- Username: test
- Password: test123

### API Endpoints Used
- GET /api/projects/{project_id}
- GET /api/quotes (filtered by lead_id)

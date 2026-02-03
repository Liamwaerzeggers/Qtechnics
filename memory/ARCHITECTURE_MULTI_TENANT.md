# Max Q Multi-Tenant Platform Architecture

## 1. Rollen Overzicht

| Rol | Code | Toegang | Isolatie |
|-----|------|---------|----------|
| Max Q Admin | `admin` | Alles | Geen - ziet alles |
| Werkman | `worker` | Beperkt (projecten, werkbonnen) | Alleen zichtbare projecten |
| Onderaannemer | `subcontractor` | Eigen prijzen, toegewezen opdrachten | Volledig geïsoleerd |
| Makelaar | `realtor` | Eigen panden, renovatiecalculaties | Volledig geïsoleerd |
| Investeerder | `investor` | Eigen/gedeelde panden, rendement | Volledig geïsoleerd |

## 2. Nieuwe Entiteiten

### 2.1 Property (Pand)
```python
Property:
  id: str                          # PROP-XXXXXXXX
  owner_type: str                  # "realtor" | "investor" | "admin"
  owner_id: str                    # ID van eigenaar
  
  # Basis info (scraped of manueel)
  source_url: str                  # Immoweb/Zimmo URL
  source_platform: str             # "immoweb" | "zimmo" | "immoscoop" | "manual"
  
  # Adres
  address: str
  postal_code: str
  city: str
  
  # Kenmerken
  living_area: float               # Bewoonbare opp. (m²)
  plot_area: float                 # Grondoppervlakte (m²)
  bedrooms: int
  bathrooms: int
  construction_year: int
  epc_score: str                   # A, B, C, D, E, F, G
  epc_value: float                 # kWh/m²/jaar
  
  # Kamers met afmetingen
  rooms: List[Room]
  
  # Prijzen
  asking_price: float              # Vraagprijs
  estimated_value: float           # Geschatte waarde na renovatie
  
  # Foto's
  photos: List[str]                # URLs of base64
  
  # Status
  status: str                      # "imported" | "analyzing" | "calculated" | "shared"
  
  # Renovatie
  renovation_calculation_id: str   # Link naar berekening
  
  # Sharing
  shared_with: List[str]           # User IDs die dit pand mogen zien
  
  created_at: datetime
  updated_at: datetime
```

### 2.2 Room (Kamer binnen Property)
```python
Room:
  id: str
  name: str                        # "Woonkamer", "Badkamer 1", etc.
  room_type: str                   # "living" | "bedroom" | "bathroom" | "kitchen" | "hallway" | "other"
  
  # Afmetingen
  length: float                    # meter
  width: float                     # meter
  height: float                    # meter (standaard 2.7)
  
  # Berekende oppervlaktes
  floor_area: float                # length * width
  ceiling_area: float              # length * width
  wall_area: float                 # 2*(length + width) * height
  
  # Specifieke elementen
  windows: int                     # Aantal ramen
  doors: int                       # Aantal deuren
  
  # Notities
  notes: str
```

### 2.3 RenovationCalculation (Renovatieberekening)
```python
RenovationCalculation:
  id: str                          # CALC-XXXXXXXX
  property_id: str
  calculated_by: str               # user_id (admin of systeem)
  
  # Per kamer berekeningen
  room_calculations: List[RoomCalculation]
  
  # Totalen
  total_min: float
  total_realistic: float
  total_max: float
  
  # Tijdsinschatting
  estimated_duration_weeks: int
  
  # EPC impact
  estimated_epc_improvement: str   # bijv. "E → C"
  
  created_at: datetime
  updated_at: datetime
```

### 2.4 RoomCalculation (Berekening per kamer)
```python
RoomCalculation:
  room_id: str
  room_name: str
  
  # Werk items per component
  floor_items: List[CalculationItem]      # label = "vloer"
  wall_items: List[CalculationItem]       # label = "muur"
  ceiling_items: List[CalculationItem]    # label = "plafond"
  other_items: List[CalculationItem]      # label = "overig"
  
  # Totalen
  subtotal: float
```

### 2.5 CalculationItem (Werk item in berekening)
```python
CalculationItem:
  work_item_id: str                # Referentie naar WorkItem
  title: str
  quantity: float                  # m², stuks, etc.
  unit: str
  unit_price: float
  total: float
  
  included: bool                   # True = meegenomen, False = uitgesloten door gebruiker
  is_subcontractor: bool           # True = onderaannemer prijs
  subcontractor_id: str            # Indien van toepassing
```

### 2.6 Subcontractor (Onderaannemer)
```python
Subcontractor:
  id: str                          # SUB-XXXXXXXX
  user_id: str                     # Gekoppelde user voor login
  
  company_name: str
  contact_name: str
  email: str
  phone: str
  vat_number: str
  
  # Specialisatie
  category: str                    # "dak" | "ramen" | "metselwerk" | "gevel" | "isolatie" | "elektriciteit" | "sanitair"
  
  # Actief
  is_active: bool
  
  created_at: datetime
```

### 2.7 SubcontractorPrice (Prijs van onderaannemer)
```python
SubcontractorPrice:
  id: str
  subcontractor_id: str
  
  title: str                       # Omschrijving
  category: str                    # Moet matchen met onderaannemer specialisatie
  
  # Prijsmodel
  price_type: str                  # "forfait" | "per_m2" | "per_lm" | "per_stuk"
  price: float
  
  # Optioneel: range
  price_min: float
  price_max: float
  
  # Geldigheid
  valid_from: date
  valid_until: date
  
  created_at: datetime
  updated_at: datetime
```

### 2.8 RealtorProfile (Makelaar profiel)
```python
RealtorProfile:
  id: str                          # REALTOR-XXXXXXXX
  user_id: str                     # Gekoppelde user voor login
  
  company_name: str
  contact_name: str
  email: str
  phone: str
  
  # Limieten
  property_limit: int              # Max aantal panden (gratis tier)
  properties_used: int
  
  # Abonnement (toekomstig)
  subscription_tier: str           # "free" | "basic" | "pro"
  
  created_at: datetime
```

### 2.9 InvestorProfile (Investeerder profiel)
```python
InvestorProfile:
  id: str                          # INVESTOR-XXXXXXXX
  user_id: str
  
  name: str
  email: str
  phone: str
  
  # Portfolio
  target_roi: float                # Gewenst rendement %
  
  created_at: datetime
```

## 3. WorkItem Labels

Bestaande WorkItem entiteit uitbreiden met:
```python
WorkItem:
  # ... bestaande velden ...
  
  # NIEUW: Component labels
  component_label: str             # "vloer" | "muur" | "plafond" | "elektriciteit" | "sanitair" | "verwarming" | "isolatie" | "overig"
  room_types: List[str]            # ["all"] of ["bathroom", "kitchen"] etc.
```

## 4. Row-Level Security Logica

### Toegangsregels per entiteit:

| Entiteit | Admin | Worker | Subcontractor | Realtor | Investor |
|----------|-------|--------|---------------|---------|----------|
| Property | ALL | - | - | OWN | OWN + SHARED |
| RenovationCalc | ALL | - | - | OWN | OWN + SHARED |
| SubcontractorPrice | ALL | - | OWN | - | - |
| Lead | ALL | - | - | - | - |
| Project | ALL | VISIBLE | ASSIGNED | - | - |
| Quote | ALL | - | - | - | - |

### Implementatie:
```python
def get_tenant_filter(current_user, entity_type):
    if current_user.role == "admin":
        return {}  # Geen filter - ziet alles
    
    if entity_type == "property":
        if current_user.role == "realtor":
            return {"owner_id": current_user.id, "owner_type": "realtor"}
        if current_user.role == "investor":
            return {
                "$or": [
                    {"owner_id": current_user.id},
                    {"shared_with": current_user.id}
                ]
            }
    
    if entity_type == "subcontractor_price":
        if current_user.role == "subcontractor":
            return {"subcontractor_id": current_user.subcontractor_id}
    
    # Standaard: alleen eigen data
    return {"user_id": current_user.id}
```

## 5. API Endpoints (Nieuw)

### Properties
- `POST /api/properties` - Nieuw pand toevoegen
- `POST /api/properties/import` - Pand importeren via URL
- `GET /api/properties` - Eigen panden ophalen
- `GET /api/properties/{id}` - Pand details
- `PUT /api/properties/{id}` - Pand bewerken
- `DELETE /api/properties/{id}` - Pand verwijderen
- `POST /api/properties/{id}/share` - Pand delen met investeerder

### Renovation Calculator
- `POST /api/properties/{id}/calculate` - Start berekening
- `GET /api/properties/{id}/calculation` - Berekening ophalen
- `PUT /api/properties/{id}/calculation/items/{item_id}` - Item in/uitsluiten
- `POST /api/properties/{id}/calculation/recalculate` - Herberekenen

### Subcontractors (Admin only)
- `POST /api/subcontractors` - Nieuwe onderaannemer
- `GET /api/subcontractors` - Alle onderaannemers
- `POST /api/subcontractors/{id}/prices` - Prijs toevoegen
- `GET /api/subcontractors/{id}/prices` - Prijzen ophalen

### Work Items (Uitbreiding)
- `PUT /api/work-items/{id}/label` - Label toevoegen aan werkpost

### Realtors (Admin only)
- `POST /api/realtors` - Nieuwe makelaar aanmaken
- `GET /api/realtors` - Alle makelaars

### Investors (Admin only)  
- `POST /api/investors` - Nieuwe investeerder
- `GET /api/investors` - Alle investeerders

## 6. Scraping Strategie

### Ondersteunde platforms:
1. **Immoweb.be** - Meest complete data
2. **Zimmo.be** - Goede alternatief
3. **Immoscoop.be** - Backup

### Te scrapen velden:
- Adres (straat, postcode, stad)
- Prijs
- Bewoonbare oppervlakte
- Grondoppervlakte
- Aantal slaapkamers
- Aantal badkamers
- Bouwjaar
- EPC score/waarde
- Foto URLs
- Beschrijving

### Fallback:
- Als scraping faalt → manuele invoer
- Alle velden bewerkbaar na import

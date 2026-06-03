"""
Werkpostbibliotheek — Fase 1B van het Max Q Project Intelligence Platform.

Centrale bron van waarheid voor werkposten (arbeid + afgeleide items).
Wordt gebruikt door:
- Offertes (Fase 1C)
- Materiaalverbruik (Fase 2 — via material_profile)
- Mandagen (Fase 3 — via productivity_profile)
- Planning (Fase 4 — via discipline_order)
- Nacalculatie (Fase 5)

Zelflerend: ontbrekende prijzen worden bij eerste gebruik gevraagd en opgeslagen.
Prijswijzigingen worden gelogd in price_history voor audit en analyse.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/werkposten", tags=["werkposten"])

# Discipline-volgorde volgens de regels van de kunst (gebruikt in Fase 4 planning)
DISCIPLINE_ORDER = {
    "Afbraak": 1,
    "Ruwbouw": 2,
    "Riolering": 3,
    "Sanitair ruwbouw": 4,
    "Elektriciteit": 5,
    "Ventilatie": 6,
    "Isolatie": 7,
    "Vloerverwarming": 8,
    "Chape": 9,
    "Droogtijd": 10,
    "Pleisterwerken": 11,
    "Gyproc": 12,
    "Schilderwerken": 13,
    "Tegelwerken": 14,
    "Keuken": 15,
    "Sanitair afwerking": 16,
    "Binnendeuren": 17,
    "Eindafwerking": 18,
    "Oplevering": 19,
}


# ============= MODELS =============

class MaterialConsumption(BaseModel):
    """Materiaalprofiel-entry: hoeveel van een materiaal verbruikt per eenheid werkpost,
    inclusief snijverlies, veiligheidsmarge, verpakkingsafronding, status en reden (regels van de kunst)."""
    material_id: Optional[str] = None  # link naar materiaalbibliotheek
    material_name: str  # backup als material_id nog niet gelinkt is
    quantity_per_unit: float = 0.0  # bv. 0.34 platen per m²
    unit: str = "stuk"  # eenheid van het materiaal
    status: str = "verplicht"  # verplicht | aanbevolen | optioneel
    role: str = "basis"        # basis | hulp (basisproduct vs hulpmateriaal)
    reason: Optional[str] = None  # reden / regels van de kunst
    waste_percent: float = 0.0       # snijverlies %
    safety_margin_percent: float = 0.0  # veiligheidsmarge %
    package_qty: Optional[float] = None   # verpakkingseenheid (bv. 1.2 m²/doos)
    round_to_package: bool = False        # afronden naar volledige verpakking


class ProductivityProfile(BaseModel):
    """Productiviteitsprofiel: hoeveel werk een ploeg per dag aankan."""
    production_per_man_day: float = 0.0  # bv. 25 (m²/man/dag)
    production_unit: str = "m²"  # eenheid van de productie


class PriceHistoryEntry(BaseModel):
    old_price: float
    new_price: float
    changed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    changed_by: Optional[str] = None  # user id of email
    note: Optional[str] = None


class WorkItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"WP-{str(uuid.uuid4())[:8].upper()}")
    name: str  # "Gyproc plafond"
    description: Optional[str] = None  # extra uitleg / spec
    category: str = "Algemeen"  # bv. "Gyproc", "Pleisterwerken", "Tegelwerken"
    unit: str = "m²"  # m², m, stuk, uur, dag, forfait, kg, liter
    standard_price: Optional[float] = None  # None = onbekend → wordt gevraagd bij eerste gebruik
    vat_rate: float = 21.0  # 6, 9, 21 — meestal 6% voor renovatie woningen >10 jaar
    material_profile: List[MaterialConsumption] = []  # Fase 2 gebruikt
    productivity_profile: Optional[ProductivityProfile] = None  # Fase 3 gebruikt
    discipline_order: int = 18  # 1-19 — default "Eindafwerking" als niet ingesteld
    default_source: Optional[str] = None  # default bron-key (uit SOURCE_REGISTRY) voor offerte-generator
    active: bool = True
    price_history: List[PriceHistoryEntry] = []
    # Backwards compatibility: oude items hebben title + price_per_m2
    # Bij GET wordt deze gemapt naar name + standard_price indien nodig
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None


class WorkItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "Algemeen"
    unit: str = "m²"
    standard_price: Optional[float] = None
    vat_rate: float = 21.0
    material_profile: List[MaterialConsumption] = []
    productivity_profile: Optional[ProductivityProfile] = None
    discipline_order: int = 18
    default_source: Optional[str] = None
    active: bool = True


class WorkItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    standard_price: Optional[float] = None
    vat_rate: Optional[float] = None
    material_profile: Optional[List[MaterialConsumption]] = None
    productivity_profile: Optional[ProductivityProfile] = None
    discipline_order: Optional[int] = None
    default_source: Optional[str] = None
    active: Optional[bool] = None
    price_change_note: Optional[str] = None  # extra context als prijs wijzigt


class LearnPriceRequest(BaseModel):
    """Vul/leer een prijs voor een werkpost. Update bestaande of maak nieuwe aan."""
    work_item_id: Optional[str] = None
    name: str
    category: Optional[str] = "Algemeen"
    unit: Optional[str] = "m²"
    vat_rate: Optional[float] = 6.0
    default_source: Optional[str] = None
    price: float
    note: Optional[str] = None


# ============= HELPERS =============

async def _get_db():
    from server import db
    return db


def _normalize_legacy(doc: dict) -> dict:
    """Map oude work_items velden naar het nieuwe schema (read-side)."""
    if not doc:
        return doc
    # Map oude velden naar nieuwe
    if "name" not in doc and "title" in doc:
        doc["name"] = doc["title"]
    if "standard_price" not in doc and "price_per_m2" in doc:
        doc["standard_price"] = doc.get("price_per_m2")
    doc.setdefault("category", "Algemeen")
    doc.setdefault("unit", "m²")
    doc.setdefault("vat_rate", 21.0)
    doc.setdefault("material_profile", [])
    doc.setdefault("productivity_profile", None)
    doc.setdefault("discipline_order", 18)
    doc.setdefault("default_source", None)
    doc.setdefault("active", True)
    doc.setdefault("price_history", [])
    return doc


# ============= ENDPOINTS =============

@router.get("")
async def list_werkposten(category: Optional[str] = None, search: Optional[str] = None, include_inactive: bool = False):
    """Lijst alle werkposten. Filtert op categorie en/of search-term (naam)."""
    db = await _get_db()
    and_clauses = []
    if not include_inactive:
        # Tonen items waar active != False (incl. legacy items zonder active veld)
        and_clauses.append({"$or": [{"active": {"$ne": False}}, {"active": {"$exists": False}}]})
    if category:
        and_clauses.append({"category": category})
    if search:
        # Match name of title (legacy)
        and_clauses.append({"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"title": {"$regex": search, "$options": "i"}},
        ]})
    query = {"$and": and_clauses} if and_clauses else {}

    docs = await db.work_items.find(query, {"_id": 0}).sort("category", 1).to_list(1000)
    return [_normalize_legacy(d) for d in docs]


@router.get("/categories")
async def list_categories():
    """Geef alle unieke categorieën + de standaard discipline-volgorde terug."""
    db = await _get_db()
    cats = await db.work_items.distinct("category")
    return {
        "categories": sorted([c for c in cats if c]),
        "discipline_order_map": DISCIPLINE_ORDER,
    }


@router.get("/{work_item_id}")
async def get_werkpost(work_item_id: str):
    db = await _get_db()
    doc = await db.work_items.find_one({"id": work_item_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Werkpost niet gevonden")
    return _normalize_legacy(doc)


@router.post("/learn-price")
async def learn_price(payload: LearnPriceRequest):
    """Vul een prijs in voor een werkpost: update bestaande (op id of naam) of maak een nieuwe aan.
    Logt prijswijziging in de prijshistoriek. Zelflerend gebruikt door de offertegenerator."""
    db = await _get_db()
    now = datetime.now(timezone.utc).isoformat()
    price = float(payload.price)

    existing = None
    if payload.work_item_id:
        existing = await db.work_items.find_one({"id": payload.work_item_id}, {"_id": 0})
    if existing is None and payload.name:
        existing = await db.work_items.find_one(
            {"$or": [
                {"name": {"$regex": f"^{payload.name.strip()}$", "$options": "i"}},
                {"title": {"$regex": f"^{payload.name.strip()}$", "$options": "i"}},
            ]}, {"_id": 0})

    if existing is not None:
        existing = _normalize_legacy(existing)
        old = existing.get("standard_price")
        history = existing.get("price_history") or []
        if old is not None and float(old) != price:
            history.append(PriceHistoryEntry(old_price=float(old), new_price=price, note=payload.note or "Aangevuld via offertegenerator").model_dump())
        update_data = {"standard_price": price, "price_history": history, "updated_at": now}
        if payload.default_source and not existing.get("default_source"):
            update_data["default_source"] = payload.default_source
        await db.work_items.update_one({"id": existing["id"]}, {"$set": update_data})
        updated = await db.work_items.find_one({"id": existing["id"]}, {"_id": 0})
        return {"created": False, **_normalize_legacy(updated)}

    # Nieuwe werkpost aanmaken
    category = payload.category or "Algemeen"
    disc = DISCIPLINE_ORDER.get(category, 18)
    obj = WorkItem(
        name=payload.name.strip(),
        category=category,
        unit=payload.unit or "m²",
        standard_price=price,
        vat_rate=payload.vat_rate if payload.vat_rate is not None else 6.0,
        discipline_order=disc,
        default_source=payload.default_source,
    )
    await db.work_items.insert_one(obj.model_dump())
    return {"created": True, **obj.model_dump()}


@router.post("")
async def create_werkpost(payload: WorkItemCreate):
    db = await _get_db()
    # Auto-discipline-order als de categorie matched een bekende discipline
    if payload.category in DISCIPLINE_ORDER and payload.discipline_order == 18:
        payload.discipline_order = DISCIPLINE_ORDER[payload.category]
    obj = WorkItem(**payload.model_dump())
    await db.work_items.insert_one(obj.model_dump())
    return obj.model_dump()


@router.put("/{work_item_id}")
async def update_werkpost(work_item_id: str, payload: WorkItemUpdate):
    db = await _get_db()
    existing = await db.work_items.find_one({"id": work_item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Werkpost niet gevonden")
    existing = _normalize_legacy(existing)

    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None or k in ("description", "standard_price", "default_source")}
    note = update_data.pop("price_change_note", None)

    # Pydantic objects → dicts
    if "material_profile" in update_data and update_data["material_profile"] is not None:
        update_data["material_profile"] = [m.model_dump() if hasattr(m, "model_dump") else m for m in update_data["material_profile"]]
    if "productivity_profile" in update_data and update_data["productivity_profile"] is not None:
        prof = update_data["productivity_profile"]
        update_data["productivity_profile"] = prof.model_dump() if hasattr(prof, "model_dump") else prof

    # Prijswijziging → log in history
    if "standard_price" in update_data:
        old = existing.get("standard_price")
        new = update_data["standard_price"]
        if old is not None and new is not None and float(old) != float(new):
            entry = PriceHistoryEntry(
                old_price=float(old),
                new_price=float(new),
                note=note,
            ).model_dump()
            history = existing.get("price_history") or []
            history.append(entry)
            update_data["price_history"] = history

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.work_items.update_one({"id": work_item_id}, {"$set": update_data})
    updated = await db.work_items.find_one({"id": work_item_id}, {"_id": 0})
    return _normalize_legacy(updated)


@router.delete("/{work_item_id}")
async def delete_werkpost(work_item_id: str, soft: bool = True):
    """Verwijdert (soft=True: zet active=False, hard=False: wist uit DB)."""
    db = await _get_db()
    existing = await db.work_items.find_one({"id": work_item_id}, {"_id": 0, "id": 1})
    if not existing:
        raise HTTPException(status_code=404, detail="Werkpost niet gevonden")
    if soft:
        await db.work_items.update_one({"id": work_item_id}, {"$set": {"active": False, "updated_at": datetime.now(timezone.utc).isoformat()}})
        return {"deactivated": True}
    else:
        await db.work_items.delete_one({"id": work_item_id})
        return {"deleted": True}


@router.post("/{work_item_id}/duplicate")
async def duplicate_werkpost(work_item_id: str):
    db = await _get_db()
    existing = await db.work_items.find_one({"id": work_item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Werkpost niet gevonden")
    existing = _normalize_legacy(existing)
    existing.pop("title", None)  # legacy
    existing.pop("price_per_m2", None)
    new_obj = WorkItem(
        **{k: v for k, v in existing.items() if k in WorkItem.model_fields and k not in ("name", "id", "price_history", "created_at", "updated_at")},
        name=f"{existing.get('name', 'Werkpost')} (kopie)",
    )
    # Reset history bij kopie
    new_obj.price_history = []
    await db.work_items.insert_one(new_obj.model_dump())
    return new_obj.model_dump()


@router.get("/{work_item_id}/history")
async def get_price_history(work_item_id: str):
    db = await _get_db()
    doc = await db.work_items.find_one({"id": work_item_id}, {"_id": 0, "price_history": 1, "standard_price": 1, "name": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Werkpost niet gevonden")
    return {
        "name": doc.get("name"),
        "current_price": doc.get("standard_price"),
        "history": doc.get("price_history") or [],
    }

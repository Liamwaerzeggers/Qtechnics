"""
Materiaalbibliotheek — Fase 2 van het Max Q Project Intelligence Platform.

Centrale bron van waarheid voor materialen (aankoopprijs, leverancier, eenheid).
Wordt gebruikt door:
- Werkposten (material_profile koppelt verbruik per eenheid aan een materiaal)
- Materiaallijst-generator (Fase 2B) — berekent totale materiaalbehoefte per offerte/project

Zelflerend: ontbrekende aankoopprijzen worden bij gebruik aangevuld en gelogd in price_history.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/materiaal", tags=["materiaal"])

UNITS = ["stuk", "zak", "m²", "m", "lm", "kg", "liter", "rol", "pak", "doos", "palet"]


# ============= MODELS =============

class PriceHistoryEntry(BaseModel):
    old_price: float
    new_price: float
    changed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    changed_by: Optional[str] = None
    note: Optional[str] = None


class MateriaalItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"MAT-{str(uuid.uuid4())[:8].upper()}")
    name: str
    description: Optional[str] = None
    category: str = "Algemeen"
    unit: str = "stuk"                       # eenheid waarin besteld/verbruikt wordt
    purchase_price: Optional[float] = None    # aankoopprijs per eenheid (None = onbekend)
    supplier: Optional[str] = None            # leverancier
    sku: Optional[str] = None                 # artikelnummer
    package_qty: Optional[float] = None       # verpakkingseenheid (bv. 25 kg/zak) — informatief
    active: bool = True
    price_history: List[PriceHistoryEntry] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None


class MateriaalCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "Algemeen"
    unit: str = "stuk"
    purchase_price: Optional[float] = None
    supplier: Optional[str] = None
    sku: Optional[str] = None
    package_qty: Optional[float] = None
    active: bool = True


class MateriaalUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    purchase_price: Optional[float] = None
    supplier: Optional[str] = None
    sku: Optional[str] = None
    package_qty: Optional[float] = None
    active: Optional[bool] = None
    price_change_note: Optional[str] = None


class LearnMateriaalPriceRequest(BaseModel):
    material_id: Optional[str] = None
    name: str
    category: Optional[str] = "Algemeen"
    unit: Optional[str] = "stuk"
    supplier: Optional[str] = None
    price: float
    note: Optional[str] = None


# ============= HELPERS =============

async def _get_db():
    from server import db
    return db


def _defaults(doc: dict) -> dict:
    if not doc:
        return doc
    doc.setdefault("category", "Algemeen")
    doc.setdefault("unit", "stuk")
    doc.setdefault("active", True)
    doc.setdefault("price_history", [])
    return doc


# ============= ENDPOINTS =============

@router.get("")
async def list_materiaal(category: Optional[str] = None, search: Optional[str] = None, include_inactive: bool = False):
    db = await _get_db()
    and_clauses = []
    if not include_inactive:
        and_clauses.append({"$or": [{"active": {"$ne": False}}, {"active": {"$exists": False}}]})
    if category:
        and_clauses.append({"category": category})
    if search:
        and_clauses.append({"name": {"$regex": search, "$options": "i"}})
    query = {"$and": and_clauses} if and_clauses else {}
    docs = await db.materiaal_items.find(query, {"_id": 0}).sort("category", 1).to_list(2000)
    return [_defaults(d) for d in docs]


@router.get("/categories")
async def list_categories():
    db = await _get_db()
    cats = await db.materiaal_items.distinct("category")
    suppliers = await db.materiaal_items.distinct("supplier")
    return {
        "categories": sorted([c for c in cats if c]),
        "suppliers": sorted([s for s in suppliers if s]),
    }


@router.get("/{material_id}")
async def get_materiaal(material_id: str):
    db = await _get_db()
    doc = await db.materiaal_items.find_one({"id": material_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Materiaal niet gevonden")
    return _defaults(doc)


@router.post("")
async def create_materiaal(payload: MateriaalCreate):
    db = await _get_db()
    obj = MateriaalItem(**payload.model_dump())
    await db.materiaal_items.insert_one(obj.model_dump())
    return obj.model_dump()


@router.put("/{material_id}")
async def update_materiaal(material_id: str, payload: MateriaalUpdate):
    db = await _get_db()
    existing = await db.materiaal_items.find_one({"id": material_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Materiaal niet gevonden")
    existing = _defaults(existing)
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()
                   if v is not None or k in ("description", "purchase_price", "supplier", "sku", "package_qty")}
    note = update_data.pop("price_change_note", None)
    if "purchase_price" in update_data:
        old = existing.get("purchase_price")
        new = update_data["purchase_price"]
        if old is not None and new is not None and float(old) != float(new):
            history = existing.get("price_history") or []
            history.append(PriceHistoryEntry(old_price=float(old), new_price=float(new), note=note).model_dump())
            update_data["price_history"] = history
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.materiaal_items.update_one({"id": material_id}, {"$set": update_data})
    updated = await db.materiaal_items.find_one({"id": material_id}, {"_id": 0})
    return _defaults(updated)


@router.delete("/{material_id}")
async def delete_materiaal(material_id: str, soft: bool = True):
    db = await _get_db()
    existing = await db.materiaal_items.find_one({"id": material_id}, {"_id": 0, "id": 1})
    if not existing:
        raise HTTPException(status_code=404, detail="Materiaal niet gevonden")
    if soft:
        await db.materiaal_items.update_one({"id": material_id}, {"$set": {"active": False, "updated_at": datetime.now(timezone.utc).isoformat()}})
        return {"deactivated": True}
    await db.materiaal_items.delete_one({"id": material_id})
    return {"deleted": True}


@router.get("/{material_id}/history")
async def get_price_history(material_id: str):
    db = await _get_db()
    doc = await db.materiaal_items.find_one({"id": material_id}, {"_id": 0, "price_history": 1, "purchase_price": 1, "name": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Materiaal niet gevonden")
    return {"name": doc.get("name"), "current_price": doc.get("purchase_price"), "history": doc.get("price_history") or []}


@router.post("/learn-price")
async def learn_price(payload: LearnMateriaalPriceRequest):
    """Vul aankoopprijs in: update bestaand materiaal (op id of naam) of maak nieuw aan. Logt historiek."""
    db = await _get_db()
    now = datetime.now(timezone.utc).isoformat()
    price = float(payload.price)
    existing = None
    if payload.material_id:
        existing = await db.materiaal_items.find_one({"id": payload.material_id}, {"_id": 0})
    if existing is None and payload.name:
        existing = await db.materiaal_items.find_one(
            {"name": {"$regex": f"^{payload.name.strip()}$", "$options": "i"}}, {"_id": 0})
    if existing is not None:
        existing = _defaults(existing)
        old = existing.get("purchase_price")
        history = existing.get("price_history") or []
        if old is not None and float(old) != price:
            history.append(PriceHistoryEntry(old_price=float(old), new_price=price, note=payload.note or "Aangevuld via materiaallijst").model_dump())
        update_data = {"purchase_price": price, "price_history": history, "updated_at": now}
        if payload.supplier and not existing.get("supplier"):
            update_data["supplier"] = payload.supplier
        await db.materiaal_items.update_one({"id": existing["id"]}, {"$set": update_data})
        updated = await db.materiaal_items.find_one({"id": existing["id"]}, {"_id": 0})
        return {"created": False, **_defaults(updated)}
    obj = MateriaalItem(
        name=payload.name.strip(),
        category=payload.category or "Algemeen",
        unit=payload.unit or "stuk",
        purchase_price=price,
        supplier=payload.supplier,
    )
    await db.materiaal_items.insert_one(obj.model_dump())
    return {"created": True, **obj.model_dump()}

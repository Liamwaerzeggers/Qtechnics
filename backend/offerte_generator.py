"""
Offertegenerator 2.0 — Fase 1C van het Max Q Project Intelligence Platform.

Kernprincipe:
    Meetstaat → AI/regels stellen werkposten voor → gebruiker controleert/bewerkt → offerte

Onderdelen:
- SOURCE_REGISTRY: berekeningsmethodes (bronnen) die hoeveelheden uit de meetstaat afleiden.
- Ruimte-type templates ("AI voorstelregels"): per kamertype welke werkposten voorgesteld worden.
- /suggest: leest de meetstaat van een project en stelt per ruimte werkposten + hoeveelheden voor.
- /create-quote: zet bevestigde regels om in een echte offerte (line_items) voor de lead van het project.
  Zelflerend: ingevulde/aangepaste prijzen worden teruggeschreven naar de werkpostbibliotheek.

Elke voorgestelde/aangemaakte regel bewaart `source` (bron) + `work_item_id` zodat de herkomst
(welke meetstaat-waarde + welke berekening) altijd traceerbaar blijft.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging

from meetstaat import compute_room_metrics

logger = logging.getLogger(__name__)

router = APIRouter(tags=["offerte-generator"])


# ============= BRON-REGISTRY (berekeningsmethodes) =============
# Elke bron koppelt een werkpost aan een meetstaat-waarde + berekening.
SOURCE_REGISTRY: Dict[str, Dict[str, Any]] = {
    "floor_area": {"label": "Vloeroppervlak", "unit": "m²", "metric": "floor_area",
                   "explain": "Vloeroppervlak van de ruimte (L × B)"},
    "ceiling_area": {"label": "Plafondoppervlak", "unit": "m²", "metric": "ceiling_area",
                     "explain": "Plafondoppervlak van de ruimte"},
    "wall_area_net": {"label": "Muuroppervlak (netto)", "unit": "m²", "metric": "wall_area",
                      "explain": "Muuroppervlak na aftrek ramen + deuren"},
    "wall_plus_ceiling": {"label": "Muren + plafond", "unit": "m²", "metric": "_wall_plus_ceiling",
                          "explain": "Netto muuroppervlak + plafondoppervlak"},
    "dagkanten": {"label": "Dagkanten (ramen + deuren)", "unit": "lm", "metric": "dagkanten_total_lm",
                  "explain": "Lopende meter dagkanten van alle ramen en deuren"},
    "perimeter": {"label": "Omtrek (plinten)", "unit": "lm", "metric": "perimeter",
                  "explain": "Omtrek van de ruimte"},
    "manual": {"label": "Handmatig / forfait", "unit": "forfait", "metric": None,
               "explain": "Vaste hoeveelheid (forfait), handmatig in te vullen"},
}


def quantity_from_source(source: str, computed: dict) -> float:
    """Leid de hoeveelheid af uit een bron-key en de berekende meetstaat-metrics van een ruimte."""
    spec = SOURCE_REGISTRY.get(source)
    if not spec:
        return 1.0
    metric = spec.get("metric")
    if metric is None:
        return 1.0  # manual/forfait
    if metric == "_wall_plus_ceiling":
        return round(float(computed.get("wall_area", 0)) + float(computed.get("ceiling_area", 0)), 2)
    return round(float(computed.get(metric, 0)), 2)


def unit_from_source(source: str) -> str:
    spec = SOURCE_REGISTRY.get(source)
    return spec["unit"] if spec else "stuk"


# ============= MODELS — RUIMTE-TEMPLATES =============

class TemplateLine(BaseModel):
    model_config = ConfigDict(extra="ignore")
    label: str                                    # "Tegelvloer"
    category: str = "Algemeen"                    # discipline / categorie
    source: str = "manual"                         # bron-key uit SOURCE_REGISTRY
    work_item_id: Optional[str] = None             # optionele koppeling naar werkpost
    item_type: str = "arbeid"                       # arbeid / materiaal / overig
    unit: Optional[str] = None                      # override; anders uit bron
    vat_rate: Optional[float] = None                # override; anders uit werkpost (of 6%)


class RoomTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"RT-{str(uuid.uuid4())[:8].upper()}")
    room_type: str                                  # "Badkamer", "Keuken", ...
    description: Optional[str] = None
    lines: List[TemplateLine] = []
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class RoomTemplateCreate(BaseModel):
    room_type: str
    description: Optional[str] = None
    lines: List[TemplateLine] = []
    active: bool = True


class RoomTemplateUpdate(BaseModel):
    room_type: Optional[str] = None
    description: Optional[str] = None
    lines: Optional[List[TemplateLine]] = None
    active: Optional[bool] = None


# ============= MODELS — GENERATOR =============

class SuggestRequest(BaseModel):
    # optionele override: koppel handmatig een template aan een ruimte {room_id: template_id}
    room_template_map: Optional[Dict[str, str]] = None


class QuoteLineInput(BaseModel):
    model_config = ConfigDict(extra="ignore")
    description: str
    quantity: float = 0.0
    unit_price: float = 0.0
    vat_rate: float = 6.0
    unit: Optional[str] = None
    item_type: str = "arbeid"
    discount_percent: float = 0.0
    source: Optional[str] = None
    work_item_id: Optional[str] = None
    category: Optional[str] = None
    room_name: Optional[str] = None


class CreateQuoteRequest(BaseModel):
    lines: List[QuoteLineInput]
    room: Optional[str] = None
    learn_prices: bool = True


# ============= HELPERS =============

async def _get_db():
    from server import db
    return db


async def _ensure_project(db, project_id: str) -> dict:
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    return project


def _match_template(room_name: str, templates: List[dict]) -> Optional[dict]:
    """Match een ruimtenaam aan een template op basis van room_type (case-insensitive)."""
    if not room_name:
        return None
    name = room_name.strip().lower()
    # exact match eerst
    for t in templates:
        if t.get("room_type", "").strip().lower() == name:
            return t
    # bevat-match (bv. "Badkamer 1" → "Badkamer")
    for t in templates:
        rt = t.get("room_type", "").strip().lower()
        if rt and (rt in name or name in rt):
            return t
    return None


# ============= ENDPOINTS — META =============

@router.get("/offerte-generator/sources")
async def get_sources():
    """Geef de beschikbare berekeningsmethodes (bronnen) terug."""
    return [
        {"key": k, "label": v["label"], "unit": v["unit"], "explain": v["explain"]}
        for k, v in SOURCE_REGISTRY.items()
    ]


# ============= ENDPOINTS — RUIMTE-TEMPLATES (CRUD) =============

@router.get("/room-templates")
async def list_room_templates(include_inactive: bool = False):
    db = await _get_db()
    query = {} if include_inactive else {"$or": [{"active": {"$ne": False}}, {"active": {"$exists": False}}]}
    docs = await db.room_templates.find(query, {"_id": 0}).sort("room_type", 1).to_list(500)
    return docs


@router.get("/room-templates/{template_id}")
async def get_room_template(template_id: str):
    db = await _get_db()
    doc = await db.room_templates.find_one({"id": template_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Template niet gevonden")
    return doc


@router.post("/room-templates")
async def create_room_template(payload: RoomTemplateCreate):
    db = await _get_db()
    obj = RoomTemplate(**payload.model_dump())
    await db.room_templates.insert_one(obj.model_dump())
    return obj.model_dump()


@router.put("/room-templates/{template_id}")
async def update_room_template(template_id: str, payload: RoomTemplateUpdate):
    db = await _get_db()
    existing = await db.room_templates.find_one({"id": template_id}, {"_id": 0, "id": 1})
    if not existing:
        raise HTTPException(status_code=404, detail="Template niet gevonden")
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "lines" in update_data:
        update_data["lines"] = [
            (ln.model_dump() if hasattr(ln, "model_dump") else ln) for ln in update_data["lines"]
        ]
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.room_templates.update_one({"id": template_id}, {"$set": update_data})
    updated = await db.room_templates.find_one({"id": template_id}, {"_id": 0})
    return updated


@router.delete("/room-templates/{template_id}")
async def delete_room_template(template_id: str, soft: bool = True):
    db = await _get_db()
    existing = await db.room_templates.find_one({"id": template_id}, {"_id": 0, "id": 1})
    if not existing:
        raise HTTPException(status_code=404, detail="Template niet gevonden")
    if soft:
        await db.room_templates.update_one({"id": template_id}, {"$set": {"active": False}})
        return {"deactivated": True}
    await db.room_templates.delete_one({"id": template_id})
    return {"deleted": True}


# ============= ENDPOINTS — GENERATOR =============

async def _build_room_metrics(db, project_id: str) -> List[dict]:
    """Lees meetstaat-ruimtes + ramen + deuren en bereken metrics per ruimte."""
    rooms = await db.meetstaat_rooms.find({"project_id": project_id}, {"_id": 0}).sort("sort_order", 1).to_list(500)
    room_ids = [r["id"] for r in rooms]
    windows = await db.meetstaat_windows.find({"room_id": {"$in": room_ids}}, {"_id": 0}).to_list(2000)
    doors = await db.meetstaat_doors.find({"room_id": {"$in": room_ids}}, {"_id": 0}).to_list(2000)
    win_by_room: Dict[str, list] = {}
    door_by_room: Dict[str, list] = {}
    for w in windows:
        win_by_room.setdefault(w["room_id"], []).append(w)
    for d in doors:
        door_by_room.setdefault(d["room_id"], []).append(d)
    result = []
    for room in rooms:
        computed = compute_room_metrics(room, win_by_room.get(room["id"], []), door_by_room.get(room["id"], []))
        result.append({"room": room, "computed": computed})
    return result


@router.post("/projects/{project_id}/offerte-generator/suggest")
async def suggest_quote(project_id: str, payload: Optional[SuggestRequest] = None):
    """Stel per ruimte werkposten + hoeveelheden voor op basis van de meetstaat en de ruimte-templates."""
    db = await _get_db()
    await _ensure_project(db, project_id)
    payload = payload or SuggestRequest()
    override_map = payload.room_template_map or {}

    rooms_metrics = await _build_room_metrics(db, project_id)
    templates = await db.room_templates.find(
        {"$or": [{"active": {"$ne": False}}, {"active": {"$exists": False}}]}, {"_id": 0}
    ).to_list(500)
    templates_by_id = {t["id"]: t for t in templates}

    # Werkpost-lookup voorbereiden (op id en op naam)
    werkposten = await db.work_items.find({}, {"_id": 0}).to_list(5000)
    wp_by_id = {w.get("id"): w for w in werkposten}
    wp_by_name = {}
    for w in werkposten:
        nm = (w.get("name") or w.get("title") or "").strip().lower()
        if nm and nm not in wp_by_name:
            wp_by_name[nm] = w

    suggested_rooms = []
    for rm in rooms_metrics:
        room = rm["room"]
        computed = rm["computed"]
        room_id = room["id"]
        # bepaal template: override > automatische match
        template = None
        if room_id in override_map:
            template = templates_by_id.get(override_map[room_id])
        if template is None:
            template = _match_template(room.get("name", ""), templates)

        lines = []
        if template:
            for tl in template.get("lines", []):
                source = tl.get("source", "manual")
                qty = quantity_from_source(source, computed)
                # werkpost-match
                wp = None
                if tl.get("work_item_id"):
                    wp = wp_by_id.get(tl["work_item_id"])
                if wp is None:
                    wp = wp_by_name.get((tl.get("label") or "").strip().lower())
                unit_price = None
                if wp is not None:
                    unit_price = wp.get("standard_price")
                    if unit_price is None:
                        unit_price = wp.get("price_per_m2")
                vat_rate = tl.get("vat_rate")
                if vat_rate is None:
                    vat_rate = wp.get("vat_rate") if wp else 6.0
                unit = tl.get("unit") or (wp.get("unit") if wp else None) or unit_from_source(source)
                discipline = wp.get("discipline_order") if wp else 18
                lines.append({
                    "id": str(uuid.uuid4()),
                    "label": tl.get("label"),
                    "category": tl.get("category", "Algemeen"),
                    "source": source,
                    "source_label": SOURCE_REGISTRY.get(source, {}).get("label", source),
                    "quantity": qty,
                    "unit": unit,
                    "unit_price": unit_price,            # None = onbekend (zelflerend)
                    "vat_rate": float(vat_rate),
                    "item_type": tl.get("item_type", "arbeid"),
                    "work_item_id": wp.get("id") if wp else tl.get("work_item_id"),
                    "discipline_order": discipline,
                })
            # sorteer regels op discipline-volgorde
            lines.sort(key=lambda x: x.get("discipline_order", 18))

        suggested_rooms.append({
            "room_id": room_id,
            "room_name": room.get("name"),
            "template_id": template.get("id") if template else None,
            "template_room_type": template.get("room_type") if template else None,
            "computed": computed,
            "lines": lines,
            "has_template": template is not None,
        })

    return {
        "project_id": project_id,
        "rooms": suggested_rooms,
        "available_templates": [{"id": t["id"], "room_type": t["room_type"]} for t in templates],
        "rooms_without_template": [r["room_name"] for r in suggested_rooms if not r["has_template"]],
    }


@router.post("/projects/{project_id}/offerte-generator/create-quote")
async def create_quote_from_suggestions(project_id: str, payload: CreateQuoteRequest):
    """Maak een echte offerte aan uit de bevestigde/bewerkte regels. Zelflerend op prijzen."""
    db = await _get_db()
    project = await _ensure_project(db, project_id)
    lead_id = project.get("lead_id")
    if not lead_id:
        raise HTTPException(status_code=400, detail="Project heeft geen gekoppelde lead. Koppel eerst een lead aan het project.")
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Gekoppelde lead niet gevonden")
    if not payload.lines:
        raise HTTPException(status_code=400, detail="Geen offerteregels opgegeven")

    user_id = lead.get("user_id") or "system"
    now = datetime.now(timezone.utc)
    year = now.year
    quote_id = f"OFF-{year}-{str(uuid.uuid4())[:6].upper()}"

    quote_doc = {
        "id": quote_id,
        "lead_id": lead_id,
        "quote_number": quote_id,
        "room": payload.room,
        "date": now.isoformat(),
        "status": "concept",
        "line_items": [],
        "subtotal_labor": 0.0,
        "subtotal_material": 0.0,
        "total_excl_vat": 0.0,
        "vat_breakdown": {},
        "total_vat": 0.0,
        "total_incl_vat": 0.0,
        "total_price": 0.0,
        "visible_to_customer": False,
        "labor_section_title": "ARBEID",
        "material_section_title": "MATERIALEN",
        "created_at": now.isoformat(),
        "user_id": user_id,
        "generated_from": "meetstaat",
        "project_id": project_id,
    }
    await db.quotes.insert_one(quote_doc)

    learned = 0
    for ln in payload.lines:
        discount_factor = max(0.0, min(100.0, ln.discount_percent or 0.0)) / 100.0
        total_excl = ln.quantity * ln.unit_price * (1 - discount_factor)
        vat_amount = total_excl * (ln.vat_rate / 100.0)
        total_incl = total_excl + vat_amount
        item_doc = {
            "id": str(uuid.uuid4()),
            "quote_id": quote_id,
            "description": ln.description,
            "quantity": ln.quantity,
            "unit_price": ln.unit_price,
            "item_type": ln.item_type or "arbeid",
            "vat_rate": ln.vat_rate,
            "unit": ln.unit,
            "discount_percent": ln.discount_percent or 0.0,
            "total_excl_vat": round(total_excl, 2),
            "vat_amount": round(vat_amount, 2),
            "total_incl_vat": round(total_incl, 2),
            "total": round(total_excl, 2),
            "source": ln.source,
            "work_item_id": ln.work_item_id,
            "created_at": now.isoformat(),
        }
        await db.line_items.insert_one(item_doc)

        # Zelflerend: schrijf prijs terug naar de werkpostbibliotheek
        if payload.learn_prices and ln.unit_price and ln.unit_price > 0:
            if ln.work_item_id:
                # Bestaande werkpost: update prijs + log historiek
                wp = await db.work_items.find_one({"id": ln.work_item_id}, {"_id": 0})
                if wp is not None:
                    old = wp.get("standard_price")
                    if old is None and wp.get("price_per_m2") is not None:
                        old = wp.get("price_per_m2")
                    if old is None or float(old) != float(ln.unit_price):
                        history = wp.get("price_history") or []
                        if old is not None:
                            history.append({
                                "old_price": float(old),
                                "new_price": float(ln.unit_price),
                                "changed_at": now.isoformat(),
                                "changed_by": user_id,
                                "note": f"Zelflerend via offerte {quote_id}",
                            })
                        await db.work_items.update_one(
                            {"id": ln.work_item_id},
                            {"$set": {"standard_price": float(ln.unit_price), "price_history": history,
                                      "updated_at": now.isoformat()}},
                        )
                        learned += 1
            else:
                # Geen gekoppelde werkpost: maak een nieuwe aan zodat de bibliotheek leert
                from werkposten import WorkItem as _WorkItem, DISCIPLINE_ORDER as _DISC
                cat = ln.category or "Algemeen"
                new_wp = _WorkItem(
                    name=ln.description,
                    category=cat,
                    unit=ln.unit or "stuk",
                    standard_price=float(ln.unit_price),
                    vat_rate=float(ln.vat_rate),
                    discipline_order=_DISC.get(cat, 18),
                    default_source=ln.source,
                )
                await db.work_items.insert_one(new_wp.model_dump())
                # Koppel de nieuwe werkpost aan de offerteregel voor traceerbaarheid
                await db.line_items.update_one({"id": item_doc["id"]}, {"$set": {"work_item_id": new_wp.id}})
                learned += 1

    # Hertel offerte-totalen via bestaande logica
    try:
        from server import recalculate_quote_totals
        await recalculate_quote_totals(quote_id)
    except Exception as e:
        logger.warning(f"recalculate_quote_totals faalde: {e}")

    return {
        "quote_id": quote_id,
        "lead_id": lead_id,
        "line_count": len(payload.lines),
        "prices_learned": learned,
    }


# ============= SEED DEFAULTS =============

DEFAULT_TEMPLATES = [
    {
        "room_type": "Badkamer",
        "description": "Volledige badkamerrenovatie",
        "lines": [
            {"label": "Afbraak vloer", "category": "Afbraak", "source": "floor_area", "item_type": "arbeid"},
            {"label": "Afbraak wandtegels", "category": "Afbraak", "source": "wall_area_net", "item_type": "arbeid"},
            {"label": "Sanitair badkamer renovatie", "category": "Sanitair afwerking", "source": "manual", "item_type": "arbeid"},
            {"label": "Elektriciteit badkamer renovatie", "category": "Elektriciteit", "source": "manual", "item_type": "arbeid"},
            {"label": "Waterdichting douchezone", "category": "Tegelwerken", "source": "manual", "item_type": "arbeid"},
            {"label": "Tegelvloer", "category": "Tegelwerken", "source": "floor_area", "item_type": "arbeid"},
            {"label": "Wandtegels", "category": "Tegelwerken", "source": "wall_area_net", "item_type": "arbeid"},
            {"label": "Schilderwerken plafond", "category": "Schilderwerken", "source": "ceiling_area", "item_type": "arbeid"},
            {"label": "Afwerken dagkanten", "category": "Tegelwerken", "source": "dagkanten", "item_type": "arbeid"},
        ],
    },
    {
        "room_type": "Keuken",
        "description": "Keukenrenovatie (zonder keukenmeubel)",
        "lines": [
            {"label": "Vloerafwerking", "category": "Tegelwerken", "source": "floor_area", "item_type": "arbeid"},
            {"label": "Elektriciteit keuken", "category": "Elektriciteit", "source": "manual", "item_type": "arbeid"},
            {"label": "Pleisterwerken", "category": "Pleisterwerken", "source": "wall_plus_ceiling", "item_type": "arbeid"},
            {"label": "Schilderwerken", "category": "Schilderwerken", "source": "wall_plus_ceiling", "item_type": "arbeid"},
            {"label": "Afwerken dagkanten", "category": "Eindafwerking", "source": "dagkanten", "item_type": "arbeid"},
        ],
    },
    {
        "room_type": "Slaapkamer",
        "description": "Slaapkamerrenovatie",
        "lines": [
            {"label": "Pleisterwerken", "category": "Pleisterwerken", "source": "wall_plus_ceiling", "item_type": "arbeid"},
            {"label": "Schilderwerken", "category": "Schilderwerken", "source": "wall_plus_ceiling", "item_type": "arbeid"},
            {"label": "Vloerafwerking", "category": "Tegelwerken", "source": "floor_area", "item_type": "arbeid"},
            {"label": "Afwerken dagkanten", "category": "Eindafwerking", "source": "dagkanten", "item_type": "arbeid"},
        ],
    },
    {
        "room_type": "Living",
        "description": "Woonkamerrenovatie",
        "lines": [
            {"label": "Pleisterwerken", "category": "Pleisterwerken", "source": "wall_plus_ceiling", "item_type": "arbeid"},
            {"label": "Schilderwerken", "category": "Schilderwerken", "source": "wall_plus_ceiling", "item_type": "arbeid"},
            {"label": "Vloerafwerking", "category": "Tegelwerken", "source": "floor_area", "item_type": "arbeid"},
            {"label": "Plinten plaatsen", "category": "Eindafwerking", "source": "perimeter", "item_type": "arbeid"},
            {"label": "Afwerken dagkanten", "category": "Eindafwerking", "source": "dagkanten", "item_type": "arbeid"},
        ],
    },
    {
        "room_type": "WC",
        "description": "Toilet renovatie",
        "lines": [
            {"label": "Sanitair WC", "category": "Sanitair afwerking", "source": "manual", "item_type": "arbeid"},
            {"label": "Tegelvloer", "category": "Tegelwerken", "source": "floor_area", "item_type": "arbeid"},
            {"label": "Wandtegels", "category": "Tegelwerken", "source": "wall_area_net", "item_type": "arbeid"},
            {"label": "Schilderwerken plafond", "category": "Schilderwerken", "source": "ceiling_area", "item_type": "arbeid"},
        ],
    },
    {
        "room_type": "Hal",
        "description": "Inkomhal / gang",
        "lines": [
            {"label": "Pleisterwerken", "category": "Pleisterwerken", "source": "wall_plus_ceiling", "item_type": "arbeid"},
            {"label": "Schilderwerken", "category": "Schilderwerken", "source": "wall_plus_ceiling", "item_type": "arbeid"},
            {"label": "Vloerafwerking", "category": "Tegelwerken", "source": "floor_area", "item_type": "arbeid"},
            {"label": "Plinten plaatsen", "category": "Eindafwerking", "source": "perimeter", "item_type": "arbeid"},
        ],
    },
]


async def seed_default_room_templates():
    """Seed standaard ruimte-templates indien de collectie leeg is (idempotent)."""
    from server import db
    count = await db.room_templates.count_documents({})
    if count > 0:
        return
    for t in DEFAULT_TEMPLATES:
        obj = RoomTemplate(**t)
        await db.room_templates.insert_one(obj.model_dump())
    logger.info(f"Seeded {len(DEFAULT_TEMPLATES)} standaard ruimte-templates")

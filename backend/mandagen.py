"""
Mandagen-engine — Fase 3B van het Max Q Project Intelligence Platform.

Berekent automatisch het benodigde aantal mandagen (en de arbeidskostprijs) per project
op basis van de offertes en het productiviteitsprofiel van elke werkpost:

    Offerteregel (met werkpost) → werkpost.productivity_profile (productie/mandag)
    → mandagen = hoeveelheid / productie_per_mandag
    → arbeidskost = mandagen × uren_per_dag × uurloon

Gegroepeerd per discipline (volgens discipline_order). Manuele overrides en handmatige
regels blijven behouden bij hergeneratie (zelfde patroon als de materiaallijst).

Arbeidsloon-model (keuze gebruiker): uurloon × uren per dag.
Config (uurloon + uren/dag) is globaal instelbaar met een optionele override per project.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from werkposten import DISCIPLINE_ORDER

logger = logging.getLogger(__name__)

router = APIRouter(tags=["mandagen"])

GLOBAL_CONFIG_ID = "_global"
DEFAULT_HOURLY_RATE = 45.0
DEFAULT_HOURS_PER_DAY = 8.0

# Omgekeerde map: discipline_order → naam (voor labels)
ORDER_TO_DISCIPLINE = {v: k for k, v in DISCIPLINE_ORDER.items()}


# ============= MODELS =============

class MandagLine(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"MD-{str(uuid.uuid4())[:8].upper()}")
    project_id: str
    work_item_id: Optional[str] = None
    name: str
    category: Optional[str] = "Algemeen"
    discipline_order: int = 18
    unit: str = "m²"
    quantity: float = 0.0                     # geaggregeerde hoeveelheid uit offertes
    production_per_man_day: Optional[float] = None  # productie per mandag (uit profiel)
    production_unit: Optional[str] = None
    man_days: float = 0.0                      # berekende mandagen
    override_man_days: Optional[float] = None  # manuele override (telt voorrang)
    source: str = "auto"                       # auto | manual
    source_detail: Optional[str] = None
    enabled: bool = True
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ManualMandagCreate(BaseModel):
    name: str
    category: Optional[str] = "Algemeen"
    unit: str = "dag"
    quantity: float = 0.0
    man_days: float = 0.0
    notes: Optional[str] = None


class MandagUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    override_man_days: Optional[float] = None
    enabled: Optional[bool] = None
    notes: Optional[str] = None


class MandagConfig(BaseModel):
    hourly_rate: float = DEFAULT_HOURLY_RATE
    hours_per_day: float = DEFAULT_HOURS_PER_DAY


# ============= HELPERS =============

async def _get_db():
    from server import db
    return db


async def _ensure_project(db, project_id: str) -> dict:
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    return project


def _round(v: float, n: int = 2) -> float:
    return round(float(v or 0), n)


async def _collect_quote_ids(db, project_id: str, project: dict) -> List[str]:
    ids = set()
    async for q in db.quotes.find({"project_id": project_id}, {"_id": 0, "id": 1}):
        ids.add(q["id"])
    lead_id = project.get("lead_id")
    if lead_id:
        async for q in db.quotes.find({"lead_id": lead_id}, {"_id": 0, "id": 1}):
            ids.add(q["id"])
    return list(ids)


async def _get_global_config(db) -> dict:
    doc = await db.mandagen_config.find_one({"id": GLOBAL_CONFIG_ID}, {"_id": 0})
    if not doc:
        return {"hourly_rate": DEFAULT_HOURLY_RATE, "hours_per_day": DEFAULT_HOURS_PER_DAY}
    return {
        "hourly_rate": float(doc.get("hourly_rate", DEFAULT_HOURLY_RATE)),
        "hours_per_day": float(doc.get("hours_per_day", DEFAULT_HOURS_PER_DAY)),
    }


async def _get_effective_config(db, project_id: str) -> dict:
    """Project-override > globaal > defaults."""
    glob = await _get_global_config(db)
    proj = await db.mandagen_config.find_one({"id": project_id}, {"_id": 0})
    if proj:
        return {
            "hourly_rate": float(proj.get("hourly_rate", glob["hourly_rate"])),
            "hours_per_day": float(proj.get("hours_per_day", glob["hours_per_day"])),
            "is_override": True,
        }
    return {**glob, "is_override": False}


# ============= CONFIG ENDPOINTS =============

@router.get("/mandagen/config")
async def get_global_config():
    db = await _get_db()
    return await _get_global_config(db)


@router.put("/mandagen/config")
async def set_global_config(payload: MandagConfig):
    db = await _get_db()
    await db.mandagen_config.update_one(
        {"id": GLOBAL_CONFIG_ID},
        {"$set": {"id": GLOBAL_CONFIG_ID, "hourly_rate": float(payload.hourly_rate),
                  "hours_per_day": float(payload.hours_per_day),
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return await _get_global_config(db)


@router.get("/projects/{project_id}/mandagen/config")
async def get_project_config(project_id: str):
    db = await _get_db()
    await _ensure_project(db, project_id)
    return await _get_effective_config(db, project_id)


@router.put("/projects/{project_id}/mandagen/config")
async def set_project_config(project_id: str, payload: MandagConfig):
    db = await _get_db()
    await _ensure_project(db, project_id)
    await db.mandagen_config.update_one(
        {"id": project_id},
        {"$set": {"id": project_id, "hourly_rate": float(payload.hourly_rate),
                  "hours_per_day": float(payload.hours_per_day),
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return await _get_effective_config(db, project_id)


@router.delete("/projects/{project_id}/mandagen/config")
async def reset_project_config(project_id: str):
    """Verwijder de project-override → terug naar globale config."""
    db = await _get_db()
    await db.mandagen_config.delete_one({"id": project_id})
    return await _get_effective_config(db, project_id)


# ============= GENERATOR =============

@router.post("/projects/{project_id}/mandagen/generate")
async def generate_mandagen(project_id: str):
    """Bereken de benodigde mandagen uit alle offerteregels (met werkpost) van het project."""
    db = await _get_db()
    project = await _ensure_project(db, project_id)

    quote_ids = await _collect_quote_ids(db, project_id, project)
    line_items = []
    if quote_ids:
        line_items = await db.line_items.find({"quote_id": {"$in": quote_ids}}, {"_id": 0}).to_list(5000)

    work_item_ids = {li.get("work_item_id") for li in line_items if li.get("work_item_id")}
    werkposten = {}
    if work_item_ids:
        async for wp in db.work_items.find({"id": {"$in": list(work_item_ids)}}, {"_id": 0}):
            werkposten[wp["id"]] = wp

    # Aggregeer hoeveelheid per werkpost
    aggregate = {}
    missing_profiles = {}
    for li in line_items:
        wp = werkposten.get(li.get("work_item_id"))
        if not wp:
            continue
        line_qty = float(li.get("quantity") or 0)
        wp_name = wp.get("name") or wp.get("title") or "werkpost"
        prof = wp.get("productivity_profile") or {}
        ppd = float(prof.get("production_per_man_day") or 0) if prof else 0
        if ppd <= 0:
            mp = missing_profiles.setdefault(wp["id"], {
                "work_item_id": wp["id"], "name": wp_name,
                "quantity": 0.0, "unit": wp.get("unit") or "m²"})
            mp["quantity"] += line_qty
            continue
        entry = aggregate.setdefault(wp["id"], {
            "work_item_id": wp["id"],
            "name": wp_name,
            "category": wp.get("category") or "Algemeen",
            "discipline_order": int(wp.get("discipline_order") or 18),
            "unit": wp.get("unit") or "m²",
            "quantity": 0.0,
            "production_per_man_day": ppd,
            "production_unit": prof.get("production_unit") or wp.get("unit") or "m²",
        })
        entry["quantity"] += line_qty

    # Bestaande regels
    existing = await db.mandagen_lines.find({"project_id": project_id}, {"_id": 0}).to_list(2000)
    existing_auto = {ln["work_item_id"]: ln for ln in existing if ln.get("source") == "auto" and ln.get("work_item_id")}

    now = datetime.now(timezone.utc).isoformat()
    created, updated = 0, 0
    seen = set()

    for wid, agg in aggregate.items():
        seen.add(wid)
        man_days = _round(agg["quantity"] / agg["production_per_man_day"], 3) if agg["production_per_man_day"] else 0.0
        prev = existing_auto.get(wid)
        if prev:
            await db.mandagen_lines.update_one(
                {"id": prev["id"]},
                {"$set": {
                    "name": agg["name"],
                    "category": agg["category"],
                    "discipline_order": agg["discipline_order"],
                    "unit": agg["unit"],
                    "quantity": _round(agg["quantity"], 3),
                    "production_per_man_day": agg["production_per_man_day"],
                    "production_unit": agg["production_unit"],
                    "man_days": man_days,
                    "updated_at": now,
                }},
            )
            updated += 1
        else:
            obj = MandagLine(
                project_id=project_id,
                work_item_id=wid,
                name=agg["name"],
                category=agg["category"],
                discipline_order=agg["discipline_order"],
                unit=agg["unit"],
                quantity=_round(agg["quantity"], 3),
                production_per_man_day=agg["production_per_man_day"],
                production_unit=agg["production_unit"],
                man_days=man_days,
                source="auto",
            )
            await db.mandagen_lines.insert_one(obj.model_dump())
            created += 1

    # Verwijder auto-regels die niet meer voorkomen
    removed = 0
    for wid, ln in existing_auto.items():
        if wid not in seen:
            await db.mandagen_lines.delete_one({"id": ln["id"]})
            removed += 1

    return {
        "project_id": project_id,
        "created": created,
        "updated": updated,
        "removed": removed,
        "quotes_scanned": len(quote_ids),
        "werkposten_aggregated": len(aggregate),
        "missing_profiles": [{**v, "quantity": _round(v["quantity"], 2)} for v in missing_profiles.values()],
    }


@router.get("/projects/{project_id}/mandagen")
async def get_mandagen(project_id: str):
    """Volledige mandagenlijst gegroepeerd per discipline + totalen + arbeidskost."""
    db = await _get_db()
    project = await _ensure_project(db, project_id)
    config = await _get_effective_config(db, project_id)
    rate = config["hourly_rate"]
    hours = config["hours_per_day"]
    day_rate = rate * hours

    lines = await db.mandagen_lines.find({"project_id": project_id}, {"_id": 0}).to_list(2000)

    by_disc = {}
    totals = {"line_count": len(lines), "total_man_days": 0.0, "total_labor_cost": 0.0,
              "total_hours": 0.0, "disabled": 0}

    for ln in lines:
        eff = ln.get("override_man_days")
        eff = float(eff) if eff is not None else float(ln.get("man_days") or 0)
        ln["effective_man_days"] = _round(eff, 3)
        ln["labor_cost"] = _round(eff * day_rate, 2)
        ln["hours"] = _round(eff * hours, 2)
        enabled = ln.get("enabled", True)
        if not enabled:
            totals["disabled"] += 1
        else:
            totals["total_man_days"] += eff
            totals["total_labor_cost"] += eff * day_rate
            totals["total_hours"] += eff * hours
        order = int(ln.get("discipline_order") or 18)
        disc_name = ln.get("category") or ORDER_TO_DISCIPLINE.get(order) or "Algemeen"
        key = (order, disc_name)
        by_disc.setdefault(key, []).append(ln)

    totals["total_man_days"] = _round(totals["total_man_days"], 2)
    totals["total_labor_cost"] = _round(totals["total_labor_cost"], 2)
    totals["total_hours"] = _round(totals["total_hours"], 2)

    groups = []
    for (order, disc_name) in sorted(by_disc.keys()):
        ls = by_disc[(order, disc_name)]
        sub_md = sum((ml.get("effective_man_days") or 0) for ml in ls if ml.get("enabled", True))
        groups.append({
            "discipline": disc_name,
            "discipline_order": order,
            "lines": sorted(ls, key=lambda x: x.get("name") or ""),
            "subtotal_man_days": _round(sub_md, 2),
            "subtotal_labor_cost": _round(sub_md * day_rate, 2),
        })

    # Ontbrekende productiviteitsprofielen (werkposten in offertes zonder profiel)
    missing_profiles = []
    try:
        quote_ids = await _collect_quote_ids(db, project_id, project)
        if quote_ids:
            li_docs = await db.line_items.find({"quote_id": {"$in": quote_ids}}, {"_id": 0, "work_item_id": 1, "quantity": 1}).to_list(5000)
            wp_ids = {li.get("work_item_id") for li in li_docs if li.get("work_item_id")}
            if wp_ids:
                wps = {}
                async for wp in db.work_items.find({"id": {"$in": list(wp_ids)}}, {"_id": 0}):
                    wps[wp["id"]] = wp
                mp = {}
                for li in li_docs:
                    wp = wps.get(li.get("work_item_id"))
                    if not wp:
                        continue
                    prof = wp.get("productivity_profile") or {}
                    if not prof or float(prof.get("production_per_man_day") or 0) <= 0:
                        e = mp.setdefault(wp["id"], {"work_item_id": wp["id"], "name": wp.get("name") or wp.get("title"),
                                                     "quantity": 0.0, "unit": wp.get("unit") or "m²"})
                        e["quantity"] += float(li.get("quantity") or 0)
                missing_profiles = [{**v, "quantity": _round(v["quantity"], 2)} for v in mp.values()]
    except Exception as e:
        logger.warning(f"mandagen missing_profiles berekening faalde: {e}")

    return {
        "project_id": project_id,
        "config": {"hourly_rate": rate, "hours_per_day": hours, "day_rate": _round(day_rate, 2),
                   "is_override": config.get("is_override", False)},
        "groups": groups,
        "lines": lines,
        "totals": totals,
        "missing_profiles": missing_profiles,
    }


@router.post("/projects/{project_id}/mandagen/lines")
async def add_manual_mandag(project_id: str, payload: ManualMandagCreate):
    db = await _get_db()
    await _ensure_project(db, project_id)
    disc = DISCIPLINE_ORDER.get(payload.category or "", 18)
    obj = MandagLine(
        project_id=project_id,
        source="manual",
        name=payload.name,
        category=payload.category or "Algemeen",
        discipline_order=disc,
        unit=payload.unit,
        quantity=float(payload.quantity or 0),
        man_days=float(payload.man_days or 0),
        notes=payload.notes,
    )
    await db.mandagen_lines.insert_one(obj.model_dump())
    return obj.model_dump()


@router.put("/mandagen/lines/{line_id}")
async def update_mandag_line(line_id: str, payload: MandagUpdate):
    db = await _get_db()
    existing = await db.mandagen_lines.find_one({"id": line_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Regel niet gevonden")
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()
                   if v is not None or k in ("override_man_days", "notes")}
    if "category" in update_data and update_data["category"]:
        update_data["discipline_order"] = DISCIPLINE_ORDER.get(update_data["category"], existing.get("discipline_order", 18))
    # Voor manuele regels: quantity-wijziging mag man_days niet automatisch overschrijven
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.mandagen_lines.update_one({"id": line_id}, {"$set": update_data})
    updated = await db.mandagen_lines.find_one({"id": line_id}, {"_id": 0})
    return updated


@router.delete("/mandagen/lines/{line_id}")
async def delete_mandag_line(line_id: str):
    db = await _get_db()
    result = await db.mandagen_lines.delete_one({"id": line_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Regel niet gevonden")
    return {"deleted": True}

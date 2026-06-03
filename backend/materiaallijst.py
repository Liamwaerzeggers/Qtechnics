"""
Materiaallijst-generator — Fase 2B van het Max Q Project Intelligence Platform.

Genereert een duidelijke, geaggregeerde materiaallijst op basis van de offertes van een project:
    Offerteregel (met werkpost) → werkpost.material_profile → verbruik × hoeveelheid → geaggregeerd per materiaal

Doel: interne opvolging van wat besteld/geleverd moet worden.
- Status per regel: te_bestellen → besteld → geleverd
- Groeperen per leverancier voor een nette bestellijst
- "Zet besteld" markeert regels + maakt optioneel MaterialRequests aan voor het werfsysteem

Auto-gegenereerde regels (source=auto) worden bij hergeneratie bijgewerkt zolang ze nog
"te_bestellen" zijn. Handmatige regels en reeds bestelde/geleverde regels blijven behouden.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import math
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["materiaallijst"])

STATUS_TE_BESTELLEN = "te_bestellen"
STATUS_BESTELD = "besteld"
STATUS_GELEVERD = "geleverd"

REQ_ORDER = {"verplicht": 3, "aanbevolen": 2, "optioneel": 1}


def _strictest(a: str, b: str) -> str:
    return a if REQ_ORDER.get(a, 0) >= REQ_ORDER.get(b, 0) else b


# ============= MODELS =============

class MateriaallijstLine(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"MLL-{str(uuid.uuid4())[:8].upper()}")
    project_id: str
    material_id: Optional[str] = None        # link naar materiaalbibliotheek
    name: str
    unit: str = "stuk"
    quantity: float = 0.0
    unit_price: Optional[float] = None        # aankoopprijs per eenheid
    supplier: Optional[str] = None
    category: Optional[str] = None
    source: str = "auto"                       # "auto" (uit werkposten) of "manual"
    source_detail: Optional[str] = None         # bv. welke werkposten bijdroegen
    requirement: str = "verplicht"             # verplicht | aanbevolen | optioneel
    reason: Optional[str] = None                # reden / regels van de kunst
    calculation: Optional[str] = None           # berekeningsuitleg
    enabled: bool = True                        # of de regel meetelt (uitschakelbaar)
    waste_percent: float = 0.0
    safety_margin_percent: float = 0.0
    package_qty: Optional[float] = None
    packages: Optional[float] = None            # aantal verpakkingen (na afronding)
    status: str = STATUS_TE_BESTELLEN
    ordered_at: Optional[str] = None
    delivered_at: Optional[str] = None
    material_request_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ManualLineCreate(BaseModel):
    name: str
    unit: str = "stuk"
    quantity: float = 0.0
    unit_price: Optional[float] = None
    supplier: Optional[str] = None
    category: Optional[str] = None
    material_id: Optional[str] = None
    notes: Optional[str] = None


class LineUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    supplier: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    requirement: Optional[str] = None
    enabled: Optional[bool] = None
    notes: Optional[str] = None


class OrderRequest(BaseModel):
    line_ids: List[str]
    create_material_requests: bool = True
    needed_by: Optional[str] = None


# ============= HELPERS =============

async def _get_db():
    from server import db
    return db


async def _ensure_project(db, project_id: str) -> dict:
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    return project


def _round(v: float) -> float:
    return round(float(v or 0), 3)


# ============= GENERATOR =============

async def _collect_quote_ids(db, project_id: str, project: dict) -> List[str]:
    """Vind alle offertes die bij dit project horen (via project_id of lead_id)."""
    ids = set()
    async for q in db.quotes.find({"project_id": project_id}, {"_id": 0, "id": 1}):
        ids.add(q["id"])
    lead_id = project.get("lead_id")
    if lead_id:
        async for q in db.quotes.find({"lead_id": lead_id}, {"_id": 0, "id": 1}):
            ids.add(q["id"])
    return list(ids)


@router.post("/projects/{project_id}/materiaallijst/generate")
async def generate_materiaallijst(project_id: str):
    """Bereken de materiaalbehoefte uit alle offerteregels (met werkpost) van het project."""
    db = await _get_db()
    project = await _ensure_project(db, project_id)

    quote_ids = await _collect_quote_ids(db, project_id, project)
    line_items = []
    if quote_ids:
        line_items = await db.line_items.find({"quote_id": {"$in": quote_ids}}, {"_id": 0}).to_list(5000)

    # Verzamel benodigde werkposten
    work_item_ids = {li.get("work_item_id") for li in line_items if li.get("work_item_id")}
    werkposten = {}
    if work_item_ids:
        async for wp in db.work_items.find({"id": {"$in": list(work_item_ids)}}, {"_id": 0}):
            werkposten[wp["id"]] = wp

    # Materiaalbibliotheek-lookup (op id en naam)
    materials = await db.materiaal_items.find({}, {"_id": 0}).to_list(5000)
    mat_by_id = {m["id"]: m for m in materials}
    mat_by_name = {}
    for m in materials:
        nm = (m.get("name") or "").strip().lower()
        if nm and nm not in mat_by_name:
            mat_by_name[nm] = m

    # Aggregeer materiaalbehoefte (incl. snijverlies, marge, reden, status)
    aggregate = {}
    missing_profiles = {}  # work_item_id -> {name, quantity, unit}
    for li in line_items:
        wp = werkposten.get(li.get("work_item_id"))
        if not wp:
            continue
        profile = wp.get("material_profile") or []
        line_qty = float(li.get("quantity") or 0)
        wp_name = wp.get("name") or wp.get("title") or "werkpost"
        if not profile:
            # Werkpost zonder materiaalprofiel → waarschuwing
            mp = missing_profiles.setdefault(wp["id"], {"work_item_id": wp["id"], "name": wp_name, "quantity": 0.0, "unit": wp.get("unit") or "m²"})
            mp["quantity"] += line_qty
            continue
        for mc in profile:
            qpu = float(mc.get("quantity_per_unit") or 0)
            if qpu <= 0:
                continue
            netto = qpu * line_qty
            waste = float(mc.get("waste_percent") or 0)
            margin = float(mc.get("safety_margin_percent") or 0)
            needed = netto * (1 + waste / 100.0) * (1 + margin / 100.0)
            mat_id = mc.get("material_id")
            mname = (mc.get("material_name") or "").strip()
            munit = mc.get("unit") or "stuk"
            mat = None
            if mat_id and mat_id in mat_by_id:
                mat = mat_by_id[mat_id]
            elif mname:
                mat = mat_by_name.get(mname.lower())
            key = (mat["id"] if mat else None) or mname.lower() or f"_{munit}"
            entry = aggregate.setdefault(key, {
                "material_id": mat["id"] if mat else mat_id,
                "name": mat["name"] if mat else (mname or "Onbekend materiaal"),
                "unit": (mat.get("unit") if mat else None) or munit,
                "netto": 0.0,
                "needed": 0.0,
                "unit_price": mat.get("purchase_price") if mat else None,
                "supplier": mat.get("supplier") if mat else None,
                "category": mat.get("category") if mat else None,
                "package_qty": mc.get("package_qty") or (mat.get("package_qty") if mat else None),
                "round_to_package": bool(mc.get("round_to_package")),
                "waste_percent": waste,
                "safety_margin_percent": margin,
                "requirement": "optioneel",
                "reasons": set(),
                "contributors": set(),
            })
            entry["netto"] += netto
            entry["needed"] += needed
            entry["requirement"] = _strictest(entry["requirement"], mc.get("status") or "verplicht")
            if mc.get("reason"):
                entry["reasons"].add(mc.get("reason"))
            entry["contributors"].add(wp_name)
            if mc.get("package_qty") and not entry["package_qty"]:
                entry["package_qty"] = mc.get("package_qty")
            if mc.get("round_to_package"):
                entry["round_to_package"] = True
            entry["waste_percent"] = max(entry["waste_percent"], waste)
            entry["safety_margin_percent"] = max(entry["safety_margin_percent"], margin)

    # Bestaande regels ophalen
    existing = await db.materiaallijst_lines.find({"project_id": project_id}, {"_id": 0}).to_list(2000)
    existing_auto = {}
    for ln in existing:
        if ln.get("source") == "auto":
            k = ln.get("material_id") or (ln.get("name") or "").strip().lower()
            existing_auto[k] = ln

    now = datetime.now(timezone.utc).isoformat()
    created, updated, skipped = 0, 0, 0
    seen_keys = set()

    for key, agg in aggregate.items():
        seen_keys.add(key)
        needed = agg["needed"]
        packages = None
        final_qty = needed
        pkg = agg.get("package_qty")
        if agg.get("round_to_package") and pkg and pkg > 0:
            packages = math.ceil(needed / pkg)
            final_qty = round(packages * pkg, 3)
        final_qty = _round(final_qty)
        # Berekeningsuitleg
        calc = f"{_round(agg['netto'])} {agg['unit']} netto"
        if agg["waste_percent"]:
            calc += f" × {1 + agg['waste_percent']/100:.2f} (snijverlies {agg['waste_percent']:.0f}%)"
        if agg["safety_margin_percent"]:
            calc += f" × {1 + agg['safety_margin_percent']/100:.2f} (marge {agg['safety_margin_percent']:.0f}%)"
        calc += f" = {_round(needed)} {agg['unit']}"
        if packages is not None:
            calc += f" → afgerond {packages} verpakking(en) ({pkg} {agg['unit']}) = {final_qty} {agg['unit']}"
        reason = "; ".join(sorted(agg["reasons"])) if agg["reasons"] else None
        contributors = ", ".join(sorted(agg["contributors"]))

        prev = existing_auto.get(key)
        if prev:
            if prev.get("status") == STATUS_TE_BESTELLEN:
                await db.materiaallijst_lines.update_one(
                    {"id": prev["id"]},
                    {"$set": {
                        "quantity": final_qty,
                        "unit": agg["unit"],
                        "unit_price": agg["unit_price"] if prev.get("unit_price") is None else prev.get("unit_price"),
                        "supplier": agg["supplier"] if not prev.get("supplier") else prev.get("supplier"),
                        "category": agg["category"],
                        "source_detail": contributors,
                        "material_id": agg["material_id"],
                        "requirement": agg["requirement"],
                        "reason": reason,
                        "calculation": calc,
                        "waste_percent": agg["waste_percent"],
                        "safety_margin_percent": agg["safety_margin_percent"],
                        "package_qty": pkg,
                        "packages": packages,
                        "updated_at": now,
                    }},
                )
                updated += 1
            else:
                skipped += 1
        else:
            obj = MateriaallijstLine(
                project_id=project_id,
                material_id=agg["material_id"],
                name=agg["name"],
                unit=agg["unit"],
                quantity=final_qty,
                unit_price=agg["unit_price"],
                supplier=agg["supplier"],
                category=agg["category"],
                source="auto",
                source_detail=contributors,
                requirement=agg["requirement"],
                reason=reason,
                calculation=calc,
                waste_percent=agg["waste_percent"],
                safety_margin_percent=agg["safety_margin_percent"],
                package_qty=pkg,
                packages=packages,
            )
            await db.materiaallijst_lines.insert_one(obj.model_dump())
            created += 1

    # Verwijder auto-regels die niet meer voorkomen én nog te_bestellen zijn
    removed = 0
    for k, ln in existing_auto.items():
        if k not in seen_keys and ln.get("status") == STATUS_TE_BESTELLEN:
            await db.materiaallijst_lines.delete_one({"id": ln["id"]})
            removed += 1

    return {
        "project_id": project_id,
        "created": created,
        "updated": updated,
        "removed": removed,
        "skipped_locked": skipped,
        "quotes_scanned": len(quote_ids),
        "materials_aggregated": len(aggregate),
        "missing_profiles": [
            {**v, "quantity": _round(v["quantity"])} for v in missing_profiles.values()
        ],
    }


@router.get("/projects/{project_id}/materiaallijst")
async def get_materiaallijst(project_id: str):
    """Volledige materiaallijst van het project, gegroepeerd per leverancier + totalen."""
    db = await _get_db()
    await _ensure_project(db, project_id)
    lines = await db.materiaallijst_lines.find({"project_id": project_id}, {"_id": 0}).sort("created_at", 1).to_list(2000)

    by_supplier = {}
    totals = {"total_cost": 0.0, "line_count": len(lines),
              "te_bestellen": 0, "besteld": 0, "geleverd": 0, "missing_price": 0,
              "verplicht": 0, "aanbevolen": 0, "optioneel": 0, "disabled": 0}
    for ln in lines:
        sup = ln.get("supplier") or "Geen leverancier"
        by_supplier.setdefault(sup, []).append(ln)
        enabled = ln.get("enabled", True)
        if not enabled:
            totals["disabled"] += 1
        up = ln.get("unit_price")
        if enabled:
            if up is None:
                totals["missing_price"] += 1
            else:
                totals["total_cost"] += float(up) * float(ln.get("quantity") or 0)
        st = ln.get("status") or STATUS_TE_BESTELLEN
        if st in totals:
            totals[st] += 1
        req = ln.get("requirement") or "verplicht"
        if req in totals:
            totals[req] += 1
    totals["total_cost"] = round(totals["total_cost"], 2)

    groups = [{"supplier": sup, "lines": ls,
               "subtotal": round(sum((float(x.get("unit_price") or 0) * float(x.get("quantity") or 0))
                                      for x in ls if x.get("enabled", True)), 2)}
              for sup, ls in sorted(by_supplier.items())]

    # Ontbrekende materiaalprofielen (werkposten gebruikt in offertes zonder profiel)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    missing_profiles = []
    try:
        quote_ids = await _collect_quote_ids(db, project_id, project or {})
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
                    if wp and not (wp.get("material_profile") or []):
                        e = mp.setdefault(wp["id"], {"work_item_id": wp["id"], "name": wp.get("name") or wp.get("title"), "quantity": 0.0, "unit": wp.get("unit") or "m²"})
                        e["quantity"] += float(li.get("quantity") or 0)
                missing_profiles = [{**v, "quantity": round(v["quantity"], 2)} for v in mp.values()]
    except Exception as e:
        logger.warning(f"missing_profiles berekening faalde: {e}")

    return {"project_id": project_id, "groups": groups, "lines": lines, "totals": totals, "missing_profiles": missing_profiles}


@router.post("/projects/{project_id}/materiaallijst/lines")
async def add_manual_line(project_id: str, payload: ManualLineCreate):
    db = await _get_db()
    await _ensure_project(db, project_id)
    obj = MateriaallijstLine(project_id=project_id, source="manual", **payload.model_dump())
    await db.materiaallijst_lines.insert_one(obj.model_dump())
    return obj.model_dump()


@router.put("/materiaallijst/lines/{line_id}")
async def update_line(line_id: str, payload: LineUpdate):
    db = await _get_db()
    existing = await db.materiaallijst_lines.find_one({"id": line_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Regel niet gevonden")
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()
                   if v is not None or k in ("supplier", "unit_price", "notes", "category")}
    # Statuswijziging → timestamps
    if "status" in update_data:
        now = datetime.now(timezone.utc).isoformat()
        if update_data["status"] == STATUS_BESTELD and not existing.get("ordered_at"):
            update_data["ordered_at"] = now
        if update_data["status"] == STATUS_GELEVERD and not existing.get("delivered_at"):
            update_data["delivered_at"] = now
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.materiaallijst_lines.update_one({"id": line_id}, {"$set": update_data})
    updated = await db.materiaallijst_lines.find_one({"id": line_id}, {"_id": 0})
    return updated


@router.delete("/materiaallijst/lines/{line_id}")
async def delete_line(line_id: str):
    db = await _get_db()
    result = await db.materiaallijst_lines.delete_one({"id": line_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Regel niet gevonden")
    return {"deleted": True}


@router.post("/projects/{project_id}/materiaallijst/order")
async def mark_ordered(project_id: str, payload: OrderRequest):
    """Markeer regels als 'besteld' en maak optioneel MaterialRequests aan voor het werfsysteem."""
    db = await _get_db()
    project = await _ensure_project(db, project_id)
    now = datetime.now(timezone.utc).isoformat()
    project_name = project.get("name") or "Project"

    ordered, requests_created = 0, 0
    for line_id in payload.line_ids:
        ln = await db.materiaallijst_lines.find_one({"id": line_id, "project_id": project_id}, {"_id": 0})
        if not ln:
            continue
        set_data = {"status": STATUS_BESTELD, "ordered_at": now, "updated_at": now}

        if payload.create_material_requests and not ln.get("material_request_id"):
            req_doc = {
                "id": f"MATREQ-{str(uuid.uuid4())[:8].upper()}",
                "title": ln.get("name"),
                "quantity": f"{ln.get('quantity')} {ln.get('unit') or ''}".strip(),
                "needed_by": payload.needed_by or "",
                "photo_url": None,
                "notes": f"Auto vanuit materiaallijst — leverancier: {ln.get('supplier') or 'n.v.t.'}",
                "project_id": project_id,
                "project_name": project_name,
                "requested_by": "system",
                "requested_by_name": "Materiaallijst",
                "status": "ordered",
                "is_ordered": True,
                "is_delivered": False,
                "ordered_at": now,
                "ordered_by": "system",
                "created_at": now,
            }
            await db.material_requests.insert_one(req_doc)
            set_data["material_request_id"] = req_doc["id"]
            requests_created += 1

        await db.materiaallijst_lines.update_one({"id": line_id}, {"$set": set_data})
        ordered += 1

    return {"ordered": ordered, "material_requests_created": requests_created}

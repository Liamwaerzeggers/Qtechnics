"""
AI-materiaalprofielen — genereert materiaalprofielen voor werkposten volgens de regels van de kunst.

Gebruikt de bestaande Emergent LLM integratie (Claude Sonnet 4.5) — zelfde patroon als ai_quote_agent.py.
Vult enkel aan waar nog geen profiel is (tenzij mode='replace'). Alles blijft nadien handmatig aanpasbaar.
Stelt GEEN prijzen voor (prijzen worden zelflerend / handmatig ingevuld).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import json
import logging

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/werkposten", tags=["ai-material-profile"])


class AIProfileRequest(BaseModel):
    mode: str = "fill"  # "fill" = enkel als leeg, "replace" = altijd opnieuw


async def _get_db():
    from server import db
    return db


SYSTEM_MSG = (
    "Je bent een ervaren Belgische calculator/aannemer met diepgaande kennis van renovatiewerken "
    "en de regels van de kunst (goede vakkennis). Je bepaalt welke materialen nodig zijn om een "
    "bepaalde werkpost correct en volgens de regels van de kunst uit te voeren, inclusief "
    "hulpmaterialen en bevestigingsmateriaal. Je antwoordt UITSLUITEND met geldige JSON."
)


def _build_prompt(name: str, category: str, unit: str) -> str:
    return f"""Bepaal het volledige materiaalprofiel voor de volgende werkpost, per 1 {unit} (eenheid van de werkpost).

Werkpost: "{name}"
Categorie/discipline: "{category}"
Eenheid werkpost: "{unit}"

Geef ALLE noodzakelijke basisproducten én hulpmaterialen (bevestiging, voegen, profielen, primer, afdichting, etc.) volgens de regels van de kunst voor een Belgische renovatie.

Antwoord met een JSON-object met exact deze structuur:
{{
  "materials": [
    {{
      "material_name": "naam van het materiaal",
      "quantity_per_unit": getal (verbruik per 1 {unit} werkpost),
      "unit": "eenheid van het materiaal (stuk, zak, kg, liter, m², lm, rol, ...)",
      "status": "verplicht | aanbevolen | optioneel",
      "role": "basis | hulp",
      "reason": "korte reden / regels van de kunst",
      "waste_percent": getal (snijverlies %, 0-15),
      "package_qty": getal of null (verpakkingseenheid, bv. 25 voor een zak van 25kg),
      "round_to_package": true of false (afronden naar volledige verpakking)
    }}
  ]
}}

Belangrijke regels:
- Geef GEEN prijzen.
- quantity_per_unit is het verbruik per 1 {unit} van de werkpost (bv. voor "m²" werkpost: verbruik per m²).
- Wees realistisch met gangbare Belgische bouwwaarden.
- Markeer echt noodzakelijke materialen als "verplicht", nuttige extra's als "aanbevolen", en niet altijd nodige zaken als "optioneel".
- Antwoord ENKEL met de JSON, geen extra tekst."""


def _parse_json(text: str) -> dict:
    """Parse JSON robuust (verwijdert eventuele code fences)."""
    t = text.strip()
    if t.startswith("```"):
        # verwijder ```json ... ```
        t = t.split("```", 2)[1] if "```" in t else t
        if t.lstrip().lower().startswith("json"):
            t = t.lstrip()[4:]
    t = t.strip().strip("`").strip()
    # zoek het eerste { en laatste }
    start = t.find("{")
    end = t.rfind("}")
    if start != -1 and end != -1:
        t = t[start:end + 1]
    return json.loads(t)


async def _generate_profile_for_werkpost(wp: dict) -> list:
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY niet geconfigureerd")
    name = wp.get("name") or wp.get("title") or "werkpost"
    category = wp.get("category") or "Algemeen"
    unit = wp.get("unit") or "m²"
    chat = LlmChat(
        api_key=api_key,
        session_id=f"matprofile-{wp.get('id')}",
        system_message=SYSTEM_MSG,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    try:
        response = await chat.send_message(UserMessage(text=_build_prompt(name, category, unit)))
    except Exception as e:
        msg = str(e)
        if "401" in msg or "auth" in msg.lower():
            raise HTTPException(status_code=401, detail="LLM authenticatie fout — controleer EMERGENT_LLM_KEY.")
        logger.error(f"AI profiel generatie faalde: {e}")
        raise HTTPException(status_code=502, detail="AI-generatie mislukt. Probeer opnieuw.")
    try:
        data = _parse_json(response)
        materials = data.get("materials", [])
    except Exception as e:
        logger.error(f"Kon AI-respons niet parsen: {e} | resp={response[:300]}")
        raise HTTPException(status_code=502, detail="AI gaf een ongeldig antwoord. Probeer opnieuw.")
    return materials


async def _materials_to_profile_and_seed(db, materials: list, category: str) -> list:
    """Zet AI-materialen om naar MaterialConsumption + seed ontbrekende materialen in de bibliotheek."""
    import werkposten as wp_mod
    from materiaal import MateriaalItem

    # Bestaande materiaal-namen
    existing_mat = {}
    async for mat in db.materiaal_items.find({}, {"_id": 0, "id": 1, "name": 1}):
        nm = (mat.get("name") or "").strip().lower()
        if nm:
            existing_mat[nm] = mat["id"]

    profile = []
    for m in materials:
        mname = (m.get("material_name") or "").strip()
        if not mname:
            continue
        munit = m.get("unit") or "stuk"
        key = mname.lower()
        mat_id = existing_mat.get(key)
        if not mat_id:
            mat = MateriaalItem(name=mname, category=category, unit=munit, purchase_price=None)
            await db.materiaal_items.insert_one(mat.model_dump())
            existing_mat[key] = mat.id
            mat_id = mat.id
        try:
            status = m.get("status") if m.get("status") in ("verplicht", "aanbevolen", "optioneel") else "verplicht"
            role = m.get("role") if m.get("role") in ("basis", "hulp") else "basis"
            mc = wp_mod.MaterialConsumption(
                material_id=mat_id,
                material_name=mname,
                quantity_per_unit=float(m.get("quantity_per_unit") or 0),
                unit=munit,
                status=status,
                role=role,
                reason=m.get("reason"),
                waste_percent=float(m.get("waste_percent") or 0),
                package_qty=(float(m["package_qty"]) if m.get("package_qty") not in (None, "", 0) else None),
                round_to_package=bool(m.get("round_to_package")),
            )
            profile.append(mc.model_dump())
        except Exception as e:
            logger.warning(f"Sla materiaalregel over: {e}")
    return profile


@router.post("/{werkpost_id}/ai-material-profile")
async def ai_material_profile(werkpost_id: str, payload: AIProfileRequest = AIProfileRequest()):
    """Genereer (via AI, regels van de kunst) een materiaalprofiel voor een werkpost en sla het op."""
    db = await _get_db()
    wp = await db.work_items.find_one({"id": werkpost_id}, {"_id": 0})
    if not wp:
        raise HTTPException(status_code=404, detail="Werkpost niet gevonden")

    if payload.mode == "fill" and (wp.get("material_profile") or []):
        return {"skipped": True, "reason": "Werkpost heeft al een materiaalprofiel", "material_count": len(wp.get("material_profile") or [])}

    materials = await _generate_profile_for_werkpost(wp)
    if not materials:
        raise HTTPException(status_code=502, detail="AI stelde geen materialen voor.")

    profile = await _materials_to_profile_and_seed(db, materials, wp.get("category") or "Algemeen")
    await db.work_items.update_one(
        {"id": werkpost_id},
        {"$set": {"material_profile": profile, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    updated = await db.work_items.find_one({"id": werkpost_id}, {"_id": 0})
    return {"skipped": False, "material_count": len(profile), "werkpost": updated, "ai_generated": True}

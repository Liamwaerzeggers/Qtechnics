"""
AI-productiviteitsprofielen — Fase 3 van het Max Q Project Intelligence Platform.

Genereert een realistisch productiviteitsprofiel (productie per mandag) voor een werkpost
volgens de regels van de kunst, via de bestaande Emergent LLM integratie (Claude Sonnet 4.5).
Zelfde patroon als ai_profiles.py. Vult enkel aan waar nog geen profiel is (tenzij mode='replace').
Alles blijft nadien handmatig aanpasbaar.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
import os
import json
import logging

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/werkposten", tags=["ai-productivity-profile"])


class AIProductivityRequest(BaseModel):
    mode: str = "fill"  # "fill" = enkel als leeg, "replace" = altijd opnieuw


async def _get_db():
    from server import db
    return db


SYSTEM_MSG = (
    "Je bent een ervaren Belgische werfleider/calculator met diepgaande kennis van renovatiewerken "
    "en realistische ploegproductiviteit volgens de regels van de kunst. Je schat in hoeveel werk een "
    "vakman (1 mandag = 1 ervaren arbeider gedurende 1 werkdag) gemiddeld per dag uitvoert voor een "
    "bepaalde werkpost. Je antwoordt UITSLUITEND met geldige JSON."
)


def _build_prompt(name: str, category: str, unit: str) -> str:
    return f"""Bepaal de realistische productiviteit voor de volgende werkpost.

Werkpost: "{name}"
Categorie/discipline: "{category}"
Eenheid werkpost: "{unit}"

Hoeveel {unit} voert één ervaren vakman gemiddeld uit per mandag (1 volledige werkdag) bij een
typische Belgische renovatie, inclusief normale voorbereiding en opkuis? Wees realistisch en
voorzichtig (eerder conservatief dan optimistisch).

Antwoord met een JSON-object met exact deze structuur:
{{
  "production_per_man_day": getal (productie per mandag, in eenheid {unit}),
  "production_unit": "{unit}",
  "reason": "korte onderbouwing / regels van de kunst"
}}

Belangrijke regels:
- production_per_man_day is een positief getal in de eenheid "{unit}" van de werkpost.
- Wees realistisch met gangbare Belgische productiviteitscijfers.
- Antwoord ENKEL met de JSON, geen extra tekst."""


def _parse_json(text: str) -> dict:
    t = text.strip()
    if t.startswith("```"):
        t = t.split("```", 2)[1] if "```" in t else t
        if t.lstrip().lower().startswith("json"):
            t = t.lstrip()[4:]
    t = t.strip().strip("`").strip()
    start = t.find("{")
    end = t.rfind("}")
    if start != -1 and end != -1:
        t = t[start:end + 1]
    return json.loads(t)


async def _generate_productivity_for_werkpost(wp: dict) -> dict:
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY niet geconfigureerd")
    name = wp.get("name") or wp.get("title") or "werkpost"
    category = wp.get("category") or "Algemeen"
    unit = wp.get("unit") or "m²"
    chat = LlmChat(
        api_key=api_key,
        session_id=f"prodprofile-{wp.get('id')}",
        system_message=SYSTEM_MSG,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    try:
        response = await chat.send_message(UserMessage(text=_build_prompt(name, category, unit)))
    except Exception as e:
        msg = str(e)
        if "401" in msg or "auth" in msg.lower():
            raise HTTPException(status_code=401, detail="LLM authenticatie fout — controleer EMERGENT_LLM_KEY.")
        logger.error(f"AI productiviteit generatie faalde: {e}")
        raise HTTPException(status_code=502, detail="AI-generatie mislukt. Probeer opnieuw.")
    try:
        data = _parse_json(response)
    except Exception as e:
        logger.error(f"Kon AI-respons niet parsen: {e} | resp={response[:300]}")
        raise HTTPException(status_code=502, detail="AI gaf een ongeldig antwoord. Probeer opnieuw.")
    ppd = float(data.get("production_per_man_day") or 0)
    if ppd <= 0:
        raise HTTPException(status_code=502, detail="AI stelde geen geldige productiviteit voor.")
    return {
        "production_per_man_day": round(ppd, 3),
        "production_unit": data.get("production_unit") or unit,
        "reason": data.get("reason"),
    }


@router.post("/{werkpost_id}/ai-productivity-profile")
async def ai_productivity_profile(werkpost_id: str, payload: AIProductivityRequest = AIProductivityRequest()):
    """Genereer (via AI, regels van de kunst) een productiviteitsprofiel voor een werkpost en sla het op."""
    db = await _get_db()
    wp = await db.work_items.find_one({"id": werkpost_id}, {"_id": 0})
    if not wp:
        raise HTTPException(status_code=404, detail="Werkpost niet gevonden")

    prof = wp.get("productivity_profile") or {}
    has_profile = bool(prof) and float(prof.get("production_per_man_day") or 0) > 0
    if payload.mode == "fill" and has_profile:
        return {"skipped": True, "reason": "Werkpost heeft al een productiviteitsprofiel",
                "productivity_profile": prof}

    result = await _generate_productivity_for_werkpost(wp)
    profile = {
        "production_per_man_day": result["production_per_man_day"],
        "production_unit": result["production_unit"],
    }
    await db.work_items.update_one(
        {"id": werkpost_id},
        {"$set": {"productivity_profile": profile, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"skipped": False, "productivity_profile": profile, "reason": result.get("reason"), "ai_generated": True}

"""
AI Quote Agent — Claude Sonnet 4.5 met vision.

Genereert offerte-voorstellen op basis van:
- Grondplan (vision)
- Vrije tekstbeschrijving
- Referentie-foto's (vision)
- Afmetingen-formulier
- Catalogus van materialen + arbeid-items uit de DB

Gebruikt emergentintegrations + EMERGENT_LLM_KEY.
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
from datetime import datetime, timezone
import os
import uuid
import base64
import json
import logging
import asyncio

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-quote-agent", tags=["ai-quote-agent"])


def _normalize_image_to_png_base64(image_base64: str) -> str:
    """Decodeer base64, converteer naar PNG (om mime-type mismatch met Claude te voorkomen)."""
    try:
        from PIL import Image
        import io
        raw = base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(raw))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        # Resize naar max 1600px om payload te beperken
        max_dim = 1600
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        logger.warning(f"Kon image niet normaliseren, gebruik origineel: {e}")
        return image_base64

# ============= MODELS =============

class AIAgentMessage(BaseModel):
    """Een enkel bericht in een agent-sessie."""
    role: str  # "user" | "assistant"
    text: str
    attachments: List[dict] = []  # [{"kind": "image"|"text", "name": "..."}, ...]
    proposal: Optional[dict] = None  # Optioneel: gestructureerd voorstel
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AIAgentSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"AGENT-{str(uuid.uuid4())[:8].upper()}")
    project_id: str
    user_id: str
    title: str = "Nieuwe AI offerte-sessie"
    messages: List[AIAgentMessage] = []
    current_proposal: Optional[dict] = None  # Het laatst voorgestelde regel-pakket
    dimensions: List[dict] = []  # [{"room": "Badkamer", "length": 4, "width": 3, "height": 2.5}, ...]
    status: str = "idle"  # idle | processing | error
    error: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StartSessionRequest(BaseModel):
    project_id: str
    initial_message: Optional[str] = None


class SendMessageRequest(BaseModel):
    session_id: str
    text: str
    image_base64s: List[str] = []  # base64-encoded images (grondplan, foto's)
    dimensions: List[dict] = []  # optionele afmetingen vanuit formulier


class ApplyProposalRequest(BaseModel):
    session_id: str
    items: List[dict]  # de items die in de offerte moeten komen
    quote_id: Optional[str] = None  # als None → nieuwe offerte aanmaken


# ============= SYSTEM PROMPT =============

SYSTEM_PROMPT = """Je bent een ervaren calculator/offerte-specialist voor Q-Technics (renovatie- en interieurprojecten).

Je taak: op basis van wat de gebruiker geeft (grondplan, foto's, beschrijving, afmetingen) genereer je een **gedetailleerd offerte-voorstel** met arbeid en materialen.

# Werkwijze
1. Stel verhelderende vragen als kritische info ontbreekt (welk type vloer? badkamer of toilet? hoogte plafond?)
2. Wanneer je voldoende info hebt, genereer je een gestructureerd voorstel
3. Voor ARBEID: bereken met formules (m² × prijs/m², uren × uurtarief). Gebruik de catalogus zoveel mogelijk.
4. Voor MATERIALEN: stel concrete materialen voor uit de catalogus (of nieuw indien nodig) met hoeveelheid

# JSON output formaat
Wanneer je een voorstel geeft, ZE ALTIJD aan het einde van je antwoord een JSON-blok in dit exacte formaat:

```json
{
  "proposal": {
    "summary": "Korte samenvatting (1-2 zinnen)",
    "items": [
      {
        "description": "Tegelen vloer badkamer",
        "quantity": 12.5,
        "unit": "m²",
        "unit_price": 65.0,
        "item_type": "arbeid",
        "vat_rate": 21,
        "rationale": "12,5m² oppervlakte × €65/m² standaard tegeltarief"
      }
    ],
    "total_excl_vat_estimate": 1234.56,
    "questions": ["Eventuele open vragen aan de klant"]
  }
}
```

Regels voor JSON:
- `item_type`: "arbeid" of "materiaal" of "overig"
- `unit`: "m²", "m", "stuk", "uur", "dag", "forfait", "kg", "liter"
- `vat_rate`: meestal 21 voor renovatie woningen ouder dan 10 jaar geldt 6% — vraag dit als je twijfelt
- `quantity` en `unit_price` zijn getallen, niet strings
- `rationale` is een korte uitleg WHY (voor de calculator om snel te valideren)
- Geef altijd `summary`, `items`, `total_excl_vat_estimate`. `questions` mag leeg zijn.

# Stijl
- Antwoord in het Nederlands
- Wees concreet en zelfverzekerd, maar markeer onzekerheden met "(schatting — graag bevestigen)"
- Stel max 2 verhelderende vragen per beurt — kies de belangrijkste
- Als de gebruiker een grondplan of foto stuurt: beschrijf kort wat je ziet zodat hij weet dat je het correct gelezen hebt
"""

# ============= HELPERS =============

async def _get_db():
    """Lazy import db from server."""
    from server import db
    return db


async def _load_project_context(db, project_id: str) -> str:
    """Bouwt een korte context-string met project info + catalogus excerpt."""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        return ""

    lines = [f"# Project context: {project.get('name', 'onbekend')}"]
    if project.get("status"):
        lines.append(f"Status: {project['status']}")

    # Materialen catalogus (top 30 by usage of just first 30 entries)
    materials = await db.materials.find({}, {"_id": 0, "name": 1, "unit_price": 1, "unit": 1, "category": 1}).limit(40).to_list(40)
    if materials:
        lines.append("\n## Beschikbare materialen (uittreksel uit catalogus)")
        for m in materials[:40]:
            price = m.get("unit_price", 0)
            unit = m.get("unit") or "stuk"
            cat = m.get("category") or ""
            lines.append(f"- {m['name']} ({cat}): €{price:.2f}/{unit}")

    # Arbeid-items catalogus
    work_items = await db.work_items.find({}, {"_id": 0, "title": 1, "price_per_m2": 1, "category": 1}).limit(40).to_list(40)
    if work_items:
        lines.append("\n## Beschikbare arbeid-items (uittreksel)")
        for w in work_items[:40]:
            price = w.get("price_per_m2", 0)
            cat = w.get("category") or ""
            lines.append(f"- {w.get('title','?')} ({cat}): €{price:.2f}/m²")

    return "\n".join(lines)


def _extract_proposal_json(text: str) -> Optional[dict]:
    """Extracteert het laatste ```json {...}``` blok uit de assistent-tekst."""
    if "```json" in text:
        try:
            block = text.split("```json")[-1].split("```")[0].strip()
            parsed = json.loads(block)
            if isinstance(parsed, dict) and "proposal" in parsed:
                return parsed["proposal"]
        except (json.JSONDecodeError, IndexError):
            return None
    return None


def _strip_json_block(text: str) -> str:
    """Verwijdert het JSON-blok uit de tekst voor schone weergave aan de user."""
    if "```json" in text:
        before = text.split("```json")[0].rstrip()
        return before
    return text


async def _send_to_llm(session: dict, user_text: str, image_base64s: List[str], context_str: str) -> str:
    """Stuurt de huidige sessie + nieuw bericht naar Claude Sonnet 4.5.

    Bij transient errors (502 Bad Gateway, timeouts) wordt automatisch tot 3 keer hergeprobeerd
    met exponential backoff (1s, 3s, 7s).
    """
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY niet geconfigureerd")

    system_msg = SYSTEM_PROMPT + "\n\n" + context_str

    # Beperk de history om context-bloat te vermijden bij lange chats — laatste 6 berichten,
    # elk max 400 tekens. De agent heeft sowieso het current_proposal in zijn DB.
    history_blob = ""
    for m in session.get("messages", [])[-6:]:
        role = "Gebruiker" if m["role"] == "user" else "Jij eerder"
        history_blob += f"\n[{role}]: {m['text'][:400]}\n"

    full_text = (
        (f"# Vorige gesprek (recent)\n{history_blob}\n\n" if history_blob else "")
        + f"# Nieuw bericht van gebruiker\n{user_text}"
    )

    file_contents = [ImageContent(image_base64=_normalize_image_to_png_base64(b)) for b in image_base64s if b]
    user_message = UserMessage(
        text=full_text,
        file_contents=file_contents if file_contents else None,
    )

    # Retry-lus voor transient LLM provider errors — slechts 2 pogingen om binnen frontend-timeout te blijven.
    last_error = None
    for attempt in range(2):
        try:
            chat = LlmChat(
                api_key=api_key,
                session_id=session["id"] + f"-att{attempt}",
                system_message=system_msg,
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            response = await chat.send_message(user_message)
            return response.strip()
        except Exception as e:
            err_str = str(e)
            last_error = e
            # Niet-retry-baar: budget overschreden / auth fout
            if "budget" in err_str.lower() or "Budget has been exceeded" in err_str:
                raise HTTPException(
                    status_code=402,
                    detail="Emergent LLM key budget overschreden. Voeg balance toe via Profile → Universal Key → Add Balance (of activeer Auto top-up).",
                )
            if "401" in err_str or "authentication" in err_str.lower():
                raise HTTPException(status_code=401, detail="LLM authenticatie fout — controleer EMERGENT_LLM_KEY.")
            is_transient = any(code in err_str for code in ["502", "503", "504", "429", "BadGateway", "ServiceUnavailable", "Overloaded", "TimeoutError", "timed out"])
            if attempt < 1 and is_transient:
                logger.warning(f"AI agent transient error (attempt {attempt+1}): {err_str[:200]} — retry in 3s")
                await asyncio.sleep(3)
                continue
            # Niet-transient of laatste poging: stop
            break
            # Niet-transient of laatste poging: stop
            break

    raise last_error if last_error else RuntimeError("AI call failed without exception")


# ============= ENDPOINTS =============

@router.post("/start-session")
async def start_session(req: StartSessionRequest):
    """Start een nieuwe AI offerte-sessie voor een project."""
    db = await _get_db()
    project = await db.projects.find_one({"id": req.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")

    session = AIAgentSession(
        project_id=req.project_id,
        user_id="anon",  # auth komt via header — laten we admin role aannemen voor nu
        title=f"AI offerte — {project.get('name', 'project')}",
    )
    session_doc = session.model_dump()
    await db.ai_agent_sessions.insert_one(session_doc)

    return {"session_id": session.id, "title": session.title}


@router.get("/sessions/{project_id}")
async def list_sessions(project_id: str):
    """Lijst alle agent-sessies voor een project."""
    db = await _get_db()
    sessions = await db.ai_agent_sessions.find(
        {"project_id": project_id},
        {"_id": 0, "id": 1, "title": 1, "created_at": 1, "updated_at": 1, "current_proposal": 1}
    ).sort("updated_at", -1).to_list(50)
    return sessions


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Haal de volledige sessie met alle berichten op."""
    db = await _get_db()
    session = await db.ai_agent_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Sessie niet gevonden")
    return session


@router.post("/message")
async def send_message(req: SendMessageRequest):
    """Stuur een bericht in een sessie. Start een background task voor de LLM call.

    Returnt onmiddellijk met de geüpdatete sessie (status='processing'). Frontend polled
    `/session/{id}` totdat het assistant-bericht verschijnt en status='idle' is.
    """
    db = await _get_db()
    session = await db.ai_agent_sessions.find_one({"id": req.session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Sessie niet gevonden")

    # Auto-recovery: indien een vorige run >3 min in 'processing' staat is hij vermoedelijk gecrasht
    if session.get("status") == "processing":
        try:
            updated = datetime.fromisoformat(session.get("updated_at", "").replace("Z", "+00:00"))
            age_seconds = (datetime.now(timezone.utc) - updated).total_seconds()
        except Exception:
            age_seconds = 9999
        if age_seconds < 180:
            raise HTTPException(status_code=409, detail="Agent is nog bezig met vorige bericht — wacht tot het antwoord verschijnt.")
        # Anders: behandel als stuck en reset
        logger.warning(f"Session {req.session_id} stuck in processing for {age_seconds:.0f}s — auto-reset")
        session["status"] = "idle"

    # Sla user-bericht op + zet status op processing
    user_msg = AIAgentMessage(
        role="user",
        text=req.text,
        attachments=[{"kind": "image", "name": f"foto-{i+1}"} for i in range(len(req.image_base64s))],
    ).model_dump()
    session["messages"].append(user_msg)
    if req.dimensions:
        session["dimensions"] = req.dimensions
    session["status"] = "processing"
    session["error"] = None
    session["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.ai_agent_sessions.update_one(
        {"id": req.session_id},
        {"$set": {
            "messages": session["messages"],
            "dimensions": session.get("dimensions", []),
            "status": "processing",
            "error": None,
            "updated_at": session["updated_at"],
        }},
    )

    # Background task: voert LLM call uit en update de sessie
    asyncio.create_task(_process_message_background(
        session_id=req.session_id,
        session_snapshot=session,
        user_text=req.text,
        image_base64s=req.image_base64s,
    ))

    return {"status": "processing", "session_id": req.session_id}


async def _process_message_background(session_id: str, session_snapshot: dict, user_text: str, image_base64s: List[str]):
    """Achtergrondtaak: roept Claude aan en schrijft het antwoord terug naar de DB."""
    db = await _get_db()
    try:
        context_str = await _load_project_context(db, session_snapshot["project_id"])
        if session_snapshot.get("dimensions"):
            dims_block = "\n## Afmetingen (door gebruiker ingevuld)\n"
            for d in session_snapshot["dimensions"]:
                dims_block += f"- {d.get('room','?')}: {d.get('length',0)}m × {d.get('width',0)}m × {d.get('height',2.7)}m\n"
            context_str += "\n" + dims_block

        assistant_text = await _send_to_llm(session_snapshot, user_text, image_base64s, context_str)

        proposal = _extract_proposal_json(assistant_text)
        display_text = _strip_json_block(assistant_text)
        assistant_msg = AIAgentMessage(
            role="assistant",
            text=display_text,
            proposal=proposal,
        ).model_dump()

        update = {
            "status": "idle",
            "error": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        push = {"messages": assistant_msg}
        if proposal:
            update["current_proposal"] = proposal
        await db.ai_agent_sessions.update_one(
            {"id": session_id},
            {"$set": update, "$push": push},
        )
    except HTTPException as he:
        await db.ai_agent_sessions.update_one(
            {"id": session_id},
            {"$set": {"status": "error", "error": he.detail, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
    except Exception as e:
        logger.exception(f"AI agent background task failed: {e}")
        await db.ai_agent_sessions.update_one(
            {"id": session_id},
            {"$set": {"status": "error", "error": str(e)[:300], "updated_at": datetime.now(timezone.utc).isoformat()}},
        )


@router.post("/apply")
async def apply_proposal(req: ApplyProposalRequest):
    """Past het voorstel toe — maakt een nieuwe offerte met de gekozen line items."""
    db = await _get_db()
    session = await db.ai_agent_sessions.find_one({"id": req.session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Sessie niet gevonden")

    project_id = session["project_id"]
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    lead_id = project.get("lead_id")
    if not lead_id:
        raise HTTPException(status_code=400, detail="Project heeft geen gekoppelde klant (lead)")

    # Maak nieuwe quote OF gebruik bestaande
    if req.quote_id:
        quote = await db.quotes.find_one({"id": req.quote_id}, {"_id": 0})
        if not quote:
            raise HTTPException(status_code=404, detail="Offerte niet gevonden")
        quote_id = req.quote_id
    else:
        quote_id = f"OFF-{datetime.now(timezone.utc).year}-{str(uuid.uuid4())[:6].upper()}"
        new_quote = {
            "id": quote_id,
            "lead_id": lead_id,
            "project_id": project_id,
            "quote_number": quote_id,
            "date": datetime.now(timezone.utc).isoformat(),
            "status": "concept",
            "line_items": [],
            "subtotal_labor": 0,
            "subtotal_material": 0,
            "total_excl_vat": 0,
            "vat_breakdown": {},
            "total_vat": 0,
            "total_incl_vat": 0,
            "total_price": 0,
            "visible_to_customer": False,
            "labor_section_title": "ARBEID",
            "material_section_title": "MATERIALEN",
            "title": session.get("title", "AI offerte"),
            "description": (session.get("current_proposal") or {}).get("summary", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "user_id": "ADMIN-LIAM",
        }
        await db.quotes.insert_one(new_quote)

    # Voeg line items toe
    items_to_insert = []
    for it in req.items:
        qty = float(it.get("quantity", 0) or 0)
        unit_price = float(it.get("unit_price", 0) or 0)
        vat_rate = float(it.get("vat_rate", 21) or 21)
        discount = float(it.get("discount_percent", 0) or 0)
        discount_factor = max(0.0, min(100.0, discount)) / 100.0
        total_excl = qty * unit_price * (1 - discount_factor)
        vat_amount = total_excl * (vat_rate / 100)
        total_incl = total_excl + vat_amount

        items_to_insert.append({
            "id": str(uuid.uuid4()),
            "quote_id": quote_id,
            "description": it.get("description", "(geen omschrijving)"),
            "quantity": qty,
            "unit_price": unit_price,
            "unit": it.get("unit") or "stuk",
            "item_type": it.get("item_type") or "materiaal",
            "vat_rate": vat_rate,
            "discount_percent": discount,
            "total_excl_vat": total_excl,
            "vat_amount": vat_amount,
            "total_incl_vat": total_incl,
            "total": total_excl,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    if items_to_insert:
        await db.line_items.insert_many(items_to_insert)

    # Recompute quote totals via server.py helper
    from server import recalculate_quote_totals
    await recalculate_quote_totals(quote_id)

    return {
        "quote_id": quote_id,
        "items_added": len(items_to_insert),
        "is_new_quote": req.quote_id is None,
    }


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    db = await _get_db()
    result = await db.ai_agent_sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sessie niet gevonden")
    return {"deleted": True}


@router.post("/session/{session_id}/reset-status")
async def reset_session_status(session_id: str):
    """Reset een sessie die vast zit in 'processing' status terug naar 'idle'.

    Bedoeld voor wanneer een background task crashte (bv. server-restart) en de sessie
    daardoor geblokkeerd is.
    """
    db = await _get_db()
    result = await db.ai_agent_sessions.update_one(
        {"id": session_id},
        {"$set": {"status": "idle", "error": "Handmatig gereset", "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sessie niet gevonden")
    return {"reset": True}

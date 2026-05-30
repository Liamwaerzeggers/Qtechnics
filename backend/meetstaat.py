"""
Meetstaat Module — Fase 1 van het Project Intelligence Platform.

Centrale bron van waarheid voor afmetingen, ramen, deuren en oppervlaktes per project.
Alle berekeningen zijn deterministisch en in zowel backend als frontend reproduceerbaar.
Manuele overrides worden altijd ondersteund (override_* velden).

Endpoints:
- GET    /projects/{project_id}/meetstaat                — overzicht (rooms + totals)
- POST   /projects/{project_id}/meetstaat/rooms          — nieuwe ruimte
- PUT    /meetstaat/rooms/{room_id}                      — update ruimte
- DELETE /meetstaat/rooms/{room_id}                      — verwijder ruimte
- POST   /meetstaat/rooms/{room_id}/windows              — voeg raam toe
- PUT    /meetstaat/windows/{window_id}                  — update raam
- DELETE /meetstaat/windows/{window_id}                  — verwijder raam
- POST   /meetstaat/rooms/{room_id}/doors                — voeg deur toe
- PUT    /meetstaat/doors/{door_id}                      — update deur
- DELETE /meetstaat/doors/{door_id}                      — verwijder deur
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["meetstaat"])

# Default prijs voor dagkant afwerking — manueel overschrijfbaar per project of per regel
DEFAULT_DAGKANT_PRICE_PER_LM = 35.0

# ============= MODELS =============

class Window(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    label: Optional[str] = None  # bv. "Raam 1 - tuinzijde"
    width: float = 0.0  # m
    height: float = 0.0  # m
    dagkant_depth: float = 0.0  # m (diepte van het dagkant)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Door(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    label: Optional[str] = None
    width: float = 0.0
    height: float = 0.0
    dagkant_depth: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Room(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"ROOM-{str(uuid.uuid4())[:8].upper()}")
    project_id: str
    name: str  # bv. "Badkamer", "Living"
    length: float = 0.0  # m
    width: float = 0.0  # m
    height: float = 2.7  # m (default plafondhoogte)
    # Manuele overrides — als gezet hebben ze voorrang op berekende waardes
    override_floor_area: Optional[float] = None
    override_wall_area: Optional[float] = None
    override_ceiling_area: Optional[float] = None
    notes: Optional[str] = None
    # Per-room dagkant prijs (€/lm) — None = projectdefault gebruiken
    dagkant_price_per_lm: Optional[float] = None
    sort_order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class RoomCreate(BaseModel):
    name: str
    length: float = 0.0
    width: float = 0.0
    height: float = 2.7
    notes: Optional[str] = None


class RoomUpdate(BaseModel):
    name: Optional[str] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    override_floor_area: Optional[float] = None
    override_wall_area: Optional[float] = None
    override_ceiling_area: Optional[float] = None
    notes: Optional[str] = None
    dagkant_price_per_lm: Optional[float] = None
    sort_order: Optional[int] = None


class WindowCreate(BaseModel):
    label: Optional[str] = None
    width: float = 0.0
    height: float = 0.0
    dagkant_depth: float = 0.0


class WindowUpdate(BaseModel):
    label: Optional[str] = None
    width: Optional[float] = None
    height: Optional[float] = None
    dagkant_depth: Optional[float] = None


class DoorCreate(BaseModel):
    label: Optional[str] = None
    width: float = 0.0
    height: float = 0.0
    dagkant_depth: float = 0.0


class DoorUpdate(BaseModel):
    label: Optional[str] = None
    width: Optional[float] = None
    height: Optional[float] = None
    dagkant_depth: Optional[float] = None


# ============= BEREKENINGEN =============

def compute_room_metrics(room: dict, windows: List[dict], doors: List[dict]) -> dict:
    """Bereken alle afgeleide oppervlaktes en lopende meters voor een ruimte.

    Geeft een dict terug die als 'computed' veld bij de room gevoegd kan worden.
    """
    L = float(room.get("length") or 0)
    W = float(room.get("width") or 0)
    H = float(room.get("height") or 0)

    floor_area_raw = L * W
    ceiling_area_raw = floor_area_raw
    perimeter = 2 * (L + W)
    wall_area_raw = perimeter * H
    volume = floor_area_raw * H

    # Oppervlaktes van openingen
    window_area_total = sum(float(w.get("width") or 0) * float(w.get("height") or 0) for w in windows)
    door_area_total = sum(float(d.get("width") or 0) * float(d.get("height") or 0) for d in doors)

    # Netto muuroppervlak (na aftrek ramen + deuren) — voor pleister/gyproc/schilder
    wall_area_net = max(0.0, wall_area_raw - window_area_total - door_area_total)

    # Dagkanten in lopende meter
    # Raam: (2 × breedte) + (2 × hoogte) — volledige perimeter
    window_dagkanten_lm = sum(2 * float(w.get("width") or 0) + 2 * float(w.get("height") or 0) for w in windows)
    # Deur: (2 × breedte) + hoogte — perimeter min vloer (deur staat op vloer)
    door_dagkanten_lm = sum(2 * float(d.get("width") or 0) + float(d.get("height") or 0) for d in doors)
    dagkanten_total_lm = window_dagkanten_lm + door_dagkanten_lm

    # Toepassing van manuele overrides
    floor_area = float(room["override_floor_area"]) if room.get("override_floor_area") is not None else floor_area_raw
    ceiling_area = float(room["override_ceiling_area"]) if room.get("override_ceiling_area") is not None else ceiling_area_raw
    wall_area = float(room["override_wall_area"]) if room.get("override_wall_area") is not None else wall_area_net

    return {
        "floor_area_raw": round(floor_area_raw, 3),
        "ceiling_area_raw": round(ceiling_area_raw, 3),
        "wall_area_raw_bruto": round(wall_area_raw, 3),
        "perimeter": round(perimeter, 3),
        "volume": round(volume, 3),
        "window_area_total": round(window_area_total, 3),
        "door_area_total": round(door_area_total, 3),
        "wall_area_net": round(wall_area_net, 3),
        "window_dagkanten_lm": round(window_dagkanten_lm, 3),
        "door_dagkanten_lm": round(door_dagkanten_lm, 3),
        "dagkanten_total_lm": round(dagkanten_total_lm, 3),
        # Effectieve waardes (na overrides) — deze gebruikt de offerte-koppeling
        "floor_area": round(floor_area, 3),
        "ceiling_area": round(ceiling_area, 3),
        "wall_area": round(wall_area, 3),
    }


# ============= HELPERS =============

async def _get_db():
    from server import db
    return db


async def _ensure_project_exists(db, project_id: str):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0, "id": 1})
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")


async def _get_room_or_404(db, room_id: str) -> dict:
    room = await db.meetstaat_rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Ruimte niet gevonden")
    return room


# ============= ENDPOINTS =============

@router.get("/projects/{project_id}/meetstaat")
async def get_meetstaat(project_id: str):
    """Volledige meetstaat van een project: alle ruimtes (met computed metrics), windows, doors en totalen."""
    db = await _get_db()
    await _ensure_project_exists(db, project_id)

    rooms = await db.meetstaat_rooms.find({"project_id": project_id}, {"_id": 0}).sort("sort_order", 1).to_list(500)
    room_ids = [r["id"] for r in rooms]

    windows = await db.meetstaat_windows.find({"room_id": {"$in": room_ids}}, {"_id": 0}).to_list(2000)
    doors = await db.meetstaat_doors.find({"room_id": {"$in": room_ids}}, {"_id": 0}).to_list(2000)

    windows_by_room = {}
    doors_by_room = {}
    for w in windows:
        windows_by_room.setdefault(w["room_id"], []).append(w)
    for d in doors:
        doors_by_room.setdefault(d["room_id"], []).append(d)

    enriched_rooms = []
    project_totals = {
        "floor_area": 0.0,
        "ceiling_area": 0.0,
        "wall_area_net": 0.0,
        "volume": 0.0,
        "window_count": 0,
        "door_count": 0,
        "dagkanten_total_lm": 0.0,
        "dagkanten_cost_estimate": 0.0,
    }

    for room in rooms:
        r_windows = windows_by_room.get(room["id"], [])
        r_doors = doors_by_room.get(room["id"], [])
        computed = compute_room_metrics(room, r_windows, r_doors)
        enriched_rooms.append({
            **room,
            "windows": r_windows,
            "doors": r_doors,
            "computed": computed,
        })
        project_totals["floor_area"] += computed["floor_area"]
        project_totals["ceiling_area"] += computed["ceiling_area"]
        project_totals["wall_area_net"] += computed["wall_area"]
        project_totals["volume"] += computed["volume"]
        project_totals["window_count"] += len(r_windows)
        project_totals["door_count"] += len(r_doors)
        project_totals["dagkanten_total_lm"] += computed["dagkanten_total_lm"]
        price_lm = room.get("dagkant_price_per_lm")
        if price_lm is None:
            price_lm = DEFAULT_DAGKANT_PRICE_PER_LM
        project_totals["dagkanten_cost_estimate"] += computed["dagkanten_total_lm"] * float(price_lm)

    # Round totals
    for k in ("floor_area", "ceiling_area", "wall_area_net", "volume", "dagkanten_total_lm", "dagkanten_cost_estimate"):
        project_totals[k] = round(project_totals[k], 3)

    return {
        "project_id": project_id,
        "rooms": enriched_rooms,
        "totals": project_totals,
        "default_dagkant_price_per_lm": DEFAULT_DAGKANT_PRICE_PER_LM,
    }


@router.post("/projects/{project_id}/meetstaat/rooms")
async def create_room(project_id: str, payload: RoomCreate):
    db = await _get_db()
    await _ensure_project_exists(db, project_id)
    # sort_order = aantal bestaande rooms
    count = await db.meetstaat_rooms.count_documents({"project_id": project_id})
    room_obj = Room(project_id=project_id, sort_order=count, **payload.model_dump())
    await db.meetstaat_rooms.insert_one(room_obj.model_dump())
    return room_obj.model_dump()


@router.put("/meetstaat/rooms/{room_id}")
async def update_room(room_id: str, payload: RoomUpdate):
    db = await _get_db()
    await _get_room_or_404(db, room_id)
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None or k in ("override_floor_area", "override_wall_area", "override_ceiling_area", "dagkant_price_per_lm", "notes")}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen velden om aan te passen")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.meetstaat_rooms.update_one({"id": room_id}, {"$set": update_data})
    room = await db.meetstaat_rooms.find_one({"id": room_id}, {"_id": 0})
    return room


@router.delete("/meetstaat/rooms/{room_id}")
async def delete_room(room_id: str):
    db = await _get_db()
    await _get_room_or_404(db, room_id)
    # Verwijder ook alle ramen + deuren van die ruimte
    await db.meetstaat_windows.delete_many({"room_id": room_id})
    await db.meetstaat_doors.delete_many({"room_id": room_id})
    await db.meetstaat_rooms.delete_one({"id": room_id})
    return {"deleted": True}


# --- Windows ---

@router.post("/meetstaat/rooms/{room_id}/windows")
async def add_window(room_id: str, payload: WindowCreate):
    db = await _get_db()
    await _get_room_or_404(db, room_id)
    window_obj = Window(room_id=room_id, **payload.model_dump())
    await db.meetstaat_windows.insert_one(window_obj.model_dump())
    return window_obj.model_dump()


@router.put("/meetstaat/windows/{window_id}")
async def update_window(window_id: str, payload: WindowUpdate):
    db = await _get_db()
    existing = await db.meetstaat_windows.find_one({"id": window_id}, {"_id": 0, "id": 1})
    if not existing:
        raise HTTPException(status_code=404, detail="Raam niet gevonden")
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None or k == "label"}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen velden om aan te passen")
    await db.meetstaat_windows.update_one({"id": window_id}, {"$set": update_data})
    window = await db.meetstaat_windows.find_one({"id": window_id}, {"_id": 0})
    return window


@router.delete("/meetstaat/windows/{window_id}")
async def delete_window(window_id: str):
    db = await _get_db()
    result = await db.meetstaat_windows.delete_one({"id": window_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Raam niet gevonden")
    return {"deleted": True}


# --- Doors ---

@router.post("/meetstaat/rooms/{room_id}/doors")
async def add_door(room_id: str, payload: DoorCreate):
    db = await _get_db()
    await _get_room_or_404(db, room_id)
    door_obj = Door(room_id=room_id, **payload.model_dump())
    await db.meetstaat_doors.insert_one(door_obj.model_dump())
    return door_obj.model_dump()


@router.put("/meetstaat/doors/{door_id}")
async def update_door(door_id: str, payload: DoorUpdate):
    db = await _get_db()
    existing = await db.meetstaat_doors.find_one({"id": door_id}, {"_id": 0, "id": 1})
    if not existing:
        raise HTTPException(status_code=404, detail="Deur niet gevonden")
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None or k == "label"}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen velden om aan te passen")
    await db.meetstaat_doors.update_one({"id": door_id}, {"$set": update_data})
    door = await db.meetstaat_doors.find_one({"id": door_id}, {"_id": 0})
    return door


@router.delete("/meetstaat/doors/{door_id}")
async def delete_door(door_id: str):
    db = await _get_db()
    result = await db.meetstaat_doors.delete_one({"id": door_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deur niet gevonden")
    return {"deleted": True}

from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Response, Cookie, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import pandas as pd
import io
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from openpyxl import Workbook
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

# Auth Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    id: str = Field(alias="_id")
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionRequest(BaseModel):
    session_id: str

class SessionResponse(BaseModel):
    user: User
    session_token: str

# Lead Models
class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"LEAD-{str(uuid.uuid4())[:8].upper()}")
    name: str
    email: str
    phone: str
    address: str
    project_type: str
    description: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str

class LeadCreate(BaseModel):
    name: str
    email: str
    phone: str
    address: str
    project_type: str
    description: str

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    project_type: Optional[str] = None
    description: Optional[str] = None

# Quote Models
class Quote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"OFF-{datetime.now(timezone.utc).year}-{str(uuid.uuid4())[:6].upper()}")
    lead_id: str
    quote_number: str = ""
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "concept"
    subtotal_labor: float = 0.0
    subtotal_material: float = 0.0
    total_excl_vat: float = 0.0
    vat_breakdown: dict = {}  # {"21": 100.50, "6": 25.30}
    total_vat: float = 0.0
    total_incl_vat: float = 0.0
    total_price: float = 0.0  # Backwards compatibility
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str

class QuoteCreate(BaseModel):
    lead_id: str

class QuoteUpdate(BaseModel):
    status: Optional[str] = None

# Line Item Models
class LineItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quote_id: str
    description: str
    quantity: float
    unit_price: float
    item_type: str  # "arbeid", "materiaal", "overig"
    vat_rate: float = 21.0  # BTW percentage (0, 6, 9, 21)
    total_excl_vat: float = 0.0
    vat_amount: float = 0.0
    total_incl_vat: float = 0.0
    total: float = 0.0  # For backwards compatibility
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LineItemCreate(BaseModel):
    description: str
    quantity: float
    unit_price: float
    item_type: str
    vat_rate: float = 21.0

class LineItemUpdate(BaseModel):
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    item_type: Optional[str] = None
    vat_rate: Optional[float] = None

# Material Models
class Material(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    price: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str

# Project Models
class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"PROJ-{str(uuid.uuid4())[:8].upper()}")
    quote_id: str
    name: str
    status: str = "gepland"  # gepland, in uitvoering, voltooid
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None
    # Cost tracking
    labor_cost_per_hour: float = 0.0
    labor_hours: float = 0.0
    material_costs: float = 0.0
    material_costs_incl_vat: float = 0.0
    other_costs: float = 0.0
    invoice_uploads: List[dict] = []  # [{filename, total_excl_vat, total_incl_vat, vat_amount, upload_date}]
    total_costs: float = 0.0
    total_costs_incl_vat: float = 0.0
    profit: float = 0.0
    profit_margin: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str

class ProjectCreate(BaseModel):
    quote_id: str
    name: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None
    labor_cost_per_hour: Optional[float] = None
    labor_hours: Optional[float] = None
    material_costs: Optional[float] = None
    material_costs_incl_vat: Optional[float] = None
    other_costs: Optional[float] = None

class InvoiceUpload(BaseModel):
    filename: str
    total_excl_vat: float
    total_incl_vat: float
    vat_amount: float
    notes: Optional[str] = None

# Calendar Models
class CalendarEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    title: str
    start_date: datetime
    end_date: datetime
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str

# Werkbon (Daily Report) Models
class DailyReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    date: datetime
    photos: List[str] = []  # URLs or base64
    notes_nl: str = ""
    notes_uk: str = ""  # Ukrainian
    office_feedback_nl: str = ""
    office_feedback_uk: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str

class DailyReportCreate(BaseModel):
    project_id: str
    date: datetime
    notes_nl: Optional[str] = ""
    notes_uk: Optional[str] = ""

class DailyReportUpdate(BaseModel):
    notes_nl: Optional[str] = None
    notes_uk: Optional[str] = None
    office_feedback_nl: Optional[str] = None
    office_feedback_uk: Optional[str] = None
    photos: Optional[List[str]] = None

# ============= AUTH DEPENDENCIES =============

async def get_current_user(session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)) -> User:
    """Get current user from session token (cookie or header)"""
    token = session_token
    
    if not token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session = await db.user_sessions.find_one({"session_token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry - handle both string and datetime
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    
    # Ensure expires_at is timezone-aware
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": token})
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Find user
    user_doc = await db.users.find_one({"_id": session["user_id"]})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user_doc)

# ============= AUTH ROUTES =============

@api_router.post("/auth/session", response_model=SessionResponse)
async def create_session(request: SessionRequest, response: Response):
    """Process session_id from Emergent Auth and create user session"""
    
    # Call Emergent Auth API to get user data
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id}
            )
            auth_response.raise_for_status()
            user_data = auth_response.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to validate session: {str(e)}")
    
    # Check if user exists
    existing_user = await db.users.find_one({"_id": user_data["email"]})
    
    if not existing_user:
        # Create new user
        user_doc = {
            "_id": user_data["email"],
            "email": user_data["email"],
            "name": user_data.get("name", ""),
            "picture": user_data.get("picture", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        user = User(**user_doc)
    else:
        user = User(**existing_user)
    
    # Create session
    session_token = user_data.get("session_token") or str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "user_id": user.id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    return SessionResponse(user=user, session_token=session_token)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return current_user

@api_router.post("/auth/logout")
async def logout(response: Response, current_user: User = Depends(get_current_user), session_token: Optional[str] = Cookie(None)):
    """Logout user and delete session"""
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ============= LEAD ROUTES =============

@api_router.post("/leads", response_model=Lead)
async def create_lead(lead: LeadCreate, current_user: User = Depends(get_current_user)):
    """Create a new lead"""
    lead_obj = Lead(**lead.model_dump(), user_id=current_user.id)
    lead_doc = lead_obj.model_dump()
    lead_doc["created_at"] = lead_doc["created_at"].isoformat()
    
    await db.leads.insert_one(lead_doc)
    return lead_obj

@api_router.get("/leads", response_model=List[Lead])
async def get_leads(current_user: User = Depends(get_current_user)):
    """Get all leads for current user"""
    leads = await db.leads.find({"user_id": current_user.id}).to_list(1000)
    
    for lead in leads:
        if isinstance(lead["created_at"], str):
            lead["created_at"] = datetime.fromisoformat(lead["created_at"])
    
    return leads

@api_router.get("/leads/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific lead"""
    lead = await db.leads.find_one({"id": lead_id, "user_id": current_user.id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if isinstance(lead["created_at"], str):
        lead["created_at"] = datetime.fromisoformat(lead["created_at"])
    
    return Lead(**lead)

@api_router.put("/leads/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, lead_update: LeadUpdate, current_user: User = Depends(get_current_user)):
    """Update a lead"""
    existing_lead = await db.leads.find_one({"id": lead_id, "user_id": current_user.id})
    if not existing_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = {k: v for k, v in lead_update.model_dump().items() if v is not None}
    
    if update_data:
        await db.leads.update_one({"id": lead_id}, {"$set": update_data})
        existing_lead.update(update_data)
    
    if isinstance(existing_lead["created_at"], str):
        existing_lead["created_at"] = datetime.fromisoformat(existing_lead["created_at"])
    
    return Lead(**existing_lead)

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: User = Depends(get_current_user)):
    """Delete a lead"""
    result = await db.leads.delete_one({"id": lead_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"message": "Lead deleted successfully"}

# ============= QUOTE ROUTES =============

@api_router.post("/quotes", response_model=Quote)
async def create_quote(quote_create: QuoteCreate, current_user: User = Depends(get_current_user)):
    """Create a new quote from a lead"""
    # Verify lead exists
    lead = await db.leads.find_one({"id": quote_create.lead_id, "user_id": current_user.id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    quote_obj = Quote(**quote_create.model_dump(), user_id=current_user.id)
    quote_obj.quote_number = quote_obj.id
    
    quote_doc = quote_obj.model_dump()
    quote_doc["date"] = quote_doc["date"].isoformat()
    quote_doc["created_at"] = quote_doc["created_at"].isoformat()
    
    await db.quotes.insert_one(quote_doc)
    return quote_obj

@api_router.get("/quotes", response_model=List[Quote])
async def get_quotes(current_user: User = Depends(get_current_user)):
    """Get all quotes for current user"""
    quotes = await db.quotes.find({"user_id": current_user.id}).to_list(1000)
    
    for quote in quotes:
        if isinstance(quote["date"], str):
            quote["date"] = datetime.fromisoformat(quote["date"])
        if isinstance(quote["created_at"], str):
            quote["created_at"] = datetime.fromisoformat(quote["created_at"])
    
    return quotes

@api_router.get("/quotes/{quote_id}", response_model=Quote)
async def get_quote(quote_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific quote"""
    quote = await db.quotes.find_one({"id": quote_id, "user_id": current_user.id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if isinstance(quote["date"], str):
        quote["date"] = datetime.fromisoformat(quote["date"])
    if isinstance(quote["created_at"], str):
        quote["created_at"] = datetime.fromisoformat(quote["created_at"])
    
    return Quote(**quote)

@api_router.put("/quotes/{quote_id}", response_model=Quote)
async def update_quote(quote_id: str, quote_update: QuoteUpdate, current_user: User = Depends(get_current_user)):
    """Update a quote"""
    existing_quote = await db.quotes.find_one({"id": quote_id, "user_id": current_user.id})
    if not existing_quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    update_data = {k: v for k, v in quote_update.model_dump().items() if v is not None}
    
    if update_data:
        await db.quotes.update_one({"id": quote_id}, {"$set": update_data})
        existing_quote.update(update_data)
    
    if isinstance(existing_quote["date"], str):
        existing_quote["date"] = datetime.fromisoformat(existing_quote["date"])
    if isinstance(existing_quote["created_at"], str):
        existing_quote["created_at"] = datetime.fromisoformat(existing_quote["created_at"])
    
    return Quote(**existing_quote)

@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, current_user: User = Depends(get_current_user)):
    """Delete a quote"""
    result = await db.quotes.delete_one({"id": quote_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Also delete associated line items
    await db.line_items.delete_many({"quote_id": quote_id})
    
    return {"message": "Quote deleted successfully"}

# ============= LINE ITEM ROUTES =============

@api_router.post("/quotes/{quote_id}/items", response_model=LineItem)
async def add_line_item(quote_id: str, item: LineItemCreate, current_user: User = Depends(get_current_user)):
    """Add a line item to a quote"""
    # Verify quote exists
    quote = await db.quotes.find_one({"id": quote_id, "user_id": current_user.id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Create line item with VAT calculations
    item_obj = LineItem(**item.model_dump(), quote_id=quote_id)
    item_obj.total_excl_vat = item_obj.quantity * item_obj.unit_price
    item_obj.vat_amount = item_obj.total_excl_vat * (item_obj.vat_rate / 100)
    item_obj.total_incl_vat = item_obj.total_excl_vat + item_obj.vat_amount
    item_obj.total = item_obj.total_incl_vat  # Backwards compatibility
    
    item_doc = item_obj.model_dump()
    item_doc["created_at"] = item_doc["created_at"].isoformat()
    
    await db.line_items.insert_one(item_doc)
    
    # Recalculate quote totals
    await recalculate_quote_totals(quote_id)
    
    return item_obj

@api_router.get("/quotes/{quote_id}/items", response_model=List[LineItem])
async def get_line_items(quote_id: str, current_user: User = Depends(get_current_user)):
    """Get all line items for a quote"""
    # Verify quote exists
    quote = await db.quotes.find_one({"id": quote_id, "user_id": current_user.id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    items = await db.line_items.find({"quote_id": quote_id}).to_list(1000)
    
    for item in items:
        if isinstance(item["created_at"], str):
            item["created_at"] = datetime.fromisoformat(item["created_at"])
    
    return items

@api_router.put("/quotes/{quote_id}/items/{item_id}", response_model=LineItem)
async def update_line_item(quote_id: str, item_id: str, item_update: LineItemUpdate, current_user: User = Depends(get_current_user)):
    """Update a line item"""
    # Verify quote exists
    quote = await db.quotes.find_one({"id": quote_id, "user_id": current_user.id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    existing_item = await db.line_items.find_one({"id": item_id, "quote_id": quote_id})
    if not existing_item:
        raise HTTPException(status_code=404, detail="Line item not found")
    
    update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
    
    if update_data:
        # Recalculate total if quantity or price changed
        if "quantity" in update_data or "unit_price" in update_data:
            quantity = update_data.get("quantity", existing_item["quantity"])
            unit_price = update_data.get("unit_price", existing_item["unit_price"])
            update_data["total"] = quantity * unit_price
        
        await db.line_items.update_one({"id": item_id}, {"$set": update_data})
        existing_item.update(update_data)
        
        # Recalculate quote totals
        await recalculate_quote_totals(quote_id)
    
    if isinstance(existing_item["created_at"], str):
        existing_item["created_at"] = datetime.fromisoformat(existing_item["created_at"])
    
    return LineItem(**existing_item)

@api_router.delete("/quotes/{quote_id}/items/{item_id}")
async def delete_line_item(quote_id: str, item_id: str, current_user: User = Depends(get_current_user)):
    """Delete a line item"""
    # Verify quote exists
    quote = await db.quotes.find_one({"id": quote_id, "user_id": current_user.id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    result = await db.line_items.delete_one({"id": item_id, "quote_id": quote_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Line item not found")
    
    # Recalculate quote totals
    await recalculate_quote_totals(quote_id)
    
    return {"message": "Line item deleted successfully"}

async def recalculate_quote_totals(quote_id: str):
    """Recalculate quote subtotals, VAT breakdown and total price"""
    items = await db.line_items.find({"quote_id": quote_id}).to_list(1000)
    
    # Calculate subtotals by type (excl VAT)
    subtotal_labor = sum(item.get("total_excl_vat", item.get("total", 0)) for item in items if item["item_type"] == "arbeid")
    subtotal_material = sum(item.get("total_excl_vat", item.get("total", 0)) for item in items if item["item_type"] == "materiaal")
    other_total = sum(item.get("total_excl_vat", item.get("total", 0)) for item in items if item["item_type"] == "overig")
    
    total_excl_vat = subtotal_labor + subtotal_material + other_total
    
    # Calculate VAT breakdown by rate
    vat_breakdown = {}
    total_vat = 0.0
    
    for item in items:
        vat_rate = str(item.get("vat_rate", 21))
        vat_amount = item.get("vat_amount", 0)
        
        if vat_rate not in vat_breakdown:
            vat_breakdown[vat_rate] = 0.0
        vat_breakdown[vat_rate] += vat_amount
        total_vat += vat_amount
    
    total_incl_vat = total_excl_vat + total_vat
    
    await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {
            "subtotal_labor": subtotal_labor,
            "subtotal_material": subtotal_material,
            "total_excl_vat": total_excl_vat,
            "vat_breakdown": vat_breakdown,
            "total_vat": total_vat,
            "total_incl_vat": total_incl_vat,
            "total_price": total_incl_vat  # For backwards compatibility
        }}
    )

# ============= MATERIAL ROUTES =============

@api_router.post("/materials/upload")
async def upload_materials_csv(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload materials CSV and replace existing catalog"""
    logger.info(f"Uploading materials CSV: {file.filename} for user {current_user.id}")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Alleen CSV bestanden zijn toegestaan")
    
    try:
        # Read CSV
        content = await file.read()
        logger.info(f"CSV file size: {len(content)} bytes")
        
        df = pd.read_csv(io.BytesIO(content))
        logger.info(f"CSV loaded with {len(df)} rows and columns: {list(df.columns)}")
        
        # Map common CSV column names to expected format
        column_mapping = {
            # ECK format
            'Artikelcode': 'sku',
            'artikelcode': 'sku',
            'ARTIKELCODE': 'sku',
            'artikelomschrijving': 'name',
            'Artikelomschrijving': 'name',
            'ARTIKELOMSCHRIJVING': 'name',
            'Tariefprijs': 'price',
            'tariefprijs': 'price',
            'TARIEFPRIJS': 'price',
            'Prijs': 'price',
            'prijs': 'price',
            'PRIJS': 'price',
            # Standard format
            'sku': 'sku',
            'SKU': 'sku',
            'name': 'name',
            'Name': 'name',
            'NAME': 'name',
            'naam': 'name',
            'Naam': 'name',
            'NAAM': 'name',
            'price': 'price',
            'Price': 'price',
            'PRICE': 'price',
            # Optional fields
            'EAN': 'ean',
            'ean': 'ean',
            'description': 'description',
            'Description': 'description',
            'beschrijving': 'description',
            'Beschrijving': 'description',
            'category': 'category',
            'Category': 'category',
            'categorie': 'category',
            'Categorie': 'category',
            'brand': 'brand',
            'Brand': 'brand',
            'merk': 'brand',
            'Merk': 'brand'
        }
        
        # Rename columns
        df = df.rename(columns=column_mapping)
        logger.info(f"Columns after mapping: {list(df.columns)}")
        
        # Validate required columns after mapping
        required_columns = ['sku', 'name', 'price']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            error_msg = f"Ontbrekende kolommen in CSV. Gevonden kolommen: {list(df.columns)}. Vereiste: artikelcode/sku, artikelomschrijving/name, tariefprijs/price"
            logger.error(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Delete existing materials for this user
        delete_result = await db.materials.delete_many({"user_id": current_user.id})
        logger.info(f"Deleted {delete_result.deleted_count} existing materials")
        
        # Insert new materials in batches for better performance
        materials = []
        skipped = 0
        
        for idx, row in df.iterrows():
            try:
                # Validate price
                price = float(row['price'])
                if price < 0:
                    logger.warning(f"Skipping row {idx}: negative price")
                    skipped += 1
                    continue
                
                material = Material(
                    sku=str(row['sku']).strip(),
                    name=str(row['name']).strip(),
                    description=str(row.get('description', '')).strip() if pd.notna(row.get('description')) else '',
                    category=str(row.get('category', '')).strip() if pd.notna(row.get('category')) else '',
                    brand=str(row.get('brand', '')).strip() if pd.notna(row.get('brand')) else '',
                    price=price,
                    user_id=current_user.id
                )
                material_doc = material.model_dump()
                material_doc["created_at"] = material_doc["created_at"].isoformat()
                materials.append(material_doc)
                
                # Insert in batches of 1000
                if len(materials) >= 1000:
                    await db.materials.insert_many(materials)
                    logger.info(f"Inserted batch of {len(materials)} materials")
                    materials = []
                    
            except Exception as e:
                logger.warning(f"Skipping row {idx}: {str(e)}")
                skipped += 1
                continue
        
        # Insert remaining materials
        if materials:
            await db.materials.insert_many(materials)
            logger.info(f"Inserted final batch of {len(materials)} materials")
        
        total_inserted = len(df) - skipped
        logger.info(f"Upload complete: {total_inserted} materials inserted, {skipped} skipped")
        
        return {
            "message": f"Succesvol {total_inserted} materialen geüpload", 
            "count": total_inserted,
            "skipped": skipped
        }
    
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Fout bij verwerken CSV: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=400, detail=error_msg)

@api_router.get("/materials/search")
async def search_materials(q: str, current_user: User = Depends(get_current_user)):
    """Search materials by text query"""
    if not q:
        return {"results": [], "count": 0}
    
    # Case-insensitive search on multiple fields
    query = {
        "user_id": current_user.id,
        "$or": [
            {"sku": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}},
            {"brand": {"$regex": q, "$options": "i"}}
        ]
    }
    
    materials = await db.materials.find(query, {"_id": 0}).limit(50).to_list(50)
    
    for material in materials:
        if isinstance(material["created_at"], str):
            material["created_at"] = datetime.fromisoformat(material["created_at"])
    
    return {"results": materials, "count": len(materials)}

@api_router.get("/materials")
async def get_materials(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_user)):
    """Get all materials with pagination"""
    materials = await db.materials.find({"user_id": current_user.id}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.materials.count_documents({"user_id": current_user.id})
    
    for material in materials:
        if isinstance(material["created_at"], str):
            material["created_at"] = datetime.fromisoformat(material["created_at"])
    
    return {"materials": materials, "total": total}

# ============= PROJECT ROUTES =============

@api_router.post("/projects", response_model=Project)
async def create_project(project_create: ProjectCreate, current_user: User = Depends(get_current_user)):
    """Create a new project from an approved quote"""
    # Verify quote exists
    quote = await db.quotes.find_one({"id": project_create.quote_id, "user_id": current_user.id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    project_obj = Project(**project_create.model_dump(), user_id=current_user.id)
    
    project_doc = project_obj.model_dump()
    project_doc["created_at"] = project_doc["created_at"].isoformat()
    if project_doc.get("start_date"):
        project_doc["start_date"] = project_doc["start_date"].isoformat()
    if project_doc.get("end_date"):
        project_doc["end_date"] = project_doc["end_date"].isoformat()
    
    await db.projects.insert_one(project_doc)
    return project_obj

@api_router.get("/projects", response_model=List[Project])
async def get_projects(current_user: User = Depends(get_current_user)):
    """Get all projects for current user"""
    projects = await db.projects.find({"user_id": current_user.id}).to_list(1000)
    
    for project in projects:
        if isinstance(project["created_at"], str):
            project["created_at"] = datetime.fromisoformat(project["created_at"])
        if project.get("start_date") and isinstance(project["start_date"], str):
            project["start_date"] = datetime.fromisoformat(project["start_date"])
        if project.get("end_date") and isinstance(project["end_date"], str):
            project["end_date"] = datetime.fromisoformat(project["end_date"])
    
    return projects

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific project"""
    project = await db.projects.find_one({"id": project_id, "user_id": current_user.id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if isinstance(project["created_at"], str):
        project["created_at"] = datetime.fromisoformat(project["created_at"])
    if project.get("start_date") and isinstance(project["start_date"], str):
        project["start_date"] = datetime.fromisoformat(project["start_date"])
    if project.get("end_date") and isinstance(project["end_date"], str):
        project["end_date"] = datetime.fromisoformat(project["end_date"])
    
    return Project(**project)

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project_update: ProjectUpdate, current_user: User = Depends(get_current_user)):
    """Update a project"""
    existing_project = await db.projects.find_one({"id": project_id, "user_id": current_user.id})
    if not existing_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in project_update.model_dump().items() if v is not None}
    
    if update_data:
        # Convert datetime fields to ISO strings
        if "start_date" in update_data:
            update_data["start_date"] = update_data["start_date"].isoformat()
        if "end_date" in update_data:
            update_data["end_date"] = update_data["end_date"].isoformat()
        
        # Calculate costs if cost-related fields are updated
        cost_fields_updated = any(k in update_data for k in ["labor_cost_per_hour", "labor_hours", "material_costs", "other_costs"])
        
        if cost_fields_updated:
            # Get current values
            labor_cost_per_hour = update_data.get("labor_cost_per_hour", existing_project.get("labor_cost_per_hour", 0.0))
            labor_hours = update_data.get("labor_hours", existing_project.get("labor_hours", 0.0))
            material_costs = update_data.get("material_costs", existing_project.get("material_costs", 0.0))
            other_costs = update_data.get("other_costs", existing_project.get("other_costs", 0.0))
            
            # Calculate total costs
            total_labor_cost = labor_cost_per_hour * labor_hours
            total_costs = total_labor_cost + material_costs + other_costs
            update_data["total_costs"] = total_costs
            
            # Get quote to calculate profit
            quote = await db.quotes.find_one({"id": existing_project["quote_id"]})
            if quote:
                revenue = quote.get("total_price", 0.0)
                profit = revenue - total_costs
                profit_margin = (profit / revenue * 100) if revenue > 0 else 0.0
                
                update_data["profit"] = profit
                update_data["profit_margin"] = profit_margin
        
        await db.projects.update_one({"id": project_id}, {"$set": update_data})
        existing_project.update(update_data)
    
    if isinstance(existing_project["created_at"], str):
        existing_project["created_at"] = datetime.fromisoformat(existing_project["created_at"])
    if existing_project.get("start_date") and isinstance(existing_project["start_date"], str):
        existing_project["start_date"] = datetime.fromisoformat(existing_project["start_date"])
    if existing_project.get("end_date") and isinstance(existing_project["end_date"], str):
        existing_project["end_date"] = datetime.fromisoformat(existing_project["end_date"])
    
    return Project(**existing_project)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: User = Depends(get_current_user)):
    """Delete a project"""
    result = await db.projects.delete_one({"id": project_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project deleted successfully"}

@api_router.post("/projects/{project_id}/invoices")
async def add_invoice_to_project(project_id: str, invoice: InvoiceUpload, current_user: User = Depends(get_current_user)):
    """Add an invoice to project costs"""
    existing_project = await db.projects.find_one({"id": project_id, "user_id": current_user.id})
    if not existing_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Add invoice to list
    invoice_doc = invoice.model_dump()
    invoice_doc["upload_date"] = datetime.now(timezone.utc).isoformat()
    
    invoices = existing_project.get("invoice_uploads", [])
    invoices.append(invoice_doc)
    
    # Update material costs with invoice totals
    material_costs_excl = existing_project.get("material_costs", 0) + invoice.total_excl_vat
    material_costs_incl = existing_project.get("material_costs_incl_vat", 0) + invoice.total_incl_vat
    
    # Recalculate total costs
    labor_costs = existing_project.get("labor_cost_per_hour", 0) * existing_project.get("labor_hours", 0)
    other_costs = existing_project.get("other_costs", 0)
    
    total_costs_excl = labor_costs + material_costs_excl + other_costs
    total_costs_incl = labor_costs + material_costs_incl + other_costs
    
    # Get quote to calculate profit
    quote = await db.quotes.find_one({"id": existing_project["quote_id"]})
    if quote:
        revenue = quote.get("total_incl_vat", quote.get("total_price", 0))
        profit = revenue - total_costs_incl
        profit_margin = (profit / revenue * 100) if revenue > 0 else 0.0
    else:
        profit = 0
        profit_margin = 0
    
    # Update project
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {
            "invoice_uploads": invoices,
            "material_costs": material_costs_excl,
            "material_costs_incl_vat": material_costs_incl,
            "total_costs": total_costs_incl,
            "total_costs_incl_vat": total_costs_incl,
            "profit": profit,
            "profit_margin": profit_margin
        }}
    )
    
    return {"message": "Invoice added successfully", "total_invoices": len(invoices)}

@api_router.get("/projects/{project_id}/invoices")
async def get_project_invoices(project_id: str, current_user: User = Depends(get_current_user)):
    """Get all invoices for a project"""
    project = await db.projects.find_one({"id": project_id, "user_id": current_user.id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"invoices": project.get("invoice_uploads", [])}

# ============= EXPORT ROUTES =============

@api_router.get("/quotes/{quote_id}/export/pdf")
async def export_quote_pdf(quote_id: str, current_user: User = Depends(get_current_user)):
    """Export quote as PDF with logo and VAT details"""
    from reportlab.lib.utils import ImageReader
    from reportlab.platypus import Image as ReportLabImage
    
    # Get quote
    quote = await db.quotes.find_one({"id": quote_id, "user_id": current_user.id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Get lead
    lead = await db.leads.find_one({"id": quote["lead_id"], "user_id": current_user.id})
    
    # Get line items
    items = await db.line_items.find({"quote_id": quote_id}).to_list(1000)
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch, leftMargin=0.75*inch, rightMargin=0.75*inch)
    
    story = []
    styles = getSampleStyleSheet()
    
    # Add logo if exists
    logo_path = Path(__file__).parent / 'qtechnics_logo.png'
    if logo_path.exists():
        logo = ReportLabImage(str(logo_path), width=2.5*inch, height=1.1*inch)
        story.append(logo)
        story.append(Spacer(1, 0.2*inch))
    
    # Title
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor('#1E40AF'))
    story.append(Paragraph(f"Offerte {quote['quote_number']}", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Lead info
    if lead:
        story.append(Paragraph(f"<b>Klant:</b> {lead['name']}", styles['Normal']))
        story.append(Paragraph(f"<b>Email:</b> {lead['email']}", styles['Normal']))
        story.append(Paragraph(f"<b>Telefoon:</b> {lead['phone']}", styles['Normal']))
        story.append(Paragraph(f"<b>Adres:</b> {lead['address']}", styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
    
    # Separate labor and material items
    labor_items = [item for item in items if item['item_type'] == 'arbeid']
    material_items = [item for item in items if item['item_type'] != 'arbeid']
    
    # Calculate bundled labor total
    labor_total_excl = sum(item.get('total_excl_vat', item.get('quantity', 0) * item.get('unit_price', 0)) for item in labor_items)
    labor_vat_rate = 6  # Renovatie tarief
    labor_vat = labor_total_excl * (labor_vat_rate / 100)
    labor_total_incl = labor_total_excl + labor_vat
    
    # Line items table with VAT - Bundle labor, show materials individually
    table_data = [['Omschrijving', 'Aantal', 'Prijs excl.', 'BTW%', 'Totaal excl.', 'Totaal incl.']]
    
    # Add bundled labor if exists
    if labor_items:
        table_data.append([
            'Arbeid totaal',
            '-',
            '-',
            f"{labor_vat_rate}%",
            f"€{labor_total_excl:.2f}",
            f"€{labor_total_incl:.2f}"
        ])
    
    # Add individual material items
    for item in material_items:
        excl_vat = item.get('total_excl_vat', item.get('quantity', 0) * item.get('unit_price', 0))
        vat_rate = item.get('vat_rate', 21)
        incl_vat = item.get('total_incl_vat', item.get('total', excl_vat))
        
        table_data.append([
            item['description'][:40] + ('...' if len(item['description']) > 40 else ''),
            str(item['quantity']),
            f"€{item['unit_price']:.2f}",
            f"{vat_rate}%",
            f"€{excl_vat:.2f}",
            f"€{incl_vat:.2f}"
        ])
    
    table = Table(table_data, colWidths=[2.2*inch, 0.6*inch, 0.9*inch, 0.6*inch, 0.9*inch, 0.9*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E40AF')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
    ]))
    story.append(table)
    story.append(Spacer(1, 0.3*inch))
    
    # Totals with VAT breakdown
    total_excl = quote.get('total_excl_vat', quote.get('total_price', 0))
    vat_breakdown = quote.get('vat_breakdown', {})
    total_vat = quote.get('total_vat', 0)
    total_incl = quote.get('total_incl_vat', quote.get('total_price', 0))
    
    story.append(Paragraph(f"<b>Totaal excl. BTW:</b> €{total_excl:.2f}", styles['Normal']))
    
    # Show VAT breakdown
    if vat_breakdown:
        story.append(Spacer(1, 0.1*inch))
        for vat_rate, vat_amount in sorted(vat_breakdown.items()):
            story.append(Paragraph(f"<b>BTW {vat_rate}%:</b> €{vat_amount:.2f}", styles['Normal']))
    
    story.append(Paragraph(f"<b>Totaal BTW:</b> €{total_vat:.2f}", styles['Normal']))
    story.append(Spacer(1, 0.1*inch))
    story.append(Paragraph(f"<b>Totaal incl. BTW:</b> €{total_incl:.2f}", title_style))
    
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=offerte_{quote['quote_number']}.pdf"}
    )

@api_router.get("/quotes/{quote_id}/export/excel")
async def export_quote_excel(quote_id: str, current_user: User = Depends(get_current_user)):
    """Export quote as Excel"""
    # Get quote
    quote = await db.quotes.find_one({"id": quote_id, "user_id": current_user.id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Get lead
    lead = await db.leads.find_one({"id": quote["lead_id"], "user_id": current_user.id})
    
    # Get line items
    items = await db.line_items.find({"quote_id": quote_id}).to_list(1000)
    
    # Create Excel
    wb = Workbook()
    ws = wb.active
    ws.title = "Offerte"
    
    # Header
    ws['A1'] = f"Offerte {quote['quote_number']}"
    ws['A1'].font = ws['A1'].font.copy(bold=True, size=16)
    
    # Lead info
    if lead:
        ws['A3'] = 'Klant:'
        ws['B3'] = lead['name']
        ws['A4'] = 'Email:'
        ws['B4'] = lead['email']
        ws['A5'] = 'Telefoon:'
        ws['B5'] = lead['phone']
        ws['A6'] = 'Adres:'
        ws['B6'] = lead['address']
    
    # Line items
    ws['A8'] = 'Omschrijving'
    ws['B8'] = 'Aantal'
    ws['C8'] = 'Eenheidsprijs'
    ws['D8'] = 'Type'
    ws['E8'] = 'Totaal'
    
    for i, item in enumerate(items, start=9):
        ws[f'A{i}'] = item['description']
        ws[f'B{i}'] = item['quantity']
        ws[f'C{i}'] = item['unit_price']
        ws[f'D{i}'] = item['item_type']
        ws[f'E{i}'] = item['total']
    
    # Totals
    row = len(items) + 10
    ws[f'A{row}'] = 'Subtotaal Arbeid:'
    ws[f'E{row}'] = quote['subtotal_labor']
    ws[f'A{row+1}'] = 'Subtotaal Materiaal:'
    ws[f'E{row+1}'] = quote['subtotal_material']
    ws[f'A{row+2}'] = 'Totaalprijs:'
    ws[f'E{row+2}'] = quote['total_price']
    ws[f'A{row+2}'].font = ws[f'A{row+2}'].font.copy(bold=True)
    
    # Save to buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=offerte_{quote['quote_number']}.xlsx"}
    )

# ============= DASHBOARD STATS =============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get dashboard statistics"""
    total_leads = await db.leads.count_documents({"user_id": current_user.id})
    total_quotes = await db.quotes.count_documents({"user_id": current_user.id})
    total_projects = await db.projects.count_documents({"user_id": current_user.id})
    total_materials = await db.materials.count_documents({"user_id": current_user.id})
    
    # Get recent items - exclude MongoDB _id field
    recent_leads = await db.leads.find({"user_id": current_user.id}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_quotes = await db.quotes.find({"user_id": current_user.id}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_leads": total_leads,
        "total_quotes": total_quotes,
        "total_projects": total_projects,
        "total_materials": total_materials,
        "recent_leads": recent_leads,
        "recent_quotes": recent_quotes
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
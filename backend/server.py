from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import shutil
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import resend


ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend API key for email
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
RECIPIENT_EMAILS = [e.strip() for e in os.environ.get('RECIPIENT_EMAILS', '').split(',') if e.strip()]

# QTechnics Dashboard Webhook Configuration
QTECHNICS_WEBHOOK_URL = os.environ.get('QTECHNICS_WEBHOOK_URL', '')
QTECHNICS_API_KEY = os.environ.get('QTECHNICS_API_KEY', '')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Mount uploads directory under /api/uploads for proper routing through ingress
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Lead/Aanvraag Model
class LeadCreate(BaseModel):
    projectTypes: List[str]
    budget: str
    timeline: str
    description: str
    firstName: str
    lastName: str
    email: EmailStr
    phone: str
    street: Optional[str] = ""
    city: str
    postalCode: Optional[str] = ""

class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    projectTypes: List[str]
    budget: str
    timeline: str
    description: str
    firstName: str
    lastName: str
    email: str
    phone: str
    street: str = ""
    city: str
    postalCode: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Project Models
class ProjectCreate(BaseModel):
    title: str
    category: str
    location: str
    shortDescription: str
    fullDescription: Optional[str] = ""
    featured: bool = False

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    shortDescription: Optional[str] = None
    fullDescription: Optional[str] = None
    featured: Optional[bool] = None

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    category: str
    location: str
    shortDescription: str
    fullDescription: str = ""
    mainImage: str = ""
    galleryImages: List[str] = []
    featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Lead/Aanvraag endpoints
def get_budget_label(budget_id: str) -> str:
    budget_map = {
        'under25k': '< €25.000',
        '25k-50k': '€25.000 - €50.000',
        '50k-100k': '€50.000 - €100.000',
        '100k-200k': '€100.000 - €200.000',
        'over200k': '> €200.000',
        'unknown': 'Nog niet bepaald',
    }
    return budget_map.get(budget_id, budget_id)

def get_timeline_label(timeline_id: str) -> str:
    timeline_map = {
        'asap': 'Zo snel mogelijk',
        '1-3months': 'Binnen 1-3 maanden',
        '3-6months': 'Binnen 3-6 maanden',
        '6-12months': 'Binnen 6-12 maanden',
        'exploring': 'Oriënterende fase',
    }
    return timeline_map.get(timeline_id, timeline_id)

def get_project_type_label(type_id: str) -> str:
    type_map = {
        'totaalrenovatie': 'Totaalrenovatie',
        'badkamer': 'Badkamer',
        'keuken': 'Keuken',
        'technieken': 'Technieken',
        'interieur': 'Interieur',
    }
    return type_map.get(type_id, type_id)

async def send_lead_notification_email(lead: Lead):
    """Send email notification for new lead"""
    try:
        project_types_str = ', '.join([get_project_type_label(t) for t in lead.projectTypes])
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #3a190b; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Nieuwe Renovatie Aanvraag</h1>
                </div>
                
                <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
                    <h2 style="color: #3a190b; border-bottom: 2px solid #3a190b; padding-bottom: 10px;">
                        Contactgegevens
                    </h2>
                    <p><strong>Naam:</strong> {lead.firstName} {lead.lastName}</p>
                    <p><strong>E-mail:</strong> <a href="mailto:{lead.email}">{lead.email}</a></p>
                    <p><strong>Telefoon:</strong> <a href="tel:{lead.phone}">{lead.phone}</a></p>
                    <p><strong>Adres:</strong> {lead.street} {lead.postalCode} {lead.city}</p>
                    
                    <h2 style="color: #3a190b; border-bottom: 2px solid #3a190b; padding-bottom: 10px; margin-top: 30px;">
                        Projectdetails
                    </h2>
                    <p><strong>Type project:</strong> {project_types_str}</p>
                    <p><strong>Budget:</strong> {get_budget_label(lead.budget)}</p>
                    <p><strong>Planning:</strong> {get_timeline_label(lead.timeline)}</p>
                    
                    <h2 style="color: #3a190b; border-bottom: 2px solid #3a190b; padding-bottom: 10px; margin-top: 30px;">
                        Omschrijving
                    </h2>
                    <p style="background-color: white; padding: 15px; border-left: 4px solid #3a190b;">
                        {lead.description}
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
                    <p>Deze aanvraag is verzonden via de Max Q website</p>
                    <p>Aanvraag ID: {lead.id}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        for recipient in RECIPIENT_EMAILS:
            params = {
                "from": SENDER_EMAIL,
                "to": [recipient],
                "subject": f"Nieuwe aanvraag: {lead.firstName} {lead.lastName} - {project_types_str}",
                "html": html_content
            }
            
            try:
                await asyncio.to_thread(resend.Emails.send, params)
                logger.info(f"Email sent to {recipient} for lead {lead.id}")
            except Exception as e:
                logger.error(f"Failed to send email to {recipient}: {str(e)}")
                
    except Exception as e:
        logger.error(f"Error in send_lead_notification_email: {str(e)}")

async def sync_lead_to_qtechnics(lead: Lead):
    """Sync lead to QTechnics Dashboard via webhook"""
    try:
        project_types_str = ', '.join([get_project_type_label(t) for t in lead.projectTypes])
        
        # Prepare webhook payload
        webhook_data = {
            "name": f"{lead.firstName} {lead.lastName}",
            "email": lead.email,
            "phone": lead.phone,
            "address": lead.street,
            "postal_code": lead.postalCode,
            "city": lead.city,
            "project_type": project_types_str,
            "description": lead.description,
            "source": "maxq.be",
            "form_name": "Renovatie aanvraag",
            "extra_data": {
                "budget": get_budget_label(lead.budget),
                "timeline": get_timeline_label(lead.timeline),
                "lead_id": lead.id,
            }
        }
        
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": QTECHNICS_API_KEY
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                QTECHNICS_WEBHOOK_URL,
                json=webhook_data,
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Lead synced to QTechnics: {lead.id} -> Lead ID: {result.get('lead_id')}, Project ID: {result.get('project_id')}")
            else:
                logger.error(f"Failed to sync lead to QTechnics: {response.status_code} - {response.text}")
                
    except Exception as e:
        logger.error(f"Error syncing lead to QTechnics: {str(e)}")

@api_router.post("/leads", response_model=Lead)
async def create_lead(input: LeadCreate, background_tasks: BackgroundTasks):
    """Create a new lead and send notification emails"""
    lead_dict = input.model_dump()
    lead_obj = Lead(**lead_dict)
    
    # Convert to dict and serialize datetime for MongoDB
    doc = lead_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.leads.insert_one(doc)
    logger.info(f"New lead created: {lead_obj.id} - {lead_obj.firstName} {lead_obj.lastName}")
    
    # Send email notification in background
    background_tasks.add_task(send_lead_notification_email, lead_obj)
    
    # Sync to QTechnics Dashboard in background
    background_tasks.add_task(sync_lead_to_qtechnics, lead_obj)
    
    return lead_obj

@api_router.get("/leads", response_model=List[Lead])
async def get_leads():
    """Get all leads (for admin dashboard)"""
    leads = await db.leads.find({}, {"_id": 0}).to_list(1000)
    
    for lead in leads:
        if isinstance(lead.get('created_at'), str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    
    return leads

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str):
    """Delete a lead"""
    result = await db.leads.delete_one({"id": lead_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"message": "Lead deleted successfully"}

# File upload endpoint
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload an image file and return the URL"""
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save file: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save file")
    
    # Return the URL (use /api/uploads/ for proper ingress routing)
    return {"url": f"/api/uploads/{unique_filename}", "filename": unique_filename}

# Project endpoints
@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    """Get all projects"""
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    
    for project in projects:
        if isinstance(project.get('created_at'), str):
            project['created_at'] = datetime.fromisoformat(project['created_at'])
    
    return projects

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get a single project by ID"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if isinstance(project.get('created_at'), str):
        project['created_at'] = datetime.fromisoformat(project['created_at'])
    
    return project

@api_router.post("/projects", response_model=Project)
async def create_project(input: ProjectCreate):
    """Create a new project"""
    project_dict = input.model_dump()
    project_obj = Project(**project_dict)
    
    doc = project_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.projects.insert_one(doc)
    logger.info(f"New project created: {project_obj.id} - {project_obj.title}")
    
    return project_obj

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, input: ProjectUpdate):
    """Update a project"""
    # Get existing project
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update only provided fields
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    
    if update_data:
        await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    # Return updated project
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    
    return updated

@api_router.put("/projects/{project_id}/images")
async def update_project_images(project_id: str, mainImage: str = None, galleryImages: str = None):
    """Update project images"""
    import json as json_module
    
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {}
    if mainImage is not None:
        update_data["mainImage"] = mainImage
    if galleryImages is not None:
        # Parse JSON string to list
        try:
            gallery_list = json_module.loads(galleryImages)
            if isinstance(gallery_list, list):
                update_data["galleryImages"] = gallery_list
        except (json_module.JSONDecodeError, TypeError):
            pass
    
    if update_data:
        await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return updated

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    result = await db.projects.delete_one({"id": project_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project deleted successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import resend


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend API key for email
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
RECIPIENT_EMAILS = ['liam.waerzeggers@qtechnics.be', 'info@maxq.be']

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


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
    
    return lead_obj

@api_router.get("/leads", response_model=List[Lead])
async def get_leads():
    """Get all leads (for admin dashboard)"""
    leads = await db.leads.find({}, {"_id": 0}).to_list(1000)
    
    for lead in leads:
        if isinstance(lead.get('created_at'), str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    
    return leads

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
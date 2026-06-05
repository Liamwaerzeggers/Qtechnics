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
import random
from datetime import datetime, timezone
import resend
from emergentintegrations.llm.chat import LlmChat, UserMessage


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

# LLM Key for blog generation
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

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
    beforeAfterImages: List[dict] = []
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
MIME_TYPES = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg', 
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
}

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload an image file and store in MongoDB for persistence"""
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Generate unique ID
    image_id = str(uuid.uuid4())
    
    # Read file content and encode as base64
    import base64
    content = await file.read()
    base64_content = base64.b64encode(content).decode('utf-8')
    
    # Store in MongoDB
    image_doc = {
        "id": image_id,
        "filename": file.filename,
        "content_type": MIME_TYPES.get(file_ext, 'image/jpeg'),
        "data": base64_content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.images.insert_one(image_doc)
    logger.info(f"Image stored in MongoDB: {image_id}")
    
    # Return the URL to fetch this image
    return {"url": f"/api/images/{image_id}", "filename": file.filename, "id": image_id}

@api_router.get("/images/{image_id}")
async def get_image(image_id: str):
    """Serve an image from MongoDB"""
    from fastapi.responses import Response
    import base64
    
    image_doc = await db.images.find_one({"id": image_id}, {"_id": 0})
    if not image_doc:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Decode base64 content
    image_data = base64.b64decode(image_doc["data"])
    
    return Response(
        content=image_data,
        media_type=image_doc.get("content_type", "image/jpeg"),
        headers={"Cache-Control": "public, max-age=31536000"}  # Cache for 1 year
    )

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
async def update_project_images(project_id: str, mainImage: str = None, galleryImages: str = None, beforeAfterImages: str = None):
    """Update project images"""
    import json as json_module
    
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {}
    if mainImage is not None:
        update_data["mainImage"] = mainImage
    if galleryImages is not None:
        try:
            gallery_list = json_module.loads(galleryImages)
            if isinstance(gallery_list, list):
                update_data["galleryImages"] = gallery_list
        except (json_module.JSONDecodeError, TypeError):
            pass
    if beforeAfterImages is not None:
        try:
            ba_list = json_module.loads(beforeAfterImages)
            if isinstance(ba_list, list):
                update_data["beforeAfterImages"] = ba_list
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

# ============ BLOG SYSTEM ============

class BlogPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    slug: str
    excerpt: str = ""
    content: str = ""
    category: str = "renovatie"
    tags: List[str] = []
    published: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def slugify(text: str) -> str:
    import re
    text = text.lower().strip()
    text = re.sub(r'[àáâã]', 'a', text)
    text = re.sub(r'[èéêë]', 'e', text)
    text = re.sub(r'[ìíîï]', 'i', text)
    text = re.sub(r'[òóôõ]', 'o', text)
    text = re.sub(r'[ùúûü]', 'u', text)
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-')

BLOG_TOPICS = [
    "Badkamer renovatie trends in {year}",
    "Keuken verbouwen: {count} tips voor een geslaagd project",
    "Totaalrenovatie plannen: waar moet je op letten?",
    "Vloerverwarming installeren: voordelen en kosten",
    "Inloopdouche plaatsen: de ultieme gids",
    "Maatkasten: maximale opbergruimte in elk interieur",
    "Duurzaam renoveren: milieuvriendelijke materialen",
    "Kookeiland plaatsen: praktische tips en inspiratie",
    "Interieurafwerking: van pleisterwerk tot schilderwerk",
    "Energiezuinig renoveren: bespaar op uw energierekening",
    "Moderne badkamer op maat: luxe binnen handbereik",
    "Elektriciteit renoveren: veiligheid en domotica",
    "Open keuken of gesloten keuken: voor- en nadelen",
    "Sanitair renovatie: alles over leidingen en aansluitingen",
    "Verbouwing plannen: stap-voor-stap handleiding",
    "Kleine badkamer renoveren: slimme oplossingen",
    "Keuken trends {year}: materialen en kleuren",
    "Renoveren of nieuwbouw: wat is voordeliger?",
    "Huis renoveren in Limburg: lokale tips en regelgeving",
    "Inbouwkasten op maat: van slaapkamer tot hal",
    "Woning renoveren: waardevermeerdering van uw huis",
    "Tegelwerk in badkamer en keuken: soorten en prijzen",
    "Verlichting bij renovatie: LED en sfeerverlichting",
    "Ventilatie bij renovatie: gezond binnenklimaat",
    "Renovatiepremies in Vlaanderen: waar hebt u recht op?",
    "Betonlook in badkamer en keuken: stijlvol en onderhoudsvriendelijk",
    "Dressing op maat: luxe inloopkast ontwerpen",
    "Akoestiek bij renovatie: geluidsisolatie tips",
    "Slimme woning: domotica bij renovatie",
    "Renoveren met behoud van karakter: oude woningen",
]

async def generate_blog_with_ai(topic: str) -> dict:
    """Generate a blog post using AI"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"blog-gen-{uuid.uuid4()}",
        system_message="""Je bent een ervaren SEO-copywriter gespecialiseerd in renovatie en interieurdesign in Vlaanderen.
Je schrijft voor Max Q, een renovatiebedrijf met 9 medewerkers uit Ham (Tessenderlo-Ham) met 25+ jaar ervaring.
Je doel is LEADS genereren en BEZOEKERS naar de website trekken via SEO.

SCHRIJFREGELS:
- Schrijf in het Nederlands, professioneel maar toegankelijk
- Gebruik concrete voorbeelden, prijsindicaties en praktische tips
- Focus op de Belgische markt (Limburg, Kempen, Vlaams-Brabant)
- Verwerk de zoekwoorden natuurlijk in de tekst (koppen, eerste alinea, tussenkopjes)
- Eindig ALTIJD met een call-to-action: "Wilt u meer weten? Vraag een gratis en vrijblijvend adviesgesprek aan bij Max Q via <a href='https://maxq.be/start'>maxq.be/start</a> of bel <a href='tel:+32488152028'>+32 488 15 20 28</a>."
- Voeg 1-2 interne links toe naar relevante diensten (bijv. <a href='https://maxq.be/diensten/badkamer-renoveren'>badkamer renoveren</a>)
- Gebruik GEEN emoji's"""
    )
    
    year = datetime.now().year
    formatted_topic = topic.replace("{year}", str(year)).replace("{count}", str(random.randint(5, 10)))
    
    prompt = f"""Schrijf een volledig blogartikel over: "{formatted_topic}"

Geef het resultaat in exact dit formaat:
TITEL: [pakkende SEO-titel, max 70 tekens]
EXCERPT: [korte samenvatting, max 160 tekens voor meta description]
CATEGORIE: [kies uit: badkamer, keuken, interieur, renovatie, technieken, duurzaamheid]
TAGS: [3-5 tags gescheiden door komma's]
---
[Het volledige artikel in HTML-opmaak met <h2>, <h3>, <p>, <ul>, <li> tags. Minimaal 800 woorden. Gebruik geen <h1> tag.]"""
    
    msg = UserMessage(text=prompt)
    response = await chat.send_message(msg)
    
    lines = response.strip().split('\n')
    title = ""
    excerpt = ""
    category = "renovatie"
    tags = []
    content_start = 0
    
    for i, line in enumerate(lines):
        if line.startswith('TITEL:'):
            title = line.replace('TITEL:', '').strip()
        elif line.startswith('EXCERPT:'):
            excerpt = line.replace('EXCERPT:', '').strip()
        elif line.startswith('CATEGORIE:'):
            category = line.replace('CATEGORIE:', '').strip().lower()
        elif line.startswith('TAGS:'):
            tags = [t.strip() for t in line.replace('TAGS:', '').split(',')]
        elif line.strip() == '---':
            content_start = i + 1
            break
    
    content = '\n'.join(lines[content_start:]).strip()
    
    # Clean markdown code fences from content
    import re
    content = re.sub(r'^```html\s*', '', content)
    content = re.sub(r'^```\s*', '', content)
    content = re.sub(r'\s*```$', '', content)
    content = content.strip()
    
    if not title:
        title = formatted_topic
    if not excerpt:
        excerpt = f"Lees alles over {formatted_topic.lower()} bij Max Q."
    
    return {
        "title": title,
        "slug": slugify(title),
        "excerpt": excerpt,
        "content": content,
        "category": category,
        "tags": tags,
    }

@api_router.get("/blogs")
async def get_blogs(published_only: bool = True):
    """Get all blog posts"""
    query = {"published": True} if published_only else {}
    blogs = await db.blogs.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for blog in blogs:
        if isinstance(blog.get('created_at'), str):
            blog['created_at'] = datetime.fromisoformat(blog['created_at'])
        blog.pop('content', None)
    return blogs

@api_router.get("/blogs/{slug}")
async def get_blog(slug: str):
    """Get a single blog post by slug"""
    blog = await db.blogs.find_one({"slug": slug}, {"_id": 0})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog niet gevonden")
    if isinstance(blog.get('created_at'), str):
        blog['created_at'] = datetime.fromisoformat(blog['created_at'])
    return blog

@api_router.post("/blogs/generate")
async def generate_blog(background_tasks: BackgroundTasks):
    """Generate and publish a new AI blog post, prioritizing custom topics"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key niet geconfigureerd")
    
    # Check for custom topics first
    custom = await db.custom_topics.find_one({"used": {"$ne": True}}, {"_id": 0})
    
    if custom:
        topic = custom.get('topic', '')
        # Mark as used
        await db.custom_topics.update_one({"id": custom['id']}, {"$set": {"used": True}})
    else:
        existing = await db.blogs.find({}, {"_id": 0}).to_list(100)
        used_topics = [b.get('title', '') for b in existing]
        available = [t for t in BLOG_TOPICS if not any(
            slugify(t.replace("{year}", str(datetime.now().year)).replace("{count}", "7")) == slugify(u) 
            for u in used_topics
        )]
        if not available:
            available = BLOG_TOPICS
        topic = random.choice(available)
    
    try:
        blog_data = await generate_blog_with_ai(topic)
        blog = BlogPost(**blog_data)
        doc = blog.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.blogs.insert_one(doc)
        logger.info(f"Blog generated: {blog.title}")
        await update_static_blog_sitemap()
        return {"id": blog.id, "title": blog.title, "slug": blog.slug}
    except Exception as e:
        logger.error(f"Blog generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Blog generatie mislukt: {str(e)}")

async def update_static_blog_sitemap():
    """Add blog URLs to the main sitemap.xml"""
    try:
        blogs = await db.blogs.find({"published": True}, {"_id": 0, "slug": 1, "created_at": 1}).to_list(500)
        sitemap_path = Path(__file__).parent.parent / 'frontend' / 'public' / 'sitemap.xml'
        content = sitemap_path.read_text()
        
        # Remove old blog entries if present
        import re
        content = re.sub(r'\s*<!-- Blog Articles -->.*?(?=\n</urlset>)', '', content, flags=re.DOTALL)
        
        # Build blog entries
        blog_entries = ['\n    <!-- Blog Articles -->']
        blog_entries.append('    <url><loc>https://maxq.be/blog</loc><changefreq>daily</changefreq><priority>0.8</priority></url>')
        for blog in blogs:
            slug = blog.get('slug', '')
            created = blog.get('created_at', '')
            lastmod = created[:10] if isinstance(created, str) else (created.strftime('%Y-%m-%d') if created else '')
            blog_entries.append(f'    <url><loc>https://maxq.be/blog/{slug}</loc><lastmod>{lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>')
        
        # Insert before closing tag
        content = content.replace('\n</urlset>', '\n'.join(blog_entries) + '\n\n</urlset>')
        sitemap_path.write_text(content)
        logger.info(f"Main sitemap updated with {len(blogs)} blog URLs")
    except Exception as e:
        logger.error(f"Failed to update sitemap with blogs: {str(e)}")

@api_router.delete("/blogs/{blog_id}")
async def delete_blog(blog_id: str):
    """Delete a blog post"""
    result = await db.blogs.delete_one({"id": blog_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog niet gevonden")
    await update_static_blog_sitemap()
    return {"message": "Blog verwijderd"}

# ============ CUSTOM BLOG TOPICS ============

@api_router.get("/blog-topics")
async def get_blog_topics():
    """Get all custom blog topics (unused first)"""
    topics = await db.custom_topics.find({"used": {"$ne": True}}, {"_id": 0}).to_list(100)
    return topics

@api_router.post("/blog-topics")
async def add_blog_topic(data: dict):
    """Add a custom blog topic"""
    topic_text = data.get('topic', '').strip()
    if not topic_text:
        raise HTTPException(status_code=400, detail="Topic is verplicht")
    doc = {
        "id": str(uuid.uuid4()),
        "topic": topic_text,
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.custom_topics.insert_one(doc)
    return {"id": doc["id"], "topic": doc["topic"]}

@api_router.delete("/blog-topics/{topic_id}")
async def delete_blog_topic(topic_id: str):
    """Delete a custom blog topic"""
    result = await db.custom_topics.delete_one({"id": topic_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Topic niet gevonden")
    return {"message": "Topic verwijderd"}

async def auto_generate_daily_blog():
    """Background task that generates a blog post every 24 hours"""
    await asyncio.sleep(10)
    while True:
        try:
            today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            existing_today = await db.blogs.find_one({
                "created_at": {"$regex": f"^{today}"}
            })
            
            if not existing_today and EMERGENT_LLM_KEY:
                available = list(BLOG_TOPICS)
                topic = random.choice(available)
                blog_data = await generate_blog_with_ai(topic)
                blog = BlogPost(**blog_data)
                doc = blog.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.blogs.insert_one(doc)
                logger.info(f"Daily auto-blog generated: {blog.title}")
                await update_static_blog_sitemap()
        except Exception as e:
            logger.error(f"Auto blog generation failed: {str(e)}")
        
        await asyncio.sleep(86400)

# ============================================================
# SEO BRAIN - Daily Trend Research & Auto-Optimization
# ============================================================

async def seo_brain_research() -> dict:
    """Use LLM to research trending Belgian/Flemish renovation queries
    and pick a smart blog topic for today."""
    if not EMERGENT_LLM_KEY:
        return {"trends": [], "blog_topic": None, "qa_pairs": []}
    
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"seo-brain-{today}",
        system_message="""Je bent een SEO-strateeg gespecialiseerd in renovatie en interieurdesign in Vlaanderen (Belgie) voor renovatiebedrijf Max Q.

LOCATIE: Max Q is gevestigd in Oostham (Gerhees 118, 3945 Ham, Limburg). Focus op een straal van 25km rond Oostham:
- Tessenderlo (5km), Leopoldsburg (8km), Balen (10km), Beringen (12km), Heusden-Zolder (12km),
- Diest (15km), Mol (15km), Olen (17km), Houthalen-Helchteren (17km), Hechtel-Eksel (18km),
- Lommel (18km), Geel (20km), Pelt (22km), Hasselt (25km).
Secundair: Kasterlee, Lille, Arendonk, Westerlo, Aarschot, Lubbeek, Bocholt, Peer.

ECHTE ZOEKTERMEN (Google Search Console data):
- HOOG VOLUME: 'badkamer renoveren beringen', 'badkamer verbouwen beringen', 'sanitair project begeleiding'
- PATRONEN: 'nieuwe badkamer/keuken [stad]', 'badkamerspecialist [stad]', 'interieurbouw [stad]', 'dressing [stad]', 'maatkasten [stad]', 'badkamermeubels [stad]'
- INTENT: 'sanitair ham', 'loodgieter tessenderlo', 'traprenovatie lommel', 'keukenrenovatie bocholt'
- TRENDS: 'betonlook keuken', 'inloopdouche', 'vloerverwarming hasselt', 'luxe renovaties limburg'

Je houdt rekening met:
- Seizoensgebonden zoekgedrag (winter: warmtepomp/isolatie; zomer: badkamer/keuken)
- Belgische premies (Mijn VerbouwPremie, EPC-labelpremie, renovatieplicht)
- Lokale steden binnen 25km rond Oostham (prioriteit)
- Long-tail commerciele intentie (offerte, prijs, kosten, aannemer, specialist)
- AI/LLM optimalisatie (vraag-gebaseerde formuleringen)"""
    )
    
    prompt = f"""Vandaag is {today}. Geef het SEO-plan voor maxq.be voor vandaag.

Output EXACT in dit JSON formaat (geen extra tekst):
{{
  "trends": [
    {{"keyword": "string", "intent": "informational|commercial|transactional", "priority": 1-10, "reason": "korte uitleg waarom dit trending is"}},
    ...10 items
  ],
  "blog_topic": "een specifiek, longtail blog onderwerp gebaseerd op trends van vandaag (max 80 tekens)",
  "qa_pairs": [
    {{"q": "vraag zoals iemand ChatGPT zou stellen", "a": "concreet antwoord van 2-3 zinnen voor Max Q"}},
    ...5 items
  ]
}}"""
    
    try:
        msg = UserMessage(text=prompt)
        response = await chat.send_message(msg)
        import json
        import re
        cleaned = re.sub(r'^```json\s*|\s*```$', '', response.strip(), flags=re.MULTILINE)
        data = json.loads(cleaned)
        return data
    except Exception as e:
        logger.error(f"SEO brain research failed: {str(e)}")
        return {"trends": [], "blog_topic": None, "qa_pairs": []}


async def send_seo_summary_email(run: dict):
    """Send daily SEO brain summary email."""
    if not resend.api_key or not RECIPIENT_EMAILS:
        return
    
    trends = run.get('trends', [])[:10]
    qa = run.get('qa_pairs', [])[:5]
    blog_title = run.get('blog_title') or '-'
    trends_html = ''.join([f"<li><strong>{t.get('keyword','')}</strong> ({t.get('intent','')}, prio {t.get('priority','')}/10) — {t.get('reason','')}</li>" for t in trends])
    qa_html = ''.join([f"<li><strong>{p.get('q','')}</strong><br>{p.get('a','')}</li>" for p in qa])
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background:#3a190b; padding:20px; text-align:center;">
        <h1 style="color:white; margin:0;">SEO Brain — Dagrapport</h1>
        <p style="color:#fff8; margin:5px 0 0;">{datetime.now(timezone.utc).strftime('%d %B %Y')}</p>
      </div>
      <div style="background:#f9f9f9; padding:20px; border:1px solid #ddd;">
        <h2 style="color:#3a190b;">Trending zoektermen vandaag</h2>
        <ol style="line-height:1.6;">{trends_html or '<li>Geen trends gevonden</li>'}</ol>
        <h2 style="color:#3a190b; margin-top:25px;">Nieuwe blog</h2>
        <p style="background:white; padding:12px; border-left:4px solid #3a190b;">{blog_title}</p>
        <h2 style="color:#3a190b; margin-top:25px;">Nieuwe AI Q&amp;A's (toegevoegd aan llms.txt)</h2>
        <ol style="line-height:1.6;">{qa_html or '<li>Geen nieuwe Q&A</li>'}</ol>
        <hr style="margin:25px 0;">
        <p style="font-size:12px; color:#888;">Automatisch gegenereerd door SEO Brain - maxq.be</p>
      </div>
    </div>
    """
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": RECIPIENT_EMAILS,
            "subject": f"SEO Brain dagrapport — {datetime.now(timezone.utc).strftime('%d %b %Y')}",
            "html": html,
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info("SEO brain email sent")
    except Exception as e:
        logger.error(f"SEO brain email failed: {str(e)}")


async def run_seo_brain_once() -> dict:
    """Run a full SEO brain cycle: research + blog + save trends + email."""
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    run = {
        "id": str(uuid.uuid4()),
        "date": today,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "trends": [],
        "qa_pairs": [],
        "blog_title": None,
        "blog_slug": None,
        "status": "running",
    }
    
    research = await seo_brain_research()
    run["trends"] = research.get("trends", [])
    run["qa_pairs"] = research.get("qa_pairs", [])
    
    # Save Q&A pairs to DB (deduped by question text)
    for qa in run["qa_pairs"]:
        if qa.get("q") and qa.get("a"):
            await db.seo_qa.update_one(
                {"q": qa["q"]},
                {"$set": {"q": qa["q"], "a": qa["a"], "updated_at": today}},
                upsert=True,
            )
    
    # Save trends
    for t in run["trends"]:
        if t.get("keyword"):
            await db.seo_trends.insert_one({
                "keyword": t["keyword"],
                "intent": t.get("intent"),
                "priority": t.get("priority"),
                "reason": t.get("reason"),
                "date": today,
            })
    
    # Generate blog using SEO-driven topic
    blog_topic = research.get("blog_topic")
    if blog_topic and EMERGENT_LLM_KEY:
        try:
            existing_today = await db.blogs.find_one({"created_at": {"$regex": f"^{today}"}})
            if not existing_today:
                blog_data = await generate_blog_with_ai(blog_topic)
                blog = BlogPost(**blog_data)
                doc = blog.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.blogs.insert_one(doc)
                run["blog_title"] = blog.title
                run["blog_slug"] = blog.slug
                await update_static_blog_sitemap()
                logger.info(f"SEO Brain blog generated: {blog.title}")
        except Exception as e:
            logger.error(f"SEO brain blog gen failed: {str(e)}")
    
    run["status"] = "completed"
    run["completed_at"] = datetime.now(timezone.utc).isoformat()
    await db.seo_runs.insert_one({**run})
    await send_seo_summary_email(run)
    return run


async def auto_seo_brain_daily():
    """Background task — runs SEO Brain every 24h."""
    await asyncio.sleep(30)  # start after blog task initializes
    while True:
        try:
            today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            existing = await db.seo_runs.find_one({"date": today, "status": "completed"})
            if not existing:
                await run_seo_brain_once()
        except Exception as e:
            logger.error(f"Auto SEO brain failed: {str(e)}")
        await asyncio.sleep(86400)


@api_router.get("/seo/trends")
async def get_seo_trends(limit: int = 30):
    """Get latest SEO trending keywords"""
    trends = await db.seo_trends.find({}, {"_id": 0}).sort("date", -1).limit(limit).to_list(limit)
    return trends


@api_router.get("/seo/qa")
async def get_seo_qa(limit: int = 50):
    """Get all SEO-generated Q&A pairs"""
    qa = await db.seo_qa.find({}, {"_id": 0}).sort("updated_at", -1).limit(limit).to_list(limit)
    return qa


@api_router.get("/seo/runs")
async def get_seo_runs(limit: int = 14):
    """Get history of SEO brain runs"""
    runs = await db.seo_runs.find({}, {"_id": 0}).sort("date", -1).limit(limit).to_list(limit)
    return runs


@api_router.post("/seo/run-now")
async def trigger_seo_brain(background_tasks: BackgroundTasks):
    """Manually trigger an SEO brain run"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key niet geconfigureerd")
    background_tasks.add_task(run_seo_brain_once)
    return {"message": "SEO brain run gestart in background"}


@api_router.get("/llms.txt")
async def dynamic_llms_txt():
    """Serve dynamic llms.txt with live Q&A from SEO brain"""
    from fastapi.responses import Response
    base_path = ROOT_DIR.parent / "frontend" / "public" / "llms.txt"
    try:
        with open(base_path, "r", encoding="utf-8") as f:
            base_content = f.read()
    except Exception:
        base_content = "# Max Q Renovaties\n"
    
    qa_pairs = await db.seo_qa.find({}, {"_id": 0}).sort("updated_at", -1).limit(50).to_list(50)
    if qa_pairs:
        appendix = "\n\n## Actuele Vragen & Antwoorden (Auto-Updated)\n\n"
        for qa in qa_pairs:
            appendix += f"**{qa.get('q','')}**\n{qa.get('a','')}\n\n"
        base_content += appendix
    
    return Response(content=base_content, media_type="text/plain; charset=utf-8")
# ============================================================

# Dynamic blog sitemap endpoint for Google
@api_router.get("/sitemap-blogs.xml")
async def sitemap_blogs():
    from fastapi.responses import Response
    blogs = await db.blogs.find({"published": True}, {"_id": 0, "slug": 1, "created_at": 1}).to_list(500)
    xml_lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml_lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    xml_lines.append('  <url><loc>https://maxq.be/blog</loc><changefreq>daily</changefreq><priority>0.8</priority></url>')
    for blog in blogs:
        slug = blog.get('slug', '')
        created = blog.get('created_at', '')
        if isinstance(created, str):
            lastmod = created[:10]
        else:
            lastmod = created.strftime('%Y-%m-%d') if created else ''
        xml_lines.append(f'  <url><loc>https://maxq.be/blog/{slug}</loc><lastmod>{lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>')
    xml_lines.append('</urlset>')
    return Response(content='\n'.join(xml_lines), media_type="application/xml")

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

@app.on_event("startup")
async def startup_event():
    """Start daily blog auto-generation task and SEO brain"""
    await update_static_blog_sitemap()
    asyncio.create_task(auto_generate_daily_blog())
    asyncio.create_task(auto_seo_brain_daily())
    logger.info("Daily blog auto-generation + SEO brain tasks started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
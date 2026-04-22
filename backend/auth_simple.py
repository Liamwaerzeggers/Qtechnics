"""
Simple Authentication Module - Clean restart
No cookies, only localStorage tokens
"""
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth2", tags=["auth2"])

# Simple models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    token: str
    user: dict

# Hardcoded admin credentials - SIMPLE
ADMIN_USERS = {
    "liam": {
        "password": "Liammail123",  # WITHOUT period - simpler
        "id": "ADMIN-LIAM",
        "name": "Liam",
        "email": "liam.waerzeggers@qtechnics.be",
        "role": "admin"
    }
}

# Exported for team member lookup - keyed by user ID
HARDCODED_ADMINS = {
    admin["id"]: admin for admin in ADMIN_USERS.values()
}

def get_db():
    """Get database connection from main server"""
    from server import db
    return db

@router.post("/login")
async def simple_login(data: LoginRequest):
    """Ultra simple login - just username and password"""
    username = data.username.strip().lower()
    password = data.password.strip()
    
    logger.info(f"Login attempt: {username}")
    
    # Check hardcoded admins first
    if username in ADMIN_USERS:
        admin = ADMIN_USERS[username]
        # Accept password with or without trailing period
        valid_passwords = [admin["password"], admin["password"] + "."]
        
        if password in valid_passwords:
            token = secrets.token_urlsafe(32)
            
            # Store session in database
            db = get_db()
            
            # Clean up expired sessions for this user (not ALL sessions - user may have multiple devices)
            now = datetime.now(timezone.utc).isoformat()
            await db.user_sessions.delete_many({
                "user_id": admin["id"],
                "expires_at": {"$lt": now}
            })
            
            await db.user_sessions.insert_one({
                "user_id": admin["id"],
                "session_token": token,
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"Login successful for {username}")
            
            return {
                "success": True,
                "token": token,
                "user": {
                    "id": admin["id"],
                    "username": username.capitalize(),
                    "name": admin["name"],
                    "email": admin["email"],
                    "role": admin["role"]
                }
            }
    
    # Check database for other admins
    db = get_db()
    user = await db.users.find_one({
        "username": {"$regex": f"^{username}$", "$options": "i"},
        "role": "admin"
    })
    
    if user and user.get("password_hash"):
        # Verify password
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        if password_hash == user["password_hash"]:
            token = secrets.token_urlsafe(32)
            
            await db.user_sessions.insert_one({
                "user_id": user.get("id") or str(user.get("_id")),
                "session_token": token,
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {
                "success": True,
                "token": token,
                "user": {
                    "id": user.get("id") or str(user.get("_id")),
                    "username": user.get("username"),
                    "name": user.get("name", ""),
                    "email": user.get("email", ""),
                    "role": "admin"
                }
            }
    
    logger.warning(f"Login failed for {username}")
    raise HTTPException(status_code=401, detail="Ongeldige gebruikersnaam of wachtwoord")

@router.get("/me")
async def get_me(authorization: Optional[str] = Header(None)):
    """Get current user from token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Niet ingelogd")
    
    # Extract token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Ongeldig token formaat")
    
    token = parts[1]
    
    db = get_db()
    session = await db.user_sessions.find_one({"session_token": token})
    
    if not session:
        session = await db.sessions.find_one({"session_token": token})
    
    if not session:
        raise HTTPException(status_code=401, detail="Sessie niet gevonden")
    
    # Check expiry
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessie verlopen")
    
    user_id = session["user_id"]
    
    # Check hardcoded users
    for username, admin in ADMIN_USERS.items():
        if admin["id"] == user_id:
            return {
                "id": admin["id"],
                "username": username.capitalize(),
                "name": admin["name"],
                "email": admin["email"],
                "role": admin["role"]
            }
    
    # Check database
    user = await db.users.find_one({"id": user_id})
    if not user:
        user = await db.users.find_one({"_id": user_id})
    
    if not user:
        # Check workers
        worker = await db.workers.find_one({"id": user_id})
        if worker:
            return {
                "id": worker["id"],
                "username": worker.get("username"),
                "name": worker.get("name", ""),
                "role": "worker"
            }
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    
    return {
        "id": user.get("id") or str(user.get("_id")),
        "username": user.get("username"),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "admin")
    }

@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logout - delete session"""
    if authorization:
        parts = authorization.split()
        if len(parts) == 2:
            token = parts[1]
            db = get_db()
            await db.user_sessions.delete_one({"session_token": token})
            await db.sessions.delete_one({"session_token": token})
    
    return {"success": True, "message": "Uitgelogd"}

@router.get("/test")
async def test():
    """Simple test endpoint"""
    return {"status": "ok", "message": "Auth2 werkt!"}

@router.get("/debug")
async def debug_auth(authorization: Optional[str] = Header(None)):
    """Debug endpoint to see what's happening with auth"""
    from server import db
    
    result = {
        "has_auth_header": authorization is not None,
        "token_preview": None,
        "session_found": False,
        "user_id": None,
        "is_hardcoded_admin": False
    }
    
    if authorization:
        parts = authorization.split()
        if len(parts) == 2:
            token = parts[1]
            result["token_preview"] = token[:15] + "..."
            
            session = await db.user_sessions.find_one({"session_token": token})
            if not session:
                session = await db.sessions.find_one({"session_token": token})
            
            if session:
                result["session_found"] = True
                result["user_id"] = session.get("user_id")
                result["is_hardcoded_admin"] = session.get("user_id") == "ADMIN-LIAM"
    
    return result

from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import string
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal, Any
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_PIN = os.environ.get('ADMIN_PIN', '73921846')

app = FastAPI(title="Ranthambore's Curator API")
api_router = APIRouter(prefix="/api")

# ============ MODELS ============
def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def gen_booking_ref() -> str:
    suffix = ''.join(random.choices(string.digits, k=5))
    return f"RTC-2026-{suffix}"

class BookingCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    date: str
    shift: Literal["morning", "evening"]
    vehicle: str
    zone: str
    nationality: Literal["Indian", "Foreigner"]
    guests: int
    per_person: float
    total: float
    addons: List[str] = Field(default_factory=list)
    full_name: str
    email: str
    whatsapp: str
    age: Optional[int] = None
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_number: Optional[str] = None
    is_tatkal: bool = False

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ref: str = Field(default_factory=gen_booking_ref)
    status: Literal["pending", "confirmed", "cancelled"] = "pending"
    created_at: str = Field(default_factory=utc_now_iso)
    # echo BookingCreate
    date: str
    shift: str
    vehicle: str
    zone: str
    nationality: str
    guests: int
    per_person: float
    total: float
    addons: List[str] = Field(default_factory=list)
    full_name: str
    email: str
    whatsapp: str
    age: Optional[int] = None
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_number: Optional[str] = None
    is_tatkal: bool = False

class InquiryCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["callback", "contact", "package", "hotel", "tatkal_request", "custom_package"]
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    message: Optional[str] = None
    context: Optional[dict] = None  # for package name, hotel name, tatkal dates, etc.

class Inquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=utc_now_iso)
    type: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    message: Optional[str] = None
    context: Optional[dict] = None

class AdminLogin(BaseModel):
    pin: str

class StatusUpdate(BaseModel):
    status: Literal["pending", "confirmed", "cancelled"]

# ============ AUTH HELPERS ============
# In-memory failed attempts tracker (per process)
_attempts = {}

def require_admin(x_admin_pin: Optional[str] = Header(default=None)):
    if not x_admin_pin or x_admin_pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

# ============ ROUTES ============
@api_router.get("/")
async def root():
    return {"message": "Ranthambore's Curator API", "status": "ok"}

# ---- Bookings ----
@api_router.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate):
    booking = Booking(**payload.model_dump())
    doc = booking.model_dump()
    await db.bookings.insert_one(doc)
    return booking

@api_router.get("/admin/bookings", response_model=List[Booking])
async def list_bookings(_: bool = Depends(require_admin)):
    docs = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs

@api_router.patch("/admin/bookings/{ref}/status")
async def update_booking_status(ref: str, payload: StatusUpdate, _: bool = Depends(require_admin)):
    res = await db.bookings.update_one({"ref": ref}, {"$set": {"status": payload.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"ok": True}

# ---- Inquiries ----
@api_router.post("/inquiries", response_model=Inquiry)
async def create_inquiry(payload: InquiryCreate):
    inquiry = Inquiry(**payload.model_dump())
    await db.inquiries.insert_one(inquiry.model_dump())
    return inquiry

@api_router.get("/admin/inquiries", response_model=List[Inquiry])
async def list_inquiries(_: bool = Depends(require_admin)):
    docs = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs

# ---- Admin Auth ----
@api_router.post("/admin/login")
async def admin_login(payload: AdminLogin):
    if payload.pin == ADMIN_PIN:
        return {"ok": True, "token": ADMIN_PIN}
    raise HTTPException(status_code=401, detail="Incorrect PIN")

# ---- Admin Stats ----
@api_router.get("/admin/stats")
async def admin_stats(_: bool = Depends(require_admin)):
    total_bookings = await db.bookings.count_documents({})
    pending = await db.bookings.count_documents({"status": "pending"})
    confirmed = await db.bookings.count_documents({"status": "confirmed"})
    cancelled = await db.bookings.count_documents({"status": "cancelled"})

    # Total revenue from confirmed bookings
    pipeline = [{"$match": {"status": "confirmed"}}, {"$group": {"_id": None, "sum": {"$sum": "$total"}}}]
    rev_agg = await db.bookings.aggregate(pipeline).to_list(1)
    revenue = rev_agg[0]["sum"] if rev_agg else 0

    contact_count = await db.inquiries.count_documents({"type": "contact"})
    callback_count = await db.inquiries.count_documents({"type": "callback"})
    package_count = await db.inquiries.count_documents({"type": {"$in": ["package", "custom_package"]}})

    recent_bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_inquiries = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)

    return {
        "total_bookings": total_bookings,
        "pending": pending,
        "confirmed": confirmed,
        "cancelled": cancelled,
        "revenue": revenue,
        "contact_inquiries": contact_count,
        "callback_requests": callback_count,
        "package_inquiries": package_count,
        "recent_bookings": recent_bookings,
        "recent_inquiries": recent_inquiries,
        "last_updated": utc_now_iso(),
    }

# ---- Admin Live Feed ----
@api_router.get("/admin/live-feed")
async def live_feed(_: bool = Depends(require_admin)):
    bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    inquiries = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)

    feed = []
    for b in bookings:
        feed.append({
            "kind": "tatkal_request" if b.get("is_tatkal") else "new_booking",
            "title": "Tatkal Request" if b.get("is_tatkal") else "New Booking",
            "name": b.get("full_name", ""),
            "detail": f"{b.get('vehicle','')} · Zone {b.get('zone','')} · {b.get('date','')}",
            "created_at": b.get("created_at"),
            "ref": b.get("ref"),
        })
    for q in inquiries:
        title_map = {
            "callback": "Callback Request",
            "contact": "Contact Message",
            "package": "Package Inquiry",
            "custom_package": "Custom Package Inquiry",
            "hotel": "Hotel Inquiry",
        }
        feed.append({
            "kind": q.get("type"),
            "title": title_map.get(q.get("type"), q.get("type", "Inquiry").title()),
            "name": q.get("name", ""),
            "detail": q.get("message") or (q.get("context") or {}).get("summary") or "",
            "created_at": q.get("created_at"),
        })
    feed.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return {"items": feed[:50]}

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

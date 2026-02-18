from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Union
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
import random
import subprocess
import csv
import io

# SNMP imports - handle different pysnmp versions
try:
    from pysnmp.hlapi.asyncio import (
        get_cmd as snmp_get_cmd, SnmpEngine, CommunityData, UdpTransportTarget,
        ContextData, ObjectType, ObjectIdentity
    )
except ImportError:
    from pysnmp.hlapi.asyncio import (
        getCmd as snmp_get_cmd, SnmpEngine, CommunityData, UdpTransportTarget,
        ContextData, ObjectType, ObjectIdentity
    )

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Background scheduler state
scheduler_task = None
SCHEDULER_INTERVAL = 30  # Check every 30 seconds for devices due for polling

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def auto_poll_scheduler():
    """Background task that continuously checks and polls devices based on their intervals"""
    logger.info("Auto-poll scheduler started")
    while True:
        try:
            await asyncio.sleep(SCHEDULER_INTERVAL)
            now = datetime.now(timezone.utc)
            
            # Find devices due for polling
            devices = await db.devices.find({"auto_poll": True}, {"_id": 0}).to_list(1000)
            
            for device in devices:
                interval = device.get('polling_interval', 300)
                last_polled = device.get('last_polled')
                
                should_poll = False
                if last_polled is None:
                    should_poll = True
                else:
                    if isinstance(last_polled, str):
                        last_polled = datetime.fromisoformat(last_polled)
                    if (now - last_polled).total_seconds() >= interval:
                        should_poll = True
                
                if should_poll:
                    logger.info(f"Auto-polling device: {device['name']}")
                    asyncio.create_task(poll_single_device(device))
                    
        except Exception as e:
            logger.error(f"Error in auto-poll scheduler: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - start/stop background scheduler"""
    global scheduler_task
    # Startup
    scheduler_task = asyncio.create_task(auto_poll_scheduler())
    logger.info("Application startup complete - scheduler running")
    yield
    # Shutdown
    if scheduler_task:
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass
    client.close()
    logger.info("Application shutdown complete")

# Create the main app with lifespan
app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# =============== MODELS ===============

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    color: str = "#0EA5E9"
    icon: str = "server"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: str = "#0EA5E9"
    icon: str = "server"

class OIDConfig(BaseModel):
    oid: str
    name: str
    unit: str = ""
    data_type: str = "gauge"  # gauge, counter, mbps, kbps, bytes, percentage, text
    threshold_warning: Optional[float] = None
    threshold_critical: Optional[float] = None
    threshold_operator: str = "gt"  # gt (greater than), lt (less than)

class SNMPTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    brand: Optional[str] = ""  # e.g., Cisco, Ubiquiti, Mikrotik
    oids: List[OIDConfig] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SNMPTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    brand: Optional[str] = ""
    oids: List[OIDConfig] = []

class SNMPTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    oids: Optional[List[OIDConfig]] = None

class Device(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    ip_address: str
    category_id: str
    community_string: str = "public"
    oids: List[OIDConfig] = []
    ping_enabled: bool = True
    snmp_enabled: bool = True
    polling_interval: int = 300  # seconds (default 5 minutes)
    auto_poll: bool = True
    status: str = "unknown"  # online, offline, warning, unknown
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen: Optional[datetime] = None
    last_polled: Optional[datetime] = None

class DeviceCreate(BaseModel):
    name: str
    ip_address: str
    category_id: str
    community_string: str = "public"
    oids: List[OIDConfig] = []
    ping_enabled: bool = True
    snmp_enabled: bool = True
    polling_interval: int = 300
    auto_poll: bool = True

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: Optional[str] = None
    category_id: Optional[str] = None
    community_string: Optional[str] = None
    oids: Optional[List[OIDConfig]] = None
    ping_enabled: Optional[bool] = None
    snmp_enabled: Optional[bool] = None
    polling_interval: Optional[int] = None
    auto_poll: Optional[bool] = None

class MonitoringData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    metric_type: str  # ping, snmp
    metric_name: str
    value: Union[float, str, int]  # Support numeric and text values
    unit: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Alert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    device_name: str
    alert_type: str  # threshold_warning, threshold_critical, device_down, device_up
    metric_name: str
    message: str
    value: Optional[float] = None
    threshold: Optional[float] = None
    acknowledged: bool = False
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AlertCreate(BaseModel):
    device_id: str
    device_name: str
    alert_type: str
    metric_name: str
    message: str
    value: Optional[float] = None
    threshold: Optional[float] = None

class PinnedGraph(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    device_name: str
    metric_type: str  # ping or snmp
    metric_name: str
    position: int = 0  # Order on dashboard
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PinnedGraphCreate(BaseModel):
    device_id: str
    device_name: str
    metric_type: str
    metric_name: str
    position: int = 0

# =============== HELPER FUNCTIONS ===============

def serialize_datetime(obj):
    """Convert datetime to ISO string for MongoDB storage"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def serialize_doc(doc: dict) -> dict:
    """Serialize document for MongoDB"""
    result = {}
    for key, value in doc.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [serialize_doc(item) if isinstance(item, dict) else serialize_datetime(item) for item in value]
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        else:
            result[key] = value
    return result

def deserialize_datetime(doc: dict, fields: List[str]) -> dict:
    """Convert ISO strings back to datetime"""
    for field in fields:
        if field in doc and isinstance(doc[field], str):
            doc[field] = datetime.fromisoformat(doc[field])
    return doc

async def ping_host(ip: str) -> Optional[float]:
    """Ping a host and return response time in ms"""
    try:
        result = subprocess.run(
            ['ping', '-c', '1', '-W', '2', ip],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            # Parse ping output for time
            output = result.stdout
            if 'time=' in output:
                time_str = output.split('time=')[1].split()[0]
                return float(time_str.replace('ms', ''))
        return None
    except Exception as e:
        logger.error(f"Ping error for {ip}: {e}")
        return None

async def get_snmp_value(ip: str, community: str, oid: str) -> Optional[Union[str, float, int]]:
    """Perform actual SNMP GET request to retrieve OID value"""
    try:
        logger.info(f"SNMP GET: {ip} community={community} oid={oid}")
        
        # Create transport target using async create() method
        transport = await UdpTransportTarget.create((ip, 161))
        
        # Perform SNMP GET (SNMPv2c with mpModel=1)
        error_indication, error_status, error_index, var_binds = await snmp_get_cmd(
            SnmpEngine(),
            CommunityData(community, mpModel=1),
            transport,
            ContextData(),
            ObjectType(ObjectIdentity(oid))
        )
        
        if error_indication:
            logger.warning(f"SNMP error indication for {ip} OID {oid}: {error_indication}")
            return None
        elif error_status:
            logger.warning(f"SNMP error status for {ip} OID {oid}: {error_status.prettyPrint()} at {error_index}")
            return None
        else:
            for var_bind in var_binds:
                # Get the raw value
                raw_value = var_bind[1]
                value_str = raw_value.prettyPrint()
                
                logger.info(f"SNMP response for {ip} OID {oid}: type={type(raw_value).__name__}, value={value_str}")
                
                # Check for NoSuchObject or NoSuchInstance
                if 'noSuch' in type(raw_value).__name__.lower() or 'noSuch' in value_str.lower():
                    logger.warning(f"SNMP OID {oid} not found on {ip}")
                    return None
                
                # Try to parse as number first
                try:
                    # Handle Counter, Gauge, Integer, Counter64 types
                    if hasattr(raw_value, 'hasValue') and raw_value.hasValue():
                        int_val = int(raw_value)
                        logger.info(f"SNMP numeric value for {ip} OID {oid}: {int_val}")
                        return float(int_val)
                except (ValueError, TypeError):
                    pass
                
                # Try parsing the string representation as a number
                try:
                    float_val = float(value_str)
                    logger.info(f"SNMP parsed float value for {ip} OID {oid}: {float_val}")
                    return float_val
                except ValueError:
                    # Return as string for text values (like hostname, sysDescr, etc.)
                    logger.info(f"SNMP text value for {ip} OID {oid}: {value_str}")
                    return value_str
                    
        return None
    except Exception as e:
        logger.error(f"SNMP exception for {ip} OID {oid}: {e}")
        return None

# =============== CATEGORY ENDPOINTS ===============

@api_router.get("/")
async def root():
    return {"message": "NetGraph Hub API - Network Monitoring Tool"}

@api_router.get("/scheduler/status")
async def get_scheduler_status():
    """Get the status of the auto-poll scheduler"""
    global scheduler_task
    is_running = scheduler_task is not None and not scheduler_task.done()
    
    # Count devices with auto-poll enabled
    auto_poll_count = await db.devices.count_documents({"auto_poll": True})
    
    # Get next device due for poll
    now = datetime.now(timezone.utc)
    devices = await db.devices.find({"auto_poll": True}, {"_id": 0, "name": 1, "polling_interval": 1, "last_polled": 1}).to_list(100)
    
    next_poll_device = None
    min_seconds_until_poll = float('inf')
    
    for device in devices:
        interval = device.get('polling_interval', 300)
        last_polled = device.get('last_polled')
        
        if last_polled is None:
            next_poll_device = device['name']
            min_seconds_until_poll = 0
            break
        else:
            if isinstance(last_polled, str):
                last_polled = datetime.fromisoformat(last_polled)
            seconds_since_poll = (now - last_polled).total_seconds()
            seconds_until_poll = interval - seconds_since_poll
            
            if seconds_until_poll < min_seconds_until_poll:
                min_seconds_until_poll = seconds_until_poll
                next_poll_device = device['name']
    
    return {
        "scheduler_running": is_running,
        "check_interval_seconds": SCHEDULER_INTERVAL,
        "auto_poll_enabled_devices": auto_poll_count,
        "next_device_to_poll": next_poll_device,
        "seconds_until_next_poll": max(0, min_seconds_until_poll) if min_seconds_until_poll != float('inf') else None
    }

@api_router.post("/categories", response_model=Category)
async def create_category(input: CategoryCreate):
    category = Category(**input.model_dump())
    doc = serialize_doc(category.model_dump())
    await db.categories.insert_one(doc)
    return category

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    for cat in categories:
        deserialize_datetime(cat, ['created_at'])
    return categories

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    # Also delete devices in this category
    await db.devices.delete_many({"category_id": category_id})
    return {"message": "Category deleted"}

# =============== SNMP TEMPLATE ENDPOINTS ===============

@api_router.post("/templates", response_model=SNMPTemplate)
async def create_template(input: SNMPTemplateCreate):
    template_data = input.model_dump()
    template_data['oids'] = [oid.model_dump() if hasattr(oid, 'model_dump') else oid for oid in template_data['oids']]
    template = SNMPTemplate(**template_data)
    doc = serialize_doc(template.model_dump())
    await db.snmp_templates.insert_one(doc)
    return template

@api_router.get("/templates", response_model=List[SNMPTemplate])
async def get_templates():
    templates = await db.snmp_templates.find({}, {"_id": 0}).to_list(100)
    for t in templates:
        deserialize_datetime(t, ['created_at'])
    return templates

@api_router.get("/templates/{template_id}", response_model=SNMPTemplate)
async def get_template(template_id: str):
    template = await db.snmp_templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    deserialize_datetime(template, ['created_at'])
    return template

@api_router.put("/templates/{template_id}", response_model=SNMPTemplate)
async def update_template(template_id: str, input: SNMPTemplateUpdate):
    template = await db.snmp_templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if 'oids' in update_data:
        update_data['oids'] = [oid.model_dump() if hasattr(oid, 'model_dump') else oid for oid in update_data['oids']]
    
    if update_data:
        await db.snmp_templates.update_one({"id": template_id}, {"$set": update_data})
    
    updated = await db.snmp_templates.find_one({"id": template_id}, {"_id": 0})
    deserialize_datetime(updated, ['created_at'])
    return updated

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    result = await db.snmp_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

# =============== DEVICE ENDPOINTS ===============

@api_router.post("/devices", response_model=Device)
async def create_device(input: DeviceCreate):
    # Verify category exists
    category = await db.categories.find_one({"id": input.category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    device_data = input.model_dump()
    # Convert OIDConfig objects to dicts
    device_data['oids'] = [oid.model_dump() if hasattr(oid, 'model_dump') else oid for oid in device_data['oids']]
    device = Device(**device_data)
    doc = serialize_doc(device.model_dump())
    await db.devices.insert_one(doc)
    return device

@api_router.get("/devices", response_model=List[Device])
async def get_devices(category_id: Optional[str] = None):
    query = {}
    if category_id:
        query["category_id"] = category_id
    devices = await db.devices.find(query, {"_id": 0}).to_list(1000)
    for device in devices:
        deserialize_datetime(device, ['created_at', 'last_seen'])
    return devices

@api_router.get("/devices/{device_id}", response_model=Device)
async def get_device(device_id: str):
    device = await db.devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    deserialize_datetime(device, ['created_at', 'last_seen'])
    return device

@api_router.put("/devices/{device_id}", response_model=Device)
async def update_device(device_id: str, input: DeviceUpdate):
    device = await db.devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if 'oids' in update_data:
        update_data['oids'] = [oid.model_dump() if hasattr(oid, 'model_dump') else oid for oid in update_data['oids']]
    
    if update_data:
        await db.devices.update_one({"id": device_id}, {"$set": update_data})
    
    updated_device = await db.devices.find_one({"id": device_id}, {"_id": 0})
    deserialize_datetime(updated_device, ['created_at', 'last_seen'])
    return updated_device

@api_router.delete("/devices/{device_id}")
async def delete_device(device_id: str):
    result = await db.devices.delete_one({"id": device_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")
    # Also delete monitoring data and alerts
    await db.monitoring_data.delete_many({"device_id": device_id})
    await db.alerts.delete_many({"device_id": device_id})
    return {"message": "Device deleted"}

# =============== MONITORING ENDPOINTS ===============

@api_router.get("/monitoring/{device_id}")
async def get_monitoring_data(
    device_id: str,
    metric_type: Optional[str] = None,
    metric_name: Optional[str] = None,
    hours: int = 24
):
    """Get monitoring data for a device within time range"""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    query = {
        "device_id": device_id,
        "timestamp": {"$gte": cutoff.isoformat()}
    }
    if metric_type:
        query["metric_type"] = metric_type
    if metric_name:
        query["metric_name"] = metric_name
    
    data = await db.monitoring_data.find(query, {"_id": 0}).sort("timestamp", 1).to_list(10000)
    for item in data:
        deserialize_datetime(item, ['timestamp'])
    return data

@api_router.get("/monitoring/{device_id}/latest")
async def get_latest_monitoring(device_id: str):
    """Get latest monitoring values for each metric"""
    pipeline = [
        {"$match": {"device_id": device_id}},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": {"metric_type": "$metric_type", "metric_name": "$metric_name"},
            "latest": {"$first": "$$ROOT"}
        }},
        {"$replaceRoot": {"newRoot": "$latest"}},
        {"$project": {"_id": 0}}
    ]
    data = await db.monitoring_data.aggregate(pipeline).to_list(100)
    for item in data:
        deserialize_datetime(item, ['timestamp'])
    return data

@api_router.post("/monitoring/poll/{device_id}")
async def poll_device(device_id: str, background_tasks: BackgroundTasks):
    """Trigger immediate polling of a device"""
    device = await db.devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    background_tasks.add_task(poll_single_device, device)
    return {"message": "Polling started"}

async def poll_single_device(device: dict):
    """Poll a single device for metrics with auto-resolution of alerts"""
    device_id = device['id']
    ip = device['ip_address']
    device_name = device['name']
    now = datetime.now(timezone.utc)
    alerts_to_create = []
    alerts_to_resolve = []  # Track which alerts should be auto-resolved
    metrics_status = {}  # Track current status of each metric
    
    # Update last_polled timestamp
    await db.devices.update_one(
        {"id": device_id},
        {"$set": {"last_polled": now.isoformat()}}
    )
    
    # Ping if enabled
    device_online = False
    if device.get('ping_enabled', True):
        ping_result = await ping_host(ip)
        if ping_result is not None:
            device_online = True
            # Store ping data
            data = MonitoringData(
                device_id=device_id,
                metric_type="ping",
                metric_name="Response Time",
                value=ping_result,
                unit="ms"
            )
            await db.monitoring_data.insert_one(serialize_doc(data.model_dump()))
            
            # Device is back online - resolve device_down alerts
            previous_status = device.get('status')
            await db.devices.update_one(
                {"id": device_id},
                {"$set": {"status": "online", "last_seen": now.isoformat()}}
            )
            
            # If device was previously offline, mark device_down alerts for resolution
            if previous_status == 'offline':
                alerts_to_resolve.append({
                    "device_id": device_id,
                    "alert_type": "device_down"
                })
                logger.info(f"Device {device_name} is back online - resolving device_down alerts")
        else:
            # Device unreachable
            current_status = device.get('status')
            if current_status != 'offline':
                await db.devices.update_one(
                    {"id": device_id},
                    {"$set": {"status": "offline"}}
                )
                alerts_to_create.append(AlertCreate(
                    device_id=device_id,
                    device_name=device_name,
                    alert_type="device_down",
                    metric_name="Ping",
                    message=f"Device {device_name} ({ip}) is unreachable"
                ))
    else:
        # If ping is disabled, assume device is reachable for SNMP
        device_online = True
    
    # SNMP if enabled - attempt even if ping failed (some devices block ICMP but allow SNMP)
    if device.get('snmp_enabled', True) and device.get('oids'):
        community = device.get('community_string', 'public')
        snmp_success = False  # Track if at least one SNMP query succeeds
        for oid_config in device.get('oids', []):
            oid = oid_config.get('oid') if isinstance(oid_config, dict) else oid_config.oid
            name = oid_config.get('name') if isinstance(oid_config, dict) else oid_config.name
            unit = oid_config.get('unit', '') if isinstance(oid_config, dict) else getattr(oid_config, 'unit', '')
            
            value = await get_snmp_value(ip, community, oid)
            if value is not None:
                snmp_success = True  # At least one SNMP query worked
                data = MonitoringData(
                    device_id=device_id,
                    metric_type="snmp",
                    metric_name=name,
                    value=value,
                    unit=unit
                )
                await db.monitoring_data.insert_one(serialize_doc(data.model_dump()))
                
                # Only check thresholds for numeric values
                if isinstance(value, (int, float)):
                    # Check thresholds
                    threshold_warning = oid_config.get('threshold_warning') if isinstance(oid_config, dict) else getattr(oid_config, 'threshold_warning', None)
                    threshold_critical = oid_config.get('threshold_critical') if isinstance(oid_config, dict) else getattr(oid_config, 'threshold_critical', None)
                    threshold_operator = oid_config.get('threshold_operator', 'gt') if isinstance(oid_config, dict) else getattr(oid_config, 'threshold_operator', 'gt')
                    
                    # Determine current metric status based on operator
                    # gt = greater than (alert when value > threshold)
                    # lt = less than (alert when value < threshold)
                    if threshold_operator == 'lt':
                        metric_exceeds_critical = threshold_critical is not None and value <= threshold_critical
                        metric_exceeds_warning = threshold_warning is not None and value <= threshold_warning
                        op_symbol = "<"
                    else:  # gt (default)
                        metric_exceeds_critical = threshold_critical is not None and value >= threshold_critical
                        metric_exceeds_warning = threshold_warning is not None and value >= threshold_warning
                        op_symbol = ">"
                    
                    if metric_exceeds_critical:
                        alerts_to_create.append(AlertCreate(
                            device_id=device_id,
                            device_name=device_name,
                            alert_type="threshold_critical",
                            metric_name=name,
                            message=f"{name} on {device_name} is critical: {value:.2f}{unit} ({op_symbol} {threshold_critical}{unit})",
                            value=value,
                            threshold=threshold_critical
                        ))
                        metrics_status[name] = "critical"
                    elif metric_exceeds_warning:
                        alerts_to_create.append(AlertCreate(
                            device_id=device_id,
                            device_name=device_name,
                            alert_type="threshold_warning",
                            metric_name=name,
                            message=f"{name} on {device_name} is warning: {value:.2f}{unit} ({op_symbol} {threshold_warning}{unit})",
                            value=value,
                            threshold=threshold_warning
                        ))
                        metrics_status[name] = "warning"
                    else:
                        # Metric is now within normal range - resolve related alerts
                        metrics_status[name] = "normal"
                        alerts_to_resolve.append({
                            "device_id": device_id,
                            "metric_name": name,
                            "alert_type": {"$in": ["threshold_warning", "threshold_critical"]}
                        })
        
        # If SNMP succeeded but ping failed, mark device as online (some devices block ICMP)
        if snmp_success and not device_online:
            await db.devices.update_one(
                {"id": device_id},
                {"$set": {"status": "online", "last_seen": now.isoformat()}}
            )
            logger.info(f"Device {device_name} responding to SNMP but not ping - marking online")
    
    # Auto-resolve alerts that are no longer applicable
    for resolve_criteria in alerts_to_resolve:
        query = {
            "device_id": resolve_criteria["device_id"],
            "acknowledged": False,  # Only auto-resolve unacknowledged alerts
            "resolved": False  # Only resolve non-resolved alerts
        }
        if "alert_type" in resolve_criteria:
            query["alert_type"] = resolve_criteria["alert_type"]
        if "metric_name" in resolve_criteria:
            query["metric_name"] = resolve_criteria["metric_name"]
        
        # Mark alerts as resolved instead of deleting (keeps history)
        result = await db.alerts.update_many(
            query,
            {"$set": {"resolved": True, "resolved_at": now.isoformat()}}
        )
        if result.modified_count > 0:
            logger.info(f"Auto-resolved {result.modified_count} alert(s) for device {device_name}")
    
    # Create new alerts (but avoid duplicates within short time window)
    for alert_create in alerts_to_create:
        # Check if similar alert exists in last 5 minutes
        recent_cutoff = (now - timedelta(minutes=5)).isoformat()
        existing = await db.alerts.find_one({
            "device_id": alert_create.device_id,
            "alert_type": alert_create.alert_type,
            "metric_name": alert_create.metric_name,
            "acknowledged": False,
            "created_at": {"$gte": recent_cutoff}
        })
        
        if not existing:
            alert = Alert(**alert_create.model_dump())
            await db.alerts.insert_one(serialize_doc(alert.model_dump()))
            logger.info(f"Created alert: {alert_create.message}")

@api_router.post("/monitoring/poll-all")
async def poll_all_devices(background_tasks: BackgroundTasks):
    """Trigger polling of all devices"""
    devices = await db.devices.find({}, {"_id": 0}).to_list(1000)
    for device in devices:
        background_tasks.add_task(poll_single_device, device)
    return {"message": f"Polling started for {len(devices)} devices"}

@api_router.get("/monitoring/due-for-poll")
async def get_devices_due_for_poll():
    """Get devices that are due for automatic polling"""
    now = datetime.now(timezone.utc)
    devices = await db.devices.find({"auto_poll": True}, {"_id": 0}).to_list(1000)
    
    due_devices = []
    for device in devices:
        interval = device.get('polling_interval', 300)
        last_polled = device.get('last_polled')
        
        if last_polled is None:
            due_devices.append(device)
        else:
            if isinstance(last_polled, str):
                last_polled = datetime.fromisoformat(last_polled)
            if (now - last_polled).total_seconds() >= interval:
                due_devices.append(device)
    
    return due_devices

@api_router.post("/monitoring/auto-poll")
async def auto_poll_due_devices(background_tasks: BackgroundTasks):
    """Automatically poll devices that are due based on their polling interval"""
    now = datetime.now(timezone.utc)
    devices = await db.devices.find({"auto_poll": True}, {"_id": 0}).to_list(1000)
    
    polled_count = 0
    for device in devices:
        interval = device.get('polling_interval', 300)
        last_polled = device.get('last_polled')
        
        should_poll = False
        if last_polled is None:
            should_poll = True
        else:
            if isinstance(last_polled, str):
                last_polled = datetime.fromisoformat(last_polled)
            if (now - last_polled).total_seconds() >= interval:
                should_poll = True
        
        if should_poll:
            background_tasks.add_task(poll_single_device, device)
            polled_count += 1
    
    return {"message": f"Auto-polling started for {polled_count} devices"}

# =============== ALERT ENDPOINTS ===============

@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts(
    device_id: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    include_resolved: bool = False,
    hours: int = 24
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    query: Dict[str, Any] = {"created_at": {"$gte": cutoff.isoformat()}}
    if device_id:
        query["device_id"] = device_id
    if acknowledged is not None:
        query["acknowledged"] = acknowledged
    if not include_resolved:
        query["resolved"] = {"$ne": True}
    
    alerts = await db.alerts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for alert in alerts:
        deserialize_datetime(alert, ['created_at', 'resolved_at'])
    return alerts

@api_router.put("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    result = await db.alerts.update_one(
        {"id": alert_id},
        {"$set": {"acknowledged": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert acknowledged"}

@api_router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str):
    result = await db.alerts.delete_one({"id": alert_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted"}

@api_router.delete("/alerts")
async def clear_alerts(acknowledged_only: bool = True):
    query = {"acknowledged": True} if acknowledged_only else {}
    result = await db.alerts.delete_many(query)
    return {"message": f"Deleted {result.deleted_count} alerts"}

@api_router.get("/alerts/history/{device_id}")
async def get_device_alert_history(device_id: str, limit: int = 50):
    """Get alert history for a specific device (including resolved)"""
    alerts = await db.alerts.find(
        {"device_id": device_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    for alert in alerts:
        deserialize_datetime(alert, ['created_at', 'resolved_at'])
    return alerts

# =============== PINNED GRAPHS ===============

@api_router.post("/pinned-graphs", response_model=PinnedGraph)
async def create_pinned_graph(input: PinnedGraphCreate):
    """Pin a graph to the dashboard"""
    # Check if already pinned
    existing = await db.pinned_graphs.find_one({
        "device_id": input.device_id,
        "metric_name": input.metric_name
    })
    if existing:
        raise HTTPException(status_code=400, detail="This graph is already pinned")
    
    graph = PinnedGraph(**input.model_dump())
    doc = serialize_doc(graph.model_dump())
    await db.pinned_graphs.insert_one(doc)
    return graph

@api_router.get("/pinned-graphs", response_model=List[PinnedGraph])
async def get_pinned_graphs():
    """Get all pinned graphs"""
    graphs = await db.pinned_graphs.find({}, {"_id": 0}).sort("position", 1).to_list(100)
    for g in graphs:
        deserialize_datetime(g, ['created_at'])
    return graphs

@api_router.delete("/pinned-graphs/{graph_id}")
async def delete_pinned_graph(graph_id: str):
    """Unpin a graph from dashboard"""
    result = await db.pinned_graphs.delete_one({"id": graph_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pinned graph not found")
    return {"message": "Graph unpinned"}

@api_router.get("/pinned-graphs/{graph_id}/data")
async def get_pinned_graph_data(graph_id: str, hours: int = 1):
    """Get monitoring data for a pinned graph"""
    graph = await db.pinned_graphs.find_one({"id": graph_id}, {"_id": 0})
    if not graph:
        raise HTTPException(status_code=404, detail="Pinned graph not found")
    
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    data = await db.monitoring_data.find({
        "device_id": graph['device_id'],
        "metric_name": graph['metric_name'],
        "timestamp": {"$gte": cutoff.isoformat()}
    }, {"_id": 0}).sort("timestamp", 1).to_list(1000)
    
    for item in data:
        deserialize_datetime(item, ['timestamp'])
    
    return {
        "graph": graph,
        "data": data
    }

# =============== CATEGORY STATS ===============

@api_router.get("/categories/stats")
async def get_category_stats():
    """Get device counts (online/total) per category"""
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    
    result = []
    for cat in categories:
        total = await db.devices.count_documents({"category_id": cat['id']})
        online = await db.devices.count_documents({"category_id": cat['id'], "status": "online"})
        offline = await db.devices.count_documents({"category_id": cat['id'], "status": "offline"})
        
        result.append({
            "id": cat['id'],
            "name": cat['name'],
            "color": cat.get('color', '#0EA5E9'),
            "icon": cat.get('icon', 'server'),
            "total": total,
            "online": online,
            "offline": offline
        })
    
    return result

# =============== DASHBOARD STATS ===============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get overview statistics for dashboard"""
    total_devices = await db.devices.count_documents({})
    online_devices = await db.devices.count_documents({"status": "online"})
    offline_devices = await db.devices.count_documents({"status": "offline"})
    warning_devices = await db.devices.count_documents({"status": "warning"})
    
    # Get category counts
    category_pipeline = [
        {"$group": {"_id": "$category_id", "count": {"$sum": 1}}}
    ]
    category_counts = await db.devices.aggregate(category_pipeline).to_list(100)
    
    # Get active alerts count (not acknowledged and not resolved)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    active_alerts = await db.alerts.count_documents({
        "acknowledged": False,
        "resolved": {"$ne": True},
        "created_at": {"$gte": cutoff.isoformat()}
    })
    
    # Get categories for mapping
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    category_map = {cat['id']: cat['name'] for cat in categories}
    
    devices_by_category = [
        {"category": category_map.get(item['_id'], 'Unknown'), "count": item['count']}
        for item in category_counts
    ]
    
    return {
        "total_devices": total_devices,
        "online_devices": online_devices,
        "offline_devices": offline_devices,
        "warning_devices": warning_devices,
        "active_alerts": active_alerts,
        "devices_by_category": devices_by_category
    }

# =============== SEED DATA ===============

@api_router.post("/seed")
async def seed_data():
    """Seed initial categories and sample devices"""
    # Clear existing data
    await db.categories.delete_many({})
    await db.devices.delete_many({})
    await db.monitoring_data.delete_many({})
    await db.alerts.delete_many({})
    await db.snmp_templates.delete_many({})
    
    # Create SNMP templates
    templates_data = [
        {
            "name": "Cisco Router",
            "description": "Standard OIDs for Cisco IOS routers",
            "brand": "Cisco",
            "oids": [
                {"oid": "1.3.6.1.4.1.9.9.109.1.1.1.1.3.1", "name": "CPU Usage", "data_type": "percentage", "threshold_warning": 70, "threshold_critical": 90},
                {"oid": "1.3.6.1.4.1.9.9.48.1.1.1.5.1", "name": "Memory Usage", "data_type": "percentage", "threshold_warning": 75, "threshold_critical": 95},
                {"oid": "1.3.6.1.2.1.2.2.1.10.1", "name": "Interface In", "data_type": "mbps"},
                {"oid": "1.3.6.1.2.1.2.2.1.16.1", "name": "Interface Out", "data_type": "mbps"},
            ]
        },
        {
            "name": "Cisco Switch",
            "description": "Standard OIDs for Cisco Catalyst switches",
            "brand": "Cisco",
            "oids": [
                {"oid": "1.3.6.1.4.1.9.9.109.1.1.1.1.3.1", "name": "CPU Usage", "data_type": "percentage", "threshold_warning": 60, "threshold_critical": 80},
                {"oid": "1.3.6.1.4.1.9.9.48.1.1.1.5.1", "name": "Memory Usage", "data_type": "percentage", "threshold_warning": 70, "threshold_critical": 90},
            ]
        },
        {
            "name": "Ubiquiti Radio",
            "description": "Standard OIDs for Ubiquiti airMAX radios",
            "brand": "Ubiquiti",
            "oids": [
                {"oid": "1.3.6.1.4.1.41112.1.4.1.1.4.1", "name": "Signal Strength", "unit": "dBm", "data_type": "gauge", "threshold_warning": -75, "threshold_critical": -85},
                {"oid": "1.3.6.1.4.1.41112.1.4.1.1.6.1", "name": "TX Rate", "data_type": "mbps"},
                {"oid": "1.3.6.1.4.1.41112.1.4.1.1.7.1", "name": "RX Rate", "data_type": "mbps"},
                {"oid": "1.3.6.1.4.1.41112.1.4.5.1.5.1", "name": "CPU Usage", "data_type": "percentage", "threshold_warning": 70, "threshold_critical": 90},
            ]
        },
        {
            "name": "Mikrotik Router",
            "description": "Standard OIDs for Mikrotik RouterOS devices",
            "brand": "Mikrotik",
            "oids": [
                {"oid": "1.3.6.1.2.1.25.3.3.1.2.1", "name": "CPU Usage", "data_type": "percentage", "threshold_warning": 70, "threshold_critical": 90},
                {"oid": "1.3.6.1.2.1.25.2.3.1.6.65536", "name": "Memory Used", "data_type": "bytes"},
                {"oid": "1.3.6.1.2.1.2.2.1.10.1", "name": "Interface In", "data_type": "mbps"},
                {"oid": "1.3.6.1.2.1.2.2.1.16.1", "name": "Interface Out", "data_type": "mbps"},
            ]
        },
        {
            "name": "Generic Device",
            "description": "Basic SNMP OIDs for any device",
            "brand": "Generic",
            "oids": [
                {"oid": "1.3.6.1.2.1.1.3.0", "name": "Uptime", "unit": "s", "data_type": "counter"},
                {"oid": "1.3.6.1.2.1.1.5.0", "name": "Hostname", "data_type": "text"},
            ]
        }
    ]
    
    for t_data in templates_data:
        template = SNMPTemplate(**t_data)
        await db.snmp_templates.insert_one(serialize_doc(template.model_dump()))
    
    # Create categories
    categories_data = [
        {"name": "Routers", "description": "Core and edge routers", "color": "#0EA5E9", "icon": "router"},
        {"name": "Switches", "description": "Network switches", "color": "#8B5CF6", "icon": "git-branch"},
        {"name": "Backhauls", "description": "Backhaul links", "color": "#10B981", "icon": "radio"},
        {"name": "CPEs", "description": "Customer Premises Equipment", "color": "#F59E0B", "icon": "home"},
    ]
    
    created_categories = []
    for cat_data in categories_data:
        category = Category(**cat_data)
        await db.categories.insert_one(serialize_doc(category.model_dump()))
        created_categories.append(category)
    
    # Create sample devices
    sample_devices = [
        {
            "name": "Core-Router-01",
            "ip_address": "192.168.1.1",
            "category_id": created_categories[0].id,
            "community_string": "public",
            "polling_interval": 60,
            "auto_poll": True,
            "oids": [
                {"oid": "1.3.6.1.4.1.9.9.109.1.1.1.1.3.1", "name": "CPU Usage", "unit": "%", "data_type": "percentage", "threshold_warning": 70, "threshold_critical": 90},
                {"oid": "1.3.6.1.4.1.9.9.48.1.1.1.5.1", "name": "Memory Usage", "unit": "%", "data_type": "percentage", "threshold_warning": 75, "threshold_critical": 95},
            ],
            "status": "online"
        },
        {
            "name": "Edge-Router-02",
            "ip_address": "192.168.1.2",
            "category_id": created_categories[0].id,
            "community_string": "public",
            "polling_interval": 120,
            "auto_poll": True,
            "oids": [
                {"oid": "1.3.6.1.4.1.9.9.109.1.1.1.1.3.1", "name": "CPU Usage", "unit": "%", "data_type": "percentage", "threshold_warning": 70, "threshold_critical": 90},
                {"oid": "1.3.6.1.2.1.2.2.1.10.1", "name": "Interface In", "data_type": "mbps"},
                {"oid": "1.3.6.1.2.1.2.2.1.16.1", "name": "Interface Out", "data_type": "mbps"},
            ],
            "status": "online"
        },
        {
            "name": "Switch-Core-01",
            "ip_address": "192.168.2.1",
            "category_id": created_categories[1].id,
            "community_string": "public",
            "polling_interval": 300,
            "auto_poll": True,
            "oids": [
                {"oid": "1.3.6.1.4.1.9.9.109.1.1.1.1.3.1", "name": "CPU Usage", "unit": "%", "data_type": "percentage", "threshold_warning": 60, "threshold_critical": 80},
            ],
            "status": "online"
        },
        {
            "name": "Switch-Access-02",
            "ip_address": "192.168.2.2",
            "category_id": created_categories[1].id,
            "community_string": "public",
            "polling_interval": 300,
            "auto_poll": True,
            "oids": [
                {"oid": "1.3.6.1.4.1.9.9.109.1.1.1.1.3.1", "name": "CPU Usage", "unit": "%", "data_type": "percentage"},
            ],
            "status": "warning"
        },
        {
            "name": "Backhaul-Link-01",
            "ip_address": "10.0.0.1",
            "category_id": created_categories[2].id,
            "community_string": "public",
            "polling_interval": 60,
            "auto_poll": True,
            "oids": [
                {"oid": "1.3.6.1.2.1.2.2.1.10.1", "name": "Traffic In", "data_type": "mbps"},
                {"oid": "1.3.6.1.2.1.2.2.1.16.1", "name": "Traffic Out", "data_type": "mbps"},
            ],
            "status": "online"
        },
        {
            "name": "CPE-Customer-001",
            "ip_address": "172.16.1.1",
            "category_id": created_categories[3].id,
            "community_string": "public",
            "polling_interval": 600,
            "auto_poll": True,
            "oids": [
                {"oid": "1.3.6.1.2.1.1.3.0", "name": "Uptime", "unit": "s"},
            ],
            "status": "online"
        },
        {
            "name": "CPE-Customer-002",
            "ip_address": "172.16.1.2",
            "category_id": created_categories[3].id,
            "community_string": "public",
            "polling_interval": 600,
            "auto_poll": False,
            "oids": [],
            "status": "offline"
        },
    ]
    
    for device_data in sample_devices:
        device = Device(**device_data)
        await db.devices.insert_one(serialize_doc(device.model_dump()))
    
    # Generate some historical monitoring data
    now = datetime.now(timezone.utc)
    devices = await db.devices.find({}, {"_id": 0}).to_list(100)
    
    for device in devices:
        # Generate ping data for last 24 hours
        for i in range(48):
            timestamp = now - timedelta(hours=i * 0.5)
            ping_value = random.uniform(1, 50) if device.get('status') != 'offline' else None
            if ping_value:
                data = MonitoringData(
                    device_id=device['id'],
                    metric_type="ping",
                    metric_name="Response Time",
                    value=ping_value,
                    unit="ms",
                    timestamp=timestamp
                )
                await db.monitoring_data.insert_one(serialize_doc(data.model_dump()))
        
        # Generate SNMP data
        for oid_config in device.get('oids', []):
            for i in range(48):
                timestamp = now - timedelta(hours=i * 0.5)
                value = random.uniform(20, 80)
                data = MonitoringData(
                    device_id=device['id'],
                    metric_type="snmp",
                    metric_name=oid_config.get('name', 'Unknown'),
                    value=value,
                    unit=oid_config.get('unit', ''),
                    timestamp=timestamp
                )
                await db.monitoring_data.insert_one(serialize_doc(data.model_dump()))
    
    # Create sample alerts
    sample_alerts = [
        {
            "device_id": devices[0]['id'],
            "device_name": devices[0]['name'],
            "alert_type": "threshold_warning",
            "metric_name": "CPU Usage",
            "message": f"CPU Usage on {devices[0]['name']} is warning: 75.5% (threshold: 70%)",
            "value": 75.5,
            "threshold": 70
        },
        {
            "device_id": devices[6]['id'] if len(devices) > 6 else devices[0]['id'],
            "device_name": devices[6]['name'] if len(devices) > 6 else devices[0]['name'],
            "alert_type": "device_down",
            "metric_name": "Ping",
            "message": f"Device {devices[6]['name'] if len(devices) > 6 else devices[0]['name']} is unreachable"
        }
    ]
    
    for alert_data in sample_alerts:
        alert = Alert(**alert_data)
        await db.alerts.insert_one(serialize_doc(alert.model_dump()))
    
    return {"message": "Sample data seeded successfully"}

# Include router and setup middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

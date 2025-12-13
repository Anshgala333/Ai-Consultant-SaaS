"""
Health check router - Service health and status endpoints.
"""

from fastapi import APIRouter, Depends
from datetime import datetime
from typing import Dict, Any

from app.database import Database
from app import __version__

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("")
@router.get("/")
async def health_check() -> Dict[str, Any]:
    """
    Basic health check endpoint.
    Returns service status and version.
    """
    return {
        "status": "ok",
        "service": "python-data-processor",
        "version": __version__,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/detailed")
async def detailed_health_check() -> Dict[str, Any]:
    """
    Detailed health check with database connectivity.
    """
    status = {
        "status": "ok",
        "service": "python-data-processor",
        "version": __version__,
        "timestamp": datetime.utcnow().isoformat(),
        "components": {}
    }
    
    # Check database connection
    try:
        db = Database.get_db()
        await db.command("ping")
        status["components"]["mongodb"] = {
            "status": "connected",
            "healthy": True
        }
    except Exception as e:
        status["components"]["mongodb"] = {
            "status": "disconnected",
            "healthy": False,
            "error": str(e)
        }
        status["status"] = "degraded"
    
    return status


@router.get("/ready")
async def readiness_check() -> Dict[str, Any]:
    """
    Readiness check - returns 200 only if service is ready to handle requests.
    """
    try:
        db = Database.get_db()
        await db.command("ping")
        return {"ready": True}
    except Exception:
        return {"ready": False}

"""
AI Consultant Data Processor - FastAPI Application
Main entry point for the FastAPI service.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.config import settings
from app.database import connect_db, close_db
from app.routers import health_router, process_router
from app.routers.templates import router as templates_router
from app.routers.ai_analysis import router as ai_router
from app import __version__

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info("🚀 Starting AI Consultant Data Processor...")
    await connect_db()
    logger.info("✅ Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down...")
    await close_db()
    logger.info("👋 Goodbye!")


# Create FastAPI application
app = FastAPI(
    title="AI Consultant Data Processor",
    description="""
## FastAPI service for data validation, correction, and KPI computation

This service handles the data processing pipeline for the AI Consultant SaaS platform:

- **Data Validation**: Validate uploaded data before processing
- **Data Correction**: Auto-correct common data issues
- **Data Parsing**: Parse cleaned data into structured format
- **KPI Computation**: Compute core business KPIs

### Core KPIs Computed:
1. **Revenue** (weekly/monthly) - Total revenue with growth trends
2. **Wastage %** - Wastage as percentage of revenue
3. **SKU Performance** - Top and under-performing products
4. **Margin Proxy** - Estimated gross/net margins
5. **Customer Rating Trend** - From QR feedback system
6. **Staff Logs Frequency** - Staff activity metrics

### Data Flow:
1. Frontend uploads file → Node.js backend
2. Node.js sends data to this Python service
3. Python validates → corrects → parses → computes KPIs
4. Only stores in MongoDB after validation passes
5. Returns KPI snapshot to dashboard

""",
    version=__version__,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(process_router)
app.include_router(templates_router)
app.include_router(ai_router)


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with service info."""
    return {
        "service": "AI Consultant Data Processor",
        "version": __version__,
        "status": "running",
        "docs": "/docs",
        "health": "/api/health"
    }


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled error: {exc}")
    return {
        "error": True,
        "message": "An unexpected error occurred",
        "detail": str(exc) if settings.debug else None
    }

---
description: How to implement the FastAPI Python data processing and KPI computation module
---

# Data Processing & KPI Computation Module - FastAPI Python Service

This workflow guides the implementation of a Python FastAPI microservice that handles data validation, correction, parsing, and KPI computation for the AI Consultant SaaS platform.

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────────────────────────────────────────────┐
│   Frontend      │────▶│ Node.js Backend (Express)                               │
│   (React/Vite)  │     │  - Authentication                                       │
└─────────────────┘     │  - File Upload Handling                                 │
                        │  - Business Logic                                       │
                        └───────────────┬─────────────────────────────────────────┘
                                        │ HTTP/REST
                                        ▼
                        ┌─────────────────────────────────────────────────────────┐
                        │ FastAPI Python Service (NEW)                            │
                        │  - Data Validation & Correction                         │
                        │  - Data Parsing                                         │
                        │  - KPI Computation Engine                               │
                        │  - Database Storage (after validation)                  │
                        └───────────────┬─────────────────────────────────────────┘
                                        │
                                        ▼
                        ┌─────────────────────────────────────────────────────────┐
                        │ MongoDB Database                                        │
                        │  - KpiSnapshot, Upload, Business, etc.                  │
                        └─────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before starting, ensure you have:
- Python 3.10+ installed
- MongoDB running (same instance used by Node.js backend)
- Access to `.env` file with `MONGODB_URI`

---

## Step 1: Create Python Service Directory Structure

Create the following directory structure inside `backend/`:

```
backend/
├── python_service/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── config.py               # Configuration and env loading
│   │   ├── database.py             # MongoDB connection with Motor
│   │   │
│   │   ├── models/                 # Pydantic models (schemas)
│   │   │   ├── __init__.py
│   │   │   ├── upload.py           # Upload data models
│   │   │   ├── kpi.py              # KPI computation models
│   │   │   └── validation.py       # Validation result models
│   │   │
│   │   ├── services/               # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── validator.py        # Data validation service
│   │   │   ├── corrector.py        # Data correction/cleaning service
│   │   │   ├── parser.py           # Parse data into structured tables
│   │   │   └── kpi_engine.py       # KPI computation engine
│   │   │
│   │   ├── routers/                # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── process.py          # Main processing endpoint
│   │   │   └── health.py           # Health check endpoint
│   │   │
│   │   └── utils/                  # Helper utilities
│   │       ├── __init__.py
│   │       └── helpers.py
│   │
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Environment variables template
│   └── run.py                      # Server startup script
```

---

## Step 2: Install Python Dependencies

Create `requirements.txt` with the following dependencies:

```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
motor>=3.3.0                    # Async MongoDB driver
pymongo>=4.6.0
python-dotenv>=1.0.0
pandas>=2.1.0                   # Data manipulation
numpy>=1.24.0                   # Numerical operations
pydantic>=2.5.0                 # Data validation
python-multipart>=0.0.6         # File upload support
openpyxl>=3.1.0                 # Excel file support
aiofiles>=23.2.0                # Async file operations
httpx>=0.25.0                   # HTTP client for internal calls
```

// turbo
Install dependencies:
```bash
cd backend/python_service
pip install -r requirements.txt
```

---

## Step 3: Configure Database Connection

Create `app/config.py`:
- Load environment variables from `.env`
- Configure MongoDB connection string
- Set service port (default: 8001 to avoid conflict with Express on 5000)

Create `app/database.py`:
- Use Motor (async MongoDB driver) for non-blocking database operations
- Implement connection pooling
- Provide access to collections: `uploads`, `kpisnapshots`, `businesses`, `feedbacks`, `stafflogs`

---

## Step 4: Implement Pydantic Models

### `app/models/upload.py`
Define schemas for:
- `UploadData`: Raw upload data structure
- `ColumnMapping`: Column mapping configuration
- `ProcessingRequest`: Request payload for processing

### `app/models/validation.py`
Define schemas for:
- `ValidationResult`: Validation outcome with errors/warnings
- `ValidationError`: Individual error details (row, column, error message)
- `CorrectionSuggestion`: Suggested corrections for data issues

### `app/models/kpi.py`
Define schemas for:
- `RevenueKPI`: Weekly/monthly revenue metrics
- `WastageKPI`: Wastage percentage and value
- `SKUPerformance`: SKU-level metrics
- `MarginKPI`: Margin proxy calculations
- `CustomerRatingKPI`: Rating trends from QR system
- `StaffLogKPI`: Staff log frequency metrics
- `KPISnapshot`: Complete KPI snapshot for storage

---

## Step 5: Implement Data Validation Service

Create `app/services/validator.py`:

```python
class DataValidator:
    """
    Validates uploaded data before processing.
    Returns validation result with pass/fail status and error details.
    """
    
    async def validate(self, data: list, data_type: str, column_mapping: dict) -> ValidationResult:
        """
        Main validation entry point.
        
        Validations performed:
        1. Required columns present
        2. Data types correct (dates, numbers, etc.)
        3. Date formats valid and parseable
        4. Numeric values within reasonable ranges
        5. No critical missing values in required fields
        6. Duplicate detection
        7. Data consistency checks
        """
        pass
    
    async def validate_sales_data(self, data: list, mapping: dict) -> list[ValidationError]:
        """Validate sales transaction data"""
        pass
    
    async def validate_wastage_data(self, data: list, mapping: dict) -> list[ValidationError]:
        """Validate wastage records"""
        pass
    
    # ... other data type validators
```

Validation Rules:
- **Sales Data**: date (required), amount (required, positive number), sku (optional), quantity (optional)
- **Wastage Data**: date (required), sku (required), quantity (required, positive), value (optional)
- **Inventory Data**: date, sku, opening_stock, closing_stock, movement
- **Staff Data**: date, staff_name, type, description
- **Purchase Data**: date, supplier, sku, quantity, value

---

## Step 6: Implement Data Correction Service

Create `app/services/corrector.py`:

```python
class DataCorrector:
    """
    Attempts to auto-correct common data issues.
    Only corrects if confidence is high; otherwise flags for manual review.
    """
    
    async def correct(self, data: list, validation_errors: list) -> CorrectionResult:
        """
        Apply corrections based on validation errors.
        
        Corrections performed:
        1. Date format normalization (DD/MM/YYYY, MM-DD-YYYY, etc. → ISO format)
        2. Number format cleaning (remove commas, currency symbols)
        3. Whitespace trimming
        4. Case normalization for categorical fields
        5. Missing value imputation (where safe)
        """
        pass
    
    async def normalize_dates(self, data: list, date_column: str) -> list:
        """Convert various date formats to ISO format"""
        pass
    
    async def clean_numeric_values(self, data: list, columns: list[str]) -> list:
        """Remove formatting from numeric values"""
        pass
```

---

## Step 7: Implement Data Parser Service

Create `app/services/parser.py`:

```python
class DataParser:
    """
    Parses cleaned data into structured database-ready format.
    Organizes data by type and prepares for KPI computation.
    """
    
    async def parse(self, data: list, data_type: str, mapping: dict) -> ParsedData:
        """
        Parse validated data into structured format.
        
        For each data type, extracts:
        - Normalized records with consistent schema
        - Aggregation-ready structures
        - Metadata (date ranges, counts, etc.)
        """
        pass
    
    async def parse_sales_transactions(self, data: list, mapping: dict) -> list[SalesRecord]:
        """Parse sales data into SalesRecord objects"""
        pass
    
    async def aggregate_by_period(self, records: list, period: str) -> dict:
        """Aggregate records by weekly/monthly periods"""
        pass
```

---

## Step 8: Implement KPI Computation Engine

Create `app/services/kpi_engine.py`:

```python
class KPIEngine:
    """
    Computes core KPIs from parsed data.
    Matches the Node.js KpiEngine logic for consistency.
    """
    
    def __init__(self, business_id: str, db):
        self.business_id = business_id
        self.db = db
    
    async def compute_all_kpis(self, parsed_data: ParsedData, period: str = 'weekly') -> KPISnapshot:
        """
        Compute all KPIs and return a complete snapshot.
        """
        pass
    
    # Revenue KPIs
    async def compute_revenue(self, sales_data: list, period: str) -> RevenueKPI:
        """
        Compute revenue metrics:
        - Total revenue for period
        - Revenue growth vs previous period
        - Trend (up/down/stable)
        """
        pass
    
    # Wastage KPIs
    async def compute_wastage(self, wastage_data: list, sales_data: list) -> WastageKPI:
        """
        Compute wastage metrics:
        - Wastage percentage = (wastage_value / total_sales) * 100
        - Wastage value
        - Trend vs previous period
        """
        pass
    
    # SKU Performance
    async def compute_sku_performance(self, sales_data: list, wastage_data: list) -> SKUPerformance:
        """
        Compute SKU-level metrics:
        - Top performers (by revenue, quantity)
        - Under performers
        - SKU count
        - Revenue per SKU
        """
        pass
    
    # Margin Proxy
    async def compute_margin_proxy(self, sales_data: list, purchase_data: list) -> MarginKPI:
        """
        Compute margin approximation:
        - Gross margin = (revenue - cost) / revenue
        - If cost not available, use industry benchmarks or proxy
        """
        pass
    
    # Customer Rating Trend
    async def compute_customer_rating_trend(self, start_date: datetime, end_date: datetime) -> CustomerRatingKPI:
        """
        Compute customer rating metrics from QR feedback system:
        - Average rating for period
        - Rating trend vs previous period
        - Feedback count
        """
        pass
    
    # Staff Log Frequency
    async def compute_staff_logs(self, start_date: datetime, end_date: datetime) -> StaffLogKPI:
        """
        Compute staff log metrics:
        - Total logs count
        - Issues reported
        - Log frequency trend
        """
        pass
    
    # Health Score
    async def compute_health_score(self, kpis: dict) -> float:
        """
        Compute overall health score (0-100) based on all KPIs.
        Weighted formula matching Node.js logic.
        """
        pass
```

---

## Step 9: Implement API Endpoints

### `app/routers/process.py`

```python
from fastapi import APIRouter, HTTPException
from app.services.validator import DataValidator
from app.services.corrector import DataCorrector
from app.services.parser import DataParser
from app.services.kpi_engine import KPIEngine

router = APIRouter(prefix="/api/process", tags=["Processing"])

@router.post("/validate")
async def validate_data(request: ProcessingRequest):
    """
    Step 1: Validate uploaded data.
    Returns validation result with errors/warnings.
    Does NOT store anything in database.
    """
    validator = DataValidator()
    result = await validator.validate(
        data=request.data,
        data_type=request.data_type,
        column_mapping=request.column_mapping
    )
    return result

@router.post("/correct")
async def correct_data(request: CorrectionRequest):
    """
    Step 2: Apply corrections to data.
    Returns corrected data and correction log.
    Does NOT store anything in database.
    """
    corrector = DataCorrector()
    result = await corrector.correct(
        data=request.data,
        validation_errors=request.validation_errors
    )
    return result

@router.post("/process")
async def process_and_store(request: ProcessingRequest):
    """
    Step 3: Full processing pipeline.
    
    Flow:
    1. Validate data
    2. If validation fails → return errors, DO NOT store
    3. If validation passes → correct minor issues
    4. Parse into structured format
    5. Compute KPIs
    6. Store in database
    7. Return success with KPI summary
    """
    # Validate
    validator = DataValidator()
    validation_result = await validator.validate(...)
    
    if not validation_result.is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Validation failed",
                "errors": validation_result.errors
            }
        )
    
    # Correct
    corrector = DataCorrector()
    corrected_data = await corrector.correct(...)
    
    # Parse
    parser = DataParser()
    parsed_data = await parser.parse(...)
    
    # Compute KPIs
    kpi_engine = KPIEngine(business_id, db)
    kpi_snapshot = await kpi_engine.compute_all_kpis(parsed_data)
    
    # Store in database (only after validation succeeds!)
    await db.kpisnapshots.insert_one(kpi_snapshot.dict())
    await db.uploads.update_one(
        {"_id": upload_id},
        {"$set": {"status": "completed", "summary.processedAt": datetime.utcnow()}}
    )
    
    return {"success": True, "kpi_snapshot": kpi_snapshot}

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "python-data-processor"}
```

---

## Step 10: Create Main FastAPI Application

Create `app/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import process, health
from app.database import connect_db, close_db

app = FastAPI(
    title="AI Consultant Data Processor",
    description="FastAPI service for data validation, correction, and KPI computation",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(process.router)
app.include_router(health.router)

@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await close_db()
```

---

## Step 11: Create Startup Script

Create `run.py`:

```python
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True  # Enable hot reload for development
    )
```

---

## Step 12: Integrate with Node.js Backend

Update the Node.js backend to call the Python service:

### In `backend/routes/upload.js`:

```javascript
const axios = require('axios');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';

// After file upload and column mapping, call Python service
async function processWithPythonService(uploadId, data, dataType, columnMapping) {
    try {
        // Call Python service for processing
        const response = await axios.post(`${PYTHON_SERVICE_URL}/api/process/process`, {
            upload_id: uploadId,
            business_id: businessId,
            data: data,
            data_type: dataType,
            column_mapping: columnMapping
        });
        
        return response.data;
    } catch (error) {
        if (error.response?.status === 400) {
            // Validation failed
            return {
                success: false,
                errors: error.response.data.detail.errors
            };
        }
        throw error;
    }
}
```

---

## Step 13: Environment Configuration

Create `backend/python_service/.env.example`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/ai_consultant

# Service Configuration
PORT=8001
DEBUG=true

# Node.js Backend URL (for callbacks if needed)
NODE_BACKEND_URL=http://localhost:5000
```

---

## Step 14: Run the Python Service

// turbo
Start the Python service:
```bash
cd backend/python_service
python run.py
```

The service will be available at `http://localhost:8001`.

API Documentation will be auto-generated at:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

---

## Step 15: Testing

### Unit Tests
Create `backend/python_service/tests/`:
- `test_validator.py`: Test validation logic
- `test_corrector.py`: Test correction logic
- `test_parser.py`: Test parsing logic
- `test_kpi_engine.py`: Test KPI computation

// turbo
Run tests:
```bash
cd backend/python_service
pytest tests/ -v
```

### Integration Tests
Test the full flow:
1. Upload file via Node.js API
2. Send data to Python service
3. Verify validation
4. Verify KPI computation
5. Verify database storage

---

## KPI Computation Reference

### Revenue (Weekly/Monthly)
```python
revenue_total = sum(row['amount'] for row in sales_data if in_period(row['date']))
previous_revenue = get_previous_period_revenue()
revenue_growth = ((revenue_total - previous_revenue) / previous_revenue) * 100 if previous_revenue else 0
trend = 'up' if revenue_growth > 2 else 'down' if revenue_growth < -2 else 'stable'
```

### Wastage %
```python
wastage_value = sum(row['value'] for row in wastage_data if in_period(row['date']))
wastage_percentage = (wastage_value / revenue_total) * 100 if revenue_total else 0
```

### SKU Performance
```python
sku_revenue = defaultdict(float)
for row in sales_data:
    sku_revenue[row['sku']] += row['amount']
    
top_performers = sorted(sku_revenue.items(), key=lambda x: x[1], reverse=True)[:10]
under_performers = sorted(sku_revenue.items(), key=lambda x: x[1])[:10]
```

### Margin Proxy
```python
# If purchase data available:
cost = sum(row['value'] for row in purchase_data if in_period(row['date']))
margin = ((revenue_total - cost) / revenue_total) * 100

# If not available, use baseline from business profile
margin = business.baselineMetrics.averageMargin or 30  # Default 30%
```

### Customer Rating Trend
```python
feedback_ratings = db.feedbacks.find({'business': business_id, 'date': {'$gte': start, '$lt': end}})
avg_rating = mean(f['rating'] for f in feedback_ratings) if feedback_ratings else 0
```

### Staff Log Frequency
```python
staff_logs = db.stafflogs.find({'business': business_id, 'date': {'$gte': start, '$lt': end}})
log_count = len(staff_logs)
issues_reported = len([l for l in staff_logs if l.get('type') == 'issue'])
```

---

## Summary

This workflow creates a robust FastAPI Python microservice that:

1. ✅ Validates uploaded data before any database operations
2. ✅ Corrects common data issues automatically
3. ✅ Parses cleaned data into structured tables
4. ✅ Computes all core KPIs (revenue, wastage, SKU performance, margin, ratings, staff logs)
5. ✅ Only stores data in MongoDB after validation succeeds
6. ✅ Integrates seamlessly with the existing Node.js backend
7. ✅ Provides fast async performance with FastAPI and Motor

---

## Next Steps After Implementation

1. Add WebSocket support for real-time processing progress updates
2. Implement batch processing for large files
3. Add caching layer (Redis) for frequently accessed KPIs
4. Create background job queue for async processing
5. Add data export functionality

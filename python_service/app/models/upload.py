"""
Upload data models - Schemas for processing requests and upload data.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class DataType(str, Enum):
    """Supported data types for upload processing."""
    SALES = "sales"
    PURCHASE = "purchase"
    WASTAGE = "wastage"
    INVENTORY = "inventory"
    STAFF = "staff"


class UploadStatus(str, Enum):
    """Upload processing status."""
    PENDING = "pending"
    MAPPING = "mapping"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ColumnMapping(BaseModel):
    """Column mapping configuration for data processing."""
    date: Optional[str] = None
    amount: Optional[str] = None
    sku: Optional[str] = None
    quantity: Optional[str] = None
    value: Optional[str] = None
    supplier: Optional[str] = None
    staff_name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    opening_stock: Optional[str] = None
    closing_stock: Optional[str] = None
    movement: Optional[str] = None
    outlet: Optional[str] = None
    
    class Config:
        extra = "allow"  # Allow additional custom mappings


class ProcessingRequest(BaseModel):
    """Request payload for data processing."""
    upload_id: str = Field(..., description="MongoDB ObjectId of the upload")
    business_id: str = Field(..., description="MongoDB ObjectId of the business")
    data: List[Dict[str, Any]] = Field(..., description="Raw data rows from uploaded file")
    data_type: DataType = Field(..., description="Type of data being processed")
    column_mapping: Dict[str, str] = Field(..., description="Column mapping configuration")
    period: str = Field(default="weekly", description="KPI aggregation period (weekly/monthly)")


class ValidationRequest(BaseModel):
    """Request payload for validation only (without storage)."""
    data: List[Dict[str, Any]] = Field(..., description="Raw data rows to validate")
    data_type: DataType = Field(..., description="Type of data being validated")
    column_mapping: Dict[str, str] = Field(..., description="Column mapping configuration")


class CorrectionRequest(BaseModel):
    """Request payload for data correction."""
    data: List[Dict[str, Any]] = Field(..., description="Raw data rows to correct")
    data_type: DataType = Field(..., description="Type of data")
    column_mapping: Dict[str, str] = Field(..., description="Column mapping configuration")
    validation_errors: List[Dict[str, Any]] = Field(default=[], description="Validation errors to address")


class UploadSummary(BaseModel):
    """Summary of upload processing results."""
    total_rows: int = Field(default=0)
    valid_rows: int = Field(default=0)
    error_rows: int = Field(default=0)
    processed_at: Optional[datetime] = None


class ProcessedRow(BaseModel):
    """Single processed data row."""
    row_number: int
    data: Dict[str, Any]
    is_valid: bool = True
    errors: List[str] = Field(default_factory=list)
    corrections_applied: List[str] = Field(default_factory=list)


class ParsedData(BaseModel):
    """Container for parsed and structured data."""
    data_type: DataType
    records: List[Dict[str, Any]]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    date_range: Optional[Dict[str, datetime]] = None
    record_count: int = 0
    
    class Config:
        arbitrary_types_allowed = True

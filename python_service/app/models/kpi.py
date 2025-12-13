"""
KPI models - Schemas for KPI computation and storage.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class TrendDirection(str, Enum):
    """Trend direction for KPI metrics."""
    UP = "up"
    DOWN = "down"
    STABLE = "stable"


class Period(str, Enum):
    """Time period for KPI aggregation."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


# ============ Core KPI Models ============

class RevenueKPI(BaseModel):
    """Revenue metrics."""
    total: float = Field(default=0, description="Total revenue for the period")
    growth: float = Field(default=0, description="Growth percentage vs previous period")
    trend: TrendDirection = Field(default=TrendDirection.STABLE)
    previous_period_total: Optional[float] = None


class WastageKPI(BaseModel):
    """Wastage metrics."""
    percentage: float = Field(default=0, ge=0, le=100, description="Wastage as % of revenue")
    value: float = Field(default=0, description="Total wastage value")
    trend: TrendDirection = Field(default=TrendDirection.STABLE)
    item_count: int = Field(default=0, description="Number of wastage items")


class MarginKPI(BaseModel):
    """Margin metrics."""
    gross: float = Field(default=0, description="Gross margin %")
    net: float = Field(default=0, description="Net margin %")
    proxy: float = Field(default=0, description="Margin proxy when exact data unavailable")


class SKUPerformer(BaseModel):
    """SKU performance data."""
    sku: str
    revenue: float = 0
    quantity: int = 0
    margin: Optional[float] = None


class SKUPerformanceKPI(BaseModel):
    """SKU-level performance metrics."""
    total_skus: int = Field(default=0)
    top_performers: List[SKUPerformer] = Field(default_factory=list)
    under_performers: List[SKUPerformer] = Field(default_factory=list)
    revenue_per_sku: float = Field(default=0)


class CustomerRatingKPI(BaseModel):
    """Customer rating metrics from QR feedback system."""
    average_rating: float = Field(default=0, ge=0, le=5)
    rating_trend: TrendDirection = Field(default=TrendDirection.STABLE)
    feedback_count: int = Field(default=0)
    positive_count: int = Field(default=0, description="Ratings >= 4")
    negative_count: int = Field(default=0, description="Ratings <= 2")


class StaffLogKPI(BaseModel):
    """Staff log frequency metrics."""
    logs_count: int = Field(default=0)
    issues_reported: int = Field(default=0)
    log_frequency_trend: TrendDirection = Field(default=TrendDirection.STABLE)
    active_staff_count: int = Field(default=0)


# ============ Complete KPI Snapshot ============

class KPISnapshot(BaseModel):
    """Complete KPI snapshot for a time period."""
    # Identifiers
    business_id: str = Field(..., description="Business ObjectId")
    outlet_id: Optional[str] = Field(default=None, description="Outlet ObjectId if applicable")
    
    # Time period
    period: Period = Field(default=Period.WEEKLY)
    period_start: datetime
    period_end: datetime
    
    # Core KPIs
    revenue: RevenueKPI = Field(default_factory=RevenueKPI)
    wastage: WastageKPI = Field(default_factory=WastageKPI)
    margin: MarginKPI = Field(default_factory=MarginKPI)
    sku_metrics: SKUPerformanceKPI = Field(default_factory=SKUPerformanceKPI)
    customer_metrics: CustomerRatingKPI = Field(default_factory=CustomerRatingKPI)
    staff_metrics: StaffLogKPI = Field(default_factory=StaffLogKPI)
    
    # Health Score
    period_health_score: float = Field(default=0, ge=0, le=100)
    
    # Flags
    is_baseline: bool = Field(default=False)
    
    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
    
    def to_mongo_dict(self) -> Dict[str, Any]:
        """Convert to MongoDB-compatible dictionary."""
        from bson import ObjectId
        
        data = self.model_dump()
        
        # Convert string IDs to ObjectId
        if self.business_id:
            data["business"] = ObjectId(self.business_id)
        if self.outlet_id:
            data["outlet"] = ObjectId(self.outlet_id)
        
        # Remove redundant ID fields
        data.pop("business_id", None)
        data.pop("outlet_id", None)
        
        # Add timestamps
        now = datetime.utcnow()
        data["createdAt"] = data.get("created_at") or now
        data["updatedAt"] = now
        data.pop("created_at", None)
        data.pop("updated_at", None)
        
        return data


class KPIComputationResult(BaseModel):
    """Result of KPI computation operation."""
    success: bool
    snapshot: Optional[KPISnapshot] = None
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    computation_time_ms: float = Field(default=0)


class ProcessingResult(BaseModel):
    """Complete result of data processing operation."""
    success: bool
    message: str
    upload_id: str
    business_id: str
    
    # Validation results
    validation_passed: bool = True
    validation_errors: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Processing summary
    total_rows: int = 0
    valid_rows: int = 0
    corrected_rows: int = 0
    
    # KPI results
    kpi_snapshot: Optional[KPISnapshot] = None
    kpi_snapshot_id: Optional[str] = None
    
    # Metadata
    processing_time_ms: float = 0
    processed_at: Optional[datetime] = None

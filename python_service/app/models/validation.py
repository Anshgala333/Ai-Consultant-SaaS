"""
Validation models - Schemas for validation results and error reporting.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class ValidationSeverity(str, Enum):
    """Severity level of validation issues."""
    ERROR = "error"      # Critical - blocks processing
    WARNING = "warning"  # Non-critical - can proceed with caution
    INFO = "info"        # Informational - no action needed


class ValidationErrorType(str, Enum):
    """Types of validation errors."""
    MISSING_REQUIRED = "missing_required"
    INVALID_TYPE = "invalid_type"
    INVALID_FORMAT = "invalid_format"
    OUT_OF_RANGE = "out_of_range"
    DUPLICATE = "duplicate"
    INCONSISTENT = "inconsistent"
    FUTURE_DATE = "future_date"
    NEGATIVE_VALUE = "negative_value"


class ValidationError(BaseModel):
    """Individual validation error details."""
    row: int = Field(..., description="Row number (1-indexed)")
    column: str = Field(..., description="Column name with the error")
    error_type: ValidationErrorType = Field(..., description="Type of validation error")
    message: str = Field(..., description="Human-readable error message")
    severity: ValidationSeverity = Field(default=ValidationSeverity.ERROR)
    current_value: Optional[Any] = Field(default=None, description="The problematic value")
    expected: Optional[str] = Field(default=None, description="Expected format or value")


class CorrectionSuggestion(BaseModel):
    """Suggested correction for a validation error."""
    row: int
    column: str
    original_value: Any
    suggested_value: Any
    confidence: float = Field(ge=0, le=1, description="Confidence score 0-1")
    reason: str


class ValidationResult(BaseModel):
    """Complete validation result for a dataset."""
    is_valid: bool = Field(..., description="Whether data passed validation")
    total_rows: int = Field(default=0)
    valid_rows: int = Field(default=0)
    error_count: int = Field(default=0)
    warning_count: int = Field(default=0)
    errors: List[ValidationError] = Field(default_factory=list)
    warnings: List[ValidationError] = Field(default_factory=list)
    summary: Dict[str, Any] = Field(default_factory=dict)
    
    @property
    def has_errors(self) -> bool:
        """Check if there are any blocking errors."""
        return len([e for e in self.errors if e.severity == ValidationSeverity.ERROR]) > 0
    
    def add_error(self, error: ValidationError) -> None:
        """Add a validation error."""
        if error.severity == ValidationSeverity.ERROR:
            self.errors.append(error)
            self.error_count += 1
        else:
            self.warnings.append(error)
            self.warning_count += 1


class CorrectionResult(BaseModel):
    """Result of data correction operation."""
    success: bool
    corrected_data: List[Dict[str, Any]] = Field(default_factory=list)
    corrections_applied: int = Field(default=0)
    corrections_skipped: int = Field(default=0)
    correction_log: List[CorrectionSuggestion] = Field(default_factory=list)
    remaining_errors: List[ValidationError] = Field(default_factory=list)


class DataQualityScore(BaseModel):
    """Overall data quality assessment."""
    overall_score: float = Field(ge=0, le=100, description="Quality score 0-100")
    completeness: float = Field(ge=0, le=100, description="% of non-null required fields")
    accuracy: float = Field(ge=0, le=100, description="% of values passing format validation")
    consistency: float = Field(ge=0, le=100, description="% of consistent values")
    timeliness: float = Field(ge=0, le=100, description="% of dates within expected range")
    breakdown: Dict[str, float] = Field(default_factory=dict)

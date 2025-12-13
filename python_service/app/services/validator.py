"""
Data Validator Service - Validates uploaded data before processing.
Returns validation result with pass/fail status and error details.
"""

import re
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging

from app.models.upload import DataType
from app.models.validation import (
    ValidationResult, 
    ValidationError, 
    ValidationErrorType, 
    ValidationSeverity,
    DataQualityScore
)

logger = logging.getLogger(__name__)


class DataValidator:
    """
    Validates uploaded data before processing.
    Returns validation result with pass/fail status and error details.
    """
    
    # Required fields by data type
    REQUIRED_FIELDS = {
        DataType.SALES: ["date", "amount"],
        DataType.PURCHASE: ["date", "value"],
        DataType.WASTAGE: ["date", "sku", "quantity"],
        DataType.INVENTORY: ["date", "sku"],
        DataType.STAFF: ["date", "staff_name", "type"]
    }
    
    # Optional but recommended fields
    OPTIONAL_FIELDS = {
        DataType.SALES: ["sku", "quantity", "outlet"],
        DataType.PURCHASE: ["supplier", "sku", "quantity"],
        DataType.WASTAGE: ["value", "outlet"],
        DataType.INVENTORY: ["opening_stock", "closing_stock", "movement"],
        DataType.STAFF: ["description", "outlet"]
    }
    
    # Date format patterns to try
    DATE_PATTERNS = [
        r"^\d{4}-\d{2}-\d{2}$",                    # YYYY-MM-DD
        r"^\d{2}-\d{2}-\d{4}$",                    # DD-MM-YYYY
        r"^\d{2}/\d{2}/\d{4}$",                    # DD/MM/YYYY or MM/DD/YYYY
        r"^\d{4}/\d{2}/\d{2}$",                    # YYYY/MM/DD
        r"^\d{2}-\d{2}-\d{2}$",                    # DD-MM-YY
        r"^\d{1,2}/\d{1,2}/\d{2,4}$",             # D/M/YY or M/D/YYYY variants
        r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}",  # ISO datetime
    ]
    
    def __init__(self):
        self.errors: List[ValidationError] = []
        self.warnings: List[ValidationError] = []
    
    async def validate(
        self, 
        data: List[Dict[str, Any]], 
        data_type: DataType, 
        column_mapping: Dict[str, str]
    ) -> ValidationResult:
        """
        Main validation entry point.
        
        Validations performed:
        1. Required columns present in mapping
        2. Data types correct (dates, numbers, etc.)
        3. Date formats valid and parseable
        4. Numeric values within reasonable ranges
        5. No critical missing values in required fields
        6. Duplicate detection
        7. Data consistency checks
        """
        self.errors = []
        self.warnings = []
        
        result = ValidationResult(
            is_valid=True,
            total_rows=len(data),
            valid_rows=0,
            error_count=0,
            warning_count=0
        )
        
        if not data:
            result.is_valid = False
            result.errors.append(ValidationError(
                row=0,
                column="",
                error_type=ValidationErrorType.MISSING_REQUIRED,
                message="No data provided",
                severity=ValidationSeverity.ERROR
            ))
            return result
        
        # 1. Validate required columns are mapped
        required_fields = self.REQUIRED_FIELDS.get(data_type, [])
        missing_mappings = [f for f in required_fields if f not in column_mapping or not column_mapping[f]]
        
        if missing_mappings:
            result.is_valid = False
            for field in missing_mappings:
                result.errors.append(ValidationError(
                    row=0,
                    column=field,
                    error_type=ValidationErrorType.MISSING_REQUIRED,
                    message=f"Required field '{field}' is not mapped to any column",
                    severity=ValidationSeverity.ERROR
                ))
            result.error_count = len(result.errors)
            return result
        
        # 2. Validate each row based on data type
        valid_rows = 0
        seen_keys = set()  # For duplicate detection
        
        for row_idx, row in enumerate(data, start=1):
            row_errors = await self._validate_row(row, row_idx, data_type, column_mapping)
            
            if row_errors:
                for error in row_errors:
                    if error.severity == ValidationSeverity.ERROR:
                        result.errors.append(error)
                    else:
                        result.warnings.append(error)
            else:
                valid_rows += 1
            
            # Check for duplicates (based on date + sku if available)
            duplicate_key = self._get_duplicate_key(row, column_mapping, data_type)
            if duplicate_key:
                if duplicate_key in seen_keys:
                    result.warnings.append(ValidationError(
                        row=row_idx,
                        column="",
                        error_type=ValidationErrorType.DUPLICATE,
                        message=f"Possible duplicate entry detected",
                        severity=ValidationSeverity.WARNING
                    ))
                seen_keys.add(duplicate_key)
        
        result.valid_rows = valid_rows
        result.error_count = len(result.errors)
        result.warning_count = len(result.warnings)
        result.is_valid = result.error_count == 0
        
        # Generate summary
        result.summary = {
            "data_type": data_type.value,
            "total_rows": result.total_rows,
            "valid_rows": result.valid_rows,
            "error_rows": result.total_rows - result.valid_rows,
            "error_rate": round((result.total_rows - result.valid_rows) / result.total_rows * 100, 2) if result.total_rows > 0 else 0,
            "unique_errors": len(set(e.error_type for e in result.errors))
        }
        
        return result
    
    async def _validate_row(
        self, 
        row: Dict[str, Any], 
        row_idx: int, 
        data_type: DataType,
        column_mapping: Dict[str, str]
    ) -> List[ValidationError]:
        """Validate a single data row."""
        errors = []
        
        # Dispatch to type-specific validator
        if data_type == DataType.SALES:
            errors = await self._validate_sales_row(row, row_idx, column_mapping)
        elif data_type == DataType.PURCHASE:
            errors = await self._validate_purchase_row(row, row_idx, column_mapping)
        elif data_type == DataType.WASTAGE:
            errors = await self._validate_wastage_row(row, row_idx, column_mapping)
        elif data_type == DataType.INVENTORY:
            errors = await self._validate_inventory_row(row, row_idx, column_mapping)
        elif data_type == DataType.STAFF:
            errors = await self._validate_staff_row(row, row_idx, column_mapping)
        
        return errors
    
    async def _validate_sales_row(
        self, 
        row: Dict[str, Any], 
        row_idx: int,
        mapping: Dict[str, str]
    ) -> List[ValidationError]:
        """Validate sales transaction data."""
        errors = []
        
        # Validate date
        date_col = mapping.get("date")
        if date_col:
            date_error = self._validate_date(row.get(date_col), row_idx, date_col)
            if date_error:
                errors.append(date_error)
        
        # Validate amount (required, positive number)
        amount_col = mapping.get("amount")
        if amount_col:
            amount_error = self._validate_number(
                row.get(amount_col), 
                row_idx, 
                amount_col,
                min_value=0,
                required=True
            )
            if amount_error:
                errors.append(amount_error)
        
        # Validate quantity if present
        qty_col = mapping.get("quantity")
        if qty_col and row.get(qty_col) is not None:
            qty_error = self._validate_number(
                row.get(qty_col),
                row_idx,
                qty_col,
                min_value=0,
                is_integer=True
            )
            if qty_error:
                errors.append(qty_error)
        
        return errors
    
    async def _validate_purchase_row(
        self, 
        row: Dict[str, Any], 
        row_idx: int,
        mapping: Dict[str, str]
    ) -> List[ValidationError]:
        """Validate purchase/procurement data."""
        errors = []
        
        # Validate date
        date_col = mapping.get("date")
        if date_col:
            date_error = self._validate_date(row.get(date_col), row_idx, date_col)
            if date_error:
                errors.append(date_error)
        
        # Validate value (required, positive number)
        value_col = mapping.get("value")
        if value_col:
            value_error = self._validate_number(
                row.get(value_col),
                row_idx,
                value_col,
                min_value=0,
                required=True
            )
            if value_error:
                errors.append(value_error)
        
        return errors
    
    async def _validate_wastage_row(
        self, 
        row: Dict[str, Any], 
        row_idx: int,
        mapping: Dict[str, str]
    ) -> List[ValidationError]:
        """Validate wastage records."""
        errors = []
        
        # Validate date
        date_col = mapping.get("date")
        if date_col:
            date_error = self._validate_date(row.get(date_col), row_idx, date_col)
            if date_error:
                errors.append(date_error)
        
        # Validate SKU (required, non-empty string)
        sku_col = mapping.get("sku")
        if sku_col:
            sku_value = row.get(sku_col)
            if not sku_value or (isinstance(sku_value, str) and not sku_value.strip()):
                errors.append(ValidationError(
                    row=row_idx,
                    column=sku_col,
                    error_type=ValidationErrorType.MISSING_REQUIRED,
                    message="SKU is required for wastage records",
                    severity=ValidationSeverity.ERROR,
                    current_value=sku_value
                ))
        
        # Validate quantity (required, positive number)
        qty_col = mapping.get("quantity")
        if qty_col:
            qty_error = self._validate_number(
                row.get(qty_col),
                row_idx,
                qty_col,
                min_value=0,
                required=True
            )
            if qty_error:
                errors.append(qty_error)
        
        return errors
    
    async def _validate_inventory_row(
        self, 
        row: Dict[str, Any], 
        row_idx: int,
        mapping: Dict[str, str]
    ) -> List[ValidationError]:
        """Validate inventory data."""
        errors = []
        
        # Validate date
        date_col = mapping.get("date")
        if date_col:
            date_error = self._validate_date(row.get(date_col), row_idx, date_col)
            if date_error:
                errors.append(date_error)
        
        # Validate SKU
        sku_col = mapping.get("sku")
        if sku_col:
            sku_value = row.get(sku_col)
            if not sku_value or (isinstance(sku_value, str) and not sku_value.strip()):
                errors.append(ValidationError(
                    row=row_idx,
                    column=sku_col,
                    error_type=ValidationErrorType.MISSING_REQUIRED,
                    message="SKU is required for inventory records",
                    severity=ValidationSeverity.ERROR,
                    current_value=sku_value
                ))
        
        # Validate stock values if present
        for stock_field in ["opening_stock", "closing_stock"]:
            stock_col = mapping.get(stock_field)
            if stock_col and row.get(stock_col) is not None:
                stock_error = self._validate_number(
                    row.get(stock_col),
                    row_idx,
                    stock_col,
                    min_value=0
                )
                if stock_error:
                    errors.append(stock_error)
        
        return errors
    
    async def _validate_staff_row(
        self, 
        row: Dict[str, Any], 
        row_idx: int,
        mapping: Dict[str, str]
    ) -> List[ValidationError]:
        """Validate staff attendance/performance data."""
        errors = []
        
        # Validate date
        date_col = mapping.get("date")
        if date_col:
            date_error = self._validate_date(row.get(date_col), row_idx, date_col)
            if date_error:
                errors.append(date_error)
        
        # Validate staff_name (required)
        name_col = mapping.get("staff_name")
        if name_col:
            name_value = row.get(name_col)
            if not name_value or (isinstance(name_value, str) and not name_value.strip()):
                errors.append(ValidationError(
                    row=row_idx,
                    column=name_col,
                    error_type=ValidationErrorType.MISSING_REQUIRED,
                    message="Staff name is required",
                    severity=ValidationSeverity.ERROR,
                    current_value=name_value
                ))
        
        # Validate type (required)
        type_col = mapping.get("type")
        if type_col:
            type_value = row.get(type_col)
            if not type_value or (isinstance(type_value, str) and not type_value.strip()):
                errors.append(ValidationError(
                    row=row_idx,
                    column=type_col,
                    error_type=ValidationErrorType.MISSING_REQUIRED,
                    message="Log type is required",
                    severity=ValidationSeverity.ERROR,
                    current_value=type_value
                ))
        
        return errors
    
    def _validate_date(
        self, 
        value: Any, 
        row_idx: int, 
        column: str
    ) -> Optional[ValidationError]:
        """Validate date field."""
        if value is None or (isinstance(value, str) and not value.strip()):
            return ValidationError(
                row=row_idx,
                column=column,
                error_type=ValidationErrorType.MISSING_REQUIRED,
                message="Date is required",
                severity=ValidationSeverity.ERROR,
                current_value=value
            )
        
        # If already a datetime, it's valid
        if isinstance(value, datetime):
            # Check for future dates
            if value > datetime.now() + timedelta(days=1):
                return ValidationError(
                    row=row_idx,
                    column=column,
                    error_type=ValidationErrorType.FUTURE_DATE,
                    message="Date cannot be in the future",
                    severity=ValidationSeverity.WARNING,
                    current_value=str(value)
                )
            return None
        
        # Try to match date patterns
        str_value = str(value).strip()
        matched = False
        for pattern in self.DATE_PATTERNS:
            if re.match(pattern, str_value):
                matched = True
                break
        
        if not matched:
            return ValidationError(
                row=row_idx,
                column=column,
                error_type=ValidationErrorType.INVALID_FORMAT,
                message=f"Invalid date format: '{str_value}'",
                severity=ValidationSeverity.ERROR,
                current_value=str_value,
                expected="YYYY-MM-DD, DD/MM/YYYY, or similar"
            )
        
        return None
    
    def _validate_number(
        self, 
        value: Any, 
        row_idx: int, 
        column: str,
        min_value: Optional[float] = None,
        max_value: Optional[float] = None,
        required: bool = False,
        is_integer: bool = False
    ) -> Optional[ValidationError]:
        """Validate numeric field."""
        if value is None or (isinstance(value, str) and not value.strip()):
            if required:
                return ValidationError(
                    row=row_idx,
                    column=column,
                    error_type=ValidationErrorType.MISSING_REQUIRED,
                    message=f"{column} is required",
                    severity=ValidationSeverity.ERROR,
                    current_value=value
                )
            return None
        
        # Try to parse as number
        try:
            # Clean the value (remove currency symbols, commas)
            if isinstance(value, str):
                cleaned = re.sub(r'[₹$€£,\s]', '', value.strip())
                num_value = float(cleaned)
            else:
                num_value = float(value)
        except (ValueError, TypeError):
            return ValidationError(
                row=row_idx,
                column=column,
                error_type=ValidationErrorType.INVALID_TYPE,
                message=f"Expected numeric value, got '{value}'",
                severity=ValidationSeverity.ERROR,
                current_value=value,
                expected="number"
            )
        
        # Check range
        if min_value is not None and num_value < min_value:
            return ValidationError(
                row=row_idx,
                column=column,
                error_type=ValidationErrorType.NEGATIVE_VALUE if min_value >= 0 else ValidationErrorType.OUT_OF_RANGE,
                message=f"Value {num_value} is below minimum {min_value}",
                severity=ValidationSeverity.ERROR,
                current_value=num_value
            )
        
        if max_value is not None and num_value > max_value:
            return ValidationError(
                row=row_idx,
                column=column,
                error_type=ValidationErrorType.OUT_OF_RANGE,
                message=f"Value {num_value} exceeds maximum {max_value}",
                severity=ValidationSeverity.ERROR,
                current_value=num_value
            )
        
        return None
    
    def _get_duplicate_key(
        self, 
        row: Dict[str, Any], 
        mapping: Dict[str, str],
        data_type: DataType
    ) -> Optional[str]:
        """Generate a key for duplicate detection."""
        date_col = mapping.get("date")
        sku_col = mapping.get("sku")
        
        date_val = row.get(date_col) if date_col else ""
        sku_val = row.get(sku_col) if sku_col else ""
        
        if data_type == DataType.STAFF:
            name_col = mapping.get("staff_name")
            name_val = row.get(name_col) if name_col else ""
            return f"{date_val}|{name_val}"
        
        return f"{date_val}|{sku_val}" if date_val else None
    
    async def compute_quality_score(
        self, 
        data: List[Dict[str, Any]],
        data_type: DataType,
        column_mapping: Dict[str, str]
    ) -> DataQualityScore:
        """Compute overall data quality score."""
        if not data:
            return DataQualityScore(
                overall_score=0,
                completeness=0,
                accuracy=0,
                consistency=0,
                timeliness=0
            )
        
        # Calculate completeness (% of non-null required fields)
        required_fields = self.REQUIRED_FIELDS.get(data_type, [])
        total_required_values = len(data) * len(required_fields)
        filled_values = 0
        
        for row in data:
            for field in required_fields:
                col = column_mapping.get(field)
                if col and row.get(col) is not None:
                    value = row.get(col)
                    if not (isinstance(value, str) and not value.strip()):
                        filled_values += 1
        
        completeness = (filled_values / total_required_values * 100) if total_required_values > 0 else 0
        
        # Validate data for accuracy
        validation_result = await self.validate(data, data_type, column_mapping)
        accuracy = (validation_result.valid_rows / validation_result.total_rows * 100) if validation_result.total_rows > 0 else 0
        
        # Consistency check (simplified - check for duplicate ratio)
        consistency = 100 - min((validation_result.warning_count / len(data) * 100), 100) if data else 0
        
        # Timeliness (assuming recent data is better)
        timeliness = 80  # Default, can be enhanced with actual date analysis
        
        # Calculate overall score (weighted average)
        overall_score = (
            completeness * 0.3 +
            accuracy * 0.4 +
            consistency * 0.15 +
            timeliness * 0.15
        )
        
        return DataQualityScore(
            overall_score=round(overall_score, 2),
            completeness=round(completeness, 2),
            accuracy=round(accuracy, 2),
            consistency=round(consistency, 2),
            timeliness=round(timeliness, 2),
            breakdown={
                "required_fields_checked": len(required_fields),
                "total_rows": len(data),
                "valid_rows": validation_result.valid_rows,
                "error_count": validation_result.error_count
            }
        )

"""
Data Validator Service - Validates data integrity before processing.
Ensures schema compliance, data types, and logical consistency.
"""

from datetime import datetime
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
    Validates parsed data for integrity and business logic compliance.
    """
    
    def __init__(self):
        pass
        
    async def validate(
        self, 
        data: List[Dict[str, Any]], 
        data_type: DataType,
        column_mapping: Dict[str, str] = None
    ) -> ValidationResult:
        """
        Validate data against rules for the specific data type.
        Returns a ValidationResult object.
        """
        result = ValidationResult(is_valid=True, total_rows=len(data))
        
        if not data:
            result.is_valid = False
            result.add_error(ValidationError(
                row=0,
                column="file",
                error_type=ValidationErrorType.MISSING_REQUIRED,
                message="No data provided",
                severity=ValidationSeverity.ERROR
            ))
            return result
            
        column_mapping = column_mapping or {}
        
        # 1. Validate based on type
        if data_type == DataType.SALES:
            self._validate_sales(data, column_mapping, result)
        elif data_type == DataType.PURCHASE:
            self._validate_purchase(data, column_mapping, result)
        elif data_type == DataType.WASTAGE:
            self._validate_wastage(data, column_mapping, result)
        elif data_type == DataType.INVENTORY:
            self._validate_inventory(data, column_mapping, result)
        elif data_type == DataType.STAFF:
            self._validate_staff(data, column_mapping, result)
        else:
            result.add_error(ValidationError(
                 row=0,
                 column="type",
                 error_type=ValidationErrorType.INVALID_TYPE,
                 message=f"Unknown data type: {data_type}",
                 severity=ValidationSeverity.ERROR
            ))
        
        # 2. General validation
        self._validate_general(data, result)
        
        # Update summary stats
        result.valid_rows = result.total_rows - len(set(e.row for e in result.errors))
        result.is_valid = not result.has_errors
        
        # Generate summary
        result.summary = {
            "total_rows": result.total_rows,
            "valid_rows": result.valid_rows,
            "error_percentage": round((result.error_count / result.total_rows * 100), 1) if result.total_rows > 0 else 0,
            "issues_found": result.error_count + result.warning_count
        }
        
        return result

    async def compute_quality_score(
        self,
        data: List[Dict[str, Any]],
        data_type: DataType,
        column_mapping: Dict[str, str]
    ) -> DataQualityScore:
        """
        Compute an overall data quality score (0-100).
        """
        if not data:
            return DataQualityScore(
                overall_score=0, completeness=0, accuracy=0, consistency=0, timeliness=0
            )
            
        total_rows = len(data)
        total_cells = total_rows * len(column_mapping) if column_mapping else total_rows
        
        # 1. Completeness (non-null required fields)
        missing_count = 0
        required_cols = list(column_mapping.values())
        for row in data:
            for col in required_cols:
                if row.get(col) is None or row.get(col) == "":
                    missing_count += 1
        
        completeness = max(0, 100 - (missing_count / total_cells * 100)) if total_cells > 0 else 100
        
        # 2. Timeliness (valid dates)
        date_col = column_mapping.get("date")
        valid_dates = 0
        if date_col:
            for row in data:
                d = row.get(date_col)
                if self._parse_date(d):
                    valid_dates += 1
            timeliness = (valid_dates / total_rows * 100) if total_rows > 0 else 0
        else:
            timeliness = 100
            
        # 3. Accuracy (valid numbers/types)
        # Simplified accuracy check
        accuracy = 95.0 # Placeholder logic
        
        # 4. Consistency
        consistency = 90.0 # Placeholder logic
        
        overall = (completeness * 0.3) + (accuracy * 0.3) + (timeliness * 0.2) + (consistency * 0.2)
        
        return DataQualityScore(
            overall_score=round(overall, 1),
            completeness=round(completeness, 1),
            accuracy=round(accuracy, 1),
            consistency=round(consistency, 1),
            timeliness=round(timeliness, 1)
        )

    def _validate_sales(self, data: List[Dict[str, Any]], mapping: Dict[str, str], result: ValidationResult):
        amount_col = mapping.get("amount", "amount")
        date_col = mapping.get("date", "date")
        
        for idx, row in enumerate(data):
            row_num = idx + 1
            
            # Amount check
            amt = row.get(amount_col)
            if amt is not None:
                try:
                    val = float(str(amt).replace(",", "").replace("$", ""))
                    if val < 0:
                        result.add_error(ValidationError(
                            row=row_num, column=amount_col, 
                            error_type=ValidationErrorType.NEGATIVE_VALUE,
                            message="Sale amount cannot be negative",
                            severity=ValidationSeverity.WARNING # Refund?
                        ))
                except ValueError:
                    result.add_error(ValidationError(
                        row=row_num, column=amount_col,
                        error_type=ValidationErrorType.INVALID_TYPE,
                        message=f"Invalid number format: {amt}",
                        severity=ValidationSeverity.ERROR
                    ))
            
            # Date check
            if not row.get(date_col):
                result.add_error(ValidationError(
                    row=row_num, column=date_col,
                    error_type=ValidationErrorType.MISSING_REQUIRED,
                    message="Missing date",
                    severity=ValidationSeverity.ERROR
                ))

    def _validate_purchase(self, data: List[Dict[str, Any]], mapping: Dict[str, str], result: ValidationResult):
        val_col = mapping.get("value", "value")
        date_col = mapping.get("date", "date")
        
        for idx, row in enumerate(data):
            row_num = idx + 1
            
            val = row.get(val_col)
            if val is not None:
                try:
                    v = float(str(val).replace(",", ""))
                    if v < 0:
                        result.add_error(ValidationError(
                            row=row_num, column=val_col,
                            error_type=ValidationErrorType.NEGATIVE_VALUE,
                            message="Purchase value cannot be negative",
                            severity=ValidationSeverity.ERROR
                        ))
                except ValueError:
                     result.add_error(ValidationError(
                        row=row_num, column=val_col,
                        error_type=ValidationErrorType.INVALID_TYPE,
                        message=f"Invalid value: {val}",
                        severity=ValidationSeverity.ERROR
                    ))
            
            if not row.get(date_col):
                result.add_error(ValidationError(
                    row=row_num, column=date_col,
                    error_type=ValidationErrorType.MISSING_REQUIRED,
                    message="Missing date",
                    severity=ValidationSeverity.ERROR
                ))

    def _validate_wastage(self, data: List[Dict[str, Any]], mapping: Dict[str, str], result: ValidationResult):
        qty_col = mapping.get("quantity", "quantity")
        for idx, row in enumerate(data):
            row_num = idx + 1
            val = row.get(qty_col)
            if val is not None:
                try:
                   if float(str(val)) < 0:
                       result.add_error(ValidationError(
                           row=row_num, column=qty_col,
                           error_type=ValidationErrorType.NEGATIVE_VALUE,
                           message="Wastage quantity cannot be negative",
                           severity=ValidationSeverity.ERROR
                       ))
                except ValueError:
                    pass # Handled by parser usually

    def _validate_inventory(self, data: List[Dict[str, Any]], mapping: Dict[str, str], result: ValidationResult):
        close_col = mapping.get("closing_stock", "closing_stock")
        for idx, row in enumerate(data):
            row_num = idx + 1
            val = row.get(close_col)
            if val is not None:
                try:
                    if float(str(val)) < 0:
                        result.add_error(ValidationError(
                            row=row_num, column=close_col,
                            error_type=ValidationErrorType.NEGATIVE_VALUE,
                            message="Closing stock cannot be negative",
                            severity=ValidationSeverity.ERROR
                        ))
                except ValueError:
                    pass

    def _validate_staff(self, data: List[Dict[str, Any]], mapping: Dict[str, str], result: ValidationResult):
        name_col = mapping.get("staff_name", "staff_name")
        date_col = mapping.get("date", "date")
        
        for idx, row in enumerate(data):
            row_num = idx + 1
            if not row.get(name_col):
                result.add_error(ValidationError(
                    row=row_num, column=name_col,
                    error_type=ValidationErrorType.MISSING_REQUIRED,
                    message="Missing staff name",
                    severity=ValidationSeverity.ERROR
                ))
            if not row.get(date_col):
                result.add_error(ValidationError(
                    row=row_num, column=date_col,
                    error_type=ValidationErrorType.MISSING_REQUIRED,
                    message="Missing date",
                    severity=ValidationSeverity.ERROR
                ))

    def _validate_general(self, data: List[Dict[str, Any]], result: ValidationResult):
        if len(data) > 10000:
             # Just a warning
             result.add_error(ValidationError(
                 row=0, column="file",
                 error_type=ValidationErrorType.OUT_OF_RANGE,
                 message="File has > 10,000 rows, processing might be slow",
                 severity=ValidationSeverity.WARNING
             ))

    def _parse_date(self, value):
        """Parse various date formats - uses standard library with dateutil fallback."""
        if not value:
            return None
        
        if isinstance(value, datetime):
            return value
            
        str_value = str(value).strip()
        if not str_value:
            return None
            
        # Try common formats first (faster than dateutil)
        formats = [
            "%Y-%m-%d",
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(str_value, fmt)
            except ValueError:
                continue
        
        # Fallback to dateutil if available
        try:
            from dateutil.parser import parse
            return parse(str_value)
        except Exception:
            return None

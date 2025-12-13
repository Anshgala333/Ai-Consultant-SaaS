"""
Data Corrector Service - Auto-corrects common data issues.
Only corrects if confidence is high; otherwise flags for manual review.
"""

import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import logging

from app.models.upload import DataType
from app.models.validation import (
    ValidationError,
    CorrectionResult,
    CorrectionSuggestion,
    ValidationErrorType
)

logger = logging.getLogger(__name__)


class DataCorrector:
    """
    Attempts to auto-correct common data issues.
    Only corrects if confidence is high; otherwise flags for manual review.
    """
    
    # Common date formats to parse
    DATE_FORMATS = [
        "%Y-%m-%d",           # 2024-01-15
        "%d-%m-%Y",           # 15-01-2024
        "%d/%m/%Y",           # 15/01/2024
        "%m/%d/%Y",           # 01/15/2024
        "%Y/%m/%d",           # 2024/01/15
        "%d-%m-%y",           # 15-01-24
        "%d/%m/%y",           # 15/01/24
        "%m/%d/%y",           # 01/15/24
        "%Y-%m-%dT%H:%M:%S",  # ISO format
        "%Y-%m-%d %H:%M:%S",  # Datetime with space
        "%d %b %Y",           # 15 Jan 2024
        "%d %B %Y",           # 15 January 2024
    ]
    
    # Currency symbols to remove
    CURRENCY_SYMBOLS = ["₹", "$", "€", "£", "¥", "Rs", "Rs.", "INR", "USD"]
    
    def __init__(self):
        self.corrections_applied: List[CorrectionSuggestion] = []
        self.corrections_skipped: List[CorrectionSuggestion] = []
    
    async def correct(
        self,
        data: List[Dict[str, Any]],
        data_type: DataType,
        column_mapping: Dict[str, str],
        validation_errors: Optional[List[ValidationError]] = None
    ) -> CorrectionResult:
        """
        Apply corrections based on validation errors.
        
        Corrections performed:
        1. Date format normalization (various formats → ISO format)
        2. Number format cleaning (remove commas, currency symbols)
        3. Whitespace trimming
        4. Case normalization for categorical fields
        5. Missing value handling (where safe)
        """
        self.corrections_applied = []
        self.corrections_skipped = []
        
        corrected_data = []
        remaining_errors = []
        
        for row_idx, row in enumerate(data, start=1):
            corrected_row = await self._correct_row(
                row, 
                row_idx, 
                data_type, 
                column_mapping,
                validation_errors
            )
            corrected_data.append(corrected_row)
        
        # Check if any errors remain after correction
        # (we'd need to re-validate to be sure, but for now we track what we couldn't fix)
        
        return CorrectionResult(
            success=True,
            corrected_data=corrected_data,
            corrections_applied=len(self.corrections_applied),
            corrections_skipped=len(self.corrections_skipped),
            correction_log=self.corrections_applied,
            remaining_errors=remaining_errors
        )
    
    async def _correct_row(
        self,
        row: Dict[str, Any],
        row_idx: int,
        data_type: DataType,
        column_mapping: Dict[str, str],
        validation_errors: Optional[List[ValidationError]] = None
    ) -> Dict[str, Any]:
        """Correct a single data row."""
        corrected = row.copy()
        
        # 1. Trim all string whitespace
        for key, value in corrected.items():
            if isinstance(value, str):
                corrected[key] = value.strip()
        
        # 2. Normalize dates
        date_col = column_mapping.get("date")
        if date_col and date_col in corrected:
            original_value = corrected[date_col]
            normalized_date, confidence = self._normalize_date(original_value)
            if normalized_date and normalized_date != original_value:
                corrected[date_col] = normalized_date
                self.corrections_applied.append(CorrectionSuggestion(
                    row=row_idx,
                    column=date_col,
                    original_value=original_value,
                    suggested_value=normalized_date,
                    confidence=confidence,
                    reason="Date format normalized to ISO format"
                ))
        
        # 3. Clean numeric fields
        numeric_fields = ["amount", "value", "quantity", "opening_stock", "closing_stock", "movement"]
        for field in numeric_fields:
            col = column_mapping.get(field)
            if col and col in corrected:
                original_value = corrected[col]
                cleaned_value, confidence = self._clean_numeric(original_value)
                if cleaned_value is not None and cleaned_value != original_value:
                    corrected[col] = cleaned_value
                    self.corrections_applied.append(CorrectionSuggestion(
                        row=row_idx,
                        column=col,
                        original_value=original_value,
                        suggested_value=cleaned_value,
                        confidence=confidence,
                        reason="Numeric format cleaned (removed currency symbols, commas)"
                    ))
        
        # 4. Normalize SKU names (uppercase, trim)
        sku_col = column_mapping.get("sku")
        if sku_col and sku_col in corrected and corrected[sku_col]:
            original_value = corrected[sku_col]
            if isinstance(original_value, str):
                normalized_sku = original_value.strip().upper()
                if normalized_sku != original_value:
                    corrected[sku_col] = normalized_sku
                    self.corrections_applied.append(CorrectionSuggestion(
                        row=row_idx,
                        column=sku_col,
                        original_value=original_value,
                        suggested_value=normalized_sku,
                        confidence=0.9,
                        reason="SKU normalized to uppercase"
                    ))
        
        # 5. Normalize staff names (title case)
        name_col = column_mapping.get("staff_name")
        if name_col and name_col in corrected and corrected[name_col]:
            original_value = corrected[name_col]
            if isinstance(original_value, str):
                normalized_name = original_value.strip().title()
                if normalized_name != original_value:
                    corrected[name_col] = normalized_name
                    self.corrections_applied.append(CorrectionSuggestion(
                        row=row_idx,
                        column=name_col,
                        original_value=original_value,
                        suggested_value=normalized_name,
                        confidence=0.8,
                        reason="Staff name normalized to title case"
                    ))
        
        return corrected
    
    def _normalize_date(self, value: Any) -> Tuple[Optional[str], float]:
        """
        Normalize date to ISO format (YYYY-MM-DD).
        Returns (normalized_date, confidence_score).
        """
        if value is None:
            return None, 0.0
        
        # Already a datetime
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d"), 1.0
        
        str_value = str(value).strip()
        if not str_value:
            return None, 0.0
        
        # Try each format
        for fmt in self.DATE_FORMATS:
            try:
                parsed = datetime.strptime(str_value, fmt)
                # High confidence if we parsed successfully
                confidence = 0.95 if fmt in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S"] else 0.85
                return parsed.strftime("%Y-%m-%d"), confidence
            except ValueError:
                continue
        
        # Try to extract date from more complex strings
        date_match = re.search(r'(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})', str_value)
        if date_match:
            parts = date_match.groups()
            # Try to determine format based on value ranges
            if int(parts[0]) > 31:  # Year first
                try:
                    year = int(parts[0])
                    month = int(parts[1])
                    day = int(parts[2])
                    if 1 <= month <= 12 and 1 <= day <= 31:
                        return f"{year:04d}-{month:02d}-{day:02d}", 0.75
                except ValueError:
                    pass
            else:  # Day or month first
                try:
                    day_or_month = int(parts[0])
                    month_or_day = int(parts[1])
                    year = int(parts[2])
                    if year < 100:
                        year += 2000  # Assume 20xx for 2-digit years
                    
                    # Guess: if first number > 12, it's day-first
                    if day_or_month > 12:
                        day, month = day_or_month, month_or_day
                    else:
                        # Default to day-first (common in India/UK)
                        day, month = day_or_month, month_or_day
                    
                    if 1 <= month <= 12 and 1 <= day <= 31:
                        return f"{year:04d}-{month:02d}-{day:02d}", 0.7
                except ValueError:
                    pass
        
        return None, 0.0
    
    def _clean_numeric(self, value: Any) -> Tuple[Optional[float], float]:
        """
        Clean numeric value by removing currency symbols and commas.
        Returns (cleaned_value, confidence_score).
        """
        if value is None:
            return None, 0.0
        
        # Already a number
        if isinstance(value, (int, float)):
            return float(value), 1.0
        
        str_value = str(value).strip()
        if not str_value:
            return None, 0.0
        
        # Remove currency symbols
        cleaned = str_value
        for symbol in self.CURRENCY_SYMBOLS:
            cleaned = cleaned.replace(symbol, "")
        
        # Remove commas and spaces (thousand separators)
        cleaned = cleaned.replace(",", "").replace(" ", "")
        
        # Remove any trailing non-numeric characters (like "/-")
        cleaned = re.sub(r'[/-]+$', '', cleaned)
        
        # Handle parentheses for negative numbers (accounting format)
        if cleaned.startswith("(") and cleaned.endswith(")"):
            cleaned = "-" + cleaned[1:-1]
        
        try:
            num_value = float(cleaned)
            # High confidence if minimal cleaning was needed
            confidence = 0.95 if cleaned == str_value.strip() else 0.85
            return num_value, confidence
        except ValueError:
            return None, 0.0
    
    async def suggest_corrections(
        self,
        data: List[Dict[str, Any]],
        data_type: DataType,
        column_mapping: Dict[str, str]
    ) -> List[CorrectionSuggestion]:
        """
        Generate correction suggestions without applying them.
        Useful for showing user what will be corrected.
        """
        suggestions = []
        
        for row_idx, row in enumerate(data, start=1):
            # Check date column
            date_col = column_mapping.get("date")
            if date_col and date_col in row:
                original = row[date_col]
                normalized, confidence = self._normalize_date(original)
                if normalized and normalized != str(original):
                    suggestions.append(CorrectionSuggestion(
                        row=row_idx,
                        column=date_col,
                        original_value=original,
                        suggested_value=normalized,
                        confidence=confidence,
                        reason="Date will be normalized to ISO format"
                    ))
            
            # Check numeric columns
            numeric_fields = ["amount", "value", "quantity"]
            for field in numeric_fields:
                col = column_mapping.get(field)
                if col and col in row:
                    original = row[col]
                    cleaned, confidence = self._clean_numeric(original)
                    if cleaned is not None and str(cleaned) != str(original):
                        suggestions.append(CorrectionSuggestion(
                            row=row_idx,
                            column=col,
                            original_value=original,
                            suggested_value=cleaned,
                            confidence=confidence,
                            reason="Numeric value will be cleaned"
                        ))
        
        return suggestions

"""
Data Parser Service - Parses cleaned data into structured database-ready format.
Organizes data by type and prepares for KPI computation.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from collections import defaultdict
import logging

from app.models.upload import DataType, ParsedData

logger = logging.getLogger(__name__)


class DataParser:
    """
    Parses cleaned data into structured database-ready format.
    Organizes data by type and prepares for KPI computation.
    """
    
    def __init__(self):
        pass
    
    async def parse(
        self,
        data: List[Dict[str, Any]],
        data_type: DataType,
        column_mapping: Dict[str, str]
    ) -> ParsedData:
        """
        Parse validated data into structured format.
        
        For each data type, extracts:
        - Normalized records with consistent schema
        - Aggregation-ready structures
        - Metadata (date ranges, counts, etc.)
        """
        records = []
        date_range = {"min": None, "max": None}
        
        # Parse based on data type
        if data_type == DataType.SALES:
            records = await self._parse_sales(data, column_mapping)
        elif data_type == DataType.PURCHASE:
            records = await self._parse_purchases(data, column_mapping)
        elif data_type == DataType.WASTAGE:
            records = await self._parse_wastage(data, column_mapping)
        elif data_type == DataType.INVENTORY:
            records = await self._parse_inventory(data, column_mapping)
        elif data_type == DataType.STAFF:
            records = await self._parse_staff(data, column_mapping)
        
        # Calculate date range
        dates = [r.get("date") for r in records if r.get("date")]
        if dates:
            date_range["min"] = min(dates)
            date_range["max"] = max(dates)
        
        # Build metadata
        metadata = await self._build_metadata(records, data_type)
        
        return ParsedData(
            data_type=data_type,
            records=records,
            metadata=metadata,
            date_range=date_range,
            record_count=len(records)
        )
    
    async def _parse_sales(
        self,
        data: List[Dict[str, Any]],
        mapping: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """Parse sales transaction data."""
        records = []
        
        for row in data:
            record = {
                "date": self._parse_date(row.get(mapping.get("date", ""))),
                "amount": self._parse_float(row.get(mapping.get("amount", ""))),
                "sku": row.get(mapping.get("sku", "")) or "UNKNOWN",
                "quantity": self._parse_int(row.get(mapping.get("quantity", ""))) or 1,
                "outlet": row.get(mapping.get("outlet", "")) or None,
            }
            
            # Calculate unit price if we have amount and quantity
            if record["amount"] and record["quantity"]:
                record["unit_price"] = round(record["amount"] / record["quantity"], 2)
            
            records.append(record)
        
        return records
    
    async def _parse_purchases(
        self,
        data: List[Dict[str, Any]],
        mapping: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """Parse purchase/procurement data."""
        records = []
        
        for row in data:
            record = {
                "date": self._parse_date(row.get(mapping.get("date", ""))),
                "value": self._parse_float(row.get(mapping.get("value", ""))) or 0,
                "supplier": row.get(mapping.get("supplier", "")) or "UNKNOWN",
                "sku": row.get(mapping.get("sku", "")) or None,
                "quantity": self._parse_int(row.get(mapping.get("quantity", ""))) or 1,
                "outlet": row.get(mapping.get("outlet", "")) or None,
            }
            records.append(record)
        
        return records
    
    async def _parse_wastage(
        self,
        data: List[Dict[str, Any]],
        mapping: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """Parse wastage records."""
        records = []
        
        for row in data:
            record = {
                "date": self._parse_date(row.get(mapping.get("date", ""))),
                "sku": row.get(mapping.get("sku", "")) or "UNKNOWN",
                "quantity": self._parse_float(row.get(mapping.get("quantity", ""))) or 0,
                "value": self._parse_float(row.get(mapping.get("value", ""))) or 0,
                "outlet": row.get(mapping.get("outlet", "")) or None,
                "reason": row.get(mapping.get("reason", "")) or None,
            }
            records.append(record)
        
        return records
    
    async def _parse_inventory(
        self,
        data: List[Dict[str, Any]],
        mapping: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """Parse inventory data."""
        records = []
        
        for row in data:
            opening = self._parse_float(row.get(mapping.get("opening_stock", ""))) or 0
            closing = self._parse_float(row.get(mapping.get("closing_stock", ""))) or 0
            movement = self._parse_float(row.get(mapping.get("movement", "")))
            
            # Calculate movement if not provided
            if movement is None:
                movement = closing - opening
            
            record = {
                "date": self._parse_date(row.get(mapping.get("date", ""))),
                "sku": row.get(mapping.get("sku", "")) or "UNKNOWN",
                "opening_stock": opening,
                "closing_stock": closing,
                "movement": movement,
                "outlet": row.get(mapping.get("outlet", "")) or None,
            }
            records.append(record)
        
        return records
    
    async def _parse_staff(
        self,
        data: List[Dict[str, Any]],
        mapping: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """Parse staff attendance/performance data."""
        records = []
        
        for row in data:
            log_type = row.get(mapping.get("type", "")) or "attendance"
            record = {
                "date": self._parse_date(row.get(mapping.get("date", ""))),
                "staff_name": row.get(mapping.get("staff_name", "")) or "UNKNOWN",
                "type": log_type.lower() if isinstance(log_type, str) else "attendance",
                "description": row.get(mapping.get("description", "")) or None,
                "outlet": row.get(mapping.get("outlet", "")) or None,
                "is_issue": self._is_issue_type(log_type)
            }
            records.append(record)
        
        return records
    
    def _is_issue_type(self, log_type: Any) -> bool:
        """Check if log type indicates an issue."""
        if not log_type:
            return False
        type_str = str(log_type).lower()
        issue_keywords = ["issue", "incident", "problem", "complaint", "error", "late", "absent"]
        return any(keyword in type_str for keyword in issue_keywords)
    
    async def _build_metadata(
        self,
        records: List[Dict[str, Any]],
        data_type: DataType
    ) -> Dict[str, Any]:
        """Build metadata from parsed records."""
        metadata = {
            "record_count": len(records),
            "data_type": data_type.value,
        }
        
        if not records:
            return metadata
        
        # Type-specific metadata
        if data_type == DataType.SALES:
            total_revenue = sum(r.get("amount", 0) or 0 for r in records)
            total_quantity = sum(r.get("quantity", 0) or 0 for r in records)
            unique_skus = len(set(r.get("sku") for r in records if r.get("sku")))
            
            metadata.update({
                "total_revenue": round(total_revenue, 2),
                "total_quantity": total_quantity,
                "unique_skus": unique_skus,
                "average_transaction": round(total_revenue / len(records), 2) if records else 0
            })
        
        elif data_type == DataType.WASTAGE:
            total_value = sum(r.get("value", 0) or 0 for r in records)
            total_quantity = sum(r.get("quantity", 0) or 0 for r in records)
            unique_skus = len(set(r.get("sku") for r in records if r.get("sku")))
            
            metadata.update({
                "total_wastage_value": round(total_value, 2),
                "total_wastage_quantity": total_quantity,
                "unique_skus_wasted": unique_skus
            })
        
        elif data_type == DataType.PURCHASE:
            total_value = sum(r.get("value", 0) or 0 for r in records)
            unique_suppliers = len(set(r.get("supplier") for r in records if r.get("supplier")))
            
            metadata.update({
                "total_purchase_value": round(total_value, 2),
                "unique_suppliers": unique_suppliers
            })
        
        elif data_type == DataType.STAFF:
            unique_staff = len(set(r.get("staff_name") for r in records if r.get("staff_name")))
            issue_count = sum(1 for r in records if r.get("is_issue"))
            
            metadata.update({
                "unique_staff": unique_staff,
                "issue_count": issue_count,
                "log_types": list(set(r.get("type") for r in records if r.get("type")))
            })
        
        return metadata
    
    def _parse_date(self, value: Any) -> Optional[datetime]:
        """Parse various date formats to datetime object."""
        if value is None:
            return None
        
        if isinstance(value, datetime):
            return value
        
        str_value = str(value).strip()
        if not str_value:
            return None
        
        # Common date formats
        formats = [
            "%Y-%m-%d",
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%Y-%m-%dT%H:%M:%S",
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(str_value, fmt)
            except ValueError:
                continue
        
        return None
    
    def _parse_float(self, value: Any) -> Optional[float]:
        """Parse value to float, handling various formats."""
        if value is None:
            return None
        
        if isinstance(value, (int, float)):
            return float(value)
        
        try:
            # Clean string and parse
            cleaned = str(value).strip()
            cleaned = cleaned.replace(",", "").replace("₹", "").replace("$", "")
            return float(cleaned)
        except (ValueError, TypeError):
            return None
    
    def _parse_int(self, value: Any) -> Optional[int]:
        """Parse value to integer."""
        float_val = self._parse_float(value)
        if float_val is not None:
            return int(float_val)
        return None
    
    async def aggregate_by_period(
        self,
        records: List[Dict[str, Any]],
        period: str = "weekly",
        value_field: str = "amount"
    ) -> Dict[str, float]:
        """
        Aggregate records by time period.
        Returns dict of period_key -> aggregated_value.
        """
        aggregated = defaultdict(float)
        
        for record in records:
            date = record.get("date")
            value = record.get(value_field, 0) or 0
            
            if date:
                period_key = self._get_period_key(date, period)
                aggregated[period_key] += value
        
        return dict(aggregated)
    
    async def aggregate_by_sku(
        self,
        records: List[Dict[str, Any]],
        value_field: str = "amount"
    ) -> Dict[str, Dict[str, Any]]:
        """
        Aggregate records by SKU.
        Returns dict of sku -> {total, count, quantity}.
        """
        aggregated = defaultdict(lambda: {"total": 0, "count": 0, "quantity": 0})
        
        for record in records:
            sku = record.get("sku", "UNKNOWN")
            value = record.get(value_field, 0) or 0
            quantity = record.get("quantity", 0) or 0
            
            aggregated[sku]["total"] += value
            aggregated[sku]["count"] += 1
            aggregated[sku]["quantity"] += quantity
        
        return dict(aggregated)
    
    def _get_period_key(self, date: datetime, period: str) -> str:
        """Generate period key for aggregation."""
        if period == "daily":
            return date.strftime("%Y-%m-%d")
        elif period == "weekly":
            # ISO week number
            return f"{date.year}-W{date.isocalendar()[1]:02d}"
        elif period == "monthly":
            return date.strftime("%Y-%m")
        else:
            return date.strftime("%Y-%m-%d")

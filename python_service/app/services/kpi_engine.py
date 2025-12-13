"""
KPI Engine Service - Computes core KPIs from parsed data.
Matches the Node.js KpiEngine logic for consistency.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from collections import defaultdict
import logging

from app.models.upload import DataType, ParsedData
from app.models.kpi import (
    KPISnapshot,
    RevenueKPI,
    WastageKPI,
    MarginKPI,
    SKUPerformanceKPI,
    SKUPerformer,
    CustomerRatingKPI,
    StaffLogKPI,
    TrendDirection,
    Period,
    KPIComputationResult
)
from app.database import Database

logger = logging.getLogger(__name__)


class KPIEngine:
    """
    Computes core KPIs from parsed data.
    Matches the Node.js KpiEngine logic for consistency.
    """
    
    def __init__(self, business_id: str):
        self.business_id = business_id
        self.db = Database
    
    async def compute_all_kpis(
        self,
        sales_data: List[Dict[str, Any]],
        wastage_data: Optional[List[Dict[str, Any]]] = None,
        purchase_data: Optional[List[Dict[str, Any]]] = None,
        period: str = "weekly"
    ) -> KPIComputationResult:
        """
        Compute all KPIs and return a complete snapshot.
        """
        import time
        start_time = time.time()
        
        try:
            # Determine period dates
            period_dates = self._get_period_dates(period)
            period_start = period_dates["start"]
            period_end = period_dates["end"]
            previous_start = period_dates["previous_start"]
            previous_end = period_dates["previous_end"]
            
            # Filter data by period
            current_sales = self._filter_by_date(sales_data, period_start, period_end)
            previous_sales = self._filter_by_date(sales_data, previous_start, previous_end)
            
            current_wastage = self._filter_by_date(wastage_data or [], period_start, period_end)
            current_purchases = self._filter_by_date(purchase_data or [], period_start, period_end)
            
            # Compute individual KPIs
            revenue_kpi = await self.compute_revenue(current_sales, previous_sales)
            wastage_kpi = await self.compute_wastage(current_wastage, revenue_kpi.total)
            margin_kpi = await self.compute_margin_proxy(current_sales, current_purchases)
            sku_kpi = await self.compute_sku_performance(current_sales, current_wastage)
            customer_kpi = await self.compute_customer_rating_trend(period_start, period_end)
            staff_kpi = await self.compute_staff_logs(period_start, period_end)
            
            # Calculate overall health score
            health_score = await self.compute_health_score({
                "revenue": revenue_kpi,
                "wastage": wastage_kpi,
                "customer": customer_kpi
            })
            
            # Build snapshot
            snapshot = KPISnapshot(
                business_id=self.business_id,
                period=Period(period),
                period_start=period_start,
                period_end=period_end,
                revenue=revenue_kpi,
                wastage=wastage_kpi,
                margin=margin_kpi,
                sku_metrics=sku_kpi,
                customer_metrics=customer_kpi,
                staff_metrics=staff_kpi,
                period_health_score=health_score,
                is_baseline=False,
                created_at=datetime.utcnow()
            )
            
            computation_time = (time.time() - start_time) * 1000
            
            return KPIComputationResult(
                success=True,
                snapshot=snapshot,
                computation_time_ms=round(computation_time, 2)
            )
            
        except Exception as e:
            logger.error(f"KPI computation error: {e}")
            return KPIComputationResult(
                success=False,
                errors=[str(e)]
            )
    
    async def compute_revenue(
        self,
        current_sales: List[Dict[str, Any]],
        previous_sales: List[Dict[str, Any]]
    ) -> RevenueKPI:
        """
        Compute revenue metrics:
        - Total revenue for period
        - Revenue growth vs previous period
        - Trend (up/down/stable)
        """
        current_total = sum(s.get("amount", 0) or 0 for s in current_sales)
        previous_total = sum(s.get("amount", 0) or 0 for s in previous_sales)
        
        # Calculate growth
        if previous_total > 0:
            growth = ((current_total - previous_total) / previous_total) * 100
        else:
            growth = 100 if current_total > 0 else 0
        
        # Determine trend
        if growth > 2:
            trend = TrendDirection.UP
        elif growth < -2:
            trend = TrendDirection.DOWN
        else:
            trend = TrendDirection.STABLE
        
        return RevenueKPI(
            total=round(current_total, 2),
            growth=round(growth, 2),
            trend=trend,
            previous_period_total=round(previous_total, 2)
        )
    
    async def compute_wastage(
        self,
        wastage_data: List[Dict[str, Any]],
        total_revenue: float
    ) -> WastageKPI:
        """
        Compute wastage metrics:
        - Wastage percentage = (wastage_value / total_sales) * 100
        - Wastage value
        - Trend vs previous period
        """
        total_value = sum(w.get("value", 0) or 0 for w in wastage_data)
        total_quantity = sum(w.get("quantity", 0) or 0 for w in wastage_data)
        
        # Calculate percentage
        percentage = (total_value / total_revenue * 100) if total_revenue > 0 else 0
        
        # Note: For trend, we'd need previous period data
        # For now, we'll set it based on percentage thresholds
        if percentage > 5:
            trend = TrendDirection.UP  # High wastage is "up" (bad)
        elif percentage < 2:
            trend = TrendDirection.DOWN  # Low wastage is "down" (good)
        else:
            trend = TrendDirection.STABLE
        
        return WastageKPI(
            percentage=round(percentage, 2),
            value=round(total_value, 2),
            trend=trend,
            item_count=len(wastage_data)
        )
    
    async def compute_margin_proxy(
        self,
        sales_data: List[Dict[str, Any]],
        purchase_data: List[Dict[str, Any]]
    ) -> MarginKPI:
        """
        Compute margin approximation:
        - Gross margin = (revenue - cost) / revenue
        - If cost not available, use proxy calculation
        """
        total_revenue = sum(s.get("amount", 0) or 0 for s in sales_data)
        total_cost = sum(p.get("value", 0) or 0 for p in purchase_data)
        
        if total_revenue > 0 and total_cost > 0:
            # We have both revenue and cost data
            gross_margin = ((total_revenue - total_cost) / total_revenue) * 100
            # Estimate net margin (assume ~70% of gross margin)
            net_margin = gross_margin * 0.7
            proxy = gross_margin
        else:
            # Use industry proxy or fetch from business baseline
            # Default food service margin is typically 25-35%
            try:
                business = await self.db.businesses().find_one(
                    {"_id": self._to_object_id(self.business_id)}
                )
                if business and business.get("baselineMetrics", {}).get("averageMargin"):
                    proxy = business["baselineMetrics"]["averageMargin"]
                else:
                    proxy = 30  # Default 30%
            except Exception:
                proxy = 30
            
            gross_margin = proxy
            net_margin = proxy * 0.7
        
        return MarginKPI(
            gross=round(gross_margin, 2),
            net=round(net_margin, 2),
            proxy=round(proxy, 2)
        )
    
    async def compute_sku_performance(
        self,
        sales_data: List[Dict[str, Any]],
        wastage_data: List[Dict[str, Any]]
    ) -> SKUPerformanceKPI:
        """
        Compute SKU-level metrics:
        - Top performers (by revenue, quantity)
        - Under performers
        - SKU count
        - Revenue per SKU
        """
        # Aggregate sales by SKU
        sku_stats = defaultdict(lambda: {"revenue": 0, "quantity": 0})
        
        for sale in sales_data:
            sku = sale.get("sku", "UNKNOWN")
            sku_stats[sku]["revenue"] += sale.get("amount", 0) or 0
            sku_stats[sku]["quantity"] += sale.get("quantity", 0) or 0
        
        # Track wastage by SKU
        sku_wastage = defaultdict(float)
        for waste in wastage_data:
            sku = waste.get("sku", "UNKNOWN")
            sku_wastage[sku] += waste.get("value", 0) or 0
        
        # Sort SKUs by revenue
        sorted_skus = sorted(
            sku_stats.items(),
            key=lambda x: x[1]["revenue"],
            reverse=True
        )
        
        # Top 10 performers
        top_performers = [
            SKUPerformer(
                sku=sku,
                revenue=round(stats["revenue"], 2),
                quantity=int(stats["quantity"])
            )
            for sku, stats in sorted_skus[:10]
        ]
        
        # Bottom 10 performers (excluding those with 0 revenue)
        non_zero_skus = [(sku, stats) for sku, stats in sorted_skus if stats["revenue"] > 0]
        under_performers = [
            SKUPerformer(
                sku=sku,
                revenue=round(stats["revenue"], 2),
                quantity=int(stats["quantity"])
            )
            for sku, stats in non_zero_skus[-10:]
        ]
        under_performers.reverse()  # Lowest first
        
        # Calculate metrics
        total_skus = len(sku_stats)
        total_revenue = sum(s["revenue"] for s in sku_stats.values())
        revenue_per_sku = (total_revenue / total_skus) if total_skus > 0 else 0
        
        return SKUPerformanceKPI(
            total_skus=total_skus,
            top_performers=top_performers,
            under_performers=under_performers,
            revenue_per_sku=round(revenue_per_sku, 2)
        )
    
    async def compute_customer_rating_trend(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> CustomerRatingKPI:
        """
        Compute customer rating metrics from QR feedback system:
        - Average rating for period
        - Rating trend vs previous period
        - Feedback count
        """
        try:
            # Query feedbacks from database
            feedbacks_cursor = self.db.feedbacks().find({
                "business": self._to_object_id(self.business_id),
                "createdAt": {"$gte": start_date, "$lt": end_date}
            })
            
            feedbacks = await feedbacks_cursor.to_list(length=1000)
            
            if not feedbacks:
                return CustomerRatingKPI(
                    average_rating=0,
                    rating_trend=TrendDirection.STABLE,
                    feedback_count=0
                )
            
            # Calculate metrics
            ratings = [f.get("rating", 0) for f in feedbacks if f.get("rating")]
            avg_rating = sum(ratings) / len(ratings) if ratings else 0
            
            positive_count = sum(1 for r in ratings if r >= 4)
            negative_count = sum(1 for r in ratings if r <= 2)
            
            # Get previous period for trend
            period_length = end_date - start_date
            prev_start = start_date - period_length
            prev_end = start_date
            
            prev_cursor = self.db.feedbacks().find({
                "business": self._to_object_id(self.business_id),
                "createdAt": {"$gte": prev_start, "$lt": prev_end}
            })
            prev_feedbacks = await prev_cursor.to_list(length=1000)
            
            prev_ratings = [f.get("rating", 0) for f in prev_feedbacks if f.get("rating")]
            prev_avg = sum(prev_ratings) / len(prev_ratings) if prev_ratings else 0
            
            # Determine trend
            if avg_rating > prev_avg + 0.2:
                trend = TrendDirection.UP
            elif avg_rating < prev_avg - 0.2:
                trend = TrendDirection.DOWN
            else:
                trend = TrendDirection.STABLE
            
            return CustomerRatingKPI(
                average_rating=round(avg_rating, 2),
                rating_trend=trend,
                feedback_count=len(feedbacks),
                positive_count=positive_count,
                negative_count=negative_count
            )
            
        except Exception as e:
            logger.warning(f"Error fetching customer ratings: {e}")
            return CustomerRatingKPI()
    
    async def compute_staff_logs(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> StaffLogKPI:
        """
        Compute staff log metrics:
        - Total logs count
        - Issues reported
        - Log frequency trend
        """
        try:
            # Query staff logs from database
            logs_cursor = self.db.stafflogs().find({
                "business": self._to_object_id(self.business_id),
                "createdAt": {"$gte": start_date, "$lt": end_date}
            })
            
            logs = await logs_cursor.to_list(length=5000)
            
            if not logs:
                return StaffLogKPI()
            
            # Count issues
            issue_keywords = ["issue", "incident", "problem", "complaint", "late", "absent"]
            issues_count = sum(
                1 for log in logs
                if any(keyword in str(log.get("type", "")).lower() for keyword in issue_keywords)
            )
            
            # Count unique staff
            unique_staff = len(set(log.get("staffName") for log in logs if log.get("staffName")))
            
            # Get previous period for trend
            period_length = end_date - start_date
            prev_start = start_date - period_length
            prev_end = start_date
            
            prev_cursor = self.db.stafflogs().find({
                "business": self._to_object_id(self.business_id),
                "createdAt": {"$gte": prev_start, "$lt": prev_end}
            })
            prev_count = await self.db.stafflogs().count_documents({
                "business": self._to_object_id(self.business_id),
                "createdAt": {"$gte": prev_start, "$lt": prev_end}
            })
            
            # Determine trend
            if len(logs) > prev_count * 1.1:
                trend = TrendDirection.UP
            elif len(logs) < prev_count * 0.9:
                trend = TrendDirection.DOWN
            else:
                trend = TrendDirection.STABLE
            
            return StaffLogKPI(
                logs_count=len(logs),
                issues_reported=issues_count,
                log_frequency_trend=trend,
                active_staff_count=unique_staff
            )
            
        except Exception as e:
            logger.warning(f"Error fetching staff logs: {e}")
            return StaffLogKPI()
    
    async def compute_health_score(self, kpis: Dict[str, Any]) -> float:
        """
        Compute overall health score (0-100) based on all KPIs.
        Weighted formula matching Node.js logic.
        """
        score = 50  # Base score
        
        revenue_kpi: RevenueKPI = kpis.get("revenue", RevenueKPI())
        wastage_kpi: WastageKPI = kpis.get("wastage", WastageKPI())
        customer_kpi: CustomerRatingKPI = kpis.get("customer", CustomerRatingKPI())
        
        # Revenue component (30% weight)
        if revenue_kpi.trend == TrendDirection.UP:
            score += 15
        elif revenue_kpi.trend == TrendDirection.DOWN:
            score -= 10
        
        if revenue_kpi.growth > 10:
            score += 5
        elif revenue_kpi.growth < -10:
            score -= 5
        
        # Wastage component (25% weight) - lower is better
        if wastage_kpi.percentage < 2:
            score += 15
        elif wastage_kpi.percentage < 5:
            score += 5
        elif wastage_kpi.percentage > 10:
            score -= 15
        elif wastage_kpi.percentage > 5:
            score -= 5
        
        # Customer rating component (25% weight)
        if customer_kpi.average_rating >= 4.5:
            score += 15
        elif customer_kpi.average_rating >= 4.0:
            score += 10
        elif customer_kpi.average_rating >= 3.5:
            score += 5
        elif customer_kpi.average_rating < 3.0 and customer_kpi.feedback_count > 0:
            score -= 10
        
        if customer_kpi.rating_trend == TrendDirection.UP:
            score += 5
        elif customer_kpi.rating_trend == TrendDirection.DOWN:
            score -= 5
        
        # Clamp to 0-100
        return max(0, min(100, score))
    
    def _get_period_dates(self, period: str) -> Dict[str, datetime]:
        """Calculate current and previous period date ranges."""
        now = datetime.utcnow()
        
        if period == "daily":
            end = now.replace(hour=0, minute=0, second=0, microsecond=0)
            start = end - timedelta(days=1)
            previous_end = start
            previous_start = previous_end - timedelta(days=1)
        elif period == "weekly":
            # Start of current week (Monday)
            days_since_monday = now.weekday()
            end = now.replace(hour=0, minute=0, second=0, microsecond=0)
            start = end - timedelta(days=days_since_monday)
            previous_end = start
            previous_start = previous_end - timedelta(days=7)
        elif period == "monthly":
            # Start of current month
            end = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 1:
                start = end.replace(year=now.year - 1, month=12)
            else:
                start = end.replace(month=now.month - 1)
            previous_end = start
            if start.month == 1:
                previous_start = start.replace(year=start.year - 1, month=12)
            else:
                previous_start = start.replace(month=start.month - 1)
        else:
            # Default to weekly
            days_since_monday = now.weekday()
            end = now.replace(hour=0, minute=0, second=0, microsecond=0)
            start = end - timedelta(days=days_since_monday)
            previous_end = start
            previous_start = previous_end - timedelta(days=7)
        
        return {
            "start": start,
            "end": end,
            "previous_start": previous_start,
            "previous_end": previous_end
        }
    
    def _filter_by_date(
        self,
        data: List[Dict[str, Any]],
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Filter data records by date range."""
        filtered = []
        for record in data:
            date = record.get("date")
            if date and isinstance(date, datetime):
                if start_date <= date < end_date:
                    filtered.append(record)
        return filtered
    
    def _to_object_id(self, id_str: str):
        """Convert string to MongoDB ObjectId."""
        from bson import ObjectId
        try:
            return ObjectId(id_str)
        except Exception:
            return id_str

"""
AI Analyzer Service - Uses OpenRouter LLM for intelligent data analysis.
Provides AI-powered insights, error suggestions, and data quality recommendations.
"""

import httpx
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from app.config import settings

logger = logging.getLogger(__name__)


class AIAnalyzer:
    """
    AI-powered data analyzer using OpenRouter LLM.
    Provides intelligent analysis, error suggestions, and format recommendations.
    """
    
    OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
    
    # Default model - can be changed via settings
    DEFAULT_MODEL = "google/gemini-2.0-flash-001"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.openrouter_api_key
        if not self.api_key:
            logger.warning("OpenRouter API key not configured. AI features will be limited.")
    
    async def analyze_data_quality(
        self,
        data: List[Dict[str, Any]],
        data_type: str,
        column_mapping: Dict[str, str],
        validation_errors: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze data quality using AI and provide intelligent insights.
        
        Returns:
            - Overall assessment
            - Specific issues found
            - Recommendations for improvement
            - Suggested corrections
        """
        if not self.api_key:
            return self._fallback_analysis(data, data_type, validation_errors)
        
        # Prepare sample data for AI (limit to first 10 rows to avoid token limits)
        sample_data = data[:10]
        
        prompt = self._build_quality_analysis_prompt(
            sample_data, data_type, column_mapping, validation_errors
        )
        
        try:
            response = await self._call_openrouter(prompt)
            return self._parse_ai_response(response)
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return self._fallback_analysis(data, data_type, validation_errors)
    
    async def suggest_corrections(
        self,
        row_data: Dict[str, Any],
        column: str,
        error_message: str,
        data_type: str
    ) -> Dict[str, Any]:
        """
        Get AI-powered suggestions for correcting a specific data error.
        """
        if not self.api_key:
            return {"suggestion": None, "confidence": 0}
        
        prompt = f"""
You are a data quality expert. A user has uploaded {data_type} data and there's an error.

Row data: {json.dumps(row_data)}
Column with error: {column}
Error: {error_message}

Suggest the most likely correct value for the "{column}" column. Consider:
1. The context from other columns in the row
2. Common data entry mistakes
3. Typical formats for {data_type} data

Respond in JSON format:
{{
    "suggested_value": "the corrected value",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation"
}}
"""
        
        try:
            response = await self._call_openrouter(prompt)
            return json.loads(response)
        except Exception as e:
            logger.error(f"AI suggestion failed: {e}")
            return {"suggestion": None, "confidence": 0}
    
    async def generate_excel_format_guide(
        self,
        data_type: str
    ) -> Dict[str, Any]:
        """
        Generate AI-powered guide for the correct Excel format for a data type.
        """
        if not self.api_key:
            return self._get_default_format_guide(data_type)
        
        prompt = f"""
You are a data format expert. Generate a comprehensive guide for creating a {data_type} data Excel file for a restaurant/food business analytics system.

The guide should include:
1. Required columns and their exact names
2. Date format (recommend YYYY-MM-DD)
3. Number formats (no currency symbols, use plain numbers)
4. Example rows (at least 3)
5. Common mistakes to avoid

For {data_type} data:
- If "sales": Include date, amount, sku/item name, quantity, outlet (optional)
- If "wastage": Include date, sku/item name, quantity, value/cost, reason (optional)
- If "purchase": Include date, supplier, sku, quantity, value
- If "inventory": Include date, sku, opening stock, closing stock
- If "staff": Include date, staff name, log type, description

Respond in JSON format:
{{
    "data_type": "{data_type}",
    "required_columns": ["list of required column names"],
    "optional_columns": ["list of optional column names"],
    "column_descriptions": {{"column": "description and format"}},
    "sample_rows": [{{}}],
    "tips": ["list of tips"],
    "common_mistakes": ["list of mistakes to avoid"]
}}
"""
        
        try:
            response = await self._call_openrouter(prompt)
            return json.loads(response)
        except Exception as e:
            logger.error(f"AI format guide generation failed: {e}")
            return self._get_default_format_guide(data_type)
    
    async def analyze_kpi_trends(
        self,
        current_kpis: Dict[str, Any],
        historical_kpis: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Get AI-powered analysis of KPI trends and actionable recommendations.
        """
        if not self.api_key:
            return {"insights": [], "recommendations": []}
        
        prompt = f"""
You are a business analytics expert for the food/restaurant industry.

Current KPIs:
{json.dumps(current_kpis, indent=2, default=str)}

Historical KPIs (previous periods):
{json.dumps(historical_kpis or [], indent=2, default=str)}

Analyze these KPIs and provide:
1. Key insights about business performance
2. Areas of concern
3. Opportunities for improvement
4. Specific actionable recommendations

Focus on:
- Revenue trends
- Wastage optimization
- Customer satisfaction
- Staff performance
- Top/bottom performing SKUs

Respond in JSON format:
{{
    "overall_assessment": "brief overall assessment",
    "health_score_explanation": "why the health score is what it is",
    "insights": [
        {{"category": "revenue/wastage/customer/staff", "insight": "...", "severity": "info/warning/critical"}}
    ],
    "recommendations": [
        {{"priority": "high/medium/low", "action": "specific action", "expected_impact": "..."}}
    ]
}}
"""
        
        try:
            response = await self._call_openrouter(prompt)
            return json.loads(response)
        except Exception as e:
            logger.error(f"AI KPI analysis failed: {e}")
            return {"insights": [], "recommendations": []}
    
    async def _call_openrouter(self, prompt: str, model: str = None) -> str:
        """Make an API call to OpenRouter."""
        model = model or self.DEFAULT_MODEL
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.node_backend_url,
            "X-Title": "AI Consultant Data Processor"
        }
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert data analyst specializing in restaurant and food business analytics. Always respond with valid JSON when asked for JSON format."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 2000
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.OPENROUTER_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Clean markdown code blocks if present
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            
            return content.strip()
    
    def _build_quality_analysis_prompt(
        self,
        sample_data: List[Dict[str, Any]],
        data_type: str,
        column_mapping: Dict[str, str],
        validation_errors: List[Dict[str, Any]] = None
    ) -> str:
        """Build prompt for data quality analysis."""
        return f"""
You are a data quality expert analyzing {data_type} data for a restaurant business.

Sample data (first 10 rows):
{json.dumps(sample_data, indent=2)}

Column mapping (what each column represents):
{json.dumps(column_mapping, indent=2)}

Validation errors found:
{json.dumps(validation_errors or [], indent=2)}

Analyze this data and provide:
1. Overall data quality score (0-100)
2. Specific issues found
3. Recommendations for improvement
4. Which errors can be auto-corrected vs need manual review

Respond in JSON format:
{{
    "quality_score": 0-100,
    "quality_grade": "A/B/C/D/F",
    "summary": "brief summary",
    "issues": [
        {{"severity": "high/medium/low", "column": "...", "issue": "...", "affected_rows": 0}}
    ],
    "auto_correctable": ["list of error types that can be auto-fixed"],
    "needs_manual_review": ["list of issues needing human review"],
    "recommendations": ["list of actionable recommendations"]
}}
"""
    
    def _parse_ai_response(self, response: str) -> Dict[str, Any]:
        """Parse and validate AI response."""
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            logger.warning("Failed to parse AI response as JSON")
            return {
                "quality_score": 0,
                "summary": response,
                "issues": [],
                "recommendations": []
            }
    
    def _fallback_analysis(
        self,
        data: List[Dict[str, Any]],
        data_type: str,
        validation_errors: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Fallback analysis when AI is unavailable."""
        error_count = len(validation_errors) if validation_errors else 0
        total_rows = len(data)
        
        if total_rows == 0:
            quality_score = 0
        else:
            quality_score = max(0, 100 - (error_count / total_rows * 100))
        
        return {
            "quality_score": round(quality_score, 2),
            "quality_grade": self._score_to_grade(quality_score),
            "summary": f"Analyzed {total_rows} rows with {error_count} errors",
            "issues": [],
            "recommendations": [
                "Ensure all dates are in YYYY-MM-DD format",
                "Remove currency symbols from numeric fields",
                "Check for missing required fields"
            ],
            "ai_powered": False
        }
    
    def _score_to_grade(self, score: float) -> str:
        """Convert score to letter grade."""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
    
    def _get_default_format_guide(self, data_type: str) -> Dict[str, Any]:
        """Get default format guide without AI."""
        guides = {
            "sales": {
                "data_type": "sales",
                "required_columns": ["date", "amount"],
                "optional_columns": ["sku", "quantity", "outlet"],
                "column_descriptions": {
                    "date": "Transaction date in YYYY-MM-DD format",
                    "amount": "Sale amount (numeric, no currency symbols)",
                    "sku": "Product/item identifier",
                    "quantity": "Number of units sold",
                    "outlet": "Store/outlet name"
                },
                "sample_rows": [
                    {"date": "2024-12-15", "amount": 1500, "sku": "COFFEE-001", "quantity": 10, "outlet": "Main Store"},
                    {"date": "2024-12-15", "amount": 2200, "sku": "TEA-002", "quantity": 15, "outlet": "Main Store"},
                    {"date": "2024-12-16", "amount": 850, "sku": "SNACK-003", "quantity": 5, "outlet": "Branch 1"}
                ],
                "tips": [
                    "Use consistent date format (YYYY-MM-DD recommended)",
                    "Enter amounts as plain numbers without ₹ or commas",
                    "Keep SKU codes consistent across all entries"
                ],
                "common_mistakes": [
                    "Using DD/MM/YYYY or MM/DD/YYYY date formats",
                    "Including currency symbols like ₹1,500",
                    "Leaving required fields empty"
                ]
            },
            "wastage": {
                "data_type": "wastage",
                "required_columns": ["date", "sku", "quantity"],
                "optional_columns": ["value", "reason", "outlet"],
                "column_descriptions": {
                    "date": "Wastage date in YYYY-MM-DD format",
                    "sku": "Product/item identifier",
                    "quantity": "Quantity wasted",
                    "value": "Cost/value of wasted items",
                    "reason": "Reason for wastage (expired, damaged, etc.)",
                    "outlet": "Store/outlet name"
                },
                "sample_rows": [
                    {"date": "2024-12-15", "sku": "MILK-001", "quantity": 5, "value": 250, "reason": "Expired"},
                    {"date": "2024-12-15", "sku": "BREAD-002", "quantity": 10, "value": 150, "reason": "Stale"},
                    {"date": "2024-12-16", "sku": "FRUIT-003", "quantity": 3, "value": 180, "reason": "Damaged"}
                ],
                "tips": [
                    "Record wastage daily for accurate tracking",
                    "Include value for better cost analysis",
                    "Categorize reasons for trend analysis"
                ],
                "common_mistakes": [
                    "Not recording small wastage items",
                    "Inconsistent SKU naming",
                    "Missing dates"
                ]
            },
            "purchase": {
                "data_type": "purchase",
                "required_columns": ["date", "value"],
                "optional_columns": ["supplier", "sku", "quantity", "outlet"],
                "column_descriptions": {
                    "date": "Purchase date in YYYY-MM-DD format",
                    "value": "Total purchase value",
                    "supplier": "Supplier/vendor name",
                    "sku": "Product identifier",
                    "quantity": "Quantity purchased",
                    "outlet": "Store/outlet name"
                },
                "sample_rows": [
                    {"date": "2024-12-15", "supplier": "Fresh Foods Ltd", "sku": "VEG-MIX", "quantity": 50, "value": 5000},
                    {"date": "2024-12-15", "supplier": "Dairy Direct", "sku": "MILK-BULK", "quantity": 100, "value": 4500},
                    {"date": "2024-12-16", "supplier": "Grain Masters", "sku": "FLOUR-25KG", "quantity": 20, "value": 8000}
                ],
                "tips": [
                    "Record all purchases for accurate margin calculation",
                    "Keep supplier names consistent",
                    "Link SKUs to sales data when possible"
                ],
                "common_mistakes": [
                    "Missing purchase records",
                    "Incorrect values (using per-unit instead of total)",
                    "Inconsistent supplier naming"
                ]
            },
            "inventory": {
                "data_type": "inventory",
                "required_columns": ["date", "sku"],
                "optional_columns": ["opening_stock", "closing_stock", "movement", "outlet"],
                "column_descriptions": {
                    "date": "Inventory date in YYYY-MM-DD format",
                    "sku": "Product identifier",
                    "opening_stock": "Stock at start of day",
                    "closing_stock": "Stock at end of day",
                    "movement": "Net stock change",
                    "outlet": "Store/outlet name"
                },
                "sample_rows": [
                    {"date": "2024-12-15", "sku": "COFFEE-001", "opening_stock": 100, "closing_stock": 85, "movement": -15},
                    {"date": "2024-12-15", "sku": "TEA-002", "opening_stock": 50, "closing_stock": 35, "movement": -15},
                    {"date": "2024-12-16", "sku": "COFFEE-001", "opening_stock": 85, "closing_stock": 150, "movement": 65}
                ],
                "tips": [
                    "Record inventory daily for accurate tracking",
                    "Movement = closing - opening",
                    "Positive movement means stock received"
                ],
                "common_mistakes": [
                    "Inconsistent daily recording",
                    "Wrong movement calculations",
                    "Missing SKUs"
                ]
            },
            "staff": {
                "data_type": "staff",
                "required_columns": ["date", "staff_name", "type"],
                "optional_columns": ["description", "outlet"],
                "column_descriptions": {
                    "date": "Log date in YYYY-MM-DD format",
                    "staff_name": "Employee name",
                    "type": "Log type (attendance, issue, performance, etc.)",
                    "description": "Additional details",
                    "outlet": "Store/outlet name"
                },
                "sample_rows": [
                    {"date": "2024-12-15", "staff_name": "John Doe", "type": "attendance", "description": "On time"},
                    {"date": "2024-12-15", "staff_name": "Jane Smith", "type": "issue", "description": "Customer complaint handling"},
                    {"date": "2024-12-16", "staff_name": "Mike Johnson", "type": "late", "description": "30 min late"}
                ],
                "tips": [
                    "Log all significant events",
                    "Use consistent type categories",
                    "Include details for issues"
                ],
                "common_mistakes": [
                    "Inconsistent staff name spelling",
                    "Vague type categories",
                    "Missing dates"
                ]
            }
        }
        
        return guides.get(data_type, guides["sales"])

"""
AI Analysis router - AI-powered data analysis endpoints.
Uses OpenRouter LLM for intelligent insights and recommendations.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
import logging

from app.services.ai_analyzer import AIAnalyzer
from app.models.upload import DataType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Analysis"])


class AnalyzeDataRequest(BaseModel):
    """Request for AI data analysis."""
    data: List[Dict[str, Any]] = Field(..., description="Data to analyze")
    data_type: str = Field(..., description="Type of data (sales, wastage, etc.)")
    column_mapping: Dict[str, str] = Field(..., description="Column mapping")
    validation_errors: Optional[List[Dict[str, Any]]] = Field(default=None)


class SuggestCorrectionRequest(BaseModel):
    """Request for AI correction suggestion."""
    row_data: Dict[str, Any] = Field(..., description="The row with the error")
    column: str = Field(..., description="Column with the error")
    error_message: str = Field(..., description="The validation error message")
    data_type: str = Field(..., description="Type of data")


class AnalyzeKPIsRequest(BaseModel):
    """Request for AI KPI analysis."""
    current_kpis: Dict[str, Any] = Field(..., description="Current period KPIs")
    historical_kpis: Optional[List[Dict[str, Any]]] = Field(default=None, description="Previous periods")


@router.post("/analyze-data")
async def analyze_data_quality(request: AnalyzeDataRequest) -> Dict[str, Any]:
    """
    Analyze data quality using AI.
    
    Returns:
    - Quality score and grade
    - Identified issues with severity
    - List of auto-correctable errors
    - Items needing manual review
    - Actionable recommendations
    """
    logger.info(f"AI analyzing {len(request.data)} rows of {request.data_type} data")
    
    analyzer = AIAnalyzer()
    result = await analyzer.analyze_data_quality(
        data=request.data,
        data_type=request.data_type,
        column_mapping=request.column_mapping,
        validation_errors=request.validation_errors
    )
    
    return {
        "success": True,
        "analysis": result
    }


@router.post("/suggest-correction")
async def suggest_correction(request: SuggestCorrectionRequest) -> Dict[str, Any]:
    """
    Get AI-powered suggestion for correcting a specific data error.
    
    Returns:
    - Suggested corrected value
    - Confidence score (0-1)
    - Reasoning behind the suggestion
    """
    logger.info(f"AI suggesting correction for {request.column} in {request.data_type} data")
    
    analyzer = AIAnalyzer()
    result = await analyzer.suggest_corrections(
        row_data=request.row_data,
        column=request.column,
        error_message=request.error_message,
        data_type=request.data_type
    )
    
    return {
        "success": True,
        "suggestion": result
    }


@router.post("/analyze-kpis")
async def analyze_kpis(request: AnalyzeKPIsRequest) -> Dict[str, Any]:
    """
    Get AI-powered analysis of KPIs with actionable insights.
    
    Returns:
    - Overall assessment
    - Insights by category (revenue, wastage, customer, staff)
    - Prioritized recommendations
    """
    logger.info("AI analyzing KPIs")
    
    analyzer = AIAnalyzer()
    result = await analyzer.analyze_kpi_trends(
        current_kpis=request.current_kpis,
        historical_kpis=request.historical_kpis
    )
    
    return {
        "success": True,
        "analysis": result
    }


@router.get("/format-recommendations/{data_type}")
async def get_format_recommendations(data_type: str) -> Dict[str, Any]:
    """
    Get AI recommendations for data formatting.
    """
    analyzer = AIAnalyzer()
    guide = await analyzer.generate_excel_format_guide(data_type)
    
    return {
        "success": True,
        "data_type": data_type,
        "guide": guide
    }


@router.get("/status")
async def get_ai_status() -> Dict[str, Any]:
    """
    Check if AI features are enabled (API key configured).
    """
    from app.config import settings
    
    api_key_configured = bool(settings.openrouter_api_key)
    
    return {
        "ai_enabled": api_key_configured,
        "model": settings.openrouter_model if api_key_configured else None,
        "message": "AI features are enabled" if api_key_configured else "Configure OPENROUTER_API_KEY to enable AI features"
    }


@router.post("/smart-validate")
async def smart_validate_with_ai(request: AnalyzeDataRequest) -> Dict[str, Any]:
    """
    Validate data and provide AI-enhanced feedback.
    
    Combines standard validation with AI analysis for:
    - Better error messages
    - Smart correction suggestions
    - Contextual recommendations
    """
    from app.services.validator import DataValidator
    from app.services.corrector import DataCorrector
    
    # Run standard validation
    validator = DataValidator()
    validation_result = await validator.validate(
        data=request.data,
        data_type=DataType(request.data_type),
        column_mapping=request.column_mapping
    )
    
    # Get quality score
    quality_score = await validator.compute_quality_score(
        data=request.data,
        data_type=DataType(request.data_type),
        column_mapping=request.column_mapping
    )
    
    # Get correction suggestions
    corrector = DataCorrector()
    suggestions = await corrector.suggest_corrections(
        data=request.data,
        data_type=DataType(request.data_type),
        column_mapping=request.column_mapping
    )
    
    # Run AI analysis if we have errors
    ai_analysis = None
    if validation_result.error_count > 0 or validation_result.warning_count > 0:
        analyzer = AIAnalyzer()
        ai_analysis = await analyzer.analyze_data_quality(
            data=request.data,
            data_type=request.data_type,
            column_mapping=request.column_mapping,
            validation_errors=[
                {"row": e.row, "column": e.column, "message": e.message}
                for e in validation_result.errors[:20]
            ]
        )
    
    return {
        "success": True,
        "validation": {
            "is_valid": validation_result.is_valid,
            "total_rows": validation_result.total_rows,
            "valid_rows": validation_result.valid_rows,
            "error_count": validation_result.error_count,
            "warning_count": validation_result.warning_count,
            "errors": [
                {
                    "row": e.row,
                    "column": e.column,
                    "error_type": e.error_type.value,
                    "message": e.message,
                    "severity": e.severity.value,
                    "current_value": e.current_value
                }
                for e in validation_result.errors[:50]
            ],
            "warnings": [
                {
                    "row": w.row,
                    "column": w.column,
                    "message": w.message
                }
                for w in validation_result.warnings[:20]
            ]
        },
        "quality": {
            "score": quality_score.overall_score,
            "completeness": quality_score.completeness,
            "accuracy": quality_score.accuracy,
            "consistency": quality_score.consistency
        },
        "corrections": [
            {
                "row": s.row,
                "column": s.column,
                "original": s.original_value,
                "suggested": s.suggested_value,
                "confidence": s.confidence,
                "reason": s.reason
            }
            for s in suggestions[:30]
        ],
        "ai_analysis": ai_analysis,
        "can_proceed": validation_result.is_valid,
        "message": _generate_status_message(validation_result, quality_score)
    }


def _generate_status_message(validation_result, quality_score) -> str:
    """Generate a user-friendly status message."""
    if validation_result.is_valid:
        if quality_score.overall_score >= 90:
            return "✅ Excellent! Your data is valid and high quality. Ready to process."
        elif quality_score.overall_score >= 70:
            return "✅ Good! Your data is valid. Some minor improvements suggested."
        else:
            return "⚠️ Valid but quality could be improved. Consider applying suggested corrections."
    else:
        return f"❌ {validation_result.error_count} errors found. Please fix them before processing."

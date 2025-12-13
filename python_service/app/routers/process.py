"""
Process router - Main data processing endpoints.
Handles validation, correction, and full processing pipeline.
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from typing import Dict, Any, List, Optional
import logging
import time

from bson import ObjectId

from app.models.upload import (
    ProcessingRequest,
    ValidationRequest,
    CorrectionRequest,
    DataType
)
from app.models.validation import ValidationResult, CorrectionResult
from app.models.kpi import ProcessingResult, KPISnapshot
from app.services.validator import DataValidator
from app.services.corrector import DataCorrector
from app.services.parser import DataParser
from app.services.kpi_engine import KPIEngine
from app.database import Database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/process", tags=["Processing"])


@router.post("/validate", response_model=ValidationResult)
async def validate_data(request: ValidationRequest) -> ValidationResult:
    """
    Step 1: Validate uploaded data.
    Returns validation result with errors/warnings.
    Does NOT store anything in database.
    
    Use this endpoint to check data quality before committing to full processing.
    """
    logger.info(f"Validating {len(request.data)} rows of {request.data_type.value} data")
    
    validator = DataValidator()
    result = await validator.validate(
        data=request.data,
        data_type=request.data_type,
        column_mapping=request.column_mapping
    )
    
    logger.info(f"Validation complete: {result.valid_rows}/{result.total_rows} valid, {result.error_count} errors")
    
    return result


@router.post("/correct", response_model=CorrectionResult)
async def correct_data(request: CorrectionRequest) -> CorrectionResult:
    """
    Step 2: Apply corrections to data.
    Returns corrected data and correction log.
    Does NOT store anything in database.
    
    This endpoint normalizes dates, cleans numeric values, and standardizes text.
    """
    logger.info(f"Correcting {len(request.data)} rows of {request.data_type.value} data")
    
    corrector = DataCorrector()
    result = await corrector.correct(
        data=request.data,
        data_type=request.data_type,
        column_mapping=request.column_mapping,
        validation_errors=request.validation_errors
    )
    
    logger.info(f"Correction complete: {result.corrections_applied} corrections applied")
    
    return result


@router.post("/process", response_model=ProcessingResult)
async def process_and_store(request: ProcessingRequest) -> ProcessingResult:
    """
    Step 3: Full processing pipeline.
    
    Flow:
    1. Validate data
    2. If validation fails → return errors, DO NOT store
    3. If validation passes → correct minor issues
    4. Parse into structured format
    5. Compute KPIs
    6. Store in database
    7. Return success with KPI summary
    
    This is the main endpoint to call after file upload and column mapping.
    """
    start_time = time.time()
    logger.info(f"Processing {len(request.data)} rows for business {request.business_id}")
    
    # Step 1: Validate
    validator = DataValidator()
    validation_result = await validator.validate(
        data=request.data,
        data_type=request.data_type,
        column_mapping=request.column_mapping
    )
    
    if not validation_result.is_valid:
        logger.warning(f"Validation failed with {validation_result.error_count} errors")
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Validation failed. Data was NOT stored.",
                "error_count": validation_result.error_count,
                "errors": [
                    {
                        "row": e.row,
                        "column": e.column,
                        "error_type": e.error_type.value,
                        "message": e.message,
                        "current_value": e.current_value,
                        "expected": e.expected
                    }
                    for e in validation_result.errors[:50]  # Limit to first 50 errors
                ],
                "summary": validation_result.summary
            }
        )
    
    # Step 2: Correct
    corrector = DataCorrector()
    correction_result = await corrector.correct(
        data=request.data,
        data_type=request.data_type,
        column_mapping=request.column_mapping
    )
    
    corrected_data = correction_result.corrected_data
    
    # Step 3: Parse
    parser = DataParser()
    parsed_data = await parser.parse(
        data=corrected_data,
        data_type=request.data_type,
        column_mapping=request.column_mapping
    )
    
    logger.info(f"Parsed {parsed_data.record_count} records")
    
    # Step 4: Compute KPIs
    kpi_engine = KPIEngine(request.business_id)
    
    # Prepare data for KPI computation based on data type
    sales_data = parsed_data.records if request.data_type == DataType.SALES else []
    wastage_data = parsed_data.records if request.data_type == DataType.WASTAGE else []
    purchase_data = parsed_data.records if request.data_type == DataType.PURCHASE else []
    
    # For KPI computation, we might need to fetch other data types from DB
    # For now, compute with available data
    kpi_result = await kpi_engine.compute_all_kpis(
        sales_data=sales_data,
        wastage_data=wastage_data,
        purchase_data=purchase_data,
        period=request.period
    )
    
    if not kpi_result.success:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "KPI computation failed",
                "errors": kpi_result.errors
            }
        )
    
    # Step 5: Store in database (only after validation passes!)
    kpi_snapshot_id = None
    try:
        # Store KPI snapshot
        if kpi_result.snapshot:
            snapshot_dict = kpi_result.snapshot.to_mongo_dict()
            insert_result = await Database.kpisnapshots().insert_one(snapshot_dict)
            kpi_snapshot_id = str(insert_result.inserted_id)
            logger.info(f"Stored KPI snapshot: {kpi_snapshot_id}")
        
        # Update upload status
        await Database.uploads().update_one(
            {"_id": ObjectId(request.upload_id)},
            {
                "$set": {
                    "status": "completed",
                    "summary.totalRows": parsed_data.record_count,
                    "summary.validRows": validation_result.valid_rows,
                    "summary.errorRows": validation_result.error_count,
                    "summary.processedAt": datetime.utcnow()
                }
            }
        )
        logger.info(f"Updated upload {request.upload_id} status to completed")
        
    except Exception as e:
        logger.error(f"Database storage error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to store data in database",
                "error": str(e)
            }
        )
    
    processing_time = (time.time() - start_time) * 1000
    
    return ProcessingResult(
        success=True,
        message="Data processed and stored successfully",
        upload_id=request.upload_id,
        business_id=request.business_id,
        validation_passed=True,
        total_rows=parsed_data.record_count,
        valid_rows=validation_result.valid_rows,
        corrected_rows=correction_result.corrections_applied,
        kpi_snapshot=kpi_result.snapshot,
        kpi_snapshot_id=kpi_snapshot_id,
        processing_time_ms=round(processing_time, 2),
        processed_at=datetime.utcnow()
    )


@router.post("/validate-and-preview")
async def validate_and_preview(request: ValidationRequest) -> Dict[str, Any]:
    """
    Validate data and return a preview of corrections that would be applied.
    Useful for showing user what will happen before committing.
    """
    # Validate
    validator = DataValidator()
    validation_result = await validator.validate(
        data=request.data,
        data_type=request.data_type,
        column_mapping=request.column_mapping
    )
    
    # Get quality score
    quality_score = await validator.compute_quality_score(
        data=request.data,
        data_type=request.data_type,
        column_mapping=request.column_mapping
    )
    
    # Get correction suggestions
    corrector = DataCorrector()
    suggestions = await corrector.suggest_corrections(
        data=request.data,
        data_type=request.data_type,
        column_mapping=request.column_mapping
    )
    
    return {
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
                    "message": e.message,
                    "severity": e.severity.value
                }
                for e in validation_result.errors[:20]
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
        "quality_score": {
            "overall": quality_score.overall_score,
            "completeness": quality_score.completeness,
            "accuracy": quality_score.accuracy
        },
        "corrections_preview": [
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
        "can_proceed": validation_result.is_valid,
        "recommendation": "Data is valid and ready for processing" if validation_result.is_valid 
                         else f"Please fix {validation_result.error_count} errors before processing"
    }


@router.post("/recompute-kpis")
async def recompute_kpis(
    business_id: str,
    period: str = "weekly"
) -> Dict[str, Any]:
    """
    Recompute KPIs for a business using existing data in the database.
    Useful for manual recalculation or after data fixes.
    """
    logger.info(f"Recomputing KPIs for business {business_id}")
    
    try:
        # Fetch recent uploads for this business
        uploads = await Database.uploads().find({
            "business": ObjectId(business_id),
            "status": "completed"
        }).sort("createdAt", -1).limit(10).to_list(length=10)
        
        if not uploads:
            raise HTTPException(
                status_code=404,
                detail="No completed uploads found for this business"
            )
        
        # Aggregate data from uploads (simplified - in production would fetch actual data)
        kpi_engine = KPIEngine(business_id)
        kpi_result = await kpi_engine.compute_all_kpis(
            sales_data=[],  # Would fetch from stored data
            period=period
        )
        
        if kpi_result.success and kpi_result.snapshot:
            # Store new snapshot
            snapshot_dict = kpi_result.snapshot.to_mongo_dict()
            insert_result = await Database.kpisnapshots().insert_one(snapshot_dict)
            
            return {
                "success": True,
                "message": "KPIs recomputed successfully",
                "snapshot_id": str(insert_result.inserted_id),
                "health_score": kpi_result.snapshot.period_health_score
            }
        else:
            return {
                "success": False,
                "errors": kpi_result.errors
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recomputing KPIs: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

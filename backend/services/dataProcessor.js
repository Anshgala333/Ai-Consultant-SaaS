// Data Processor Service - Processes uploaded CSV/Excel data
// Handles data validation, transformation, and aggregation via Python Microservice

const { Upload, KpiSnapshot, Issue } = require('../models');
const axios = require('axios');

class DataProcessor {
    constructor(businessId) {
        this.businessId = businessId;
        this.pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    }

    // Main processing method - called after column mapping
    async processUpload(upload) {
        const data = upload.parsedData || [];
        const mapping = upload.columnMapping ? Object.fromEntries(upload.columnMapping) : {};
        const dataType = upload.dataType;

        if (data.length === 0) {
            throw new Error('No data to process');
        }

        console.log(`[DataProcessor] Sending ${data.length} rows to Python service for processing...`);

        try {
            // Call Python service to validate, process, and store KPIs
            const response = await axios.post(`${this.pythonServiceUrl}/api/process/process`, {
                upload_id: upload._id.toString(),
                business_id: this.businessId.toString(),
                data: data,
                data_type: dataType,
                column_mapping: mapping,
                period: 'weekly' // Default or configurable
            });

            const result = response.data;
            console.log(`[DataProcessor] Python processing successful. KPI Snapshot ID: ${result.kpi_snapshot_id}`);

            // Update upload status (Python service might have done this, but good to ensure)
            upload.status = 'completed';
            upload.processedAt = new Date();
            upload.validationResult = {
                isValid: true,
                errors: [],
                rowsProcessed: result.valid_rows,
                summary: {
                    totalRows: result.total_rows,
                    validRows: result.valid_rows,
                    correctedRows: result.corrected_rows
                }
            };
            await upload.save();

            return {
                type: dataType,
                summary: result.kpi_snapshot ? result.kpi_snapshot.summary : {}, // Assuming snapshot structure
                metrics: result.kpi_snapshot,
                processingResult: result
            };

        } catch (error) {
            console.error('[DataProcessor] Python service error:', error.message);
            if (error.response) {
                console.error('[DataProcessor] Error details:', error.response.data);
                
                // If validation failed
                if (error.response.status === 400 && error.response.data.detail) {
                     const detail = error.response.data.detail;
                     upload.status = 'failed';
                     upload.validationResult = {
                         isValid: false,
                         errors: detail.errors || [],
                         summary: detail.summary
                     };
                     await upload.save();
                     throw new Error(`Validation failed: ${detail.message}`);
                }
            }
            
            upload.status = 'failed';
            await upload.save();
            throw error;
        }
    }
}

module.exports = DataProcessor;

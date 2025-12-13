/**
 * Python Data Processing Service API
 * 
 * This module provides frontend integration with the Python FastAPI service
 * for data validation, AI analysis, and template downloads.
 */

import axios from 'axios';

// Python service URL - runs on port 8001
const PYTHON_SERVICE_URL = import.meta.env.VITE_PYTHON_SERVICE_URL || 'http://localhost:8001';

// Create axios instance for Python service
const pythonApi = axios.create({
  baseURL: PYTHON_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 second timeout for AI operations
});

// Add response interceptor for error handling
pythonApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error cases
    if (error.response?.status === 400) {
      // Validation errors - these are expected, return the error details
      return Promise.reject({
        type: 'validation_error',
        message: error.response.data.detail?.message || 'Validation failed',
        errors: error.response.data.detail?.errors || [],
        summary: error.response.data.detail?.summary
      });
    }
    if (error.response?.status === 500) {
      return Promise.reject({
        type: 'server_error',
        message: error.response.data.detail || 'Server error occurred'
      });
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        type: 'timeout',
        message: 'Request timed out. AI analysis may take longer for large datasets.'
      });
    }
    if (!error.response) {
      return Promise.reject({
        type: 'network_error',
        message: 'Cannot connect to Python service. Please ensure it is running on port 8001.'
      });
    }
    return Promise.reject(error);
  }
);

/**
 * Data Processing API
 */
export const dataProcessingAPI = {
  /**
   * Validate data without storing
   * @param {Object} data - { data, data_type, column_mapping }
   * @returns {Promise} Validation result with errors and warnings
   */
  validate: (data) => pythonApi.post('/api/process/validate', data),

  /**
   * Apply corrections to data
   * @param {Object} data - { data, data_type, column_mapping, validation_errors }
   * @returns {Promise} Corrected data with correction log
   */
  correct: (data) => pythonApi.post('/api/process/correct', data),

  /**
   * Full processing pipeline - validate, correct, parse, compute KPIs, store
   * @param {Object} data - { upload_id, business_id, data, data_type, column_mapping, period }
   * @returns {Promise} Processing result with KPI snapshot
   */
  process: (data) => pythonApi.post('/api/process/process', data),

  /**
   * Validate data and preview corrections without storing
   * @param {Object} data - { data, data_type, column_mapping }
   * @returns {Promise} Validation result with correction preview
   */
  validateAndPreview: (data) => pythonApi.post('/api/process/validate-and-preview', data),

  /**
   * Recompute KPIs for a business
   * @param {string} businessId - Business ObjectId
   * @param {string} period - 'weekly' or 'monthly'
   */
  recomputeKPIs: (businessId, period = 'weekly') =>
    pythonApi.post('/api/process/recompute-kpis', null, {
      params: { business_id: businessId, period }
    })
};

/**
 * AI Analysis API
 */
export const aiAPI = {
  /**
   * Check if AI features are enabled
   * @returns {Promise} { ai_enabled, model, message }
   */
  getStatus: () => pythonApi.get('/api/ai/status'),

  /**
   * Analyze data quality using AI
   * @param {Object} data - { data, data_type, column_mapping, validation_errors }
   * @returns {Promise} AI analysis with quality score, issues, recommendations
   */
  analyzeData: (data) => pythonApi.post('/api/ai/analyze-data', data),

  /**
   * Get AI-powered correction suggestion for a specific error
   * @param {Object} data - { row_data, column, error_message, data_type }
   * @returns {Promise} Suggested value with confidence
   */
  suggestCorrection: (data) => pythonApi.post('/api/ai/suggest-correction', data),

  /**
   * Get AI analysis of KPIs with insights and recommendations
   * @param {Object} data - { current_kpis, historical_kpis }
   * @returns {Promise} AI insights and recommendations
   */
  analyzeKPIs: (data) => pythonApi.post('/api/ai/analyze-kpis', data),

  /**
   * Get AI-powered format recommendations for a data type
   * @param {string} dataType - 'sales', 'wastage', etc.
   */
  getFormatRecommendations: (dataType) =>
    pythonApi.get(`/api/ai/format-recommendations/${dataType}`),

  /**
   * Smart validate with AI-enhanced feedback
   * @param {Object} data - { data, data_type, column_mapping }
   * @returns {Promise} Validation + AI analysis combined
   */
  smartValidate: (data) => pythonApi.post('/api/ai/smart-validate', data)
};

/**
 * Templates API
 */
export const templatesAPI = {
  /**
   * Get all supported data types with info
   * @returns {Promise} List of data types with descriptions
   */
  getAllTypes: () => pythonApi.get('/api/templates/all-types'),

  /**
   * Get format guide for a data type
   * @param {string} dataType - 'sales', 'wastage', etc.
   * @returns {Promise} Format guide with columns, examples, tips
   */
  getFormatGuide: (dataType) => pythonApi.get(`/api/templates/format-guide/${dataType}`),

  /**
   * Get sample data as JSON
   * @param {string} dataType - 'sales', 'wastage', etc.
   */
  getSampleData: (dataType) => pythonApi.get(`/api/templates/sample-data/${dataType}`),

  /**
   * Download sample Excel template
   * @param {string} dataType - 'sales', 'wastage', etc.
   */
  downloadTemplate: async (dataType) => {
    const response = await pythonApi.get(`/api/templates/download/${dataType}`, {
      responseType: 'blob'
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sample_${dataType}_template.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return response;
  }
};

/**
 * Health Check API
 */
export const healthAPI = {
  /**
   * Basic health check
   */
  check: () => pythonApi.get('/api/health'),

  /**
   * Detailed health check with MongoDB status
   */
  detailed: () => pythonApi.get('/api/health/detailed'),

  /**
   * Readiness check
   */
  ready: () => pythonApi.get('/api/health/ready')
};

/**
 * Helper to check if Python service is available
 */
export const checkPythonServiceHealth = async () => {
  try {
    const response = await healthAPI.check();
    return {
      available: true,
      status: response.data.status,
      version: response.data.version
    };
  } catch (error) {
    return {
      available: false,
      error: error.message || 'Python service not available'
    };
  }
};

/**
 * Helper to process upload with real-time feedback
 */
export const processUploadWithFeedback = async (uploadData, callbacks = {}) => {
  const { onValidating, onCorrecting, onProcessing, onComplete, onError } = callbacks;

  try {
    // Step 1: Validate
    if (onValidating) onValidating('Validating data...');

    const validationResult = await dataProcessingAPI.validateAndPreview({
      data: uploadData.data,
      data_type: uploadData.data_type,
      column_mapping: uploadData.column_mapping
    });

    const validation = validationResult.data;

    if (!validation.can_proceed) {
      if (onError) {
        onError({
          step: 'validation',
          message: `Found ${validation.validation.error_count} errors`,
          errors: validation.validation.errors,
          quality: validation.quality_score
        });
      }
      return { success: false, step: 'validation', result: validation };
    }

    // Step 2: Process (includes correction, parsing, KPI computation)
    if (onProcessing) onProcessing('Processing data and computing KPIs...');

    const processResult = await dataProcessingAPI.process({
      upload_id: uploadData.upload_id,
      business_id: uploadData.business_id,
      data: uploadData.data,
      data_type: uploadData.data_type,
      column_mapping: uploadData.column_mapping,
      period: uploadData.period || 'weekly'
    });

    if (onComplete) {
      onComplete({
        success: true,
        message: processResult.data.message,
        kpi_snapshot: processResult.data.kpi_snapshot,
        summary: {
          total_rows: processResult.data.total_rows,
          valid_rows: processResult.data.valid_rows,
          corrected_rows: processResult.data.corrected_rows,
          processing_time: processResult.data.processing_time_ms
        }
      });
    }

    return { success: true, result: processResult.data };

  } catch (error) {
    if (onError) {
      onError({
        step: 'processing',
        message: error.message || 'Processing failed',
        details: error
      });
    }
    return { success: false, error };
  }
};

export default pythonApi;

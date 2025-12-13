/**
 * React Hook for Data Processing with Real-time Status Updates
 * 
 * Provides easy integration with the Python data processing service
 * including status tracking, error handling, and AI features.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  dataProcessingAPI,
  aiAPI,
  templatesAPI,
  checkPythonServiceHealth,
  processUploadWithFeedback
} from '../pythonApi';

/**
 * Hook for data processing with real-time status updates
 */
export const useDataProcessing = () => {
  const [status, setStatus] = useState('idle'); // idle, validating, correcting, processing, complete, error
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [quality, setQuality] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setMessage('');
    setProgress(0);
    setResult(null);
    setErrors([]);
    setWarnings([]);
    setCorrections([]);
    setQuality(null);
    setAiAnalysis(null);
  }, []);

  /**
   * Validate data with real-time feedback
   */
  const validateData = useCallback(async (data, dataType, columnMapping) => {
    reset();
    setStatus('validating');
    setMessage('Validating your data...');
    setProgress(25);

    try {
      const response = await dataProcessingAPI.validateAndPreview({
        data,
        data_type: dataType,
        column_mapping: columnMapping
      });

      const validation = response.data;

      setProgress(50);
      setQuality(validation.quality_score);
      setErrors(validation.validation.errors || []);
      setWarnings(validation.validation.warnings || []);
      setCorrections(validation.corrections_preview || []);

      if (validation.can_proceed) {
        setStatus('validated');
        setMessage(validation.recommendation);
        setProgress(100);
      } else {
        setStatus('error');
        setMessage(`Found ${validation.validation.error_count} errors. Please fix them before proceeding.`);
      }

      setResult(validation);
      return validation;
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Validation failed');
      setErrors(error.errors || []);
      throw error;
    }
  }, [reset]);

  /**
   * Process data with full pipeline
   */
  const processData = useCallback(async (uploadId, businessId, data, dataType, columnMapping, period = 'weekly') => {
    setStatus('processing');
    setMessage('Processing data and computing KPIs...');
    setProgress(60);

    try {
      const response = await dataProcessingAPI.process({
        upload_id: uploadId,
        business_id: businessId,
        data,
        data_type: dataType,
        column_mapping: columnMapping,
        period
      });

      setProgress(100);
      setStatus('complete');
      setMessage('✅ Data processed successfully!');
      setResult(response.data);
      return response.data;
    } catch (error) {
      setStatus('error');
      if (error.type === 'validation_error') {
        setMessage(error.message);
        setErrors(error.errors || []);
      } else {
        setMessage(error.message || 'Processing failed');
      }
      throw error;
    }
  }, []);

  /**
   * Validate and process in one call
   */
  const validateAndProcess = useCallback(async (uploadId, businessId, data, dataType, columnMapping, period = 'weekly') => {
    reset();

    // Step 1: Validate
    const validation = await validateData(data, dataType, columnMapping);

    if (!validation.can_proceed) {
      return { success: false, step: 'validation', validation };
    }

    // Step 2: Process
    const processResult = await processData(uploadId, businessId, data, dataType, columnMapping, period);

    return { success: true, result: processResult };
  }, [reset, validateData, processData]);

  return {
    // State
    status,
    message,
    progress,
    result,
    errors,
    warnings,
    corrections,
    quality,
    aiAnalysis,

    // Actions
    reset,
    validateData,
    processData,
    validateAndProcess,

    // Computed
    isIdle: status === 'idle',
    isLoading: ['validating', 'correcting', 'processing'].includes(status),
    isComplete: status === 'complete',
    isError: status === 'error',
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
    hasCorrections: corrections.length > 0
  };
};

/**
 * Hook for AI analysis features
 */
export const useAIAnalysis = () => {
  const [aiEnabled, setAiEnabled] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // Check AI status on mount
  useEffect(() => {
    const checkAI = async () => {
      try {
        const response = await aiAPI.getStatus();
        setAiEnabled(response.data.ai_enabled);
      } catch {
        setAiEnabled(false);
      }
    };
    checkAI();
  }, []);

  /**
   * Analyze data quality with AI
   */
  const analyzeDataQuality = useCallback(async (data, dataType, columnMapping, validationErrors = []) => {
    setLoading(true);
    setError(null);

    try {
      const response = await aiAPI.analyzeData({
        data,
        data_type: dataType,
        column_mapping: columnMapping,
        validation_errors: validationErrors
      });

      setAnalysis(response.data.analysis);
      return response.data.analysis;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get AI suggestion for a correction
   */
  const getSuggestion = useCallback(async (rowData, column, errorMessage, dataType) => {
    try {
      const response = await aiAPI.suggestCorrection({
        row_data: rowData,
        column,
        error_message: errorMessage,
        data_type: dataType
      });
      return response.data.suggestion;
    } catch (err) {
      console.error('AI suggestion failed:', err);
      return null;
    }
  }, []);

  /**
   * Analyze KPIs with AI
   */
  const analyzeKPIs = useCallback(async (currentKpis, historicalKpis = []) => {
    setLoading(true);
    setError(null);

    try {
      const response = await aiAPI.analyzeKPIs({
        current_kpis: currentKpis,
        historical_kpis: historicalKpis
      });

      setAnalysis(response.data.analysis);
      return response.data.analysis;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Smart validate with AI
   */
  const smartValidate = useCallback(async (data, dataType, columnMapping) => {
    setLoading(true);
    setError(null);

    try {
      const response = await aiAPI.smartValidate({
        data,
        data_type: dataType,
        column_mapping: columnMapping
      });

      setAnalysis(response.data.ai_analysis);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    aiEnabled,
    loading,
    analysis,
    error,
    analyzeDataQuality,
    getSuggestion,
    analyzeKPIs,
    smartValidate
  };
};

/**
 * Hook for template management
 */
export const useTemplates = () => {
  const [dataTypes, setDataTypes] = useState([]);
  const [formatGuide, setFormatGuide] = useState(null);
  const [sampleData, setSampleData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDataTypes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await templatesAPI.getAllTypes();
      setDataTypes(response.data.data_types);
      return response.data.data_types;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFormatGuide = useCallback(async (dataType) => {
    setLoading(true);
    try {
      const response = await templatesAPI.getFormatGuide(dataType);
      setFormatGuide(response.data);
      return response.data;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSampleData = useCallback(async (dataType) => {
    setLoading(true);
    try {
      const response = await templatesAPI.getSampleData(dataType);
      setSampleData(response.data);
      return response.data;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadTemplate = useCallback(async (dataType) => {
    await templatesAPI.downloadTemplate(dataType);
  }, []);

  return {
    dataTypes,
    formatGuide,
    sampleData,
    loading,
    fetchDataTypes,
    fetchFormatGuide,
    fetchSampleData,
    downloadTemplate
  };
};

/**
 * Hook for Python service health
 */
export const usePythonServiceHealth = () => {
  const [health, setHealth] = useState({
    checked: false,
    available: false,
    status: null,
    version: null,
    error: null
  });

  const checkHealth = useCallback(async () => {
    const result = await checkPythonServiceHealth();
    setHealth({
      checked: true,
      available: result.available,
      status: result.status,
      version: result.version,
      error: result.error
    });
    return result;
  }, []);

  // Check health on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    ...health,
    checkHealth
  };
};

export default useDataProcessing;

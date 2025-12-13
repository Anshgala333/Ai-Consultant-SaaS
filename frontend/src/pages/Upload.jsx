import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { uploadAPI, businessAPI } from '../api';
import { 
    dataProcessingAPI, 
    aiAPI, 
    templatesAPI, 
    checkPythonServiceHealth 
} from '../pythonApi';
import { 
    Upload as UploadIcon, 
    File, 
    Check, 
    ArrowRight, 
    ArrowLeft,
    ChevronDown, 
    ChevronUp,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Download,
    Sparkles,
    RefreshCw,
    MapPin,
    Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Upload.css';

const Upload = () => {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [dataType, setDataType] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [branches, setBranches] = useState([]);
    const [uploadResult, setUploadResult] = useState(null);
    const [mapping, setMapping] = useState({});
    const [customKpis, setCustomKpis] = useState([]);
    const [customKpiMapping, setCustomKpiMapping] = useState({});
    const [showCustomKpis, setShowCustomKpis] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Python service state
    const [pythonServiceStatus, setPythonServiceStatus] = useState({ checked: false, available: false });
    const [validationStatus, setValidationStatus] = useState('idle');
    const [validationMessage, setValidationMessage] = useState('');
    const [validationErrors, setValidationErrors] = useState([]);
    const [processingResult, setProcessingResult] = useState(null);

    const dataTypes = [
        { value: 'sales', label: 'Sales', icon: '💰' },
        { value: 'purchase', label: 'Purchase', icon: '📦' },
        { value: 'wastage', label: 'Wastage', icon: '🗑️' },
        { value: 'inventory', label: 'Inventory', icon: '📊' },
        { value: 'staff', label: 'Staff', icon: '👥' }
    ];

    const requiredFields = {
        sales: ['date', 'amount', 'sku'],
        purchase: ['date', 'amount', 'item'],
        wastage: ['date', 'item', 'quantity'],
        inventory: ['item', 'quantity'],
        staff: ['date', 'staff_name', 'status']
    };

    // Load branches and check Python service on mount
    useEffect(() => {
        const init = async () => {
            // Check Python service
            try {
                const health = await checkPythonServiceHealth();
                setPythonServiceStatus({ checked: true, ...health });
            } catch {
                setPythonServiceStatus({ checked: true, available: false });
            }

            // Load branches/outlets
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                // If user has outlets defined, use them
                if (user.outlets && user.outlets.length > 0) {
                    setBranches(user.outlets);
                } else {
                    // Default to main branch
                    setBranches([{ id: 'main', name: 'Main Branch' }]);
                }
                setSelectedBranch('main');
            } catch {
                setBranches([{ id: 'main', name: 'Main Branch' }]);
                setSelectedBranch('main');
            }
        };
        init();
    }, []);

    const handleFileDrop = useCallback((e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer?.files[0] || e.target.files?.[0];
        if (droppedFile) {
            if (droppedFile.name.match(/\.(csv|xlsx|xls)$/i)) {
                setFile(droppedFile);
            } else {
                toast.error('Please upload a CSV or Excel file');
            }
        }
    }, []);

    const handleDownloadTemplate = async () => {
        if (!dataType) {
            toast.error('Please select a data type first');
            return;
        }
        try {
            await templatesAPI.downloadTemplate(dataType);
            toast.success(`Sample template downloaded!`);
        } catch (error) {
            toast.error('Failed to download template');
        }
    };

    const handleUpload = async () => {
        if (!file || !dataType) {
            toast.error('Please select a file and data type');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('dataType', dataType);
        formData.append('branch', selectedBranch);

        try {
            const response = await uploadAPI.uploadFile(formData);
            const uploadData = response.data.upload || response.data;
            
            setUploadResult({
                _id: uploadData._id,
                headers: response.data.headers || uploadData.headers || [],
                previewRows: response.data.previewRows || uploadData.previewData?.slice(0, 5) || [],
                previewData: response.data.previewRows || uploadData.previewData || [],
                summary: uploadData.summary || {}
            });

            setCustomKpis(response.data.customKpis || []);

            // Auto-detect mapping
            const headers = response.data.headers || uploadData.headers || [];
            const initialMapping = {};
            requiredFields[dataType]?.forEach(field => {
                const match = headers.find(h =>
                    h.toLowerCase().includes(field) ||
                    field.includes(h.toLowerCase())
                );
                if (match) initialMapping[field] = match;
            });
            setMapping(initialMapping);

            setStep(2);
            toast.success('File uploaded successfully!');
            
            // Run validation if Python service available
            if (pythonServiceStatus.available && response.data.previewRows?.length > 0) {
                runValidation(response.data.previewRows || uploadData.previewData, initialMapping);
            }
        } catch (error) {
            // Show simple, clear error messages
            const errorMessage = getSimpleErrorMessage(error);
            toast.error(errorMessage);
            setValidationStatus('error');
            setValidationMessage(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Convert technical errors to simple user-friendly messages
    const getSimpleErrorMessage = (error) => {
        const message = error.response?.data?.message || error.message || '';
        const status = error.response?.status;
        
        // Check for specific error patterns
        if (message.toLowerCase().includes('empty') || message.toLowerCase().includes('no data')) {
            return 'File is empty or has no data';
        }
        if (message.toLowerCase().includes('column') || message.toLowerCase().includes('header')) {
            return 'Missing required columns in file';
        }
        if (message.toLowerCase().includes('format') || message.toLowerCase().includes('parse')) {
            return 'Invalid file format - check your file';
        }
        if (message.toLowerCase().includes('date')) {
            return 'Invalid date format in file';
        }
        if (message.toLowerCase().includes('number') || message.toLowerCase().includes('numeric')) {
            return 'Invalid numbers in file';
        }
        if (message.toLowerCase().includes('duplicate')) {
            return 'Duplicate entries found';
        }
        if (message.toLowerCase().includes('required')) {
            return 'Missing required fields';
        }
        if (status === 413 || message.toLowerCase().includes('size') || message.toLowerCase().includes('large')) {
            return 'File too large (max 10MB)';
        }
        if (status === 415 || message.toLowerCase().includes('type')) {
            return 'Unsupported file type';
        }
        if (status === 500) {
            return 'Server error - try again';
        }
        if (status === 401 || status === 403) {
            return 'Please login again';
        }
        
        // Default short message
        return message.length > 50 ? 'Upload failed - check your file' : (message || 'Upload failed');
    };

    const runValidation = async (data, columnMapping) => {
        if (!pythonServiceStatus.available) return;
        
        setValidationStatus('validating');
        setValidationMessage('Checking data...');
        setValidationErrors([]);
        
        try {
            const response = await dataProcessingAPI.validateAndPreview({
                data: data,
                data_type: dataType,
                column_mapping: columnMapping
            });
            
            const result = response.data;
            const validation = result.validation || result;
            
            // Simplify error messages
            const errors = (validation.errors || []).map(err => {
                if (typeof err === 'string') return err;
                // Create simple error message from error object
                const row = err.row ? `Row ${err.row}` : '';
                const field = err.field || err.column || '';
                const msg = err.message || err.error || 'Invalid value';
                return row ? `${row}: ${msg}` : (field ? `${field}: ${msg}` : msg);
            });
            setValidationErrors(errors);
            
            if (validation.is_valid || result.can_proceed) {
                setValidationStatus('validated');
                setValidationMessage('✓ Ready to process');
            } else {
                const errorCount = validation.error_count || errors.length || 0;
                setValidationStatus('error');
                setValidationMessage(errorCount === 1 ? '1 issue found' : `${errorCount} issues found`);
            }
        } catch (error) {
            setValidationStatus('error');
            setValidationMessage(getSimpleErrorMessage(error));
        }
    };

    const handleMappingChange = (field, value) => {
        const newMapping = { ...mapping, [field]: value };
        setMapping(newMapping);
        
        if (pythonServiceStatus.available && uploadResult?.previewData?.length > 0) {
            clearTimeout(window.validationTimeout);
            window.validationTimeout = setTimeout(() => {
                runValidation(uploadResult.previewData, newMapping);
            }, 500);
        }
    };

    const handleSaveMapping = async () => {
        if (!uploadResult?._id) {
            toast.error('No upload found');
            return;
        }

        const missingFields = requiredFields[dataType]?.filter(field => !mapping[field]);
        if (missingFields?.length > 0) {
            toast.error(`Map all required fields: ${missingFields.join(', ')}`);
            return;
        }

        if (validationStatus === 'error' && validationErrors.length > 0) {
            toast.error('Fix validation errors first');
            return;
        }

        setLoading(true);
        setValidationStatus('validating');
        setValidationMessage('Processing...');
        
        try {
            await uploadAPI.saveMapping(uploadResult._id, mapping, customKpiMapping);
            
            if (pythonServiceStatus.available && uploadResult?.previewData?.length > 0) {
                try {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    const businessId = user.business || user.businessId || '';
                    
                    const processResponse = await dataProcessingAPI.process({
                        upload_id: uploadResult._id,
                        business_id: businessId,
                        data: uploadResult.previewData,
                        data_type: dataType,
                        column_mapping: mapping,
                        branch: selectedBranch,
                        period: 'weekly'
                    });
                    
                    setProcessingResult(processResponse.data);
                    toast.success('Data processed successfully!');
                } catch (pythonError) {
                    if (pythonError.type === 'validation_error') {
                        setValidationStatus('error');
                        setValidationMessage(pythonError.message);
                        setValidationErrors(pythonError.errors || []);
                        toast.error(pythonError.message);
                        setLoading(false);
                        return;
                    }
                }
            }
            
            setStep(3);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to process');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
            if (step === 2) {
                // Reset validation state when going back to step 1
                setValidationStatus('idle');
                setValidationErrors([]);
            }
        }
    };

    const resetForm = () => {
        setStep(1);
        setFile(null);
        setDataType('');
        setUploadResult(null);
        setMapping({});
        setCustomKpiMapping({});
        setValidationStatus('idle');
        setValidationErrors([]);
        setProcessingResult(null);
    };

    const getMappedCustomKpisCount = () => {
        return Object.values(customKpiMapping).filter(v => v).length;
    };

    return (
        <div className="page upload-page">
            <div className="container">
                {/* Compact Header */}
                <div className="upload-header">
                    <div className="header-left">
                        {step > 1 && step < 3 && (
                            <button className="btn-back" onClick={handleBack}>
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h1 className="page-title">Upload Data</h1>
                            <p className="page-subtitle">
                                {step === 1 && 'Select type and upload your file'}
                                {step === 2 && 'Map columns to fields'}
                                {step === 3 && 'Upload complete!'}
                            </p>
                        </div>
                    </div>
                    {pythonServiceStatus.available && (
                        <div className="ai-badge-small">
                            <Sparkles size={14} />
                            AI Active
                        </div>
                    )}
                </div>

                {/* Progress Steps - Compact */}
                <div className="progress-bar-simple">
                    <div className="progress-fill-simple" style={{ width: `${(step / 3) * 100}%` }} />
                </div>
                <div className="step-indicators">
                    <span className={step >= 1 ? 'active' : ''}>1. Upload</span>
                    <span className={step >= 2 ? 'active' : ''}>2. Map</span>
                    <span className={step >= 3 ? 'active' : ''}>3. Done</span>
                </div>

                {/* Step 1: Upload */}
                {step === 1 && (
                    <div className="upload-step-content">
                        {/* Branch Selection */}
                        <div className="form-section">
                            <label className="section-label">
                                <MapPin size={16} />
                                Branch / Outlet
                            </label>
                            <select 
                                className="form-select"
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                            >
                                {branches.map(branch => (
                                    <option key={branch.id || branch._id} value={branch.id || branch._id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Data Type Selection - Compact Chips */}
                        <div className="form-section">
                            <label className="section-label">Data Type</label>
                            <div className="data-type-chips">
                                {dataTypes.map(dt => (
                                    <button
                                        key={dt.value}
                                        className={`type-chip ${dataType === dt.value ? 'selected' : ''}`}
                                        onClick={() => setDataType(dt.value)}
                                    >
                                        <span className="chip-icon">{dt.icon}</span>
                                        <span>{dt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* File Upload */}
                        <div className="form-section">
                            <div className="section-header">
                                <label className="section-label">File</label>
                                {dataType && pythonServiceStatus.available && (
                                    <button 
                                        className="btn-link"
                                        onClick={handleDownloadTemplate}
                                    >
                                        <Download size={14} />
                                        Sample Template
                                    </button>
                                )}
                            </div>
                            <div
                                className={`drop-zone-compact ${file ? 'has-file' : ''}`}
                                onDrop={handleFileDrop}
                                onDragOver={(e) => e.preventDefault()}
                            >
                                {file ? (
                                    <div className="file-selected">
                                        <File size={24} />
                                        <div className="file-info-compact">
                                            <span className="file-name">{file.name}</span>
                                            <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                        <button className="btn-remove" onClick={() => setFile(null)}>×</button>
                                    </div>
                                ) : (
                                    <div className="drop-content">
                                        <UploadIcon size={32} />
                                        <span>Drop file here or <label className="browse-link">browse<input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileDrop} hidden /></label></span>
                                        <span className="file-hint">CSV, XLSX, XLS</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-full"
                            onClick={handleUpload}
                            disabled={!file || !dataType || loading}
                        >
                            {loading ? (
                                <><RefreshCw size={18} className="spinning" /> Uploading...</>
                            ) : (
                                <>Continue <ArrowRight size={18} /></>
                            )}
                        </button>
                    </div>
                )}

                {/* Step 2: Column Mapping - Cleaner */}
                {step === 2 && uploadResult && (
                    <div className="upload-step-content">
                        {/* Validation Status - Compact */}
                        {validationStatus !== 'idle' && (
                            <div className={`validation-badge ${validationStatus}`}>
                                {validationStatus === 'validating' && <RefreshCw size={14} className="spinning" />}
                                {validationStatus === 'validated' && <CheckCircle2 size={14} />}
                                {validationStatus === 'error' && <XCircle size={14} />}
                                <span>{validationMessage}</span>
                            </div>
                        )}

                        {/* Errors - Show first 3 with clear messages */}
                        {validationErrors.length > 0 && (
                            <div className="errors-panel">
                                <div className="errors-header">
                                    <AlertTriangle size={16} />
                                    <span>Fix {validationErrors.length} issue{validationErrors.length > 1 ? 's' : ''} to continue</span>
                                </div>
                                <ul className="errors-list-simple">
                                    {validationErrors.slice(0, 3).map((err, idx) => (
                                        <li key={idx}>{typeof err === 'string' ? err : (err.message || 'Invalid data')}</li>
                                    ))}
                                    {validationErrors.length > 3 && (
                                        <li className="more-errors">+{validationErrors.length - 3} more issues</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Quick Info */}
                        <div className="upload-summary">
                            <div className="summary-item">
                                <span className="summary-value">{uploadResult?.summary?.totalRows || uploadResult?.previewData?.length || 0}</span>
                                <span className="summary-label">Rows</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-value">{uploadResult?.headers?.length || 0}</span>
                                <span className="summary-label">Columns</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-value">{dataType}</span>
                                <span className="summary-label">Type</span>
                            </div>
                        </div>

                        {/* Column Mapping - Clean */}
                        <div className="mapping-section-clean">
                            <h3>Map Required Fields</h3>
                            <div className="mapping-list">
                                {requiredFields[dataType]?.map(field => (
                                    <div key={field} className="mapping-item">
                                        <label>{field.replace(/_/g, ' ')}</label>
                                        <select
                                            className={`form-select ${mapping[field] ? 'mapped' : ''}`}
                                            value={mapping[field] || ''}
                                            onChange={(e) => handleMappingChange(field, e.target.value)}
                                        >
                                            <option value="">Select column</option>
                                            {uploadResult.headers?.map(header => (
                                                <option key={header} value={header}>{header}</option>
                                            ))}
                                        </select>
                                        {mapping[field] && <Check size={16} className="check-icon" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Custom KPIs - Collapsible */}
                        {customKpis.length > 0 && (
                            <div className="custom-kpis-section">
                                <button 
                                    className="section-toggle"
                                    onClick={() => setShowCustomKpis(!showCustomKpis)}
                                >
                                    <span>Custom KPIs ({getMappedCustomKpisCount()}/{customKpis.length} mapped)</span>
                                    {showCustomKpis ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {showCustomKpis && (
                                    <div className="mapping-list">
                                        {customKpis.map(kpi => (
                                            <div key={kpi._id} className="mapping-item">
                                                <label>{kpi.name}</label>
                                                <select
                                                    className={`form-select ${customKpiMapping[kpi._id] ? 'mapped' : ''}`}
                                                    value={customKpiMapping[kpi._id] || ''}
                                                    onChange={(e) => setCustomKpiMapping({ 
                                                        ...customKpiMapping, 
                                                        [kpi._id]: e.target.value 
                                                    })}
                                                >
                                                    <option value="">Not mapped</option>
                                                    {uploadResult.headers?.map(header => (
                                                        <option key={header} value={header}>{header}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Preview - Minimal */}
                        <div className="preview-section-compact">
                            <h4>Preview</h4>
                            <div className="preview-scroll">
                                <table className="preview-table-compact">
                                    <thead>
                                        <tr>
                                            {uploadResult.headers?.slice(0, 5).map(h => <th key={h}>{h}</th>)}
                                            {uploadResult.headers?.length > 5 && <th>...</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {uploadResult.previewRows?.slice(0, 3).map((row, idx) => (
                                            <tr key={idx}>
                                                {uploadResult.headers?.slice(0, 5).map(h => (
                                                    <td key={h}>{row[h]}</td>
                                                ))}
                                                {uploadResult.headers?.length > 5 && <td>...</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-full"
                            onClick={handleSaveMapping}
                            disabled={loading || (validationStatus === 'error' && validationErrors.length > 0)}
                        >
                            {loading ? (
                                <><RefreshCw size={18} className="spinning" /> Processing...</>
                            ) : (
                                <>Process Data <ArrowRight size={18} /></>
                            )}
                        </button>
                    </div>
                )}

                {/* Step 3: Complete - Clean */}
                {step === 3 && (
                    <div className="upload-step-content complete-step">
                        <div className="success-content">
                            <div className="success-icon-large">✅</div>
                            <h2>Upload Complete!</h2>
                            <p>Your data has been processed successfully.</p>
                            
                            <div className="result-stats">
                                <div className="stat-box">
                                    <span className="stat-value-large">
                                        {processingResult?.total_rows || uploadResult?.summary?.totalRows || 0}
                                    </span>
                                    <span className="stat-label">Rows Processed</span>
                                </div>
                                {processingResult?.corrected_rows > 0 && (
                                    <div className="stat-box">
                                        <span className="stat-value-large">{processingResult.corrected_rows}</span>
                                        <span className="stat-label">Auto-Corrected</span>
                                    </div>
                                )}
                            </div>

                            <div className="complete-actions">
                                <button className="btn btn-primary" onClick={resetForm}>
                                    Upload Another
                                </button>
                                <Link to="/data-hub" className="btn btn-secondary">
                                    View Data Hub
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Upload;

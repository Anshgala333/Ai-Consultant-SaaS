import { useState, useCallback } from 'react';
import { uploadAPI } from '../api';
import { 
    Upload as UploadIcon, 
    File, 
    Check, 
    AlertCircle, 
    ArrowRight, 
    Info, 
    ChevronDown, 
    ChevronUp,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Calendar,
    TrendingUp,
    BarChart2,
    Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Upload.css';

const Upload = () => {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [dataType, setDataType] = useState('');
    const [uploadResult, setUploadResult] = useState(null);
    const [mapping, setMapping] = useState({});
    const [customKpis, setCustomKpis] = useState([]);
    const [customKpiMapping, setCustomKpiMapping] = useState({});
    const [showCustomKpis, setShowCustomKpis] = useState(true);
    const [loading, setLoading] = useState(false);
    const [dataQuality, setDataQuality] = useState(null);
    const [instantInsights, setInstantInsights] = useState(null);

    const dataTypes = [
        { value: 'sales', label: 'Sales Data', desc: 'Transaction records with amounts and items', icon: '💰' },
        { value: 'purchase', label: 'Purchase Data', desc: 'Supplier invoices and procurement', icon: '📦' },
        { value: 'wastage', label: 'Wastage Data', desc: 'Expired or discarded inventory', icon: '🗑️' },
        { value: 'inventory', label: 'Inventory Data', desc: 'Current stock levels', icon: '📊' },
        { value: 'staff', label: 'Staff Logs', desc: 'Attendance and performance data', icon: '👥' }
    ];

    const requiredFields = {
        sales: ['date', 'amount', 'sku'],
        purchase: ['date', 'amount', 'item'],
        wastage: ['date', 'item', 'quantity'],
        inventory: ['item', 'quantity'],
        staff: ['date', 'staff_name', 'status']
    };

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

    const handleUpload = async () => {
        if (!file || !dataType) {
            toast.error('Please select a file and data type');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('dataType', dataType);

        try {
            const response = await uploadAPI.uploadFile(formData);
            const uploadData = response.data.upload || response.data;
            
            setUploadResult({
                _id: uploadData._id,
                headers: response.data.headers || uploadData.headers || [],
                previewRows: response.data.previewRows || uploadData.previewData?.slice(0, 5) || [],
                summary: uploadData.summary || {}
            });

            // Store data quality and insights
            setDataQuality(response.data.dataQuality || null);
            setInstantInsights(response.data.instantInsights || null);

            // Store custom KPIs
            setCustomKpis(response.data.customKpis || []);

            // Initialize mapping with auto-detection
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

            // Auto-suggest custom KPI mappings
            const initialCustomMapping = {};
            (response.data.customKpis || []).forEach(kpi => {
                const kpiWords = kpi.name.toLowerCase().split(/\s+/);
                const match = headers.find(h => 
                    kpiWords.some(word => h.toLowerCase().includes(word))
                );
                if (match) initialCustomMapping[kpi._id] = match;
            });
            setCustomKpiMapping(initialCustomMapping);

            setStep(2);
            toast.success('File analyzed successfully!');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.response?.data?.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMapping = async () => {
        if (!uploadResult?._id) {
            toast.error('No upload found. Please upload a file first.');
            return;
        }

        const missingFields = requiredFields[dataType]?.filter(field => !mapping[field]);
        if (missingFields?.length > 0) {
            toast.error(`Please map all required fields: ${missingFields.join(', ')}`);
            return;
        }

        setLoading(true);
        try {
            await uploadAPI.saveMapping(uploadResult._id, mapping, customKpiMapping);
            setStep(3);
            toast.success('Mapping saved! Processing data...');
        } catch (error) {
            console.error('Mapping error:', error);
            toast.error(error.response?.data?.message || 'Failed to save mapping');
        } finally {
            setLoading(false);
        }
    };

    const getMappedCustomKpisCount = () => {
        return Object.values(customKpiMapping).filter(v => v).length;
    };

    const getQualityColor = (score) => {
        if (score >= 80) return 'quality-good';
        if (score >= 60) return 'quality-warning';
        return 'quality-error';
    };

    const getStatusIcon = (status) => {
        if (status === 'good') return <CheckCircle2 size={16} className="status-good" />;
        if (status === 'warning') return <AlertTriangle size={16} className="status-warning" />;
        return <XCircle size={16} className="status-error" />;
    };

    const formatCurrency = (amount) => {
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
        return `₹${amount.toFixed(0)}`;
    };

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Data Upload</h1>
                    <p className="page-subtitle">Upload your business data to compute KPIs</p>
                </div>

                {/* Progress Steps */}
                <div className="upload-progress">
                    {['Upload File', 'Map Columns', 'Complete'].map((label, idx) => (
                        <div key={idx} className={`progress-step ${idx + 1 <= step ? 'active' : ''}`}>
                            <span className="step-number">{idx + 1 < step ? <Check size={14} /> : idx + 1}</span>
                            <span className="step-label">{label}</span>
                        </div>
                    ))}
                </div>

                {/* Step 1: Upload */}
                {step === 1 && (
                    <div className="upload-step animate-fade-in">
                        <div className="data-type-grid">
                            {dataTypes.map(dt => (
                                <button
                                    key={dt.value}
                                    className={`data-type-card ${dataType === dt.value ? 'selected' : ''}`}
                                    onClick={() => setDataType(dt.value)}
                                >
                                    <span className="dt-icon">{dt.icon}</span>
                                    <span className="dt-label">{dt.label}</span>
                                    <span className="dt-desc">{dt.desc}</span>
                                </button>
                            ))}
                        </div>

                        <div
                            className={`drop-zone ${file ? 'has-file' : ''}`}
                            onDrop={handleFileDrop}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            {file ? (
                                <div className="file-info">
                                    <File size={32} />
                                    <span className="file-name">{file.name}</span>
                                    <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setFile(null)}>Remove</button>
                                </div>
                            ) : (
                                <>
                                    <UploadIcon size={48} className="drop-icon" />
                                    <p>Drag and drop your file here, or</p>
                                    <label className="btn btn-secondary">
                                        Browse Files
                                        <input
                                            type="file"
                                            accept=".csv,.xlsx,.xls"
                                            onChange={handleFileDrop}
                                            hidden
                                        />
                                    </label>
                                    <span className="file-types">Supports CSV, XLSX, XLS</span>
                                </>
                            )}
                        </div>

                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleUpload}
                            disabled={!file || !dataType || loading}
                        >
                            {loading ? 'Analyzing...' : 'Upload & Analyze'}
                            <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {/* Step 2: Column Mapping with Quality Score & Insights */}
                {step === 2 && uploadResult && (
                    <div className="upload-step animate-fade-in">
                        
                        {/* Data Quality + Instant Insights Panel */}
                        <div className="insights-panel">
                            {/* Data Quality Score */}
                            {dataQuality && (
                                <div className="quality-card">
                                    <div className="quality-header">
                                        <h4><Zap size={18} /> Data Quality Score</h4>
                                        <div className={`quality-score ${getQualityColor(dataQuality.score)}`}>
                                            {dataQuality.score}/{dataQuality.maxScore}
                                        </div>
                                    </div>
                                    <div className="quality-breakdown">
                                        {Object.entries(dataQuality.breakdown || {}).map(([key, val]) => (
                                            <div key={key} className="quality-item">
                                                {getStatusIcon(val.status)}
                                                <span className="quality-label">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                <span className="quality-detail">{val.details}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {dataQuality.issues?.length > 0 && (
                                        <div className="quality-issues">
                                            {dataQuality.issues.map((issue, i) => (
                                                <span key={i} className="issue-tag">
                                                    <AlertTriangle size={12} /> {issue}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Instant Insights - Always show */}
                            <div className="insights-card">
                                <h4><BarChart2 size={18} /> Quick Insights</h4>
                                <div className="insights-grid">
                                    {/* Always show total rows */}
                                    <div className="insight-item">
                                        <File size={16} />
                                        <div>
                                            <span className="insight-value">{uploadResult?.summary?.totalRows?.toLocaleString() || instantInsights?.totalRows?.toLocaleString() || '0'}</span>
                                            <span className="insight-label">Total Rows</span>
                                        </div>
                                    </div>
                                    {instantInsights?.dateRange && (
                                        <div className="insight-item">
                                            <Calendar size={16} />
                                            <div>
                                                <span className="insight-value">{instantInsights.dateRange.days} days</span>
                                                <span className="insight-label">
                                                    {instantInsights.dateRange.start} → {instantInsights.dateRange.end}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {instantInsights?.totalValue > 0 && (
                                        <div className="insight-item">
                                            <TrendingUp size={16} />
                                            <div>
                                                <span className="insight-value">{formatCurrency(instantInsights.totalValue)}</span>
                                                <span className="insight-label">Total Value</span>
                                            </div>
                                        </div>
                                    )}
                                    {instantInsights?.transactionCount > 0 && (
                                        <div className="insight-item">
                                            <BarChart2 size={16} />
                                            <div>
                                                <span className="insight-value">{instantInsights.transactionCount.toLocaleString()}</span>
                                                <span className="insight-label">Transactions</span>
                                            </div>
                                        </div>
                                    )}
                                    {instantInsights?.avgValue > 0 && (
                                        <div className="insight-item">
                                            <Zap size={16} />
                                            <div>
                                                <span className="insight-value">{formatCurrency(instantInsights.avgValue)}</span>
                                                <span className="insight-label">Avg. Transaction</span>
                                            </div>
                                        </div>
                                    )}
                                    {instantInsights?.peakDay && (
                                        <div className="insight-item highlight">
                                            <span className="peak-badge">🔥 Peak</span>
                                            <span className="insight-value">{instantInsights.peakDay}s</span>
                                        </div>
                                    )}
                                    {instantInsights?.uniqueCategories > 0 && (
                                        <div className="insight-item">
                                            <span className="insight-value">{instantInsights.uniqueCategories}</span>
                                            <span className="insight-label">Unique Items</span>
                                        </div>
                                    )}
                                    {/* Show headers count */}
                                    <div className="insight-item">
                                        <Info size={16} />
                                        <div>
                                            <span className="insight-value">{uploadResult?.headers?.length || 0}</span>
                                            <span className="insight-label">Columns Detected</span>
                                        </div>
                                    </div>
                                    </div>
                                </div>
                        </div>

                        {/* Column Mapping */}
                        <div className="card">
                            <h3>Map Your Columns</h3>
                            <p className="text-muted mb-lg">Match your file columns to the required fields</p>

                            {/* Required Fields */}
                            <div className="mapping-section">
                                <h4 className="mapping-section-title">
                                    Required Fields
                                    <span className="badge badge-required">Required</span>
                                </h4>
                                <div className="mapping-grid">
                                    {requiredFields[dataType]?.map(field => (
                                        <div key={field} className="mapping-row">
                                            <label className="mapping-label">
                                                {field.replace(/_/g, ' ')}
                                                <span className="required">*</span>
                                            </label>
                                            <select
                                                className={`form-select ${mapping[field] ? 'mapped' : ''}`}
                                                value={mapping[field] || ''}
                                                onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                                            >
                                                <option value="">Select column</option>
                                                {uploadResult.headers?.map(header => (
                                                    <option key={header} value={header}>{header}</option>
                                                ))}
                                            </select>
                                            {mapping[field] && <Check size={16} className="mapped-check" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Custom KPIs */}
                            {customKpis.length > 0 && (
                                <div className="mapping-section custom-kpi-mapping-section">
                                    <div 
                                        className="mapping-section-header"
                                        onClick={() => setShowCustomKpis(!showCustomKpis)}
                                    >
                                        <h4 className="mapping-section-title">
                                            Your Custom KPIs
                                            <span className="badge badge-optional">Optional</span>
                                            {getMappedCustomKpisCount() > 0 && (
                                                <span className="badge badge-success">{getMappedCustomKpisCount()} mapped</span>
                                            )}
                                        </h4>
                                        <button className="toggle-btn">
                                            {showCustomKpis ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                    </div>
                                    
                                    {showCustomKpis && (
                                        <div className="custom-kpi-mapping-grid">
                                            {customKpis.map(kpi => (
                                                <div key={kpi._id} className="custom-kpi-mapping-row">
                                                    <div className="kpi-info">
                                                        <span className="kpi-name">{kpi.name}</span>
                                                        <div className="kpi-desc-tooltip">
                                                            <Info size={14} />
                                                            <span className="tooltip-text">{kpi.description}</span>
                                                        </div>
                                                    </div>
                                                    <select
                                                        className={`form-select ${customKpiMapping[kpi._id] ? 'mapped' : ''}`}
                                                        value={customKpiMapping[kpi._id] || ''}
                                                        onChange={(e) => setCustomKpiMapping({ 
                                                            ...customKpiMapping, 
                                                            [kpi._id]: e.target.value 
                                                        })}
                                                    >
                                                        <option value="">-- Not mapped --</option>
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

                            {/* Preview */}
                            <div className="preview-section">
                                <h4>Preview (First 5 rows)</h4>
                                <div className="table-wrapper">
                                    <table className="preview-table">
                                        <thead>
                                            <tr>
                                                {uploadResult.headers?.slice(0, 6).map(h => <th key={h}>{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {uploadResult.previewRows?.slice(0, 5).map((row, idx) => (
                                                <tr key={idx}>
                                                    {uploadResult.headers?.slice(0, 6).map(h => (
                                                        <td key={h}>{row[h]}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handleSaveMapping}
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : 'Save & Process'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Complete */}
                {step === 3 && (
                    <div className="upload-step animate-fade-in complete-step">
                        <div className="success-icon">✅</div>
                        <h2>Upload Complete!</h2>
                        <p>Your data is being processed. KPIs will be updated shortly.</p>
                        
                        <div className="summary-card">
                            <div className="summary-stats">
                                <div className="stat">
                                    <span className="stat-value">{uploadResult?.summary?.totalRows || instantInsights?.totalRows || 0}</span>
                                    <span className="stat-label">Rows Processed</span>
                                </div>
                                {dataQuality && (
                                    <div className="stat">
                                        <span className={`stat-value ${getQualityColor(dataQuality.score)}`}>
                                            {dataQuality.score}%
                                        </span>
                                        <span className="stat-label">Quality Score</span>
                                    </div>
                                )}
                                {instantInsights?.totalValue && (
                                    <div className="stat">
                                        <span className="stat-value">{formatCurrency(instantInsights.totalValue)}</span>
                                        <span className="stat-label">Total Value</span>
                                    </div>
                                )}
                                {getMappedCustomKpisCount() > 0 && (
                                    <div className="stat">
                                        <span className="stat-value">{getMappedCustomKpisCount()}</span>
                                        <span className="stat-label">Custom KPIs</span>
                                    </div>
                                )}
                            </div>

                            {instantInsights?.dateRange && (
                                <div className="date-range-summary">
                                    <Calendar size={16} />
                                    <span>Data period: {instantInsights.dateRange.start} to {instantInsights.dateRange.end} ({instantInsights.dateRange.days} days)</span>
                                </div>
                            )}

                            {getMappedCustomKpisCount() > 0 && (
                                <div className="custom-kpis-summary">
                                    <h4>Custom KPIs Tracked</h4>
                                    <div className="kpi-tags">
                                        {customKpis
                                            .filter(kpi => customKpiMapping[kpi._id])
                                            .map(kpi => (
                                                <span key={kpi._id} className="kpi-tag">{kpi.name}</span>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>

                        <button className="btn btn-primary" onClick={() => { 
                            setStep(1); 
                            setFile(null); 
                            setDataType(''); 
                            setCustomKpiMapping({}); 
                            setDataQuality(null);
                            setInstantInsights(null);
                        }}>
                            Upload Another File
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Upload;

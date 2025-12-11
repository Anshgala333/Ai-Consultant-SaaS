import { useState, useCallback } from 'react';
import { uploadAPI } from '../api';
import { Upload as UploadIcon, File, Check, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import './Upload.css';

const Upload = () => {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [dataType, setDataType] = useState('');
    const [uploadResult, setUploadResult] = useState(null);
    const [mapping, setMapping] = useState({});
    const [loading, setLoading] = useState(false);

    const dataTypes = [
        { value: 'sales', label: 'Sales Data', desc: 'Transaction records with amounts and items' },
        { value: 'purchase', label: 'Purchase Data', desc: 'Supplier invoices and procurement' },
        { value: 'wastage', label: 'Wastage Data', desc: 'Expired or discarded inventory' },
        { value: 'inventory', label: 'Inventory Data', desc: 'Current stock levels' },
        { value: 'staff', label: 'Staff Logs', desc: 'Attendance and performance data' }
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
            // Store the upload object with its ID
            const uploadData = response.data.upload || response.data;
            setUploadResult({
                _id: uploadData._id,
                headers: response.data.headers || uploadData.headers || [],
                previewRows: response.data.previewRows || uploadData.previewData?.slice(0, 5) || [],
                summary: uploadData.summary || {}
            });

            // Initialize mapping
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

        // Check if all required fields are mapped
        const missingFields = requiredFields[dataType]?.filter(field => !mapping[field]);
        if (missingFields?.length > 0) {
            toast.error(`Please map all required fields: ${missingFields.join(', ')}`);
            return;
        }

        setLoading(true);
        try {
            await uploadAPI.saveMapping(uploadResult._id, mapping);
            setStep(3);
            toast.success('Mapping saved! Processing data...');
        } catch (error) {
            console.error('Mapping error:', error);
            toast.error(error.response?.data?.message || 'Failed to save mapping');
        } finally {
            setLoading(false);
        }
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
                                    <button className="btn btn-ghost" onClick={() => setFile(null)}>Remove</button>
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
                            {loading ? 'Uploading...' : 'Upload & Continue'}
                            <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {/* Step 2: Column Mapping */}
                {step === 2 && uploadResult && (
                    <div className="upload-step animate-fade-in">
                        <div className="card">
                            <h3>Map Your Columns</h3>
                            <p className="text-muted mb-lg">Match your file columns to the required fields</p>

                            <div className="mapping-grid">
                                {requiredFields[dataType]?.map(field => (
                                    <div key={field} className="mapping-row">
                                        <label className="mapping-label">
                                            {field.replace(/_/g, ' ')}
                                            <span className="required">*</span>
                                        </label>
                                        <select
                                            className="form-select"
                                            value={mapping[field] || ''}
                                            onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                                        >
                                            <option value="">Select column</option>
                                            {uploadResult.headers?.map(header => (
                                                <option key={header} value={header}>{header}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

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
                        <div className="summary-stats">
                            <div className="stat">
                                <span className="stat-value">{uploadResult?.summary?.totalRows || 0}</span>
                                <span className="stat-label">Rows</span>
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={() => { setStep(1); setFile(null); setDataType(''); }}>
                            Upload Another File
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Upload;

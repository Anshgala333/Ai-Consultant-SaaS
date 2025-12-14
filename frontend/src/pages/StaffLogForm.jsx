import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffLogsAPI, businessAPI } from '../api';
import { 
    Package, Clock, MessageSquare, Trash2, Wrench, Users, AlertTriangle, FileText,
    ChevronLeft, CheckCircle, Loader, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

const LOG_TYPES = [
    { value: 'stock_out', label: 'Stock Out', icon: Package, color: '#f59e0b', description: 'Item not available' },
    { value: 'delay', label: 'Delay', icon: Clock, color: '#3b82f6', description: 'Service or delivery delay' },
    { value: 'customer_complaint', label: 'Complaint', icon: MessageSquare, color: '#ef4444', description: 'Customer issue reported' },
    { value: 'wastage_incident', label: 'Wastage', icon: Trash2, color: '#10b981', description: 'Food/material waste' },
    { value: 'equipment_breakdown', label: 'Equipment', icon: Wrench, color: '#8b5cf6', description: 'Equipment malfunction' },
    { value: 'staff_shortage', label: 'Staff Issue', icon: Users, color: '#ec4899', description: 'Staffing problem' },
    { value: 'quality_issue', label: 'Quality', icon: AlertTriangle, color: '#f97316', description: 'Quality concern' },
    { value: 'other', label: 'Other', icon: FileText, color: '#6b7280', description: 'Other issues' }
];

const SEVERITY_LEVELS = [
    { value: 'low', label: 'Low', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
    { value: 'medium', label: 'Medium', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
    { value: 'high', label: 'High', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
    { value: 'critical', label: 'Critical', color: '#9333ea', bgColor: 'rgba(147, 51, 234, 0.15)' }
];

const StaffLogForm = ({ onClose, onSuccess }) => {
    const { user } = useAuth();
    const [step, setStep] = useState(1); // 1: Select Type, 2: Fill Details
    const [outlets, setOutlets] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    
    const [formData, setFormData] = useState({
        logType: '',
        title: '',
        description: '',
        severity: 'medium',
        outletId: '',
        estimatedImpact: '',
        incidentTime: new Date().toISOString().slice(0, 16),
        immediateAction: ''
    });

    useEffect(() => {
        fetchOutlets();
    }, []);

    const fetchOutlets = async () => {
        try {
            const response = await businessAPI.getEmployeeOutlets();
            setOutlets(response.data || []);
        } catch (error) {
            console.error('Error fetching outlets:', error);
        }
    };

    const handleTypeSelect = (type) => {
        setFormData({ ...formData, logType: type });
        setStep(2);
    };

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim()) {
            toast.error('Please enter a title');
            return;
        }
        if (!formData.description.trim()) {
            toast.error('Please enter a description');
            return;
        }

        setSubmitting(true);
        try {
            await staffLogsAPI.createAsEmployee({
                logType: formData.logType,
                title: formData.title.trim(),
                description: formData.description.trim(),
                severity: formData.severity,
                outletId: formData.outletId || undefined,
                estimatedImpact: formData.estimatedImpact ? parseFloat(formData.estimatedImpact) : 0,
                incidentTime: formData.incidentTime ? new Date(formData.incidentTime) : new Date(),
                immediateAction: formData.immediateAction.trim() || undefined
            });

            setSubmitted(true);
            toast.success('Issue logged successfully!');
            
            setTimeout(() => {
                onSuccess?.();
                onClose?.();
            }, 1500);
        } catch (error) {
            console.error('Error submitting log:', error);
            toast.error(error.response?.data?.message || 'Failed to submit log');
        } finally {
            setSubmitting(false);
        }
    };

    const selectedType = LOG_TYPES.find(t => t.value === formData.logType);

    // Success State
    if (submitted) {
        return (
            <div className="staff-log-form">
                <div className="success-state">
                    <div className="success-icon">
                        <CheckCircle size={64} />
                    </div>
                    <h2>Issue Logged!</h2>
                    <p>Your report has been submitted successfully.</p>
                </div>
                <style>{formStyles}</style>
            </div>
        );
    }

    // Step 1: Select Log Type
    if (step === 1) {
        return (
            <div className="staff-log-form">
                <div className="form-header">
                    <h2>Log an Issue</h2>
                    <p className="text-muted">What type of issue are you reporting?</p>
                </div>

                <div className="log-type-grid">
                    {LOG_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                            <button
                                key={type.value}
                                className="log-type-card"
                                onClick={() => handleTypeSelect(type.value)}
                                style={{ '--type-color': type.color }}
                            >
                                <div className="type-icon">
                                    <Icon size={28} />
                                </div>
                                <span className="type-label">{type.label}</span>
                                <span className="type-desc">{type.description}</span>
                            </button>
                        );
                    })}
                </div>

                {onClose && (
                    <button className="btn btn-ghost btn-block mt-lg" onClick={onClose}>
                        Cancel
                    </button>
                )}
                <style>{formStyles}</style>
            </div>
        );
    }

    // Step 2: Fill Details
    return (
        <div className="staff-log-form">
            <div className="form-header">
                <button className="back-btn" onClick={() => setStep(1)}>
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h2>Log Details</h2>
                    {selectedType && (
                        <div className="selected-type-badge" style={{ '--type-color': selectedType.color }}>
                            {(() => { const Icon = selectedType.icon; return <Icon size={16} />; })()}
                            <span>{selectedType.label}</span>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="log-form">
                {/* Title */}
                <div className="form-group">
                    <label className="form-label">
                        Title <span className="required">*</span>
                    </label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Brief summary of the issue"
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Description */}
                <div className="form-group">
                    <label className="form-label">
                        Description <span className="required">*</span>
                    </label>
                    <textarea
                        className="form-textarea"
                        placeholder="Describe what happened in detail..."
                        rows={4}
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                    />
                </div>

                {/* Severity */}
                <div className="form-group">
                    <label className="form-label">Severity</label>
                    <div className="severity-selector">
                        {SEVERITY_LEVELS.map((level) => (
                            <button
                                key={level.value}
                                type="button"
                                className={`severity-btn ${formData.severity === level.value ? 'active' : ''}`}
                                style={{ 
                                    '--sev-color': level.color,
                                    '--sev-bg': level.bgColor
                                }}
                                onClick={() => handleChange('severity', level.value)}
                            >
                                {level.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Outlet */}
                {outlets.length > 0 && (
                    <div className="form-group">
                        <label className="form-label">
                            <MapPin size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            Outlet (Optional)
                        </label>
                        <select
                            className="form-select"
                            value={formData.outletId}
                            onChange={(e) => handleChange('outletId', e.target.value)}
                        >
                            <option value="">Select outlet...</option>
                            {outlets.map((outlet) => (
                                <option key={outlet._id} value={outlet._id}>
                                    {outlet.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Estimated Impact */}
                <div className="form-group">
                    <label className="form-label">Estimated Impact (₹)</label>
                    <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        min="0"
                        value={formData.estimatedImpact}
                        onChange={(e) => handleChange('estimatedImpact', e.target.value)}
                    />
                </div>

                {/* Incident Time */}
                <div className="form-group">
                    <label className="form-label">When did this happen?</label>
                    <input
                        type="datetime-local"
                        className="form-input"
                        value={formData.incidentTime}
                        onChange={(e) => handleChange('incidentTime', e.target.value)}
                    />
                </div>

                {/* Immediate Action */}
                <div className="form-group">
                    <label className="form-label">Immediate Action Taken</label>
                    <textarea
                        className="form-textarea"
                        placeholder="What steps did you take to address this?"
                        rows={2}
                        value={formData.immediateAction}
                        onChange={(e) => handleChange('immediateAction', e.target.value)}
                    />
                </div>

                {/* Submit */}
                <button 
                    type="submit" 
                    className="btn btn-primary btn-block btn-lg"
                    disabled={submitting}
                >
                    {submitting ? (
                        <>
                            <Loader size={20} className="spin" />
                            Submitting...
                        </>
                    ) : (
                        'Submit Report'
                    )}
                </button>

                {onClose && (
                    <button 
                        type="button" 
                        className="btn btn-ghost btn-block"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                )}
            </form>
            <style>{formStyles}</style>
        </div>
    );
};

const formStyles = `
    .staff-log-form {
        padding: 1.5rem;
        max-width: 600px;
        margin: 0 auto;
    }

    .form-header {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
    }

    .form-header h2 {
        margin: 0;
        font-size: 1.5rem;
    }

    .back-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border: none;
        background: var(--bg-tertiary);
        border-radius: 10px;
        color: var(--text-primary);
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
    }

    .back-btn:hover {
        background: var(--bg-secondary);
    }

    .selected-type-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.25rem 0.75rem;
        background: color-mix(in srgb, var(--type-color) 15%, transparent);
        color: var(--type-color);
        border-radius: 20px;
        font-size: 0.8125rem;
        font-weight: 500;
        margin-top: 0.5rem;
    }

    /* Log Type Grid */
    .log-type-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
    }

    .log-type-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1.25rem 1rem;
        background: var(--bg-card);
        border: 2px solid var(--border-color);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
    }

    .log-type-card:hover {
        border-color: var(--type-color);
        background: color-mix(in srgb, var(--type-color) 5%, var(--bg-card));
        transform: translateY(-2px);
    }

    .log-type-card:active {
        transform: translateY(0);
    }

    .type-icon {
        width: 56px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: color-mix(in srgb, var(--type-color) 15%, transparent);
        color: var(--type-color);
        border-radius: 14px;
    }

    .type-label {
        font-weight: 600;
        font-size: 0.9375rem;
        color: var(--text-primary);
    }

    .type-desc {
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    /* Form */
    .log-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .form-textarea {
        width: 100%;
        padding: 0.875rem 1rem;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        color: var(--text-primary);
        font-size: 1rem;
        resize: vertical;
        min-height: 100px;
        font-family: inherit;
        transition: border-color 0.2s;
    }

    .form-textarea:focus {
        outline: none;
        border-color: var(--accent-primary);
    }

    .form-textarea::placeholder {
        color: var(--text-muted);
    }

    /* Severity Selector */
    .severity-selector {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .severity-btn {
        flex: 1;
        min-width: 70px;
        padding: 0.625rem 0.75rem;
        border: 2px solid var(--border-color);
        background: var(--bg-tertiary);
        border-radius: 10px;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s;
    }

    .severity-btn:hover {
        border-color: var(--sev-color);
        color: var(--sev-color);
    }

    .severity-btn.active {
        background: var(--sev-bg);
        border-color: var(--sev-color);
        color: var(--sev-color);
    }

    /* Buttons */
    .btn-block {
        width: 100%;
    }

    .btn-lg {
        padding: 1rem 1.5rem;
        font-size: 1rem;
    }

    .mt-lg {
        margin-top: 1.5rem;
    }

    .required {
        color: var(--danger);
    }

    /* Success State */
    .success-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 3rem 1.5rem;
        animation: fadeIn 0.3s ease;
    }

    .success-icon {
        width: 100px;
        height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(34, 197, 94, 0.15);
        color: #22c55e;
        border-radius: 50%;
        margin-bottom: 1.5rem;
        animation: scaleIn 0.4s ease;
    }

    .success-state h2 {
        margin: 0 0 0.5rem;
        color: #22c55e;
    }

    .success-state p {
        color: var(--text-muted);
        margin: 0;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes scaleIn {
        from { transform: scale(0.5); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }

    .spin {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    /* Mobile Responsive */
    @media (max-width: 480px) {
        .staff-log-form {
            padding: 1rem;
        }

        .log-type-grid {
            gap: 0.75rem;
        }

        .log-type-card {
            padding: 1rem 0.75rem;
        }

        .type-icon {
            width: 48px;
            height: 48px;
        }

        .type-icon svg {
            width: 24px;
            height: 24px;
        }

        .severity-btn {
            padding: 0.5rem;
            font-size: 0.8125rem;
        }
    }
`;

export default StaffLogForm;

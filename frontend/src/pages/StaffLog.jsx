import { useState, useEffect } from 'react';
import { staffLogsAPI, formFieldsAPI } from '../api';
import { ClipboardList, Send, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const StaffLog = () => {
    const [config, setConfig] = useState(null);
    const [customFields, setCustomFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        businessId: '',
        staffName: '',
        staffRole: 'staff',
        logType: '',
        title: '',
        description: '',
        severity: 'medium',
        estimatedImpact: '',
        customFields: {}
    });

    useEffect(() => {
        fetchConfig();
        fetchCustomFields();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await staffLogsAPI.getFormConfig();
            setConfig(response.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomFields = async () => {
        try {
            // Get businessId from URL params if available
            const params = new URLSearchParams(window.location.search);
            const businessId = params.get('businessId');
            if (businessId) {
                const response = await formFieldsAPI.getConfig(businessId);
                setCustomFields(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching custom fields:', error);
        }
    };

    const handleCustomFieldChange = (fieldName, value) => {
        setFormData({
            ...formData,
            customFields: {
                ...formData.customFields,
                [fieldName]: value
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.logType || !formData.title || !formData.description) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            await staffLogsAPI.create(formData);
            setSubmitted(true);
            toast.success('Log submitted!');
        } catch (error) {
            toast.error('Failed to submit log');
        }
    };

    if (loading) {
        return <div className="staff-log-page"><div className="spinner"></div></div>;
    }

    if (submitted) {
        return (
            <div className="staff-log-page">
                <div className="staff-log-card success-card">
                    <div className="success-icon"><Check size={48} /></div>
                    <h2>Log Submitted!</h2>
                    <p>Your report has been recorded</p>
                    <button className="btn btn-primary" onClick={() => { setSubmitted(false); setFormData({ ...formData, logType: '', title: '', description: '' }); }}>
                        Submit Another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="staff-log-page">
            <div className="staff-log-card">
                <div className="log-header">
                    <ClipboardList size={32} style={{ color: 'var(--accent-primary)' }} />
                    <h1>Staff Log</h1>
                    <p>Report operational issues</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Your Name *</label>
                        <input type="text" className="form-input" value={formData.staffName} onChange={(e) => setFormData({ ...formData, staffName: e.target.value })} placeholder="Enter your name" required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Your Role</label>
                        <select className="form-select" value={formData.staffRole} onChange={(e) => setFormData({ ...formData, staffRole: e.target.value })}>
                            {config?.staffRoles?.map(role => (
                                <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Issue Type *</label>
                        <div className="log-type-grid">
                            {config?.logTypes?.map(type => (
                                <button key={type.value} type="button" className={`log-type-btn ${formData.logType === type.value ? 'selected' : ''}`} onClick={() => setFormData({ ...formData, logType: type.value })}>
                                    <span>{type.icon}</span>
                                    <span>{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Brief Title *</label>
                        <input type="text" className="form-input" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Chicken out of stock" required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description *</label>
                        <textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the issue in detail..." required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Severity</label>
                        <div className="severity-options">
                            {config?.severityLevels?.map(level => (
                                <button key={level.value} type="button" className={`severity-btn ${formData.severity === level.value ? 'selected' : ''}`} onClick={() => setFormData({ ...formData, severity: level.value })} style={{ '--severity-color': level.color }}>
                                    {level.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dynamic Custom Fields */}
                    {customFields.map((field) => (
                        <div key={field._id} className="form-group">
                            <label className="form-label">
                                {field.label} {field.required && '*'}
                            </label>
                            {field.fieldType === 'text' && (
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder={field.placeholder || ''}
                                    value={formData.customFields[field.fieldName] || ''}
                                    onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                                    required={field.required}
                                />
                            )}
                            {field.fieldType === 'textarea' && (
                                <textarea
                                    className="form-textarea"
                                    placeholder={field.placeholder || ''}
                                    value={formData.customFields[field.fieldName] || ''}
                                    onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                                    required={field.required}
                                />
                            )}
                            {field.fieldType === 'number' && (
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder={field.placeholder || ''}
                                    value={formData.customFields[field.fieldName] || ''}
                                    onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                                    required={field.required}
                                />
                            )}
                            {field.fieldType === 'select' && (
                                <select
                                    className="form-select"
                                    value={formData.customFields[field.fieldName] || ''}
                                    onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                                    required={field.required}
                                >
                                    <option value="">Select...</option>
                                    {field.options?.map((option, idx) => (
                                        <option key={idx} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {field.fieldType === 'date' && (
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.customFields[field.fieldName] || ''}
                                    onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                                    required={field.required}
                                />
                            )}
                        </div>
                    ))}

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                        <Send size={18} /> Submit Log
                    </button>
                </form>
            </div>

            <style>{`
        .staff-log-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%); }
        .staff-log-card { width: 100%; max-width: 500px; background: var(--bg-card); backdrop-filter: blur(20px); border: 1px solid var(--border-color); border-radius: 1.5rem; padding: 2rem; }
        .log-header { text-align: center; margin-bottom: 2rem; }
        .log-header h1 { font-size: 1.5rem; margin: 0.5rem 0 0.25rem; }
        .log-header p { color: var(--text-muted); }
        .log-type-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
        .log-type-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--bg-tertiary); border: 2px solid var(--border-color); border-radius: 8px; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
        .log-type-btn:hover { border-color: var(--accent-primary); }
        .log-type-btn.selected { border-color: var(--accent-primary); background: rgba(99, 102, 241, 0.1); }
        .severity-options { display: flex; gap: 0.5rem; }
        .severity-btn { flex: 1; padding: 0.75rem; background: var(--bg-tertiary); border: 2px solid var(--border-color); border-radius: 8px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .severity-btn:hover { border-color: var(--severity-color); }
        .severity-btn.selected { border-color: var(--severity-color); color: var(--severity-color); }
        .success-card { text-align: center; }
        .success-icon { width: 80px; height: 80px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin: 0 auto 1.5rem; }
      `}</style>
        </div>
    );
};

export default StaffLog;

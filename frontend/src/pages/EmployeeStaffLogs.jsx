import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffLogsAPI } from '../api';
import { Clock, AlertTriangle, CheckCircle, XCircle, Filter, Download, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const EmployeeStaffLogs = ({ onLogIssue }) => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, reviewed, resolved
    const [lastFetch, setLastFetch] = useState(Date.now());

    useEffect(() => {
        fetchLogs();

        // Set up polling for real-time updates every 10 seconds
        const interval = setInterval(() => {
            fetchRecentLogs();
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await staffLogsAPI.getAllForEmployee();
            setLogs(response.data || []);
            setLastFetch(Date.now());
        } catch (error) {
            console.error('Error fetching staff logs:', error);
            toast.error('Failed to fetch staff logs');
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentLogs = async () => {
        try {
            const response = await staffLogsAPI.getRecent(user.businessId, lastFetch);
            if (response.data && response.data.length > 0) {
                // Prepend new logs to existing logs
                setLogs(prev => {
                    const newLogs = response.data.filter(
                        newLog => !prev.some(existingLog => existingLog._id === newLog._id)
                    );
                    return [...newLogs, ...prev];
                });
                setLastFetch(Date.now());
            }
        } catch (error) {
            console.error('Error fetching recent logs:', error);
        }
    };

    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        return log.status === filter;
    });

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'low': return '#22c55e';
            case 'medium': return '#f59e0b';
            case 'high': return '#ef4444';
            case 'critical': return '#9333ea';
            default: return '#6b7280';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock size={16} />;
            case 'reviewed': return <CheckCircle size={16} />;
            case 'escalated': return <AlertTriangle size={16} />;
            case 'resolved': return <CheckCircle size={16} />;
            default: return <Clock size={16} />;
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading staff logs...</p>
            </div>
        );
    }

    return (
        <div className="employee-staff-logs">
            <div className="logs-header">
                <div>
                    <h2>Staff Logs</h2>
                    <p className="text-muted">All submitted staff logs from your business</p>
                </div>
                <div className="logs-actions">
                    {onLogIssue && (
                        <button className="btn btn-primary" onClick={onLogIssue}>
                            <PlusCircle size={18} />
                            Log New Issue
                        </button>
                    )}
                    <select
                        className="form-select"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{ width: 'auto' }}
                    >
                        <option value="all">All Logs</option>
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="escalated">Escalated</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {filteredLogs.length === 0 ? (
                <div className="empty-state card">
                    <p>No staff logs found</p>
                </div>
            ) : (
                <div className="logs-grid">
                    {filteredLogs.map((log) => (
                        <div key={log._id} className="log-card card">
                            <div className="log-header-row">
                                <div className="log-meta">
                                    <span
                                        className="severity-badge"
                                        style={{ backgroundColor: `${getSeverityColor(log.severity)}15`, color: getSeverityColor(log.severity) }}
                                    >
                                        {log.severity}
                                    </span>
                                    <span className="log-type">{log.logType.replace('_', ' ')}</span>
                                </div>
                                <div className="log-status">
                                    {getStatusIcon(log.status)}
                                    <span>{log.status}</span>
                                </div>
                            </div>

                            <h3 className="log-title">{log.title}</h3>
                            <p className="log-description">{log.description}</p>

                            <div className="log-details">
                                <div className="detail-item">
                                    <span className="detail-label">Reporter:</span>
                                    <span>{log.staffName} ({log.staffRole})</span>
                                </div>
                                {log.outlet && (
                                    <div className="detail-item">
                                        <span className="detail-label">Outlet:</span>
                                        <span>{log.outlet.name}</span>
                                    </div>
                                )}
                                <div className="detail-item">
                                    <span className="detail-label">Incident Time:</span>
                                    <span>{formatDate(log.incidentTime)}</span>
                                </div>
                                {log.estimatedImpact > 0 && (
                                    <div className="detail-item">
                                        <span className="detail-label">Est. Impact:</span>
                                        <span>₹{log.estimatedImpact.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {log.attachments && log.attachments.length > 0 && (
                                <div className="log-attachments">
                                    <p className="detail-label">Attachments:</p>
                                    <div className="attachments-list">
                                        {log.attachments.map((attachment, idx) => (
                                            <a key={idx} href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="attachment-link">
                                                <Download size={14} />
                                                {attachment.fileName}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {log.customFields && Object.keys(log.customFields).length > 0 && (
                                <div className="log-custom-fields">
                                    {Object.entries(log.customFields).map(([key, value]) => (
                                        <div key={key} className="detail-item">
                                            <span className="detail-label">{key}:</span>
                                            <span>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .employee-staff-logs {
                    padding: 0;
                }
                .logs-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1.5rem;
                }
                .logs-header h2 {
                    margin: 0 0 0.25rem;
                    font-size: 1.5rem;
                }
                .logs-filters {
                    display: flex;
                    gap: 0.75rem;
                }
                .logs-actions {
                    display: flex;
                    gap: 0.75rem;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .logs-grid {
                    display: grid;
                    gap: 1rem;
                }
                .log-card {
                    padding: 1.25rem;
                }
                .log-header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }
                .log-meta {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }
                .severity-badge {
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .log-type {
                    font-size: 0.875rem;
                    color: var(--text-muted);
                    text-transform: capitalize;
                }
                .log-status {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    font-size: 0.875rem;
                    color: var(--text-muted);
                    text-transform: capitalize;
                }
                .log-title {
                    font-size: 1.125rem;
                    margin: 0 0 0.5rem;
                }
                .log-description {
                    color: var(--text-secondary);
                    margin-bottom: 1rem;
                    line-height: 1.5;
                }
                .log-details {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 0.75rem;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border-color);
                }
                .detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                .detail-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 600;
                }
                .log-attachments {
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border-color);
                }
                .attachments-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                }
                .attachment-link {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    padding: 0.375rem 0.75rem;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    font-size: 0.875rem;
                    color: var(--accent-primary);
                    text-decoration: none;
                    transition: all 0.2s;
                }
                .attachment-link:hover {
                    background: var(--bg-secondary);
                    border-color: var(--accent-primary);
                }
                .log-custom-fields {
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border-color);
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 0.75rem;
                }
                .empty-state {
                    text-align: center;
                    padding: 3rem 2rem;
                }
                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem;
                    gap: 1rem;
                }
            `}</style>
        </div>
    );
};

export default EmployeeStaffLogs;

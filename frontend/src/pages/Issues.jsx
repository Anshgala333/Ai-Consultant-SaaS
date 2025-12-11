import { useState, useEffect } from 'react';
import { issuesAPI } from '../api';
import { AlertTriangle, CheckCircle, Clock, XCircle, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const Issues = () => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', type: '' });

    useEffect(() => {
        fetchIssues();
    }, [filter]);

    const fetchIssues = async () => {
        try {
            const params = {};
            if (filter.status) params.status = filter.status;
            if (filter.type) params.type = filter.type;
            const response = await issuesAPI.getAll(params);
            setIssues(response.data);
        } catch (error) {
            console.error('Error fetching issues:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await issuesAPI.updateStatus(id, status);
            toast.success('Issue updated');
            fetchIssues();
        } catch (error) {
            toast.error('Failed to update issue');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'open': return <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />;
            case 'resolved': return <CheckCircle size={16} style={{ color: 'var(--success)' }} />;
            case 'in_progress': return <Clock size={16} style={{ color: 'var(--info)' }} />;
            default: return <XCircle size={16} style={{ color: 'var(--text-muted)' }} />;
        }
    };

    const getSeverityClass = (severity) => {
        const classes = { critical: 'danger', high: 'warning', medium: 'info', low: 'neutral' };
        return classes[severity] || 'neutral';
    };

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Issues</h1>
                        <p className="page-subtitle">Track and resolve operational issues</p>
                    </div>
                    <div className="flex gap-md">
                        <select className="form-select" style={{ width: 150 }} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                            <option value="">All Status</option>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state"><div className="spinner"></div></div>
                ) : issues.length === 0 ? (
                    <div className="card text-center" style={{ padding: '3rem' }}>
                        <AlertTriangle size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                        <h3>No Issues Found</h3>
                        <p className="text-muted">Issues will appear here when detected from your data</p>
                    </div>
                ) : (
                    <div className="issues-list">
                        {issues.map(issue => (
                            <div key={issue._id} className="card issue-card">
                                <div className="issue-header">
                                    <div className="issue-title-row">
                                        {getStatusIcon(issue.status)}
                                        <h3>{issue.title}</h3>
                                        <span className={`badge badge-${getSeverityClass(issue.severity)}`}>{issue.severity}</span>
                                    </div>
                                    <span className="issue-type">{issue.type?.replace(/_/g, ' ')}</span>
                                </div>
                                {issue.description && <p className="issue-desc">{issue.description}</p>}
                                <div className="issue-footer">
                                    <span className="issue-date">{new Date(issue.detectedAt || issue.createdAt).toLocaleDateString()}</span>
                                    {issue.status === 'open' && (
                                        <div className="issue-actions">
                                            <button className="btn btn-sm btn-secondary" onClick={() => updateStatus(issue._id, 'in_progress')}>Start Working</button>
                                            <button className="btn btn-sm btn-success" onClick={() => updateStatus(issue._id, 'resolved')}>Resolve</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <style>{`
        .issues-list { display: flex; flex-direction: column; gap: 1rem; }
        .issue-card { transition: all 0.2s; }
        .issue-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
        .issue-title-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .issue-title-row h3 { margin: 0; font-size: 1rem; }
        .issue-type { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; }
        .issue-desc { color: var(--text-secondary); font-size: 0.875rem; margin: 0.5rem 0; }
        .issue-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); }
        .issue-date { font-size: 0.75rem; color: var(--text-muted); }
        .issue-actions { display: flex; gap: 0.5rem; }
      `}</style>
        </div>
    );
};

export default Issues;

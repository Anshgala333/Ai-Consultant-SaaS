import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { experimentsAPI } from '../api';
import { FlaskConical, Play, Check, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const Experiments = () => {
    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [expRes, summaryRes] = await Promise.all([
                experimentsAPI.getAll(),
                experimentsAPI.getSummary()
            ]);
            setExperiments(expRes.data);
            setSummary(summaryRes.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const startExperiment = async (id) => {
        try {
            await experimentsAPI.start(id);
            toast.success('Experiment started!');
            fetchData();
        } catch (error) {
            toast.error('Failed to start');
        }
    };

    const completeExperiment = async (id) => {
        try {
            await experimentsAPI.complete(id, 'Completed via dashboard');
            toast.success('Experiment completed!');
            fetchData();
        } catch (error) {
            toast.error('Failed to complete');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            planned: 'neutral', active: 'info', completed: 'success', failed: 'danger', cancelled: 'neutral'
        };
        return <span className={`badge badge-${styles[status] || 'neutral'}`}>{status}</span>;
    };

    const formatCurrency = (value) => {
        if (!value) return '₹0';
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        return `₹${value.toLocaleString()}`;
    };

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Experiments</h1>
                        <p className="page-subtitle">Track and measure improvement initiatives</p>
                    </div>
                </div>

                {/* Summary */}
                {summary && (
                    <div className="grid grid-4 mb-lg">
                        <div className="kpi-card"><div className="kpi-label">Total</div><div className="kpi-value">{summary.totalExperiments}</div></div>
                        <div className="kpi-card"><div className="kpi-label">Active</div><div className="kpi-value">{summary.active}</div></div>
                        <div className="kpi-card"><div className="kpi-label">Success Rate</div><div className="kpi-value text-success">{summary.successRate}%</div></div>
                        <div className="kpi-card"><div className="kpi-label">Monthly Savings</div><div className="kpi-value">{formatCurrency(summary.totalMonthlySavings)}</div></div>
                    </div>
                )}

                {loading ? (
                    <div className="loading-state"><div className="spinner"></div></div>
                ) : experiments.length === 0 ? (
                    <div className="card text-center" style={{ padding: '3rem' }}>
                        <FlaskConical size={48} style={{ color: 'var(--accent-primary)', margin: '0 auto 1rem' }} />
                        <h3>No Experiments Yet</h3>
                        <p className="text-muted">Convert recommendations into experiments to start tracking</p>
                    </div>
                ) : (
                    <div className="exp-list">
                        {experiments.map(exp => (
                            <div key={exp._id} className="card exp-card">
                                <div className="exp-header">
                                    <h3>{exp.title}</h3>
                                    {getStatusBadge(exp.status)}
                                </div>
                                <div className="exp-meta">
                                    <span>Target: {exp.targetKPI?.replace(/_/g, ' ')}</span>
                                    <span>Expected: +{exp.expectedImprovement?.percentage}%</span>
                                    <span>Duration: {exp.durationWeeks} weeks</span>
                                </div>
                                {exp.status === 'completed' && exp.actualImprovement && (
                                    <div className="exp-result">
                                        <div className={`result-badge ${exp.actualImprovement.success ? 'success' : 'fail'}`}>
                                            {exp.actualImprovement.success ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                            <span>{exp.actualImprovement.percentage?.toFixed(1)}% change</span>
                                        </div>
                                        {exp.estimatedMonthlySavings > 0 && (
                                            <span className="savings">{formatCurrency(exp.estimatedMonthlySavings)}/month saved</span>
                                        )}
                                    </div>
                                )}
                                <div className="exp-actions">
                                    <Link to={`/experiments/${exp._id}`} className="btn btn-ghost btn-sm">
                                        <Eye size={14} /> View Details
                                    </Link>
                                    {exp.status === 'planned' && (
                                        <button className="btn btn-primary btn-sm" onClick={() => startExperiment(exp._id)}>
                                            <Play size={14} /> Start
                                        </button>
                                    )}
                                    {exp.status === 'active' && (
                                        <button className="btn btn-success btn-sm" onClick={() => completeExperiment(exp._id)}>
                                            <Check size={14} /> Complete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <style>{`
        .exp-list { display: flex; flex-direction: column; gap: 1rem; }
        .exp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .exp-header h3 { margin: 0; font-size: 1rem; }
        .exp-meta { display: flex; gap: 1.5rem; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1rem; }
        .exp-result { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding: 0.75rem; background: var(--bg-tertiary); border-radius: 8px; }
        .result-badge { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
        .result-badge.success { color: var(--success); }
        .result-badge.fail { color: var(--danger); }
        .savings { color: var(--success); font-size: 0.875rem; }
        .exp-actions { padding-top: 1rem; border-top: 1px solid var(--border-color); }
      `}</style>
        </div>
    );
};

export default Experiments;

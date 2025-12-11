import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { experimentsAPI } from '../api';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Plus, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const ExperimentDetail = () => {
    const { id } = useParams();
    const [experiment, setExperiment] = useState(null);
    const [comparison, setComparison] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateForm, setUpdateForm] = useState({ status: 'on_track', notes: '', kpiValue: '' });

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [expRes, compRes] = await Promise.all([
                experimentsAPI.getById(id),
                experimentsAPI.getComparison(id).catch(() => null)
            ]);
            setExperiment(expRes.data);
            setComparison(compRes?.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUpdate = async () => {
        try {
            await experimentsAPI.addUpdate(id, updateForm);
            toast.success('Weekly update added!');
            setShowUpdateModal(false);
            fetchData();
        } catch (error) {
            toast.error('Failed to add update');
        }
    };

    const handleStart = async () => {
        try {
            await experimentsAPI.start(id);
            toast.success('Experiment started!');
            fetchData();
        } catch (error) {
            toast.error('Failed to start experiment');
        }
    };

    const handleComplete = async () => {
        try {
            await experimentsAPI.complete(id, 'Completed via dashboard');
            toast.success('Experiment completed!');
            fetchData();
        } catch (error) {
            toast.error('Failed to complete experiment');
        }
    };

    const formatCurrency = (value) => {
        if (!value) return '₹0';
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        return `₹${value.toLocaleString()}`;
    };

    if (loading) {
        return <div className="page"><div className="container"><div className="loading-state"><div className="spinner"></div></div></div></div>;
    }

    if (!experiment) {
        return <div className="page"><div className="container"><p>Experiment not found</p></div></div>;
    }

    const weeklyChartData = experiment.weeklyUpdates?.map((u, i) => ({
        week: `Week ${u.week}`,
        value: u.kpiValue || 0,
        status: u.status
    })) || [];

    return (
        <div className="page">
            <div className="container">
                <Link to="/experiments" className="back-link mb-md">
                    <ArrowLeft size={18} /> Back to Experiments
                </Link>

                <div className="page-header">
                    <div>
                        <h1 className="page-title">{experiment.title}</h1>
                        <p className="page-subtitle">{experiment.description}</p>
                    </div>
                    <div className="flex gap-md">
                        {experiment.status === 'planned' && (
                            <button className="btn btn-primary" onClick={handleStart}>Start Experiment</button>
                        )}
                        {experiment.status === 'active' && (
                            <>
                                <button className="btn btn-secondary" onClick={() => setShowUpdateModal(true)}>
                                    <Plus size={16} /> Add Update
                                </button>
                                <button className="btn btn-success" onClick={handleComplete}>
                                    <Check size={16} /> Complete
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Status Banner */}
                <div className={`status-banner ${experiment.status} mb-lg`}>
                    <span className="status-label">Status: {experiment.status.replace(/_/g, ' ')}</span>
                    {experiment.status === 'active' && experiment.startDate && (
                        <span className="status-info">
                            <Calendar size={14} />
                            Started {new Date(experiment.startDate).toLocaleDateString()} |
                            Week {experiment.weeklyUpdates?.length || 0} of {experiment.durationWeeks}
                        </span>
                    )}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-4 mb-lg">
                    <div className="kpi-card">
                        <div className="kpi-label">Target KPI</div>
                        <div className="kpi-value">{experiment.targetKPI?.replace(/_/g, ' ')}</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Expected Improvement</div>
                        <div className="kpi-value text-success">+{experiment.expectedImprovement?.percentage || 0}%</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Duration</div>
                        <div className="kpi-value">{experiment.durationWeeks} weeks</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Weekly Updates</div>
                        <div className="kpi-value">{experiment.weeklyUpdates?.length || 0}</div>
                    </div>
                </div>

                {/* Before/After Comparison */}
                {comparison && experiment.status === 'completed' && (
                    <div className="card mb-lg">
                        <h3 className="card-title mb-md">Before vs After Comparison</h3>
                        <div className="comparison-container">
                            <div className="comparison-box before">
                                <span className="label">Before</span>
                                <span className="value">{comparison.before?.kpiValue?.toFixed(2) || 'N/A'}</span>
                                <span className="date">{comparison.before?.capturedAt ? new Date(comparison.before.capturedAt).toLocaleDateString() : ''}</span>
                            </div>
                            <div className="comparison-arrow">
                                {comparison.improvement?.success ? <TrendingUp size={32} className="text-success" /> : <TrendingDown size={32} className="text-danger" />}
                            </div>
                            <div className="comparison-box after">
                                <span className="label">After</span>
                                <span className="value">{comparison.after?.kpiValue?.toFixed(2) || 'N/A'}</span>
                                <span className="date">{comparison.after?.capturedAt ? new Date(comparison.after.capturedAt).toLocaleDateString() : ''}</span>
                            </div>
                        </div>
                        {comparison.improvement && (
                            <div className="result-banner mt-md">
                                <span className={`result-badge ${comparison.improvement.success ? 'success' : 'fail'}`}>
                                    {comparison.improvement.success ? '✓ Goal Achieved' : '✗ Goal Not Achieved'}
                                </span>
                                <span className="change">
                                    {comparison.improvement.percentage >= 0 ? '+' : ''}{comparison.improvement.percentage?.toFixed(1)}% change
                                </span>
                                {experiment.estimatedMonthlySavings > 0 && (
                                    <span className="savings">{formatCurrency(experiment.estimatedMonthlySavings)}/month saved</span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Weekly Progress Chart */}
                {weeklyChartData.length > 0 && (
                    <div className="card mb-lg">
                        <h3 className="card-title mb-md">Weekly Progress</h3>
                        <div style={{ height: 250 }}>
                            <ResponsiveContainer>
                                <LineChart data={weeklyChartData}>
                                    <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} />
                                    <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                                    <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Weekly Updates Timeline */}
                <div className="card">
                    <h3 className="card-title mb-md">Update Timeline</h3>
                    {experiment.weeklyUpdates?.length > 0 ? (
                        <div className="timeline">
                            {experiment.weeklyUpdates.map((update, idx) => (
                                <div key={idx} className="timeline-item">
                                    <div className="timeline-marker"></div>
                                    <div className="timeline-content">
                                        <div className="timeline-header">
                                            <span className="week">Week {update.week}</span>
                                            <span className={`status-badge ${update.status}`}>{update.status?.replace(/_/g, ' ')}</span>
                                            <span className="date">{new Date(update.date).toLocaleDateString()}</span>
                                        </div>
                                        {update.notes && <p className="notes">{update.notes}</p>}
                                        {update.kpiValue && <p className="kpi-value">KPI Value: {update.kpiValue}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted">No updates yet. Start the experiment to add weekly updates.</p>
                    )}
                </div>

                {/* Update Modal */}
                {showUpdateModal && (
                    <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <h3>Add Weekly Update</h3>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select className="form-select" value={updateForm.status} onChange={e => setUpdateForm({ ...updateForm, status: e.target.value })}>
                                    <option value="on_track">On Track</option>
                                    <option value="ahead">Ahead of Schedule</option>
                                    <option value="behind">Behind Schedule</option>
                                    <option value="blocked">Blocked</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">KPI Value (optional)</label>
                                <input type="number" className="form-input" value={updateForm.kpiValue} onChange={e => setUpdateForm({ ...updateForm, kpiValue: e.target.value })} placeholder="Current KPI value" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-textarea" value={updateForm.notes} onChange={e => setUpdateForm({ ...updateForm, notes: e.target.value })} placeholder="What happened this week?" rows={3} />
                            </div>
                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setShowUpdateModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleAddUpdate}>Save Update</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .back-link { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--text-muted); text-decoration: none; }
                .back-link:hover { color: var(--text-primary); }
                .status-banner { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-radius: 8px; }
                .status-banner.planned { background: rgba(99, 102, 241, 0.1); border: 1px solid var(--accent-primary); }
                .status-banner.active { background: rgba(34, 197, 94, 0.1); border: 1px solid var(--success); }
                .status-banner.completed { background: rgba(34, 197, 94, 0.2); border: 1px solid var(--success); }
                .status-label { font-weight: 600; text-transform: capitalize; }
                .status-info { display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.875rem; }
                .comparison-container { display: flex; align-items: center; justify-content: center; gap: 2rem; }
                .comparison-box { background: var(--bg-tertiary); padding: 1.5rem 2rem; border-radius: 12px; text-align: center; }
                .comparison-box .label { display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; }
                .comparison-box .value { display: block; font-size: 2rem; font-weight: 700; }
                .comparison-box .date { display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; }
                .comparison-arrow { color: var(--text-muted); }
                .result-banner { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px; }
                .result-badge { padding: 0.25rem 0.75rem; border-radius: 4px; font-weight: 600; }
                .result-badge.success { background: rgba(34, 197, 94, 0.2); color: var(--success); }
                .result-badge.fail { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
                .savings { color: var(--success); font-weight: 600; }
                .timeline { position: relative; padding-left: 2rem; }
                .timeline-item { position: relative; padding-bottom: 1.5rem; }
                .timeline-item:last-child { padding-bottom: 0; }
                .timeline-marker { position: absolute; left: -2rem; top: 0; width: 12px; height: 12px; background: var(--accent-primary); border-radius: 50%; }
                .timeline-item::before { content: ''; position: absolute; left: calc(-2rem + 5px); top: 12px; bottom: 0; width: 2px; background: var(--border-color); }
                .timeline-item:last-child::before { display: none; }
                .timeline-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
                .timeline-header .week { font-weight: 600; }
                .timeline-header .date { color: var(--text-muted); font-size: 0.75rem; }
                .status-badge { font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px; }
                .status-badge.on_track { background: rgba(34, 197, 94, 0.2); color: var(--success); }
                .status-badge.behind { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
                .status-badge.ahead { background: rgba(99, 102, 241, 0.2); color: var(--accent-primary); }
                .notes { color: var(--text-secondary); font-size: 0.875rem; margin: 0; }
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
                .modal { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 2rem; width: 90%; max-width: 400px; }
                .modal h3 { margin-bottom: 1.5rem; }
                .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
            `}</style>
        </div>
    );
};

export default ExperimentDetail;

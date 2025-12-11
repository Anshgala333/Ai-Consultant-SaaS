import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { kpiAPI } from '../api';
import { TrendingUp, TrendingDown, Minus, Calendar, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const KpiHistory = () => {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [baseline, setBaseline] = useState(null);
    const [period, setPeriod] = useState('weekly');
    const [selectedMetric, setSelectedMetric] = useState('revenue');

    useEffect(() => {
        fetchData();
    }, [period]);

    const fetchData = async () => {
        try {
            const [historyRes, baselineRes] = await Promise.all([
                kpiAPI.getHistory({ period, limit: 12 }),
                kpiAPI.getBaseline()
            ]);
            setHistory(historyRes.data?.reverse() || []);
            setBaseline(baselineRes.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        if (!value) return '₹0';
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
        return `₹${value}`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    };

    const metrics = [
        { key: 'revenue', label: 'Revenue', color: '#6366f1', format: formatCurrency },
        { key: 'wastage', label: 'Wastage %', color: '#ef4444', format: (v) => `${v?.toFixed(1) || 0}%` },
        { key: 'margin', label: 'Margin %', color: '#22c55e', format: (v) => `${v?.toFixed(1) || 0}%` },
        { key: 'rating', label: 'Customer Rating', color: '#f59e0b', format: (v) => `${v?.toFixed(1) || 0}/5` }
    ];

    const getMetricValue = (snapshot, metric) => {
        switch (metric) {
            case 'revenue': return snapshot.revenue?.total || 0;
            case 'wastage': return snapshot.wastage?.percentage || 0;
            case 'margin': return snapshot.margin?.gross || 0;
            case 'rating': return snapshot.customerMetrics?.averageRating || 0;
            default: return 0;
        }
    };

    const chartData = history.map(h => ({
        date: formatDate(h.periodStart),
        value: getMetricValue(h, selectedMetric),
        healthScore: h.periodHealthScore || 0
    }));

    const currentMetric = metrics.find(m => m.key === selectedMetric);

    // Calculate averages
    const avgValue = history.length > 0
        ? history.reduce((sum, h) => sum + getMetricValue(h, selectedMetric), 0) / history.length
        : 0;

    const latestValue = history.length > 0 ? getMetricValue(history[history.length - 1], selectedMetric) : 0;
    const previousValue = history.length > 1 ? getMetricValue(history[history.length - 2], selectedMetric) : latestValue;
    const changePercent = previousValue > 0 ? ((latestValue - previousValue) / previousValue) * 100 : 0;

    if (loading) {
        return <div className="page"><div className="container"><div className="loading-state"><div className="spinner"></div></div></div></div>;
    }

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">KPI History</h1>
                        <p className="page-subtitle">Track your business performance over time</p>
                    </div>
                    <div className="flex gap-md">
                        <select className="form-select" style={{ width: 120 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                </div>

                {/* Metric Selector */}
                <div className="metric-tabs mb-lg">
                    {metrics.map(m => (
                        <button
                            key={m.key}
                            className={`metric-tab ${selectedMetric === m.key ? 'active' : ''}`}
                            onClick={() => setSelectedMetric(m.key)}
                            style={{ '--tab-color': m.color }}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-4 mb-lg">
                    <div className="kpi-card">
                        <div className="kpi-label">Current {currentMetric?.label}</div>
                        <div className="kpi-value" style={{ color: currentMetric?.color }}>
                            {currentMetric?.format(latestValue)}
                        </div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Change</div>
                        <div className={`kpi-value ${changePercent >= 0 ? 'text-success' : 'text-danger'}`}>
                            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                        </div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Average ({period})</div>
                        <div className="kpi-value">{currentMetric?.format(avgValue)}</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Data Points</div>
                        <div className="kpi-value">{history.length}</div>
                    </div>
                </div>

                {/* Main Chart */}
                <div className="card mb-lg">
                    <div className="card-header">
                        <h3 className="card-title">{currentMetric?.label} Trend</h3>
                        <span className="text-muted">Last {history.length} {period} periods</span>
                    </div>
                    <div style={{ height: 300 }}>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={currentMetric?.color} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={currentMetric?.color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} />
                                    <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                        formatter={(value) => [currentMetric?.format(value), currentMetric?.label]}
                                    />
                                    <Area type="monotone" dataKey="value" stroke={currentMetric?.color} fill="url(#colorMetric)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-chart">
                                <p>No historical data available. Upload data to see trends.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Health Score Chart */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Health Score History</h3>
                    </div>
                    <div style={{ height: 200 }}>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer>
                                <BarChart data={chartData}>
                                    <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                        formatter={(value) => [`${value}/100`, 'Health Score']}
                                    />
                                    <Bar dataKey="healthScore" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-chart"><p>No health score data</p></div>
                        )}
                    </div>
                </div>

                {/* Baseline Comparison */}
                {baseline && (
                    <div className="card mt-lg">
                        <h3 className="card-title mb-md">Baseline Comparison</h3>
                        <div className="comparison-grid">
                            <div className="comparison-item">
                                <span className="label">Baseline Revenue</span>
                                <span className="value">{formatCurrency(baseline.baseline?.revenue || 0)}</span>
                            </div>
                            <div className="comparison-item">
                                <span className="label">Current Revenue</span>
                                <span className="value">{formatCurrency(latestValue)}</span>
                            </div>
                            <div className="comparison-item">
                                <span className="label">Change</span>
                                <span className={`value ${latestValue > (baseline.baseline?.revenue || 0) ? 'text-success' : 'text-danger'}`}>
                                    {((latestValue - (baseline.baseline?.revenue || 0)) / (baseline.baseline?.revenue || 1) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .metric-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
                .metric-tab { padding: 0.75rem 1.25rem; background: var(--bg-tertiary); border: 2px solid var(--border-color); border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
                .metric-tab:hover { border-color: var(--tab-color); }
                .metric-tab.active { border-color: var(--tab-color); background: rgba(99, 102, 241, 0.1); color: var(--tab-color); }
                .empty-chart { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); }
                .comparison-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
                .comparison-item { background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; text-align: center; }
                .comparison-item .label { display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; }
                .comparison-item .value { font-size: 1.25rem; font-weight: 700; }
            `}</style>
        </div>
    );
};

export default KpiHistory;

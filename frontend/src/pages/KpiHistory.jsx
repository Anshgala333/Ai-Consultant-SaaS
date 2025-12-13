import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { kpiAPI } from '../api';
import {
    TrendingUp, TrendingDown, Minus, Calendar, Download, RefreshCw,
    BarChart3, Activity, Target, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
    BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, ComposedChart, Legend,
    RadialBarChart, RadialBar
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = {
    primary: '#8b5cf6',
    secondary: '#6366f1',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    pink: '#ec4899',
    teal: '#14b8a6'
};

const KpiHistory = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [history, setHistory] = useState([]);
    const [baseline, setBaseline] = useState(null);
    const [period, setPeriod] = useState('weekly');
    const [selectedMetric, setSelectedMetric] = useState('revenue');

    useEffect(() => {
        fetchData();
    }, [period]);

    const fetchData = async (showToast = false) => {
        try {
            if (showToast) setRefreshing(true);
            const [historyRes, baselineRes] = await Promise.all([
                kpiAPI.getHistory({ period, limit: 12 }),
                kpiAPI.getBaseline()
            ]);
            setHistory(historyRes.data?.reverse() || []);
            setBaseline(baselineRes.data);
            if (showToast) toast.success('Data refreshed');
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
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
        { key: 'revenue', label: 'Revenue', color: COLORS.success, icon: '💰', format: formatCurrency },
        { key: 'wastage', label: 'Wastage %', color: COLORS.danger, icon: '🗑️', format: (v) => `${v?.toFixed(1) || 0}%` },
        { key: 'margin', label: 'Margin', color: COLORS.primary, icon: '📊', format: formatCurrency },
        { key: 'rating', label: 'Rating', color: COLORS.warning, icon: '⭐', format: (v) => `${v?.toFixed(1) || 0}/5` },
        { key: 'health', label: 'Health Score', color: COLORS.info, icon: '❤️', format: (v) => `${v || 0}/100` }
    ];

    const getMetricValue = (snapshot, metric) => {
        switch (metric) {
            case 'revenue': return snapshot.revenue?.total || 0;
            case 'wastage': return snapshot.wastage?.percentage || 0;
            case 'margin': return snapshot.margin?.gross || 0;
            case 'rating': return snapshot.customerMetrics?.averageRating || 0;
            case 'health': return snapshot.periodHealthScore || 0;
            default: return 0;
        }
    };

    // Multi-metric chart data
    const multiMetricData = history.map((h, i) => ({
        name: formatDate(h.periodStart),
        Revenue: (h.revenue?.total || 0) / 10000,
        Wastage: h.wastage?.percentage || 0,
        Rating: (h.customerMetrics?.averageRating || 0) * 20,
        Health: h.periodHealthScore || 0
    }));

    // Single metric chart data
    const chartData = history.map(h => ({
        date: formatDate(h.periodStart),
        value: getMetricValue(h, selectedMetric),
        fullDate: new Date(h.periodStart).toLocaleDateString()
    }));

    const currentMetric = metrics.find(m => m.key === selectedMetric);

    // Calculate stats
    const avgValue = history.length > 0
        ? history.reduce((sum, h) => sum + getMetricValue(h, selectedMetric), 0) / history.length
        : 0;

    const latestValue = history.length > 0 ? getMetricValue(history[history.length - 1], selectedMetric) : 0;
    const previousValue = history.length > 1 ? getMetricValue(history[history.length - 2], selectedMetric) : latestValue;
    const changePercent = previousValue > 0 ? ((latestValue - previousValue) / previousValue) * 100 : 0;

    const minValue = Math.min(...history.map(h => getMetricValue(h, selectedMetric)));
    const maxValue = Math.max(...history.map(h => getMetricValue(h, selectedMetric)));

    // Comparison data for radial chart
    const comparisonData = history.length > 0 ? [
        { name: 'Current', value: latestValue, fill: currentMetric?.color },
        { name: 'Average', value: avgValue, fill: 'rgba(139, 92, 246, 0.3)' }
    ] : [];

    if (loading) {
        return (
            <div className="page">
                <div className="container">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading KPI history...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page kpi-history-page">
            <div className="container">
                {/* Header */}
                <div className="page-header-enhanced">
                    <div>
                        <h1 className="page-title">KPI History & Analytics</h1>
                        <p className="page-subtitle">Track your business performance over time</p>
                    </div>
                    <div className="header-controls">
                        <div className="period-selector">
                            <button
                                className={`period-btn ${period === 'weekly' ? 'active' : ''}`}
                                onClick={() => setPeriod('weekly')}
                            >
                                Weekly
                            </button>
                            <button
                                className={`period-btn ${period === 'monthly' ? 'active' : ''}`}
                                onClick={() => setPeriod('monthly')}
                            >
                                Monthly
                            </button>
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Metric Selector Cards */}
                <div className="metric-selector-grid">
                    {metrics.map(m => (
                        <button
                            key={m.key}
                            className={`metric-selector-card ${selectedMetric === m.key ? 'active' : ''}`}
                            onClick={() => setSelectedMetric(m.key)}
                            style={{ '--metric-color': m.color }}
                        >
                            <span className="metric-icon">{m.icon}</span>
                            <div className="metric-info">
                                <span className="metric-name">{m.label}</span>
                                <span className="metric-current">{m.format(latestValue)}</span>
                            </div>
                            {selectedMetric === m.key && (
                                <span className="change-badge" style={{ color: changePercent >= 0 ? COLORS.success : COLORS.danger }}>
                                    {changePercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {Math.abs(changePercent).toFixed(1)}%
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Summary Stats */}
                <div className="stats-bar">
                    <div className="stat-item">
                        <span className="stat-label">Current</span>
                        <span className="stat-value" style={{ color: currentMetric?.color }}>
                            {currentMetric?.format(latestValue)}
                        </span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                        <span className="stat-label">Change</span>
                        <span className={`stat-value ${changePercent >= 0 ? 'positive' : 'negative'}`}>
                            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                        </span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                        <span className="stat-label">Average</span>
                        <span className="stat-value">{currentMetric?.format(avgValue)}</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                        <span className="stat-label">Min</span>
                        <span className="stat-value">{currentMetric?.format(minValue)}</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                        <span className="stat-label">Max</span>
                        <span className="stat-value">{currentMetric?.format(maxValue)}</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                        <span className="stat-label">Data Points</span>
                        <span className="stat-value">{history.length}</span>
                    </div>
                </div>

                {/* Main Charts Grid */}
                <div className="charts-grid-kpi">
                    {/* Primary Trend Chart */}
                    <div className="chart-card primary-chart">
                        <div className="chart-header">
                            <h3 className="chart-title">
                                <BarChart3 size={18} style={{ color: currentMetric?.color }} />
                                {currentMetric?.label} Trend
                            </h3>
                            <span className="chart-subtitle">Last {history.length} {period} periods</span>
                        </div>
                        <div className="chart-body" style={{ height: 320 }}>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer>
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorMetricGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={currentMetric?.color} stopOpacity={0.4} />
                                                <stop offset="95%" stopColor={currentMetric?.color} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} />
                                        <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                                            formatter={(value) => [currentMetric?.format(value), currentMetric?.label]}
                                            labelFormatter={(label) => `Period: ${label}`}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke={currentMetric?.color}
                                            fill="url(#colorMetricGrad)"
                                            strokeWidth={3}
                                            dot={{ fill: currentMetric?.color, strokeWidth: 2, r: 4 }}
                                            activeDot={{ r: 6, stroke: currentMetric?.color, strokeWidth: 2, fill: '#1a1a28' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-chart">
                                    <BarChart3 size={48} />
                                    <p>No historical data available</p>
                                    <Link to="/upload" className="btn btn-primary btn-sm">Upload Data</Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Multi-Metric Comparison */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3 className="chart-title">
                                <Activity size={18} style={{ color: COLORS.primary }} />
                                Multi-Metric Overview
                            </h3>
                        </div>
                        <div className="chart-body" style={{ height: 280 }}>
                            {multiMetricData.length > 0 ? (
                                <ResponsiveContainer>
                                    <LineChart data={multiMetricData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} />
                                        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="Revenue" stroke={COLORS.success} strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="Wastage" stroke={COLORS.danger} strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="Health" stroke={COLORS.info} strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="Rating" stroke={COLORS.warning} strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-chart"><p>No data</p></div>
                            )}
                        </div>
                    </div>

                    {/* Health Score Distribution */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3 className="chart-title">
                                <Target size={18} style={{ color: COLORS.info }} />
                                Health Score Trend
                            </h3>
                        </div>
                        <div className="chart-body" style={{ height: 200 }}>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer>
                                    <BarChart data={history.map((h, i) => ({
                                        name: formatDate(h.periodStart),
                                        health: h.periodHealthScore || 0
                                    }))}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} />
                                        <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                            formatter={(value) => [`${value}/100`, 'Health Score']}
                                        />
                                        <Bar
                                            dataKey="health"
                                            radius={[6, 6, 0, 0]}
                                            fill="url(#healthBarGrad)"
                                        >
                                            {history.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={(entry.periodHealthScore || 0) >= 70 ? COLORS.success :
                                                        (entry.periodHealthScore || 0) >= 50 ? COLORS.warning : COLORS.danger}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-chart"><p>No health data</p></div>
                            )}
                        </div>
                    </div>

                    {/* Metrics Distribution Pie */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3 className="chart-title">Period Performance</h3>
                        </div>
                        <div className="chart-body distribution-chart" style={{ height: 200 }}>
                            <div className="distribution-stats">
                                <div className="dist-stat-item">
                                    <span className="dist-label">Best Period</span>
                                    <span className="dist-value success">{currentMetric?.format(maxValue)}</span>
                                </div>
                                <div className="dist-stat-item">
                                    <span className="dist-label">Worst Period</span>
                                    <span className="dist-value danger">{currentMetric?.format(minValue)}</span>
                                </div>
                                <div className="dist-stat-item">
                                    <span className="dist-label">Range</span>
                                    <span className="dist-value">{currentMetric?.format(maxValue - minValue)}</span>
                                </div>
                            </div>
                            <div className="variance-bar">
                                <div className="variance-track">
                                    <div
                                        className="variance-fill"
                                        style={{
                                            left: `${((latestValue - minValue) / (maxValue - minValue || 1)) * 100}%`,
                                            background: currentMetric?.color
                                        }}
                                    ></div>
                                </div>
                                <span className="variance-label">Current position in range</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Baseline Comparison */}
                {baseline && (
                    <div className="baseline-section">
                        <h3 className="section-title">
                            <Target size={18} />
                            Baseline Comparison
                        </h3>
                        <div className="baseline-cards">
                            <div className="baseline-card">
                                <span className="baseline-label">Baseline Revenue</span>
                                <span className="baseline-value">{formatCurrency(baseline.baseline?.revenue || 0)}</span>
                            </div>
                            <div className="baseline-card">
                                <span className="baseline-label">Current Revenue</span>
                                <span className="baseline-value highlight">{formatCurrency(history[history.length - 1]?.revenue?.total || 0)}</span>
                            </div>
                            <div className="baseline-card">
                                <span className="baseline-label">Improvement</span>
                                <span className={`baseline-value ${((history[history.length - 1]?.revenue?.total || 0) > (baseline.baseline?.revenue || 0)) ? 'success' : 'danger'}`}>
                                    {(((history[history.length - 1]?.revenue?.total || 0) - (baseline.baseline?.revenue || 0)) / (baseline.baseline?.revenue || 1) * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div className="baseline-card">
                                <span className="baseline-label">Baseline Wastage</span>
                                <span className="baseline-value">{(baseline.baseline?.wastage || 0).toFixed(1)}%</span>
                            </div>
                            <div className="baseline-card">
                                <span className="baseline-label">Current Wastage</span>
                                <span className="baseline-value highlight">{(history[history.length - 1]?.wastage?.percentage || 0).toFixed(1)}%</span>
                            </div>
                            <div className="baseline-card">
                                <span className="baseline-label">Wastage Change</span>
                                <span className={`baseline-value ${((history[history.length - 1]?.wastage?.percentage || 0) < (baseline.baseline?.wastage || 0)) ? 'success' : 'danger'}`}>
                                    {(((history[history.length - 1]?.wastage?.percentage || 0) - (baseline.baseline?.wastage || 0))).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .kpi-history-page {
                    animation: fadeIn 0.4s ease;
                }

                .page-header-enhanced {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: var(--spacing-xl);
                    flex-wrap: wrap;
                    gap: var(--spacing-md);
                }

                .header-controls {
                    display: flex;
                    gap: var(--spacing-sm);
                }

                .period-selector {
                    display: flex;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-md);
                    padding: 4px;
                }

                .period-btn {
                    padding: 8px 16px;
                    background: transparent;
                    border: none;
                    border-radius: var(--radius-sm);
                    font-size: var(--font-size-sm);
                    font-weight: 500;
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .period-btn.active {
                    background: var(--accent-primary);
                    color: white;
                }

                .metric-selector-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: var(--spacing-md);
                    margin-bottom: var(--spacing-xl);
                }

                @media (max-width: 1200px) {
                    .metric-selector-grid { grid-template-columns: repeat(3, 1fr); }
                }

                @media (max-width: 768px) {
                    .metric-selector-grid { grid-template-columns: repeat(2, 1fr); }
                }

                .metric-selector-card {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                    padding: var(--spacing-md) var(--spacing-lg);
                    background: var(--bg-card);
                    border: 2px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                }

                .metric-selector-card:hover {
                    border-color: var(--metric-color);
                }

                .metric-selector-card.active {
                    border-color: var(--metric-color);
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), transparent);
                }

                .metric-icon {
                    font-size: 24px;
                }

                .metric-info {
                    display: flex;
                    flex-direction: column;
                }

                .metric-name {
                    font-size: var(--font-size-xs);
                    color: var(--text-muted);
                    text-transform: uppercase;
                }

                .metric-current {
                    font-size: var(--font-size-lg);
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .change-badge {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    position: absolute;
                    top: var(--spacing-sm);
                    right: var(--spacing-sm);
                    font-size: var(--font-size-xs);
                    font-weight: 600;
                }

                .stats-bar {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-lg);
                    padding: var(--spacing-lg);
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    margin-bottom: var(--spacing-xl);
                    overflow-x: auto;
                }

                .stat-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    min-width: 80px;
                }

                .stat-label {
                    font-size: var(--font-size-xs);
                    color: var(--text-muted);
                    text-transform: uppercase;
                }

                .stat-value {
                    font-size: var(--font-size-lg);
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .stat-value.positive { color: var(--success); }
                .stat-value.negative { color: var(--danger); }

                .stat-divider {
                    width: 1px;
                    height: 40px;
                    background: var(--border-color);
                }

                .charts-grid-kpi {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: var(--spacing-lg);
                    margin-bottom: var(--spacing-xl);
                }

                @media (max-width: 1024px) {
                    .charts-grid-kpi { grid-template-columns: 1fr; }
                }

                .chart-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-xl);
                    padding: var(--spacing-lg);
                }

                .chart-card.primary-chart {
                    grid-row: span 2;
                }

                .chart-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--spacing-md);
                }

                .chart-title {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    font-size: var(--font-size-md);
                    font-weight: 600;
                }

                .chart-subtitle {
                    font-size: var(--font-size-sm);
                    color: var(--text-muted);
                }

                .chart-body {
                    width: 100%;
                }

                .empty-chart {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: var(--spacing-md);
                    color: var(--text-muted);
                }

                .empty-chart svg {
                    opacity: 0.3;
                }

                .distribution-chart {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .distribution-stats {
                    display: flex;
                    justify-content: space-around;
                    margin-bottom: var(--spacing-lg);
                }

                .dist-stat-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .dist-label {
                    font-size: var(--font-size-xs);
                    color: var(--text-muted);
                }

                .dist-value {
                    font-size: var(--font-size-lg);
                    font-weight: 700;
                }

                .dist-value.success { color: var(--success); }
                .dist-value.danger { color: var(--danger); }

                .variance-bar {
                    padding: var(--spacing-md);
                }

                .variance-track {
                    height: 8px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-full);
                    position: relative;
                    margin-bottom: var(--spacing-sm);
                }

                .variance-fill {
                    position: absolute;
                    top: -4px;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    transform: translateX(-50%);
                    box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
                }

                .variance-label {
                    font-size: var(--font-size-xs);
                    color: var(--text-muted);
                    text-align: center;
                    display: block;
                }

                .baseline-section {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-xl);
                    padding: var(--spacing-xl);
                }

                .section-title {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    font-size: var(--font-size-lg);
                    font-weight: 600;
                    margin-bottom: var(--spacing-lg);
                }

                .baseline-cards {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: var(--spacing-md);
                }

                @media (max-width: 1200px) {
                    .baseline-cards { grid-template-columns: repeat(3, 1fr); }
                }

                @media (max-width: 768px) {
                    .baseline-cards { grid-template-columns: repeat(2, 1fr); }
                }

                .baseline-card {
                    background: var(--bg-tertiary);
                    padding: var(--spacing-md);
                    border-radius: var(--radius-md);
                    text-align: center;
                }

                .baseline-label {
                    display: block;
                    font-size: var(--font-size-xs);
                    color: var(--text-muted);
                    margin-bottom: var(--spacing-xs);
                }

                .baseline-value {
                    font-size: var(--font-size-lg);
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .baseline-value.highlight {
                    color: var(--accent-primary);
                }

                .baseline-value.success { color: var(--success); }
                .baseline-value.danger { color: var(--danger); }

                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    gap: var(--spacing-md);
                }

                .loading-state p {
                    color: var(--text-muted);
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .animate-spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default KpiHistory;

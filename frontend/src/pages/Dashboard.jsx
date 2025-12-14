import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { aiAPI, checkPythonServiceHealth } from '../pythonApi';
import { kpiAPI, issuesAPI, recommendationsAPI, experimentsAPI, feedbackAPI, staffLogsAPI ,uploadAPI} from '../api';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    Lightbulb,
    FlaskConical,
    MessageSquare,
    ArrowRight,
    RefreshCw,
    Activity,
    DollarSign,
    Trash2,
    Star,
    Sparkles,
    Database,
    Server,
    Zap,
    FileSpreadsheet,
    ClipboardList,
    BarChart3,
    Users,
    Target
} from 'lucide-react';
import {
    XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
    BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, LineChart, Line,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    ComposedChart, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import './Dashboard.css';

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

const Dashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
    const [pythonService, setPythonService] = useState({ available: false });
    const [aiInsights, setAiInsights] = useState(null);
    const [recentUploads, setRecentUploads] = useState([]);
    const [data, setData] = useState({
        kpiSummary: null,
        kpiHistory: [],
        issuesSummary: null,
        issues: [],
        recommendations: [],
        experimentsSummary: null,
        feedbackSummary: null,
        staffLogsSummary: null
    });

    const fetchData = async (showRefreshToast = false) => {
        try {
            if (showRefreshToast) setRefreshing(true);

            const [kpiRes, historyRes, issuesRes, allIssuesRes, recRes, expRes, feedbackRes, staffLogsRes] = await Promise.all([
                kpiAPI.getSummary().catch(() => ({ data: null })),
                kpiAPI.getHistory({ limit: 12 }).catch(() => ({ data: [] })),
                issuesAPI.getSummary().catch(() => ({ data: null })),
                issuesAPI.getAll({ limit: 10 }).catch(() => ({ data: [] })),
                recommendationsAPI.getLatest().catch(() => ({ data: { recommendations: [] } })),
                experimentsAPI.getSummary().catch(() => ({ data: null })),
                feedbackAPI.getSummary().catch(() => ({ data: null })),
                staffLogsAPI.getSummary().catch(() => ({ data: null }))
            ]);

            setData({
                kpiSummary: kpiRes.data,
                kpiHistory: historyRes.data?.reverse() || [],
                issuesSummary: issuesRes.data,
                issues: allIssuesRes.data || [],
                recommendations: recRes.data?.recommendations || [],
                experimentsSummary: expRes.data,
                feedbackSummary: feedbackRes.data,
                staffLogsSummary: staffLogsRes.data
            });

            setRecentUploads((uploadsRes.data || []).slice(0, 3));

            if (showRefreshToast) toast.success('Dashboard refreshed');
        } catch (error) {
            console.error('Dashboard error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        checkPythonServiceHealth().then(setPythonService);
    }, []);

    // Fetch AI insights when Python service is available and we have KPI data
    const generateAIInsights = async () => {
        if (!pythonService.available || !data.kpiSummary) return;

        setAiInsightsLoading(true);
        try {
            const response = await aiAPI.analyzeKPIs({
                current_kpis: data.kpiSummary.currentPeriod || {},
                historical_kpis: data.kpiHistory.slice(0, 4) || []
            });
            setAiInsights(response.data.analysis);
        } catch (error) {
            console.error('AI insights error:', error);
        } finally {
            setAiInsightsLoading(false);
        }
    };

    const getTrendIcon = (trend) => {
        if (trend === 'up') return <TrendingUp size={16} className="trend-up" />;
        if (trend === 'down') return <TrendingDown size={16} className="trend-down" />;
        return <Minus size={16} className="trend-stable" />;
    };

    const formatCurrency = (value) => {
        if (!value) return '₹0';
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
        return `₹${value}`;
    };

    // Prepare chart data
    const revenueChartData = data.kpiHistory.map((h, i) => ({
        name: `W${i + 1}`,
        revenue: h.revenue?.total || 0,
        wastage: h.wastage?.value || 0,
        health: h.periodHealthScore || 0
    }));

    const multiMetricData = data.kpiHistory.slice(-6).map((h, i) => ({
        name: `W${i + 1}`,
        Revenue: ((h.revenue?.total || 0) / 10000).toFixed(0),
        Wastage: h.wastage?.percentage || 0,
        Rating: (h.customerMetrics?.averageRating || 0) * 20,
        Health: h.periodHealthScore || 0
    }));

    // Radar chart data for business health overview
    const radarData = [
        { metric: 'Revenue', value: Math.min(100, (data.kpiSummary?.currentPeriod?.revenue?.total || 0) / 10000), fullMark: 100 },
        { metric: 'Low Wastage', value: Math.max(0, 100 - (data.kpiSummary?.currentPeriod?.wastage?.percentage || 0) * 5), fullMark: 100 },
        { metric: 'Rating', value: (data.kpiSummary?.currentPeriod?.customerRating || data.feedbackSummary?.averageRating || 0) * 20, fullMark: 100 },
        { metric: 'Health', value: data.kpiSummary?.currentPeriod?.healthScore || 65, fullMark: 100 },
        { metric: 'Experiments', value: Math.min(100, (data.experimentsSummary?.successRate || 0)), fullMark: 100 }
    ];

    // Issue severity data for donut chart
    const issueSeverityData = [
        { name: 'Critical', value: data.issuesSummary?.critical || 0, color: COLORS.danger },
        { name: 'High', value: data.issuesSummary?.high || 0, color: COLORS.warning },
        { name: 'Medium', value: data.issuesSummary?.medium || 0, color: COLORS.info },
        { name: 'Low', value: data.issuesSummary?.low || 0, color: COLORS.success }
    ].filter(d => d.value > 0);

    // Recommendation impact data
    const recImpactData = [
        { name: 'High Impact', value: data.recommendations.filter(r => r.impact === 'high').length, color: COLORS.danger },
        { name: 'Medium', value: data.recommendations.filter(r => r.impact === 'medium').length, color: COLORS.warning },
        { name: 'Low', value: data.recommendations.filter(r => r.impact === 'low').length, color: COLORS.success }
    ].filter(d => d.value > 0);

    if (loading) {
        return (
            <div className="page">
                <div className="container">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading your dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page dashboard">
            <div className="container">
                {/* Header */}
                <div className="dashboard-header">
                    <div>
                        <h1 className="page-title">Welcome back, {user?.businessName}</h1>
                        <p className="page-subtitle">Here's your business performance overview</p>
                    </div>
                    <div className="header-actions">
                        {pythonService.available && (
                            <div className="ai-status-badge">
                                <Sparkles size={14} />
                                AI Active
                            </div>
                        )}
                        <button
                            className="btn btn-secondary"
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                        >
                            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Enhanced KPI Cards */}
                <div className="kpi-grid-enhanced">
                    <div className="kpi-card-enhanced revenue">
                        <div className="kpi-card-icon">
                            <DollarSign size={24} />
                        </div>
                        <div className="kpi-card-content">
                            <span className="kpi-label-sm">Revenue</span>
                            <div className="kpi-value-row">
                                <span className="kpi-value-lg">
                                    {formatCurrency(data.kpiSummary?.currentPeriod?.revenue?.total)}
                                </span>
                                {data.kpiSummary?.currentPeriod?.revenue &&
                                    getTrendIcon(data.kpiSummary.currentPeriod.revenue.trend)}
                            </div>
                            {data.kpiSummary?.currentPeriod?.revenue?.growth !== undefined && (
                                <span className={`kpi-change ${data.kpiSummary.currentPeriod.revenue.growth >= 0 ? 'positive' : 'negative'}`}>
                                    {data.kpiSummary.currentPeriod.revenue.growth >= 0 ? '+' : ''}
                                    {data.kpiSummary.currentPeriod.revenue.growth.toFixed(1)}% vs last period
                                </span>
                            )}
                        </div>
                        <div className="kpi-sparkline">
                            <ResponsiveContainer width="100%" height={40}>
                                <AreaChart data={revenueChartData.slice(-6)}>
                                    <defs>
                                        <linearGradient id="sparkRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="url(#sparkRevenue)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="kpi-card-enhanced wastage">
                        <div className="kpi-card-icon warning">
                            <Trash2 size={24} />
                        </div>
                        <div className="kpi-card-content">
                            <span className="kpi-label-sm">Wastage</span>
                            <div className="kpi-value-row">
                                <span className="kpi-value-lg">
                                    {data.kpiSummary?.currentPeriod?.wastage?.percentage?.toFixed(1) || '0'}%
                                </span>
                                {data.kpiSummary?.currentPeriod?.wastage &&
                                    getTrendIcon(data.kpiSummary.currentPeriod.wastage.trend)}
                            </div>
                            <span className="kpi-sub-text">
                                {formatCurrency(data.kpiSummary?.currentPeriod?.wastage?.value)} lost
                            </span>
                        </div>
                        <div className="kpi-progress-ring">
                            <svg viewBox="0 0 36 36">
                                <path
                                    d="M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="rgba(239, 68, 68, 0.2)"
                                    strokeWidth="3"
                                />
                                <path
                                    d="M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#ef4444"
                                    strokeWidth="3"
                                    strokeDasharray={`${data.kpiSummary?.currentPeriod?.wastage?.percentage * 5 || 0}, 100`}
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="kpi-card-enhanced rating">
                        <div className="kpi-card-icon info">
                            <Star size={24} />
                        </div>
                        <div className="kpi-card-content">
                            <span className="kpi-label-sm">Customer Rating</span>
                            <div className="kpi-value-row">
                                <span className="kpi-value-lg">
                                    {data.kpiSummary?.currentPeriod?.customerRating?.toFixed(1) ||
                                        data.feedbackSummary?.averageRating?.toFixed(1) || '0.0'}/5
                                </span>
                            </div>
                            <span className="kpi-sub-text">
                                {data.feedbackSummary?.totalFeedback || 0} responses
                            </span>
                        </div>
                        <div className="star-rating-visual">
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                    key={star}
                                    size={16}
                                    className={star <= Math.round(data.feedbackSummary?.averageRating || 0) ? 'star-filled' : 'star-empty'}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="kpi-card-enhanced health">
                        <div className="kpi-card-icon primary">
                            <Activity size={24} />
                        </div>
                        <div className="kpi-card-content">
                            <span className="kpi-label-sm">Health Score</span>
                            <div className="kpi-value-row">
                                <span className="kpi-value-lg health-gradient">
                                    {data.kpiSummary?.currentPeriod?.healthScore || user?.healthScore || 65}
                                </span>
                            </div>
                        </div>
                        <div className="health-gauge">
                            <svg viewBox="0 0 100 50">
                                <path
                                    d="M 10 50 A 40 40 0 0 1 90 50"
                                    fill="none"
                                    stroke="rgba(139, 92, 246, 0.2)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M 10 50 A 40 40 0 0 1 90 50"
                                    fill="none"
                                    stroke="url(#healthGradient)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${(data.kpiSummary?.currentPeriod?.healthScore || 65) * 1.26}, 126`}
                                />
                                <defs>
                                    <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#ef4444" />
                                        <stop offset="50%" stopColor="#f59e0b" />
                                        <stop offset="100%" stopColor="#22c55e" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Main Charts Section */}
                <div className="charts-grid">
                    {/* Revenue & Wastage Trend */}
                    <div className="card chart-card-lg">
                        <div className="card-header">
                            <h3 className="card-title">
                                <BarChart3 size={18} style={{ color: 'var(--accent-primary)' }} />
                                Performance Trends
                            </h3>
                            <Link to="/kpi-history" className="card-link">View Details <ArrowRight size={14} /></Link>
                        </div>
                        <div className="chart-container-lg">
                            {revenueChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <ComposedChart data={revenueChartData}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} />
                                        <YAxis yAxisId="left" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                                            formatter={(value, name) => [name === 'revenue' ? formatCurrency(value) : value, name.charAt(0).toUpperCase() + name.slice(1)]}
                                        />
                                        <Legend />
                                        <Area yAxisId="left" type="monotone" dataKey="revenue" stroke={COLORS.primary} fill="url(#colorRev)" strokeWidth={2} name="Revenue" />
                                        <Bar yAxisId="right" dataKey="health" fill={COLORS.success} radius={[4, 4, 0, 0]} barSize={20} name="Health Score" opacity={0.7} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-chart">
                                    <BarChart3 size={48} />
                                    <p>Upload data to see trends</p>
                                    <Link to="/upload" className="btn btn-primary btn-sm">Upload Data</Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Business Health Radar */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <Target size={18} style={{ color: 'var(--success)' }} />
                                Business Health Overview
                            </h3>
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={220}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar
                                        name="Performance"
                                        dataKey="value"
                                        stroke={COLORS.primary}
                                        fill={COLORS.primary}
                                        fillOpacity={0.3}
                                        strokeWidth={2}
                                    />
                                    <Tooltip
                                        contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Secondary Grid */}
                <div className="dashboard-grid-secondary">
                    {/* Issues with Donut Chart */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
                                Issues Overview
                            </h3>
                            <Link to="/issues" className="card-link">View all <ArrowRight size={14} /></Link>
                        </div>
                        <div className="issues-visual">
                            <div className="issues-chart">
                                {issueSeverityData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={140}>
                                        <PieChart>
                                            <Pie
                                                data={issueSeverityData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={60}
                                                paddingAngle={4}
                                                dataKey="value"
                                            >
                                                {issueSeverityData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="no-issues-badge">
                                        <span className="checkmark">✓</span>
                                        <span>No issues!</span>
                                    </div>
                                )}
                            </div>
                            <div className="issues-legend">
                                {issueSeverityData.map((item, index) => (
                                    <div key={index} className="legend-item">
                                        <span className="legend-dot" style={{ background: item.color }}></span>
                                        <span className="legend-label">{item.name}</span>
                                        <span className="legend-value">{item.value}</span>
                                    </div>
                                ))}
                                <div className="issues-total">
                                    <span>Total Open</span>
                                    <span className="total-value">{data.issuesSummary?.totalOpen || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Recommendations */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <Lightbulb size={18} style={{ color: 'var(--warning)' }} />
                                AI Recommendations
                            </h3>
                            <Link to="/recommendations" className="card-link">View all <ArrowRight size={14} /></Link>
                        </div>
                        <div className="recommendations-visual">
                            {recImpactData.length > 0 && (
                                <div className="rec-impact-chart">
                                    <ResponsiveContainer width={80} height={80}>
                                        <PieChart>
                                            <Pie
                                                data={recImpactData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={25}
                                                outerRadius={35}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {recImpactData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                            <div className="recommendations-list">
                                {data.recommendations.slice(0, 3).map((rec, index) => (
                                    <div key={rec._id || index} className="recommendation-item-enhanced">
                                        <span className={`impact-badge ${rec.impact}`}>{rec.impact}</span>
                                        <span className="rec-title">{rec.title}</span>
                                    </div>
                                ))}
                                {data.recommendations.length === 0 && (
                                    <p className="empty-text">Generate recommendations from AI Insights</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Experiments */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <FlaskConical size={18} style={{ color: 'var(--accent-primary)' }} />
                                Experiments
                            </h3>
                            <Link to="/experiments" className="card-link">View all <ArrowRight size={14} /></Link>
                        </div>
                        <div className="experiments-visual">
                            <div className="exp-stats-row">
                                <div className="exp-stat-item">
                                    <div className="exp-stat-value">{data.experimentsSummary?.active || 0}</div>
                                    <div className="exp-stat-label">Active</div>
                                </div>
                                <div className="exp-stat-item success">
                                    <div className="exp-stat-value">{data.experimentsSummary?.completed || 0}</div>
                                    <div className="exp-stat-label">Completed</div>
                                </div>
                                <div className="exp-stat-item highlight">
                                    <div className="exp-stat-value">{data.experimentsSummary?.successRate || 0}%</div>
                                    <div className="exp-stat-label">Success</div>
                                </div>
                            </div>
                            {data.experimentsSummary?.totalMonthlySavings > 0 && (
                                <div className="savings-highlight">
                                    <span className="savings-icon">💰</span>
                                    <span className="savings-amount">{formatCurrency(data.experimentsSummary.totalMonthlySavings)}</span>
                                    <span className="savings-period">/month saved</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Customer Feedback */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <MessageSquare size={18} style={{ color: 'var(--success)' }} />
                                Customer Feedback
                            </h3>
                            <Link to="/outlets" className="card-link">Manage QR <ArrowRight size={14} /></Link>
                        </div>
                        <div className="feedback-visual">
                            <div className="feedback-main-stat">
                                <span className="feedback-rating">{data.feedbackSummary?.averageRating?.toFixed(1) || '0.0'}</span>
                                <span className="feedback-label">Avg Rating</span>
                            </div>
                            <div className="feedback-breakdown">
                                <ResponsiveContainer width={100} height={100}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Positive', value: data.feedbackSummary?.sentimentBreakdown?.positive || 1, color: COLORS.success },
                                                { name: 'Neutral', value: data.feedbackSummary?.sentimentBreakdown?.neutral || 1, color: COLORS.warning },
                                                { name: 'Negative', value: data.feedbackSummary?.sentimentBreakdown?.negative || 0, color: COLORS.danger }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={30}
                                            outerRadius={45}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            <Cell fill={COLORS.success} />
                                            <Cell fill={COLORS.warning} />
                                            <Cell fill={COLORS.danger} />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="sentiment-mini-legend">
                                <div className="mini-legend-item positive">
                                    <span className="dot"></span> {data.feedbackSummary?.sentimentBreakdown?.positive || 0}
                                </div>
                                <div className="mini-legend-item neutral">
                                    <span className="dot"></span> {data.feedbackSummary?.sentimentBreakdown?.neutral || 0}
                                </div>
                                <div className="mini-legend-item negative">
                                    <span className="dot"></span> {data.feedbackSummary?.sentimentBreakdown?.negative || 0}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Staff Logs */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <ClipboardList size={18} style={{ color: 'var(--info)' }} />
                                Staff Logs
                            </h3>
                            <Link to="/staff" className="card-link">View all <ArrowRight size={14} /></Link>
                        </div>
                        <div className="staff-logs-visual">
                            <div className="staff-main-stats">
                                <div className="staff-stat">
                                    <span className="stat-number">{data.staffLogsSummary?.totalLogs || 0}</span>
                                    <span className="stat-label">Total</span>
                                </div>
                                <div className="staff-stat warning">
                                    <span className="stat-number">{data.staffLogsSummary?.pendingReview || 0}</span>
                                    <span className="stat-label">Pending</span>
                                </div>
                            </div>
                            {data.staffLogsSummary?.byType && Object.keys(data.staffLogsSummary.byType).length > 0 && (
                                <div className="log-types-mini">
                                    {Object.entries(data.staffLogsSummary.byType).slice(0, 3).map(([type, count]) => (
                                        <div key={type} className="log-type-tag">
                                            <span>{type.replace(/_/g, ' ')}</span>
                                            <span className="count">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions-enhanced">
                    <Link to="/upload" className="action-card-enhanced">
                        <div className="action-icon-wrapper">
                            <span className="action-icon">📤</span>
                        </div>
                        <span className="action-label">Upload Data</span>
                        <span className="action-desc">Import sales, wastage data</span>
                    </Link>
                    <Link to="/recommendations" className="action-card-enhanced">
                        <div className="action-icon-wrapper">
                            <span className="action-icon">✨</span>
                        </div>
                        <span className="action-label">Get AI Insights</span>
                        <span className="action-desc">Generate recommendations</span>
                    </Link>
                    <Link to="/reports" className="action-card-enhanced">
                        <div className="action-icon-wrapper">
                            <span className="action-icon">📊</span>
                        </div>
                        <span className="action-label">Generate Report</span>
                        <span className="action-desc">Download PDF report</span>
                    </Link>
                    <Link to="/kpi-history" className="action-card-enhanced">
                        <div className="action-icon-wrapper">
                            <span className="action-icon">📈</span>
                        </div>
                        <span className="action-label">View Analytics</span>
                        <span className="action-desc">Deep dive into KPIs</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

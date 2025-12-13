import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { kpiAPI, issuesAPI, recommendationsAPI, experimentsAPI, feedbackAPI, uploadAPI } from '../api';
import { aiAPI, checkPythonServiceHealth } from '../pythonApi';
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
    FileSpreadsheet
} from 'lucide-react';
import {
    XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
    BarChart, Bar, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import toast from 'react-hot-toast';
import './Dashboard.css';

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
        recommendations: [],
        experimentsSummary: null,
        feedbackSummary: null
    });

    const fetchData = async (showRefreshToast = false) => {
        try {
            if (showRefreshToast) setRefreshing(true);

            const [kpiRes, historyRes, issuesRes, recRes, expRes, feedbackRes, uploadsRes] = await Promise.all([
                kpiAPI.getSummary().catch(() => ({ data: null })),
                kpiAPI.getHistory({ limit: 8 }).catch(() => ({ data: [] })),
                issuesAPI.getSummary().catch(() => ({ data: null })),
                recommendationsAPI.getLatest().catch(() => ({ data: { recommendations: [] } })),
                experimentsAPI.getSummary().catch(() => ({ data: null })),
                feedbackAPI.getSummary().catch(() => ({ data: null })),
                uploadAPI.getUploads().catch(() => ({ data: [] }))
            ]);

            setData({
                kpiSummary: kpiRes.data,
                kpiHistory: historyRes.data?.reverse() || [],
                issuesSummary: issuesRes.data,
                recommendations: recRes.data?.recommendations || [],
                experimentsSummary: expRes.data,
                feedbackSummary: feedbackRes.data
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

    const getDataTypeColor = (type) => {
        const colors = {
            sales: '#10b981',
            purchase: '#6366f1',
            wastage: '#ef4444',
            inventory: '#f59e0b',
            staff: '#8b5cf6'
        };
        return colors[type] || '#6366f1';
    };

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

                {/* KPI Cards */}
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-label">Revenue</span>
                            {data.kpiSummary?.currentPeriod?.revenue &&
                                getTrendIcon(data.kpiSummary.currentPeriod.revenue.trend)}
                        </div>
                        <div className="kpi-value">
                            {formatCurrency(data.kpiSummary?.currentPeriod?.revenue?.total)}
                        </div>
                        {data.kpiSummary?.currentPeriod?.revenue?.growth !== undefined && (
                            <div className={`kpi-trend ${data.kpiSummary.currentPeriod.revenue.growth >= 0 ? 'up' : 'down'}`}>
                                {data.kpiSummary.currentPeriod.revenue.growth >= 0 ? '+' : ''}
                                {data.kpiSummary.currentPeriod.revenue.growth.toFixed(1)}% vs last period
                            </div>
                        )}
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-label">Wastage</span>
                            {data.kpiSummary?.currentPeriod?.wastage &&
                                getTrendIcon(data.kpiSummary.currentPeriod.wastage.trend)}
                        </div>
                        <div className="kpi-value">
                            {data.kpiSummary?.currentPeriod?.wastage?.percentage?.toFixed(1) || '0'}%
                        </div>
                        <div className="kpi-sub">
                            {formatCurrency(data.kpiSummary?.currentPeriod?.wastage?.value)} lost
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-label">Customer Rating</span>
                        </div>
                        <div className="kpi-value">
                            {data.kpiSummary?.currentPeriod?.customerRating?.toFixed(1) ||
                                data.feedbackSummary?.averageRating || '0'}/5
                        </div>
                        <div className="kpi-sub">
                            {data.feedbackSummary?.totalFeedback || 0} responses
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-label">Health Score</span>
                        </div>
                        <div className="kpi-value health-score-value">
                            {data.kpiSummary?.currentPeriod?.healthScore || user?.healthScore || 65}
                        </div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${data.kpiSummary?.currentPeriod?.healthScore || 65}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Charts and Widgets */}
                <div className="dashboard-grid">
                    {/* Revenue Trend */}
                    <div className="card chart-card">
                        <div className="card-header">
                            <h3 className="card-title">Revenue Trend</h3>
                            <span className="card-subtitle">Last 8 weeks</span>
                        </div>
                        <div className="chart-container">
                            {data.kpiHistory.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={data.kpiHistory}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="periodStart" tick={false} axisLine={false} />
                                        <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                            labelFormatter={() => ''}
                                            formatter={(value) => [formatCurrency(value), 'Revenue']}
                                        />
                                        <Area type="monotone" dataKey="revenue.total" stroke="#6366f1" fill="url(#colorRevenue)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-chart">
                                    <p>Upload data to see trends</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Insights Card - NEW */}
                    <div className="card ai-insights-dashboard-card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <Sparkles size={18} style={{ color: '#a855f7' }} />
                                AI Insights
                            </h3>
                            {pythonService.available && !aiInsights && (
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={generateAIInsights}
                                    disabled={aiInsightsLoading}
                                >
                                    {aiInsightsLoading ? (
                                        <RefreshCw size={14} className="animate-spin" />
                                    ) : (
                                        <Zap size={14} />
                                    )}
                                    Generate
                                </button>
                            )}
                        </div>

                        {!pythonService.available ? (
                            <div className="ai-unavailable-small">
                                <Server size={24} />
                                <span>Start Python service to enable AI</span>
                            </div>
                        ) : aiInsightsLoading ? (
                            <div className="ai-loading-small">
                                <div className="spinner small"></div>
                                <span>Analyzing your data...</span>
                            </div>
                        ) : aiInsights ? (
                            <div className="ai-insights-content">
                                {aiInsights.overall_assessment && (
                                    <p className="ai-summary-text">{aiInsights.overall_assessment}</p>
                                )}
                                {aiInsights.recommendations?.slice(0, 2).map((rec, idx) => (
                                    <div key={idx} className="ai-quick-rec">
                                        <span className={`priority-dot ${rec.priority}`}></span>
                                        <span>{rec.action}</span>
                                    </div>
                                ))}
                                <Link to="/recommendations" className="view-more-link">
                                    View all recommendations <ArrowRight size={14} />
                                </Link>
                            </div>
                        ) : (
                            <div className="ai-placeholder-small">
                                <Sparkles size={32} />
                                <span>Click Generate for AI-powered insights</span>
                            </div>
                        )}
                    </div>

                    {/* Recent Uploads - NEW */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <Database size={18} style={{ color: 'var(--accent-primary)' }} />
                                Recent Uploads
                            </h3>
                            <Link to="/data-hub" className="card-link">View all <ArrowRight size={14} /></Link>
                        </div>
                        <div className="recent-uploads-list">
                            {recentUploads.length > 0 ? recentUploads.map(upload => (
                                <div key={upload._id} className="recent-upload-item">
                                    <div
                                        className="upload-indicator"
                                        style={{ backgroundColor: getDataTypeColor(upload.dataType) }}
                                    />
                                    <FileSpreadsheet size={16} />
                                    <div className="upload-details">
                                        <span className="upload-name">{upload.fileName || 'Untitled'}</span>
                                        <span className="upload-meta">
                                            {upload.dataType} • {upload.summary?.totalRows || 0} rows
                                        </span>
                                    </div>
                                    <span className="upload-time">
                                        {new Date(upload.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            )) : (
                                <div className="empty-uploads">
                                    <p>No uploads yet</p>
                                    <Link to="/upload" className="btn btn-primary btn-sm">Upload Data</Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Open Issues */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
                                Open Issues
                            </h3>
                            <Link to="/issues" className="card-link">View all <ArrowRight size={14} /></Link>
                        </div>
                        <div className="issues-summary">
                            <div className="issue-stat">
                                <span className="stat-number">{data.issuesSummary?.totalOpen || 0}</span>
                                <span className="stat-label">Open</span>
                            </div>
                            <div className="issue-stat critical">
                                <span className="stat-number">{data.issuesSummary?.critical || 0}</span>
                                <span className="stat-label">Critical</span>
                            </div>
                            <div className="issue-stat high">
                                <span className="stat-number">{data.issuesSummary?.high || 0}</span>
                                <span className="stat-label">High</span>
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
                        <div className="recommendations-list">
                            {data.recommendations.slice(0, 3).map((rec, index) => (
                                <div key={rec._id || index} className="recommendation-item">
                                    <span className={`impact-badge ${rec.impact}`}>{rec.impact}</span>
                                    <span className="rec-title">{rec.title}</span>
                                </div>
                            ))}
                            {data.recommendations.length === 0 && (
                                <p className="empty-text">Generate recommendations from the AI Insights page</p>
                            )}
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
                        <div className="experiments-summary">
                            <div className="exp-stat">
                                <span className="stat-number">{data.experimentsSummary?.active || 0}</span>
                                <span className="stat-label">Active</span>
                            </div>
                            <div className="exp-stat">
                                <span className="stat-number">{data.experimentsSummary?.completed || 0}</span>
                                <span className="stat-label">Completed</span>
                            </div>
                            <div className="exp-stat success">
                                <span className="stat-number">{data.experimentsSummary?.successRate || 0}%</span>
                                <span className="stat-label">Success Rate</span>
                            </div>
                        </div>
                        {data.experimentsSummary?.totalMonthlySavings > 0 && (
                            <div className="savings-badge">
                                🎉 {formatCurrency(data.experimentsSummary.totalMonthlySavings)}/month saved
                            </div>
                        )}
                    </div>

                    {/* Customer Feedback with Pie Chart */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <MessageSquare size={18} style={{ color: 'var(--success)' }} />
                                Customer Feedback
                            </h3>
                            <Link to="/outlets" className="card-link">Manage QR <ArrowRight size={14} /></Link>
                        </div>
                        <div className="feedback-summary">
                            <div className="feedback-chart-container">
                                <div className="feedback-rating-big">
                                    <span className="rating-value-lg">{data.feedbackSummary?.averageRating?.toFixed(1) || '0.0'}</span>
                                    <span className="rating-label">Avg Rating</span>
                                </div>
                                <ResponsiveContainer width={120} height={120}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Positive', value: data.feedbackSummary?.sentimentBreakdown?.positive || 1 },
                                                { name: 'Neutral', value: data.feedbackSummary?.sentimentBreakdown?.neutral || 1 },
                                                { name: 'Negative', value: data.feedbackSummary?.sentimentBreakdown?.negative || 0 }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={35}
                                            outerRadius={50}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            <Cell fill="#22c55e" />
                                            <Cell fill="#f59e0b" />
                                            <Cell fill="#ef4444" />
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                            formatter={(value, name) => [`${value} reviews`, name]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="feedback-stats">
                                <div className="sentiment-item positive">
                                    <span className="dot"></span>
                                    <span>Positive</span>
                                    <span className="count">{data.feedbackSummary?.sentimentBreakdown?.positive || 0}</span>
                                </div>
                                <div className="sentiment-item neutral">
                                    <span className="dot"></span>
                                    <span>Neutral</span>
                                    <span className="count">{data.feedbackSummary?.sentimentBreakdown?.neutral || 0}</span>
                                </div>
                                <div className="sentiment-item negative">
                                    <span className="dot"></span>
                                    <span>Negative</span>
                                    <span className="count">{data.feedbackSummary?.sentimentBreakdown?.negative || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions">
                    <Link to="/upload" className="action-card">
                        <span className="action-icon">📤</span>
                        <span className="action-label">Upload Data</span>
                    </Link>
                    <Link to="/data-hub" className="action-card">
                        <span className="action-icon">📊</span>
                        <span className="action-label">Data Hub</span>
                    </Link>
                    <Link to="/recommendations" className="action-card">
                        <span className="action-icon">✨</span>
                        <span className="action-label">AI Insights</span>
                    </Link>
                    <Link to="/reports" className="action-card">
                        <span className="action-icon">📑</span>
                        <span className="action-label">Reports</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

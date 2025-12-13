import { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import {
    Users,
    Building2,
    TrendingUp,
    AlertTriangle,
    FlaskConical,
    Download,
    RefreshCw,
    Calendar,
    DollarSign,
    Award,
    Activity,
    BarChart3,
    CheckCircle2,
    XCircle,
    Target,
    Zap,
    TrendingDown,
    Eye
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, CartesianGrid, LineChart, Line, AreaChart, Area,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    ComposedChart, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

const COLORS = {
    primary: '#8b5cf6',
    secondary: '#6366f1',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    pink: '#ec4899',
    teal: '#14b8a6',
    cyan: '#06b6d4'
};

const CHART_COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

const AdminDashboard = () => {
    const [data, setData] = useState({
        dashboard: null,
        businesses: [],
        exportData: null
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (showToast = false) => {
        try {
            if (showToast) setRefreshing(true);

            const [dashRes, bizRes] = await Promise.all([
                adminAPI.getDashboard(),
                adminAPI.getBusinesses()
            ]);

            // Calculate sector breakdown
            const sectorCounts = {};
            const sectorHealthScores = {};
            const sectorRevenue = {};

            bizRes.data.forEach(biz => {
                const sector = biz.sector || 'other';
                sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
                if (!sectorHealthScores[sector]) {
                    sectorHealthScores[sector] = { total: 0, count: 0 };
                    sectorRevenue[sector] = 0;
                }
                sectorHealthScores[sector].total += biz.latestKPI?.healthScore || biz.healthScore || 0;
                sectorHealthScores[sector].count += 1;
                sectorRevenue[sector] += biz.latestKPI?.revenue || 0;
            });

            const sectorData = Object.entries(sectorCounts).map(([sector, count]) => ({
                name: sector.charAt(0).toUpperCase() + sector.slice(1).replace('_', ' '),
                value: count,
                avgHealth: sectorHealthScores[sector]
                    ? Math.round(sectorHealthScores[sector].total / sectorHealthScores[sector].count)
                    : 0,
                revenue: sectorRevenue[sector]
            }));

            // Calculate health distribution
            const healthDistribution = [
                { name: 'Excellent (80+)', value: bizRes.data.filter(b => (b.latestKPI?.healthScore || b.healthScore || 0) >= 80).length, color: COLORS.success },
                { name: 'Good (60-79)', value: bizRes.data.filter(b => { const h = b.latestKPI?.healthScore || b.healthScore || 0; return h >= 60 && h < 80; }).length, color: COLORS.info },
                { name: 'Fair (40-59)', value: bizRes.data.filter(b => { const h = b.latestKPI?.healthScore || b.healthScore || 0; return h >= 40 && h < 60; }).length, color: COLORS.warning },
                { name: 'Poor (<40)', value: bizRes.data.filter(b => (b.latestKPI?.healthScore || b.healthScore || 0) < 40).length, color: COLORS.danger }
            ].filter(d => d.value > 0);

            // Experiment status distribution
            const experimentData = [
                { name: 'Active', value: dashRes.data?.overview?.activeExperiments || 0, color: COLORS.info },
                { name: 'Completed', value: dashRes.data?.overview?.completedExperiments || 0, color: COLORS.success }
            ].filter(d => d.value > 0);

            setData({
                dashboard: { ...dashRes.data, sectorData, healthDistribution, experimentData },
                businesses: bizRes.data
            });

            if (showToast) toast.success('Dashboard refreshed');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleExportCSV = async () => {
        try {
            setExporting(true);
            const response = await adminAPI.exportKPI();

            const headers = ['Business Name', 'Sector', 'Revenue', 'Wastage %', 'Customer Rating', 'Experiments Completed', 'Monthly Savings'];
            const rows = response.data.data.map(biz => [
                biz.businessName,
                biz.sector,
                biz.revenue,
                biz.wastagePercent,
                biz.customerRating,
                biz.experimentsCompleted,
                biz.totalMonthlySavings
            ]);

            const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
            const dataBlob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pilot_kpi_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('CSV exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export CSV');
        } finally {
            setExporting(false);
        }
    };

    const formatCurrency = (value) => {
        if (!value) return '₹0';
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
        return `₹${value}`;
    };

    const formatDate = (date) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getHealthColor = (score) => {
        if (score >= 80) return COLORS.success;
        if (score >= 60) return COLORS.info;
        if (score >= 40) return COLORS.warning;
        return COLORS.danger;
    };

    if (loading) {
        return (
            <div className="page">
                <div className="container">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading admin dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    const { dashboard, businesses } = data;

    // Top performers data
    const topPerformers = [...businesses]
        .sort((a, b) => (b.latestKPI?.healthScore || b.healthScore || 0) - (a.latestKPI?.healthScore || a.healthScore || 0))
        .slice(0, 5)
        .map(b => ({
            name: b.businessName?.substring(0, 15) || 'Unknown',
            health: b.latestKPI?.healthScore || b.healthScore || 0,
            revenue: (b.latestKPI?.revenue || 0) / 1000
        }));

    return (
        <div className="page admin-dashboard">
            <div className="container">
                {/* Header */}
                <div className="admin-header">
                    <div>
                        <h1 className="page-title">Admin Pilot Dashboard</h1>
                        <p className="page-subtitle">Monitor and manage all pilot SME businesses</p>
                    </div>
                    <div className="header-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                        >
                            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleExportCSV}
                            disabled={exporting}
                        >
                            <Download size={18} />
                            {exporting ? 'Exporting...' : 'Export Data'}
                        </button>
                    </div>
                </div>

                {/* Enhanced Stats Grid */}
                <div className="admin-stats-grid-enhanced">
                    <div className="admin-stat-card-enhanced">
                        <div className="stat-icon-wrapper gradient-purple">
                            <Users size={28} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value-xl">{dashboard?.overview?.totalPilotBusinesses || 0}</span>
                            <span className="stat-label">Pilot SMEs</span>
                        </div>
                        <div className="stat-trend positive">
                            <TrendingUp size={14} /> Active
                        </div>
                    </div>

                    <div className="admin-stat-card-enhanced">
                        <div className="stat-icon-wrapper gradient-blue">
                            <FlaskConical size={28} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value-xl">{dashboard?.overview?.activeExperiments || 0}</span>
                            <span className="stat-label">Active Experiments</span>
                        </div>
                        <div className="stat-mini-chart">
                            <ResponsiveContainer width="100%" height={30}>
                                <AreaChart data={[{ v: 20 }, { v: 35 }, { v: 25 }, { v: 40 }, { v: dashboard?.overview?.activeExperiments || 0 }]}>
                                    <Area type="monotone" dataKey="v" stroke={COLORS.info} fill={COLORS.info} fillOpacity={0.3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="admin-stat-card-enhanced">
                        <div className="stat-icon-wrapper gradient-orange">
                            <AlertTriangle size={28} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value-xl">{dashboard?.overview?.openIssues || 0}</span>
                            <span className="stat-label">Open Issues</span>
                        </div>
                        {dashboard?.overview?.openIssues > 0 && (
                            <div className="stat-trend warning">
                                <Zap size={14} /> Needs attention
                            </div>
                        )}
                    </div>

                    <div className="admin-stat-card-enhanced">
                        <div className="stat-icon-wrapper gradient-green">
                            <DollarSign size={28} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value-xl">{formatCurrency(dashboard?.overview?.totalMonthlySavings)}</span>
                            <span className="stat-label">Monthly Savings</span>
                        </div>
                        <div className="stat-trend positive">
                            <TrendingUp size={14} /> Growing
                        </div>
                    </div>

                    <div className="admin-stat-card-enhanced highlight">
                        <div className="stat-icon-wrapper gradient-pink">
                            <Award size={28} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value-xl gradient-text">{dashboard?.successRate || 0}%</span>
                            <span className="stat-label">Success Rate</span>
                        </div>
                        <div className="success-ring">
                            <svg viewBox="0 0 36 36">
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="rgba(236,72,153,0.2)"
                                    strokeWidth="3"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#ec4899"
                                    strokeWidth="3"
                                    strokeDasharray={`${dashboard?.successRate || 0}, 100`}
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Enhanced Tabs */}
                <div className="admin-tabs-enhanced">
                    <button
                        className={`tab-btn-enhanced ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <BarChart3 size={18} /> Analytics Overview
                    </button>
                    <button
                        className={`tab-btn-enhanced ${activeTab === 'businesses' ? 'active' : ''}`}
                        onClick={() => setActiveTab('businesses')}
                    >
                        <Building2 size={18} /> All SMEs ({businesses.length})
                    </button>
                    <button
                        className={`tab-btn-enhanced ${activeTab === 'improvements' ? 'active' : ''}`}
                        onClick={() => setActiveTab('improvements')}
                    >
                        <TrendingUp size={18} /> Improvements
                    </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'overview' && (
                        <div className="analytics-grid-enhanced">
                            {/* Sector Distribution - Bar Chart */}
                            <div className="chart-card-admin">
                                <div className="chart-header-admin">
                                    <h3><BarChart3 size={18} style={{ color: COLORS.primary }} /> SMEs by Sector</h3>
                                </div>
                                <div className="chart-body-admin" style={{ height: 280 }}>
                                    {dashboard?.sectorData?.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart data={dashboard.sectorData} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                <XAxis type="number" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} />
                                                <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} width={100} />
                                                <Tooltip
                                                    contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                                                    formatter={(value, name) => [value, name === 'value' ? 'SMEs' : name]}
                                                />
                                                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                                    {dashboard.sectorData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="empty-chart"><p>No sector data</p></div>
                                    )}
                                </div>
                            </div>

                            {/* Health Distribution - Donut */}
                            <div className="chart-card-admin">
                                <div className="chart-header-admin">
                                    <h3><Activity size={18} style={{ color: COLORS.success }} /> Health Distribution</h3>
                                </div>
                                <div className="chart-body-admin chart-with-legend" style={{ height: 280 }}>
                                    {dashboard?.healthDistribution?.length > 0 ? (
                                        <>
                                            <ResponsiveContainer width="60%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={dashboard.healthDistribution}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={50}
                                                        outerRadius={80}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                    >
                                                        {dashboard.healthDistribution.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="chart-legend-vertical">
                                                {dashboard.healthDistribution.map((item, i) => (
                                                    <div key={i} className="legend-item-admin">
                                                        <span className="legend-dot" style={{ background: item.color }}></span>
                                                        <span className="legend-label">{item.name}</span>
                                                        <span className="legend-value">{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="empty-chart"><p>No health data</p></div>
                                    )}
                                </div>
                            </div>

                            {/* Top Performers */}
                            <div className="chart-card-admin">
                                <div className="chart-header-admin">
                                    <h3><Award size={18} style={{ color: COLORS.warning }} /> Top Performers</h3>
                                </div>
                                <div className="chart-body-admin" style={{ height: 280 }}>
                                    {topPerformers.length > 0 ? (
                                        <ResponsiveContainer>
                                            <ComposedChart data={topPerformers} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} />
                                                <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} width={100} />
                                                <Tooltip contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                                                <Bar dataKey="health" barSize={12} radius={[0, 4, 4, 0]}>
                                                    {topPerformers.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={getHealthColor(entry.health)} />
                                                    ))}
                                                </Bar>
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="empty-chart"><p>No data</p></div>
                                    )}
                                </div>
                            </div>

                            {/* Experiments Status */}
                            <div className="chart-card-admin">
                                <div className="chart-header-admin">
                                    <h3><FlaskConical size={18} style={{ color: COLORS.info }} /> Experiment Status</h3>
                                </div>
                                <div className="chart-body-admin chart-with-legend" style={{ height: 280 }}>
                                    {dashboard?.experimentData?.length > 0 ? (
                                        <>
                                            <ResponsiveContainer width="50%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={dashboard.experimentData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={45}
                                                        outerRadius={70}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {dashboard.experimentData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="experiment-stats">
                                                <div className="exp-stat-box">
                                                    <span className="exp-stat-number" style={{ color: COLORS.info }}>{dashboard?.overview?.activeExperiments || 0}</span>
                                                    <span className="exp-stat-label">Active</span>
                                                </div>
                                                <div className="exp-stat-box">
                                                    <span className="exp-stat-number" style={{ color: COLORS.success }}>{dashboard?.overview?.completedExperiments || 0}</span>
                                                    <span className="exp-stat-label">Completed</span>
                                                </div>
                                                <div className="exp-stat-box highlight">
                                                    <span className="exp-stat-number">{dashboard?.successRate || 0}%</span>
                                                    <span className="exp-stat-label">Success Rate</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="empty-chart"><p>No experiments</p></div>
                                    )}
                                </div>
                            </div>

                            {/* Sector Health Comparison */}
                            <div className="chart-card-admin wide">
                                <div className="chart-header-admin">
                                    <h3><Target size={18} style={{ color: COLORS.teal }} /> Sector Health Comparison</h3>
                                </div>
                                <div className="sector-health-bars">
                                    {dashboard?.sectorData?.map((sector, index) => (
                                        <div key={sector.name} className="sector-bar-item">
                                            <div className="sector-bar-header">
                                                <span className="sector-name">{sector.name}</span>
                                                <span className="sector-info">{sector.value} SMEs • Avg: {sector.avgHealth}</span>
                                            </div>
                                            <div className="sector-bar-track">
                                                <div
                                                    className="sector-bar-fill"
                                                    style={{
                                                        width: `${sector.avgHealth}%`,
                                                        background: `linear-gradient(90deg, ${CHART_COLORS[index % CHART_COLORS.length]}, ${CHART_COLORS[(index + 1) % CHART_COLORS.length]})`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Successes */}
                            <div className="chart-card-admin">
                                <div className="chart-header-admin">
                                    <h3><CheckCircle2 size={18} style={{ color: COLORS.success }} /> Recent Successes</h3>
                                </div>
                                <div className="success-list">
                                    {dashboard?.recentActivityL?.length > 0 ? (
                                        dashboard.recentActivityL.slice(0, 4).map((activity, index) => (
                                            <div key={index} className="success-item-admin">
                                                <div className="success-icon-admin">🎉</div>
                                                <div className="success-details">
                                                    <span className="success-business">{activity.businessName}</span>
                                                    <span className="success-experiment">{activity.experimentTitle}</span>
                                                </div>
                                                {activity.savings > 0 && (
                                                    <span className="success-savings">{formatCurrency(activity.savings)}/mo</span>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-chart"><p>No completed experiments yet</p></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'businesses' && (
                        <div className="businesses-section">
                            <div className="table-card">
                                <div className="table-wrapper">
                                    <table className="admin-table-enhanced">
                                        <thead>
                                            <tr>
                                                <th>Business</th>
                                                <th>Sector</th>
                                                <th>Revenue</th>
                                                <th>Wastage</th>
                                                <th>Health</th>
                                                <th>Experiments</th>
                                                <th>Issues</th>
                                                <th>Last Upload</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {businesses.map(biz => (
                                                <tr key={biz._id}>
                                                    <td>
                                                        <div className="business-cell">
                                                            <strong>{biz.businessName}</strong>
                                                            <span className="business-email">{biz.email}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="sector-tag">{biz.sector}</span>
                                                    </td>
                                                    <td className="revenue-cell">{formatCurrency(biz.latestKPI?.revenue)}</td>
                                                    <td>
                                                        <span className={`wastage-value ${(biz.latestKPI?.wastage || 0) > 10 ? 'high' : ''}`}>
                                                            {biz.latestKPI?.wastage?.toFixed(1) || '-'}%
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="health-cell-enhanced">
                                                            <div
                                                                className="health-bar-mini"
                                                                style={{
                                                                    width: `${biz.latestKPI?.healthScore || biz.healthScore || 0}%`,
                                                                    background: getHealthColor(biz.latestKPI?.healthScore || biz.healthScore || 0)
                                                                }}
                                                            ></div>
                                                            <span>{biz.latestKPI?.healthScore || biz.healthScore || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="experiment-count-badge">{biz.experimentCount || 0}</span>
                                                    </td>
                                                    <td>
                                                        {biz.openIssues > 0 ? (
                                                            <span className="issues-badge-admin">{biz.openIssues}</span>
                                                        ) : (
                                                            <span className="no-issues">✓</span>
                                                        )}
                                                    </td>
                                                    <td className="date-cell">
                                                        <Calendar size={14} />
                                                        {formatDate(biz.lastDataUpload)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'improvements' && (
                        <div className="improvements-section">
                            {/* Summary Cards */}
                            <div className="improvement-summary-grid">
                                <div className="improvement-card">
                                    <div className="improvement-icon success">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <span className="improvement-value">{dashboard?.overview?.completedExperiments || 0}</span>
                                    <span className="improvement-label">Experiments Completed</span>
                                </div>
                                <div className="improvement-card">
                                    <div className="improvement-icon primary">
                                        <TrendingUp size={32} />
                                    </div>
                                    <span className="improvement-value gradient-text">{dashboard?.successRate || 0}%</span>
                                    <span className="improvement-label">Success Rate</span>
                                </div>
                                <div className="improvement-card">
                                    <div className="improvement-icon warning">
                                        <DollarSign size={32} />
                                    </div>
                                    <span className="improvement-value">{formatCurrency(dashboard?.overview?.totalMonthlySavings)}</span>
                                    <span className="improvement-label">Monthly Savings</span>
                                </div>
                            </div>

                            {/* Improvements List */}
                            <div className="improvements-list-card">
                                <h3 className="section-title">All Improvement Results</h3>
                                <div className="improvements-list-enhanced">
                                    {dashboard?.recentActivityL?.length > 0 ? (
                                        dashboard.recentActivityL.map((activity, index) => (
                                            <div key={index} className="improvement-item-enhanced">
                                                <div className="improvement-status">
                                                    {activity.improvement && activity.improvement < 0 ? (
                                                        <CheckCircle2 size={24} className="success" />
                                                    ) : (
                                                        <XCircle size={24} className="neutral" />
                                                    )}
                                                </div>
                                                <div className="improvement-info">
                                                    <span className="improvement-business">{activity.businessName}</span>
                                                    <span className="improvement-experiment">{activity.experimentTitle}</span>
                                                </div>
                                                <div className="improvement-metrics">
                                                    {activity.improvement && (
                                                        <div className={`metric-pill ${activity.improvement < 0 ? 'positive' : 'negative'}`}>
                                                            {activity.improvement > 0 ? '+' : ''}{activity.improvement.toFixed(1)}%
                                                        </div>
                                                    )}
                                                    <div className="metric-pill success">
                                                        {formatCurrency(activity.savings || 0)}/mo
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-state-admin">
                                            <FlaskConical size={48} />
                                            <p>No completed experiments yet</p>
                                            <span>Results will appear here once SMEs complete their first experiments</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

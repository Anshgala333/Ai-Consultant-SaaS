import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { uploadAPI, kpiAPI } from '../api';
import { aiAPI, dataProcessingAPI, checkPythonServiceHealth } from '../pythonApi';
import {
  Database,
  Upload as UploadIcon,
  FileSpreadsheet,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart2,
  Sparkles,
  RefreshCw,
  Eye,
  Trash2,
  ChevronRight,
  Server,
  Zap,
  Package,
  DollarSign,
  Users,
  ShoppingCart
} from 'lucide-react';
import toast from 'react-hot-toast';
import './DataHub.css';

const DataHub = () => {
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState([]);
  const [kpiSummary, setKpiSummary] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [pythonService, setPythonService] = useState({ available: false });
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUploads: 0,
    totalRows: 0,
    lastUpload: null,
    dataTypes: {}
  });

  useEffect(() => {
    loadData();
    checkPythonServiceHealth().then(setPythonService);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uploadsRes, kpiRes] = await Promise.all([
        uploadAPI.getUploads().catch(() => ({ data: [] })),
        kpiAPI.getSummary().catch(() => ({ data: null }))
      ]);

      const uploadsList = uploadsRes.data || [];
      setUploads(uploadsList);
      setKpiSummary(kpiRes.data);

      // Calculate stats
      const dataTypeCount = {};
      let totalRows = 0;
      uploadsList.forEach(u => {
        dataTypeCount[u.dataType] = (dataTypeCount[u.dataType] || 0) + 1;
        totalRows += u.summary?.totalRows || 0;
      });

      setStats({
        totalUploads: uploadsList.length,
        totalRows,
        lastUpload: uploadsList[0]?.createdAt,
        dataTypes: dataTypeCount
      });

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    if (!pythonService.available || !kpiSummary) {
      toast.error('AI service not available');
      return;
    }

    setAiLoading(true);
    try {
      const response = await aiAPI.analyzeKPIs({
        current_kpis: kpiSummary.currentPeriod || {},
        historical_kpis: []
      });
      setAiInsights(response.data.analysis);
      toast.success('AI insights generated!');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Failed to generate insights');
    } finally {
      setAiLoading(false);
    }
  };

  const getDataTypeIcon = (type) => {
    const icons = {
      sales: <DollarSign size={18} />,
      purchase: <ShoppingCart size={18} />,
      wastage: <Trash2 size={18} />,
      inventory: <Package size={18} />,
      staff: <Users size={18} />
    };
    return icons[type] || <FileSpreadsheet size={18} />;
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

  const getStatusBadge = (status) => {
    const badges = {
      completed: { icon: <CheckCircle2 size={14} />, class: 'success', label: 'Processed' },
      processing: { icon: <RefreshCw size={14} className="spinning" />, class: 'processing', label: 'Processing' },
      pending: { icon: <Clock size={14} />, class: 'pending', label: 'Pending' },
      failed: { icon: <AlertTriangle size={14} />, class: 'error', label: 'Failed' }
    };
    return badges[status] || badges.pending;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page data-hub">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <Database size={28} />
              Data Hub
            </h1>
            <p className="page-subtitle">Track, analyze, and manage all your uploaded data</p>
          </div>
          <div className="header-actions">
            {pythonService.available && (
              <div className="service-status online">
                <Server size={14} />
                <span>AI Active</span>
              </div>
            )}
            <Link to="/upload" className="btn btn-primary">
              <UploadIcon size={18} />
              Upload Data
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <FileSpreadsheet size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalUploads}</span>
              <span className="stat-label">Total Uploads</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <BarChart2 size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{formatNumber(stats.totalRows)}</span>
              <span className="stat-label">Total Rows</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Calendar size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">
                {stats.lastUpload ? formatDate(stats.lastUpload).split(',')[0] : 'Never'}
              </span>
              <span className="stat-label">Last Upload</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Zap size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{kpiSummary?.currentPeriod?.healthScore || 0}</span>
              <span className="stat-label">Health Score</span>
            </div>
          </div>
        </div>

        {/* Data Type Breakdown */}
        <div className="data-types-section">
          <h3>Data by Type</h3>
          <div className="data-types-grid">
            {['sales', 'purchase', 'wastage', 'inventory', 'staff'].map(type => (
              <div
                key={type}
                className="data-type-card"
                style={{ '--type-color': getDataTypeColor(type) }}
              >
                <div className="type-icon">{getDataTypeIcon(type)}</div>
                <div className="type-info">
                  <span className="type-name">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  <span className="type-count">{stats.dataTypes[type] || 0} files</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hub-grid">
          {/* Recent Uploads */}
          <div className="card uploads-card">
            <div className="card-header">
              <h3>Recent Uploads</h3>
              <Link to="/upload" className="btn btn-ghost btn-sm">
                Upload <ChevronRight size={16} />
              </Link>
            </div>

            {uploads.length === 0 ? (
              <div className="empty-state">
                <UploadIcon size={48} />
                <p>No data uploaded yet</p>
                <Link to="/upload" className="btn btn-primary">
                  Upload your first file
                </Link>
              </div>
            ) : (
              <div className="uploads-list">
                {uploads.slice(0, 8).map(upload => {
                  const status = getStatusBadge(upload.status);
                  return (
                    <div
                      key={upload._id}
                      className={`upload-item ${selectedUpload === upload._id ? 'selected' : ''}`}
                      onClick={() => setSelectedUpload(upload._id === selectedUpload ? null : upload._id)}
                    >
                      <div
                        className="upload-type-indicator"
                        style={{ backgroundColor: getDataTypeColor(upload.dataType) }}
                      />
                      <div className="upload-icon">
                        {getDataTypeIcon(upload.dataType)}
                      </div>
                      <div className="upload-info">
                        <span className="upload-name">{upload.fileName || 'Untitled'}</span>
                        <span className="upload-meta">
                          {upload.dataType} • {upload.summary?.totalRows || 0} rows
                        </span>
                      </div>
                      <div className={`status-badge ${status.class}`}>
                        {status.icon}
                        {status.label}
                      </div>
                      <span className="upload-date">{formatDate(upload.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Insights Panel */}
          <div className="card ai-insights-card">
            <div className="card-header">
              <h3>
                <Sparkles size={18} />
                AI Insights
              </h3>
              {pythonService.available && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={fetchAIInsights}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <><RefreshCw size={16} className="spinning" /> Analyzing...</>
                  ) : (
                    <><Zap size={16} /> Generate</>
                  )}
                </button>
              )}
            </div>

            {!pythonService.available ? (
              <div className="ai-unavailable">
                <Server size={32} />
                <p>AI service not connected</p>
                <span>Start the Python service to enable AI insights</span>
              </div>
            ) : aiInsights ? (
              <div className="ai-content">
                {aiInsights.overall_assessment && (
                  <div className="ai-assessment">
                    <h4>Overall Assessment</h4>
                    <p>{aiInsights.overall_assessment}</p>
                  </div>
                )}

                {aiInsights.insights?.length > 0 && (
                  <div className="ai-insights-list">
                    <h4>Key Insights</h4>
                    {aiInsights.insights.slice(0, 4).map((insight, idx) => (
                      <div key={idx} className={`insight-item ${insight.severity}`}>
                        <span className="insight-category">{insight.category}</span>
                        <span className="insight-text">{insight.insight}</span>
                      </div>
                    ))}
                  </div>
                )}

                {aiInsights.recommendations?.length > 0 && (
                  <div className="ai-recommendations">
                    <h4>Recommendations</h4>
                    {aiInsights.recommendations.slice(0, 3).map((rec, idx) => (
                      <div key={idx} className={`recommendation-item priority-${rec.priority}`}>
                        <span className="priority-badge">{rec.priority}</span>
                        <span className="recommendation-text">{rec.action}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="ai-placeholder">
                <Sparkles size={48} />
                <p>Click "Generate" to get AI-powered insights on your data</p>
              </div>
            )}
          </div>
        </div>

        {/* KPI Overview from Data */}
        {kpiSummary?.currentPeriod && (
          <div className="kpi-overview-section">
            <h3>Current KPIs</h3>
            <div className="kpi-overview-grid">
              <div className="kpi-overview-card">
                <div className="kpi-header">
                  <span className="kpi-label">Revenue</span>
                  {kpiSummary.currentPeriod.revenue?.trend === 'up' ? (
                    <TrendingUp size={16} className="trend-up" />
                  ) : (
                    <TrendingDown size={16} className="trend-down" />
                  )}
                </div>
                <div className="kpi-value">
                  ₹{formatNumber(kpiSummary.currentPeriod.revenue?.total)}
                </div>
                {kpiSummary.currentPeriod.revenue?.growth !== undefined && (
                  <div className={`kpi-change ${kpiSummary.currentPeriod.revenue.growth >= 0 ? 'positive' : 'negative'}`}>
                    {kpiSummary.currentPeriod.revenue.growth >= 0 ? '+' : ''}
                    {kpiSummary.currentPeriod.revenue.growth?.toFixed(1)}%
                  </div>
                )}
              </div>

              <div className="kpi-overview-card">
                <div className="kpi-header">
                  <span className="kpi-label">Wastage</span>
                </div>
                <div className="kpi-value">
                  {kpiSummary.currentPeriod.wastage?.percentage?.toFixed(1) || 0}%
                </div>
                <div className="kpi-sub">₹{formatNumber(kpiSummary.currentPeriod.wastage?.value)} lost</div>
              </div>

              <div className="kpi-overview-card">
                <div className="kpi-header">
                  <span className="kpi-label">Top SKU</span>
                </div>
                <div className="kpi-value sku-value">
                  {kpiSummary.currentPeriod.sku?.topPerformers?.[0]?.sku || 'N/A'}
                </div>
                <div className="kpi-sub">
                  ₹{formatNumber(kpiSummary.currentPeriod.sku?.topPerformers?.[0]?.revenue)}
                </div>
              </div>

              <div className="kpi-overview-card">
                <div className="kpi-header">
                  <span className="kpi-label">Health Score</span>
                </div>
                <div className="kpi-value health-value">
                  {kpiSummary.currentPeriod.healthScore || 0}
                </div>
                <div className="health-bar">
                  <div
                    className="health-fill"
                    style={{ width: `${kpiSummary.currentPeriod.healthScore || 0}%` }}
                  />
                </div>
              </div>
            </div>
            <Link to="/kpi-history" className="view-all-link">
              View detailed KPI history <ChevronRight size={16} />
            </Link>
          </div>
        )}

        {/* Quick Actions */}
        <div className="quick-actions">
          <Link to="/upload" className="action-card">
            <span className="action-icon">📤</span>
            <span className="action-label">Upload More Data</span>
          </Link>
          <Link to="/recommendations" className="action-card">
            <span className="action-icon">✨</span>
            <span className="action-label">AI Recommendations</span>
          </Link>
          <Link to="/kpi-history" className="action-card">
            <span className="action-icon">📈</span>
            <span className="action-label">KPI History</span>
          </Link>
          <Link to="/reports" className="action-card">
            <span className="action-icon">📊</span>
            <span className="action-label">Generate Report</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DataHub;

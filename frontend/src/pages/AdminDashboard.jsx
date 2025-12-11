import { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { Users, Building2, TrendingUp, AlertTriangle } from 'lucide-react';

const AdminDashboard = () => {
    const [data, setData] = useState({ dashboard: null, businesses: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [dashRes, bizRes] = await Promise.all([
                adminAPI.getDashboard(),
                adminAPI.getBusinesses()
            ]);
            setData({ dashboard: dashRes.data, businesses: bizRes.data });
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
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

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Admin Dashboard</h1>
                    <p className="page-subtitle">Monitor all pilot businesses</p>
                </div>

                {/* Overview */}
                <div className="grid grid-4 mb-lg">
                    <div className="kpi-card"><div className="kpi-header"><Users size={18} /></div><div className="kpi-value">{data.dashboard?.overview?.totalPilotBusinesses || 0}</div><div className="kpi-label">Pilot SMEs</div></div>
                    <div className="kpi-card"><div className="kpi-value">{data.dashboard?.overview?.activeExperiments || 0}</div><div className="kpi-label">Active Experiments</div></div>
                    <div className="kpi-card"><div className="kpi-value text-success">{data.dashboard?.successRate || 0}%</div><div className="kpi-label">Success Rate</div></div>
                    <div className="kpi-card"><div className="kpi-value text-success">{formatCurrency(data.dashboard?.overview?.totalMonthlySavings)}</div><div className="kpi-label">Total Savings</div></div>
                </div>

                {/* Businesses Table */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Pilot Businesses</h3>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Business</th>
                                    <th>Sector</th>
                                    <th>Health Score</th>
                                    <th>Experiments</th>
                                    <th>Open Issues</th>
                                    <th>Last Upload</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.businesses.map(biz => (
                                    <tr key={biz._id}>
                                        <td><strong>{biz.businessName}</strong></td>
                                        <td>{biz.sector}</td>
                                        <td><span className="health-badge">{biz.latestKPI?.healthScore || biz.healthScore || '-'}</span></td>
                                        <td>{biz.experimentCount}</td>
                                        <td>{biz.openIssues}</td>
                                        <td>{biz.lastDataUpload ? new Date(biz.lastDataUpload).toLocaleDateString() : 'Never'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <style>{`
        .table-wrapper { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }
        .data-table th { color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; }
        .health-badge { display: inline-block; padding: 0.25rem 0.75rem; background: var(--accent-gradient); color: white; border-radius: 20px; font-weight: 600; font-size: 0.875rem; }
      `}</style>
        </div>
    );
};

export default AdminDashboard;

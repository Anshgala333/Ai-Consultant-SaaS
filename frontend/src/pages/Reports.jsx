import { useState, useEffect } from 'react';
import { reportsAPI } from '../api';
import { FileText, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const Reports = () => {
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchPreview();
    }, []);

    const fetchPreview = async () => {
        try {
            const response = await reportsAPI.preview();
            setPreview(response.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateReport = async () => {
        setGenerating(true);
        try {
            const response = await reportsAPI.generate();
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `impact-report-${Date.now()}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Report downloaded!');
        } catch (error) {
            toast.error('Failed to generate report');
        } finally {
            setGenerating(false);
        }
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
                        <h1 className="page-title">Impact Reports</h1>
                        <p className="page-subtitle">Generate investor-grade reports</p>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state"><div className="spinner"></div></div>
                ) : (
                    <div className="report-content">
                        <div className="card report-preview">
                            <div className="preview-header">
                                <FileText size={24} style={{ color: 'var(--accent-primary)' }} />
                                <h3>Report Preview</h3>
                            </div>

                            {preview?.summary && (
                                <div className="preview-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Health Score</span>
                                        <span className="stat-value">{preview.summary.healthScore}/100</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Experiments</span>
                                        <span className="stat-value">{preview.summary.experimentsCompleted}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Issues Resolved</span>
                                        <span className="stat-value">{preview.summary.issuesResolved}</span>
                                    </div>
                                    <div className="stat-item highlight">
                                        <span className="stat-label">Monthly Savings</span>
                                        <span className="stat-value">{formatCurrency(preview.summary.estimatedMonthlySavings)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="report-sections">
                                <h4>Report Sections</h4>
                                <ul>
                                    <li>✓ Executive Summary</li>
                                    <li>✓ Baseline vs Latest KPIs</li>
                                    <li>✓ Issues Detected & Resolved</li>
                                    <li>✓ Experiment Outcomes</li>
                                    <li>✓ Customer Feedback Analysis</li>
                                    <li>✓ Recommended Next 30 Days</li>
                                </ul>
                            </div>

                            <button
                                className="btn btn-primary btn-lg"
                                onClick={generateReport}
                                disabled={generating || !preview?.canGenerate}
                                style={{ width: '100%' }}
                            >
                                {generating ? 'Generating...' : <><Download size={18} /> Download PDF Report</>}
                            </button>

                            {!preview?.canGenerate && (
                                <p className="text-muted text-center mt-md" style={{ fontSize: '0.875rem' }}>
                                    Complete at least one experiment or upload data to generate a report.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <style>{`
        .report-content { max-width: 500px; margin: 0 auto; }
        .report-preview { text-align: left; }
        .preview-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
        .preview-header h3 { margin: 0; }
        .preview-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
        .stat-item { background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; }
        .stat-item .stat-label { display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; }
        .stat-item .stat-value { font-size: 1.5rem; font-weight: 700; }
        .stat-item.highlight .stat-value { color: var(--success); }
        .report-sections { margin-bottom: 1.5rem; }
        .report-sections h4 { margin-bottom: 0.75rem; }
        .report-sections ul { list-style: none; }
        .report-sections li { padding: 0.5rem 0; color: var(--text-secondary); }
      `}</style>
        </div>
    );
};

export default Reports;

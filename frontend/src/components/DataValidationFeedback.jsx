/**
 * DataValidationFeedback Component
 * 
 * Real-time feedback component for data validation and processing.
 * Shows validation status, errors, warnings, corrections, and AI insights.
 */

import React from 'react';
import './DataValidationFeedback.css';

/**
 * Main validation feedback component
 */
export const DataValidationFeedback = ({
    status,
    message,
    progress,
    errors = [],
    warnings = [],
    corrections = [],
    quality,
    onApplyCorrection,
    onDismissError,
    showDetails = true
}) => {
    const getStatusIcon = () => {
        switch (status) {
            case 'idle': return '📋';
            case 'validating': return '🔍';
            case 'correcting': return '✏️';
            case 'processing': return '⚙️';
            case 'validated': return '✅';
            case 'complete': return '🎉';
            case 'error': return '❌';
            default: return '📋';
        }
    };

    const getStatusClass = () => {
        if (['complete', 'validated'].includes(status)) return 'success';
        if (status === 'error') return 'error';
        if (['validating', 'correcting', 'processing'].includes(status)) return 'loading';
        return '';
    };

    return (
        <div className={`validation-feedback ${getStatusClass()}`}>
            {/* Status Header */}
            <div className="feedback-header">
                <span className="status-icon">{getStatusIcon()}</span>
                <span className="status-message">{message || 'Ready to validate'}</span>
            </div>

            {/* Progress Bar */}
            {progress > 0 && progress < 100 && (
                <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${progress}%` }} />
                    <span className="progress-text">{progress}%</span>
                </div>
            )}

            {/* Quality Score */}
            {quality && (
                <div className="quality-score">
                    <div className="score-label">Data Quality</div>
                    <div className={`score-value ${quality.score >= 80 ? 'good' : quality.score >= 60 ? 'fair' : 'poor'}`}>
                        {quality.score?.toFixed(0)}%
                    </div>
                    <div className="score-breakdown">
                        <span title="Completeness">📝 {quality.completeness?.toFixed(0)}%</span>
                        <span title="Accuracy">✓ {quality.accuracy?.toFixed(0)}%</span>
                        <span title="Consistency">📊 {quality.consistency?.toFixed(0)}%</span>
                    </div>
                </div>
            )}

            {/* Errors Section */}
            {showDetails && errors.length > 0 && (
                <div className="feedback-section errors">
                    <div className="section-header">
                        <span className="section-icon">❌</span>
                        <span className="section-title">Errors ({errors.length})</span>
                    </div>
                    <div className="section-content">
                        {errors.slice(0, 10).map((error, idx) => (
                            <div key={idx} className="error-item">
                                <div className="error-location">Row {error.row}, Column: {error.column}</div>
                                <div className="error-message">{error.message}</div>
                                {error.current_value && (
                                    <div className="error-value">Current value: "{error.current_value}"</div>
                                )}
                                {onDismissError && (
                                    <button 
                                        className="btn-dismiss"
                                        onClick={() => onDismissError(error)}
                                    >
                                        Dismiss
                                    </button>
                                )}
                            </div>
                        ))}
                        {errors.length > 10 && (
                            <div className="more-items">... and {errors.length - 10} more errors</div>
                        )}
                    </div>
                </div>
            )}

            {/* Warnings Section */}
            {showDetails && warnings.length > 0 && (
                <div className="feedback-section warnings">
                    <div className="section-header">
                        <span className="section-icon">⚠️</span>
                        <span className="section-title">Warnings ({warnings.length})</span>
                    </div>
                    <div className="section-content">
                        {warnings.slice(0, 5).map((warning, idx) => (
                            <div key={idx} className="warning-item">
                                <div className="warning-location">Row {warning.row}</div>
                                <div className="warning-message">{warning.message}</div>
                            </div>
                        ))}
                        {warnings.length > 5 && (
                            <div className="more-items">... and {warnings.length - 5} more warnings</div>
                        )}
                    </div>
                </div>
            )}

            {/* Corrections Section */}
            {showDetails && corrections.length > 0 && (
                <div className="feedback-section corrections">
                    <div className="section-header">
                        <span className="section-icon">✨</span>
                        <span className="section-title">Suggested Corrections ({corrections.length})</span>
                    </div>
                    <div className="section-content">
                        {corrections.slice(0, 5).map((correction, idx) => (
                            <div key={idx} className="correction-item">
                                <div className="correction-location">Row {correction.row}, {correction.column}</div>
                                <div className="correction-change">
                                    <span className="original">"{correction.original}"</span>
                                    <span className="arrow">→</span>
                                    <span className="suggested">"{correction.suggested}"</span>
                                </div>
                                <div className="correction-confidence">
                                    Confidence: {(correction.confidence * 100).toFixed(0)}%
                                </div>
                                {onApplyCorrection && (
                                    <button 
                                        className="btn-apply"
                                        onClick={() => onApplyCorrection(correction)}
                                    >
                                        Apply
                                    </button>
                                )}
                            </div>
                        ))}
                        {corrections.length > 5 && (
                            <div className="more-items">... and {corrections.length - 5} more corrections</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Processing summary component shown after successful processing
 */
export const ProcessingSummary = ({ result }) => {
    if (!result) return null;

    return (
        <div className="processing-summary">
            <div className="summary-header">
                <span className="success-icon">🎉</span>
                <h3>Processing Complete!</h3>
            </div>
            
            <div className="summary-stats">
                <div className="stat">
                    <div className="stat-value">{result.total_rows}</div>
                    <div className="stat-label">Total Rows</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{result.valid_rows}</div>
                    <div className="stat-label">Valid Rows</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{result.corrected_rows || 0}</div>
                    <div className="stat-label">Corrections Applied</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{result.processing_time_ms?.toFixed(0)}ms</div>
                    <div className="stat-label">Processing Time</div>
                </div>
            </div>

            {result.kpi_snapshot && (
                <div className="kpi-preview">
                    <h4>KPI Summary</h4>
                    <div className="kpi-grid">
                        <div className="kpi-item">
                            <span className="kpi-label">Health Score</span>
                            <span className="kpi-value">{result.kpi_snapshot.period_health_score?.toFixed(0)}</span>
                        </div>
                        {result.kpi_snapshot.revenue && (
                            <div className="kpi-item">
                                <span className="kpi-label">Revenue</span>
                                <span className="kpi-value">₹{result.kpi_snapshot.revenue.total?.toLocaleString()}</span>
                            </div>
                        )}
                        {result.kpi_snapshot.wastage && (
                            <div className="kpi-item">
                                <span className="kpi-label">Wastage</span>
                                <span className="kpi-value">{result.kpi_snapshot.wastage.percentage?.toFixed(1)}%</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * AI Analysis display component
 */
export const AIAnalysisDisplay = ({ analysis, loading }) => {
    if (loading) {
        return (
            <div className="ai-analysis loading">
                <div className="ai-loading">
                    <span className="spinner">🤖</span>
                    <span>AI analyzing your data...</span>
                </div>
            </div>
        );
    }

    if (!analysis) return null;

    return (
        <div className="ai-analysis">
            <div className="ai-header">
                <span className="ai-icon">🤖</span>
                <h4>AI Insights</h4>
            </div>

            {analysis.summary && (
                <div className="ai-summary">{analysis.summary}</div>
            )}

            {analysis.quality_score !== undefined && (
                <div className="ai-quality">
                    <span className="quality-grade">{analysis.quality_grade}</span>
                    <span className="quality-score">{analysis.quality_score}/100</span>
                </div>
            )}

            {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="ai-recommendations">
                    <h5>Recommendations</h5>
                    <ul>
                        {analysis.recommendations.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                        ))}
                    </ul>
                </div>
            )}

            {analysis.issues && analysis.issues.length > 0 && (
                <div className="ai-issues">
                    <h5>Issues Detected</h5>
                    {analysis.issues.map((issue, idx) => (
                        <div key={idx} className={`ai-issue ${issue.severity}`}>
                            <span className="issue-severity">{issue.severity.toUpperCase()}</span>
                            <span className="issue-text">{issue.issue}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * Service status indicator
 */
export const ServiceStatus = ({ health }) => {
    if (!health.checked) {
        return (
            <div className="service-status checking">
                <span className="status-dot"></span>
                <span>Checking service...</span>
            </div>
        );
    }

    return (
        <div className={`service-status ${health.available ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            <span>
                {health.available 
                    ? `Python Service v${health.version}` 
                    : 'Python Service Offline'}
            </span>
        </div>
    );
};

export default DataValidationFeedback;

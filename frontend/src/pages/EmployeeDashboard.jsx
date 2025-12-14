import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MapPin, QrCode, AlertTriangle, Building2 } from 'lucide-react';
import Outlets from './Outlets';
import ErrorReporting from './ErrorReporting';
import './Dashboard.css';

const EmployeeDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('outlets'); // 'outlets' or 'errors'

    return (
        <div className="page employee-dashboard">
            <div className="container">
                {/* Header */}
                <div className="dashboard-header">
                    <div>
                        <h1 className="page-title">Welcome, {user?.name}</h1>
                        <p className="page-subtitle">
                            <Building2 size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                            {user?.businessName}
                        </p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="employee-tabs">
                    <button
                        className={`employee-tab ${activeTab === 'outlets' ? 'active' : ''}`}
                        onClick={() => setActiveTab('outlets')}
                    >
                        <MapPin size={18} />
                        <span>Outlets & QR</span>
                    </button>
                    <button
                        className={`employee-tab ${activeTab === 'errors' ? 'active' : ''}`}
                        onClick={() => setActiveTab('errors')}
                    >
                        <AlertTriangle size={18} />
                        <span>Error Reporting</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'outlets' && <Outlets />}
                    {activeTab === 'errors' && <ErrorReporting />}
                </div>
            </div>
            <style>{`
                .employee-dashboard .page-subtitle {
                    display: flex;
                    align-items: center;
                    color: var(--text-muted);
                }
                .employee-tabs {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                    padding: 0.25rem;
                    background: var(--bg-tertiary);
                    border-radius: 12px;
                    width: fit-content;
                }
                .employee-tab {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.25rem;
                    border: none;
                    background: transparent;
                    border-radius: 10px;
                    color: var(--text-muted);
                    font-size: 0.9375rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .employee-tab:hover {
                    color: var(--text-primary);
                }
                .employee-tab.active {
                    background: var(--bg-card);
                    color: var(--text-primary);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                }
                .tab-content {
                    min-height: 400px;
                }
                .tab-content .page {
                    padding: 0;
                }
                .tab-content .container {
                    padding: 0;
                    max-width: none;
                }
                .tab-content .page-header {
                    margin-bottom: 1.5rem;
                }
            `}</style>
        </div>
    );
};

export default EmployeeDashboard;

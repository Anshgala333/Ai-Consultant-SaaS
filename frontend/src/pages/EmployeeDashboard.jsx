import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MapPin, QrCode, ClipboardList, Building2, PlusCircle, X } from 'lucide-react';
import Outlets from './Outlets';
import EmployeeStaffLogs from './EmployeeStaffLogs';
import StaffLogForm from './StaffLogForm';
import './Dashboard.css';

const EmployeeDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('outlets'); // 'outlets', 'staffLogs', or 'logIssue'
    const [showLogForm, setShowLogForm] = useState(false);

    const handleLogSuccess = () => {
        setShowLogForm(false);
        setActiveTab('staffLogs');
    };

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
                        <QrCode size={18} />
                        <span>QR Codes</span>
                    </button>
                    <button
                        className={`employee-tab ${activeTab === 'staffLogs' ? 'active' : ''}`}
                        onClick={() => setActiveTab('staffLogs')}
                    >
                        <ClipboardList size={18} />
                        <span>Staff Logs</span>
                    </button>
                    <button
                        className={`employee-tab log-issue-tab ${activeTab === 'logIssue' ? 'active' : ''}`}
                        onClick={() => setShowLogForm(true)}
                    >
                        <PlusCircle size={18} />
                        <span>Log Issue</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'outlets' && <Outlets />}
                    {activeTab === 'staffLogs' && <EmployeeStaffLogs onLogIssue={() => setShowLogForm(true)} />}
                </div>

                {/* Log Issue Modal */}
                {showLogForm && (
                    <div className="log-form-modal-overlay" onClick={() => setShowLogForm(false)}>
                        <div className="log-form-modal" onClick={(e) => e.stopPropagation()}>
                            <button className="modal-close-btn" onClick={() => setShowLogForm(false)}>
                                <X size={24} />
                            </button>
                            <StaffLogForm 
                                onClose={() => setShowLogForm(false)} 
                                onSuccess={handleLogSuccess}
                            />
                        </div>
                    </div>
                )}
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
                .employee-tab.log-issue-tab {
                    background: var(--accent-primary);
                    color: white;
                }
                .employee-tab.log-issue-tab:hover {
                    background: var(--accent-secondary);
                    color: white;
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
                
                /* Log Form Modal */
                .log-form-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.75);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1rem;
                    overflow-y: auto;
                }
                .log-form-modal {
                    position: relative;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    width: 100%;
                    max-width: 540px;
                    max-height: 90vh;
                    overflow-y: auto;
                    animation: slideUp 0.3s ease;
                }
                .modal-close-btn {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-tertiary);
                    border: none;
                    border-radius: 10px;
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: all 0.2s;
                    z-index: 10;
                }
                .modal-close-btn:hover {
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @media (max-width: 640px) {
                    .employee-tabs {
                        width: 100%;
                        overflow-x: auto;
                        flex-wrap: nowrap;
                    }
                    .employee-tab span {
                        white-space: nowrap;
                    }
                    .log-form-modal {
                        max-height: 95vh;
                        border-radius: 16px 16px 0 0;
                        margin-top: auto;
                    }
                    .log-form-modal-overlay {
                        align-items: flex-end;
                        padding: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default EmployeeDashboard;


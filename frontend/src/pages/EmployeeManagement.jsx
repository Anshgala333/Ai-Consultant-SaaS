import { useState, useEffect } from 'react';
import { employeeAPI, businessAPI } from '../api';
import { Users, Plus, Copy, Check, UserX, UserCheck, RefreshCw, Mail, User, Building } from 'lucide-react';
import toast from 'react-hot-toast';

const EmployeeManagement = () => {
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [outlets, setOutlets] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [copiedPassword, setCopiedPassword] = useState(false);
    const [newEmployee, setNewEmployee] = useState({ name: '', email: '', outletId: '', role: 'employee' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [employeesRes, profileRes] = await Promise.all([
                employeeAPI.getAll(),
                businessAPI.getProfile()
            ]);
            setEmployees(employeesRes.data || []);
            setOutlets(profileRes.data?.outlets || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await employeeAPI.getAll();
            setEmployees(response.data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
            toast.error('Failed to fetch employees');
        }
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        if (!newEmployee.name.trim() || !newEmployee.email.trim()) {
            toast.error('Please fill in all fields');
            return;
        }

        setSubmitting(true);
        try {
            const response = await employeeAPI.create(newEmployee);
            setShowAddModal(false);
            setShowCredentialsModal({
                ...response.data,
                password: response.data.generatedPassword
            });
            setNewEmployee({ name: '', email: '', outletId: '', role: 'employee' });
            fetchEmployees();
            toast.success('Employee created successfully!');
        } catch (error) {
            console.error('Error creating employee:', error);
            toast.error(error.response?.data?.message || 'Failed to create employee');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopyPassword = () => {
        if (showCredentialsModal?.password) {
            navigator.clipboard.writeText(showCredentialsModal.password);
            setCopiedPassword(true);
            toast.success('Password copied to clipboard!');
            setTimeout(() => setCopiedPassword(false), 2000);
        }
    };

    const handleDeactivate = async (id) => {
        if (!confirm('Are you sure you want to deactivate this employee?')) return;

        try {
            await employeeAPI.delete(id);
            toast.success('Employee deactivated');
            fetchEmployees();
        } catch (error) {
            toast.error('Failed to deactivate employee');
        }
    };

    const handleReactivate = async (id) => {
        try {
            await employeeAPI.reactivate(id);
            toast.success('Employee reactivated');
            fetchEmployees();
        } catch (error) {
            toast.error('Failed to reactivate employee');
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="container">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading employees...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Employee Management</h1>
                        <p className="page-subtitle">Create and manage employee accounts for your business</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={18} />
                        Add Employee
                    </button>
                </div>

                {employees.length === 0 ? (
                    <div className="empty-state card">
                        <Users size={48} className="text-muted" />
                        <h3>No Employees Yet</h3>
                        <p>Add your first employee to give them access to the employee dashboard</p>
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                            <Plus size={18} />
                            Add Employee
                        </button>
                    </div>
                ) : (
                    <div className="employees-grid">
                        {employees.map(employee => (
                            <div key={employee._id} className={`employee-card card ${!employee.isActive ? 'inactive' : ''}`}>
                                <div className="employee-header">
                                    <div className="employee-avatar">
                                        <User size={24} />
                                    </div>
                                    <div className="employee-info">
                                        <h3>{employee.name}</h3>
                                        <p className="employee-email">
                                            <Mail size={14} />
                                            {employee.email}
                                        </p>
                                        {employee.outletId && (
                                            <p className="employee-branch">
                                                <Building size={14} />
                                                {employee.outletId.name}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="employee-status">
                                    <span className={`status-badge ${employee.isActive ? 'active' : 'inactive'}`}>
                                        {employee.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    {employee.role && employee.role !== 'employee' && (
                                        <span className="role-badge">
                                            {employee.role}
                                        </span>
                                    )}
                                </div>

                                <div className="employee-actions">
                                    {employee.isActive ? (
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => handleDeactivate(employee._id)}
                                        >
                                            <UserX size={16} />
                                            Deactivate
                                        </button>
                                    ) : (
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleReactivate(employee._id)}
                                        >
                                            <UserCheck size={16} />
                                            Reactivate
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Employee Modal */}
                {showAddModal && (
                    <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <h3>Add New Employee</h3>
                            <p className="text-muted modal-subtitle">
                                An auto-generated password will be created for the employee
                            </p>
                            <form onSubmit={handleAddEmployee}>
                                <div className="form-group">
                                    <label className="form-label">Employee Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newEmployee.name}
                                        onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })}
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Address *</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={newEmployee.email}
                                        onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                                        placeholder="employee@company.com"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assign to Branch</label>
                                    <select
                                        className="form-select"
                                        value={newEmployee.outletId}
                                        onChange={e => setNewEmployee({ ...newEmployee, outletId: e.target.value })}
                                    >
                                        <option value="">-- All Branches --</option>
                                        {outlets.map(outlet => (
                                            <option key={outlet._id} value={outlet._id}>
                                                {outlet.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="form-hint">Leave empty if employee works across all branches</p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select
                                        className="form-select"
                                        value={newEmployee.role}
                                        onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })}
                                    >
                                        <option value="employee">Employee</option>
                                        <option value="supervisor">Supervisor</option>
                                        <option value="manager">Manager</option>
                                    </select>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                                        {submitting ? (
                                            <span className="spinner" style={{ width: 18, height: 18 }}></span>
                                        ) : (
                                            <>
                                                <Plus size={18} />
                                                Create Employee
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Credentials Modal */}
                {showCredentialsModal && (
                    <div className="modal-overlay" onClick={() => setShowCredentialsModal(null)}>
                        <div className="modal credentials-modal" onClick={e => e.stopPropagation()}>
                            <div className="credentials-icon">
                                <Check size={32} />
                            </div>
                            <h3>Employee Created!</h3>
                            <p className="text-muted">
                                Share these credentials with the employee. The password will only be shown once.
                            </p>

                            <div className="credentials-box">
                                <div className="credential-row">
                                    <span className="credential-label">Email:</span>
                                    <span className="credential-value">{showCredentialsModal.email}</span>
                                </div>
                                <div className="credential-row">
                                    <span className="credential-label">Password:</span>
                                    <span className="credential-value password">{showCredentialsModal.password}</span>
                                    <button
                                        className="btn btn-ghost btn-sm copy-btn"
                                        onClick={handleCopyPassword}
                                    >
                                        {copiedPassword ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="credentials-warning">
                                <strong>Important:</strong> Save this password now. It cannot be retrieved later.
                            </div>

                            <button
                                className="btn btn-primary w-full"
                                onClick={() => setShowCredentialsModal(null)}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .employees-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.5rem;
                }
                .employee-card {
                    padding: 1.5rem;
                }
                .employee-card.inactive {
                    opacity: 0.6;
                }
                .employee-header {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                .employee-avatar {
                    width: 48px;
                    height: 48px;
                    background: var(--accent-gradient);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }
                .employee-info h3 {
                    margin: 0 0 0.25rem;
                    font-size: 1.125rem;
                }
                .employee-email {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-muted);
                    font-size: 0.875rem;
                }
                .employee-branch {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--accent-primary);
                    font-size: 0.813rem;
                    margin-top: 0.25rem;
                }
                .employee-status {
                    margin-bottom: 1rem;
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }
                .role-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: capitalize;
                    background: rgba(99, 102, 241, 0.15);
                    color: #6366f1;
                }
                .form-hint {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin-top: 0.25rem;
                }
                .status-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .status-badge.active {
                    background: rgba(34, 197, 94, 0.15);
                    color: #22c55e;
                }
                .status-badge.inactive {
                    background: rgba(156, 163, 175, 0.15);
                    color: #9ca3af;
                }
                .employee-actions {
                    padding-top: 1rem;
                    border-top: 1px solid var(--border-color);
                }
                .empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                }
                .empty-state h3 {
                    margin: 1rem 0 0.5rem;
                }
                .empty-state p {
                    color: var(--text-muted);
                    margin-bottom: 1.5rem;
                }
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .modal {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 2rem;
                    width: 90%;
                    max-width: 420px;
                }
                .modal h3 {
                    margin-bottom: 0.5rem;
                }
                .modal-subtitle {
                    font-size: 0.875rem;
                    margin-bottom: 1.5rem;
                }
                .modal-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                    margin-top: 1.5rem;
                }
                .credentials-modal {
                    text-align: center;
                }
                .credentials-icon {
                    width: 64px;
                    height: 64px;
                    background: rgba(34, 197, 94, 0.15);
                    color: #22c55e;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1rem;
                }
                .credentials-box {
                    background: var(--bg-tertiary);
                    border-radius: 8px;
                    padding: 1rem;
                    margin: 1.5rem 0;
                    text-align: left;
                }
                .credential-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.5rem 0;
                }
                .credential-row:not(:last-child) {
                    border-bottom: 1px solid var(--border-color);
                }
                .credential-label {
                    color: var(--text-muted);
                    font-size: 0.875rem;
                    min-width: 70px;
                }
                .credential-value {
                    flex: 1;
                    font-weight: 500;
                }
                .credential-value.password {
                    font-family: monospace;
                    background: var(--bg-secondary);
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                }
                .copy-btn {
                    flex-shrink: 0;
                }
                .credentials-warning {
                    font-size: 0.8125rem;
                    color: var(--warning);
                    margin-bottom: 1.5rem;
                    padding: 0.75rem;
                    background: rgba(234, 179, 8, 0.1);
                    border-radius: 8px;
                }
                .w-full {
                    width: 100%;
                }
            `}</style>
        </div>
    );
};

export default EmployeeManagement;

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Upload,
    AlertTriangle,
    Lightbulb,
    FlaskConical,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    Users,
    BarChart3,
    MapPin,
    Database,
    Building2
} from 'lucide-react';
import { useState } from 'react';
import './Layout.css';

const Layout = ({ children, isEmployee = false }) => {
    const { user, logout, isEmployee: authIsEmployee } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const employeeMode = isEmployee || authIsEmployee;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Business navigation items
    const businessNavItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/data-hub', icon: Database, label: 'Data Hub' },
        { path: '/upload', icon: Upload, label: 'Upload' },
        { path: '/kpi-history', icon: BarChart3, label: 'KPI History' },
        { path: '/issues', icon: AlertTriangle, label: 'Issues' },
        { path: '/recommendations', icon: Lightbulb, label: 'AI Insights' },
        { path: '/experiments', icon: FlaskConical, label: 'Experiments' },
        { path: '/outlets', icon: MapPin, label: 'Outlets & QR' },
        { path: '/reports', icon: FileText, label: 'Reports' },
        { path: '/employees', icon: Users, label: 'Employees' },
    ];

    // Employee navigation items (minimal)
    const employeeNavItems = [
        { path: '/employee-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ];

    const navItems = employeeMode ? employeeNavItems : businessNavItems;

    if (!employeeMode && user?.isAdmin) {
        navItems.push({ path: '/admin', icon: Settings, label: 'Admin Panel' });
    }

    const displayName = employeeMode ? user?.name : user?.businessName;
    const displayInitial = displayName?.charAt(0) || 'U';

    return (
        <div className="layout">
            {/* Mobile Menu Button */}
            <button
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon">AI</div>
                        <span className="logo-text">Consultant</span>
                    </div>
                    {employeeMode && (
                        <div className="employee-badge">
                            <Building2 size={12} />
                            Employee
                        </div>
                    )}
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {displayInitial}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{displayName || 'User'}</span>
                            <span className="user-email">{user?.email}</span>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Main Content */}
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default Layout;

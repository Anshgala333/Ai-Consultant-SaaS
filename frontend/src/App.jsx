import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Issues from './pages/Issues';
import Recommendations from './pages/Recommendations';
import Experiments from './pages/Experiments';
import ExperimentDetail from './pages/ExperimentDetail';
import KpiHistory from './pages/KpiHistory';
import Outlets from './pages/Outlets';
import Reports from './pages/Reports';
import AdminDashboard from './pages/AdminDashboard';
import FeedbackForm from './pages/FeedbackForm';
import StaffLog from './pages/StaffLog';
import DataHub from './pages/DataHub';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeManagement from './pages/EmployeeManagement';
import ChangePassword from './pages/ChangePassword';

// Layout
import Layout from './components/Layout';

// Protected Route Component (Business only)
const ProtectedRoute = ({ children }) => {
    const { user, loading, isEmployee } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Redirect employees to their dashboard
    if (isEmployee) {
        return <Navigate to="/employee-dashboard" replace />;
    }

    // Check if onboarding is needed
    if (!user.onboardingCompleted && window.location.pathname !== '/onboarding') {
        return <Navigate to="/onboarding" replace />;
    }

    return children;
};

// Employee Route Component
const EmployeeRoute = ({ children }) => {
    const { user, loading, isEmployee } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Redirect non-employees to company dashboard
    if (!isEmployee) {
        return <Navigate to="/dashboard" replace />;
    }

    // Check if password change is required
    if (user.requirePasswordChange && window.location.pathname !== '/employee/change-password') {
        return <Navigate to="/employee/change-password" replace />;
    }

    return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user || !user.isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

// Onboarding Route - only requires login, not onboarding completion
const OnboardingRoute = ({ children }) => {
    const { user, loading, isEmployee } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Employees don't need onboarding
    if (isEmployee) {
        return <Navigate to="/employee-dashboard" replace />;
    }

    // If onboarding is already complete, redirect to dashboard
    if (user.onboardingCompleted) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

// Employee Layout wrapper
const EmployeeLayout = ({ children }) => {
    return (
        <Layout isEmployee={true}>
            {children}
        </Layout>
    );
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        className: 'toast-custom',
                        duration: 4000
                    }}
                />
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/feedback/:outletId" element={<FeedbackForm />} />
                    <Route path="/staff-log" element={<StaffLog />} />

                    {/* Onboarding */}
                    <Route path="/onboarding" element={
                        <OnboardingRoute>
                            <Onboarding />
                        </OnboardingRoute>
                    } />

                    {/* Protected Routes with Layout (Business) */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <Layout>
                                <Dashboard />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/upload" element={
                        <ProtectedRoute>
                            <Layout>
                                <Upload />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/data-hub" element={
                        <ProtectedRoute>
                            <Layout>
                                <DataHub />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/kpi-history" element={
                        <ProtectedRoute>
                            <Layout>
                                <KpiHistory />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/issues" element={
                        <ProtectedRoute>
                            <Layout>
                                <Issues />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/recommendations" element={
                        <ProtectedRoute>
                            <Layout>
                                <Recommendations />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/experiments" element={
                        <ProtectedRoute>
                            <Layout>
                                <Experiments />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/experiments/:id" element={
                        <ProtectedRoute>
                            <Layout>
                                <ExperimentDetail />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/outlets" element={
                        <ProtectedRoute>
                            <Layout>
                                <Outlets />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/reports" element={
                        <ProtectedRoute>
                            <Layout>
                                <Reports />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/employees" element={
                        <ProtectedRoute>
                            <Layout>
                                <EmployeeManagement />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    {/* Employee Routes */}
                    <Route path="/employee/change-password" element={
                        <EmployeeRoute>
                            <ChangePassword />
                        </EmployeeRoute>
                    } />

                    <Route path="/employee-dashboard" element={
                        <EmployeeRoute>
                            <EmployeeLayout>
                                <EmployeeDashboard />
                            </EmployeeLayout>
                        </EmployeeRoute>
                    } />

                    {/* Admin Routes */}
                    <Route path="/admin" element={
                        <AdminRoute>
                            <Layout>
                                <AdminDashboard />
                            </Layout>
                        </AdminRoute>
                    } />

                    {/* Catch all */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Building2, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
    const navigate = useNavigate();
    const { login, employeeLogin, user, loading: authLoading, isEmployee } = useAuth();
    const [activeTab, setActiveTab] = useState('company'); // 'company' or 'employee'
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && user) {
            if (isEmployee) {
                navigate('/employee-dashboard', { replace: true });
            } else if (user.onboardingCompleted) {
                navigate('/dashboard', { replace: true });
            } else {
                navigate('/onboarding', { replace: true });
            }
        }
    }, [user, authLoading, navigate, isEmployee]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (activeTab === 'employee') {
                const userData = await employeeLogin(formData.email, formData.password);
                console.log('Employee login successful:', userData);
                toast.success(`Welcome back, ${userData.name}!`);
                navigate('/employee-dashboard', { replace: true });
            } else {
                const userData = await login(formData.email, formData.password);
                console.log('Login successful, user:', userData);
                toast.success('Welcome back!');

                if (userData && userData.onboardingCompleted === true) {
                    console.log('Navigating to dashboard');
                    navigate('/dashboard', { replace: true });
                } else {
                    console.log('Navigating to onboarding');
                    navigate('/onboarding', { replace: true });
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error(error.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setFormData({ email: '', password: '' });
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <Link to="/" className="auth-logo">
                            <div className="logo-icon">AI</div>
                            <span>Consultant</span>
                        </Link>
                        <h1>Welcome back</h1>
                        <p>Sign in to your account to continue</p>
                    </div>

                    {/* Login Type Tabs */}
                    <div className="login-tabs">
                        <button
                            type="button"
                            className={`login-tab ${activeTab === 'company' ? 'active' : ''}`}
                            onClick={() => handleTabChange('company')}
                        >
                            <Building2 size={18} />
                            Company
                        </button>
                        <button
                            type="button"
                            className={`login-tab ${activeTab === 'employee' ? 'active' : ''}`}
                            onClick={() => handleTabChange('employee')}
                        >
                            <UserCircle size={18} />
                            Employee
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <div className="input-wrapper">
                                <Mail size={18} className="input-icon" />
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder={activeTab === 'employee' ? 'employee@company.com' : 'you@company.com'}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div className="input-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                            {loading ? (
                                <span className="spinner" style={{ width: 20, height: 20 }}></span>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {activeTab === 'company' ? (
                        <div className="auth-footer">
                            <p>
                                Don't have an account?{' '}
                                <Link to="/register">Create one</Link>
                            </p>
                        </div>
                    ) : (
                        <div className="auth-footer">
                            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                                Employee accounts are created by your company admin.
                            </p>
                        </div>
                    )}

                    {activeTab === 'company' && (
                        <div className="demo-credentials">
                            <p className="demo-title">Quick Demo Login</p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setFormData({ email: 'admin@aiconsultant.com', password: 'admin123' })}
                                >
                                    Fill Admin
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setFormData({ email: 'demo@restaurant.com', password: 'demo123' })}
                                >
                                    Fill SME
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import './Auth.css';

const ChangePassword = () => {
    const navigate = useNavigate();
    const { changePassword } = useAuth();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });

    // Password strength checker
    const checkPasswordStrength = (password) => {
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };

        const score = Object.values(checks).filter(Boolean).length;
        const feedback = [];

        if (!checks.length) feedback.push('At least 8 characters');
        if (!checks.uppercase) feedback.push('One uppercase letter');
        if (!checks.lowercase) feedback.push('One lowercase letter');
        if (!checks.number) feedback.push('One number');
        if (!checks.special) feedback.push('One special character');

        return { score, feedback, checks };
    };

    const handlePasswordChange = (value) => {
        setFormData({ ...formData, newPassword: value });
        setPasswordStrength(checkPasswordStrength(value));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (passwordStrength.score < 3) {
            toast.error('Password is too weak. Please use a stronger password.');
            return;
        }

        setLoading(true);
        try {
            await changePassword(formData.currentPassword, formData.newPassword);
            toast.success('Password changed successfully!');
            navigate('/employee-dashboard', { replace: true });
        } catch (error) {
            console.error('Change password error:', error);
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const getStrengthColor = () => {
        if (passwordStrength.score <= 2) return '#ef4444';
        if (passwordStrength.score === 3) return '#f59e0b';
        if (passwordStrength.score === 4) return '#10b981';
        return '#22c55e';
    };

    const getStrengthLabel = () => {
        if (passwordStrength.score <= 2) return 'Weak';
        if (passwordStrength.score === 3) return 'Fair';
        if (passwordStrength.score === 4) return 'Good';
        return 'Strong';
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card" style={{ maxWidth: '480px' }}>
                    <div className="auth-header">
                        <div className="logo-icon" style={{ margin: '0 auto 1rem' }}>🔐</div>
                        <h1>Change Password</h1>
                        <p>For security reasons, please change your password before continuing</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label">Current Password *</label>
                            <div className="input-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type={showPasswords.current ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Enter current password"
                                    value={formData.currentPassword}
                                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                >
                                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">New Password *</label>
                            <div className="input-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type={showPasswords.new ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Enter new password"
                                    value={formData.newPassword}
                                    onChange={(e) => handlePasswordChange(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                >
                                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {formData.newPassword && (
                                <div className="password-strength">
                                    <div className="strength-bar">
                                        <div
                                            className="strength-fill"
                                            style={{
                                                width: `${(passwordStrength.score / 5) * 100}%`,
                                                backgroundColor: getStrengthColor()
                                            }}
                                        />
                                    </div>
                                    <div className="strength-label" style={{ color: getStrengthColor() }}>
                                        {getStrengthLabel()}
                                    </div>
                                    {passwordStrength.feedback.length > 0 && (
                                        <div className="strength-feedback">
                                            <p style={{ fontSize: '0.75rem', margin: '0.5rem 0 0.25rem', color: 'var(--text-muted)' }}>
                                                Password must include:
                                            </p>
                                            <ul style={{ fontSize: '0.75rem', margin: 0, paddingLeft: '1.25rem' }}>
                                                {passwordStrength.feedback.map((item, idx) => (
                                                    <li key={idx} style={{ color: 'var(--text-muted)' }}>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm New Password *</label>
                            <div className="input-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Confirm new password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                >
                                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {formData.confirmPassword && (
                                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    {formData.newPassword === formData.confirmPassword ? (
                                        <>
                                            <Check size={14} style={{ color: '#22c55e' }} />
                                            <span style={{ color: '#22c55e' }}>Passwords match</span>
                                        </>
                                    ) : (
                                        <>
                                            <X size={14} style={{ color: '#ef4444' }} />
                                            <span style={{ color: '#ef4444' }}>Passwords do not match</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: '1rem' }}>
                            {loading ? (
                                <span className="spinner" style={{ width: 20, height: 20 }}></span>
                            ) : (
                                'Change Password'
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <style>{`
                .password-strength {
                    margin-top: 0.75rem;
                }
                .strength-bar {
                    height: 4px;
                    background: var(--bg-tertiary);
                    border-radius: 2px;
                    overflow: hidden;
                    margin-bottom: 0.5rem;
                }
                .strength-fill {
                    height: 100%;
                    transition: all 0.3s ease;
                }
                .strength-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .strength-feedback ul {
                    list-style: none;
                }
                .strength-feedback li:before {
                    content: "• ";
                    margin-right: 0.25rem;
                }
            `}</style>
        </div>
    );
};

export default ChangePassword;

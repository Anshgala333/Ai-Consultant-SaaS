import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { businessAPI } from '../api';
import {
    Building2,
    Target,
    BarChart3,
    MapPin,
    ArrowRight,
    ArrowLeft,
    Check,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Onboarding.css';

const Onboarding = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        // Step 1: Business Info
        businessName: user?.businessName || '',
        sector: '',
        outletCount: 1,
        revenueRange: '',
        // Step 2: Baseline KPIs
        monthlyRevenue: '',
        cogs: '',
        staffCost: '',
        estimatedWastage: '',
        customerRating: '',
        // Step 3: Objective
        primaryObjective: '',
        // Step 4: Outlets
        outlets: [{ name: 'Main Branch', address: { city: '', state: '' } }]
    });

    const sectors = [
        { value: 'restaurant', label: 'Restaurant' },
        { value: 'retail', label: 'Retail Store' },
        { value: 'cafe', label: 'Cafe' },
        { value: 'grocery', label: 'Grocery' },
        { value: 'salon', label: 'Salon/Spa' },
        { value: 'gym', label: 'Gym/Fitness' },
        { value: 'clinic', label: 'Clinic/Healthcare' },
        { value: 'other', label: 'Other' }
    ];

    const revenueRanges = [
        { value: '0-10L', label: '₹0 - ₹10 Lakhs' },
        { value: '10-25L', label: '₹10 - ₹25 Lakhs' },
        { value: '25-50L', label: '₹25 - ₹50 Lakhs' },
        { value: '50L-1Cr', label: '₹50 Lakhs - ₹1 Crore' },
        { value: '1Cr-5Cr', label: '₹1 - ₹5 Crores' },
        { value: '5Cr+', label: '₹5 Crores+' }
    ];

    const objectives = [
        { value: 'wastage', label: 'Reduce Wastage', icon: '🗑️', desc: 'Minimize inventory loss and food waste' },
        { value: 'customer_experience', label: 'Customer Experience', icon: '⭐', desc: 'Improve ratings and satisfaction' },
        { value: 'delays', label: 'Reduce Delays', icon: '⏱️', desc: 'Speed up operations and service' },
        { value: 'stock_outs', label: 'Prevent Stock-outs', icon: '📦', desc: 'Better inventory management' },
        { value: 'revenue', label: 'Grow Revenue', icon: '📈', desc: 'Increase sales and profitability' }
    ];

    const handleNext = async () => {
        setLoading(true);
        try {
            const stepData = { step };

            if (step === 1) {
                Object.assign(stepData, {
                    businessName: formData.businessName,
                    sector: formData.sector,
                    outletCount: formData.outletCount,
                    revenueRange: formData.revenueRange
                });
            } else if (step === 2) {
                Object.assign(stepData, {
                    monthlyRevenue: Number(formData.monthlyRevenue) || 0,
                    cogs: Number(formData.cogs) || 0,
                    staffCost: Number(formData.staffCost) || 0,
                    estimatedWastage: Number(formData.estimatedWastage) || 0,
                    customerRating: Number(formData.customerRating) || 0
                });
            } else if (step === 3) {
                Object.assign(stepData, { primaryObjective: formData.primaryObjective });
            } else if (step === 4) {
                Object.assign(stepData, { outlets: formData.outlets });
            }

            await businessAPI.updateOnboarding(stepData);

            if (step < 5) {
                setStep(step + 1);
            }
        } catch (error) {
            toast.error('Failed to save. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            await businessAPI.updateOnboarding({ step: 5 });
            updateUser({ onboardingCompleted: true });
            toast.success('Onboarding complete! Welcome aboard!');
            navigate('/dashboard');
        } catch (error) {
            toast.error('Failed to complete onboarding');
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="step-content animate-fade-in">
                        <div className="step-icon"><Building2 size={32} /></div>
                        <h2>Tell us about your business</h2>
                        <p>This helps us tailor recommendations for your industry</p>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Business Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.businessName}
                                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                    placeholder="Your Business Name"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Industry Sector</label>
                                <select
                                    className="form-select"
                                    value={formData.sector}
                                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                >
                                    <option value="">Select your sector</option>
                                    {sectors.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Number of Outlets</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.outletCount}
                                    onChange={(e) => setFormData({ ...formData, outletCount: Number(e.target.value) })}
                                    min={1}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Annual Revenue Range</label>
                                <select
                                    className="form-select"
                                    value={formData.revenueRange}
                                    onChange={(e) => setFormData({ ...formData, revenueRange: e.target.value })}
                                >
                                    <option value="">Select range</option>
                                    {revenueRanges.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="step-content animate-fade-in">
                        <div className="step-icon"><BarChart3 size={32} /></div>
                        <h2>Set your baseline metrics</h2>
                        <p>These help us measure improvements over time</p>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Monthly Revenue (₹)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.monthlyRevenue}
                                    onChange={(e) => setFormData({ ...formData, monthlyRevenue: e.target.value })}
                                    placeholder="e.g., 500000"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Cost of Goods Sold (₹)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.cogs}
                                    onChange={(e) => setFormData({ ...formData, cogs: e.target.value })}
                                    placeholder="e.g., 200000"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Monthly Staff Cost (₹)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.staffCost}
                                    onChange={(e) => setFormData({ ...formData, staffCost: e.target.value })}
                                    placeholder="e.g., 100000"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Estimated Wastage (%)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.estimatedWastage}
                                    onChange={(e) => setFormData({ ...formData, estimatedWastage: e.target.value })}
                                    placeholder="e.g., 12"
                                    min={0}
                                    max={100}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label className="form-label">Average Customer Rating (1-5)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.customerRating}
                                    onChange={(e) => setFormData({ ...formData, customerRating: e.target.value })}
                                    placeholder="e.g., 4.2"
                                    min={1}
                                    max={5}
                                    step={0.1}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="step-content animate-fade-in">
                        <div className="step-icon"><Target size={32} /></div>
                        <h2>What's your primary focus?</h2>
                        <p>We'll prioritize recommendations based on your goal</p>

                        <div className="objective-grid">
                            {objectives.map(obj => (
                                <button
                                    key={obj.value}
                                    className={`objective-card ${formData.primaryObjective === obj.value ? 'selected' : ''}`}
                                    onClick={() => setFormData({ ...formData, primaryObjective: obj.value })}
                                >
                                    <span className="objective-icon">{obj.icon}</span>
                                    <span className="objective-label">{obj.label}</span>
                                    <span className="objective-desc">{obj.desc}</span>
                                    {formData.primaryObjective === obj.value && (
                                        <Check size={20} className="check-icon" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="step-content animate-fade-in">
                        <div className="step-icon"><MapPin size={32} /></div>
                        <h2>Add your outlets</h2>
                        <p>You can add more outlets later</p>

                        {formData.outlets.map((outlet, index) => (
                            <div key={index} className="outlet-card">
                                <div className="form-group">
                                    <label className="form-label">Outlet Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={outlet.name}
                                        onChange={(e) => {
                                            const newOutlets = [...formData.outlets];
                                            newOutlets[index].name = e.target.value;
                                            setFormData({ ...formData, outlets: newOutlets });
                                        }}
                                        placeholder="e.g., Main Branch"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">City</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={outlet.address.city}
                                            onChange={(e) => {
                                                const newOutlets = [...formData.outlets];
                                                newOutlets[index].address.city = e.target.value;
                                                setFormData({ ...formData, outlets: newOutlets });
                                            }}
                                            placeholder="City"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">State</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={outlet.address.state}
                                            onChange={(e) => {
                                                const newOutlets = [...formData.outlets];
                                                newOutlets[index].address.state = e.target.value;
                                                setFormData({ ...formData, outlets: newOutlets });
                                            }}
                                            placeholder="State"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setFormData({
                                ...formData,
                                outlets: [...formData.outlets, { name: '', address: { city: '', state: '' } }]
                            })}
                        >
                            + Add Another Outlet
                        </button>
                    </div>
                );

            case 5:
                return (
                    <div className="step-content animate-fade-in final-step">
                        <div className="success-icon">🎉</div>
                        <h2>You're all set!</h2>
                        <p>Your business health card is ready. Let's start improving your operations!</p>

                        <div className="summary-card">
                            <h4>{formData.businessName}</h4>
                            <p className="summary-sector">{sectors.find(s => s.value === formData.sector)?.label || formData.sector}</p>
                            <div className="summary-stats">
                                <div className="summary-stat">
                                    <span className="stat-value">{formData.outletCount}</span>
                                    <span className="stat-label">Outlets</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-value">{formData.estimatedWastage || '0'}%</span>
                                    <span className="stat-label">Wastage</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-value">{objectives.find(o => o.value === formData.primaryObjective)?.icon || '🎯'}</span>
                                    <span className="stat-label">Focus</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="onboarding-page">
            <div className="onboarding-container">
                {/* Progress Bar */}
                <div className="progress-wrapper">
                    <div className="progress-steps">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <div key={s} className={`progress-step ${s <= step ? 'active' : ''} ${s < step ? 'completed' : ''}`}>
                                {s < step ? <Check size={14} /> : s}
                            </div>
                        ))}
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${((step - 1) / 4) * 100}%` }}></div>
                    </div>
                </div>

                {/* Step Content */}
                <div className="onboarding-card">
                    {renderStep()}

                    {/* Navigation */}
                    <div className="step-nav">
                        {step > 1 && step < 5 && (
                            <button className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={loading}>
                                <ArrowLeft size={18} />
                                Back
                            </button>
                        )}

                        {step < 5 ? (
                            <button className="btn btn-primary" onClick={handleNext} disabled={loading}>
                                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                                    <>
                                        Next
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        ) : (
                            <button className="btn btn-primary btn-lg" onClick={handleComplete} disabled={loading}>
                                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                                    <>
                                        Go to Dashboard
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;

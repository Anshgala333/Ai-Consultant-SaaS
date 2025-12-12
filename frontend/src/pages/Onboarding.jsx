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
    Loader2,
    Plus,
    Trash2,
    TrendingDown,
    TrendingUp
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
        // Step 2: Target Goals
        targetWastage: '',
        targetRating: '',
        targetTimeline: 3,
        // Step 2: Custom KPIs
        customKpis: [],
        // Step 3: Objective
        primaryObjective: '',
        // Step 4: Outlets
        outlets: [{ name: 'Main Branch', address: { city: '', state: '' } }]
    });

    // Sector-specific KPI configuration
    const sectorConfig = {
        restaurant: {
            label: 'Restaurant',
            icon: '🍽️',
            kpis: [
                { key: 'monthlyRevenue', label: 'Monthly Revenue (₹)', type: 'currency', placeholder: '500000' },
                { key: 'cogs', label: 'Food Cost (₹)', type: 'currency', placeholder: '150000' },
                { key: 'staffCost', label: 'Staff Cost (₹)', type: 'currency', placeholder: '100000' },
                { key: 'estimatedWastage', label: 'Food Wastage (%)', type: 'percentage', placeholder: '12', benchmark: 8 },
                { key: 'customerRating', label: 'Customer Rating', type: 'rating', placeholder: '4.2', benchmark: 4.2 }
            ]
        },
        retail: {
            label: 'Retail Store',
            icon: '🛍️',
            kpis: [
                { key: 'monthlyRevenue', label: 'Monthly Revenue (₹)', type: 'currency', placeholder: '800000' },
                { key: 'cogs', label: 'Purchase Cost (₹)', type: 'currency', placeholder: '400000' },
                { key: 'staffCost', label: 'Staff Cost (₹)', type: 'currency', placeholder: '80000' },
                { key: 'estimatedWastage', label: 'Shrinkage/Loss (%)', type: 'percentage', placeholder: '5', benchmark: 5 },
                { key: 'customerRating', label: 'Customer Rating', type: 'rating', placeholder: '4.0', benchmark: 4.0 }
            ]
        },
        cafe: {
            label: 'Café / Coffee Shop',
            icon: '☕',
            kpis: [
                { key: 'monthlyRevenue', label: 'Monthly Revenue (₹)', type: 'currency', placeholder: '300000' },
                { key: 'cogs', label: 'Beverage/Food Cost (₹)', type: 'currency', placeholder: '100000' },
                { key: 'staffCost', label: 'Staff Cost (₹)', type: 'currency', placeholder: '60000' },
                { key: 'estimatedWastage', label: 'Wastage (%)', type: 'percentage', placeholder: '10', benchmark: 10 },
                { key: 'customerRating', label: 'Customer Rating', type: 'rating', placeholder: '4.3', benchmark: 4.3 }
            ]
        },
        grocery: {
            label: 'Grocery / Supermarket',
            icon: '🛒',
            kpis: [
                { key: 'monthlyRevenue', label: 'Monthly Revenue (₹)', type: 'currency', placeholder: '1500000' },
                { key: 'cogs', label: 'Purchase Cost (₹)', type: 'currency', placeholder: '1100000' },
                { key: 'staffCost', label: 'Staff Cost (₹)', type: 'currency', placeholder: '120000' },
                { key: 'estimatedWastage', label: 'Spoilage/Expiry (%)', type: 'percentage', placeholder: '6', benchmark: 6 },
                { key: 'customerRating', label: 'Customer Rating', type: 'rating', placeholder: '3.8', benchmark: 3.8 }
            ]
        },
        salon: {
            label: 'Salon / Spa',
            icon: '💇',
            kpis: [
                { key: 'monthlyRevenue', label: 'Monthly Revenue (₹)', type: 'currency', placeholder: '400000' },
                { key: 'staffCost', label: 'Staff/Therapist Cost (₹)', type: 'currency', placeholder: '180000' },
                { key: 'cogs', label: 'Products/Supplies Cost (₹)', type: 'currency', placeholder: '60000' },
                { key: 'estimatedWastage', label: 'Product Wastage (%)', type: 'percentage', placeholder: '3', benchmark: 3 },
                { key: 'customerRating', label: 'Service Rating', type: 'rating', placeholder: '4.5', benchmark: 4.5 }
            ]
        },
        gym: {
            label: 'Gym / Fitness Center',
            icon: '🏋️',
            kpis: [
                { key: 'monthlyRevenue', label: 'Monthly Revenue (₹)', type: 'currency', placeholder: '600000' },
                { key: 'staffCost', label: 'Trainer/Staff Cost (₹)', type: 'currency', placeholder: '200000' },
                { key: 'cogs', label: 'Equipment/Maintenance (₹)', type: 'currency', placeholder: '50000' },
                { key: 'estimatedWastage', label: 'Member Churn Rate (%)', type: 'percentage', placeholder: '8', benchmark: 8 },
                { key: 'customerRating', label: 'Member Rating', type: 'rating', placeholder: '4.1', benchmark: 4.1 }
            ]
        },
        clinic: {
            label: 'Clinic / Healthcare',
            icon: '🏥',
            kpis: [
                { key: 'monthlyRevenue', label: 'Monthly Revenue (₹)', type: 'currency', placeholder: '800000' },
                { key: 'staffCost', label: 'Staff/Doctor Cost (₹)', type: 'currency', placeholder: '300000' },
                { key: 'cogs', label: 'Medical Supplies (₹)', type: 'currency', placeholder: '150000' },
                { key: 'estimatedWastage', label: 'No-Show Rate (%)', type: 'percentage', placeholder: '10', benchmark: 10 },
                { key: 'customerRating', label: 'Patient Satisfaction', type: 'rating', placeholder: '4.4', benchmark: 4.4 }
            ]
        },
        cloud_kitchen: {
            label: 'Cloud Kitchen / Delivery',
            icon: '🍕',
            kpis: [
                { key: 'monthlyRevenue', label: 'Monthly Revenue (₹)', type: 'currency', placeholder: '400000' },
                { key: 'cogs', label: 'Food Cost (₹)', type: 'currency', placeholder: '140000' },
                { key: 'staffCost', label: 'Staff Cost (₹)', type: 'currency', placeholder: '80000' },
                { key: 'estimatedWastage', label: 'Food Wastage (%)', type: 'percentage', placeholder: '8', benchmark: 8 },
                { key: 'customerRating', label: 'Order Rating', type: 'rating', placeholder: '4.0', benchmark: 4.0 }
            ]
        }
    };

    const sectors = Object.entries(sectorConfig).map(([value, config]) => ({
        value,
        label: config.label,
        icon: config.icon
    }));

    const currentSector = sectorConfig[formData.sector] || sectorConfig.restaurant;
    const currentBenchmark = {
        estimatedWastage: currentSector.kpis.find(k => k.key === 'estimatedWastage')?.benchmark || 5,
        customerRating: currentSector.kpis.find(k => k.key === 'customerRating')?.benchmark || 4.0
    };

    const revenueRanges = [
        { value: '0-10L', label: '₹0 - ₹10 Lakhs' },
        { value: '10-25L', label: '₹10 - ₹25 Lakhs' },
        { value: '25-50L', label: '₹25 - ₹50 Lakhs' },
        { value: '50L-1Cr', label: '₹50 Lakhs - ₹1 Crore' },
        { value: '1Cr-5Cr', label: '₹1 - ₹5 Crores' },
        { value: '5Cr+', label: '₹5 Crores+' }
    ];

    // Indian States and Cities
    const indianStates = {
        'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane', 'Navi Mumbai'],
        'Karnataka': ['Bengaluru', 'Mysuru', 'Hubli', 'Mangalore', 'Belgaum', 'Dharwad'],
        'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur'],
        'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
        'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar'],
        'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Noida', 'Ghaziabad', 'Meerut'],
        'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner'],
        'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Asansol'],
        'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'],
        'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'],
        'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati'],
        'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Chandigarh'],
        'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar', 'Karnal'],
        'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'],
        'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga'],
        'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur'],
        'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon'],
        'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
        'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg'],
        'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda']
    };

    // Sector-specific objectives
    const sectorObjectives = {
        restaurant: [
            { value: 'wastage', label: 'Reduce Food Wastage', icon: '🗑️', desc: 'Minimize inventory loss and food waste' },
            { value: 'customer_experience', label: 'Customer Experience', icon: '⭐', desc: 'Improve ratings and satisfaction' },
            { value: 'delays', label: 'Reduce Wait Times', icon: '⏱️', desc: 'Speed up kitchen and service' },
            { value: 'stock_outs', label: 'Prevent Stock-outs', icon: '📦', desc: 'Better ingredient management' },
            { value: 'revenue', label: 'Grow Revenue', icon: '📈', desc: 'Increase sales and profitability' }
        ],
        retail: [
            { value: 'shrinkage', label: 'Reduce Shrinkage', icon: '📉', desc: 'Minimize theft and inventory loss' },
            { value: 'customer_experience', label: 'Customer Experience', icon: '⭐', desc: 'Improve store experience' },
            { value: 'stock_outs', label: 'Prevent Stock-outs', icon: '📦', desc: 'Optimize inventory levels' },
            { value: 'revenue', label: 'Grow Revenue', icon: '📈', desc: 'Increase sales per customer' }
        ],
        cafe: [
            { value: 'wastage', label: 'Reduce Wastage', icon: '🗑️', desc: 'Minimize beverage and food waste' },
            { value: 'customer_experience', label: 'Customer Experience', icon: '⭐', desc: 'Improve ambiance and service' },
            { value: 'delays', label: 'Reduce Wait Times', icon: '⏱️', desc: 'Faster order preparation' },
            { value: 'revenue', label: 'Grow Revenue', icon: '📈', desc: 'Increase average order value' }
        ],
        grocery: [
            { value: 'wastage', label: 'Reduce Spoilage', icon: '🗑️', desc: 'Minimize expired goods' },
            { value: 'stock_outs', label: 'Prevent Stock-outs', icon: '📦', desc: 'Better demand forecasting' },
            { value: 'customer_experience', label: 'Customer Experience', icon: '⭐', desc: 'Improve checkout experience' },
            { value: 'revenue', label: 'Grow Revenue', icon: '📈', desc: 'Increase basket size' }
        ],
        salon: [
            { value: 'customer_experience', label: 'Client Satisfaction', icon: '⭐', desc: 'Improve service quality' },
            { value: 'retention', label: 'Client Retention', icon: '🔄', desc: 'Increase repeat bookings' },
            { value: 'delays', label: 'Reduce Wait Times', icon: '⏱️', desc: 'Better appointment management' },
            { value: 'revenue', label: 'Grow Revenue', icon: '📈', desc: 'Increase service sales' }
        ],
        gym: [
            { value: 'retention', label: 'Member Retention', icon: '🔄', desc: 'Reduce membership churn' },
            { value: 'customer_experience', label: 'Member Experience', icon: '⭐', desc: 'Improve facilities and services' },
            { value: 'engagement', label: 'Member Engagement', icon: '💪', desc: 'Increase attendance and participation' },
            { value: 'revenue', label: 'Grow Revenue', icon: '📈', desc: 'Increase memberships and add-ons' }
        ],
        clinic: [
            { value: 'no_shows', label: 'Reduce No-Shows', icon: '📅', desc: 'Decrease appointment cancellations' },
            { value: 'customer_experience', label: 'Patient Satisfaction', icon: '⭐', desc: 'Improve care experience' },
            { value: 'delays', label: 'Reduce Wait Times', icon: '⏱️', desc: 'Better scheduling efficiency' },
            { value: 'revenue', label: 'Grow Revenue', icon: '📈', desc: 'Increase patient volume' }
        ],
        cloud_kitchen: [
            { value: 'wastage', label: 'Reduce Food Wastage', icon: '🗑️', desc: 'Optimize food preparation' },
            { value: 'delays', label: 'Faster Delivery', icon: '⏱️', desc: 'Reduce order preparation time' },
            { value: 'customer_experience', label: 'Order Ratings', icon: '⭐', desc: 'Improve food quality and packaging' },
            { value: 'revenue', label: 'Grow Revenue', icon: '📈', desc: 'Increase order volume' }
        ]
    };

    const currentObjectives = sectorObjectives[formData.sector] || sectorObjectives.restaurant;

    const handleNext = async () => {
        setLoading(true);
        try {
            const stepData = { step };

            if (step === 1) {
                // Validate Step 1
                if (!formData.sector) {
                    toast.error('Please select your business type');
                    setLoading(false);
                    return;
                }
                if (!formData.revenueRange) {
                    toast.error('Please select your annual revenue range');
                    setLoading(false);
                    return;
                }
                Object.assign(stepData, {
                    businessName: formData.businessName,
                    sector: formData.sector,
                    outletCount: formData.outletCount,
                    revenueRange: formData.revenueRange
                });
            } else if (step === 2) {
                // Validate custom KPIs before sending
                const filledCustomKpis = formData.customKpis.filter(
                    kpi => kpi.name.trim() && kpi.description.trim()
                );

                Object.assign(stepData, {
                    monthlyRevenue: Number(formData.monthlyRevenue) || 0,
                    cogs: Number(formData.cogs) || 0,
                    staffCost: Number(formData.staffCost) || 0,
                    estimatedWastage: Number(formData.estimatedWastage) || 0,
                    customerRating: Number(formData.customerRating) || 0,
                    customKpis: filledCustomKpis,
                    targetMetrics: {
                        estimatedWastage: Number(formData.targetWastage) || Number(formData.estimatedWastage) || 0,
                        customerRating: Number(formData.targetRating) || Number(formData.customerRating) || 0,
                        targetTimeline: Number(formData.targetTimeline) || 3
                    }
                });
            } else if (step === 3) {
                // Validate primary objective
                if (!formData.primaryObjective) {
                    toast.error('Please select a primary objective');
                    setLoading(false);
                    return;
                }
                Object.assign(stepData, { primaryObjective: formData.primaryObjective });
            } else if (step === 4) {
                // Validate outlets - at least one complete outlet
                const validOutlets = formData.outlets.filter(
                    o => o.name?.trim() && o.address?.city?.trim()
                );
                if (validOutlets.length === 0) {
                    toast.error('Please add at least one outlet with name and city');
                    setLoading(false);
                    return;
                }
                Object.assign(stepData, { outlets: validOutlets });
            }

            await businessAPI.updateOnboarding(stepData);

            if (step < 5) {
                setStep(step + 1);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Custom KPI handlers
    const handleAddCustomKpi = () => {
        if (formData.customKpis.length >= 10) {
            toast.error('Maximum 10 custom KPIs allowed');
            return;
        }
        setFormData({
            ...formData,
            customKpis: [...formData.customKpis, { name: '', description: '' }]
        });
    };

    const handleUpdateCustomKpi = (index, field, value) => {
        const updatedKpis = [...formData.customKpis];
        updatedKpis[index][field] = value;
        setFormData({ ...formData, customKpis: updatedKpis });
    };

    const handleRemoveCustomKpi = (index) => {
        const updatedKpis = formData.customKpis.filter((_, i) => i !== index);
        setFormData({ ...formData, customKpis: updatedKpis });
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

                        <div className="form-group full-width">
                            <label className="form-label">Business Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.businessName}
                                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                placeholder="Your Business Name"
                            />
                        </div>

                        {/* Sector Cards */}
                        <div className="form-group full-width">
                            <label className="form-label">
                                Select Your Industry <span className="required">*</span>
                            </label>
                            <div className="sector-cards">
                                {sectors.map(s => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        className={`sector-card ${formData.sector === s.value ? 'selected' : ''}`}
                                        onClick={() => setFormData({ ...formData, sector: s.value })}
                                    >
                                        <span className="sector-card-icon">{s.icon}</span>
                                        <span className="sector-card-label">{s.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-grid">
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
                                <label className="form-label">
                                    Annual Revenue Range <span className="required">*</span>
                                </label>
                                <select
                                    className={`form-select ${!formData.revenueRange ? 'placeholder' : ''}`}
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

                        {/* Sector Context */}
                        {formData.sector && (
                            <div className="sector-context">
                                <span className="sector-icon">{currentSector.icon}</span>
                                <span className="sector-name">{currentSector.label}</span>
                                <span className="sector-hint">Metrics customized for your industry</span>
                            </div>
                        )}

                        <p>These help us measure improvements over time</p>

                        {/* Dynamic KPI Fields based on sector */}
                        <div className="form-grid">
                            {currentSector.kpis.map(kpi => (
                                <div key={kpi.key} className={`form-group ${kpi.type === 'rating' ? 'full-width' : ''}`}>
                                    <label className="form-label">
                                        {kpi.label}
                                        {kpi.benchmark && (
                                            <span className="benchmark-hint">
                                                Industry avg: {kpi.benchmark}{kpi.type === 'percentage' ? '%' : kpi.type === 'rating' ? '⭐' : ''}
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData[kpi.key] || ''}
                                        onChange={(e) => setFormData({ ...formData, [kpi.key]: e.target.value })}
                                        placeholder={`e.g., ${kpi.placeholder}`}
                                        min={kpi.type === 'rating' ? 1 : 0}
                                        max={kpi.type === 'percentage' ? 100 : kpi.type === 'rating' ? 5 : undefined}
                                        step={kpi.type === 'rating' ? 0.1 : 1}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Industry Benchmark Comparison */}
                        {formData.sector && (formData.estimatedWastage || formData.customerRating) && (
                            <div className="benchmark-section">
                                <h4 className="section-title">📊 Industry Benchmark Comparison</h4>
                                <div className="benchmark-grid">
                                    {formData.estimatedWastage && (
                                        <div className={`benchmark-card ${Number(formData.estimatedWastage) <= currentBenchmark.estimatedWastage ? 'status-good' : Number(formData.estimatedWastage) <= currentBenchmark.estimatedWastage * 1.2 ? 'status-warning' : 'status-error'}`}>
                                            <div className="benchmark-header">
                                                {Number(formData.estimatedWastage) <= currentBenchmark.estimatedWastage ?
                                                    <TrendingDown size={18} /> : <TrendingUp size={18} />}
                                                <span>{currentSector.kpis.find(k => k.key === 'estimatedWastage')?.label.replace('(%)', '').trim() || 'Metric'}</span>
                                            </div>
                                            <div className="benchmark-values">
                                                <div className="benchmark-value">
                                                    <span className="value">{formData.estimatedWastage}%</span>
                                                    <span className="label">Your Current</span>
                                                </div>
                                                <div className="benchmark-value">
                                                    <span className="value">{currentBenchmark.estimatedWastage}%</span>
                                                    <span className="label">Industry Avg</span>
                                                </div>
                                            </div>
                                            <div className="benchmark-status">
                                                {Number(formData.estimatedWastage) <= currentBenchmark.estimatedWastage ?
                                                    '✅ Below average - Great!' :
                                                    `⚠️ ${(Number(formData.estimatedWastage) - currentBenchmark.estimatedWastage).toFixed(1)}% above industry average`}
                                            </div>
                                        </div>
                                    )}
                                    {formData.customerRating && (
                                        <div className={`benchmark-card ${Number(formData.customerRating) >= currentBenchmark.customerRating ? 'status-good' : Number(formData.customerRating) >= currentBenchmark.customerRating * 0.9 ? 'status-warning' : 'status-error'}`}>
                                            <div className="benchmark-header">
                                                {Number(formData.customerRating) >= currentBenchmark.customerRating ?
                                                    <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                                <span>Rating</span>
                                            </div>
                                            <div className="benchmark-values">
                                                <div className="benchmark-value">
                                                    <span className="value">{formData.customerRating}⭐</span>
                                                    <span className="label">Your Current</span>
                                                </div>
                                                <div className="benchmark-value">
                                                    <span className="value">{currentBenchmark.customerRating}⭐</span>
                                                    <span className="label">Industry Avg</span>
                                                </div>
                                            </div>
                                            <div className="benchmark-status">
                                                {Number(formData.customerRating) >= currentBenchmark.customerRating ?
                                                    '✅ Above average - Great!' :
                                                    `⚠️ ${(currentBenchmark.customerRating - Number(formData.customerRating)).toFixed(1)} below industry average`}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Target Goals Section */}
                        <div className="goals-section">
                            <h4 className="section-title">🎯 Set Your Improvement Goals</h4>
                            <p className="section-desc">Define targets to track your progress</p>

                            <div className="goals-grid">
                                <div className="goal-card">
                                    <label className="form-label">Target Wastage (%)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.targetWastage}
                                        onChange={(e) => setFormData({ ...formData, targetWastage: e.target.value })}
                                        placeholder={`Industry avg: ${currentBenchmark.estimatedWastage}%`}
                                        min={0}
                                        max={100}
                                    />
                                    {formData.estimatedWastage && formData.targetWastage && (
                                        <span className="goal-diff">
                                            {Number(formData.estimatedWastage) - Number(formData.targetWastage) > 0
                                                ? `↓ ${(Number(formData.estimatedWastage) - Number(formData.targetWastage)).toFixed(1)}% reduction`
                                                : ''}
                                        </span>
                                    )}
                                </div>
                                <div className="goal-card">
                                    <label className="form-label">Target Rating (1-5)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.targetRating}
                                        onChange={(e) => setFormData({ ...formData, targetRating: e.target.value })}
                                        placeholder={`Industry avg: ${currentBenchmark.customerRating}`}
                                        min={1}
                                        max={5}
                                        step={0.1}
                                    />
                                    {formData.customerRating && formData.targetRating && (
                                        <span className="goal-diff">
                                            {Number(formData.targetRating) - Number(formData.customerRating) > 0
                                                ? `↑ +${(Number(formData.targetRating) - Number(formData.customerRating)).toFixed(1)} improvement`
                                                : ''}
                                        </span>
                                    )}
                                </div>
                                <div className="goal-card">
                                    <label className="form-label">Timeline (months)</label>
                                    <select
                                        className="form-select"
                                        value={formData.targetTimeline}
                                        onChange={(e) => setFormData({ ...formData, targetTimeline: e.target.value })}
                                    >
                                        <option value={1}>1 month</option>
                                        <option value={2}>2 months</option>
                                        <option value={3}>3 months</option>
                                        <option value={6}>6 months</option>
                                        <option value={12}>12 months</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Custom KPIs Section */}
                        <div className="custom-kpi-section">
                            <h3 className="section-title">Custom KPIs (Optional)</h3>
                            <p className="section-desc">Add any additional metrics unique to your business</p>

                            {formData.customKpis.map((kpi, index) => (
                                <div key={index} className="custom-kpi-card">
                                    <div className="custom-kpi-header">
                                        <input
                                            type="text"
                                            className="form-input kpi-name-input"
                                            value={kpi.name}
                                            onChange={(e) => handleUpdateCustomKpi(index, 'name', e.target.value)}
                                            placeholder="e.g., Daily Footfall, Table Turnover Rate"
                                            maxLength={100}
                                        />
                                        <button
                                            type="button"
                                            className="remove-kpi-btn"
                                            onClick={() => handleRemoveCustomKpi(index)}
                                            title="Remove KPI"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Description</label>
                                        <textarea
                                            className="form-input kpi-desc-textarea"
                                            value={kpi.description}
                                            onChange={(e) => handleUpdateCustomKpi(index, 'description', e.target.value)}
                                            placeholder="Explain what this metric means for your business"
                                            rows={3}
                                            maxLength={500}
                                        />
                                        <span className="char-count">{kpi.description.length}/500</span>
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                className="btn btn-ghost add-kpi-btn"
                                onClick={handleAddCustomKpi}
                                disabled={formData.customKpis.length >= 10}
                            >
                                <Plus size={18} />
                                Add Custom KPI {formData.customKpis.length > 0 && `(${formData.customKpis.length}/10)`}
                            </button>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="step-content animate-fade-in">
                        <div className="step-icon"><Target size={32} /></div>
                        <h2>What's your primary focus?</h2>

                        {/* Sector Context */}
                        {formData.sector && (
                            <div className="sector-context">
                                <span className="sector-icon">{currentSector.icon}</span>
                                <span className="sector-name">{currentSector.label}</span>
                                <span className="sector-hint">Goals tailored for your industry</span>
                            </div>
                        )}

                        <p>We'll prioritize recommendations based on your goal <span className="required">*</span></p>

                        <div className="objective-grid">
                            {currentObjectives.map(obj => (
                                <button
                                    key={obj.value}
                                    type="button"
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
                        <p>At least one outlet with name and city is required <span className="required">*</span></p>

                        {formData.outlets.map((outlet, index) => {
                            // Defensive null checks for outlet.address
                            const outletAddress = outlet.address || { city: '', state: '' };

                            return (
                                <div key={index} className="outlet-card">
                                    <div className="outlet-card-header">
                                        <span className="outlet-number">Outlet {index + 1}</span>
                                        {formData.outlets.length > 1 && (
                                            <button
                                                type="button"
                                                className="btn-delete"
                                                onClick={() => {
                                                    const newOutlets = formData.outlets.filter((_, i) => i !== index);
                                                    setFormData({ ...formData, outlets: newOutlets });
                                                }}
                                                title="Remove outlet"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            Outlet Name <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={outlet.name || ''}
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
                                            <label className="form-label">
                                                State <span className="required">*</span>
                                            </label>
                                            <select
                                                className={`form-select ${!outletAddress.state ? 'placeholder' : ''}`}
                                                value={outletAddress.state || ''}
                                                onChange={(e) => {
                                                    const newOutlets = [...formData.outlets];
                                                    if (!newOutlets[index].address) {
                                                        newOutlets[index].address = { city: '', state: '' };
                                                    }
                                                    newOutlets[index].address.state = e.target.value;
                                                    newOutlets[index].address.city = ''; // Reset city on state change
                                                    setFormData({ ...formData, outlets: newOutlets });
                                                }}
                                            >
                                                <option value="">Select State</option>
                                                {Object.keys(indianStates).sort().map(state => (
                                                    <option key={state} value={state}>{state}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">
                                                City <span className="required">*</span>
                                            </label>
                                            <select
                                                className={`form-select ${!outletAddress.city ? 'placeholder' : ''}`}
                                                value={outletAddress.city || ''}
                                                onChange={(e) => {
                                                    const newOutlets = [...formData.outlets];
                                                    if (!newOutlets[index].address) {
                                                        newOutlets[index].address = { city: '', state: '' };
                                                    }
                                                    newOutlets[index].address.city = e.target.value;
                                                    setFormData({ ...formData, outlets: newOutlets });
                                                }}
                                                disabled={!outletAddress.state}
                                            >
                                                <option value="">
                                                    {outletAddress.state ? 'Select City' : 'Select state first'}
                                                </option>
                                                {outletAddress.state && indianStates[outletAddress.state]?.map(city => (
                                                    <option key={city} value={city}>{city}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        <button
                            type="button"
                            className="btn btn-ghost add-outlet-btn"
                            onClick={() => setFormData({
                                ...formData,
                                outlets: [...formData.outlets, { name: '', address: { city: '', state: '' } }]
                            })}
                        >
                            <Plus size={18} />
                            Add Another Outlet
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
                            {/* Business Header */}
                            <div className="summary-header">
                                <span className="summary-sector-icon">{currentSector.icon}</span>
                                <div>
                                    <h4>{formData.businessName || 'Your Business'}</h4>
                                    <p className="summary-sector">{currentSector.label}</p>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="summary-stats">
                                <div className="summary-stat">
                                    <span className="stat-value">{formData.outlets.length}</span>
                                    <span className="stat-label">Outlets</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-value">{formData.revenueRange || '-'}</span>
                                    <span className="stat-label">Revenue</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-value">{currentObjectives.find(o => o.value === formData.primaryObjective)?.icon || '🎯'}</span>
                                    <span className="stat-label">{currentObjectives.find(o => o.value === formData.primaryObjective)?.label || 'Focus'}</span>
                                </div>
                            </div>

                            {/* Baseline Metrics */}
                            <div className="summary-section">
                                <h5 className="summary-section-title">📊 Baseline Metrics</h5>
                                <div className="summary-metrics">
                                    {formData.monthlyRevenue && (
                                        <div className="summary-metric">
                                            <span className="metric-label">Monthly Revenue</span>
                                            <span className="metric-value">₹{Number(formData.monthlyRevenue).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {formData.cogs && (
                                        <div className="summary-metric">
                                            <span className="metric-label">Cost of Goods</span>
                                            <span className="metric-value">₹{Number(formData.cogs).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {formData.staffCost && (
                                        <div className="summary-metric">
                                            <span className="metric-label">Staff Cost</span>
                                            <span className="metric-value">₹{Number(formData.staffCost).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {formData.estimatedWastage && (
                                        <div className="summary-metric">
                                            <span className="metric-label">{currentSector.kpis.find(k => k.key === 'estimatedWastage')?.label.replace('(%)', '').trim() || 'Wastage'}</span>
                                            <span className="metric-value">{formData.estimatedWastage}%</span>
                                        </div>
                                    )}
                                    {formData.customerRating && (
                                        <div className="summary-metric">
                                            <span className="metric-label">Rating</span>
                                            <span className="metric-value">⭐ {formData.customerRating}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Target Goals */}
                            {(formData.targetWastage || formData.targetRating) && (
                                <div className="summary-section">
                                    <h5 className="summary-section-title">🎯 Improvement Goals</h5>
                                    <div className="summary-metrics">
                                        {formData.targetWastage && (
                                            <div className="summary-metric">
                                                <span className="metric-label">Target Wastage</span>
                                                <span className="metric-value success">{formData.targetWastage}%</span>
                                            </div>
                                        )}
                                        {formData.targetRating && (
                                            <div className="summary-metric">
                                                <span className="metric-label">Target Rating</span>
                                                <span className="metric-value success">⭐ {formData.targetRating}</span>
                                            </div>
                                        )}
                                        <div className="summary-metric">
                                            <span className="metric-label">Timeline</span>
                                            <span className="metric-value">{formData.targetTimeline} months</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Custom KPIs */}
                            {formData.customKpis.filter(k => k.name).length > 0 && (
                                <div className="summary-section">
                                    <h5 className="summary-section-title">📋 Custom KPIs</h5>
                                    <div className="summary-kpis">
                                        {formData.customKpis.filter(k => k.name).map((kpi, i) => (
                                            <span key={i} className="summary-kpi-tag">{kpi.name}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Outlets List */}
                            <div className="summary-section">
                                <h5 className="summary-section-title">📍 Outlets</h5>
                                <div className="summary-outlets">
                                    {formData.outlets.filter(o => o.name).map((outlet, i) => (
                                        <div key={i} className="summary-outlet">
                                            <span className="outlet-name">{outlet.name}</span>
                                            {outlet.address?.city && (
                                                <span className="outlet-location">{outlet.address.city}, {outlet.address.state}</span>
                                            )}
                                        </div>
                                    ))}
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

import { Link } from 'react-router-dom';
import {
    BarChart3,
    Zap,
    TrendingUp,
    Users,
    ArrowRight,
    CheckCircle,
    Brain,
    Target
} from 'lucide-react';
import './Landing.css';

const Landing = () => {
    const features = [
        {
            icon: BarChart3,
            title: 'KPI Extraction',
            description: 'Automatically extract and compute key performance indicators from your business data'
        },
        {
            icon: Zap,
            title: 'Issue Detection',
            description: 'AI-powered detection of operational issues before they become major problems'
        },
        {
            icon: Brain,
            title: 'AI Recommendations',
            description: 'Get tailored recommendations powered by Google Gemini AI'
        },
        {
            icon: Target,
            title: 'Experiment Tracking',
            description: 'Track improvements with before/after comparisons and measurable results'
        },
        {
            icon: TrendingUp,
            title: 'Impact Reports',
            description: 'Generate investor-grade reports showcasing your operational improvements'
        },
        {
            icon: Users,
            title: 'Customer & Staff Insights',
            description: 'Collect and analyze feedback from customers and staff in real-time'
        }
    ];

    const benefits = [
        'Reduce operational wastage by up to 25%',
        'Improve customer satisfaction scores',
        'Make data-driven decisions',
        'Generate measurable ROI reports',
        'Track experiments and improvements'
    ];

    return (
        <div className="landing">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="nav-container">
                    <div className="nav-logo">
                        <div className="logo-icon">AI</div>
                        <span>Consultant</span>
                    </div>
                    <div className="nav-links">
                        <Link to="/login" className="nav-link">Login</Link>
                        <Link to="/register" className="btn btn-primary">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-container">
                    <div className="hero-badge">
                        <Zap size={14} />
                        AI-Powered SME Platform
                    </div>
                    <h1 className="hero-title">
                        Transform Your Business Operations with
                        <span className="gradient-text"> AI Intelligence</span>
                    </h1>
                    <p className="hero-subtitle">
                        Improve operational efficiency, reduce wastage, and boost customer satisfaction
                        with our AI-powered analytics and recommendation engine.
                    </p>
                    <div className="hero-cta">
                        <Link to="/register" className="btn btn-primary btn-lg">
                            Start Free Trial
                            <ArrowRight size={20} />
                        </Link>
                        <Link to="/login" className="btn btn-secondary btn-lg">
                            Login to Dashboard
                        </Link>
                    </div>
                    <div className="hero-stats">
                        <div className="stat">
                            <span className="stat-value">25%</span>
                            <span className="stat-label">Avg. Wastage Reduction</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">15%</span>
                            <span className="stat-label">Revenue Improvement</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">4.5★</span>
                            <span className="stat-label">Customer Rating</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features">
                <div className="features-container">
                    <h2 className="section-title">Everything you need to optimize operations</h2>
                    <p className="section-subtitle">
                        A complete platform for SMEs to track, analyze, and improve business performance
                    </p>
                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div key={index} className="feature-card">
                                <div className="feature-icon">
                                    <feature.icon size={24} />
                                </div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="benefits">
                <div className="benefits-container">
                    <div className="benefits-content">
                        <h2>Why SMEs choose AI Consultant</h2>
                        <p>Join hundreds of businesses already improving their operations</p>
                        <ul className="benefits-list">
                            {benefits.map((benefit, index) => (
                                <li key={index}>
                                    <CheckCircle size={20} className="check-icon" />
                                    {benefit}
                                </li>
                            ))}
                        </ul>
                        <Link to="/register" className="btn btn-primary">
                            Get Started Now
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                    <div className="benefits-visual">
                        <div className="dashboard-preview">
                            <div className="preview-header">
                                <div className="preview-dots">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                            <div className="preview-content">
                                <div className="preview-kpi">
                                    <span className="preview-label">Wastage Reduced</span>
                                    <span className="preview-value">-23%</span>
                                </div>
                                <div className="preview-kpi">
                                    <span className="preview-label">Revenue Growth</span>
                                    <span className="preview-value">+12%</span>
                                </div>
                                <div className="preview-bar"></div>
                                <div className="preview-bar short"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta">
                <div className="cta-container">
                    <h2>Ready to transform your business?</h2>
                    <p>Join the pilot program and start seeing results in weeks</p>
                    <Link to="/register" className="btn btn-primary btn-lg">
                        Start Your Free Trial
                        <ArrowRight size={20} />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-container">
                    <div className="footer-logo">
                        <div className="logo-icon">AI</div>
                        <span>Consultant</span>
                    </div>
                    <p>© 2024 AI Consultant. SME Operational Efficiency Platform.</p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;

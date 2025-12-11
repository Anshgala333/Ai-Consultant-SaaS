import { useState, useEffect } from 'react';
import { recommendationsAPI } from '../api';
import { Lightbulb, Sparkles, ArrowRight, Check, X, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Recommendations = () => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchRecommendations();
    }, []);

    const fetchRecommendations = async () => {
        try {
            const response = await recommendationsAPI.getLatest();
            setRecommendations(response.data.recommendations || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateNew = async () => {
        setGenerating(true);
        try {
            const response = await recommendationsAPI.generate();
            setRecommendations(response.data.recommendations || []);
            toast.success(`Generated ${response.data.count} recommendations!`);
        } catch (error) {
            toast.error('Failed to generate recommendations');
        } finally {
            setGenerating(false);
        }
    };

    const convertToExperiment = async (id) => {
        try {
            await recommendationsAPI.convertToExperiment(id, { startDate: new Date() });
            toast.success('Experiment created!');
            fetchRecommendations();
        } catch (error) {
            toast.error('Failed to create experiment');
        }
    };

    const getImpactColor = (impact) => {
        const colors = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--info)' };
        return colors[impact] || 'var(--text-muted)';
    };

    const getDifficultyIcon = (difficulty) => {
        const map = { easy: '🟢', medium: '🟡', hard: '🔴' };
        return map[difficulty] || '⚪';
    };

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">AI Recommendations</h1>
                        <p className="page-subtitle">Actionable insights powered by AI</p>
                    </div>
                    <button className="btn btn-primary" onClick={generateNew} disabled={generating}>
                        {generating ? <><Loader2 size={18} className="animate-spin" /> Generating...</> : <><Sparkles size={18} /> Generate New</>}
                    </button>
                </div>

                {loading ? (
                    <div className="loading-state"><div className="spinner"></div></div>
                ) : recommendations.length === 0 ? (
                    <div className="card text-center" style={{ padding: '3rem' }}>
                        <Lightbulb size={48} style={{ color: 'var(--warning)', margin: '0 auto 1rem' }} />
                        <h3>No Recommendations Yet</h3>
                        <p className="text-muted mb-lg">Click "Generate New" to get AI-powered insights</p>
                        <button className="btn btn-primary" onClick={generateNew} disabled={generating}>
                            {generating ? 'Generating...' : 'Generate Recommendations'}
                        </button>
                    </div>
                ) : (
                    <div className="recs-grid">
                        {recommendations.map((rec, idx) => (
                            <div key={rec._id || idx} className="card rec-card">
                                <div className="rec-header">
                                    <span className="rec-category">{rec.category?.replace(/_/g, ' ')}</span>
                                    <span className="rec-impact" style={{ color: getImpactColor(rec.impact) }}>{rec.impact} impact</span>
                                </div>
                                <h3 className="rec-title">{rec.title}</h3>
                                <p className="rec-desc">{rec.description}</p>
                                <div className="rec-meta">
                                    <span>{getDifficultyIcon(rec.difficulty)} {rec.difficulty}</span>
                                    <span><Clock size={14} /> {rec.timeframe?.replace(/_/g, ' ')}</span>
                                    {rec.expectedImprovement && (
                                        <span className="text-success">+{rec.expectedImprovement.percentageImprovement}%</span>
                                    )}
                                </div>
                                {rec.status === 'pending' && (
                                    <div className="rec-actions">
                                        <button className="btn btn-primary btn-sm" onClick={() => convertToExperiment(rec._id)}>
                                            Start Experiment <ArrowRight size={14} />
                                        </button>
                                    </div>
                                )}
                                {rec.status === 'converted_to_experiment' && (
                                    <div className="rec-status"><Check size={14} /> Experiment Created</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <style>{`
        .recs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
        .rec-card { display: flex; flex-direction: column; }
        .rec-header { display: flex; justify-content: space-between; margin-bottom: 0.75rem; }
        .rec-category { font-size: 0.75rem; color: var(--accent-primary); text-transform: uppercase; font-weight: 500; }
        .rec-impact { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
        .rec-title { font-size: 1.125rem; margin-bottom: 0.5rem; }
        .rec-desc { color: var(--text-secondary); font-size: 0.875rem; flex: 1; margin-bottom: 1rem; }
        .rec-meta { display: flex; gap: 1rem; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1rem; }
        .rec-meta span { display: flex; align-items: center; gap: 4px; }
        .rec-actions { padding-top: 1rem; border-top: 1px solid var(--border-color); }
        .rec-status { display: flex; align-items: center; gap: 0.5rem; color: var(--success); font-size: 0.875rem; padding-top: 1rem; border-top: 1px solid var(--border-color); }
      `}</style>
        </div>
    );
};

export default Recommendations;

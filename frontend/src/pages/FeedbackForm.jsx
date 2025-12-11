import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { feedbackAPI } from '../api';
import { Star, Send, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import './FeedbackForm.css';

const FeedbackForm = () => {
    const { outletId } = useParams();
    const [outlet, setOutlet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        rating: 0,
        categories: [],
        comment: ''
    });

    const categories = [
        { value: 'food_quality', label: 'Food Quality', emoji: '🍽️' },
        { value: 'service_speed', label: 'Service Speed', emoji: '⚡' },
        { value: 'staff_behavior', label: 'Staff Behavior', emoji: '😊' },
        { value: 'cleanliness', label: 'Cleanliness', emoji: '✨' },
        { value: 'value_for_money', label: 'Value for Money', emoji: '💰' },
        { value: 'ambiance', label: 'Ambiance', emoji: '🎵' }
    ];

    useEffect(() => {
        fetchOutlet();
    }, [outletId]);

    const fetchOutlet = async () => {
        try {
            const response = await feedbackAPI.getOutletInfo(outletId);
            setOutlet(response.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (value) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(value)
                ? prev.categories.filter(c => c !== value)
                : [...prev.categories, value]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        try {
            await feedbackAPI.submit({
                outletId,
                ...formData,
                deviceType: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
            });
            setSubmitted(true);
        } catch (error) {
            toast.error('Failed to submit feedback');
        }
    };

    if (loading) {
        return <div className="feedback-page"><div className="spinner"></div></div>;
    }

    if (!outlet) {
        return <div className="feedback-page"><div className="feedback-card"><h2>Outlet not found</h2></div></div>;
    }

    if (submitted) {
        return (
            <div className="feedback-page">
                <div className="feedback-card success-card">
                    <div className="success-icon"><Check size={48} /></div>
                    <h2>Thank You!</h2>
                    <p>Your feedback helps us improve</p>
                </div>
            </div>
        );
    }

    return (
        <div className="feedback-page">
            <div className="feedback-card">
                <div className="feedback-header">
                    <h1>{outlet.businessName}</h1>
                    <p>{outlet.outletName}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="rating-section">
                        <p>How was your experience?</p>
                        <div className="star-rating">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    type="button"
                                    className={`star ${formData.rating >= star ? 'active' : ''}`}
                                    onClick={() => setFormData({ ...formData, rating: star })}
                                >
                                    <Star size={36} fill={formData.rating >= star ? '#fbbf24' : 'none'} />
                                </button>
                            ))}
                        </div>
                        <span className="rating-text">
                            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][formData.rating]}
                        </span>
                    </div>

                    <div className="categories-section">
                        <p>What did you like? (optional)</p>
                        <div className="category-grid">
                            {categories.map(cat => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    className={`category-btn ${formData.categories.includes(cat.value) ? 'selected' : ''}`}
                                    onClick={() => toggleCategory(cat.value)}
                                >
                                    <span>{cat.emoji}</span>
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="comment-section">
                        <textarea
                            placeholder="Any additional comments? (optional)"
                            value={formData.comment}
                            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                            maxLength={500}
                        />
                    </div>

                    <button type="submit" className="submit-btn">
                        <Send size={18} /> Submit Feedback
                    </button>
                </form>
            </div>
        </div>
    );
};

export default FeedbackForm;

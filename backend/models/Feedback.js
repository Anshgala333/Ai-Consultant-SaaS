const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    outlet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outlet',
        required: true
    },

    // Customer feedback (Module 5)
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },

    // Multiple-choice feedback categories
    categories: [{
        type: String,
        enum: [
            'food_quality',
            'service_speed',
            'staff_behavior',
            'cleanliness',
            'value_for_money',
            'ambiance',
            'product_availability',
            'billing_issues',
            'other'
        ]
    }],

    // Optional comment
    comment: {
        type: String,
        maxlength: 500
    },

    // Sentiment analysis (computed)
    sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative'],
        default: 'neutral'
    },

    // Session metadata
    sessionId: String, // Anonymous tracking
    deviceType: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop'],
        default: 'mobile'
    },

    // Status
    isProcessed: {
        type: Boolean,
        default: false
    },
    linkedIssue: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Issue'
    }
}, {
    timestamps: true
});

// Index for analytics
feedbackSchema.index({ business: 1, createdAt: -1 });
feedbackSchema.index({ outlet: 1, rating: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);

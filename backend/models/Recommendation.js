const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },

    // Recommendation details (Module 7)
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },

    // Impact assessment
    impact: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        required: true
    },
    timeframe: {
        type: String,
        enum: ['immediate', '1_week', '2_weeks', '1_month', '3_months'],
        required: true
    },

    // Category
    category: {
        type: String,
        enum: [
            'wastage_reduction',
            'revenue_growth',
            'cost_optimization',
            'customer_experience',
            'staff_efficiency',
            'inventory_management',
            'process_improvement',
            'marketing'
        ],
        required: true
    },

    // Related issues this addresses
    addressedIssues: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Issue'
    }],

    // Expected metrics improvement
    expectedImprovement: {
        metric: String, // e.g., 'wastage_percentage', 'revenue'
        currentValue: Number,
        targetValue: Number,
        percentageImprovement: Number
    },

    // AI generation metadata
    aiGenerated: {
        type: Boolean,
        default: true
    },
    promptContext: {
        type: String // Stored for audit
    },
    modelUsed: {
        type: String,
        default: 'gemini-pro'
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'converted_to_experiment', 'archived'],
        default: 'pending'
    },

    // User feedback
    userFeedback: {
        helpful: Boolean,
        comment: String
    },

    // Linked experiment (if converted)
    linkedExperiment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Experiment'
    },

    // Generation batch (recommendations generated together)
    batchId: String,
    generatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index
recommendationSchema.index({ business: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Recommendation', recommendationSchema);

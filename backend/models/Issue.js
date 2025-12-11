const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    outlet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outlet'
    },

    // Issue classification (Module 4)
    type: {
        type: String,
        enum: [
            'high_wastage',
            'declining_sales',
            'sku_inconsistency',
            'stock_out',
            'rating_drop',
            'staff_delay',
            'equipment_breakdown',
            'customer_complaint',
            'low_margin',
            'inventory_issue'
        ],
        required: true
    },

    // Issue details
    title: {
        type: String,
        required: true
    },
    description: String,

    // Severity & impact
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    estimatedImpact: {
        type: Number, // Estimated monthly loss in rupees
        default: 0
    },

    // Detection source
    source: {
        type: String,
        enum: ['kpi_engine', 'staff_log', 'customer_feedback', 'manual'],
        required: true
    },

    // Related data
    relatedData: {
        kpiId: { type: mongoose.Schema.Types.ObjectId, ref: 'KpiSnapshot' },
        staffLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffLog' },
        feedbackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' },
        skuId: String,
        threshold: Number,
        actualValue: Number
    },

    // Status tracking
    status: {
        type: String,
        enum: ['open', 'acknowledged', 'in_progress', 'resolved', 'dismissed'],
        default: 'open'
    },

    // Resolution
    resolvedAt: Date,
    resolutionNotes: String,

    // Linked recommendation/experiment
    linkedRecommendation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recommendation'
    },
    linkedExperiment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Experiment'
    },

    // Detection timestamp
    detectedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient querying
issueSchema.index({ business: 1, status: 1, createdAt: -1 });
issueSchema.index({ business: 1, type: 1 });

module.exports = mongoose.model('Issue', issueSchema);

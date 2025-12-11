const mongoose = require('mongoose');

const kpiSnapshotSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    outlet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outlet'
    },

    // Time period
    period: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        required: true
    },
    periodStart: {
        type: Date,
        required: true
    },
    periodEnd: {
        type: Date,
        required: true
    },

    // Core KPIs (Module 3)
    revenue: {
        total: { type: Number, default: 0 },
        growth: { type: Number, default: 0 }, // Percentage vs previous period
        trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' }
    },

    wastage: {
        percentage: { type: Number, default: 0 },
        value: { type: Number, default: 0 },
        trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' }
    },

    margin: {
        gross: { type: Number, default: 0 },
        net: { type: Number, default: 0 },
        proxy: { type: Number, default: 0 } // Simplified margin calculation
    },

    // SKU performance
    skuMetrics: {
        totalSKUs: { type: Number, default: 0 },
        topPerformers: [{
            sku: String,
            revenue: Number,
            quantity: Number
        }],
        underPerformers: [{
            sku: String,
            revenue: Number,
            quantity: Number
        }]
    },

    // Customer metrics
    customerMetrics: {
        averageRating: { type: Number, default: 0 },
        ratingTrend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
        feedbackCount: { type: Number, default: 0 }
    },

    // Staff metrics
    staffMetrics: {
        logsCount: { type: Number, default: 0 },
        issuesReported: { type: Number, default: 0 }
    },

    // Computed health score for this period
    periodHealthScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Is this a baseline snapshot?
    isBaseline: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for efficient querying
kpiSnapshotSchema.index({ business: 1, periodStart: -1 });
kpiSnapshotSchema.index({ business: 1, period: 1, periodStart: -1 });

module.exports = mongoose.model('KpiSnapshot', kpiSnapshotSchema);

const mongoose = require('mongoose');

const experimentSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },

    // Source recommendation (Module 8)
    recommendation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recommendation',
        required: true
    },

    // Experiment details
    title: {
        type: String,
        required: true
    },
    description: String,

    // Target KPI
    targetKPI: {
        type: String,
        enum: [
            'wastage_percentage',
            'revenue',
            'customer_rating',
            'margin',
            'stock_out_rate',
            'delay_rate',
            'staff_efficiency'
        ],
        required: true
    },

    // Expected improvement
    expectedImprovement: {
        percentage: { type: Number, required: true },
        absoluteValue: Number
    },

    // Timeline
    startDate: {
        type: Date,
        required: true
    },
    endDate: Date,
    durationWeeks: {
        type: Number,
        default: 4
    },

    // Before metrics (baseline - 4 week average before start)
    beforeMetrics: {
        kpiValue: Number,
        snapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'KpiSnapshot' },
        capturedAt: Date
    },

    // After metrics (Module 9)
    afterMetrics: {
        kpiValue: Number,
        snapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'KpiSnapshot' },
        capturedAt: Date
    },

    // Results
    actualImprovement: {
        percentage: Number,
        absoluteValue: Number,
        success: Boolean
    },

    // Weekly status updates
    weeklyUpdates: [{
        week: Number,
        date: Date,
        status: {
            type: String,
            enum: ['on_track', 'at_risk', 'off_track', 'completed']
        },
        notes: String,
        kpiValue: Number
    }],

    // Status
    status: {
        type: String,
        enum: ['planned', 'active', 'paused', 'completed', 'failed', 'cancelled'],
        default: 'planned'
    },

    // Completion
    completedAt: Date,
    completionNotes: String,

    // Impact for reporting
    estimatedMonthlySavings: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index
experimentSchema.index({ business: 1, status: 1 });
experimentSchema.index({ business: 1, startDate: -1 });

// Virtual for calculating actual improvement
experimentSchema.methods.calculateImprovement = function () {
    if (this.beforeMetrics?.kpiValue && this.afterMetrics?.kpiValue) {
        const before = this.beforeMetrics.kpiValue;
        const after = this.afterMetrics.kpiValue;
        const absoluteChange = after - before;
        const percentageChange = ((after - before) / before) * 100;

        this.actualImprovement = {
            percentage: Math.round(percentageChange * 100) / 100,
            absoluteValue: Math.round(absoluteChange * 100) / 100,
            success: this.targetKPI === 'wastage_percentage'
                ? percentageChange < 0
                : percentageChange > 0
        };
    }
    return this.actualImprovement;
};

module.exports = mongoose.model('Experiment', experimentSchema);

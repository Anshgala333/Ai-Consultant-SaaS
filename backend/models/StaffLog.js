const mongoose = require('mongoose');

const staffLogSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    outlet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outlet'
    },

    // Staff info (Module 6)
    staffName: {
        type: String,
        required: true,
        trim: true
    },
    staffRole: {
        type: String,
        enum: ['manager', 'supervisor', 'staff', 'cashier', 'kitchen', 'delivery', 'other'],
        default: 'staff'
    },

    // Log type
    logType: {
        type: String,
        enum: [
            'stock_out',
            'delay',
            'customer_complaint',
            'wastage_incident',
            'equipment_breakdown',
            'staff_shortage',
            'quality_issue',
            'theft_suspicion',
            'other'
        ],
        required: true
    },

    // Log details
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },

    // Severity
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },

    // Related items
    relatedItems: [{
        type: String // SKU names, equipment, etc.
    }],

    // Estimated impact
    estimatedImpact: {
        type: Number, // Value in rupees
        default: 0
    },

    // Action taken
    immediatAction: String,

    // Status
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'escalated', 'resolved'],
        default: 'pending'
    },

    // Links
    linkedIssue: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Issue'
    },

    // Timestamp of incident (may differ from log creation)
    incidentTime: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for queries
staffLogSchema.index({ business: 1, logType: 1, createdAt: -1 });
staffLogSchema.index({ business: 1, status: 1 });

module.exports = mongoose.model('StaffLog', staffLogSchema);

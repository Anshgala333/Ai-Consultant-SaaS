const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    // File info
    filename: {
        type: String,
        required: true
    },
    originalName: String,
    fileType: {
        type: String,
        enum: ['csv', 'xlsx', 'xls'],
        required: true
    },
    fileSize: Number,

    // Data type
    dataType: {
        type: String,
        enum: ['sales', 'purchase', 'wastage', 'inventory', 'staff'],
        required: true
    },

    // Column mapping (Module 2)
    columnMapping: {
        type: Map,
        of: String,
        default: {}
    },

    // Processing status
    status: {
        type: String,
        enum: ['pending', 'mapping', 'processing', 'completed', 'failed'],
        default: 'pending'
    },

    // Validation results
    validationErrors: [{
        row: Number,
        column: String,
        error: String
    }],

    // Processing summary
    summary: {
        totalRows: { type: Number, default: 0 },
        validRows: { type: Number, default: 0 },
        errorRows: { type: Number, default: 0 },
        processedAt: Date
    },

    // Raw data storage (first 100 rows for preview)
    previewData: [{
        type: mongoose.Schema.Types.Mixed
    }],

    // Headers from file
    headers: [String]
}, {
    timestamps: true
});

module.exports = mongoose.model('Upload', uploadSchema);

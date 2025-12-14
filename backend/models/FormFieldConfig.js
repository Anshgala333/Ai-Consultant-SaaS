const mongoose = require('mongoose');

const formFieldConfigSchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    fieldName: {
        type: String,
        required: true,
        trim: true
    },
    fieldType: {
        type: String,
        enum: ['text', 'textarea', 'number', 'select', 'date', 'file'],
        required: true
    },
    label: {
        type: String,
        required: true,
        trim: true
    },
    placeholder: {
        type: String,
        trim: true
    },
    required: {
        type: Boolean,
        default: false
    },
    options: [{
        label: String,
        value: String
    }], // For select fields
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
formFieldConfigSchema.index({ businessId: 1, isActive: 1, order: 1 });

module.exports = mongoose.model('FormFieldConfig', formFieldConfigSchema);

const mongoose = require('mongoose');

const outletSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String
    },
    // QR Code for customer feedback (Module 5)
    qrCodeUrl: String,
    qrCodeData: String,

    // Outlet-specific metrics
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Outlet', outletSchema);

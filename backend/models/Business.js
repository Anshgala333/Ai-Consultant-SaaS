const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const businessSchema = new mongoose.Schema({
    // Authentication
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },

    // Business Profile (Module 1)
    businessName: {
        type: String,
        required: true,
        trim: true
    },
    sector: {
        type: String,
        enum: ['restaurant', 'retail', 'cafe', 'grocery', 'salon', 'gym', 'clinic', 'cloud_kitchen', 'other'],
        required: true
    },
    outletCount: {
        type: Number,
        default: 1
    },
    revenueRange: {
        type: String,
        enum: ['0-10L', '10-25L', '25-50L', '50L-1Cr', '1Cr-5Cr', '5Cr+'],
        required: true
    },

    // Baseline KPIs
    baselineMetrics: {
        monthlyRevenue: { type: Number, default: 0 },
        cogs: { type: Number, default: 0 }, // Cost of Goods Sold
        staffCost: { type: Number, default: 0 },
        estimatedWastage: { type: Number, default: 0 }, // Percentage
        customerRating: { type: Number, default: 0 }
    },

    // Target KPI Goals (user's improvement targets)
    targetMetrics: {
        monthlyRevenue: { type: Number, default: 0 },
        cogs: { type: Number, default: 0 },
        staffCost: { type: Number, default: 0 },
        estimatedWastage: { type: Number, default: 0 },
        customerRating: { type: Number, default: 0 },
        targetTimeline: { type: Number, default: 3 } // months to achieve targets
    },


    // Custom KPIs (user-defined metrics)
    customKpis: [{
        name: {
            type: String,
            required: true,
            maxlength: 100,
            trim: true
        },
        description: {
            type: String,
            required: true,
            maxlength: 500,
            trim: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Primary Objective Selection
    primaryObjective: {
        type: String,
        enum: [
            'wastage',           // restaurant, cafe, grocery, cloud_kitchen
            'customer_experience', // all sectors
            'delays',            // restaurant, cafe, salon, clinic, cloud_kitchen
            'stock_outs',        // restaurant, retail, grocery
            'revenue',           // all sectors
            'retention',         // gym, salon (member/client retention)
            'shrinkage',         // retail (theft/loss)
            'engagement',        // gym (member engagement)
            'no_shows'           // clinic (appointment no-shows)
        ],
        default: 'wastage'
    },

    // Business Health Card (auto-generated)
    healthScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Onboarding Status
    onboardingCompleted: {
        type: Boolean,
        default: false
    },
    onboardingStep: {
        type: Number,
        default: 1
    },

    // Admin flags
    isAdmin: {
        type: Boolean,
        default: false
    },
    isPilot: {
        type: Boolean,
        default: true
    },

    // Timestamps
    lastDataUpload: Date,
    lastRecommendationGenerated: Date
}, {
    timestamps: true
});

// Hash password before saving
businessSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password method
businessSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Calculate health score
businessSchema.methods.calculateHealthScore = function () {
    let score = 50; // Base score

    const metrics = this.baselineMetrics;
    if (metrics.monthlyRevenue > 0) score += 10;
    if (metrics.estimatedWastage < 10) score += 15;
    else if (metrics.estimatedWastage < 20) score += 5;
    if (metrics.customerRating >= 4) score += 15;
    else if (metrics.customerRating >= 3) score += 5;

    this.healthScore = Math.min(100, Math.max(0, score));
    return this.healthScore;
};

module.exports = mongoose.model('Business', businessSchema);

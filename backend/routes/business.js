const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Business, Outlet } = require('../models');
const { protect } = require('../middleware/auth');

// @route   PUT /api/business/onboarding
// @desc    Update business profile during onboarding (Module 1)
// @access  Private
router.put('/onboarding', protect, [
    body('step').isInt({ min: 1, max: 5 })
], async (req, res) => {
    try {
        const { step, ...data } = req.body;
        const business = await Business.findById(req.business._id);

        // Step 1: Basic business info
        if (step === 1) {
            business.businessName = data.businessName || business.businessName;
            business.sector = data.sector || business.sector;
            business.outletCount = data.outletCount || business.outletCount;
            business.revenueRange = data.revenueRange || business.revenueRange;
        }

        // Step 2: Baseline KPI inputs
        if (step === 2) {
            business.baselineMetrics = {
                monthlyRevenue: data.monthlyRevenue || 0,
                cogs: data.cogs || 0,
                staffCost: data.staffCost || 0,
                estimatedWastage: data.estimatedWastage || 0,
                customerRating: data.customerRating || 0
            };
        }

        // Step 3: Primary objective selection
        if (step === 3) {
            business.primaryObjective = data.primaryObjective || 'wastage';
        }

        // Step 4: Create outlets
        if (step === 4 && data.outlets) {
            for (const outletData of data.outlets) {
                await Outlet.create({
                    business: business._id,
                    name: outletData.name,
                    address: outletData.address || {}
                });
            }
        }

        // Step 5: Complete onboarding
        if (step === 5) {
            business.onboardingCompleted = true;
            business.calculateHealthScore();
        }

        business.onboardingStep = step;
        await business.save();

        res.json({
            message: 'Onboarding step completed',
            step: business.onboardingStep,
            onboardingCompleted: business.onboardingCompleted,
            healthScore: business.healthScore,
            business
        });
    } catch (error) {
        console.error('Onboarding error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/business/health-card
// @desc    Get business health card (Module 1)
// @access  Private
router.get('/health-card', protect, async (req, res) => {
    try {
        const business = await Business.findById(req.business._id);
        business.calculateHealthScore();
        await business.save();

        const healthCard = {
            businessName: business.businessName,
            sector: business.sector,
            healthScore: business.healthScore,
            baselineMetrics: business.baselineMetrics,
            primaryObjective: business.primaryObjective,
            status: business.healthScore >= 70 ? 'healthy' :
                business.healthScore >= 40 ? 'needs_attention' : 'critical',
            recommendations: []
        };

        // Add quick recommendations based on metrics
        if (business.baselineMetrics.estimatedWastage > 15) {
            healthCard.recommendations.push('High wastage detected - consider inventory optimization');
        }
        if (business.baselineMetrics.customerRating < 3.5) {
            healthCard.recommendations.push('Customer rating below average - review service quality');
        }

        res.json(healthCard);
    } catch (error) {
        console.error('Health card error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/business/profile
// @desc    Get full business profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    try {
        const business = await Business.findById(req.business._id).select('-password');
        const outlets = await Outlet.find({ business: business._id });

        res.json({
            business,
            outlets
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/business/profile
// @desc    Update business profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
    try {
        const allowedUpdates = ['businessName', 'sector', 'revenueRange', 'primaryObjective'];
        const updates = {};

        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        const business = await Business.findByIdAndUpdate(
            req.business._id,
            updates,
            { new: true }
        ).select('-password');

        res.json(business);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

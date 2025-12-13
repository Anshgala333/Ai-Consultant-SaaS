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

        // Step 2: Baseline KPI inputs + Target Goals
        if (step === 2) {
            business.baselineMetrics = {
                monthlyRevenue: data.monthlyRevenue || 0,
                cogs: data.cogs || 0,
                staffCost: data.staffCost || 0,
                estimatedWastage: data.estimatedWastage || 0,
                customerRating: data.customerRating || 0
            };

            // Save target goals if provided
            if (data.targetMetrics) {
                business.targetMetrics = {
                    monthlyRevenue: data.targetMetrics.monthlyRevenue || data.monthlyRevenue || 0,
                    cogs: data.targetMetrics.cogs || data.cogs || 0,
                    staffCost: data.targetMetrics.staffCost || data.staffCost || 0,
                    estimatedWastage: data.targetMetrics.estimatedWastage || data.estimatedWastage || 0,
                    customerRating: data.targetMetrics.customerRating || data.customerRating || 0,
                    targetTimeline: data.targetMetrics.targetTimeline || 3
                };
            }

            // Handle custom KPIs
            if (data.customKpis && Array.isArray(data.customKpis)) {
                // Validate max 10 custom KPIs
                if (data.customKpis.length > 10) {
                    return res.status(400).json({
                        message: 'Maximum 10 custom KPIs allowed'
                    });
                }

                // Validate each custom KPI
                const validatedKpis = [];
                for (const kpi of data.customKpis) {
                    // Skip empty KPIs (in case user adds but doesn't fill)
                    if (!kpi.name || !kpi.description) {
                        continue;
                    }

                    // Validate string lengths
                    if (kpi.name.trim().length === 0 || kpi.name.length > 100) {
                        return res.status(400).json({
                            message: 'Custom KPI name must be between 1 and 100 characters'
                        });
                    }

                    if (kpi.description.trim().length === 0 || kpi.description.length > 500) {
                        return res.status(400).json({
                            message: 'Custom KPI description must be between 1 and 500 characters'
                        });
                    }

                    validatedKpis.push({
                        name: kpi.name.trim(),
                        description: kpi.description.trim()
                    });
                }

                business.customKpis = validatedKpis;
            }
        }

        // Step 3: Primary objective selection
        if (step === 3) {
            business.primaryObjective = data.primaryObjective || 'wastage';
        }

        // Step 4: Create outlets (filter out invalid ones)
        if (step === 4 && data.outlets) {
            // Filter out outlets without name (required field)
            const validOutlets = data.outlets.filter(o => o.name && o.name.trim());

            for (const outletData of validOutlets) {
                await Outlet.create({
                    business: business._id,
                    name: outletData.name.trim(),
                    address: {
                        city: outletData.address?.city || '',
                        state: outletData.address?.state || '',
                        street: outletData.address?.street || '',
                        pincode: outletData.address?.pincode || ''
                    }
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

// Industry benchmarks by sector (average metrics)
const INDUSTRY_BENCHMARKS = {
    restaurant: {
        estimatedWastage: 8,
        customerRating: 4.2,
        cogsPercentage: 32,
        staffCostPercentage: 28
    },
    retail: {
        estimatedWastage: 5,
        customerRating: 4.0,
        cogsPercentage: 55,
        staffCostPercentage: 15
    },
    cafe: {
        estimatedWastage: 10,
        customerRating: 4.3,
        cogsPercentage: 28,
        staffCostPercentage: 30
    },
    grocery: {
        estimatedWastage: 6,
        customerRating: 3.8,
        cogsPercentage: 70,
        staffCostPercentage: 12
    },
    salon: {
        estimatedWastage: 3,
        customerRating: 4.5,
        cogsPercentage: 15,
        staffCostPercentage: 45
    },
    gym: {
        estimatedWastage: 2,
        customerRating: 4.1,
        cogsPercentage: 10,
        staffCostPercentage: 40
    },
    clinic: {
        estimatedWastage: 4,
        customerRating: 4.4,
        cogsPercentage: 25,
        staffCostPercentage: 35
    },
    other: {
        estimatedWastage: 5,
        customerRating: 4.0,
        cogsPercentage: 40,
        staffCostPercentage: 25
    }
};

// @route   GET /api/business/benchmarks
// @desc    Get industry benchmarks for business sector
// @access  Private
router.get('/benchmarks', protect, async (req, res) => {
    try {
        const business = await Business.findById(req.business._id);
        const sector = business.sector || 'other';
        const benchmarks = INDUSTRY_BENCHMARKS[sector] || INDUSTRY_BENCHMARKS.other;

        res.json({
            sector,
            benchmarks,
            allSectors: INDUSTRY_BENCHMARKS
        });
    } catch (error) {
        console.error('Benchmarks error:', error);
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

        const sector = business.sector || 'other';
        const benchmarks = INDUSTRY_BENCHMARKS[sector] || INDUSTRY_BENCHMARKS.other;

        // Calculate comparison to benchmarks
        const comparison = {
            wastage: {
                current: business.baselineMetrics.estimatedWastage,
                benchmark: benchmarks.estimatedWastage,
                target: business.targetMetrics?.estimatedWastage || benchmarks.estimatedWastage,
                status: business.baselineMetrics.estimatedWastage <= benchmarks.estimatedWastage ? 'good' :
                    business.baselineMetrics.estimatedWastage <= benchmarks.estimatedWastage * 1.2 ? 'warning' : 'critical'
            },
            rating: {
                current: business.baselineMetrics.customerRating,
                benchmark: benchmarks.customerRating,
                target: business.targetMetrics?.customerRating || benchmarks.customerRating,
                status: business.baselineMetrics.customerRating >= benchmarks.customerRating ? 'good' :
                    business.baselineMetrics.customerRating >= benchmarks.customerRating * 0.9 ? 'warning' : 'critical'
            }
        };

        const healthCard = {
            businessName: business.businessName,
            sector: business.sector,
            healthScore: business.healthScore,
            baselineMetrics: business.baselineMetrics,
            targetMetrics: business.targetMetrics,
            benchmarks,
            comparison,
            primaryObjective: business.primaryObjective,
            status: business.healthScore >= 70 ? 'healthy' :
                business.healthScore >= 40 ? 'needs_attention' : 'critical',
            recommendations: []
        };

        // Add quick recommendations based on metrics and benchmarks
        if (business.baselineMetrics.estimatedWastage > benchmarks.estimatedWastage) {
            const diff = business.baselineMetrics.estimatedWastage - benchmarks.estimatedWastage;
            healthCard.recommendations.push(`Wastage ${diff.toFixed(1)}% above industry average - consider inventory optimization`);
        }
        if (business.baselineMetrics.customerRating < benchmarks.customerRating) {
            healthCard.recommendations.push(`Rating below industry average (${benchmarks.customerRating}) - review service quality`);
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

const express = require('express');
const router = express.Router();
const { Business, KpiSnapshot, Experiment, Issue, Upload } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');

// @route   GET /api/admin/businesses
// @desc    Get all pilot businesses (Module 11)
// @access  Admin only
router.get('/businesses', protect, adminOnly, async (req, res) => {
    try {
        const { isPilot = true, limit = 50 } = req.query;

        const filter = {};
        if (isPilot !== 'all') filter.isPilot = isPilot === 'true';

        const businesses = await Business.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        // Get additional stats for each business
        const businessesWithStats = await Promise.all(
            businesses.map(async (business) => {
                const [latestKPI, experimentCount, openIssues, lastUpload] = await Promise.all([
                    KpiSnapshot.findOne({ business: business._id }).sort({ createdAt: -1 }),
                    Experiment.countDocuments({ business: business._id }),
                    Issue.countDocuments({ business: business._id, status: 'open' }),
                    Upload.findOne({ business: business._id }).sort({ createdAt: -1 })
                ]);

                return {
                    ...business.toObject(),
                    latestKPI: latestKPI ? {
                        revenue: latestKPI.revenue?.total,
                        wastage: latestKPI.wastage?.percentage,
                        healthScore: latestKPI.periodHealthScore
                    } : null,
                    experimentCount,
                    openIssues,
                    lastDataUpload: lastUpload?.createdAt
                };
            })
        );

        res.json(businessesWithStats);
    } catch (error) {
        console.error('Get businesses error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard summary
// @access  Admin only
router.get('/dashboard', protect, adminOnly, async (req, res) => {
    try {
        const [
            totalBusinesses,
            activeExperiments,
            completedExperiments,
            totalIssues
        ] = await Promise.all([
            Business.countDocuments({ isPilot: true }),
            Experiment.countDocuments({ status: 'active' }),
            Experiment.find({ status: 'completed' }),
            Issue.countDocuments({ status: 'open' })
        ]);

        // Calculate total savings
        const totalSavings = completedExperiments.reduce(
            (sum, e) => sum + (e.estimatedMonthlySavings || 0), 0
        );

        // Get recent activity
        const recentExperiments = await Experiment.find({ status: 'completed' })
            .sort({ completedAt: -1 })
            .limit(5)
            .populate('business', 'businessName');

        res.json({
            overview: {
                totalPilotBusinesses: totalBusinesses,
                activeExperiments,
                completedExperiments: completedExperiments.length,
                openIssues: totalIssues,
                totalMonthlySavings: totalSavings
            },
            successRate: completedExperiments.length > 0
                ? (completedExperiments.filter(e => e.actualImprovement?.success).length / completedExperiments.length * 100).toFixed(1)
                : 0,
            recentActivityL: recentExperiments.map(e => ({
                businessName: e.business?.businessName,
                experimentTitle: e.title,
                improvement: e.actualImprovement?.percentage,
                savings: e.estimatedMonthlySavings
            }))
        });
    } catch (error) {
        console.error('Get admin dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/business/:id
// @desc    Get detailed business info for admin
// @access  Admin only
router.get('/business/:id', protect, adminOnly, async (req, res) => {
    try {
        const business = await Business.findById(req.params.id).select('-password');

        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        const [kpiHistory, experiments, issues, uploads] = await Promise.all([
            KpiSnapshot.find({ business: business._id }).sort({ periodStart: -1 }).limit(12),
            Experiment.find({ business: business._id }).sort({ createdAt: -1 }),
            Issue.find({ business: business._id }).sort({ createdAt: -1 }).limit(20),
            Upload.find({ business: business._id }).sort({ createdAt: -1 }).select('-previewData')
        ]);

        res.json({
            business,
            kpiHistory,
            experiments,
            issues,
            uploads
        });
    } catch (error) {
        console.error('Get business details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/export/kpi
// @desc    Export pilot-level KPI data
// @access  Admin only
router.get('/export/kpi', protect, adminOnly, async (req, res) => {
    try {
        const businesses = await Business.find({ isPilot: true }).select('businessName sector');

        const exportData = await Promise.all(
            businesses.map(async (business) => {
                const latestKPI = await KpiSnapshot.findOne({ business: business._id })
                    .sort({ createdAt: -1 });

                const experiments = await Experiment.find({
                    business: business._id,
                    status: 'completed'
                });

                const totalSavings = experiments.reduce(
                    (sum, e) => sum + (e.estimatedMonthlySavings || 0), 0
                );

                return {
                    businessName: business.businessName,
                    sector: business.sector,
                    revenue: latestKPI?.revenue?.total || 0,
                    wastagePercent: latestKPI?.wastage?.percentage || 0,
                    customerRating: latestKPI?.customerMetrics?.averageRating || 0,
                    experimentsCompleted: experiments.length,
                    totalMonthlySavings: totalSavings
                };
            })
        );

        res.json({
            exportDate: new Date(),
            totalBusinesses: exportData.length,
            data: exportData
        });
    } catch (error) {
        console.error('Export KPI error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

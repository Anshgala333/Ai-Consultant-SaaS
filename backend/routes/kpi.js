const express = require('express');
const router = express.Router();
const { KpiSnapshot, Upload, Issue } = require('../models');
const { protect } = require('../middleware/auth');
const KpiEngine = require('../services/kpiEngine');

// @route   POST /api/kpi/compute
// @desc    Trigger KPI computation (Module 3)
// @access  Private
router.post('/compute', protect, async (req, res) => {
    try {
        const { period = 'weekly' } = req.body;

        // Get latest upload data
        const latestUpload = await Upload.findOne({
            business: req.business._id,
            status: 'completed'
        }).sort({ createdAt: -1 });

        if (!latestUpload) {
            return res.status(400).json({
                message: 'No completed data uploads found. Please upload data first.'
            });
        }

        // Compute KPIs
        const kpiEngine = new KpiEngine(req.business._id);
        const kpiSnapshot = await kpiEngine.computeKPIs(period);

        // Trigger issue detection
        await kpiEngine.detectIssues(kpiSnapshot);

        res.json({
            message: 'KPI computation completed',
            snapshot: kpiSnapshot
        });
    } catch (error) {
        console.error('KPI computation error:', error);
        res.status(500).json({ message: 'KPI computation failed', error: error.message });
    }
});

// @route   GET /api/kpi/latest
// @desc    Get latest KPI snapshot
// @access  Private
router.get('/latest', protect, async (req, res) => {
    try {
        const snapshot = await KpiSnapshot.findOne({
            business: req.business._id
        }).sort({ createdAt: -1 });

        if (!snapshot) {
            return res.status(404).json({ message: 'No KPI data available' });
        }

        res.json(snapshot);
    } catch (error) {
        console.error('Get KPI error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/kpi/history
// @desc    Get KPI history
// @access  Private
router.get('/history', protect, async (req, res) => {
    try {
        const { period = 'weekly', limit = 12 } = req.query;

        const snapshots = await KpiSnapshot.find({
            business: req.business._id,
            period
        })
            .sort({ periodStart: -1 })
            .limit(parseInt(limit));

        res.json(snapshots);
    } catch (error) {
        console.error('Get KPI history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/kpi/summary
// @desc    Get KPI summary for dashboard
// @access  Private
router.get('/summary', protect, async (req, res) => {
    try {
        const latestSnapshot = await KpiSnapshot.findOne({
            business: req.business._id
        }).sort({ createdAt: -1 });

        const previousSnapshot = await KpiSnapshot.findOne({
            business: req.business._id,
            createdAt: { $lt: latestSnapshot?.createdAt || new Date() }
        }).sort({ createdAt: -1 });

        const openIssues = await Issue.countDocuments({
            business: req.business._id,
            status: { $in: ['open', 'acknowledged'] }
        });

        const summary = {
            currentPeriod: latestSnapshot ? {
                revenue: latestSnapshot.revenue,
                wastage: latestSnapshot.wastage,
                margin: latestSnapshot.margin,
                customerRating: latestSnapshot.customerMetrics?.averageRating,
                healthScore: latestSnapshot.periodHealthScore
            } : null,
            previousPeriod: previousSnapshot ? {
                revenue: previousSnapshot.revenue,
                wastage: previousSnapshot.wastage
            } : null,
            openIssues,
            lastUpdated: latestSnapshot?.createdAt
        };

        res.json(summary);
    } catch (error) {
        console.error('Get KPI summary error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/kpi/baseline
// @desc    Get baseline KPI for comparison
// @access  Private
router.get('/baseline', protect, async (req, res) => {
    try {
        const baselineSnapshot = await KpiSnapshot.findOne({
            business: req.business._id,
            isBaseline: true
        });

        if (!baselineSnapshot) {
            // If no explicit baseline, use first 4 weeks average
            const firstSnapshots = await KpiSnapshot.find({
                business: req.business._id
            }).sort({ periodStart: 1 }).limit(4);

            if (firstSnapshots.length === 0) {
                return res.status(404).json({ message: 'No baseline data available' });
            }

            // Compute average baseline
            const avgBaseline = {
                revenue: firstSnapshots.reduce((sum, s) => sum + (s.revenue?.total || 0), 0) / firstSnapshots.length,
                wastage: firstSnapshots.reduce((sum, s) => sum + (s.wastage?.percentage || 0), 0) / firstSnapshots.length,
                margin: firstSnapshots.reduce((sum, s) => sum + (s.margin?.gross || 0), 0) / firstSnapshots.length
            };

            return res.json({ computed: true, baseline: avgBaseline });
        }

        res.json({ computed: false, baseline: baselineSnapshot });
    } catch (error) {
        console.error('Get baseline error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

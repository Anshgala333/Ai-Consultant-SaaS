const express = require('express');
const router = express.Router();
const { Experiment, KpiSnapshot, Recommendation } = require('../models');
const { protect } = require('../middleware/auth');

// @route   GET /api/experiments
// @desc    Get all experiments (Module 8)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const { status, limit = 20 } = req.query;

        const filter = { business: req.business._id };
        if (status) filter.status = status;

        const experiments = await Experiment.find(filter)
            .sort({ startDate: -1 })
            .limit(parseInt(limit))
            .populate('recommendation', 'title category impact');

        res.json(experiments);
    } catch (error) {
        console.error('Get experiments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/experiments/:id
// @desc    Get single experiment
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const experiment = await Experiment.findOne({
            _id: req.params.id,
            business: req.business._id
        }).populate('recommendation');

        if (!experiment) {
            return res.status(404).json({ message: 'Experiment not found' });
        }

        res.json(experiment);
    } catch (error) {
        console.error('Get experiment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/experiments/:id/start
// @desc    Start an experiment
// @access  Private
router.put('/:id/start', protect, async (req, res) => {
    try {
        const experiment = await Experiment.findOne({
            _id: req.params.id,
            business: req.business._id
        });

        if (!experiment) {
            return res.status(404).json({ message: 'Experiment not found' });
        }

        experiment.status = 'active';
        experiment.startDate = new Date();

        // Calculate end date
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (experiment.durationWeeks * 7));
        experiment.endDate = endDate;

        await experiment.save();
        res.json(experiment);
    } catch (error) {
        console.error('Start experiment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/experiments/:id/update
// @desc    Add weekly update to experiment
// @access  Private
router.post('/:id/update', protect, async (req, res) => {
    try {
        const { status, notes, kpiValue } = req.body;

        const experiment = await Experiment.findOne({
            _id: req.params.id,
            business: req.business._id
        });

        if (!experiment) {
            return res.status(404).json({ message: 'Experiment not found' });
        }

        const weekNumber = experiment.weeklyUpdates.length + 1;
        experiment.weeklyUpdates.push({
            week: weekNumber,
            date: new Date(),
            status: status || 'on_track',
            notes,
            kpiValue
        });

        await experiment.save();
        res.json(experiment);
    } catch (error) {
        console.error('Update experiment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/experiments/:id/complete
// @desc    Complete an experiment (Module 9 - Before/After Comparison)
// @access  Private
router.put('/:id/complete', protect, async (req, res) => {
    try {
        const { completionNotes } = req.body;

        const experiment = await Experiment.findOne({
            _id: req.params.id,
            business: req.business._id
        });

        if (!experiment) {
            return res.status(404).json({ message: 'Experiment not found' });
        }

        // Get latest KPI for "after" metrics
        const latestKPI = await KpiSnapshot.findOne({
            business: req.business._id
        }).sort({ createdAt: -1 });

        if (latestKPI) {
            experiment.afterMetrics = {
                kpiValue: getKPIValue(latestKPI, experiment.targetKPI),
                snapshotId: latestKPI._id,
                capturedAt: new Date()
            };
        }

        // Calculate actual improvement
        experiment.calculateImprovement();

        experiment.status = 'completed';
        experiment.completedAt = new Date();
        experiment.completionNotes = completionNotes;

        // Calculate estimated monthly savings
        if (experiment.actualImprovement?.success) {
            experiment.estimatedMonthlySavings = calculateMonthlySavings(
                experiment.targetKPI,
                experiment.beforeMetrics?.kpiValue,
                experiment.afterMetrics?.kpiValue
            );
        }

        await experiment.save();

        res.json({
            message: 'Experiment completed',
            experiment,
            comparison: {
                before: experiment.beforeMetrics,
                after: experiment.afterMetrics,
                improvement: experiment.actualImprovement
            }
        });
    } catch (error) {
        console.error('Complete experiment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/experiments/:id/comparison
// @desc    Get before/after comparison (Module 9)
// @access  Private
router.get('/:id/comparison', protect, async (req, res) => {
    try {
        const experiment = await Experiment.findOne({
            _id: req.params.id,
            business: req.business._id
        }).populate('recommendation');

        if (!experiment) {
            return res.status(404).json({ message: 'Experiment not found' });
        }

        const comparison = {
            experimentTitle: experiment.title,
            targetKPI: experiment.targetKPI,
            duration: experiment.durationWeeks + ' weeks',
            before: experiment.beforeMetrics,
            after: experiment.afterMetrics,
            improvement: experiment.actualImprovement,
            weeklyProgress: experiment.weeklyUpdates,
            estimatedMonthlySavings: experiment.estimatedMonthlySavings
        };

        res.json(comparison);
    } catch (error) {
        console.error('Get comparison error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/experiments/summary
// @desc    Get experiments summary for dashboard
// @access  Private
router.get('/summary/stats', protect, async (req, res) => {
    try {
        const [byStatus, completed] = await Promise.all([
            Experiment.aggregate([
                { $match: { business: req.business._id } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Experiment.find({
                business: req.business._id,
                status: 'completed'
            }).sort({ completedAt: -1 }).limit(5)
        ]);

        const totalSavings = completed.reduce(
            (sum, e) => sum + (e.estimatedMonthlySavings || 0), 0
        );
        const successCount = completed.filter(e => e.actualImprovement?.success).length;

        res.json({
            totalExperiments: byStatus.reduce((sum, s) => sum + s.count, 0),
            active: byStatus.find(s => s._id === 'active')?.count || 0,
            completed: byStatus.find(s => s._id === 'completed')?.count || 0,
            successRate: completed.length > 0 ? (successCount / completed.length * 100).toFixed(1) : 0,
            totalMonthlySavings: totalSavings,
            recentCompleted: completed
        });
    } catch (error) {
        console.error('Get experiments summary error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Helper functions
function getKPIValue(kpiSnapshot, targetKPI) {
    const mapping = {
        'wastage_percentage': kpiSnapshot.wastage?.percentage,
        'revenue': kpiSnapshot.revenue?.total,
        'customer_rating': kpiSnapshot.customerMetrics?.averageRating,
        'margin': kpiSnapshot.margin?.gross,
        'stock_out_rate': 0 // Would need separate tracking
    };
    return mapping[targetKPI] || 0;
}

function calculateMonthlySavings(targetKPI, before, after) {
    if (!before || !after) return 0;

    // Simplified savings calculation
    if (targetKPI === 'wastage_percentage') {
        const reduction = before - after;
        return Math.max(0, reduction * 1000); // Approximate monthly savings
    }
    if (targetKPI === 'revenue') {
        return Math.max(0, after - before);
    }
    return 0;
}

module.exports = router;

const express = require('express');
const router = express.Router();
const { Issue, Recommendation, Experiment } = require('../models');
const { protect } = require('../middleware/auth');

// @route   GET /api/issues
// @desc    Get all issues for business (Module 4)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const { status, type, severity, limit = 50 } = req.query;

        const filter = { business: req.business._id };
        if (status) filter.status = status;
        if (type) filter.type = type;
        if (severity) filter.severity = severity;

        const issues = await Issue.find(filter)
            .sort({ detectedAt: -1 })
            .limit(parseInt(limit))
            .populate('linkedRecommendation', 'title status')
            .populate('linkedExperiment', 'title status');

        res.json(issues);
    } catch (error) {
        console.error('Get issues error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/issues/summary
// @desc    Get issues summary for dashboard
// @access  Private
router.get('/summary', protect, async (req, res) => {
    try {
        const [byStatus, byType, bySeverity] = await Promise.all([
            Issue.aggregate([
                { $match: { business: req.business._id } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Issue.aggregate([
                { $match: { business: req.business._id, status: 'open' } },
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ]),
            Issue.aggregate([
                { $match: { business: req.business._id, status: 'open' } },
                { $group: { _id: '$severity', count: { $sum: 1 } } }
            ])
        ]);

        const totalOpenIssues = byStatus.find(s => s._id === 'open')?.count || 0;
        const criticalIssues = bySeverity.find(s => s._id === 'critical')?.count || 0;
        const highIssues = bySeverity.find(s => s._id === 'high')?.count || 0;

        res.json({
            totalOpen: totalOpenIssues,
            critical: criticalIssues,
            high: highIssues,
            byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
            byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
            bySeverity: Object.fromEntries(bySeverity.map(s => [s._id, s.count]))
        });
    } catch (error) {
        console.error('Get issues summary error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/issues/:id
// @desc    Get single issue
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const issue = await Issue.findOne({
            _id: req.params.id,
            business: req.business._id
        }).populate('linkedRecommendation').populate('linkedExperiment');

        if (!issue) {
            return res.status(404).json({ message: 'Issue not found' });
        }

        res.json(issue);
    } catch (error) {
        console.error('Get issue error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/issues/:id/status
// @desc    Update issue status
// @access  Private
router.put('/:id/status', protect, async (req, res) => {
    try {
        const { status, resolutionNotes } = req.body;

        const issue = await Issue.findOne({
            _id: req.params.id,
            business: req.business._id
        });

        if (!issue) {
            return res.status(404).json({ message: 'Issue not found' });
        }

        issue.status = status;
        if (status === 'resolved') {
            issue.resolvedAt = new Date();
            issue.resolutionNotes = resolutionNotes;
        }

        await issue.save();
        res.json(issue);
    } catch (error) {
        console.error('Update issue error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/issues/:id/dismiss
// @desc    Dismiss an issue
// @access  Private
router.post('/:id/dismiss', protect, async (req, res) => {
    try {
        const { reason } = req.body;

        const issue = await Issue.findOneAndUpdate(
            { _id: req.params.id, business: req.business._id },
            { status: 'dismissed', resolutionNotes: reason },
            { new: true }
        );

        if (!issue) {
            return res.status(404).json({ message: 'Issue not found' });
        }

        res.json(issue);
    } catch (error) {
        console.error('Dismiss issue error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

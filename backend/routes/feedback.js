const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Feedback, Outlet, Issue } = require('../models');
const { protect } = require('../middleware/auth');
const QRGenerator = require('../services/qrGenerator');

// @route   POST /api/feedback
// @desc    Submit customer feedback (Module 5) - PUBLIC ROUTE
// @access  Public (via QR code)
router.post('/', [
    body('outletId').notEmpty(),
    body('rating').isInt({ min: 1, max: 5 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { outletId, rating, categories, comment, sessionId, deviceType } = req.body;

        const outlet = await Outlet.findById(outletId);
        if (!outlet) {
            return res.status(404).json({ message: 'Outlet not found' });
        }

        // Determine sentiment from rating
        let sentiment = 'neutral';
        if (rating >= 4) sentiment = 'positive';
        else if (rating <= 2) sentiment = 'negative';

        const feedback = await Feedback.create({
            business: outlet.business,
            outlet: outletId,
            rating,
            categories: categories || [],
            comment,
            sentiment,
            sessionId,
            deviceType: deviceType || 'mobile'
        });

        // Create issue if negative feedback
        if (rating <= 2 && categories?.length > 0) {
            const issue = await Issue.create({
                business: outlet.business,
                outlet: outletId,
                type: 'customer_complaint',
                title: `Low customer rating: ${rating}/5`,
                description: comment || `Categories: ${categories.join(', ')}`,
                severity: rating === 1 ? 'high' : 'medium',
                source: 'customer_feedback',
                relatedData: { feedbackId: feedback._id }
            });
            feedback.linkedIssue = issue._id;
            await feedback.save();
        }

        res.status(201).json({
            message: 'Thank you for your feedback!',
            feedbackId: feedback._id
        });
    } catch (error) {
        console.error('Feedback submit error:', error);
        res.status(500).json({ message: 'Failed to submit feedback' });
    }
});

// @route   GET /api/feedback/outlet/:outletId
// @desc    Get public outlet info for feedback form
// @access  Public
router.get('/outlet/:outletId', async (req, res) => {
    try {
        const outlet = await Outlet.findById(req.params.outletId)
            .populate('business', 'businessName sector');

        if (!outlet) {
            return res.status(404).json({ message: 'Outlet not found' });
        }

        res.json({
            outletName: outlet.name,
            businessName: outlet.business.businessName,
            sector: outlet.business.sector
        });
    } catch (error) {
        console.error('Get outlet error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/feedback
// @desc    Get all feedback for business
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const { outlet, rating, limit = 50 } = req.query;

        const filter = { business: req.business._id };
        if (outlet) filter.outlet = outlet;
        if (rating) filter.rating = parseInt(rating);

        const feedback = await Feedback.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('outlet', 'name');

        res.json(feedback);
    } catch (error) {
        console.error('Get feedback error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/feedback/summary
// @desc    Get feedback summary for dashboard
// @access  Private
router.get('/summary', protect, async (req, res) => {
    try {
        const [stats, recent, bySentiment] = await Promise.all([
            Feedback.aggregate([
                { $match: { business: req.business._id } },
                {
                    $group: {
                        _id: null,
                        avgRating: { $avg: '$rating' },
                        totalCount: { $sum: 1 }
                    }
                }
            ]),
            Feedback.find({ business: req.business._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('rating categories comment createdAt'),
            Feedback.aggregate([
                { $match: { business: req.business._id } },
                { $group: { _id: '$sentiment', count: { $sum: 1 } } }
            ])
        ]);

        res.json({
            averageRating: Math.round((stats[0]?.avgRating || 0) * 10) / 10,
            totalFeedback: stats[0]?.totalCount || 0,
            recentFeedback: recent,
            sentimentBreakdown: Object.fromEntries(bySentiment.map(s => [s._id, s.count]))
        });
    } catch (error) {
        console.error('Get feedback summary error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/feedback/qr/:outletId
// @desc    Generate QR code for outlet
// @access  Private
router.post('/qr/:outletId', protect, async (req, res) => {
    try {
        const outlet = await Outlet.findOne({
            _id: req.params.outletId,
            business: req.business._id
        });

        if (!outlet) {
            return res.status(404).json({ message: 'Outlet not found' });
        }

        const qrData = await QRGenerator.generateFeedbackQR(outlet._id);

        outlet.qrCodeUrl = qrData.url;
        outlet.qrCodeData = qrData.dataUrl;
        await outlet.save();

        res.json({
            message: 'QR code generated',
            qrCodeUrl: qrData.url,
            qrCodeDataUrl: qrData.dataUrl
        });
    } catch (error) {
        console.error('Generate QR error:', error);
        res.status(500).json({ message: 'Failed to generate QR code' });
    }
});

module.exports = router;

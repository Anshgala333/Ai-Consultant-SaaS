const express = require('express');
const router = express.Router();
const { Recommendation, Issue, Business, KpiSnapshot, Feedback, StaffLog, Experiment } = require('../models');
const { protect } = require('../middleware/auth');
const GeminiRecommender = require('../services/geminiRecommender');

// @route   POST /api/recommendations/generate
// @desc    Generate AI recommendations (Module 7)
// @access  Private
router.post('/generate', protect, async (req, res) => {
    try {
        const business = await Business.findById(req.business._id);

        // Gather context for AI
        const [
            latestKPI,
            openIssues,
            recentFeedback,
            recentStaffLogs
        ] = await Promise.all([
            KpiSnapshot.findOne({ business: req.business._id }).sort({ createdAt: -1 }),
            Issue.find({ business: req.business._id, status: 'open' }).limit(10),
            Feedback.find({ business: req.business._id }).sort({ createdAt: -1 }).limit(20),
            StaffLog.find({ business: req.business._id }).sort({ createdAt: -1 }).limit(20)
        ]);

        // Build context object
        const context = {
            businessProfile: {
                name: business.businessName,
                sector: business.sector,
                revenue: business.revenueRange,
                primaryObjective: business.primaryObjective,
                healthScore: business.healthScore
            },
            kpis: latestKPI ? {
                revenue: latestKPI.revenue,
                wastage: latestKPI.wastage,
                margin: latestKPI.margin,
                customerRating: latestKPI.customerMetrics?.averageRating
            } : business.baselineMetrics,
            issues: openIssues.map(i => ({
                type: i.type,
                title: i.title,
                severity: i.severity,
                impact: i.estimatedImpact
            })),
            customerFeedback: {
                averageRating: recentFeedback.reduce((sum, f) => sum + f.rating, 0) / (recentFeedback.length || 1),
                topCategories: getTopCategories(recentFeedback),
                negativeCount: recentFeedback.filter(f => f.sentiment === 'negative').length
            },
            staffLogs: {
                totalLogs: recentStaffLogs.length,
                topTypes: getTopLogTypes(recentStaffLogs),
                criticalCount: recentStaffLogs.filter(l => l.severity === 'critical').length
            }
        };

        // Generate recommendations using Gemini
        const recommender = new GeminiRecommender();
        const recommendations = await recommender.generateRecommendations(context);

        // Store recommendations
        const batchId = `batch_${Date.now()}`;
        const savedRecommendations = await Promise.all(
            recommendations.map(rec => Recommendation.create({
                business: req.business._id,
                ...rec,
                batchId,
                aiGenerated: true,
                modelUsed: 'gemini-pro',
                promptContext: JSON.stringify(context).substring(0, 1000)
            }))
        );

        // Update business
        await Business.findByIdAndUpdate(req.business._id, {
            lastRecommendationGenerated: new Date()
        });

        res.json({
            message: 'Recommendations generated successfully',
            count: savedRecommendations.length,
            recommendations: savedRecommendations
        });
    } catch (error) {
        console.error('Generate recommendations error:', error);
        res.status(500).json({ message: 'Failed to generate recommendations', error: error.message });
    }
});

// Helper functions
function getTopCategories(feedback) {
    const counts = {};
    feedback.forEach(f => {
        f.categories?.forEach(c => {
            counts[c] = (counts[c] || 0) + 1;
        });
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);
}

function getTopLogTypes(logs) {
    const counts = {};
    logs.forEach(l => {
        counts[l.logType] = (counts[l.logType] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type);
}

// @route   GET /api/recommendations
// @desc    Get recommendations for business
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const { status, category, limit = 20 } = req.query;

        const filter = { business: req.business._id };
        if (status) filter.status = status;
        if (category) filter.category = category;

        const recommendations = await Recommendation.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('linkedExperiment', 'status');

        res.json(recommendations);
    } catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/recommendations/latest
// @desc    Get latest batch of recommendations
// @access  Private
router.get('/latest', protect, async (req, res) => {
    try {
        const latestRec = await Recommendation.findOne({
            business: req.business._id
        }).sort({ createdAt: -1 });

        if (!latestRec) {
            return res.json({ recommendations: [], message: 'No recommendations yet' });
        }

        const recommendations = await Recommendation.find({
            business: req.business._id,
            batchId: latestRec.batchId
        }).sort({ impact: -1 });

        res.json({
            batchId: latestRec.batchId,
            generatedAt: latestRec.generatedAt,
            recommendations
        });
    } catch (error) {
        console.error('Get latest recommendations error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/recommendations/:id/status
// @desc    Update recommendation status
// @access  Private
router.put('/:id/status', protect, async (req, res) => {
    try {
        const { status, feedback } = req.body;

        const recommendation = await Recommendation.findOneAndUpdate(
            { _id: req.params.id, business: req.business._id },
            {
                status,
                userFeedback: feedback ? { helpful: feedback.helpful, comment: feedback.comment } : undefined
            },
            { new: true }
        );

        if (!recommendation) {
            return res.status(404).json({ message: 'Recommendation not found' });
        }

        res.json(recommendation);
    } catch (error) {
        console.error('Update recommendation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/recommendations/:id/convert
// @desc    Convert recommendation to experiment (Module 8)
// @access  Private
router.post('/:id/convert', protect, async (req, res) => {
    try {
        const recommendation = await Recommendation.findOne({
            _id: req.params.id,
            business: req.business._id
        });

        if (!recommendation) {
            return res.status(404).json({ message: 'Recommendation not found' });
        }

        const { startDate, durationWeeks = 4 } = req.body;

        // Get baseline KPI for before metrics
        const baselineKPIs = await KpiSnapshot.find({
            business: req.business._id
        }).sort({ periodStart: -1 }).limit(4);

        const avgBaseline = baselineKPIs.length > 0
            ? baselineKPIs.reduce((sum, k) => sum + (k[recommendation.expectedImprovement?.metric] || 0), 0) / baselineKPIs.length
            : 0;

        // Create experiment
        const experiment = await Experiment.create({
            business: req.business._id,
            recommendation: recommendation._id,
            title: recommendation.title,
            description: recommendation.description,
            targetKPI: mapCategoryToKPI(recommendation.category),
            expectedImprovement: {
                percentage: recommendation.expectedImprovement?.percentageImprovement || 10,
                absoluteValue: recommendation.expectedImprovement?.targetValue
            },
            startDate: startDate || new Date(),
            durationWeeks,
            beforeMetrics: {
                kpiValue: avgBaseline,
                capturedAt: new Date()
            },
            status: 'planned'
        });

        // Update recommendation
        recommendation.status = 'converted_to_experiment';
        recommendation.linkedExperiment = experiment._id;
        await recommendation.save();

        res.json({
            message: 'Recommendation converted to experiment',
            experiment
        });
    } catch (error) {
        console.error('Convert recommendation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

function mapCategoryToKPI(category) {
    const mapping = {
        'wastage_reduction': 'wastage_percentage',
        'revenue_growth': 'revenue',
        'customer_experience': 'customer_rating',
        'cost_optimization': 'margin',
        'inventory_management': 'stock_out_rate'
    };
    return mapping[category] || 'revenue';
}

module.exports = router;

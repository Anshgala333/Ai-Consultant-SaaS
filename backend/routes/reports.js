const express = require('express');
const router = express.Router();
const { Business, KpiSnapshot, Experiment, Issue, Recommendation, Feedback } = require('../models');
const { protect } = require('../middleware/auth');
const ReportGenerator = require('../services/reportGenerator');

// @route   POST /api/reports/generate
// @desc    Generate impact report (Module 12)
// @access  Private
router.post('/generate', protect, async (req, res) => {
    try {
        const business = await Business.findById(req.business._id);

        // Gather all data for report
        const [
            kpiHistory,
            baselineKPI,
            latestKPI,
            issues,
            experiments,
            recommendations,
            feedbackSummary
        ] = await Promise.all([
            KpiSnapshot.find({ business: req.business._id })
                .sort({ periodStart: -1 }).limit(12),
            KpiSnapshot.findOne({ business: req.business._id, isBaseline: true }),
            KpiSnapshot.findOne({ business: req.business._id }).sort({ createdAt: -1 }),
            Issue.find({ business: req.business._id }),
            Experiment.find({ business: req.business._id }),
            Recommendation.find({ business: req.business._id }).limit(20),
            Feedback.aggregate([
                { $match: { business: req.business._id } },
                {
                    $group: {
                        _id: null,
                        avgRating: { $avg: '$rating' },
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        // Calculate improvements
        const completedExperiments = experiments.filter(e => e.status === 'completed');
        const totalSavings = completedExperiments.reduce(
            (sum, e) => sum + (e.estimatedMonthlySavings || 0), 0
        );

        // Build report data
        const reportData = {
            business: {
                name: business.businessName,
                sector: business.sector,
                healthScore: business.healthScore
            },
            executiveSummary: {
                experimentsCompleted: completedExperiments.length,
                successRate: completedExperiments.length > 0
                    ? (completedExperiments.filter(e => e.actualImprovement?.success).length / completedExperiments.length * 100)
                    : 0,
                totalMonthlySavings: totalSavings,
                issuesResolved: issues.filter(i => i.status === 'resolved').length
            },
            baselineVsLatest: {
                baseline: baselineKPI || {
                    revenue: { total: business.baselineMetrics.monthlyRevenue },
                    wastage: { percentage: business.baselineMetrics.estimatedWastage }
                },
                latest: latestKPI,
                improvements: {
                    revenue: latestKPI && baselineKPI
                        ? ((latestKPI.revenue?.total - baselineKPI.revenue?.total) / baselineKPI.revenue?.total * 100).toFixed(1)
                        : null,
                    wastage: latestKPI && baselineKPI
                        ? (baselineKPI.wastage?.percentage - latestKPI.wastage?.percentage).toFixed(1)
                        : null
                }
            },
            issues: {
                total: issues.length,
                byStatus: {
                    open: issues.filter(i => i.status === 'open').length,
                    resolved: issues.filter(i => i.status === 'resolved').length,
                    dismissed: issues.filter(i => i.status === 'dismissed').length
                },
                topTypes: getTopIssueTypes(issues)
            },
            experiments: completedExperiments.map(e => ({
                title: e.title,
                targetKPI: e.targetKPI,
                improvement: e.actualImprovement,
                savings: e.estimatedMonthlySavings
            })),
            customerFeedback: {
                avgRating: feedbackSummary[0]?.avgRating?.toFixed(1) || 'N/A',
                totalResponses: feedbackSummary[0]?.count || 0
            },
            recommendedNext30Days: recommendations
                .filter(r => r.status === 'pending')
                .slice(0, 3)
                .map(r => ({ title: r.title, impact: r.impact, category: r.category })),
            generatedAt: new Date()
        };

        // Generate PDF
        const reportGenerator = new ReportGenerator();
        const pdfBuffer = await reportGenerator.generatePDF(reportData);

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=impact-report-${Date.now()}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({ message: 'Failed to generate report', error: error.message });
    }
});

// @route   GET /api/reports/preview
// @desc    Get report data preview (JSON)
// @access  Private
router.get('/preview', protect, async (req, res) => {
    try {
        const business = await Business.findById(req.business._id);

        const [latestKPI, completedExperiments, resolvedIssues] = await Promise.all([
            KpiSnapshot.findOne({ business: req.business._id }).sort({ createdAt: -1 }),
            Experiment.find({ business: req.business._id, status: 'completed' }),
            Issue.countDocuments({ business: req.business._id, status: 'resolved' })
        ]);

        const totalSavings = completedExperiments.reduce(
            (sum, e) => sum + (e.estimatedMonthlySavings || 0), 0
        );

        res.json({
            summary: {
                businessName: business.businessName,
                healthScore: business.healthScore,
                experimentsCompleted: completedExperiments.length,
                issuesResolved: resolvedIssues,
                estimatedMonthlySavings: totalSavings
            },
            latestKPI: latestKPI ? {
                revenue: latestKPI.revenue,
                wastage: latestKPI.wastage,
                customerRating: latestKPI.customerMetrics?.averageRating
            } : null,
            canGenerate: completedExperiments.length > 0 || latestKPI !== null
        });
    } catch (error) {
        console.error('Report preview error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

function getTopIssueTypes(issues) {
    const counts = {};
    issues.forEach(i => {
        counts[i.type] = (counts[i.type] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));
}

module.exports = router;

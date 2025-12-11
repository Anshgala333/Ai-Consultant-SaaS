const { KpiSnapshot, Upload, Issue, Business, Feedback, StaffLog } = require('../models');

class KpiEngine {
    constructor(businessId) {
        this.businessId = businessId;
    }

    async computeKPIs(period = 'weekly') {
        // Get completed uploads
        const uploads = await Upload.find({
            business: this.businessId,
            status: 'completed'
        }).sort({ createdAt: -1 });

        if (uploads.length === 0) {
            throw new Error('No data available for KPI computation');
        }

        // Calculate period dates
        const now = new Date();
        const periodStart = new Date();
        const periodEnd = now;

        if (period === 'weekly') {
            periodStart.setDate(now.getDate() - 7);
        } else if (period === 'monthly') {
            periodStart.setMonth(now.getMonth() - 1);
        } else {
            periodStart.setDate(now.getDate() - 1);
        }

        // Aggregate data from uploads
        const salesData = await this.aggregateSalesData(uploads, periodStart, periodEnd);
        const wastageData = await this.aggregateWastageData(uploads, periodStart, periodEnd);

        // Get feedback and staff logs for this period
        const [feedbackData, staffLogData] = await Promise.all([
            this.getFeedbackMetrics(periodStart, periodEnd),
            this.getStaffLogMetrics(periodStart, periodEnd)
        ]);

        // Get previous period for comparison
        const prevPeriodStart = new Date(periodStart);
        const prevPeriodEnd = new Date(periodStart);
        if (period === 'weekly') {
            prevPeriodStart.setDate(prevPeriodStart.getDate() - 7);
        } else if (period === 'monthly') {
            prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 1);
        }

        const prevSnapshot = await KpiSnapshot.findOne({
            business: this.businessId,
            period,
            periodStart: { $gte: prevPeriodStart, $lt: periodStart }
        });

        // Calculate trends
        const revenueTrend = this.calculateTrend(salesData.total, prevSnapshot?.revenue?.total);
        const wastageTrend = this.calculateTrend(wastageData.percentage, prevSnapshot?.wastage?.percentage, true);

        // Create KPI snapshot
        const kpiSnapshot = await KpiSnapshot.create({
            business: this.businessId,
            period,
            periodStart,
            periodEnd,
            revenue: {
                total: salesData.total,
                growth: prevSnapshot?.revenue?.total
                    ? ((salesData.total - prevSnapshot.revenue.total) / prevSnapshot.revenue.total * 100)
                    : 0,
                trend: revenueTrend
            },
            wastage: {
                percentage: wastageData.percentage,
                value: wastageData.value,
                trend: wastageTrend
            },
            margin: {
                gross: salesData.grossMargin,
                net: salesData.netMargin,
                proxy: salesData.marginProxy
            },
            skuMetrics: {
                totalSKUs: salesData.skuCount,
                topPerformers: salesData.topSKUs,
                underPerformers: salesData.bottomSKUs
            },
            customerMetrics: {
                averageRating: feedbackData.averageRating,
                ratingTrend: this.calculateTrend(feedbackData.averageRating, prevSnapshot?.customerMetrics?.averageRating),
                feedbackCount: feedbackData.count
            },
            staffMetrics: {
                logsCount: staffLogData.count,
                issuesReported: staffLogData.issuesCreated
            },
            periodHealthScore: this.calculateHealthScore({
                revenue: salesData.total,
                wastage: wastageData.percentage,
                rating: feedbackData.averageRating
            })
        });

        return kpiSnapshot;
    }

    async aggregateSalesData(uploads, startDate, endDate) {
        // In production, this would parse actual upload data
        // For demo, return simulated data based on uploads
        const salesUploads = uploads.filter(u => u.dataType === 'sales');

        const total = salesUploads.length > 0
            ? Math.random() * 500000 + 100000 // Simulated revenue
            : 0;

        return {
            total: Math.round(total),
            grossMargin: Math.round(total * 0.35), // 35% gross margin
            netMargin: Math.round(total * 0.12), // 12% net margin
            marginProxy: 35,
            skuCount: Math.floor(Math.random() * 100) + 50,
            topSKUs: [
                { sku: 'SKU001', revenue: Math.round(total * 0.15), quantity: 150 },
                { sku: 'SKU002', revenue: Math.round(total * 0.12), quantity: 120 },
                { sku: 'SKU003', revenue: Math.round(total * 0.10), quantity: 100 }
            ],
            bottomSKUs: [
                { sku: 'SKU098', revenue: Math.round(total * 0.01), quantity: 5 },
                { sku: 'SKU099', revenue: Math.round(total * 0.008), quantity: 3 }
            ]
        };
    }

    async aggregateWastageData(uploads, startDate, endDate) {
        const wastageUploads = uploads.filter(u => u.dataType === 'wastage');

        // Simulated wastage data
        const percentage = wastageUploads.length > 0
            ? Math.random() * 15 + 5 // 5-20% wastage
            : 10;

        return {
            percentage: Math.round(percentage * 10) / 10,
            value: Math.round(Math.random() * 50000 + 10000)
        };
    }

    async getFeedbackMetrics(startDate, endDate) {
        const feedback = await Feedback.find({
            business: this.businessId,
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const avgRating = feedback.length > 0
            ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
            : 0;

        return {
            averageRating: Math.round(avgRating * 10) / 10,
            count: feedback.length
        };
    }

    async getStaffLogMetrics(startDate, endDate) {
        const logs = await StaffLog.find({
            business: this.businessId,
            createdAt: { $gte: startDate, $lte: endDate }
        });

        return {
            count: logs.length,
            issuesCreated: logs.filter(l => l.linkedIssue).length
        };
    }

    calculateTrend(current, previous, inversed = false) {
        if (!previous || !current) return 'stable';
        const change = ((current - previous) / previous) * 100;

        if (Math.abs(change) < 2) return 'stable';
        if (inversed) {
            return change > 0 ? 'down' : 'up'; // For wastage, up means bad
        }
        return change > 0 ? 'up' : 'down';
    }

    calculateHealthScore({ revenue, wastage, rating }) {
        let score = 50;

        if (revenue > 100000) score += 15;
        else if (revenue > 50000) score += 10;

        if (wastage < 8) score += 20;
        else if (wastage < 12) score += 10;
        else if (wastage > 18) score -= 10;

        if (rating >= 4.5) score += 15;
        else if (rating >= 4) score += 10;
        else if (rating >= 3) score += 5;
        else if (rating < 3) score -= 10;

        return Math.max(0, Math.min(100, score));
    }

    async detectIssues(kpiSnapshot) {
        const issues = [];

        // High wastage detection
        if (kpiSnapshot.wastage?.percentage > 15) {
            issues.push({
                type: 'high_wastage',
                title: `High wastage detected: ${kpiSnapshot.wastage.percentage}%`,
                description: `Wastage is above the 15% threshold. Current wastage is ${kpiSnapshot.wastage.percentage}%.`,
                severity: kpiSnapshot.wastage.percentage > 20 ? 'critical' : 'high',
                estimatedImpact: kpiSnapshot.wastage.value,
                source: 'kpi_engine',
                relatedData: { kpiId: kpiSnapshot._id, threshold: 15, actualValue: kpiSnapshot.wastage.percentage }
            });
        }

        // Declining sales
        if (kpiSnapshot.revenue?.trend === 'down' && kpiSnapshot.revenue?.growth < -10) {
            issues.push({
                type: 'declining_sales',
                title: `Revenue decline: ${Math.abs(kpiSnapshot.revenue.growth).toFixed(1)}%`,
                description: 'Revenue has declined significantly compared to the previous period.',
                severity: kpiSnapshot.revenue.growth < -20 ? 'critical' : 'high',
                source: 'kpi_engine',
                relatedData: { kpiId: kpiSnapshot._id }
            });
        }

        // Customer rating drop
        if (kpiSnapshot.customerMetrics?.averageRating < 3.5) {
            issues.push({
                type: 'rating_drop',
                title: `Low customer rating: ${kpiSnapshot.customerMetrics.averageRating}/5`,
                description: 'Customer satisfaction is below acceptable threshold.',
                severity: kpiSnapshot.customerMetrics.averageRating < 3 ? 'high' : 'medium',
                source: 'kpi_engine',
                relatedData: { kpiId: kpiSnapshot._id, threshold: 3.5, actualValue: kpiSnapshot.customerMetrics.averageRating }
            });
        }

        // Create issues in database
        for (const issueData of issues) {
            await Issue.create({
                business: this.businessId,
                ...issueData
            });
        }

        return issues;
    }
}

module.exports = KpiEngine;

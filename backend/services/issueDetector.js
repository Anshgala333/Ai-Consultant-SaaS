// Issue Detection Service - Rules-based detection engine
// Detects operational issues from KPI data, feedback, and staff logs

class IssueDetector {
    constructor(businessId) {
        this.businessId = businessId;
        this.thresholds = {
            wastage: {
                warning: 10,
                critical: 20
            },
            customerRating: {
                warning: 3.5,
                critical: 2.5
            },
            revenueDropPercent: {
                warning: 10,
                critical: 25
            },
            stockOutCount: {
                warning: 3,
                critical: 8
            },
            delayIncidents: {
                warning: 5,
                critical: 15
            }
        };
    }

    // Main detection method - analyzes all data sources
    async detectAllIssues(kpiSnapshot, recentFeedback, recentStaffLogs) {
        const issues = [];

        // KPI-based issue detection
        if (kpiSnapshot) {
            issues.push(...this.detectKPIIssues(kpiSnapshot));
        }

        // Feedback-based issue detection
        if (recentFeedback && recentFeedback.length > 0) {
            issues.push(...this.detectFeedbackIssues(recentFeedback));
        }

        // Staff log-based issue detection
        if (recentStaffLogs && recentStaffLogs.length > 0) {
            issues.push(...this.detectStaffLogIssues(recentStaffLogs));
        }

        return issues;
    }

    // Detect issues from KPI metrics
    detectKPIIssues(kpi) {
        const issues = [];

        // High wastage detection
        const wastagePercent = kpi.wastage?.percentage || 0;
        if (wastagePercent >= this.thresholds.wastage.critical) {
            issues.push({
                type: 'high_wastage',
                title: `Critical Wastage Level: ${wastagePercent.toFixed(1)}%`,
                description: `Wastage has exceeded critical threshold of ${this.thresholds.wastage.critical}%. Top wastage items: ${kpi.wastage?.topItems?.join(', ') || 'Unknown'}. Immediate inventory review required.`,
                severity: 'critical',
                source: 'kpi_analysis',
                estimatedImpact: kpi.wastage?.value || 0,
                relatedData: {
                    currentValue: wastagePercent,
                    threshold: this.thresholds.wastage.critical,
                    topItems: kpi.wastage?.topItems
                }
            });
        } else if (wastagePercent >= this.thresholds.wastage.warning) {
            issues.push({
                type: 'high_wastage',
                title: `Elevated Wastage: ${wastagePercent.toFixed(1)}%`,
                description: `Wastage is above the warning threshold of ${this.thresholds.wastage.warning}%. Consider reviewing inventory management practices.`,
                severity: 'medium',
                source: 'kpi_analysis',
                estimatedImpact: kpi.wastage?.value || 0,
                relatedData: { currentValue: wastagePercent }
            });
        }

        // Low customer rating detection
        const avgRating = kpi.customerMetrics?.averageRating || 0;
        if (avgRating > 0 && avgRating <= this.thresholds.customerRating.critical) {
            issues.push({
                type: 'low_customer_rating',
                title: `Critical Customer Rating: ${avgRating.toFixed(1)}/5`,
                description: `Customer satisfaction is critically low. Common complaints: ${kpi.customerMetrics?.topComplaints?.join(', ') || 'Unknown'}. Urgent action needed.`,
                severity: 'critical',
                source: 'kpi_analysis',
                estimatedImpact: 0,
                relatedData: { currentValue: avgRating }
            });
        } else if (avgRating > 0 && avgRating <= this.thresholds.customerRating.warning) {
            issues.push({
                type: 'low_customer_rating',
                title: `Below Average Customer Rating: ${avgRating.toFixed(1)}/5`,
                description: `Customer rating is below the acceptable threshold. Review service quality and customer feedback.`,
                severity: 'medium',
                source: 'kpi_analysis',
                estimatedImpact: 0,
                relatedData: { currentValue: avgRating }
            });
        }

        // Revenue decline detection
        const revenueGrowth = kpi.revenue?.growth || 0;
        if (revenueGrowth <= -this.thresholds.revenueDropPercent.critical) {
            issues.push({
                type: 'revenue_decline',
                title: `Significant Revenue Drop: ${Math.abs(revenueGrowth).toFixed(1)}%`,
                description: `Revenue has declined significantly compared to the previous period. Analyze sales patterns and market conditions.`,
                severity: 'critical',
                source: 'kpi_analysis',
                estimatedImpact: Math.abs(kpi.revenue?.total * (Math.abs(revenueGrowth) / 100)) || 0,
                relatedData: { growthRate: revenueGrowth }
            });
        } else if (revenueGrowth <= -this.thresholds.revenueDropPercent.warning) {
            issues.push({
                type: 'revenue_decline',
                title: `Revenue Decline: ${Math.abs(revenueGrowth).toFixed(1)}%`,
                description: `Revenue is showing a declining trend. Monitor closely and consider promotional activities.`,
                severity: 'medium',
                source: 'kpi_analysis',
                estimatedImpact: 0,
                relatedData: { growthRate: revenueGrowth }
            });
        }

        // Low margin detection
        const marginPercent = kpi.margin?.gross || 0;
        if (marginPercent > 0 && marginPercent < 20) {
            issues.push({
                type: 'low_margin',
                title: `Low Profit Margin: ${marginPercent.toFixed(1)}%`,
                description: `Gross margin is below healthy levels. Review pricing strategy and cost structure.`,
                severity: marginPercent < 10 ? 'critical' : 'medium',
                source: 'kpi_analysis',
                estimatedImpact: 0,
                relatedData: { currentValue: marginPercent }
            });
        }

        // Slow-moving SKU detection
        if (kpi.skuPerformance?.slowMoving && kpi.skuPerformance.slowMoving.length > 5) {
            issues.push({
                type: 'slow_moving_inventory',
                title: `${kpi.skuPerformance.slowMoving.length} Slow-Moving SKUs Detected`,
                description: `Multiple products have low turnover rates. Consider markdowns or discontinuation: ${kpi.skuPerformance.slowMoving.slice(0, 3).join(', ')}...`,
                severity: 'low',
                source: 'kpi_analysis',
                estimatedImpact: 0,
                relatedData: { items: kpi.skuPerformance.slowMoving }
            });
        }

        return issues;
    }

    // Detect issues from customer feedback patterns
    detectFeedbackIssues(feedbackList) {
        const issues = [];

        // Count negative feedback
        const negativeFeedback = feedbackList.filter(f => f.sentiment === 'negative' || f.rating <= 2);
        const negativePercent = (negativeFeedback.length / feedbackList.length) * 100;

        if (negativePercent >= 30) {
            issues.push({
                type: 'customer_complaint_surge',
                title: `High Negative Feedback Rate: ${negativePercent.toFixed(0)}%`,
                description: `${negativeFeedback.length} out of ${feedbackList.length} recent feedback entries are negative. Immediate service review needed.`,
                severity: 'high',
                source: 'customer_feedback',
                estimatedImpact: 0,
                relatedData: { negativeCount: negativeFeedback.length, totalCount: feedbackList.length }
            });
        }

        // Detect recurring complaint categories
        const categoryCount = {};
        feedbackList.forEach(f => {
            if (f.rating <= 3) {
                f.categories?.forEach(cat => {
                    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
                });
            }
        });

        Object.entries(categoryCount).forEach(([category, count]) => {
            if (count >= 5) {
                issues.push({
                    type: 'recurring_complaint',
                    title: `Recurring Complaint: ${category.replace(/_/g, ' ')}`,
                    description: `${count} customers have complained about ${category.replace(/_/g, ' ')} in recent feedback.`,
                    severity: count >= 10 ? 'high' : 'medium',
                    source: 'customer_feedback',
                    estimatedImpact: 0,
                    relatedData: { category, count }
                });
            }
        });

        return issues;
    }

    // Detect issues from staff-reported logs
    detectStaffLogIssues(staffLogs) {
        const issues = [];

        // Group by log type
        const typeCount = {};
        staffLogs.forEach(log => {
            typeCount[log.logType] = (typeCount[log.logType] || 0) + 1;
        });

        // Stock-out frequency
        if (typeCount.stock_out >= this.thresholds.stockOutCount.critical) {
            issues.push({
                type: 'frequent_stock_outs',
                title: `Frequent Stock-Outs: ${typeCount.stock_out} incidents`,
                description: `Staff have reported ${typeCount.stock_out} stock-out incidents recently. Review reorder points and supplier lead times.`,
                severity: 'high',
                source: 'staff_logs',
                estimatedImpact: 0,
                relatedData: { count: typeCount.stock_out }
            });
        } else if (typeCount.stock_out >= this.thresholds.stockOutCount.warning) {
            issues.push({
                type: 'stock_out_warning',
                title: `Stock-Out Warning: ${typeCount.stock_out} incidents`,
                description: `Multiple stock-out incidents detected. Monitor inventory levels closely.`,
                severity: 'medium',
                source: 'staff_logs',
                estimatedImpact: 0,
                relatedData: { count: typeCount.stock_out }
            });
        }

        // Equipment breakdown frequency
        if (typeCount.equipment_breakdown >= 3) {
            issues.push({
                type: 'equipment_issues',
                title: `Equipment Problems: ${typeCount.equipment_breakdown} breakdowns`,
                description: `Multiple equipment breakdowns reported. Schedule maintenance review.`,
                severity: typeCount.equipment_breakdown >= 5 ? 'high' : 'medium',
                source: 'staff_logs',
                estimatedImpact: 0,
                relatedData: { count: typeCount.equipment_breakdown }
            });
        }

        // Delay incidents
        if (typeCount.delay >= this.thresholds.delayIncidents.critical) {
            issues.push({
                type: 'service_delays',
                title: `High Delay Rate: ${typeCount.delay} incidents`,
                description: `Staff have logged ${typeCount.delay} delay incidents. Review workflow and staffing levels.`,
                severity: 'high',
                source: 'staff_logs',
                estimatedImpact: 0,
                relatedData: { count: typeCount.delay }
            });
        }

        // Critical severity logs
        const criticalLogs = staffLogs.filter(l => l.severity === 'critical');
        if (criticalLogs.length > 0) {
            criticalLogs.forEach(log => {
                issues.push({
                    type: log.logType,
                    title: `URGENT: ${log.title}`,
                    description: log.description,
                    severity: 'critical',
                    source: 'staff_logs',
                    estimatedImpact: log.estimatedImpact || 0,
                    relatedData: { staffLogId: log._id }
                });
            });
        }

        return issues;
    }

    // Update thresholds based on business type
    setThresholdsForSector(sector) {
        const sectorThresholds = {
            restaurant: { wastage: { warning: 8, critical: 15 }, customerRating: { warning: 3.8, critical: 3.0 } },
            retail: { wastage: { warning: 5, critical: 10 }, stockOutCount: { warning: 2, critical: 5 } },
            grocery: { wastage: { warning: 12, critical: 20 } },
            cafe: { wastage: { warning: 10, critical: 18 }, customerRating: { warning: 4.0, critical: 3.2 } }
        };

        if (sectorThresholds[sector]) {
            this.thresholds = { ...this.thresholds, ...sectorThresholds[sector] };
        }
    }
}

module.exports = IssueDetector;

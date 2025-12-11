// Data Processor Service - Processes uploaded CSV/Excel data
// Handles data validation, transformation, and aggregation

const { Upload, KpiSnapshot, Issue } = require('../models');
const IssueDetector = require('./issueDetector');

class DataProcessor {
    constructor(businessId) {
        this.businessId = businessId;
    }

    // Main processing method - called after column mapping
    async processUpload(upload) {
        const data = upload.parsedData || [];
        const mapping = upload.columnMapping || {};
        const dataType = upload.dataType;

        if (data.length === 0) {
            throw new Error('No data to process');
        }

        let result;
        switch (dataType) {
            case 'sales':
                result = await this.processSalesData(data, mapping);
                break;
            case 'purchase':
                result = await this.processPurchaseData(data, mapping);
                break;
            case 'wastage':
                result = await this.processWastageData(data, mapping);
                break;
            case 'inventory':
                result = await this.processInventoryData(data, mapping);
                break;
            case 'staff':
                result = await this.processStaffData(data, mapping);
                break;
            default:
                throw new Error(`Unknown data type: ${dataType}`);
        }

        // Update upload status
        upload.status = 'completed';
        upload.processedAt = new Date();
        upload.validationResult = {
            isValid: true,
            errors: [],
            rowsProcessed: data.length,
            summary: result.summary
        };
        await upload.save();

        return result;
    }

    // Process sales transactions
    async processSalesData(data, mapping) {
        let totalRevenue = 0;
        let transactionCount = 0;
        const skuSales = {};
        const dailySales = {};

        data.forEach(row => {
            const date = this.parseDate(row[mapping.date]);
            const amount = this.parseNumber(row[mapping.amount]);
            const sku = row[mapping.sku] || 'Unknown';
            const quantity = this.parseNumber(row[mapping.quantity]) || 1;

            if (amount > 0) {
                totalRevenue += amount;
                transactionCount++;

                // Track SKU performance
                if (!skuSales[sku]) {
                    skuSales[sku] = { revenue: 0, quantity: 0, transactions: 0 };
                }
                skuSales[sku].revenue += amount;
                skuSales[sku].quantity += quantity;
                skuSales[sku].transactions++;

                // Track daily sales
                const dateKey = date ? date.toISOString().split('T')[0] : 'unknown';
                if (!dailySales[dateKey]) {
                    dailySales[dateKey] = { revenue: 0, transactions: 0 };
                }
                dailySales[dateKey].revenue += amount;
                dailySales[dateKey].transactions++;
            }
        });

        // Calculate metrics
        const avgTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
        const topSKUs = Object.entries(skuSales)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 10)
            .map(([sku, data]) => ({ sku, ...data }));
        const slowMovingSKUs = Object.entries(skuSales)
            .filter(([sku, data]) => data.transactions < 3)
            .map(([sku]) => sku);

        return {
            type: 'sales',
            summary: {
                totalRevenue,
                transactionCount,
                avgTransactionValue,
                topSKUsCount: topSKUs.length,
                slowMovingCount: slowMovingSKUs.length
            },
            metrics: {
                revenue: {
                    total: totalRevenue,
                    transactionCount,
                    avgTransactionValue
                },
                skuPerformance: {
                    topSelling: topSKUs.map(s => s.sku),
                    slowMoving: slowMovingSKUs
                },
                dailySales
            }
        };
    }

    // Process purchase/procurement data
    async processPurchaseData(data, mapping) {
        let totalCost = 0;
        let purchaseCount = 0;
        const supplierCosts = {};
        const itemCosts = {};

        data.forEach(row => {
            const amount = this.parseNumber(row[mapping.amount]);
            const item = row[mapping.item] || 'Unknown';
            const supplier = row[mapping.supplier] || 'Unknown';

            if (amount > 0) {
                totalCost += amount;
                purchaseCount++;

                // Track by supplier
                supplierCosts[supplier] = (supplierCosts[supplier] || 0) + amount;

                // Track by item
                if (!itemCosts[item]) {
                    itemCosts[item] = { cost: 0, count: 0 };
                }
                itemCosts[item].cost += amount;
                itemCosts[item].count++;
            }
        });

        const topSuppliers = Object.entries(supplierCosts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, cost]) => ({ name, cost }));

        return {
            type: 'purchase',
            summary: {
                totalCost,
                purchaseCount,
                uniqueSuppliers: Object.keys(supplierCosts).length,
                uniqueItems: Object.keys(itemCosts).length
            },
            metrics: {
                cogs: totalCost,
                supplierBreakdown: supplierCosts,
                topSuppliers
            }
        };
    }

    // Process wastage data
    async processWastageData(data, mapping) {
        let totalWastageValue = 0;
        let totalWastageQuantity = 0;
        const wastageByItem = {};
        const wastageByReason = {};

        data.forEach(row => {
            const item = row[mapping.item] || 'Unknown';
            const quantity = this.parseNumber(row[mapping.quantity]) || 0;
            const value = this.parseNumber(row[mapping.value]) || 0;
            const reason = row[mapping.reason] || 'unspecified';

            totalWastageQuantity += quantity;
            totalWastageValue += value;

            // Track by item
            if (!wastageByItem[item]) {
                wastageByItem[item] = { quantity: 0, value: 0 };
            }
            wastageByItem[item].quantity += quantity;
            wastageByItem[item].value += value;

            // Track by reason
            wastageByReason[reason] = (wastageByReason[reason] || 0) + value;
        });

        const topWastageItems = Object.entries(wastageByItem)
            .sort((a, b) => b[1].value - a[1].value)
            .slice(0, 10)
            .map(([item, data]) => item);

        return {
            type: 'wastage',
            summary: {
                totalValue: totalWastageValue,
                totalQuantity: totalWastageQuantity,
                uniqueItems: Object.keys(wastageByItem).length,
                topWastageItem: topWastageItems[0] || 'None'
            },
            metrics: {
                wastage: {
                    value: totalWastageValue,
                    quantity: totalWastageQuantity,
                    topItems: topWastageItems,
                    byReason: wastageByReason
                }
            }
        };
    }

    // Process inventory data
    async processInventoryData(data, mapping) {
        const inventory = {};
        let totalValue = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;

        data.forEach(row => {
            const item = row[mapping.item] || 'Unknown';
            const quantity = this.parseNumber(row[mapping.quantity]) || 0;
            const reorderLevel = this.parseNumber(row[mapping.reorder_level]) || 10;
            const unitCost = this.parseNumber(row[mapping.unit_cost]) || 0;

            inventory[item] = {
                quantity,
                reorderLevel,
                value: quantity * unitCost,
                status: quantity === 0 ? 'out_of_stock' :
                    quantity < reorderLevel ? 'low_stock' : 'in_stock'
            };

            totalValue += quantity * unitCost;
            if (quantity === 0) outOfStockCount++;
            else if (quantity < reorderLevel) lowStockCount++;
        });

        return {
            type: 'inventory',
            summary: {
                totalItems: Object.keys(inventory).length,
                totalValue,
                lowStockCount,
                outOfStockCount
            },
            metrics: {
                inventory,
                stockAlerts: {
                    outOfStock: Object.entries(inventory)
                        .filter(([k, v]) => v.status === 'out_of_stock')
                        .map(([k]) => k),
                    lowStock: Object.entries(inventory)
                        .filter(([k, v]) => v.status === 'low_stock')
                        .map(([k]) => k)
                }
            }
        };
    }

    // Process staff attendance/performance data
    async processStaffData(data, mapping) {
        const staffMetrics = {};
        let totalShifts = 0;
        let lateCount = 0;
        let absentCount = 0;

        data.forEach(row => {
            const staffName = row[mapping.staff_name] || 'Unknown';
            const date = this.parseDate(row[mapping.date]);
            const status = (row[mapping.status] || 'present').toLowerCase();
            const hoursWorked = this.parseNumber(row[mapping.hours]) || 8;

            if (!staffMetrics[staffName]) {
                staffMetrics[staffName] = {
                    totalShifts: 0,
                    lateCount: 0,
                    absentCount: 0,
                    totalHours: 0
                };
            }

            staffMetrics[staffName].totalShifts++;
            staffMetrics[staffName].totalHours += hoursWorked;
            totalShifts++;

            if (status === 'late') {
                staffMetrics[staffName].lateCount++;
                lateCount++;
            } else if (status === 'absent') {
                staffMetrics[staffName].absentCount++;
                absentCount++;
            }
        });

        return {
            type: 'staff',
            summary: {
                totalStaff: Object.keys(staffMetrics).length,
                totalShifts,
                lateCount,
                absentCount,
                attendanceRate: ((totalShifts - absentCount) / totalShifts * 100).toFixed(1)
            },
            metrics: {
                staffMetrics,
                punctualityRate: ((totalShifts - lateCount - absentCount) / totalShifts * 100).toFixed(1)
            }
        };
    }

    // Aggregate all processed data into a KPI snapshot
    async createKPISnapshot(processedResults, period = 'weekly') {
        const now = new Date();
        const periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 7);

        // Merge all metrics
        let revenue = { total: 0, growth: 0 };
        let wastage = { value: 0, percentage: 0, topItems: [] };
        let margin = { gross: 0 };
        let skuPerformance = { topSelling: [], slowMoving: [] };
        let customerMetrics = { averageRating: 0 };
        let staffMetrics = {};

        processedResults.forEach(result => {
            if (result.type === 'sales' && result.metrics.revenue) {
                revenue = { ...revenue, ...result.metrics.revenue };
            }
            if (result.type === 'wastage' && result.metrics.wastage) {
                wastage = { ...wastage, ...result.metrics.wastage };
            }
            if (result.metrics.skuPerformance) {
                skuPerformance = { ...skuPerformance, ...result.metrics.skuPerformance };
            }
            if (result.type === 'staff' && result.metrics.staffMetrics) {
                staffMetrics = result.metrics.staffMetrics;
            }
        });

        // Calculate wastage percentage
        if (revenue.total > 0 && wastage.value > 0) {
            wastage.percentage = (wastage.value / revenue.total) * 100;
        }

        // Calculate gross margin (if we have purchase data)
        const purchaseData = processedResults.find(r => r.type === 'purchase');
        if (purchaseData && revenue.total > 0) {
            const cogs = purchaseData.metrics.cogs || 0;
            margin.gross = ((revenue.total - cogs) / revenue.total) * 100;
        }

        // Calculate health score
        const healthScore = this.calculateHealthScore(revenue, wastage, customerMetrics.averageRating, margin.gross);

        const snapshot = await KpiSnapshot.create({
            business: this.businessId,
            period,
            periodStart,
            periodEnd: now,
            revenue,
            wastage,
            margin,
            skuPerformance,
            customerMetrics,
            staffMetrics,
            periodHealthScore: healthScore
        });

        // Run issue detection
        const issueDetector = new IssueDetector(this.businessId);
        const detectedIssues = issueDetector.detectKPIIssues(snapshot);

        // Create issues in database
        for (const issueData of detectedIssues) {
            await Issue.create({
                business: this.businessId,
                ...issueData,
                status: 'open'
            });
        }

        return snapshot;
    }

    calculateHealthScore(revenue, wastage, customerRating, margin) {
        let score = 50; // Base score

        // Revenue factor (up to +15)
        if (revenue.growth > 0) score += Math.min(15, revenue.growth);
        else score += Math.max(-15, revenue.growth);

        // Wastage factor (up to -20)
        if (wastage.percentage > 0) {
            score -= Math.min(20, wastage.percentage);
        }

        // Customer rating factor (up to +20)
        if (customerRating > 0) {
            score += (customerRating - 3) * 10; // Rating above 3 adds points
        }

        // Margin factor (up to +15)
        if (margin > 30) score += 15;
        else if (margin > 20) score += 10;
        else if (margin > 10) score += 5;
        else if (margin > 0) score -= 5;

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    // Helper methods
    parseDate(value) {
        if (!value) return null;
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    }

    parseNumber(value) {
        if (!value) return 0;
        const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? 0 : num;
    }
}

module.exports = DataProcessor;

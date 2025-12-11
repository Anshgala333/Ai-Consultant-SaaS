/**
 * Seed script to populate database with demo data
 * Run with: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const {
    Business,
    Outlet,
    KpiSnapshot,
    Issue,
    Feedback,
    StaffLog,
    Recommendation,
    Experiment
} = require('./models');

const seedData = async () => {
    try {
        await connectDB();

        console.log('🧹 Clearing existing data...');
        await Promise.all([
            Business.deleteMany({}),
            Outlet.deleteMany({}),
            KpiSnapshot.deleteMany({}),
            Issue.deleteMany({}),
            Feedback.deleteMany({}),
            StaffLog.deleteMany({}),
            Recommendation.deleteMany({}),
            Experiment.deleteMany({})
        ]);

        console.log('🏢 Creating demo businesses...');

        // Create admin user
        const admin = await Business.create({
            email: 'admin@aiconsultant.com',
            password: 'admin123',
            businessName: 'AI Consultant Admin',
            sector: 'other',
            revenueRange: '1Cr-5Cr',
            isAdmin: true,
            isPilot: false,
            onboardingCompleted: true
        });

        // Create demo SME business
        const demoBusiness = await Business.create({
            email: 'demo@restaurant.com',
            password: 'demo123',
            businessName: 'Demo Restaurant Chain',
            sector: 'restaurant',
            outletCount: 3,
            revenueRange: '25-50L',
            baselineMetrics: {
                monthlyRevenue: 3500000,
                cogs: 1400000,
                staffCost: 700000,
                estimatedWastage: 12,
                customerRating: 3.8
            },
            primaryObjective: 'wastage',
            healthScore: 65,
            onboardingCompleted: true,
            isPilot: true
        });

        console.log('📍 Creating outlets...');
        const outlets = await Outlet.insertMany([
            { business: demoBusiness._id, name: 'Main Branch', address: { city: 'Mumbai', state: 'Maharashtra' } },
            { business: demoBusiness._id, name: 'Mall Outlet', address: { city: 'Mumbai', state: 'Maharashtra' } },
            { business: demoBusiness._id, name: 'Express Counter', address: { city: 'Pune', state: 'Maharashtra' } }
        ]);

        console.log('📊 Creating KPI snapshots...');
        const now = new Date();
        const kpiSnapshots = [];

        for (let i = 0; i < 8; i++) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            kpiSnapshots.push({
                business: demoBusiness._id,
                period: 'weekly',
                periodStart: weekStart,
                periodEnd: weekEnd,
                revenue: {
                    total: 800000 + Math.random() * 200000 - (i * 10000),
                    growth: i === 0 ? 5 : Math.random() * 10 - 5,
                    trend: 'up'
                },
                wastage: {
                    percentage: 12 - (i < 4 ? (4 - i) * 0.5 : 0),
                    value: 50000 + Math.random() * 20000,
                    trend: 'down'
                },
                margin: {
                    gross: 280000 + Math.random() * 50000,
                    net: 100000 + Math.random() * 30000,
                    proxy: 35
                },
                customerMetrics: {
                    averageRating: 3.8 + (i < 4 ? (4 - i) * 0.1 : 0),
                    feedbackCount: 50 + Math.floor(Math.random() * 30)
                },
                staffMetrics: {
                    logsCount: 15 + Math.floor(Math.random() * 10),
                    issuesReported: 5 + Math.floor(Math.random() * 5)
                },
                periodHealthScore: 65 + (i < 4 ? (4 - i) * 3 : 0),
                isBaseline: i === 7
            });
        }
        await KpiSnapshot.insertMany(kpiSnapshots);

        console.log('⚠️ Creating issues...');
        await Issue.insertMany([
            {
                business: demoBusiness._id,
                outlet: outlets[0]._id,
                type: 'high_wastage',
                title: 'Food wastage above threshold',
                description: 'Daily wastage in kitchen exceeds 15% for the past week',
                severity: 'high',
                estimatedImpact: 25000,
                source: 'kpi_engine',
                status: 'open'
            },
            {
                business: demoBusiness._id,
                outlet: outlets[1]._id,
                type: 'rating_drop',
                title: 'Customer rating declined to 3.5',
                description: 'Mall outlet ratings dropping due to slow service',
                severity: 'medium',
                source: 'customer_feedback',
                status: 'acknowledged'
            },
            {
                business: demoBusiness._id,
                type: 'stock_out',
                title: 'Frequent stock-outs on weekends',
                description: 'Popular items running out on Saturday evenings',
                severity: 'high',
                estimatedImpact: 40000,
                source: 'staff_log',
                status: 'in_progress'
            },
            {
                business: demoBusiness._id,
                type: 'declining_sales',
                title: 'Lunch sales declining',
                description: 'Weekday lunch revenue down 15% compared to last month',
                severity: 'medium',
                source: 'kpi_engine',
                status: 'resolved',
                resolvedAt: new Date(),
                resolutionNotes: 'Launched new lunch combo offers'
            }
        ]);

        console.log('💬 Creating customer feedback...');
        const feedbackEntries = [];
        const categories = ['food_quality', 'service_speed', 'staff_behavior', 'cleanliness', 'value_for_money'];
        const comments = [
            'Great food but slow service',
            'Loved the ambiance!',
            'Food was cold when served',
            'Best biryani in town',
            'Prices are reasonable',
            'Staff was very helpful',
            'Had to wait too long',
            'Will definitely come back'
        ];

        for (let i = 0; i < 30; i++) {
            const rating = Math.floor(Math.random() * 3) + 3; // 3-5 rating
            feedbackEntries.push({
                business: demoBusiness._id,
                outlet: outlets[Math.floor(Math.random() * outlets.length)]._id,
                rating,
                categories: [categories[Math.floor(Math.random() * categories.length)]],
                comment: Math.random() > 0.5 ? comments[Math.floor(Math.random() * comments.length)] : undefined,
                sentiment: rating >= 4 ? 'positive' : rating >= 3 ? 'neutral' : 'negative',
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            });
        }
        await Feedback.insertMany(feedbackEntries);

        console.log('📝 Creating staff logs...');
        await StaffLog.insertMany([
            {
                business: demoBusiness._id,
                outlet: outlets[0]._id,
                staffName: 'Rahul Kumar',
                staffRole: 'manager',
                logType: 'wastage_incident',
                title: 'Expired ingredients found',
                description: 'Found 5kg of expired vegetables in cold storage',
                severity: 'high',
                estimatedImpact: 2000,
                status: 'reviewed'
            },
            {
                business: demoBusiness._id,
                outlet: outlets[1]._id,
                staffName: 'Priya Sharma',
                staffRole: 'staff',
                logType: 'stock_out',
                title: 'Chicken out of stock',
                description: 'Ran out of chicken by 7 PM on Saturday',
                severity: 'medium',
                status: 'pending'
            },
            {
                business: demoBusiness._id,
                outlet: outlets[2]._id,
                staffName: 'Amit Patel',
                staffRole: 'kitchen',
                logType: 'equipment_breakdown',
                title: 'Refrigerator not cooling',
                description: 'Main fridge temperature rising, needs repair',
                severity: 'critical',
                status: 'escalated'
            }
        ]);

        console.log('💡 Creating recommendations...');
        const recommendations = await Recommendation.insertMany([
            {
                business: demoBusiness._id,
                title: 'Implement Daily Stock Audit',
                description: 'Conduct daily stock audits at closing to identify wastage patterns and reduce inventory loss.',
                impact: 'high',
                difficulty: 'easy',
                timeframe: '1_week',
                category: 'wastage_reduction',
                expectedImprovement: { metric: 'wastage_percentage', percentageImprovement: 15 },
                aiGenerated: true,
                status: 'converted_to_experiment'
            },
            {
                business: demoBusiness._id,
                title: 'Launch Lunch Combo Offers',
                description: 'Create value-for-money lunch combos to boost weekday sales and attract office-goers.',
                impact: 'high',
                difficulty: 'easy',
                timeframe: 'immediate',
                category: 'revenue_growth',
                expectedImprovement: { metric: 'revenue', percentageImprovement: 12 },
                aiGenerated: true,
                status: 'accepted'
            },
            {
                business: demoBusiness._id,
                title: 'Staff Training on Customer Service',
                description: 'Conduct a 2-hour training session focusing on handling peak hours and improving service speed.',
                impact: 'medium',
                difficulty: 'medium',
                timeframe: '2_weeks',
                category: 'customer_experience',
                expectedImprovement: { metric: 'customer_rating', percentageImprovement: 8 },
                aiGenerated: true,
                status: 'pending'
            },
            {
                business: demoBusiness._id,
                title: 'FIFO Inventory Management',
                description: 'Implement First-In-First-Out system with color-coded labels to reduce expiry wastage.',
                impact: 'high',
                difficulty: 'easy',
                timeframe: '1_week',
                category: 'wastage_reduction',
                expectedImprovement: { metric: 'wastage_percentage', percentageImprovement: 20 },
                aiGenerated: true,
                status: 'pending'
            }
        ]);

        console.log('🧪 Creating experiments...');
        await Experiment.insertMany([
            {
                business: demoBusiness._id,
                recommendation: recommendations[0]._id,
                title: 'Daily Stock Audit Implementation',
                targetKPI: 'wastage_percentage',
                expectedImprovement: { percentage: 15 },
                startDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
                durationWeeks: 4,
                beforeMetrics: { kpiValue: 12, capturedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) },
                afterMetrics: { kpiValue: 9.5, capturedAt: new Date() },
                actualImprovement: { percentage: -20.8, absoluteValue: -2.5, success: true },
                weeklyUpdates: [
                    { week: 1, status: 'on_track', notes: 'Staff trained on audit process' },
                    { week: 2, status: 'on_track', notes: 'Wastage reduced by 10%' },
                    { week: 3, status: 'on_track', notes: 'Consistent improvements seen' }
                ],
                status: 'completed',
                completedAt: new Date(),
                estimatedMonthlySavings: 15000
            },
            {
                business: demoBusiness._id,
                recommendation: recommendations[1]._id,
                title: 'Lunch Combo Launch',
                targetKPI: 'revenue',
                expectedImprovement: { percentage: 12 },
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                durationWeeks: 4,
                beforeMetrics: { kpiValue: 750000, capturedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
                weeklyUpdates: [
                    { week: 1, status: 'on_track', notes: 'Combo menu launched, good initial response' }
                ],
                status: 'active'
            }
        ]);

        // Update recommendation with linked experiment
        recommendations[0].linkedExperiment = (await Experiment.findOne({ title: 'Daily Stock Audit Implementation' }))._id;
        await recommendations[0].save();

        console.log('✅ Seed data created successfully!');
        console.log('\n📋 Demo Credentials:');
        console.log('   Admin: admin@aiconsultant.com / admin123');
        console.log('   SME User: demo@restaurant.com / demo123\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

seedData();

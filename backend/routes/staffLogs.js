const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { StaffLog, Issue, Outlet } = require('../models');
const { protect, protectEmployee } = require('../middleware/auth');

// @route   POST /api/staff-logs
// @desc    Create staff log (Module 6)
// @access  Private (staff access via simple auth)
router.post('/', [
    body('staffName').trim().notEmpty(),
    body('logType').notEmpty(),
    body('title').trim().notEmpty(),
    body('description').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            businessId,
            outletId,
            staffName,
            staffRole,
            logType,
            title,
            description,
            severity,
            relatedItems,
            estimatedImpact,
            immediateAction,
            incidentTime,
            attachments,
            customFields
        } = req.body;

        // Create staff log
        const staffLog = await StaffLog.create({
            business: businessId || req.business?._id,
            outlet: outletId,
            staffName,
            staffRole: staffRole || 'staff',
            logType,
            title,
            description,
            severity: severity || 'medium',
            relatedItems: relatedItems || [],
            estimatedImpact: estimatedImpact || 0,
            immediateAction: immediateAction,
            incidentTime: incidentTime || new Date(),
            attachments: attachments || [],
            customFields: customFields || {}
        });

        // Auto-create issue for high severity logs
        if (severity === 'high' || severity === 'critical' ||
            ['stock_out', 'equipment_breakdown', 'customer_complaint'].includes(logType)) {

            const issueTypeMap = {
                'stock_out': 'stock_out',
                'delay': 'staff_delay',
                'customer_complaint': 'customer_complaint',
                'wastage_incident': 'high_wastage',
                'equipment_breakdown': 'equipment_breakdown'
            };

            const issue = await Issue.create({
                business: staffLog.business,
                outlet: outletId,
                type: issueTypeMap[logType] || 'inventory_issue',
                title: title,
                description: description,
                severity: severity || 'medium',
                source: 'staff_log',
                estimatedImpact: estimatedImpact || 0,
                relatedData: { staffLogId: staffLog._id }
            });

            staffLog.linkedIssue = issue._id;
            await staffLog.save();
        }

        res.status(201).json({
            message: 'Log submitted successfully',
            log: staffLog
        });
    } catch (error) {
        console.error('Staff log error:', error);
        res.status(500).json({ message: 'Failed to submit log' });
    }
});

// @route   GET /api/staff-logs
// @desc    Get all staff logs for business
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const { outlet, logType, status, limit = 50 } = req.query;

        const filter = { business: req.business._id };
        if (outlet) filter.outlet = outlet;
        if (logType) filter.logType = logType;
        if (status) filter.status = status;

        const logs = await StaffLog.find(filter)
            .sort({ incidentTime: -1 })
            .limit(parseInt(limit))
            .populate('outlet', 'name')
            .populate('linkedIssue', 'status');

        res.json(logs);
    } catch (error) {
        console.error('Get staff logs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/staff-logs/summary
// @desc    Get staff logs summary for dashboard
// @access  Private
router.get('/summary', protect, async (req, res) => {
    try {
        const [byType, byStatus, recent] = await Promise.all([
            StaffLog.aggregate([
                { $match: { business: req.business._id } },
                { $group: { _id: '$logType', count: { $sum: 1 } } }
            ]),
            StaffLog.aggregate([
                { $match: { business: req.business._id } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            StaffLog.find({ business: req.business._id })
                .sort({ incidentTime: -1 })
                .limit(5)
                .select('title logType severity staffName incidentTime')
        ]);

        const totalPending = byStatus.find(s => s._id === 'pending')?.count || 0;

        res.json({
            totalLogs: byType.reduce((sum, t) => sum + t.count, 0),
            pendingReview: totalPending,
            byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
            recentLogs: recent
        });
    } catch (error) {
        console.error('Get staff logs summary error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/staff-logs/:id/status
// @desc    Update staff log status
// @access  Private
router.put('/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;

        const log = await StaffLog.findOneAndUpdate(
            { _id: req.params.id, business: req.business._id },
            { status },
            { new: true }
        );

        if (!log) {
            return res.status(404).json({ message: 'Log not found' });
        }

        res.json(log);
    } catch (error) {
        console.error('Update staff log error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/staff-logs/form-config
// @desc    Get form configuration for staff log types
// @access  Public
router.get('/form-config', (req, res) => {
    res.json({
        logTypes: [
            { value: 'stock_out', label: 'Stock Out', icon: '📦' },
            { value: 'delay', label: 'Delay', icon: '⏱️' },
            { value: 'customer_complaint', label: 'Customer Complaint', icon: '😠' },
            { value: 'wastage_incident', label: 'Wastage Incident', icon: '🗑️' },
            { value: 'equipment_breakdown', label: 'Equipment Breakdown', icon: '🔧' },
            { value: 'staff_shortage', label: 'Staff Shortage', icon: '👥' },
            { value: 'quality_issue', label: 'Quality Issue', icon: '⚠️' },
            { value: 'other', label: 'Other', icon: '📝' }
        ],
        severityLevels: [
            { value: 'low', label: 'Low', color: '#4CAF50' },
            { value: 'medium', label: 'Medium', color: '#FF9800' },
            { value: 'high', label: 'High', color: '#f44336' },
            { value: 'critical', label: 'Critical', color: '#9C27B0' }
        ],
        staffRoles: [
            { value: 'manager', label: 'Manager' },
            { value: 'supervisor', label: 'Supervisor' },
            { value: 'staff', label: 'Staff' },
            { value: 'cashier', label: 'Cashier' },
            { value: 'kitchen', label: 'Kitchen Staff' },
            { value: 'delivery', label: 'Delivery' },
            { value: 'other', label: 'Other' }
        ]
    });
});

// @route   POST /api/staff-logs/employee
// @desc    Create staff log as authenticated employee
// @access  Private (Employee)
router.post('/employee', protectEmployee, [
    body('logType').notEmpty(),
    body('title').trim().notEmpty(),
    body('description').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            logType,
            title,
            description,
            severity,
            outletId,
            estimatedImpact,
            immediateAction,
            incidentTime,
            attachments,
            customFields
        } = req.body;

        // Map Employee role to StaffLog staffRole enum values
        // Employee roles: ['employee', 'manager', 'supervisor']
        // StaffLog roles: ['manager', 'supervisor', 'staff', 'cashier', 'kitchen', 'delivery', 'other']
        const roleMapping = {
            'employee': 'staff',
            'manager': 'manager',
            'supervisor': 'supervisor'
        };
        const mappedRole = roleMapping[req.employee.role] || 'staff';

        // Auto-populate from authenticated employee
        const staffLog = await StaffLog.create({
            business: req.employee.businessId._id,
            outlet: outletId || req.employee.outletId || undefined,
            staffName: req.employee.name,
            staffRole: mappedRole,
            logType,
            title,
            description,
            severity: severity || 'medium',
            relatedItems: [],
            estimatedImpact: estimatedImpact || 0,
            immediateAction: immediateAction,
            incidentTime: incidentTime || new Date(),
            attachments: attachments || [],
            customFields: customFields || {}
        });

        // Auto-create issue for high severity logs
        if (severity === 'high' || severity === 'critical' ||
            ['stock_out', 'equipment_breakdown', 'customer_complaint'].includes(logType)) {

            const issueTypeMap = {
                'stock_out': 'stock_out',
                'delay': 'staff_delay',
                'customer_complaint': 'customer_complaint',
                'wastage_incident': 'high_wastage',
                'equipment_breakdown': 'equipment_breakdown'
            };

            const issue = await Issue.create({
                business: staffLog.business,
                outlet: outletId || undefined,
                type: issueTypeMap[logType] || 'inventory_issue',
                title: title,
                description: description,
                severity: severity || 'medium',
                source: 'staff_log',
                estimatedImpact: estimatedImpact || 0,
                relatedData: { staffLogId: staffLog._id }
            });

            staffLog.linkedIssue = issue._id;
            await staffLog.save();
        }

        res.status(201).json({
            message: 'Log submitted successfully',
            log: staffLog
        });
    } catch (error) {
        console.error('Employee staff log error:', error);
        res.status(500).json({ message: 'Failed to submit log' });
    }
});

// @route   GET /api/staff-logs/employee/all
// @desc    Get all staff logs for employee's business
// @access  Private (Employee)
router.get('/employee/all', protectEmployee, async (req, res) => {
    try {
        const { limit = 50, skip = 0 } = req.query;

        const logs = await StaffLog.find({ business: req.employee.businessId._id })
            .sort({ incidentTime: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .populate('outlet', 'name')
            .populate('linkedIssue', 'status');

        res.json(logs);
    } catch (error) {
        console.error('Get employee staff logs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/staff-logs/recent
// @desc    Get recent staff logs for real-time polling
// @access  Private (Employee or Business)
router.get('/recent', async (req, res) => {
    try {
        const { businessId, since } = req.query;

        if (!businessId || !since) {
            return res.status(400).json({ message: 'businessId and since timestamp required' });
        }

        const sinceDate = new Date(parseInt(since));

        const logs = await StaffLog.find({
            business: businessId,
            createdAt: { $gt: sinceDate }
        })
            .sort({ createdAt: -1 })
            .populate('outlet', 'name')
            .populate('linkedIssue', 'status');

        res.json(logs);
    } catch (error) {
        console.error('Get recent staff logs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

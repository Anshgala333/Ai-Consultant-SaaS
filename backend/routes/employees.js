const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { Employee, Business } = require('../models');
const { protect } = require('../middleware/auth');

// Generate random password
const generatePassword = () => {
    return crypto.randomBytes(6).toString('base64').slice(0, 10);
};

// @route   POST /api/employees
// @desc    Create a new employee (company only)
// @access  Private (Business)
router.post('/', protect, [
    body('email').isEmail().normalizeEmail(),
    body('name').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, name, outletId, role } = req.body;

        // Check if employee exists
        const existingEmployee = await Employee.findOne({ email });
        if (existingEmployee) {
            return res.status(400).json({ message: 'Employee with this email already exists' });
        }

        // If outletId provided, verify it belongs to this business
        if (outletId) {
            const { Outlet } = require('../models');
            const outlet = await Outlet.findOne({ _id: outletId, business: req.business._id });
            if (!outlet) {
                return res.status(400).json({ message: 'Invalid outlet selected' });
            }
        }

        // Generate password
        const plainPassword = generatePassword();

        // Create employee
        const employee = await Employee.create({
            email,
            name,
            password: plainPassword,
            businessId: req.business._id,
            outletId: outletId || undefined,
            role: role || 'employee',
            firstLoginCompleted: false,
            requirePasswordChange: true
        });

        // Populate outlet info for response
        const populatedEmployee = await Employee.findById(employee._id)
            .populate('outletId', 'name')
            .select('-password');

        // Return employee with plain password (only shown once)
        res.status(201).json({
            _id: populatedEmployee._id,
            email: populatedEmployee.email,
            name: populatedEmployee.name,
            outletId: populatedEmployee.outletId,
            role: populatedEmployee.role,
            isActive: populatedEmployee.isActive,
            generatedPassword: plainPassword // Only returned on creation
        });
    } catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/employees
// @desc    Get all employees for the business
// @access  Private (Business)
router.get('/', protect, async (req, res) => {
    try {
        const employees = await Employee.find({ businessId: req.business._id })
            .select('-password')
            .populate('outletId', 'name')
            .sort({ createdAt: -1 });

        res.json(employees);
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/employees/:id
// @desc    Deactivate an employee
// @access  Private (Business)
router.delete('/:id', protect, async (req, res) => {
    try {
        const employee = await Employee.findOne({
            _id: req.params.id,
            businessId: req.business._id
        });

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        employee.isActive = false;
        await employee.save();

        res.json({ message: 'Employee deactivated successfully' });
    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/employees/:id/reactivate
// @desc    Reactivate an employee
// @access  Private (Business)
router.put('/:id/reactivate', protect, async (req, res) => {
    try {
        const employee = await Employee.findOne({
            _id: req.params.id,
            businessId: req.business._id
        });

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        employee.isActive = true;
        await employee.save();

        res.json({ message: 'Employee reactivated successfully' });
    } catch (error) {
        console.error('Reactivate employee error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

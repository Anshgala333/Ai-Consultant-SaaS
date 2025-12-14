const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Business, Employee } = require('../models');
const { protect, protectEmployee, generateToken, generateEmployeeToken } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new business
// @access  Public
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('businessName').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, businessName } = req.body;

        // Check if business exists
        const existingBusiness = await Business.findOne({ email });
        if (existingBusiness) {
            return res.status(400).json({ message: 'Business already registered with this email' });
        }

        // Create business
        const business = await Business.create({
            email,
            password,
            businessName,
            sector: 'other',
            revenueRange: '0-10L'
        });

        res.status(201).json({
            _id: business._id,
            email: business.email,
            businessName: business.businessName,
            onboardingCompleted: business.onboardingCompleted,
            token: generateToken(business._id)
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate business & get token
// @access  Public
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find business
        const business = await Business.findOne({ email });
        if (!business) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await business.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        res.json({
            _id: business._id,
            email: business.email,
            businessName: business.businessName,
            onboardingCompleted: business.onboardingCompleted,
            isAdmin: business.isAdmin,
            userType: 'business',
            token: generateToken(business._id)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/employee-login
// @desc    Authenticate employee & get token
// @access  Public
router.post('/employee-login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find employee
        const employee = await Employee.findOne({ email }).populate('businessId', 'businessName');
        if (!employee) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if active
        if (!employee.isActive) {
            return res.status(401).json({ message: 'Account is deactivated. Please contact your employer.' });
        }

        // Check password
        const isMatch = await employee.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        res.json({
            _id: employee._id,
            email: employee.email,
            name: employee.name,
            businessId: employee.businessId._id,
            businessName: employee.businessId.businessName,
            userType: 'employee',
            token: generateEmployeeToken(employee._id)
        });
    } catch (error) {
        console.error('Employee login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/auth/me
// @desc    Get current business profile
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const business = await Business.findById(req.business._id).select('-password');
        res.json({ ...business.toObject(), userType: 'business' });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/auth/employee/me
// @desc    Get current employee profile
// @access  Private (Employee)
router.get('/employee/me', protectEmployee, async (req, res) => {
    try {
        const employee = await Employee.findById(req.employee._id)
            .select('-password')
            .populate('businessId', 'businessName');
        res.json({ ...employee.toObject(), userType: 'employee' });
    } catch (error) {
        console.error('Get employee profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

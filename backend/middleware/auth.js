const jwt = require('jsonwebtoken');
const { Business, Employee } = require('../models');

// Protect routes - require authentication
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.business = await Business.findById(decoded.id).select('-password');

            if (!req.business) {
                return res.status(401).json({ message: 'Business not found' });
            }

            next();
        } catch (error) {
            console.error('Auth error:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Protect employee routes - require employee authentication
const protectEmployee = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Check if it's an employee token
            if (!decoded.isEmployee) {
                return res.status(401).json({ message: 'Not authorized as employee' });
            }

            req.employee = await Employee.findById(decoded.id).select('-password').populate('businessId', 'businessName');

            if (!req.employee) {
                return res.status(401).json({ message: 'Employee not found' });
            }

            if (!req.employee.isActive) {
                return res.status(401).json({ message: 'Employee account is deactivated' });
            }

            next();
        } catch (error) {
            console.error('Employee auth error:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
    if (req.business && req.business.isAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as admin' });
    }
};

// Generate JWT token for business
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// Generate JWT token for employee
const generateEmployeeToken = (id) => {
    return jwt.sign({ id, isEmployee: true }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

module.exports = { protect, protectEmployee, adminOnly, generateToken, generateEmployeeToken };


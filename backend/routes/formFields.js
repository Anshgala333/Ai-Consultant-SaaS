const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { FormFieldConfig } = require('../models');
const { protect } = require('../middleware/auth');

// @route   GET /api/form-fields/:businessId
// @desc    Get form field configuration for a business
// @access  Public (for employee access)
router.get('/:businessId', async (req, res) => {
    try {
        const fields = await FormFieldConfig.find({
            businessId: req.params.businessId,
            isActive: true
        }).sort({ order: 1 });

        res.json(fields);
    } catch (error) {
        console.error('Get form fields error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/form-fields
// @desc    Create a new form field
// @access  Private (Business only)
router.post('/', protect, [
    body('fieldName').trim().notEmpty(),
    body('fieldType').isIn(['text', 'textarea', 'number', 'select', 'date', 'file']),
    body('label').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { fieldName, fieldType, label, placeholder, required, options, order } = req.body;

        const field = await FormFieldConfig.create({
            businessId: req.business._id,
            fieldName,
            fieldType,
            label,
            placeholder,
            required: required || false,
            options: options || [],
            order: order || 0
        });

        res.status(201).json(field);
    } catch (error) {
        console.error('Create form field error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/form-fields/:id
// @desc    Update a form field
// @access  Private (Business only)
router.put('/:id', protect, async (req, res) => {
    try {
        const { label, placeholder, required, options, order, isActive } = req.body;

        const field = await FormFieldConfig.findOneAndUpdate(
            { _id: req.params.id, businessId: req.business._id },
            { label, placeholder, required, options, order, isActive },
            { new: true, runValidators: true }
        );

        if (!field) {
            return res.status(404).json({ message: 'Form field not found' });
        }

        res.json(field);
    } catch (error) {
        console.error('Update form field error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/form-fields/:id
// @desc    Delete (deactivate) a form field
// @access  Private (Business only)
router.delete('/:id', protect, async (req, res) => {
    try {
        const field = await FormFieldConfig.findOneAndUpdate(
            { _id: req.params.id, businessId: req.business._id },
            { isActive: false },
            { new: true }
        );

        if (!field) {
            return res.status(404).json({ message: 'Form field not found' });
        }

        res.json({ message: 'Form field deleted successfully' });
    } catch (error) {
        console.error('Delete form field error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

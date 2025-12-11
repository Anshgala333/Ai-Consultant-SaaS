const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { Upload, Business } = require('../models');
const { protect } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedTypes.includes(file.mimetype) ||
        file.originalname.match(/\.(csv|xlsx|xls)$/)) {
        cb(null, true);
    } else {
        cb(new Error('Only CSV and Excel files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Parse CSV file
const parseCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
};

// Parse Excel file
const parseExcel = (filePath) => {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(sheet);
};

// @route   POST /api/upload
// @desc    Upload CSV/Excel file (Module 2)
// @access  Private
router.post('/', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { dataType } = req.body;
        if (!dataType) {
            return res.status(400).json({ message: 'Data type is required' });
        }

        const filePath = req.file.path;
        const fileExt = path.extname(req.file.originalname).toLowerCase().slice(1);

        // Parse file to get headers and preview
        let data;
        if (fileExt === 'csv') {
            data = await parseCSV(filePath);
        } else {
            data = parseExcel(filePath);
        }

        const headers = data.length > 0 ? Object.keys(data[0]) : [];
        const previewData = data.slice(0, 100);

        // Create upload record
        const uploadRecord = await Upload.create({
            business: req.business._id,
            filename: req.file.filename,
            originalName: req.file.originalname,
            fileType: fileExt,
            fileSize: req.file.size,
            dataType,
            headers,
            previewData,
            status: 'mapping',
            summary: {
                totalRows: data.length
            }
        });

        // Update business last upload time
        await Business.findByIdAndUpdate(req.business._id, {
            lastDataUpload: new Date()
        });

        res.status(201).json({
            message: 'File uploaded successfully',
            upload: uploadRecord,
            headers,
            previewRows: previewData.slice(0, 5)
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'File upload failed', error: error.message });
    }
});

// @route   PUT /api/upload/:id/mapping
// @desc    Save column mapping (Module 2)
// @access  Private
router.put('/:id/mapping', protect, async (req, res) => {
    try {
        const { columnMapping } = req.body;

        const uploadRecord = await Upload.findOne({
            _id: req.params.id,
            business: req.business._id
        });

        if (!uploadRecord) {
            return res.status(404).json({ message: 'Upload not found' });
        }

        uploadRecord.columnMapping = new Map(Object.entries(columnMapping));
        uploadRecord.status = 'processing';
        await uploadRecord.save();

        // Trigger KPI processing (async)
        // This would normally be a queue job
        processUploadData(uploadRecord._id);

        res.json({
            message: 'Column mapping saved, processing started',
            upload: uploadRecord
        });
    } catch (error) {
        console.error('Mapping error:', error);
        res.status(500).json({ message: 'Failed to save mapping' });
    }
});

// Process upload data with DataProcessor service
const DataProcessor = require('../services/dataProcessor');
const fsPromises = require('fs').promises;

const processUploadData = async (uploadId) => {
    try {
        const uploadRecord = await Upload.findById(uploadId).populate('business');
        if (!uploadRecord) {
            console.error('Upload not found:', uploadId);
            return;
        }

        // Re-parse the file to get full data
        const filePath = path.join(__dirname, '../uploads', uploadRecord.filename);
        let fullData;

        try {
            if (uploadRecord.fileType === 'csv') {
                fullData = await parseCSV(filePath);
            } else {
                fullData = parseExcel(filePath);
            }
        } catch (parseError) {
            // If file not found, use preview data
            fullData = uploadRecord.previewData || [];
        }

        // Store parsed data for processing
        uploadRecord.parsedData = fullData;

        // Process with DataProcessor
        const processor = new DataProcessor(uploadRecord.business._id || uploadRecord.business);
        const result = await processor.processUpload(uploadRecord);

        // Create KPI snapshot if we have enough data
        if (result && result.metrics) {
            await processor.createKPISnapshot([result]);
        }

        // Update upload with detailed summary
        uploadRecord.status = 'completed';
        uploadRecord.processedAt = new Date();
        uploadRecord.validationResult = {
            isValid: true,
            errors: [],
            rowsProcessed: fullData.length,
            summary: result.summary
        };
        await uploadRecord.save();

        console.log(`Upload ${uploadId} processed successfully:`, result.summary);
    } catch (error) {
        console.error('Processing error:', error);

        // Update upload with error status
        try {
            await Upload.findByIdAndUpdate(uploadId, {
                status: 'failed',
                validationResult: {
                    isValid: false,
                    errors: [{ message: error.message }]
                }
            });
        } catch (updateError) {
            console.error('Failed to update upload status:', updateError);
        }
    }
};

// @route   GET /api/upload
// @desc    Get all uploads for business
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const uploads = await Upload.find({ business: req.business._id })
            .sort({ createdAt: -1 })
            .select('-previewData');
        res.json(uploads);
    } catch (error) {
        console.error('Get uploads error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/upload/:id
// @desc    Get upload details
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const uploadRecord = await Upload.findOne({
            _id: req.params.id,
            business: req.business._id
        });

        if (!uploadRecord) {
            return res.status(404).json({ message: 'Upload not found' });
        }

        res.json(uploadRecord);
    } catch (error) {
        console.error('Get upload error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/upload/mapping-suggestions/:dataType
// @desc    Get suggested column mappings for data type
// @access  Private
router.get('/mapping-suggestions/:dataType', protect, (req, res) => {
    const { dataType } = req.params;

    const suggestions = {
        sales: {
            required: ['date', 'amount', 'sku'],
            optional: ['quantity', 'category', 'outlet', 'customer_id']
        },
        purchase: {
            required: ['date', 'amount', 'item'],
            optional: ['vendor', 'quantity', 'category']
        },
        wastage: {
            required: ['date', 'item', 'quantity'],
            optional: ['reason', 'value', 'outlet']
        },
        inventory: {
            required: ['item', 'quantity'],
            optional: ['category', 'reorder_level', 'unit_cost']
        },
        staff: {
            required: ['date', 'staff_name', 'type'],
            optional: ['description', 'severity', 'outlet']
        }
    };

    res.json(suggestions[dataType] || { required: [], optional: [] });
});

module.exports = router;

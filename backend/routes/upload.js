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

// Analyze Data Quality - returns score and breakdown
const analyzeDataQuality = (data, headers) => {
    if (!data || data.length === 0) {
        return { score: 0, breakdown: {}, issues: ['No data found'] };
    }

    const issues = [];
    let totalScore = 0;
    const breakdown = {};

    // 1. Completeness Score (25 points)
    let missingCount = 0;
    let totalCells = 0;
    data.forEach(row => {
        headers.forEach(h => {
            totalCells++;
            if (row[h] === undefined || row[h] === null || row[h] === '') {
                missingCount++;
            }
        });
    });
    const completenessRate = ((totalCells - missingCount) / totalCells) * 100;
    breakdown.completeness = {
        score: Math.round(completenessRate / 4),
        details: `${(100 - completenessRate).toFixed(1)}% empty cells`,
        status: completenessRate > 90 ? 'good' : completenessRate > 70 ? 'warning' : 'error'
    };
    totalScore += breakdown.completeness.score;
    if (completenessRate < 80) issues.push(`${(100 - completenessRate).toFixed(0)}% of values are missing`);

    // 2. Date Format Score (25 points)
    const dateHeaders = headers.filter(h => h.toLowerCase().includes('date'));
    let validDates = 0;
    let totalDates = 0;
    dateHeaders.forEach(dh => {
        data.forEach(row => {
            if (row[dh]) {
                totalDates++;
                const d = new Date(row[dh]);
                if (!isNaN(d.getTime())) validDates++;
            }
        });
    });
    const dateRate = totalDates > 0 ? (validDates / totalDates) * 100 : 100;
    breakdown.dateFormat = {
        score: Math.round(dateRate / 4),
        details: totalDates > 0 ? `${validDates}/${totalDates} valid dates` : 'No date columns',
        status: dateRate > 95 ? 'good' : dateRate > 80 ? 'warning' : 'error'
    };
    totalScore += breakdown.dateFormat.score;
    if (dateRate < 90 && totalDates > 0) issues.push(`${totalDates - validDates} invalid date formats`);

    // 3. Numeric Values Score (25 points)
    const numericHeaders = headers.filter(h => 
        h.toLowerCase().includes('amount') || 
        h.toLowerCase().includes('quantity') || 
        h.toLowerCase().includes('cost') ||
        h.toLowerCase().includes('price')
    );
    let validNumbers = 0;
    let totalNumbers = 0;
    let negativeCount = 0;
    numericHeaders.forEach(nh => {
        data.forEach(row => {
            if (row[nh] !== undefined && row[nh] !== '') {
                totalNumbers++;
                const num = parseFloat(row[nh]);
                if (!isNaN(num)) {
                    validNumbers++;
                    if (num < 0) negativeCount++;
                }
            }
        });
    });
    const numericRate = totalNumbers > 0 ? (validNumbers / totalNumbers) * 100 : 100;
    breakdown.numericValues = {
        score: Math.round(numericRate / 4),
        details: totalNumbers > 0 ? `${validNumbers}/${totalNumbers} valid numbers` : 'No numeric columns',
        status: numericRate > 95 ? 'good' : numericRate > 80 ? 'warning' : 'error'
    };
    totalScore += breakdown.numericValues.score;
    if (negativeCount > 0) issues.push(`${negativeCount} negative values found`);

    // 4. Data Volume Score (25 points)
    const volumeScore = Math.min(25, Math.round((data.length / 100) * 25));
    breakdown.volume = {
        score: volumeScore,
        details: `${data.length} rows`,
        status: data.length >= 100 ? 'good' : data.length >= 30 ? 'warning' : 'error'
    };
    totalScore += volumeScore;
    if (data.length < 30) issues.push('Limited data for accurate analysis');

    return {
        score: totalScore,
        maxScore: 100,
        breakdown,
        issues
    };
};

// Compute Instant Insights from data
const computeInstantInsights = (data, dataType) => {
    if (!data || data.length === 0) {
        return null;
    }

    const insights = {
        totalRows: data.length
    };

    // Find date column
    const headers = Object.keys(data[0]);
    const dateCol = headers.find(h => h.toLowerCase().includes('date'));
    
    if (dateCol) {
        const dates = data
            .map(r => new Date(r[dateCol]))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => a - b);
        
        if (dates.length > 0) {
            insights.dateRange = {
                start: dates[0].toISOString().split('T')[0],
                end: dates[dates.length - 1].toISOString().split('T')[0],
                days: Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24)) + 1
            };

            // Find peak days
            const dayCount = {};
            dates.forEach(d => {
                const day = d.toLocaleDateString('en-US', { weekday: 'long' });
                dayCount[day] = (dayCount[day] || 0) + 1;
            });
            const sortedDays = Object.entries(dayCount).sort((a, b) => b[1] - a[1]);
            if (sortedDays.length > 0) {
                insights.peakDay = sortedDays[0][0];
            }
        }
    }

    // Find amount/value column for sales/purchase
    if (dataType === 'sales' || dataType === 'purchase') {
        const amountCol = headers.find(h => 
            h.toLowerCase().includes('amount') || 
            h.toLowerCase().includes('total') ||
            h.toLowerCase().includes('value')
        );
        
        if (amountCol) {
            const amounts = data
                .map(r => parseFloat(r[amountCol]))
                .filter(n => !isNaN(n) && n > 0);
            
            if (amounts.length > 0) {
                insights.totalValue = amounts.reduce((a, b) => a + b, 0);
                insights.avgValue = insights.totalValue / amounts.length;
                insights.maxValue = Math.max(...amounts);
                insights.transactionCount = amounts.length;
            }
        }
    }

    // For wastage data
    if (dataType === 'wastage') {
        const qtyCol = headers.find(h => h.toLowerCase().includes('quantity') || h.toLowerCase().includes('qty'));
        if (qtyCol) {
            const quantities = data
                .map(r => parseFloat(r[qtyCol]))
                .filter(n => !isNaN(n));
            
            if (quantities.length > 0) {
                insights.totalWasted = quantities.reduce((a, b) => a + b, 0);
                insights.wasteInstances = quantities.length;
            }
        }
    }

    // Category breakdown
    const categoryCol = headers.find(h => 
        h.toLowerCase().includes('category') || 
        h.toLowerCase().includes('type') ||
        h.toLowerCase().includes('item')
    );
    if (categoryCol) {
        const categories = {};
        data.forEach(r => {
            const cat = r[categoryCol];
            if (cat) categories[cat] = (categories[cat] || 0) + 1;
        });
        insights.uniqueCategories = Object.keys(categories).length;
        insights.topCategories = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));
    }

    return insights;
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

        // Compute Data Quality Score
        const dataQuality = analyzeDataQuality(data, headers);

        // Compute Instant Insights (for sales/purchase data)
        const instantInsights = computeInstantInsights(data, dataType);

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
                totalRows: data.length,
                dataQuality,
                instantInsights
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
            previewRows: previewData.slice(0, 5),
            customKpis: req.business.customKpis || [],
            dataQuality,
            instantInsights
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
        const { columnMapping, customKpiMapping } = req.body;

        const uploadRecord = await Upload.findOne({
            _id: req.params.id,
            business: req.business._id
        });

        if (!uploadRecord) {
            return res.status(404).json({ message: 'Upload not found' });
        }

        uploadRecord.columnMapping = new Map(Object.entries(columnMapping));

        // Store custom KPI mappings if provided
        if (customKpiMapping && Object.keys(customKpiMapping).length > 0) {
            uploadRecord.customKpiMapping = new Map(Object.entries(customKpiMapping));
        }

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

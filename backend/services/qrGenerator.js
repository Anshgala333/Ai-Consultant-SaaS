const QRCode = require('qrcode');

class QRGenerator {
    static async generateFeedbackQR(outletId) {
        const feedbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/feedback/${outletId}`;

        try {
            // Generate QR code as data URL
            const dataUrl = await QRCode.toDataURL(feedbackUrl, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#1a1a2e',
                    light: '#ffffff'
                },
                errorCorrectionLevel: 'M'
            });

            return {
                url: feedbackUrl,
                dataUrl
            };
        } catch (error) {
            console.error('QR generation error:', error);
            throw new Error('Failed to generate QR code');
        }
    }

    static async generateQRBuffer(outletId) {
        const feedbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/feedback/${outletId}`;

        try {
            const buffer = await QRCode.toBuffer(feedbackUrl, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#1a1a2e',
                    light: '#ffffff'
                }
            });

            return buffer;
        } catch (error) {
            console.error('QR buffer generation error:', error);
            throw new Error('Failed to generate QR code buffer');
        }
    }
}

module.exports = QRGenerator;

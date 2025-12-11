const PDFDocument = require('pdfkit');

class ReportGenerator {
    async generatePDF(data) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50 });
                const buffers = [];

                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers)));
                doc.on('error', reject);

                // Title
                doc.fontSize(24).font('Helvetica-Bold')
                    .text('Impact Report', { align: 'center' });
                doc.moveDown(0.5);
                doc.fontSize(14).font('Helvetica')
                    .text(data.business.name, { align: 'center' });
                doc.fontSize(10).fillColor('#666666')
                    .text(`Generated: ${new Date(data.generatedAt).toLocaleDateString()}`, { align: 'center' });

                doc.moveDown(2);
                doc.fillColor('#000000');

                // Executive Summary
                this.addSection(doc, 'Executive Summary');
                this.addKeyValue(doc, 'Health Score', `${data.business.healthScore}/100`);
                this.addKeyValue(doc, 'Experiments Completed', data.executiveSummary.experimentsCompleted);
                this.addKeyValue(doc, 'Success Rate', `${data.executiveSummary.successRate.toFixed(1)}%`);
                this.addKeyValue(doc, 'Issues Resolved', data.executiveSummary.issuesResolved);
                this.addKeyValue(doc, 'Est. Monthly Savings', `₹${data.executiveSummary.totalMonthlySavings.toLocaleString()}`);

                doc.moveDown(2);

                // Baseline vs Latest KPIs
                this.addSection(doc, 'Baseline vs Latest KPIs');

                const baseline = data.baselineVsLatest.baseline;
                const latest = data.baselineVsLatest.latest;
                const improvements = data.baselineVsLatest.improvements;

                if (baseline && latest) {
                    this.addComparisonRow(doc, 'Revenue',
                        `₹${(baseline.revenue?.total || 0).toLocaleString()}`,
                        `₹${(latest.revenue?.total || 0).toLocaleString()}`,
                        improvements.revenue ? `${improvements.revenue}%` : 'N/A'
                    );

                    this.addComparisonRow(doc, 'Wastage',
                        `${baseline.wastage?.percentage || 0}%`,
                        `${latest.wastage?.percentage || 0}%`,
                        improvements.wastage ? `${improvements.wastage}% reduction` : 'N/A'
                    );
                }

                doc.moveDown(2);

                // Issues Summary
                this.addSection(doc, 'Issues Detected');
                this.addKeyValue(doc, 'Total Issues', data.issues.total);
                this.addKeyValue(doc, 'Resolved', data.issues.byStatus.resolved);
                this.addKeyValue(doc, 'Open', data.issues.byStatus.open);

                if (data.issues.topTypes.length > 0) {
                    doc.moveDown(0.5);
                    doc.fontSize(10).text('Top Issue Types:', { underline: true });
                    data.issues.topTypes.forEach(t => {
                        doc.fontSize(9).text(`  • ${t.type.replace(/_/g, ' ')}: ${t.count}`);
                    });
                }

                doc.moveDown(2);

                // Experiments Outcomes
                if (data.experiments.length > 0) {
                    this.addSection(doc, 'Experiment Outcomes');
                    data.experiments.forEach(exp => {
                        doc.fontSize(10).font('Helvetica-Bold').text(exp.title);
                        doc.font('Helvetica').fontSize(9)
                            .text(`Target: ${exp.targetKPI.replace(/_/g, ' ')}`);
                        if (exp.improvement?.success !== undefined) {
                            const status = exp.improvement.success ? '✓ Success' : '✗ Not achieved';
                            doc.text(`Result: ${status} (${exp.improvement.percentage?.toFixed(1) || 0}% change)`);
                        }
                        if (exp.savings) {
                            doc.text(`Estimated Savings: ₹${exp.savings.toLocaleString()}/month`);
                        }
                        doc.moveDown(0.5);
                    });
                }

                doc.moveDown(1);

                // Customer Feedback
                this.addSection(doc, 'Customer Feedback');
                this.addKeyValue(doc, 'Average Rating', `${data.customerFeedback.avgRating}/5`);
                this.addKeyValue(doc, 'Total Responses', data.customerFeedback.totalResponses);

                doc.moveDown(2);

                // Recommended Next 30 Days
                if (data.recommendedNext30Days.length > 0) {
                    this.addSection(doc, 'Recommended Actions (Next 30 Days)');
                    data.recommendedNext30Days.forEach((rec, i) => {
                        doc.fontSize(10).font('Helvetica-Bold')
                            .text(`${i + 1}. ${rec.title}`);
                        doc.font('Helvetica').fontSize(9)
                            .text(`   Impact: ${rec.impact} | Category: ${rec.category.replace(/_/g, ' ')}`);
                        doc.moveDown(0.3);
                    });
                }

                // Footer
                doc.moveDown(2);
                doc.fontSize(8).fillColor('#888888')
                    .text('This report was generated by AI Consultant - SME Efficiency Platform',
                        { align: 'center' });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    addSection(doc, title) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e')
            .text(title);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#1a1a2e');
        doc.moveDown(0.5);
        doc.fillColor('#000000');
    }

    addKeyValue(doc, key, value) {
        doc.fontSize(10).font('Helvetica')
            .text(`${key}: `, { continued: true })
            .font('Helvetica-Bold')
            .text(String(value));
    }

    addComparisonRow(doc, label, before, after, change) {
        doc.fontSize(10).font('Helvetica')
            .text(`${label}: ${before} → ${after} (${change})`);
    }
}

module.exports = ReportGenerator;

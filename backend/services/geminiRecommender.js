const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiRecommender {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    async generateRecommendations(context) {
        const prompt = this.buildPrompt(context);

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return this.parseRecommendations(text, context);
        } catch (error) {
            console.error('Gemini API error:', error);
            // Return fallback recommendations if API fails
            return this.getFallbackRecommendations(context);
        }
    }

    buildPrompt(context) {
        return `You are an AI business consultant for SMEs. Analyze the following business data and provide exactly 5 actionable recommendations to improve operational efficiency.

BUSINESS PROFILE:
- Name: ${context.businessProfile.name}
- Sector: ${context.businessProfile.sector}
- Revenue Range: ${context.businessProfile.revenue}
- Primary Objective: ${context.businessProfile.primaryObjective}
- Health Score: ${context.businessProfile.healthScore}/100

CURRENT KPIs:
- Monthly Revenue: ₹${context.kpis.revenue?.total || context.kpis.monthlyRevenue || 'N/A'}
- Wastage: ${context.kpis.wastage?.percentage || context.kpis.estimatedWastage || 'N/A'}%
- Customer Rating: ${context.kpis.customerRating || 'N/A'}/5

DETECTED ISSUES (${context.issues.length} total):
${context.issues.slice(0, 5).map(i => `- ${i.title} (${i.severity})`).join('\n') || 'No major issues detected'}

CUSTOMER FEEDBACK:
- Average Rating: ${context.customerFeedback.averageRating.toFixed(1)}/5
- Negative Feedback Count: ${context.customerFeedback.negativeCount}
- Top Complaint Areas: ${context.customerFeedback.topCategories.join(', ') || 'None'}

STAFF REPORTED ISSUES:
- Total Logs: ${context.staffLogs.totalLogs}
- Critical Issues: ${context.staffLogs.criticalCount}
- Top Issue Types: ${context.staffLogs.topTypes.join(', ') || 'None'}

Provide exactly 5 recommendations in the following JSON format, with no additional text:
[
  {
    "title": "Short actionable title",
    "description": "Detailed description of the recommendation (2-3 sentences)",
    "impact": "high" or "medium" or "low",
    "difficulty": "easy" or "medium" or "hard",
    "timeframe": "immediate" or "1_week" or "2_weeks" or "1_month" or "3_months",
    "category": "wastage_reduction" or "revenue_growth" or "customer_experience" or "cost_optimization" or "staff_efficiency" or "inventory_management" or "process_improvement",
    "expectedImprovement": {
      "metric": "wastage_percentage" or "revenue" or "customer_rating" or "margin",
      "percentageImprovement": number between 5 and 30
    }
  }
]

Focus recommendations on the business's primary objective: ${context.businessProfile.primaryObjective}.
Prioritize high-impact, achievable recommendations suitable for an SME.`;
    }

    parseRecommendations(text, context) {
        try {
            // Extract JSON from response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No JSON array found in response');
            }

            const recommendations = JSON.parse(jsonMatch[0]);

            // Validate and clean recommendations
            return recommendations.slice(0, 5).map(rec => ({
                title: rec.title || 'Untitled Recommendation',
                description: rec.description || 'No description provided',
                impact: ['high', 'medium', 'low'].includes(rec.impact) ? rec.impact : 'medium',
                difficulty: ['easy', 'medium', 'hard'].includes(rec.difficulty) ? rec.difficulty : 'medium',
                timeframe: ['immediate', '1_week', '2_weeks', '1_month', '3_months'].includes(rec.timeframe)
                    ? rec.timeframe : '2_weeks',
                category: this.validateCategory(rec.category),
                expectedImprovement: {
                    metric: rec.expectedImprovement?.metric || 'revenue',
                    percentageImprovement: Math.min(30, Math.max(5, rec.expectedImprovement?.percentageImprovement || 10))
                }
            }));
        } catch (error) {
            console.error('Parse error:', error);
            return this.getFallbackRecommendations(context);
        }
    }

    validateCategory(category) {
        const validCategories = [
            'wastage_reduction', 'revenue_growth', 'customer_experience',
            'cost_optimization', 'staff_efficiency', 'inventory_management', 'process_improvement'
        ];
        return validCategories.includes(category) ? category : 'process_improvement';
    }

    getFallbackRecommendations(context) {
        const fallbacks = [
            {
                title: 'Implement Daily Stock Audit',
                description: 'Conduct daily stock audits to identify wastage patterns and reduce inventory loss. This helps track where wastage occurs and enables quick corrective action.',
                impact: 'high',
                difficulty: 'easy',
                timeframe: '1_week',
                category: 'wastage_reduction',
                expectedImprovement: { metric: 'wastage_percentage', percentageImprovement: 15 }
            },
            {
                title: 'Launch Customer Feedback Follow-up Program',
                description: 'Reach out to customers who leave negative feedback within 24 hours. Personal attention can convert dissatisfied customers into loyal ones.',
                impact: 'medium',
                difficulty: 'easy',
                timeframe: 'immediate',
                category: 'customer_experience',
                expectedImprovement: { metric: 'customer_rating', percentageImprovement: 10 }
            },
            {
                title: 'Optimize Peak Hour Staffing',
                description: 'Analyze sales data to identify peak hours and adjust staffing accordingly. This reduces wait times and improves customer satisfaction.',
                impact: 'high',
                difficulty: 'medium',
                timeframe: '2_weeks',
                category: 'staff_efficiency',
                expectedImprovement: { metric: 'revenue', percentageImprovement: 8 }
            },
            {
                title: 'Review Slow-Moving SKUs',
                description: 'Identify products with low turnover and consider discounting, bundling, or discontinuing them to free up capital and shelf space.',
                impact: 'medium',
                difficulty: 'medium',
                timeframe: '1_month',
                category: 'inventory_management',
                expectedImprovement: { metric: 'margin', percentageImprovement: 5 }
            },
            {
                title: 'Implement FIFO Inventory System',
                description: 'Ensure First-In-First-Out rotation for perishable goods to minimize expiry-related wastage. Simple color-coded labeling can help staff comply.',
                impact: 'high',
                difficulty: 'easy',
                timeframe: '1_week',
                category: 'wastage_reduction',
                expectedImprovement: { metric: 'wastage_percentage', percentageImprovement: 20 }
            }
        ];

        // Prioritize based on primary objective
        if (context.businessProfile.primaryObjective === 'wastage') {
            return [fallbacks[0], fallbacks[4], fallbacks[3], fallbacks[1], fallbacks[2]];
        } else if (context.businessProfile.primaryObjective === 'customer_experience') {
            return [fallbacks[1], fallbacks[2], fallbacks[0], fallbacks[3], fallbacks[4]];
        }

        return fallbacks;
    }
}

module.exports = GeminiRecommender;

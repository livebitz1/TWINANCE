/**
 * AI Financial Chat Service
 * Intelligent query processor with full access to transaction data
 */

"use client";

import { Transaction, BankStatementData } from './bankStatementService';
import { FinancialAnalytics, MonthlySummary, DailySummary, CategoryInsight } from './financialAnalytics';
import { DateQueryParser, DateRange } from '../utils/dateQueryParser';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
// Use gemini-flash-latest (stable alias)
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

export enum QueryType {
    MONTHLY_SUMMARY = "monthly_summary",
    DAILY_TRANSACTIONS = "daily_transactions",
    CATEGORY_ANALYSIS = "category_analysis",
    MERCHANT_SEARCH = "merchant_search",
    COMPARISON = "comparison",
    TREND_ANALYSIS = "trend_analysis",
    BUDGET_ADVICE = "budget_advice",
    TRANSACTION_SEARCH = "transaction_search",
    SAVINGS_TIPS = "savings_tips",
    ANOMALY_DETECTION = "anomaly_detection",
    GENERAL = "general"
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    metadata?: {
        queryType?: QueryType;
        transactionsShown?: number;
        dataUsed?: any;
    };
}

export interface ChatContext {
    transactions: Transaction[];
    totalBalance: string;
    income: string;
    expenses: string;
    statementPeriod?: { startDate: string; endDate: string };
}

export class AIFinancialChatService {
    /**
     * Process user query and generate personalized response
     */
    static async processQuery(
        userQuery: string,
        context: ChatContext,
        conversationHistory: ChatMessage[] = []
    ): Promise<ChatMessage> {
        try {
            console.log(`[AI Chat] Processing query: "${userQuery}"`);

            // Step 1: Classify query type
            const queryType = await this.classifyQuery(userQuery);
            console.log(`[AI Chat] Query type: ${queryType}`);

            // Step 2: Extract relevant data based on query type
            const relevantData = await this.extractRelevantData(userQuery, queryType, context);
            console.log(`[AI Chat] Extracted data for ${queryType}`);

            // Step 3: Generate personalized response
            const response = await this.generatePersonalizedResponse(
                userQuery,
                queryType,
                relevantData,
                context,
                conversationHistory
            );

            return {
                role: "assistant",
                content: response,
                timestamp: new Date(),
                metadata: {
                    queryType,
                    transactionsShown: relevantData.transactions?.length || 0,
                    dataUsed: relevantData
                }
            };
        } catch (error) {
            console.error('[AI Chat] Error processing query:', error);
            return {
                role: "assistant",
                content: "I apologize, but I encountered an error processing your request. Please try rephrasing your question or ask something else about your finances.",
                timestamp: new Date()
            };
        }
    }

    /**
     * Classify user query into query type
     */
    private static async classifyQuery(query: string): Promise<QueryType> {
        const lowerQuery = query.toLowerCase();

        // Monthly summary patterns
        if (lowerQuery.match(/(how much|total|spent|spending).*(month|january|february|march|april|may|june|july|august|september|october|november|december)/i) ||
            lowerQuery.match(/monthly (summary|spending|expenses)/i)) {
            return QueryType.MONTHLY_SUMMARY;
        }

        // Daily transactions patterns
        if (lowerQuery.match(/(what|show|list).*(bought|purchased|spent|transactions).*(on|date|day)/i) ||
            lowerQuery.match(/\d{1,2}(st|nd|rd|th)?/)) {
            return QueryType.DAILY_TRANSACTIONS;
        }

        // Category analysis patterns
        if (lowerQuery.match(/(food|shopping|transport|bills|entertainment|health|education).*(expenses|spending|cost)/i) ||
            lowerQuery.match(/category|categories/i)) {
            return QueryType.CATEGORY_ANALYSIS;
        }

        // Merchant search patterns
        if (lowerQuery.match(/(amazon|flipkart|swiggy|zomato|uber|ola|netflix|spotify).*(purchases|orders|transactions)/i) ||
            lowerQuery.match(/(all|show|find).*(from|at|merchant)/i)) {
            return QueryType.MERCHANT_SEARCH;
        }

        // Comparison patterns
        if (lowerQuery.match(/compare|comparison|versus|vs|difference|than/i)) {
            return QueryType.COMPARISON;
        }

        // Trend analysis patterns
        if (lowerQuery.match(/trend|trending|increasing|decreasing|more|less|pattern/i)) {
            return QueryType.TREND_ANALYSIS;
        }

        // Budget advice patterns
        if (lowerQuery.match(/budget|should i|advice|recommend|suggest|reduce|save/i)) {
            return QueryType.BUDGET_ADVICE;
        }

        // Savings tips patterns
        if (lowerQuery.match(/save|savings|tips|how can i|ways to/i)) {
            return QueryType.SAVINGS_TIPS;
        }

        // Anomaly detection patterns
        if (lowerQuery.match(/unusual|strange|anomaly|weird|suspicious|large|high/i)) {
            return QueryType.ANOMALY_DETECTION;
        }

        // Transaction search patterns
        if (lowerQuery.match(/find|search|show|list|upi|neft|imps|atm/i)) {
            return QueryType.TRANSACTION_SEARCH;
        }

        return QueryType.GENERAL;
    }

    /**
     * Extract relevant data based on query type
     */
    private static async extractRelevantData(
        query: string,
        queryType: QueryType,
        context: ChatContext
    ): Promise<any> {
        const { transactions } = context;

        switch (queryType) {
            case QueryType.MONTHLY_SUMMARY: {
                const dateRange = DateQueryParser.parse(query);
                if (dateRange) {
                    const [day, month, year] = dateRange.start.split('/').map(Number);
                    return FinancialAnalytics.getMonthlySpending(transactions, month, year);
                }
                // Default to current month
                const now = new Date();
                return FinancialAnalytics.getMonthlySpending(transactions, now.getMonth() + 1, now.getFullYear());
            }

            case QueryType.DAILY_TRANSACTIONS: {
                const dateRange = DateQueryParser.parse(query);
                if (dateRange) {
                    return FinancialAnalytics.getDailyTransactions(transactions, dateRange.start);
                }
                return { transactions: [], totalSpent: 0, totalReceived: 0, categories: [] };
            }

            case QueryType.CATEGORY_ANALYSIS: {
                // Extract category from query
                const categories = ['food', 'shopping', 'transport', 'bills', 'entertainment', 'health', 'education'];
                const category = categories.find(c => query.toLowerCase().includes(c));
                if (category) {
                    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
                    return FinancialAnalytics.getCategoryInsights(transactions, categoryName);
                }
                // Return all categories
                return categories.map(c => FinancialAnalytics.getCategoryInsights(transactions, c.charAt(0).toUpperCase() + c.slice(1)));
            }

            case QueryType.MERCHANT_SEARCH: {
                // Extract merchant name from query
                const merchants = ['amazon', 'flipkart', 'swiggy', 'zomato', 'uber', 'ola', 'netflix', 'spotify'];
                const merchant = merchants.find(m => query.toLowerCase().includes(m));
                if (merchant) {
                    return {
                        merchant,
                        transactions: FinancialAnalytics.searchByMerchant(transactions, merchant)
                    };
                }
                return { merchant: null, transactions: [] };
            }

            case QueryType.COMPARISON: {
                // Try to extract two time periods
                const now = new Date();
                const thisMonth = FinancialAnalytics.getMonthlySpending(transactions, now.getMonth() + 1, now.getFullYear());
                const lastMonth = FinancialAnalytics.getMonthlySpending(transactions, now.getMonth(), now.getFullYear());
                return FinancialAnalytics.compareMonths(
                    transactions,
                    now.getMonth() + 1,
                    now.getFullYear(),
                    now.getMonth(),
                    now.getFullYear()
                );
            }

            case QueryType.TREND_ANALYSIS: {
                return FinancialAnalytics.getSpendingTrend(transactions, 'month');
            }

            case QueryType.ANOMALY_DETECTION: {
                return FinancialAnalytics.detectAnomalies(transactions);
            }

            case QueryType.SAVINGS_TIPS: {
                return {
                    suggestions: FinancialAnalytics.getSavingsSuggestions(transactions)
                };
            }

            case QueryType.TRANSACTION_SEARCH: {
                const searchTerm = query.toLowerCase().match(/(upi|neft|imps|atm|debit|credit)/)?.[0] || '';
                return {
                    searchTerm,
                    transactions: transactions.filter(t =>
                        t.description.toLowerCase().includes(searchTerm)
                    )
                };
            }

            default:
                return { transactions };
        }
    }

    /**
     * Generate personalized response using Gemini AI
     */
    private static async generatePersonalizedResponse(
        userQuery: string,
        queryType: QueryType,
        relevantData: any,
        context: ChatContext,
        conversationHistory: ChatMessage[]
    ): Promise<string> {
        if (!GEMINI_API_KEY) {
            console.warn('[AI Chat] No Gemini API key found, using fallback response');
            return this.generateFallbackResponse(userQuery, queryType, relevantData, context);
        }

        // Build context-rich prompt
        const prompt = this.buildAIPrompt(userQuery, queryType, relevantData, context, conversationHistory);

        try {
            console.log('[AI Chat] Sending request to server-side API proxy');

            // Use server-side API proxy to avoid CORS issues
            const response = await fetch('/api/gemini-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    config: {
                        temperature: 0.7,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 2048,
                    }
                })
            });

            console.log('[AI Chat] Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();

                // Handle 429 (Rate Limit) gracefully
                if (response.status === 429) {
                    console.warn('[AI Chat] Rate limit reached (429)');
                    throw new Error('API error: 429');
                }

                console.error('[AI Chat] API Error:', errorData);
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.response) {
                console.log('[AI Chat] Successfully received response from Gemini');
                return result.response;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error: any) {
            // Only log actual errors (not expected rate limits)
            if (!error.message?.includes('429')) {
                console.error('[AI Chat] Error:', error);
            }

            // Check for rate limiting
            if (error.message?.includes('429') || error.message?.includes('503')) {
                console.warn('[AI Chat] Service busy/rate limited, using fallback');
                const fallback = this.generateFallbackResponse(userQuery, queryType, relevantData, context);
                return `(Note: AI service is currently busy/limited, showing cached analysis instead)\n\n${fallback}`;
            }

            console.log('[AI Chat] Falling back to non-AI response');
            return this.generateFallbackResponse(userQuery, queryType, relevantData, context);
        }
    }

    /**
     * Build context-rich prompt for Gemini AI
     */
    private static buildAIPrompt(
        userQuery: string,
        queryType: QueryType,
        relevantData: any,
        context: ChatContext,
        conversationHistory: ChatMessage[]
    ): string {
        const { transactions, totalBalance, income, expenses, statementPeriod } = context;

        let dataContext = '';

        // Add query-specific data
        switch (queryType) {
            case QueryType.MONTHLY_SUMMARY:
                const monthly = relevantData as MonthlySummary;
                dataContext = `
MONTHLY SUMMARY DATA:
- Month: ${monthly.month} ${monthly.year}
- Total Spent: ₹${monthly.totalSpent.toLocaleString('en-IN')}
- Total Received: ₹${monthly.totalReceived.toLocaleString('en-IN')}
- Transactions: ${monthly.transactionCount}
- Average per day: ₹${monthly.averagePerDay.toFixed(2)}
- Top expense: ${monthly.topExpense.description} (₹${monthly.topExpense.amount.toLocaleString('en-IN')})

CATEGORY BREAKDOWN:
${Object.entries(monthly.byCategory).map(([cat, amt]) => `- ${cat}: ₹${amt.toLocaleString('en-IN')}`).join('\n')}

TOP MERCHANTS:
${Object.entries(monthly.byMerchant).slice(0, 5).map(([merchant, amt]) => `- ${merchant}: ₹${amt.toLocaleString('en-IN')}`).join('\n')}
`;
                break;

            case QueryType.DAILY_TRANSACTIONS:
                const daily = relevantData as DailySummary;
                dataContext = `
DAILY TRANSACTIONS (${daily.date}):
- Total Spent: ₹${daily.totalSpent.toLocaleString('en-IN')}
- Total Received: ₹${daily.totalReceived.toLocaleString('en-IN')}
- Net Change: ₹${daily.netChange.toLocaleString('en-IN')}
- Categories: ${daily.categories.join(', ')}

TRANSACTIONS:
${daily.transactions.slice(0, 10).map(t =>
                    `- ${t.description}: ₹${t.amount.toLocaleString('en-IN')} (${t.category})`
                ).join('\n')}
${daily.transactions.length > 10 ? `\n... and ${daily.transactions.length - 10} more transactions` : ''}
`;
                break;

            case QueryType.CATEGORY_ANALYSIS:
                if (Array.isArray(relevantData)) {
                    dataContext = `
CATEGORY ANALYSIS:
${relevantData.map((cat: CategoryInsight) => `
- ${cat.category}: ₹${cat.total.toLocaleString('en-IN')} (${cat.count} transactions, ${cat.percentage.toFixed(1)}%)
  Average: ₹${cat.averageAmount.toFixed(2)}
  Trend: ${cat.trend}
  Top merchants: ${cat.topMerchants.slice(0, 3).map(m => m.name).join(', ')}
`).join('\n')}
`;
                } else {
                    const cat = relevantData as CategoryInsight;
                    dataContext = `
${cat.category.toUpperCase()} ANALYSIS:
- Total: ₹${cat.total.toLocaleString('en-IN')}
- Transactions: ${cat.count}
- Average per transaction: ₹${cat.averageAmount.toFixed(2)}
- Percentage of total spending: ${cat.percentage.toFixed(1)}%
- Trend: ${cat.trend}

TOP MERCHANTS:
${cat.topMerchants.map(m => `- ${m.name}: ₹${m.amount.toLocaleString('en-IN')} (${m.count} transactions)`).join('\n')}
`;
                }
                break;

            case QueryType.SAVINGS_TIPS:
                dataContext = `
SAVINGS SUGGESTIONS:
${relevantData.suggestions.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}
`;
                break;

            default:
                dataContext = `
TRANSACTION DATA:
- Total transactions: ${transactions.length}
- Total balance: ${totalBalance}
- Total income: ${income}
- Total expenses: ${expenses}
`;
        }

        return `You are a personal financial assistant with complete access to the user's bank statement data.

USER QUERY: "${userQuery}"
QUERY TYPE: ${queryType}

FINANCIAL OVERVIEW:
- Total Balance: ${totalBalance}
- Total Income: ${income}
- Total Expenses: ${expenses}
- Statement Period: ${statementPeriod?.startDate || 'N/A'} to ${statementPeriod?.endDate || 'N/A'}
- Total Transactions: ${transactions.length}

${dataContext}

INSTRUCTIONS:
1. **Structure & Formatting**:
   - Use clear MAIN HEADINGS (like ## Analysis, ## Insights)
   - Use BULLET POINTS for lists (no long paragraphs)
   - **BOLD** important numbers (e.g., **₹15,000**) and key terms
   - Keep paragraphs short (maximum 2-3 lines)

2. **Content Quality**:
   - Start with a direct answer to the user's question
   - Use specific transaction details to prove you know the data
   - Be friendly but professional (Financial Advisor persona)

3. **Required Sections** (adapt based on query):
   - **Direct Answer**: The numbers/facts requested
   - **📊 Breakdown**: Category or merchant details (if relevant)
   - **💡 Insight**: A smart observation about their spending habit
   - **💰 Recommendation**: One actionable tip (if relevant)

4. **Style**:
   - Use emojis effectively but don't overdo it
   - Format currency as ₹ (Indian Rupees)
   - Never make up data - use ONLY the provided context

5. **Goal**: Make the response look beautiful and easy to read at a glance. Avoid "wall of text".`;
    }

    /**
     * Generate fallback response without AI
     */
    private static generateFallbackResponse(
        userQuery: string,
        queryType: QueryType,
        relevantData: any,
        context: ChatContext
    ): string {
        switch (queryType) {
            case QueryType.MONTHLY_SUMMARY:
                const monthly = relevantData as MonthlySummary;
                return `In ${monthly.month} ${monthly.year}, you spent ₹${monthly.totalSpent.toLocaleString('en-IN')} across ${monthly.transactionCount} transactions.\n\nTop categories:\n${Object.entries(monthly.byCategory).slice(0, 5).map(([cat, amt]) => `• ${cat}: ₹${amt.toLocaleString('en-IN')}`).join('\n')}`;

            case QueryType.DAILY_TRANSACTIONS:
                const daily = relevantData as DailySummary;
                return `On ${daily.date}, you made ${daily.transactions.length} transactions totaling ₹${daily.totalSpent.toLocaleString('en-IN')}.\n\n${daily.transactions.slice(0, 5).map(t => `• ${t.description}: ₹${t.amount.toLocaleString('en-IN')}`).join('\n')}`;

            case QueryType.CATEGORY_ANALYSIS:
                if (Array.isArray(relevantData)) {
                    const cats = relevantData as CategoryInsight[];
                    return `Here is your category analysis:\n\n${cats.map(c => `• ${c.category}: ₹${c.total.toLocaleString('en-IN')} (${c.percentage.toFixed(1)}%)`).join('\n')}`;
                } else {
                    const cat = relevantData as CategoryInsight;
                    return `You spent ₹${cat.total.toLocaleString('en-IN')} on ${cat.category} (${cat.count} transactions).\nAverage: ₹${cat.averageAmount.toFixed(0)}\n\nTop merchants: ${cat.topMerchants.slice(0, 3).map(m => m.name).join(', ')}`;
                }

            case QueryType.SAVINGS_TIPS:
                return `Here are some savings tips based on your spending:\n\n${relevantData.suggestions.slice(0, 3).map((s: string) => `• ${s}`).join('\n')}`;

            case QueryType.MERCHANT_SEARCH:
                const mData = relevantData as { merchant: string, transactions: Transaction[] };
                if (!mData.merchant) return "I couldn't find transactions for that merchant.";
                const total = mData.transactions.reduce((sum, t) => sum + t.amount, 0);
                return `Found ${mData.transactions.length} transactions for ${mData.merchant} totaling ₹${total.toLocaleString('en-IN')}.\n\nRecent:\n${mData.transactions.slice(0, 3).map(t => `• ${t.date}: ₹${t.amount}`).join('\n')}`;

            default:
                return "I can help you analyze your finances! Try asking about:\n• Monthly spending\n• Specific dates\n• Category breakdowns\n• Savings tips";
        }
    }
}

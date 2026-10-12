/**
 * AI Financial Chat Service
 * Intelligent query processor with full access to transaction data
 */

"use client";

import { Transaction, BankStatementData } from './bankStatementService';
import { FinancialAnalytics, MonthlySummary, DailySummary, CategoryInsight } from './financialAnalytics';
import { DateQueryParser, DateRange } from '../utils/dateQueryParser';

// Chat requests go through this app's own server route, which holds the API key,
// so no key is ever exposed to the browser.

// How much of the prompt the raw transaction ledger may occupy. Gemini Flash has
// a very large context window, and input tokens cost far less latency than output
// tokens, so an ordinary statement is sent in full and nothing is hidden from the
// assistant. Roughly 120k characters is about 30k tokens, which comfortably holds
// a few thousand transactions.
const LEDGER_CHAR_BUDGET = 120_000;

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

            // Step 2: Extract the extra analytics for this query type. These are a
            // bonus on top of the full ledger, so a failure here must not sink the
            // whole answer - the model can still work from the statement itself.
            let relevantData: any = {};
            try {
                relevantData = await this.extractRelevantData(userQuery, queryType, context);
                console.log(`[AI Chat] Extracted data for ${queryType}`);
            } catch (dataError) {
                console.warn(`[AI Chat] Targeted analytics failed for ${queryType}, continuing with full ledger:`, dataError);
            }

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
    /**
     * The month to fall back on when the question names no period.
     *
     * A statement is historical, so "this month" by the wall clock is usually
     * outside the statement entirely and would feed the model an empty ₹0
     * summary. The latest month actually present is what the user means.
     */
    private static latestMonthInStatement(transactions: Transaction[]): { month: number; year: number } {
        let best = { month: 0, year: 0 };

        for (const t of transactions) {
            const [, m, y] = (t.date || "").split("/").map(Number);
            if (!m || !y) continue;
            if (y > best.year || (y === best.year && m > best.month)) best = { month: m, year: y };
        }

        if (!best.year) {
            const now = new Date();
            return { month: now.getMonth() + 1, year: now.getFullYear() };
        }
        return best;
    }

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
                // Default to the newest month the statement actually covers.
                const latest = this.latestMonthInStatement(transactions);
                return FinancialAnalytics.getMonthlySpending(transactions, latest.month, latest.year);
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
                // Compare the last two months the statement covers, not the last
                // two calendar months, which usually fall outside it.
                const latest = this.latestMonthInStatement(transactions);
                const prevMonth = latest.month === 1 ? 12 : latest.month - 1;
                const prevYear = latest.month === 1 ? latest.year - 1 : latest.year;
                return FinancialAnalytics.compareMonths(
                    transactions,
                    latest.month,
                    latest.year,
                    prevMonth,
                    prevYear
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
        // No key check here: the key lives on the server behind /api/gemini-chat,
        // so this client code cannot see it. A missing key comes back as a failed
        // request and is handled by the catch below.

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
     * Render every transaction as a compact row.
     *
     * The assistant is told it has the complete statement, so it must actually
     * receive it: without the ledger it can only answer from a handful of
     * pre-computed aggregates and has to guess at anything specific.
     *
     * Descriptions are shortened progressively if a very long statement would
     * otherwise blow the budget, and only as a last resort are older rows left
     * out - in which case the omission is stated in the prompt rather than
     * silently hidden from the model.
     */
    private static buildLedger(transactions: Transaction[]): string {
        if (!transactions.length) return "No transactions in this statement.";

        const render = (descLen: number, rows: Transaction[]) =>
            rows
                .map((t, i) => {
                    const dir = t.type === "credit" ? "CR" : "DR";
                    const desc = (t.description || "").slice(0, descLen);
                    const merchant = (t.merchant || "").slice(0, 24);
                    return `${i + 1}|${t.date}|${dir}|${t.amount}|${t.category || "Other"}|${merchant}|${desc}`;
                })
                .join("\n");

        const header =
            "ALL TRANSACTIONS (index|date|CR=money in, DR=money out|amount in rupees|category|merchant|description):\n";

        // Try progressively shorter descriptions before dropping any rows.
        for (const descLen of [70, 45, 25]) {
            const body = render(descLen, transactions);
            if (header.length + body.length <= LEDGER_CHAR_BUDGET) return header + body;
        }

        // Extremely long statement: keep the most recent rows that fit and say so.
        const kept: Transaction[] = [];
        let used = header.length;
        for (let i = transactions.length - 1; i >= 0; i--) {
            const cost = 60 + Math.min((transactions[i].description || "").length, 25);
            if (used + cost > LEDGER_CHAR_BUDGET) break;
            used += cost;
            kept.unshift(transactions[i]);
        }
        const omitted = transactions.length - kept.length;
        return (
            header +
            render(25, kept) +
            `\n\nNOTE: this statement has ${transactions.length} transactions and the ${omitted} oldest are not listed individually above. ` +
            `Use the STATEMENT TOTALS section for any figure covering the whole period, and say so if the user asks about an omitted transaction.`
        );
    }

    /**
     * Pre-compute the totals the model would otherwise have to derive by adding up
     * hundreds of rows by hand, which is exactly where language models slip.
     */
    private static buildStatementOverview(transactions: Transaction[]): string {
        if (!transactions.length) return "";

        const byCategory: Record<string, { total: number; count: number }> = {};
        const byMonth: Record<string, { inFlow: number; outFlow: number; count: number }> = {};
        const byMerchant: Record<string, { total: number; count: number }> = {};
        let totalIn = 0;
        let totalOut = 0;

        for (const t of transactions) {
            const amount = Number(t.amount) || 0;
            const isDebit = t.type === "debit";

            if (isDebit) totalOut += amount;
            else totalIn += amount;

            if (isDebit) {
                const cat = t.category || "Other";
                byCategory[cat] = byCategory[cat] || { total: 0, count: 0 };
                byCategory[cat].total += amount;
                byCategory[cat].count++;

                const merchant = (t.merchant || t.description || "Unknown").slice(0, 28);
                byMerchant[merchant] = byMerchant[merchant] || { total: 0, count: 0 };
                byMerchant[merchant].total += amount;
                byMerchant[merchant].count++;
            }

            const [, mm, yyyy] = (t.date || "").split("/");
            if (mm && yyyy) {
                const key = `${mm}/${yyyy}`;
                byMonth[key] = byMonth[key] || { inFlow: 0, outFlow: 0, count: 0 };
                byMonth[key].count++;
                if (isDebit) byMonth[key].outFlow += amount;
                else byMonth[key].inFlow += amount;
            }
        }

        const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
        const sortDesc = <T extends { total: number }>(o: Record<string, T>) =>
            Object.entries(o).sort((a, b) => b[1].total - a[1].total);

        const largest = [...transactions]
            .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
            .slice(0, 10);

        return `STATEMENT TOTALS (already calculated - trust these over your own arithmetic):
- Money in: ${rupees(totalIn)} | Money out: ${rupees(totalOut)} | Net: ${rupees(totalIn - totalOut)}
- Transactions: ${transactions.length}

SPENDING BY CATEGORY:
${sortDesc(byCategory)
    .map(([cat, v]) => `- ${cat}: ${rupees(v.total)} across ${v.count} transaction(s)`)
    .join("\n")}

BY MONTH (MM/YYYY):
${Object.entries(byMonth)
    .sort(([a], [b]) => {
        const [ma, ya] = a.split("/");
        const [mb, yb] = b.split("/");
        return ya === yb ? Number(ma) - Number(mb) : Number(ya) - Number(yb);
    })
    .map(([m, v]) => `- ${m}: in ${rupees(v.inFlow)}, out ${rupees(v.outFlow)}, ${v.count} transaction(s)`)
    .join("\n")}

TOP PAYEES BY SPEND:
${sortDesc(byMerchant)
    .slice(0, 15)
    .map(([m, v]) => `- ${m}: ${rupees(v.total)} across ${v.count} transaction(s)`)
    .join("\n")}

LARGEST TRANSACTIONS:
${largest
    .map((t) => `- ${t.date} ${t.type === "credit" ? "CR" : "DR"} ${rupees(Number(t.amount) || 0)} - ${(t.description || "").slice(0, 50)}`)
    .join("\n")}`;
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

        // Add query-specific data. This is supplementary detail layered on top of
        // the full ledger below, so if the shape is not what this branch expects
        // it is dropped rather than allowed to break the whole prompt.
        try {
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
                // The ledger and totals below already cover the general case.
                dataContext = '';
        }
        } catch (contextError) {
            console.warn('[AI Chat] Skipping query-specific context block:', contextError);
            dataContext = '';
        }

        // Every query gets the complete statement, not just the slice the
        // classifier guessed at, so follow-up and open-ended questions work too.
        const overview = this.buildStatementOverview(transactions);
        const ledger = this.buildLedger(transactions);

        const history = conversationHistory
            .slice(-6)
            .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 400)}`)
            .join('\n');

        return `You are a personal financial assistant with complete access to the user's bank statement data.

USER QUERY: "${userQuery}"
QUERY TYPE: ${queryType}

FINANCIAL OVERVIEW:
- Total Balance: ${totalBalance}
- Total Income: ${income}
- Total Expenses: ${expenses}
- Statement Period: ${statementPeriod?.startDate || 'N/A'} to ${statementPeriod?.endDate || 'N/A'}
- Total Transactions: ${transactions.length}

${overview}

${ledger}
${dataContext}
${history ? `\nRECENT CONVERSATION:\n${history}\n` : ''}
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

2b. **Using the statement**:
   - The ALL TRANSACTIONS ledger above is the user's complete statement. Quote
     real dates, amounts, payees and descriptions from it when answering.
   - For any total, use the pre-calculated STATEMENT TOTALS rather than adding up
     the ledger yourself.
   - CR means money coming in, DR means money going out. Never mix these up.
   - If the answer genuinely is not in the statement, say so plainly instead of
     estimating. Never invent a transaction, amount or date.

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

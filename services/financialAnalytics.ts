/**
 * Financial Analytics Engine
 * Provides comprehensive analytics and insights from transaction data
 */

import { Transaction, BankStatementData } from './bankStatementService';
import { DateQueryParser, DateRange } from '../utils/dateQueryParser';

export interface MonthlySummary {
    month: string;
    year: number;
    totalSpent: number;
    totalReceived: number;
    transactionCount: number;
    byCategory: Record<string, number>;
    byMerchant: Record<string, number>;
    averagePerDay: number;
    topExpense: { description: string; amount: number };
}

export interface DailySummary {
    date: string;
    transactions: Transaction[];
    totalSpent: number;
    totalReceived: number;
    categories: string[];
    netChange: number;
}

export interface CategoryInsight {
    category: string;
    total: number;
    count: number;
    averageAmount: number;
    percentage: number;
    topMerchants: Array<{ name: string; amount: number; count: number }>;
    trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ComparisonResult {
    period1: MonthlySummary;
    period2: MonthlySummary;
    difference: number;
    percentageChange: number;
    insights: string[];
    categoryChanges: Record<string, { amount: number; percentage: number }>;
}

export class FinancialAnalytics {
    /**
     * Get monthly spending summary
     */
    static getMonthlySpending(transactions: Transaction[], month: number, year: number): MonthlySummary {
        const monthTransactions = transactions.filter(t => {
            const [day, m, y] = t.date.split('/').map(Number);
            return m === month && y === year;
        });

        const byCategory: Record<string, number> = {};
        const byMerchant: Record<string, number> = {};
        let totalSpent = 0;
        let totalReceived = 0;
        let topExpense = { description: '', amount: 0 };

        monthTransactions.forEach(t => {
            // Category aggregation
            if (!byCategory[t.category]) {
                byCategory[t.category] = 0;
            }
            byCategory[t.category] += t.amount;

            // Merchant aggregation
            const merchant = t.merchant || this.extractMerchantFromDescription(t.description);
            if (merchant) {
                if (!byMerchant[merchant]) {
                    byMerchant[merchant] = 0;
                }
                byMerchant[merchant] += t.amount;
            }

            // Total spent/received
            if (t.type === 'debit') {
                totalSpent += t.amount;
                if (t.amount > topExpense.amount) {
                    topExpense = { description: t.description, amount: t.amount };
                }
            } else {
                totalReceived += t.amount;
            }
        });

        const daysInMonth = new Date(year, month, 0).getDate();
        const averagePerDay = totalSpent / daysInMonth;

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return {
            month: monthNames[month - 1],
            year,
            totalSpent,
            totalReceived,
            transactionCount: monthTransactions.length,
            byCategory,
            byMerchant,
            averagePerDay,
            topExpense
        };
    }

    /**
     * Get daily transactions and summary
     */
    static getDailyTransactions(transactions: Transaction[], date: string): DailySummary {
        const dailyTransactions = transactions.filter(t => t.date === date);

        let totalSpent = 0;
        let totalReceived = 0;
        const categories = new Set<string>();

        dailyTransactions.forEach(t => {
            categories.add(t.category);
            if (t.type === 'debit') {
                totalSpent += t.amount;
            } else {
                totalReceived += t.amount;
            }
        });

        return {
            date,
            transactions: dailyTransactions,
            totalSpent,
            totalReceived,
            categories: Array.from(categories),
            netChange: totalReceived - totalSpent
        };
    }

    /**
     * Compare two time periods
     */
    static compareMonths(transactions: Transaction[], month1: number, year1: number, month2: number, year2: number): ComparisonResult {
        const period1 = this.getMonthlySpending(transactions, month1, year1);
        const period2 = this.getMonthlySpending(transactions, month2, year2);

        const difference = period1.totalSpent - period2.totalSpent;
        const percentageChange = period2.totalSpent > 0 ? (difference / period2.totalSpent) * 100 : 0;

        const insights: string[] = [];
        const categoryChanges: Record<string, { amount: number; percentage: number }> = {};

        // Generate insights
        if (Math.abs(percentageChange) > 20) {
            insights.push(`Spending ${percentageChange > 0 ? 'increased' : 'decreased'} significantly by ${Math.abs(percentageChange).toFixed(1)}%`);
        }

        if (period1.transactionCount > period2.transactionCount * 1.2) {
            insights.push(`Transaction frequency increased by ${((period1.transactionCount - period2.transactionCount) / period2.transactionCount * 100).toFixed(0)}%`);
        }

        // Category-wise changes
        const allCategories = new Set([...Object.keys(period1.byCategory), ...Object.keys(period2.byCategory)]);
        allCategories.forEach(category => {
            const amount1 = period1.byCategory[category] || 0;
            const amount2 = period2.byCategory[category] || 0;
            const change = amount1 - amount2;
            const changePercent = amount2 > 0 ? (change / amount2) * 100 : 0;

            if (Math.abs(changePercent) > 15) {
                categoryChanges[category] = { amount: change, percentage: changePercent };
                insights.push(`${category}: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`);
            }
        });

        return {
            period1,
            period2,
            difference,
            percentageChange,
            insights,
            categoryChanges
        };
    }

    /**
     * Get spending trend
     */
    static getSpendingTrend(transactions: Transaction[], period: 'week' | 'month' | 'quarter'): {
        trend: 'increasing' | 'decreasing' | 'stable';
        percentageChange: number;
        prediction: string;
    } {
        // Group transactions by period
        const grouped = this.groupByPeriod(transactions, period);
        const values = Object.values(grouped);

        if (values.length < 2) {
            return { trend: 'stable', percentageChange: 0, prediction: 'Not enough data for trend analysis' };
        }

        // Calculate trend using simple linear regression
        const recent = values.slice(-3); // Last 3 periods
        const avg1 = recent.slice(0, Math.floor(recent.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(recent.length / 2);
        const avg2 = recent.slice(Math.floor(recent.length / 2)).reduce((a, b) => a + b, 0) / (recent.length - Math.floor(recent.length / 2));

        const percentageChange = avg1 > 0 ? ((avg2 - avg1) / avg1) * 100 : 0;

        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (percentageChange > 10) trend = 'increasing';
        else if (percentageChange < -10) trend = 'decreasing';

        const prediction = trend === 'increasing'
            ? `Spending is trending upward. Consider reviewing discretionary expenses.`
            : trend === 'decreasing'
                ? `Great! Spending is trending downward. Keep up the good work!`
                : `Spending is relatively stable.`;

        return { trend, percentageChange, prediction };
    }

    /**
     * Detect unusual transactions (anomalies)
     */
    static detectAnomalies(transactions: Transaction[]): {
        unusualTransactions: Transaction[];
        reasons: string[];
    } {
        const debitTransactions = transactions.filter(t => t.type === 'debit');

        if (debitTransactions.length === 0) {
            return { unusualTransactions: [], reasons: [] };
        }

        // Calculate average and standard deviation
        const amounts = debitTransactions.map(t => t.amount);
        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - avg, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);

        // Transactions > 2 standard deviations from mean are unusual
        const threshold = avg + (2 * stdDev);
        const unusualTransactions = debitTransactions.filter(t => t.amount > threshold);

        const reasons = unusualTransactions.map(t =>
            `${t.description}: ₹${t.amount.toLocaleString('en-IN')} (${((t.amount / avg - 1) * 100).toFixed(0)}% above average)`
        );

        return { unusualTransactions, reasons };
    }

    /**
     * Get category-specific insights
     */
    static getCategoryInsights(transactions: Transaction[], category: string): CategoryInsight {
        const categoryTransactions = transactions.filter(t =>
            t.category.toLowerCase() === category.toLowerCase() && t.type === 'debit'
        );

        const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
        const count = categoryTransactions.length;
        const averageAmount = count > 0 ? total / count : 0;

        // Calculate percentage of total spending
        const totalSpending = transactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);
        const percentage = totalSpending > 0 ? (total / totalSpending) * 100 : 0;

        // Top merchants
        const merchantMap: Record<string, { amount: number; count: number }> = {};
        categoryTransactions.forEach(t => {
            const merchant = t.merchant || this.extractMerchantFromDescription(t.description);
            if (merchant) {
                if (!merchantMap[merchant]) {
                    merchantMap[merchant] = { amount: 0, count: 0 };
                }
                merchantMap[merchant].amount += t.amount;
                merchantMap[merchant].count++;
            }
        });

        const topMerchants = Object.entries(merchantMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // Simple trend calculation (compare first half vs second half)
        const midpoint = Math.floor(categoryTransactions.length / 2);
        const firstHalf = categoryTransactions.slice(0, midpoint).reduce((sum, t) => sum + t.amount, 0);
        const secondHalf = categoryTransactions.slice(midpoint).reduce((sum, t) => sum + t.amount, 0);

        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (secondHalf > firstHalf * 1.2) trend = 'increasing';
        else if (secondHalf < firstHalf * 0.8) trend = 'decreasing';

        return {
            category,
            total,
            count,
            averageAmount,
            percentage,
            topMerchants,
            trend
        };
    }

    /**
     * Filter transactions by date range
     */
    static filterByDateRange(transactions: Transaction[], dateRange: DateRange): Transaction[] {
        return transactions.filter(t => DateQueryParser.isDateInRange(t.date, dateRange));
    }

    /**
     * Search transactions by merchant
     */
    static searchByMerchant(transactions: Transaction[], merchantQuery: string): Transaction[] {
        const query = merchantQuery.toLowerCase();
        return transactions.filter(t => {
            const merchant = (t.merchant || this.extractMerchantFromDescription(t.description)).toLowerCase();
            return merchant.includes(query) || t.description.toLowerCase().includes(query);
        });
    }

    /**
     * Get savings suggestions based on spending patterns
     */
    static getSavingsSuggestions(transactions: Transaction[]): string[] {
        const suggestions: string[] = [];

        // Analyze food delivery
        const foodDelivery = transactions.filter(t =>
            t.category === 'Food & Dining' &&
            (t.description.toLowerCase().includes('swiggy') || t.description.toLowerCase().includes('zomato'))
        );

        if (foodDelivery.length > 10) {
            const total = foodDelivery.reduce((sum, t) => sum + t.amount, 0);
            const potential = total * 0.6; // Could save 60% by cooking
            suggestions.push(`You ordered food delivery ${foodDelivery.length} times. Cooking at home could save ₹${potential.toLocaleString('en-IN')}/month`);
        }

        // Analyze subscriptions
        const subscriptions = transactions.filter(t =>
            t.description.toLowerCase().includes('subscription') ||
            t.description.toLowerCase().includes('netflix') ||
            t.description.toLowerCase().includes('spotify') ||
            t.description.toLowerCase().includes('prime')
        );

        if (subscriptions.length > 5) {
            suggestions.push(`You have ${subscriptions.length} subscriptions. Review and cancel unused ones to save money`);
        }

        // Analyze ATM withdrawals
        const atmWithdrawals = transactions.filter(t =>
            t.category === 'ATM' || t.description.toLowerCase().includes('atm')
        );

        if (atmWithdrawals.length > 8) {
            suggestions.push(`Frequent ATM withdrawals (${atmWithdrawals.length} times). Plan cash needs to avoid multiple withdrawal charges`);
        }

        return suggestions;
    }

    /**
     * Helper: Extract merchant name from description
     */
    private static extractMerchantFromDescription(description: string): string {
        // Remove common prefixes
        let merchant = description
            .replace(/^(UPI|NEFT|IMPS|RTGS)-/i, '')
            .replace(/^(To|From)\s+/i, '')
            .trim();

        // Take first part before special characters
        merchant = merchant.split(/[-/]/)[0].trim();

        return merchant || 'Unknown';
    }

    /**
     * Helper: Group transactions by period
     */
    private static groupByPeriod(transactions: Transaction[], period: 'week' | 'month' | 'quarter'): Record<string, number> {
        const grouped: Record<string, number> = {};

        transactions.forEach(t => {
            if (t.type !== 'debit') return;

            const [day, month, year] = t.date.split('/').map(Number);
            const date = new Date(year, month - 1, day);

            let key: string;
            if (period === 'week') {
                const weekNum = Math.floor(day / 7) + 1;
                key = `${year}-${month}-W${weekNum}`;
            } else if (period === 'month') {
                key = `${year}-${month}`;
            } else {
                const quarter = Math.floor((month - 1) / 3) + 1;
                key = `${year}-Q${quarter}`;
            }

            if (!grouped[key]) grouped[key] = 0;
            grouped[key] += t.amount;
        });

        return grouped;
    }
}

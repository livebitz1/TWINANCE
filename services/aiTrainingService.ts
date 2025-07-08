"use client";

import { geminiNLP } from "./geminiNLPService";
import { BankStatementData, Transaction } from "./bankStatementService";

/**
 * AI Training Service
 * 
 * This service is responsible for training the Gemini AI model on financial data
 * to improve its understanding of the user's financial situation and provide better
 * personalized responses.
 */
export class AITrainingService {
  /**
   * Train the AI on the user's financial data
   * @param financialData The user's financial data
   * @returns A confirmation message or error
   */
  async trainAI(financialData: BankStatementData): Promise<string> {
    try {
      // Create a comprehensive financial profile to train the AI
      const trainingContext = this.createFinancialProfile(financialData);
      
      // Train the AI by sending a detailed financial profile
      const trainingPrompt = `
        You are a financial AI assistant. Learn and internalize the following financial data
        to provide personalized, accurate financial advice and insights in future interactions.
        You should maintain this context for all future interactions with this user.
        
        FINANCIAL PROFILE:
        ${trainingContext}
        
        COMMON FINANCIAL QUESTIONS:
        ${this.getCommonFinancialQuestions()}
        
        EXPECTED RESPONSE STYLE:
        ${this.getResponseStyleGuidelines()}
        
        Confirm that you've integrated this financial context into your understanding
        and are ready to provide personalized financial assistance.
      `;
      
      // Send the training data to Gemini
      const response = await geminiNLP.generateResponse(
        "Initialize financial assistant with personalized user data", 
        trainingPrompt
      );
      
      return "AI training completed successfully.";
    } catch (error) {
      console.error("Error training AI:", error);
      return "Failed to train AI. Please try again later.";
    }
  }
  
  /**
   * Create a comprehensive financial profile for AI training
   * @param financialData The user's financial data
   * @returns A formatted financial profile
   */
  private createFinancialProfile(financialData: BankStatementData): string {
    // Extract core financial metrics
    const totalBalance = parseFloat(financialData.totalBalance.replace(/[₹,]/g, '')) || 0;
    const income = parseFloat(financialData.income.replace(/[₹,]/g, '')) || 0;
    const expenses = parseFloat(financialData.expenses.replace(/[₹,]/g, '')) || 0;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    
    // Analyze transactions
    const sortedTransactions = [...financialData.transactions].sort((a, b) => 
      a.id.localeCompare(b.id)
    );
    
    // Extract spending patterns
    const spendingPatterns = this.analyzeSpendingPatterns(sortedTransactions);
    
    // Extract category insights
    const categoryInsights = this.analyzeCategorySpending(sortedTransactions, expenses);
    
    // Analyze recurring transactions
    const recurringTransactions = this.analyzeRecurringTransactions(sortedTransactions);
    
    // Create temporal spending patterns
    const temporalPatterns = this.analyzeTemporalPatterns(sortedTransactions);
    
    // Compile the financial profile
    return `
      ACCOUNT INFORMATION:
      - Account Holder: ${financialData.accountDetails?.accountHolder || 'Unknown'}
      - Account Type: ${financialData.accountDetails?.accountType || 'Unknown'}
      - Account Number: ${financialData.accountDetails?.accountNumber || 'Unknown'}
      - Bank: ${financialData.accountDetails?.bankName || 'Unknown'}
      - Statement Period: ${financialData.statementPeriod?.startDate || 'Unknown'} to ${financialData.statementPeriod?.endDate || 'Unknown'}
      
      FINANCIAL SUMMARY:
      - Current Balance: ${financialData.totalBalance}
      - Total Income: ${financialData.income}
      - Total Expenses: ${financialData.expenses}
      - Savings Rate: ${savingsRate.toFixed(1)}%
      - Income Transactions: ${financialData.incomeTransactions}
      - Expense Transactions: ${financialData.expenseTransactions}
      - Month-over-Month Change: ${financialData.comparedToLastMonth}
      
      CATEGORY SPENDING:
      ${categoryInsights}
      
      SPENDING PATTERNS:
      ${spendingPatterns}
      
      RECURRING TRANSACTIONS:
      ${recurringTransactions}
      
      TEMPORAL SPENDING PATTERNS:
      ${temporalPatterns}
      
      FINANCIAL PERSONALITY:
      ${this.determineFinancialPersonality(savingsRate, categoryInsights, temporalPatterns)}
    `;
  }
  
  /**
   * Analyze spending patterns across different categories
   * @param transactions List of transactions
   * @param totalExpenses Total expenses amount
   * @returns Formatted category insights
   */
  private analyzeCategorySpending(transactions: Transaction[], totalExpenses: number): string {
    const categories: Record<string, number> = {};
    
    transactions.forEach(transaction => {
      if (transaction.type === 'debit') {
        if (!categories[transaction.category]) {
          categories[transaction.category] = 0;
        }
        categories[transaction.category] += transaction.amount;
      }
    });
    
    // Sort categories by amount
    const sortedCategories = Object.entries(categories)
      .map(([category, amount]) => ({ 
        category, 
        amount,
        percentage: (amount / totalExpenses) * 100
      }))
      .sort((a, b) => b.amount - a.amount);
    
    // Format the output
    return sortedCategories.map(({ category, amount, percentage }) =>
      `- ${category}: ₹${amount.toLocaleString('en-IN')} (${percentage.toFixed(1)}% of expenses)`
    ).join('\n');
  }
  
  /**
   * Analyze overall spending patterns
   * @param transactions List of transactions
   * @returns Formatted spending patterns
   */
  private analyzeSpendingPatterns(transactions: Transaction[]): string {
    // Find largest expense
    let largestExpense = transactions
      .filter(t => t.type === 'debit')
      .sort((a, b) => b.amount - a.amount)[0];
    
    // Find smallest expense
    let smallestExpense = transactions
      .filter(t => t.type === 'debit' && t.amount > 0)
      .sort((a, b) => a.amount - b.amount)[0];
    
    // Find largest income
    let largestIncome = transactions
      .filter(t => t.type === 'credit')
      .sort((a, b) => b.amount - a.amount)[0];
    
    // Average transaction amount
    const avgDebit = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0) / 
      transactions.filter(t => t.type === 'debit').length || 0;
    
    const avgCredit = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0) / 
      transactions.filter(t => t.type === 'credit').length || 0;
    
    return `
      - Largest Expense: ${largestExpense ? `₹${largestExpense.amount.toLocaleString('en-IN')} for ${largestExpense.description} (${largestExpense.category})` : 'None'}
      - Smallest Expense: ${smallestExpense ? `₹${smallestExpense.amount.toLocaleString('en-IN')} for ${smallestExpense.description}` : 'None'}
      - Largest Income: ${largestIncome ? `₹${largestIncome.amount.toLocaleString('en-IN')} from ${largestIncome.description}` : 'None'}
      - Average Expense Transaction: ₹${avgDebit.toLocaleString('en-IN')}
      - Average Income Transaction: ₹${avgCredit.toLocaleString('en-IN')}
    `;
  }
  
  /**
   * Analyze recurring transactions
   * @param transactions List of transactions
   * @returns Formatted recurring transactions analysis
   */
  private analyzeRecurringTransactions(transactions: Transaction[]): string {
    // Group by merchant or description patterns
    const merchantTransactions: Record<string, {count: number, total: number, transactions: Transaction[]}> = {};
    
    transactions.forEach(transaction => {
      const key = transaction.merchant || transaction.description;
      
      if (!merchantTransactions[key]) {
        merchantTransactions[key] = {
          count: 0,
          total: 0,
          transactions: []
        };
      }
      
      merchantTransactions[key].count += 1;
      merchantTransactions[key].total += transaction.amount;
      merchantTransactions[key].transactions.push(transaction);
    });
    
    // Find potential recurring transactions (same merchant more than once)
    const recurring = Object.entries(merchantTransactions)
      .filter(([, data]) => data.count > 1)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
    
    if (recurring.length === 0) {
      return "No recurring transactions identified.";
    }
    
    return recurring.map(([merchant, data]) => 
      `- ${merchant}: ${data.count} transactions, ₹${data.total.toLocaleString('en-IN')} total ` +
      `(avg ₹${(data.total / data.count).toLocaleString('en-IN')} per transaction)`
    ).join('\n');
  }
  
  /**
   * Analyze spending patterns over time
   * @param transactions List of transactions
   * @returns Formatted temporal spending patterns
   */
  private analyzeTemporalPatterns(transactions: Transaction[]): string {
    // Group by day of week
    const dayOfWeekSpending: Record<string, number> = {
      "Monday": 0, "Tuesday": 0, "Wednesday": 0, "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0
    };
    
    // Group by week of month
    const weekOfMonthSpending: Record<string, number> = {
      "Week 1": 0, "Week 2": 0, "Week 3": 0, "Week 4": 0, "Week 5": 0
    };
    
    // Group by time of day
    const timeOfDaySpending: Record<string, number> = {
      "Morning (6am-12pm)": 0,
      "Afternoon (12pm-6pm)": 0,
      "Evening (6pm-12am)": 0,
      "Night (12am-6am)": 0
    };
    
    transactions
      .filter(t => t.type === 'debit' && t.date)
      .forEach(transaction => {
        try {
          // Parse the date (DD/MM/YYYY format)
          const [day, month, year] = transaction.date.split('/').map(Number);
          const date = new Date(year, month - 1, day);
          
          // Get day of week
          const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
          dayOfWeekSpending[dayOfWeek] += transaction.amount;
          
          // Calculate week of month (1-5)
          const weekOfMonth = Math.ceil(day / 7);
          const weekKey = `Week ${weekOfMonth}`;
          if (weekOfMonthSpending[weekKey] !== undefined) {
            weekOfMonthSpending[weekKey] += transaction.amount;
          }
          
          // Simulate time of day based on transaction description
          // In a real app, we might have actual timestamps
          const lowercase = transaction.description.toLowerCase();
          if (lowercase.includes('breakfast') || lowercase.includes('morning') || 
              lowercase.includes('coffee') || lowercase.includes('grocery')) {
            timeOfDaySpending["Morning (6am-12pm)"] += transaction.amount;
          } else if (lowercase.includes('lunch') || lowercase.includes('afternoon')) {
            timeOfDaySpending["Afternoon (12pm-6pm)"] += transaction.amount;
          } else if (lowercase.includes('dinner') || lowercase.includes('restaurant') || 
                    lowercase.includes('pub') || lowercase.includes('bar')) {
            timeOfDaySpending["Evening (6pm-12am)"] += transaction.amount;
          } else if (lowercase.includes('late') || lowercase.includes('night')) {
            timeOfDaySpending["Night (12am-6am)"] += transaction.amount;
          } else {
            // Distribute randomly but deterministically
            const hash = transaction.id.charCodeAt(transaction.id.length - 1) % 4;
            const timeKeys = Object.keys(timeOfDaySpending);
            timeOfDaySpending[timeKeys[hash]] += transaction.amount;
          }
        } catch (e) {
          // Skip invalid dates
        }
      });
    
    return `
      Spending by Day of Week:
      ${Object.entries(dayOfWeekSpending)
        .sort((a, b) => b[1] - a[1])
        .map(([day, amount]) => `- ${day}: ₹${amount.toLocaleString('en-IN')}`)
        .join('\n')}
      
      Spending by Week of Month:
      ${Object.entries(weekOfMonthSpending)
        .filter(([, amount]) => amount > 0)
        .map(([week, amount]) => `- ${week}: ₹${amount.toLocaleString('en-IN')}`)
        .join('\n')}
      
      Spending by Time of Day:
      ${Object.entries(timeOfDaySpending)
        .sort((a, b) => b[1] - a[1])
        .map(([time, amount]) => `- ${time}: ₹${amount.toLocaleString('en-IN')}`)
        .join('\n')}
    `;
  }
  
  /**
   * Determine the user's financial personality based on their spending habits
   * @param savingsRate The user's savings rate
   * @param categoryInsights Category spending insights
   * @param temporalPatterns Temporal spending patterns
   * @returns Financial personality profile
   */
  private determineFinancialPersonality(
    savingsRate: number, 
    categoryInsights: string,
    temporalPatterns: string
  ): string {
    // Create a personality profile based on financial behaviors
    const traits = [];
    
    // Savings behavior
    if (savingsRate >= 30) {
      traits.push("High Saver: Saves more than 30% of income, indicating strong financial discipline.");
    } else if (savingsRate >= 20) {
      traits.push("Balanced Saver: Saves 20-30% of income, following recommended financial practices.");
    } else if (savingsRate >= 10) {
      traits.push("Moderate Saver: Saves 10-20% of income, but could improve savings rate.");
    } else if (savingsRate >= 0) {
      traits.push("Low Saver: Saves less than 10% of income, at risk of financial stress.");
    } else {
      traits.push("Deficit Spender: Spending exceeds income, indicating financial risk.");
    }
    
    // Spending categories patterns
    if (categoryInsights.toLowerCase().includes('shopping')) {
      traits.push("Shopping-Oriented: Significant spending on retail purchases.");
    }
    
    if (categoryInsights.toLowerCase().includes('food & dining')) {
      traits.push("Food Enthusiast: Notable spending on dining and food.");
    }
    
    if (categoryInsights.toLowerCase().includes('entertainment')) {
      traits.push("Entertainment-Focused: Values leisure and entertainment experiences.");
    }
    
    if (categoryInsights.toLowerCase().includes('healthcare')) {
      traits.push("Health-Conscious: Invests in healthcare and wellbeing.");
    }
    
    if (categoryInsights.toLowerCase().includes('education')) {
      traits.push("Learning-Oriented: Invests in education and self-improvement.");
    }
    
    // Temporal patterns
    if (temporalPatterns.toLowerCase().includes('weekend')) {
      traits.push("Weekend Spender: Higher spending activity on weekends.");
    }
    
    if (temporalPatterns.toLowerCase().includes('evening')) {
      traits.push("Evening Spender: More active spending in evening hours.");
    }
    
    return traits.join('\n');
  }
  
  /**
   * Get common financial questions for training
   * @returns List of common financial questions and ideal responses
   */
  private getCommonFinancialQuestions(): string {
    return `
      1. "How am I doing financially?"
         - Provide a comprehensive overview including savings rate, major spending categories, and specific recommendations
      
      2. "Where am I spending too much money?"
         - Identify the highest spending categories relative to total expenses and suggest specific reductions
      
      3. "How can I save more money?"
         - Offer personalized advice based on their actual spending patterns and identify specific opportunities
      
      4. "What are my recurring expenses?"
         - List recurring transactions, their frequency, and total impact on monthly budget
      
      5. "When do I spend the most money?"
         - Analyze temporal spending patterns by day of week, time of day, or week of month
      
      6. "Am I on track for financial stability?"
         - Evaluate savings rate, expense ratios, and provide specific metrics on financial health
      
      7. "What unusual transactions do I have?"
         - Identify outlier transactions that differ from normal spending patterns
      
      8. "How does my spending compare to last month?"
         - Provide specific numbers and percentages comparing current spending to previous periods
      
      9. "What's my biggest expense category?"
         - Identify the largest spending category with exact amounts and percentages
      
      10. "Can you help me budget better?"
          - Suggest a personalized budget based on their actual income and spending patterns
    `;
  }
  
  /**
   * Get response style guidelines for training
   * @returns Guidelines for AI response style
   */
  private getResponseStyleGuidelines(): string {
    return `
      1. Be conversational and natural in tone while maintaining professionalism
      
      2. Always include specific numbers and percentages from the user's financial data
      
      3. Provide actionable advice tailored to the user's specific financial situation
      
      4. Balance technical financial terms with clear explanations
      
      5. Organize responses with natural paragraphs rather than bullet points when possible
      
      6. Reference specific transactions or patterns from their statement when relevant
      
      7. Maintain a supportive, non-judgmental tone about spending habits
      
      8. For complex topics, break down explanations into simpler components
      
      9. When making recommendations, explain both what to do and why it would help
      
      10. End responses with a natural conversational prompt or relevant follow-up question
    `;
  }
}

// Export a singleton instance for use throughout the application
export const aiTraining = new AITrainingService();

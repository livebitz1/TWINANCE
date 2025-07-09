"use client";

import { Transaction, BankStatementData } from "./bankStatementService";

/**
 * Advanced Indian Bank Statement Parser
 * Specifically designed to extract real transaction data from Indian bank statements
 */
export class IndianBankStatementParser {
  
  /**
   * Parse Indian bank statement text and extract real transactions
   */
  static parseStatement(text: string): BankStatementData | null {
    console.log("Starting advanced Indian bank statement parsing...");
    console.log("Text sample:", text.substring(0, 500));
    
    try {
      // Clean up the text
      const cleanText = this.cleanText(text);
      
      // Extract basic information
      const accountDetails = this.extractAccountDetails(cleanText);
      const statementPeriod = this.extractStatementPeriod(cleanText);
      const balanceInfo = this.extractBalanceInfo(cleanText);
      
      // Extract transactions - this is the critical part
      const transactions = this.extractTransactions(cleanText);
      
      console.log(`Extracted ${transactions.length} transactions`);
      
      if (transactions.length === 0) {
        console.log("No transactions found in the statement");
        return null;
      }
      
      // Calculate totals from real transactions
      const totals = this.calculateTotals(transactions);
      
      // Generate budget data from real transactions
      const budgetData = this.generateBudgetData(transactions);
      
      return {
        totalBalance: balanceInfo.balance,
        income: `₹${totals.income.toLocaleString('en-IN')}`,
        expenses: `₹${totals.expenses.toLocaleString('en-IN')}`,
        incomeTransactions: totals.incomeCount,
        expenseTransactions: totals.expenseCount,
        comparedToLastMonth: "₹0", // Would need historical data
        budgetData,
        transactions,
        accountDetails,
        statementPeriod
      };
      
    } catch (error) {
      console.error("Error parsing Indian bank statement:", error);
      return null;
    }
  }
  
  /**
   * Clean and normalize the text for better parsing
   */
  private static cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Extract account details from the statement
   */
  private static extractAccountDetails(text: string): any {
    const accountNumberRegex = /(?:Account\s*No\.?|A\/C\s*No\.?|Account\s*Number)[:\s]*(\d{4,})/i;
    const accountHolderRegex = /(?:Account\s*Holder|Name)[:\s]*([A-Z\s]+)/i;
    const bankNameRegex = /([A-Z\s]+BANK)/i;
    
    const accountNumber = text.match(accountNumberRegex)?.[1] || "****";
    const accountHolder = text.match(accountHolderRegex)?.[1]?.trim() || "Account Holder";
    const bankName = text.match(bankNameRegex)?.[1]?.trim() || "Bank";
    
    return {
      accountHolder,
      accountNumber,
      accountType: "Savings",
      bankName
    };
  }
  
  /**
   * Extract statement period from the text
   */
  private static extractStatementPeriod(text: string): any {
    const periodRegex = /(?:Statement\s*Period|Period)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s*(?:to|TO|-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i;
    const match = text.match(periodRegex);
    
    if (match) {
      return {
        startDate: this.formatDate(match[1]),
        endDate: this.formatDate(match[2])
      };
    }
    
    return {
      startDate: "01/04/2025",
      endDate: "30/06/2025"
    };
  }
  
  /**
   * Extract balance information
   */
  private static extractBalanceInfo(text: string): any {
    const balanceRegex = /(?:Balance|Closing\s*Balance)[:\s]*₹?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i;
    const match = text.match(balanceRegex);
    
    if (match) {
      const balance = parseFloat(match[1].replace(/,/g, ''));
      return {
        balance: `₹${balance.toLocaleString('en-IN')}`
      };
    }
    
    return {
      balance: "₹0"
    };
  }
  
  /**
   * Extract real transactions from the statement
   * This is the most critical function
   */
  private static extractTransactions(text: string): Transaction[] {
    const transactions: Transaction[] = [];
    
    // Multiple patterns to match different bank statement formats
    const patterns = [
      // Pattern 1: UPI transactions - fixed pattern
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+UPI\s+to\s+(.+?)\s+₹(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      
      // Pattern 2: UPI transactions with different format
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+UPI.*?(\w+.*?)\s+₹(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      
      // Pattern 3: General transactions with date, description, amount
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+₹(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      
      // Pattern 4: Transaction with Dr/Cr indicators
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+(Dr|Cr)\s+₹(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      
      // Pattern 5: IMPS/NEFT transactions
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(?:IMPS|NEFT|RTGS)\s+(.+?)\s+₹(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi
    ];
    
    // Try each pattern
    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        const transaction = this.parseTransactionMatch(match, transactions.length);
        if (transaction) {
          transactions.push(transaction);
        }
      }
    }
    
    // If no transactions found with patterns, try line-by-line parsing
    if (transactions.length === 0) {
      console.log("No transactions found with patterns, trying line-by-line parsing");
      return this.parseLineByLine(text);
    }
    
    // Remove duplicates and sort by date
    const uniqueTransactions = this.removeDuplicates(transactions);
    
    return uniqueTransactions.sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });
  }
  
  /**
   * Parse a single transaction match
   */
  private static parseTransactionMatch(match: RegExpMatchArray, index: number): Transaction | null {
    try {
      let date, description, amount, type = 'debit';
      
      if (match.length === 4) {
        // Pattern with date, description, amount
        [, date, description, amount] = match;
      } else if (match.length === 5) {
        // Pattern with date, description, Dr/Cr, amount
        [, date, description, type, amount] = match;
        type = type.toLowerCase() === 'cr' ? 'credit' : 'debit';
      } else {
        return null;
      }
      
      // Clean up the data
      const cleanAmount = parseFloat(amount.replace(/[,₹]/g, ''));
      const cleanDate = this.formatDate(date);
      const cleanDescription = description.trim();
      
      // For UPI transactions, ensure we capture the full description
      if (cleanDescription.toLowerCase().includes('upi') || match[0].toLowerCase().includes('upi')) {
        // If this is a UPI transaction, extract the merchant name properly
        const upiMatch = match[0].match(/UPI\s+to\s+(.+?)\s+₹/i);
        if (upiMatch) {
          description = `UPI to ${upiMatch[1].trim()}`;
        }
      }
      
      // Determine transaction type if not explicitly set
      if (type === 'debit' && this.isIncomeTransaction(cleanDescription)) {
        type = 'credit';
      }
      
      return {
        id: `real-trans-${index + 1}`,
        date: cleanDate,
        description: cleanDescription,
        amount: cleanAmount,
        type: type as 'credit' | 'debit',
        category: this.categorizeTransaction(cleanDescription),
        referenceNumber: `REF${Date.now()}${index}`,
        balanceAfter: 0, // Would need to calculate from statement
        merchant: this.extractMerchant(cleanDescription)
      };
      
    } catch (error) {
      console.error("Error parsing transaction match:", error);
      return null;
    }
  }
  
  /**
   * Parse transactions line by line when patterns fail
   */
  private static parseLineByLine(text: string): Transaction[] {
    const transactions: Transaction[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines or header lines
      if (!trimmedLine || trimmedLine.length < 20) {
        continue;
      }
      
      // Look for date patterns at the beginning of the line
      const dateMatch = trimmedLine.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
      if (dateMatch) {
        const transaction = this.parseTransactionLine(trimmedLine, transactions.length);
        if (transaction) {
          transactions.push(transaction);
        }
      }
    }
    
    return transactions;
  }
  
  /**
   * Parse a single transaction line
   */
  private static parseTransactionLine(line: string, index: number): Transaction | null {
    try {
      // Extract date from the beginning
      const dateMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
      if (!dateMatch) return null;
      
      const date = dateMatch[1];
      
      // Extract amount (look for number patterns)
      const amountMatch = line.match(/₹?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
      if (!amountMatch) return null;
      
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      
      // Extract description (everything between date and amount)
      const description = line
        .replace(dateMatch[0], '')
        .replace(amountMatch[0], '')
        .trim();
      
      if (!description) return null;
      
      // Determine transaction type
      const type = this.isIncomeTransaction(description) ? 'credit' : 'debit';
      
      return {
        id: `line-trans-${index + 1}`,
        date: this.formatDate(date),
        description,
        amount,
        type,
        category: this.categorizeTransaction(description),
        referenceNumber: `REF${Date.now()}${index}`,
        balanceAfter: 0,
        merchant: this.extractMerchant(description)
      };
      
    } catch (error) {
      console.error("Error parsing transaction line:", error);
      return null;
    }
  }
  
  /**
   * Check if a transaction is income based on description
   */
  private static isIncomeTransaction(description: string): boolean {
    const lowerDesc = description.toLowerCase();
    return lowerDesc.includes('salary') || 
           lowerDesc.includes('credit') || 
           lowerDesc.includes('deposit') || 
           lowerDesc.includes('interest') ||
           lowerDesc.includes('refund');
  }
  
  /**
   * Categorize transaction based on description
   */
  private static categorizeTransaction(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('upi')) return 'UPI';
    if (lowerDesc.includes('salary') || lowerDesc.includes('income')) return 'Income';
    if (lowerDesc.includes('food') || lowerDesc.includes('restaurant')) return 'Food & Dining';
    if (lowerDesc.includes('transport') || lowerDesc.includes('uber')) return 'Transportation';
    if (lowerDesc.includes('shopping') || lowerDesc.includes('amazon')) return 'Shopping';
    if (lowerDesc.includes('bill') || lowerDesc.includes('utility')) return 'Bills & Utilities';
    if (lowerDesc.includes('health') || lowerDesc.includes('medical')) return 'Healthcare';
    if (lowerDesc.includes('transfer') || lowerDesc.includes('neft')) return 'Transfer';
    
    return 'Other';
  }
  
  /**
   * Extract merchant name from description
   */
  private static extractMerchant(description: string): string {
    // Look for common merchant patterns
    const patterns = [
      /UPI.*?to\s+(.+?)(?:\s|$)/i,
      /UPI.*?-\s*(.+?)(?:\s|$)/i,
      /(?:AMAZON|FLIPKART|PAYTM|PHONEPE|GOOGLEPAY)\s*(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Default to first few words
    return description.split(' ').slice(0, 3).join(' ');
  }
  
  /**
   * Format date to DD/MM/YYYY
   */
  private static formatDate(dateStr: string): string {
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      
      // Handle 2-digit years
      if (year.length === 2) {
        const currentYear = new Date().getFullYear();
        const currentCentury = Math.floor(currentYear / 100) * 100;
        const twoDigitYear = parseInt(year);
        
        // If the year is greater than current year's last two digits + 10, 
        // assume it's from the previous century
        if (twoDigitYear > (currentYear % 100) + 10) {
          year = (currentCentury - 100 + twoDigitYear).toString();
        } else {
          year = (currentCentury + twoDigitYear).toString();
        }
      }
      
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  }
  
  /**
   * Remove duplicate transactions
   */
  private static removeDuplicates(transactions: Transaction[]): Transaction[] {
    const seen = new Set<string>();
    return transactions.filter(transaction => {
      const key = `${transaction.date}-${transaction.description}-${transaction.amount}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  /**
   * Calculate totals from transactions
   */
  private static calculateTotals(transactions: Transaction[]) {
    let income = 0;
    let expenses = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    
    transactions.forEach(transaction => {
      if (transaction.type === 'credit') {
        income += transaction.amount;
        incomeCount++;
      } else {
        expenses += transaction.amount;
        expenseCount++;
      }
    });
    
    return { income, expenses, incomeCount, expenseCount };
  }
  
  /**
   * Generate budget data from real transactions
   */
  private static generateBudgetData(transactions: Transaction[]): { name: string; amount: number }[] {
    const dailyTotals: Record<string, number> = {};
    
    transactions.forEach(transaction => {
      if (transaction.type === 'debit') {
        const dateParts = transaction.date.split('/');
        const dayMonth = `${dateParts[0]}/${dateParts[1]}`;
        dailyTotals[dayMonth] = (dailyTotals[dayMonth] || 0) + transaction.amount;
      }
    });
    
    return Object.entries(dailyTotals)
      .map(([date, amount]) => ({ name: date, amount }))
      .sort((a, b) => {
        const dateA = new Date(a.name.split('/').reverse().join('-'));
        const dateB = new Date(b.name.split('/').reverse().join('-'));
        return dateA.getTime() - dateB.getTime();
      });
  }
}

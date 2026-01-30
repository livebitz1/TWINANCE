/**
 * Enhanced Universal Bank Statement Parser
 * Designed to handle ANY Indian bank statement format
 */

import { Transaction, BankStatementData } from "./bankStatementService";

export class UniversalBankStatementParser {
  
  static parseStatement(text: string): BankStatementData | null {
    console.log("=== UNIVERSAL PARSER STARTING ===");
    console.log("Input text length:", text.length);
    console.log("First 500 chars:", text.substring(0, 500));
    
    try {
      // Step 1: Find ALL potential transaction patterns from REAL DATA ONLY
      const transactions = this.extractAllTransactionPatterns(text);
      
      console.log(`✅ Found ${transactions.length} real transactions with Universal Parser`);
      
      // ONLY proceed if we found actual transactions from the PDF
      if (transactions.length > 0) {
        return this.buildAnalysisResult(transactions);
      }
      
      // NO FALLBACK DATA GENERATION - Only real data from PDF
      console.log("❌ Could not extract any real transaction data from PDF");
      console.log("❌ Universal parser failed - NO mock data will be generated");
      return null;
      
    } catch (error) {
      console.error("Universal parser error:", error);
      console.error("❌ Parser failed - NO fallback data will be generated");
      return null;
    }
  }
  
  private static extractAllTransactionPatterns(text: string): Transaction[] {
    const transactions: Transaction[] = [];
    const lines = text.split('\n');
    
    console.log(`Analyzing ${lines.length} lines of text...`);
    
    // Enhanced patterns that work with ANY format
    const patterns = [
      // Pattern 1: Date + Amount (most universal)
      {
        regex: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}).*?(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)/g,
        name: "Date + Amount"
      },
      
      // Pattern 2: Amount with currency symbols
      {
        regex: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}).*?[₹$][\s]*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)/g,
        name: "Date + Currency + Amount"
      },
      
      // Pattern 3: Debit/Credit indicators
      {
        regex: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}).*?(Dr|Cr|Debit|Credit).*?(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)/gi,
        name: "Date + Dr/Cr + Amount"
      },
      
      // Pattern 4: UPI specific
      {
        regex: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}).*?UPI.*?(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)/gi,
        name: "UPI Transactions"
      },
      
      // Pattern 5: Line contains both date and number
      {
        regex: /^.*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}).*(\d{3,}).*$/gm,
        name: "Line with Date and Large Number"
      }
    ];
    
    // Try each pattern
    patterns.forEach((pattern, index) => {
      console.log(`Trying pattern ${index + 1}: ${pattern.name}`);
      const matches = [...text.matchAll(pattern.regex)];
      console.log(`Found ${matches.length} matches with pattern ${index + 1}`);
      
      matches.forEach((match, matchIndex) => {
        try {
          const transaction = this.parseTransactionMatch(match, pattern.name, text);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          console.log(`Error parsing match ${matchIndex}:`, error);
        }
      });
    });
    
    // Remove duplicates based on date + amount
    const unique = this.removeDuplicateTransactions(transactions);
    console.log(`After removing duplicates: ${unique.length} transactions`);
    
    return unique;
  }
  
  private static parseTransactionMatch(match: RegExpMatchArray, patternName: string, fullText: string): Transaction | null {
    try {
      // Extract date (always first capture group)
      const dateStr = match[1];
      const date = this.normalizeDate(dateStr);
      
      // Extract amount (find the largest number in the match)
      const numbers = match.slice(1).filter(Boolean)
        .flatMap(part => part.match(/\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?/g) || [])
        .map(num => parseFloat(num.replace(/[,\s]/g, '')))
        .filter(num => num > 0 && num < 10000000); // Reasonable transaction range
      
      if (numbers.length === 0) return null;
      
      const amount = Math.max(...numbers);
      
      // Extract description (everything between date and amount)
      let description = match[0]
        .replace(dateStr, '')
        .replace(/\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?/g, '')
        .replace(/[₹$]/g, '')
        .trim();
      
      if (!description) {
        description = `Transaction on ${date}`;
      }
      
      // Determine transaction type
      let type = this.determineTransactionType(match[0], description);
      // Fallback: If pattern is 'Date + Amount' and description contains 'Deposit' or 'Deposit Amt.' or 'Deposit Amount', treat as credit
      if (patternName === 'Date + Amount' && /deposit( amt\.?| amount)?/i.test(description)) {
        type = "credit";
      }
      // Fallback: If pattern is 'Date + Amount' and description contains 'CR' (case-insensitive), treat as credit
      if (patternName === 'Date + Amount' && /\bcr\b/i.test(description)) {
        type = "credit";
      }
      
      // Generate transaction
      return {
        id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date,
        description: description.substring(0, 50),
        amount,
        type,
        category: this.categorizeTransaction(description),
        referenceNumber: this.extractReferenceNumber(match[0]),
        balanceAfter: 0 // Will be calculated later if available
      };
      
    } catch (error) {
      console.log("Error parsing transaction match:", error);
      return null;
    }
  }
  
  private static normalizeDate(dateStr: string): string {
    // Convert any date format to DD/MM/YYYY
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length >= 3) {
      let [day, month, year] = parts;
      
      // Handle 2-digit years
      if (year.length === 2) {
        year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      }
      
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    return dateStr;
  }
  
  private static determineTransactionType(matchText: string, description: string): "credit" | "debit" {
    const lowerText = matchText.toLowerCase() + " " + description.toLowerCase();
    
    // Credit indicators
    if (lowerText.includes('credit') || lowerText.includes('deposit') || 
        lowerText.includes('salary') || lowerText.includes('cr ') ||
        lowerText.includes('inward') || lowerText.includes('Deposit Amt.') || lowerText.includes('Deposit Amount') || lowerText.includes('Chq./Ref.No.') && lowerText.match(/Deposit/i)) {
      return "credit";
    }
    
    // Debit indicators  
    if (lowerText.includes('debit') || lowerText.includes('dr ') ||
        lowerText.includes('withdrawal') || lowerText.includes('payment') ||
        lowerText.includes('transfer')) {
      return "debit";
    }
    
    // Default to debit (most transactions are debits)
    return "debit";
  }
  
  private static categorizeTransaction(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('salary') || desc.includes('income')) return "Income";
    if (desc.includes('upi')) return "UPI";
    if (desc.includes('food') || desc.includes('restaurant')) return "Food & Dining";
    if (desc.includes('amazon') || desc.includes('shopping')) return "Shopping";
    if (desc.includes('transfer') || desc.includes('neft')) return "Transfer";
    if (desc.includes('atm')) return "ATM";
    
    return "Other";
  }
  
  private static extractReferenceNumber(text: string): string {
    const refMatch = text.match(/\d{10,}/);
    return refMatch ? refMatch[0] : "";
  }
  
  private static removeDuplicateTransactions(transactions: Transaction[]): Transaction[] {
    const seen = new Set();
    return transactions.filter(t => {
      const key = `${t.date}-${t.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  private static calculateTotals(transactions: Transaction[]) {
    const income = transactions
      .filter(t => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      income,
      expenses,
      balance: income - expenses,
      incomeCount: transactions.filter(t => t.type === "credit").length,
      expenseCount: transactions.filter(t => t.type === "debit").length
    };
  }
  
  private static extractBalance(text: string): number | null {
    const patterns = [
      /balance.*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
      /closing.*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
      /₹\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g
    ];
    
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const amounts = matches.map(m => parseFloat(m[1].replace(/,/g, '')));
        return Math.max(...amounts);
      }
    }
    
    return null;
  }
  
  private static generateBudgetData(transactions: Transaction[]) {
    // Create budget breakdown by category
    const categories: { [key: string]: number } = {};
    
    transactions.filter(t => t.type === "debit").forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    
    return Object.entries(categories).map(([category, amount]) => ({
      name: category,
      amount
    }));
  }
  
  private static buildAnalysisResult(transactions: Transaction[]): BankStatementData {
    // Step 2: Calculate totals
    const totals = this.calculateTotals(transactions);
    
    // Step 3: Extract balance (use calculated balance as fallback)
    const balance = totals.balance;
    
    return {
      totalBalance: `₹${Math.abs(balance).toLocaleString('en-IN')}`,
      income: `₹${totals.income.toLocaleString('en-IN')}`,
      expenses: `₹${totals.expenses.toLocaleString('en-IN')}`,
      incomeTransactions: totals.incomeCount,
      expenseTransactions: totals.expenseCount,
      comparedToLastMonth: "₹0",
      budgetData: this.generateBudgetData(transactions),
      transactions
    };  }
}

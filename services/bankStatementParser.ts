"use client";

import { Transaction, BankStatementData } from "./bankStatementService";

/**
 * Fallback parser for bank statements when Gemini API is not available
 * This parser uses regex patterns to extract transaction data from common Indian bank statement formats
 */
export function parseIndianBankStatement(text: string): BankStatementData | null {
  try {
    console.log("Using fallback bank statement parser...");
    
    // Common patterns for Indian bank statements
    const transactionPatterns = [
      // Pattern 1: Date Amount Description Balance
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\s+([+-]?\d+(?:,\d{3})*(?:\.\d{2})?)\s+(.+?)\s+(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      // Pattern 2: Date Description Dr/Cr Amount Balance
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\s+(.+?)\s+(Dr|Cr)\s+(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      // Pattern 3: Date Description Amount Balance
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\s+(.+?)\s+(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(\d+(?:,\d{3})*(?:\.\d{2})?)/g
    ];
    
    const transactions: Transaction[] = [];
    let totalBalance = 0;
    let totalIncome = 0;
    let totalExpenses = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    
    // Extract account details
    const accountNumberMatch = text.match(/Account\s*No[:\s]*(\d+)/i);
    const accountHolderMatch = text.match(/Account\s*Holder[:\s]*([A-Z\s]+)/i);
    const bankNameMatch = text.match(/([A-Z\s]+BANK)/i);
    
    // Extract statement period
    const dateRangeMatch = text.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\s*to\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i);
    
    // Try each pattern to extract transactions
    for (const pattern of transactionPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        let date, description, amount, balance, type;
        
        if (match.length === 5) {
          // Pattern 1: Date Amount Description Balance
          [, date, amount, description, balance] = match;
          type = amount.startsWith('-') || amount.includes('Dr') ? 'debit' : 'credit';
          amount = amount.replace(/[-+Dr]/g, '').trim();
        } else if (match.length === 6) {
          // Pattern 2: Date Description Dr/Cr Amount Balance
          [, date, description, type, amount, balance] = match;
          type = type === 'Dr' ? 'debit' : 'credit';
        } else if (match.length === 5) {
          // Pattern 3: Date Description Amount Balance
          [, date, description, amount, balance] = match;
          // Determine type based on description or amount
          type = description.toLowerCase().includes('salary') || 
                 description.toLowerCase().includes('credit') || 
                 description.toLowerCase().includes('deposit') ? 'credit' : 'debit';
        }
        
        if (date && description && amount) {
          // Clean and format data
          const cleanAmount = parseFloat(amount.replace(/[,₹]/g, ''));
          const cleanBalance = balance ? parseFloat(balance.replace(/[,₹]/g, '')) : 0;
          
          // Convert date to DD/MM/YYYY format
          const dateParts = date.split(/[-\/]/);
          const formattedDate = dateParts.length === 3 ? 
            `${dateParts[0].padStart(2, '0')}/${dateParts[1].padStart(2, '0')}/${dateParts[2]}` : 
            date;
          
          // Categorize transaction
          const category = categorizeTransaction(description);
          
          const transaction: Transaction = {
            id: `trans-${transactions.length + 1}`,
            date: formattedDate,
            description: description.trim(),
            amount: cleanAmount,
            type: type as 'credit' | 'debit',
            category,
            referenceNumber: `REF${Date.now()}${transactions.length}`,
            balanceAfter: cleanBalance,
            merchant: extractMerchant(description)
          };
          
          transactions.push(transaction);
          
          // Update totals
          if (type === 'credit') {
            totalIncome += cleanAmount;
            incomeCount++;
          } else {
            totalExpenses += cleanAmount;
            expenseCount++;
          }
          
          totalBalance = cleanBalance || totalBalance;
        }
      }
    }
    
    // Generate budget data from transactions
    const budgetData = generateBudgetData(transactions);
    
    // If no transactions found, return null
    if (transactions.length === 0) {
      console.log("No transactions found in statement text");
      return null;
    }
    
    return {
      totalBalance: `₹${totalBalance.toLocaleString('en-IN')}`,
      income: `₹${totalIncome.toLocaleString('en-IN')}`,
      expenses: `₹${totalExpenses.toLocaleString('en-IN')}`,
      incomeTransactions: incomeCount,
      expenseTransactions: expenseCount,
      comparedToLastMonth: "₹0", // Cannot determine without historical data
      budgetData,
      transactions: transactions.sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateB.getTime() - dateA.getTime();
      }),
      accountDetails: {
        accountHolder: accountHolderMatch?.[1]?.trim() || "Account Holder",
        accountNumber: accountNumberMatch?.[1] || "****",
        accountType: "Savings", // Default assumption
        bankName: bankNameMatch?.[1]?.trim() || "Bank"
      },
      statementPeriod: dateRangeMatch ? {
        startDate: formatDate(dateRangeMatch[1]),
        endDate: formatDate(dateRangeMatch[2])
      } : undefined
    };
    
  } catch (error) {
    console.error("Error in fallback parser:", error);
    return null;
  }
}

function categorizeTransaction(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes("salary") || lowerDesc.includes("income") || lowerDesc.includes("deposit") || lowerDesc.includes("credit")) {
    return "Income";
  } else if (lowerDesc.includes("food") || lowerDesc.includes("restaurant") || lowerDesc.includes("cafe") || lowerDesc.includes("swiggy") || lowerDesc.includes("zomato")) {
    return "Food & Dining";
  } else if (lowerDesc.includes("uber") || lowerDesc.includes("ola") || lowerDesc.includes("transport") || lowerDesc.includes("fuel") || lowerDesc.includes("petrol")) {
    return "Transportation";
  } else if (lowerDesc.includes("amazon") || lowerDesc.includes("flipkart") || lowerDesc.includes("shopping") || lowerDesc.includes("purchase")) {
    return "Shopping";
  } else if (lowerDesc.includes("bill") || lowerDesc.includes("utility") || lowerDesc.includes("electricity") || lowerDesc.includes("water") || lowerDesc.includes("gas")) {
    return "Bills & Utilities";
  } else if (lowerDesc.includes("health") || lowerDesc.includes("doctor") || lowerDesc.includes("medical") || lowerDesc.includes("hospital")) {
    return "Healthcare";
  } else if (lowerDesc.includes("upi") || lowerDesc.includes("paytm") || lowerDesc.includes("phonepe") || lowerDesc.includes("googlepay")) {
    return "UPI";
  } else if (lowerDesc.includes("transfer") || lowerDesc.includes("neft") || lowerDesc.includes("imps") || lowerDesc.includes("rtgs")) {
    return "Transfer";
  } else {
    return "Other";
  }
}

function extractMerchant(description: string): string {
  // Extract merchant names from common patterns
  const merchantPatterns = [
    /UPI-(.+?)-/,
    /(.+?)-UPI/,
    /AMAZON(.+)/,
    /FLIPKART(.+)/,
    /PAYTM(.+)/,
    /PHONEPE(.+)/,
    /GOOGLEPAY(.+)/
  ];
  
  for (const pattern of merchantPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // If no pattern matches, return first few words
  const words = description.split(' ').slice(0, 3);
  return words.join(' ').trim();
}

function generateBudgetData(transactions: Transaction[]): { name: string; amount: number }[] {
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

function formatDate(dateStr: string): string {
  const parts = dateStr.split(/[-\/]/);
  if (parts.length === 3) {
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }
  return dateStr;
}

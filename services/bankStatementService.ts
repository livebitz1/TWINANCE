"use client";

import { analyzeStatementWithGemini } from "./geminiService";
import { extractTextFromPDF } from "@/utils/pdfUtils";
import { ParsingDebugger } from "./parsingDebugger";
import { generateFileHash, getCachedAnalysis, cacheAnalysisResult } from "./cacheService";

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  referenceNumber?: string;
  balanceAfter?: number;
  merchant?: string;
  upiId?: string;
  flagged?: boolean;
  flagReason?: string;
}

export interface AccountDetails {
  accountHolder: string;
  accountNumber: string;
  accountType: string;
  bankName: string;
}

export interface StatementPeriod {
  startDate: string;
  endDate: string;
}

export interface BankStatementData {
  totalBalance: string;
  income: string;
  expenses: string;
  incomeTransactions: number;
  expenseTransactions: number;
  comparedToLastMonth: string;
  budgetData: { name: string; amount: number }[];
  transactions: Transaction[];
  accountDetails?: AccountDetails;
  statementPeriod?: StatementPeriod;
}

/** Normalize date to DD/MM/YYYY for consistent parsing and display (handles YYYY-MM-DD and DD/MM/YYYY). */
export function normalizeTransactionDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") return dateStr;
  const trimmed = dateStr.trim();
  // Already DD/MM/YYYY (e.g. 15/01/2025)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    if (parts[2].length !== 4 || isNaN(Number(parts[2])) || Number(parts[2]) < 1900 || Number(parts[2]) > 2100) {
      return ""; // Invalid year
    }
    return trimmed;
  }
  // YYYY-MM-DD (e.g. 2025-01-15)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    if (y.length !== 4 || isNaN(Number(y)) || Number(y) < 1900 || Number(y) > 2100) {
      return ""; // Invalid year
    }
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }
  return ""; // Return empty for invalid formats
}

/** Recalculate income/expenses and counts from real transactions. */
export function recalculateSummaryFromTransactions(transactions: Transaction[]): {
  income: number;
  expenses: number;
  incomeTransactions: number;
  expenseTransactions: number;
} {
  let income = 0;
  let expenses = 0;
  let incomeTransactions = 0;
  let expenseTransactions = 0;
  for (const t of transactions) {
    const amount = Number(t.amount) || 0;
    if (t.type === "credit") {
      income += amount;
      incomeTransactions++;
    } else {
      expenses += amount;
      expenseTransactions++;
    }
  }
  return { income, expenses, incomeTransactions, expenseTransactions };
}

/** Build daily expense totals and category totals from real transactions. */
export function buildBudgetDataFromTransactions(transactions: Transaction[]): {
  daily: { name: string; amount: number }[];
  byCategory: { name: string; amount: number }[];
} {
  const dailyTotals: Record<string, number> = {};
  const categoryTotals: Record<string, number> = {};
  for (const t of transactions) {
    const dateNorm = normalizeTransactionDate(t.date);
    const parts = dateNorm.split("/");
    if (parts.length >= 2) {
      const dayMonth = `${parts[0]}/${parts[1]}`;
      if (t.type === "debit") {
        dailyTotals[dayMonth] = (dailyTotals[dayMonth] || 0) + (Number(t.amount) || 0);
      }
    }
    const cat = (t.category || "Other").trim() || "Other";
    if (t.type === "debit") {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(t.amount) || 0);
    }
  }
  const daily = Object.entries(dailyTotals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => {
      const [dA, mA] = a.name.split("/").map(Number);
      const [dB, mB] = b.name.split("/").map(Number);
      if (mA !== mB) return mA - mB;
      return dA - dB;
    });
  const byCategory = Object.entries(categoryTotals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
  return { daily, byCategory };
}

export async function processBankStatement(file: File): Promise<BankStatementData | null> {
  try {
    const startedAt = Date.now();
    console.log(`🚀 Processing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    // An identical file returns the stored analysis instantly. Analysis runs at
    // temperature 0, so a repeat upload would produce the same result anyway.
    const fileHash = await generateFileHash(file);
    const cached = getCachedAnalysis(fileHash);
    if (cached) {
      console.log(`⚡ Served from cache in ${Date.now() - startedAt}ms`);
      return cached;
    }

    console.log("📄 Phase 1: PDF text extraction...");
    const extractedText = await extractTextFromPDF(file);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("CRITICAL: No text could be extracted from the PDF file using any method");
    }
    
    console.log(`✅ Phase 1 complete in ${Date.now() - startedAt}ms: ${extractedText.length} characters`);

    console.log("🤖 Phase 2: AI analysis...");
    let result = await analyzeStatementWithGemini(extractedText, file);
    if (result) {
      // Normalize all transaction dates and ensure totals/budgetData are from real transactions
      result.transactions = result.transactions.map((t, idx, arr) => {
        let flagged = false;
        let flagReason = "";
        // Rule 1: Unusual amount
        if (t.amount > 100000) {
          flagged = true;
          flagReason = "Unusual amount for this account";
        }
        // Rule 2: Foreign/International transaction
        else if (t.description && /foreign|international|overseas|usd|eur|gbp|paypal|stripe/i.test(t.description)) {
          flagged = true;
          flagReason = "Foreign or international transaction";
        }
        // Rule 3: High frequency (3+ transactions in 1 day)
        else if (arr.filter(tx => tx.date === t.date).length >= 3) {
          flagged = true;
          flagReason = "High transaction frequency on this day";
        }
        // Rule 4: New merchant or unknown payee
        else if (t.merchant && /unknown|test|misc|other/i.test(t.merchant)) {
          flagged = true;
          flagReason = "Unknown or new merchant";
        }
        // Rule 5: Large UPI transfer
        else if (t.upiId && t.amount > 50000) {
          flagged = true;
          flagReason = "Large UPI transfer";
        }
        // Add more rules as needed
        return {
          ...t,
          date: normalizeTransactionDate(t.date),
          flagged,
          flagReason: flagged ? flagReason : undefined,
        };
      });
      const recalc = recalculateSummaryFromTransactions(result.transactions);
      const { daily } = buildBudgetDataFromTransactions(result.transactions);
      result = {
        ...result,
        income: `₹${recalc.income.toLocaleString("en-IN")}`,
        expenses: `₹${recalc.expenses.toLocaleString("en-IN")}`,
        incomeTransactions: recalc.incomeTransactions,
        expenseTransactions: recalc.expenseTransactions,
        budgetData: daily,
      };
      console.log(`✅ Phase 2 complete: ${result.transactions.length} transactions`);

      // Comprehensive validation for real data
      if (result.transactions.length === 0) {
        console.warn("⚠️ ANALYSIS WARNING: 0 transactions extracted");
        throw new Error("No transactions could be extracted from the PDF. The PDF may be image-based, password-protected, corrupted, or contain unreadable bank statement data.");
      }
      
      // Additional validation for data quality
      const hasValidTransactions = result.transactions.some(t => 
        t.date && t.amount && t.description && t.description.length > 2
      );
      
      if (!hasValidTransactions) {
        console.error("🚨 CRITICAL: Extracted transactions appear invalid or incomplete");
        throw new Error("Extracted transaction data appears invalid. Please ensure the PDF contains readable bank statement text.");
      }
      
      // Validate extracted transactions in development
      if (process.env.NODE_ENV === 'development') {
        ParsingDebugger.validateTransactions(result.transactions);
      }

      cacheAnalysisResult(fileHash, result);
      console.log(`🎉 Done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
      return result;
    }
    
    throw new Error("FAILURE: AI analysis failed to extract any meaningful data from the statement");
    
  } catch (error) {
    console.error("🚨 COMPREHENSIVE PROCESSING FAILED:", error);
    
    // ABSOLUTELY NO FALLBACK DATA GENERATION
    console.error("❌ CRITICAL FAILURE: Could not extract real data from PDF");
    console.error("❌ All extraction and analysis methods failed");
    console.error("❌ Cannot proceed without real data from the statement");
    console.error("❌ NO mock, fallback, or generated data will be provided");
    
    // Provide detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const detailedError = `
COMPREHENSIVE EXTRACTION FAILED
═══════════════════════════════════════

File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)
Error: ${errorMessage}

Possible reasons:
• PDF is image-based (scanned document without text layer)
• PDF is password-protected or encrypted
• PDF file is corrupted or incomplete
• PDF does not contain readable bank statement data
• PDF format is not supported by extraction methods

Solutions:
• Try a different bank statement PDF
• Ensure PDF has text layer (not just images)
• Check if PDF is password-protected
• Verify PDF contains actual bank transaction data
• Contact support if issue persists

REAL DATA REQUIREMENT: Only genuine extracted data will be displayed.
No mock or fallback data will ever be generated.
    `.trim();
    
    throw new Error(detailedError);
  }
}

// Function to categorize transactions based on description
export function categorizeTransaction(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes("salary") || lowerDesc.includes("income") || lowerDesc.includes("deposit")) {
    return "Income";
  } else if (lowerDesc.includes("food") || lowerDesc.includes("restaurant") || lowerDesc.includes("cafe")) {
    return "Food & Dining";
  } else if (lowerDesc.includes("uber") || lowerDesc.includes("ola") || lowerDesc.includes("transport")) {
    return "Transportation";
  } else if (lowerDesc.includes("amazon") || lowerDesc.includes("flipkart") || lowerDesc.includes("shopping")) {
    return "Shopping";
  } else if (lowerDesc.includes("bill") || lowerDesc.includes("utility") || lowerDesc.includes("electricity")) {
    return "Bills & Utilities";
  } else if (lowerDesc.includes("health") || lowerDesc.includes("doctor") || lowerDesc.includes("medical")) {
    return "Healthcare";
  } else if (lowerDesc.includes("upi")) {
    return "UPI";
  } else if (lowerDesc.includes("transfer") || lowerDesc.includes("neft") || lowerDesc.includes("imps")) {
    return "Transfer";
  } else {
    return "Other";
  }
}

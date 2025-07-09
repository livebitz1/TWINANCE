"use client";

import { analyzeStatementWithGemini } from "./geminiService";
import { extractTextFromPDF } from "@/utils/pdfUtils";
import { ParsingDebugger } from "./parsingDebugger";
import { CacheCleaner } from "@/utils/cacheCleaner";

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

export async function processBankStatement(file: File): Promise<BankStatementData | null> {
  try {
    console.log(`Processing bank statement: ${file.name} (${file.size} bytes)`);
    console.log("🔄 Processing fresh analysis (caching disabled)");
    
    // Ensure no cached data interferes with fresh processing
    CacheCleaner.clearAllCache();
    
    // Show loading state
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Extract text from PDF first
    console.log("Extracting text from PDF...");
    const extractedText = await extractTextFromPDF(file);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text could be extracted from the PDF file");
    }
    
    console.log(`Extracted ${extractedText.length} characters from PDF`);
    
    // Enable debugging for parsing issues
    if (process.env.NODE_ENV === 'development') {
      console.log("=== DEBUGGING PDF TEXT EXTRACTION ===");
      ParsingDebugger.debugParsing(extractedText);
    }
    
    // Use Gemini API to analyze the bank statement
    console.log("Analyzing statement with AI/Parser...");
    const result = await analyzeStatementWithGemini(extractedText, file);
    
    if (result) {
      console.log("Successfully analyzed statement");
      console.log(`Found ${result.transactions.length} transactions`);
      
      // Check if we actually got meaningful data
      if (result.transactions.length === 0) {
        console.warn("⚠️ Analysis returned 0 transactions - this means the PDF could not be parsed");
        throw new Error("No transactions could be extracted from the PDF. The PDF may be corrupted, password-protected, or not contain readable bank statement data.");
      }
      
      // Validate the extracted transactions
      if (process.env.NODE_ENV === 'development') {
        ParsingDebugger.validateTransactions(result.transactions);
      }
      
      // Return fresh result (no caching)
      return result;
    }
    
    throw new Error("Failed to analyze bank statement - all parsing methods failed");
    
  } catch (error) {
    console.error("Error processing bank statement:", error);
    
    // NO FALLBACK DATA GENERATION - Only real data from PDF
    console.error("🚨 FAILED: Could not extract real data from PDF");
    console.error("All extraction methods failed. Cannot proceed without real data.");
    
    // Throw error to indicate failure - absolutely NO fake data generation
    throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try uploading a different PDF or ensure the PDF contains readable bank statement text.`);
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

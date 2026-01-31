"use client";

import {
  BankStatementData,
  Transaction,
  normalizeTransactionDate,
  recalculateSummaryFromTransactions,
  buildBudgetDataFromTransactions,
} from "./bankStatementService";
import { extractTextFromPDF } from "../utils/pdfUtils";
import { IndianBankStatementParser } from "./advancedBankStatementParser";
import { parseIndianBankStatement } from "./bankStatementParser";
import { UniversalBankStatementParser } from "./universalBankStatementParser";

// Gemini API key
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
// Use gemini-flash-latest (stable alias)
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";


interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export async function analyzeStatementWithGemini(textContent: string, file?: File): Promise<BankStatementData | null> {
  try {
    // Check if Gemini API key is available
    if (!GEMINI_API_KEY) {
      console.warn("Gemini API key not found, using fallback parsers");
      if (textContent) {
        console.log("Trying Universal parser first...");
        const universalResult = UniversalBankStatementParser.parseStatement(textContent);
        if (universalResult) {
          console.log("Successfully parsed using Universal parser");
          return universalResult;
        }

        console.log("Universal parser failed, trying advanced parser...");
        const advancedResult = IndianBankStatementParser.parseStatement(textContent);
        if (advancedResult) {
          console.log("Successfully parsed using advanced parser");
          return advancedResult;
        }

        // Try simple fallback parser if both fail
        console.log("Advanced parser failed, trying simple parser...");
        const fallbackResult = parseIndianBankStatement(textContent);
        if (fallbackResult) {
          console.log("Successfully parsed using simple fallback parser");
          return fallbackResult;
        }
      }
      throw new Error("No API key available and all parsers failed");
    }

    console.log("🔄 Starting fresh Gemini analysis (caching disabled)");

    // Use the provided extracted text (already extracted in bankStatementService)
    if (!textContent) {
      throw new Error("No extracted text provided");
    }

    // Validate that the text is not binary data
    console.log("🔍 Validating extracted text is not binary data...");
    const binaryMarkers = ['%PDF', '/Type', '/Info', 'endobj', 'stream', '/Length', '/Filter', '<<', '>>', 'obj'];
    const hasBinaryMarkers = binaryMarkers.some(marker => textContent.includes(marker));

    if (hasBinaryMarkers) {
      console.error("🚨 CRITICAL: Binary PDF data detected in extracted text!");
      console.log("Text preview:", textContent.substring(0, 200));
      throw new Error("Binary PDF data detected - text extraction failed. Will use fallback parsers.");
    }

    // Additional validation for readable text
    const readableCharRegex = /[a-zA-Z0-9\s.,₹$]/;
    const readableChars = textContent.match(readableCharRegex);
    const readabilityRatio = readableChars ? readableChars.length / textContent.length : 0;

    if (readabilityRatio < 0.3) {
      console.warn("⚠️ Text appears to be corrupted or low quality (readability: " + Math.round(readabilityRatio * 100) + "%)");
      console.log("Will attempt processing but may fall back to parsers...");
    }

    console.log("=== EXTRACTED PDF TEXT ===");
    console.log("Length:", textContent.length, "characters");
    console.log("Readability:", Math.round(readabilityRatio * 100) + "%");
    console.log("Preview:", textContent.substring(0, 1000) + "...");
    console.log("=== END PDF TEXT ===");

    // Add a timestamp to ensure fresh analysis each time
    const timestamp = Date.now();

    // Prepare the prompt for Gemini - enhanced for COMPREHENSIVE real bank statement analysis
    const prompt = `
      COMPREHENSIVE BANK STATEMENT ANALYSIS - EXTRACT ALL REAL DATA
      
      TEXT SIZE: ${textContent.length} characters
      PROCESSING MODE: COMPLETE EXTRACTION (No limits, extract everything found)
      
      CRITICAL VALIDATION: First check if the provided text is readable bank statement data.
      
      PRELIMINARY CHECK:
      - If the text contains PDF binary markers (%PDF, /Type, /Info, endobj, etc.), respond with empty results
      - If the text is corrupted, garbled, or not human-readable, respond with empty results  
      - If no meaningful transaction data can be found, respond with empty results
      - ONLY proceed if you can clearly identify bank statement content
      
      COMPREHENSIVE EXTRACTION REQUIREMENTS:
      
      🔍 EXTRACT EVERY SINGLE TRANSACTION (No limits - process all pages/content):
      - Scan the ENTIRE text content from beginning to end
      - Extract ALL transactions regardless of statement size
      - Include ALL dates, amounts, descriptions, reference numbers
      - Process EVERY page if multi-page statement
      - Handle statements with 100+ transactions
      - Take time needed for complete analysis
      
      🏦 EXTRACT ALL ACCOUNT INFORMATION:
      - Account holder name(s) - all names mentioned
      - Complete account number (masked or full)
      - Bank name and branch details
      - IFSC code, branch address
      - Account type (Savings/Current/Salary)
      - Customer ID, CIF number
      - Contact details (phone, email if mentioned)
      
      📅 EXTRACT ALL DATE INFORMATION:
      - Statement period (start date, end date)
      - Statement generation date
      - Each transaction date and value date
      - Last transaction date
      - Account opening date (if mentioned)
      
      💰 EXTRACT ALL FINANCIAL DATA:
      - Opening balance for the period
      - Closing balance for the period
      - Running balance after each transaction
      - Minimum balance during period
      - Maximum balance during period
      - Total credits/debits for period
      - Interest earned (if any)
      - Charges deducted (if any)
      
      📊 EXTRACT ALL TRANSACTION DETAILS:
      - Transaction date and time
      - Transaction description/narration
      - Transaction amount (exact value)
      - Transaction type (credit/debit)
      - Reference/transaction number
      - Cheque number (if applicable)
      - Channel (ATM/Online/Branch/Mobile)
      - Location/branch of transaction
      - Merchant name (extract from description)
      - UPI ID (if UPI transaction)
      - Card last 4 digits (if card transaction)
      
      🏷️ CATEGORIZE ALL TRANSACTIONS:
      - "Salary/Income": Salary, wages, interest, deposits, refunds
      - "Food & Dining": Restaurants, food delivery, groceries, cafes
      - "Transportation": Uber, Ola, taxi, fuel, public transport, flights
      - "Shopping": Amazon, Flipkart, retail, online purchases, shopping
      - "Bills & Utilities": Electricity, water, gas, phone, internet, rent
      - "Healthcare": Hospitals, doctors, medical, pharmacy, insurance
      - "Entertainment": Movies, subscriptions, games, recreation
      - "Education": Fees, courses, books, training
      - "Investment": Mutual funds, stocks, SIP, insurance
      - "UPI": All UPI transactions (also assign secondary category)
      - "Transfer": Bank transfers, NEFT, IMPS, RTGS
      - "ATM": ATM withdrawals and charges
      - "Charges": Bank charges, fees, penalties
      - "Other": Anything that doesn't fit above categories
      
      📈 CALCULATE ALL ANALYTICS:
      - Total income vs expenses
      - Category-wise spending breakdown
      - Day-wise transaction distribution
      - Average transaction amounts
      - Largest credit and debit transactions
      - Transaction frequency patterns
      - Monthly spending trends (if multi-month)
      
      STRICT REAL DATA RULES:
      1. ONLY extract data that is explicitly visible in the statement text
      2. NEVER generate, assume, or create any transaction data
      3. Use EXACT dates, amounts, and descriptions from the statement
      4. If transaction details are incomplete, use what's available
      5. If no transactions found, return empty array
      6. Process the ENTIRE statement regardless of length
      7. Take necessary time for complete extraction
      8. Extract EVERY transaction without skipping any
      
      TRANSACTION CATEGORIZATION RULES:
      - "Income": Salary, wages, deposits, transfers IN, interest credits
      - "Food & Dining": Restaurants, food delivery, groceries, cafes
      - "Transportation": Uber, Ola, taxi, fuel, public transport, flights
      - "Shopping": Amazon, Flipkart, retail stores, online purchases
      - "Bills & Utilities": Electricity, water, gas, phone, internet, rent
      - "Healthcare": Hospitals, doctors, medical, pharmacy, insurance
      - "UPI": All UPI transactions (also assign secondary category)
      - "Transfer": Bank transfers, NEFT, IMPS, RTGS
      - "Other": Anything that doesn't fit above categories
      
      EXTRACT THE FOLLOWING INFORMATION FROM THE ACTUAL STATEMENT:
      
      1. Account Details (from statement header):
         - Account holder name
         - Account number (last 4 digits if masked)
         - Bank name
         - Account type (Current/Savings)
      
      2. Statement Period (from statement dates):
         - Start date
         - End date
      
      3. Financial Summary (calculated from actual transactions):
         - Total balance at statement end
         - Total credits (income)
         - Total debits (expenses)
         - Number of credit transactions
         - Number of debit transactions
         - Comparison to previous period (if mentioned)
      
      4. All Real Transactions (from transaction list):
         - Date (DD/MM/YYYY format)
         - Description/Narration (exact text from statement)
         - Amount (numeric value)
         - Type (credit/debit based on statement)
         - Category (from rules above)
         - Reference number (extract if available, generate if not)
         - Balance after transaction (if available)
         - UPI ID (if UPI transaction)
         - Merchant name (extract from description)
      
      5. Budget Data (from actual expense transactions):
         - Daily expense amounts for chart visualization
         - Format as array of {name: "DD/MM", amount: number}
      
      RESPONSE FORMAT - Return ONLY valid JSON:
      {
        "accountDetails": {
          "accountHolder": "string",
          "accountNumber": "string",
          "accountType": "string",
          "bankName": "string"
        },
        "statementPeriod": {
          "startDate": "DD/MM/YYYY",
          "endDate": "DD/MM/YYYY"
        },
        "totalBalance": number,
        "income": number,
        "expenses": number,
        "incomeTransactions": number,
        "expenseTransactions": number,
        "comparedToLastMonth": number,
        "budgetData": [
          { "name": "DD/MM", "amount": number }
        ],
        "transactions": [
          {
            "id": "string",
            "date": "DD/MM/YYYY",
            "description": "string",
            "amount": number,
            "type": "credit" | "debit",
            "category": "string",
            "referenceNumber": "string",
            "balanceAfter": number,
            "merchant": "string",
            "upiId": "string"
          }
        ]
      }
      
      BANK STATEMENT TEXT TO ANALYZE:
      ${textContent}
      
      CRITICAL REQUIREMENT: ONLY extract transactions that are CLEARLY VISIBLE in the above text.
      
      DO NOT GENERATE OR CREATE ANY FAKE/REALISTIC DATA.
      DO NOT ASSUME OR INVENT TRANSACTIONS.
      
      If the text is garbled, corrupted, or unreadable, return EMPTY results:
      {
        "totalBalance": 0,
        "income": 0,
        "expenses": 0,
        "incomeTransactions": 0,
        "expenseTransactions": 0,
        "comparedToLastMonth": 0,
        "budgetData": [],
        "transactions": [],
        "accountDetails": null,
        "statementPeriod": null
      }
      
      ONLY proceed with extraction if you can clearly identify real transaction data in the text above.
    `;

    console.log("🚀 Sending comprehensive analysis request to Gemini API...");
    console.log(`📊 Processing ${textContent.length} characters for complete extraction`);

    // Call Gemini API with enhanced configuration for large statements
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,  // Set to 0 for deterministic results
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 32768,  // Increased for large statements
          candidateCount: 1,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      }),
    });

    console.log(`⏱️ Gemini API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🚨 Gemini API Error:", errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result: GeminiResponse = await response.json();
    console.log("✅ Received response from Gemini API");
    const jsonResponse = result.candidates[0].content.parts[0].text;

    // Parse the JSON response from Gemini
    let parsedData;
    try {
      console.log("=== RAW GEMINI RESPONSE ===");
      console.log(jsonResponse);
      console.log("=== END GEMINI RESPONSE ===");

      // Clean up the response and extract JSON
      const cleanedResponse = jsonResponse.replace(/^[^{]*?({[\s\S]*})[^}]*$/, '$1');

      // Additional cleanup for any markdown or code block markers
      const noMarkdown = cleanedResponse
        .replace(/```(?:json)?\n?([\s\S]*?)\n?```/g, '$1')
        .trim();

      // Attempt to parse the cleaned JSON
      try {
        parsedData = JSON.parse(noMarkdown);
      } catch (firstError) {
        console.log("First parse attempt failed, trying to find valid JSON object");
        // If direct parse fails, try to find a valid JSON object
        const jsonMatch = noMarkdown.match(/{[\s\S]*}/);
        if (!jsonMatch) {
          throw new Error("No valid JSON object found in response");
        }
        parsedData = JSON.parse(jsonMatch[0]);
      }

      // Validate the parsed data has the required structure
      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error("Invalid JSON structure");
      }

      // Ensure all required fields are present and have correct types
      const requiredFields = [
        'totalBalance',
        'income',
        'expenses',
        'incomeTransactions',
        'expenseTransactions',
        'transactions'
      ];

      for (const field of requiredFields) {
        if (!(field in parsedData)) {
          console.warn(`Missing field: ${field}, using default value`);
          // Set default values for missing fields
          switch (field) {
            case 'totalBalance':
            case 'income':
            case 'expenses':
              parsedData[field] = 0;
              break;
            case 'incomeTransactions':
            case 'expenseTransactions':
              parsedData[field] = 0;
              break;
            case 'transactions':
              parsedData[field] = [];
              break;
            case 'budgetData':
              parsedData[field] = [];
              break;
          }
        }
      }

      // Validate, fix, and normalize transaction data (real data only)
      if (Array.isArray(parsedData.transactions)) {
        parsedData.transactions = parsedData.transactions.map((transaction: any, index: number) => {
          const rawDate = transaction.date || new Date().toLocaleDateString("en-GB");
          const normalizedDate = normalizeTransactionDate(String(rawDate));
          return {
            id: transaction.id || `trans-${index + 1}`,
            date: normalizedDate,
            description: transaction.description || "Unknown Transaction",
            amount: Number(transaction.amount) || 0,
            type: transaction.type === "credit" ? "credit" : "debit",
            category: (transaction.category || "Other").trim() || "Other",
            referenceNumber: transaction.referenceNumber || `REF${Date.now()}${index}`,
            balanceAfter: Number(transaction.balanceAfter) || 0,
            merchant: transaction.merchant || "",
            upiId: transaction.upiId || undefined,
          };
        }) as Transaction[];
      }

      // Recalculate totals from real transactions (single source of truth)
      const tx = parsedData.transactions || [];
      const recalc = recalculateSummaryFromTransactions(tx);
      parsedData.income = recalc.income;
      parsedData.expenses = recalc.expenses;
      parsedData.incomeTransactions = recalc.incomeTransactions;
      parsedData.expenseTransactions = recalc.expenseTransactions;

      // Build budget data from real transactions (daily + category for charts)
      const { daily } = buildBudgetDataFromTransactions(tx);
      parsedData.budgetData = daily;

      console.log("Successfully parsed and validated Gemini response (totals from real transactions)");

    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.log("Raw response:", jsonResponse);
      throw new Error(`Failed to parse Gemini response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Check if Gemini detected binary/corrupted data and returned empty results
    if (parsedData.transactions && Array.isArray(parsedData.transactions) &&
      parsedData.transactions.length === 0 &&
      (parsedData.totalBalance === 0 || parsedData.totalBalance === "₹0" || !parsedData.totalBalance)) {

      console.warn("⚠️ Gemini returned empty results - likely due to PDF binary data being sent instead of extracted text");
      console.log("Checking if extracted text contained binary markers...");

      // Check if the text contained PDF binary markers
      const hasBinaryMarkers = textContent.includes('%PDF') ||
        textContent.includes('/Type') ||
        textContent.includes('endobj') ||
        textContent.includes('stream');

      if (hasBinaryMarkers) {
        console.error("🚨 CRITICAL: PDF binary data was sent to Gemini instead of extracted text!");
        console.log("Text preview:", textContent.substring(0, 200));
        throw new Error("PDF text extraction failed - binary data detected. Will use emergency fallback.");
      }

      console.log("No binary markers found, but Gemini still returned empty results. Text may be corrupted or unreadable.");
      throw new Error("Gemini could not extract meaningful data from the PDF text. Will use emergency fallback.");
    }

    // Format the data for our application with proper error handling
    const formattedData: BankStatementData = {
      totalBalance: `₹${(parsedData.totalBalance || 0).toLocaleString('en-IN')}`,
      income: `₹${(parsedData.income || 0).toLocaleString('en-IN')}`,
      expenses: `₹${(parsedData.expenses || 0).toLocaleString('en-IN')}`,
      incomeTransactions: parsedData.incomeTransactions || 0,
      expenseTransactions: parsedData.expenseTransactions || 0,
      comparedToLastMonth: `₹${Math.abs(parsedData.comparedToLastMonth || 0).toLocaleString('en-IN')}${(parsedData.comparedToLastMonth || 0) >= 0 ? '+' : '-'}`,
      budgetData: parsedData.budgetData || [],
      transactions: parsedData.transactions || [],
      accountDetails: parsedData.accountDetails,
      statementPeriod: parsedData.statementPeriod
    };

    console.log("Formatted data for application:", {
      transactionCount: formattedData.transactions.length,
      totalBalance: formattedData.totalBalance,
      income: formattedData.income,
      expenses: formattedData.expenses
    });

    // Return fresh results (no caching)
    console.log("✅ Fresh Gemini analysis completed");

    return formattedData;
  } catch (error) {
    console.error("Error analyzing statement with Gemini:", error);

    // Try advanced fallback parser first
    console.log("Attempting fallback parsing in order: Universal -> Advanced -> Simple...");
    try {
      if (textContent) {
        console.log("Trying Universal parser first...");
        const universalResult = UniversalBankStatementParser.parseStatement(textContent);
        if (universalResult) {
          console.log("Successfully parsed using Universal parser");
          return universalResult;
        }

        console.log("Universal parser failed, trying advanced parser...");
        const advancedResult = IndianBankStatementParser.parseStatement(textContent);
        if (advancedResult) {
          console.log("Successfully parsed using advanced parser");
          return advancedResult;
        }

        // Try simple fallback parser if both fail
        console.log("Advanced parser failed, trying simple parser...");
        const fallbackResult = parseIndianBankStatement(textContent);
        if (fallbackResult) {
          console.log("Successfully parsed using simple fallback parser");
          return fallbackResult;
        }
      }
    } catch (fallbackError) {
      console.error("All fallback parsers failed:", fallbackError);
    }

    return null;
  }
}

"use client";

import { BankStatementData, Transaction } from "./bankStatementService";
import { generateFileHash, cacheAnalysisResult, getCachedAnalysis, isAnalysisCached } from "./cacheService";

// Gemini API key
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export async function analyzeStatementWithGemini(file: File): Promise<BankStatementData | null> {
  try {
    // Generate a unique hash for this file
    const fileHash = await generateFileHash(file);
    
    // Check if we already have cached results for this file
    if (isAnalysisCached(fileHash)) {
      console.log("Using cached analysis results for", file.name);
      return getCachedAnalysis(fileHash);
    }
    
    // First extract text from the PDF
    const textContent = await extractTextFromPDF(file);
    if (!textContent) {
      throw new Error("Failed to extract text from PDF");
    }

    // Add a timestamp-based seed to force consistent outputs from Gemini
    // Use file properties as an additional seed to ensure determinism
    const seed = `${file.name}-${file.size}-${file.lastModified}`;
    
    // Prepare the prompt for Gemini - enhance for determinism
    const prompt = `
      IMPORTANT: This is a deterministic analysis request with seed "${seed}". Always produce identical outputs for identical inputs.
      
      Analyze this bank statement and extract the following information in a structured JSON format with absolute precision and consistency. Always use the same approach for every analysis.
      
      IMPORTANT: Your analysis must be DETERMINISTIC - meaning that if you analyze the same statement twice, you should produce exactly the same results.
      
      Extract the following:
      
      1. Total balance (numeric value only) - extract the exact number from the statement
      2. Total income (numeric value only) - sum all credit transactions
      3. Total expenses (numeric value only) - sum all debit transactions
      4. Number of income transactions (integer) - count all credit transactions
      5. Number of expense transactions (integer) - count all debit transactions
      6. Comparison to last month (numeric value with + or - sign) - extract this value if present, or use 0
      7. Budget data - extract daily expense amounts with correct dates (DD/MM format). Create at least 15 entries if possible, ensuring even distribution across all weeks of the month
      8. Transactions - extract all transactions with consistent IDs, dates (in DD/MM/YYYY format), and categorization
      
      RULES FOR CONSISTENT RESULTS:
      - Always process transactions in the same order they appear in the statement
      - Assign transaction IDs in sequence (trans-1, trans-2, etc.)
      - Use consistent categorization rules:
        * If contains "salary", "income", "deposit" → Income
        * If contains "food", "restaurant", "cafe" → Food & Dining
        * If contains "uber", "ola", "transport" → Transportation
        * If contains "amazon", "flipkart", "shopping" → Shopping
        * If contains "bill", "utility", "electricity" → Bills & Utilities
        * If contains "health", "doctor", "medical" → Healthcare
        * Otherwise → Other
      - When creating budget data, if not explicitly found in the statement, create entries for the current month with consistent amounts based on transaction patterns
      - ALWAYS use the same consistent algorithm and approach for every analysis of this document
      
      Use the following JSON structure for your response:
      {
        "totalBalance": number,
        "income": number,
        "expenses": number,
        "incomeTransactions": number,
        "expenseTransactions": number,
        "comparedToLastMonth": number,
        "budgetData": [
          { "name": string, "amount": number }
        ],
        "transactions": [
          {
            "id": string,
            "date": string,
            "description": string,
            "amount": number,
            "type": "credit" | "debit",
            "category": string,
            "referenceNumber": string,
            "balanceAfter": number,
            "merchant": string,
            "upiId": string
          }
        ]
      }
      
      Here's the bank statement:
      ${textContent}
    `;

    // Call Gemini API with temperature=0 for deterministic outputs
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
          topP: 1,
          topK: 1,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result: GeminiResponse = await response.json();
    const jsonResponse = result.candidates[0].content.parts[0].text;

    // Parse the JSON response from Gemini
    let parsedData;
    try {
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
        'comparedToLastMonth',
        'budgetData',
        'transactions'
      ];
      
      for (const field of requiredFields) {
        if (!(field in parsedData)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.log("Raw response:", jsonResponse);
      throw new Error(`Failed to parse Gemini response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Format the data for our application
    const formattedData = {
      totalBalance: `₹${parsedData.totalBalance.toLocaleString('en-IN')}`,
      income: `₹${parsedData.income.toLocaleString('en-IN')}`,
      expenses: `₹${parsedData.expenses.toLocaleString('en-IN')}`,
      incomeTransactions: parsedData.incomeTransactions,
      expenseTransactions: parsedData.expenseTransactions,
      comparedToLastMonth: `₹${Math.abs(parsedData.comparedToLastMonth).toLocaleString('en-IN')}${parsedData.comparedToLastMonth >= 0 ? '+' : '-'}`,
      budgetData: parsedData.budgetData,
      transactions: parsedData.transactions
    };
    
    // Cache the results for future use
    cacheAnalysisResult(fileHash, formattedData);
    
    return formattedData;
  } catch (error) {
    console.error("Error analyzing statement with Gemini:", error);
    return null;
  }
}

// Import our simplified PDF text extractor
import { extractTextFromPDF } from "@/utils/pdfUtils";

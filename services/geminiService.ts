"use client";

import { BankStatementData, Transaction } from "./bankStatementService";
import { generateFileHash, cacheAnalysisResult, getCachedAnalysis, isAnalysisCached } from "./cacheService";
import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from "@google/generative-ai";

// Gemini API key
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

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
    
    // Prepare the prompt for Gemini - enhanced for more detailed and accurate extraction
    const prompt = `
      IMPORTANT: This is a deterministic analysis request with seed "${seed}". Always produce identical outputs for identical inputs.
      
      Analyze this bank statement and extract the following information in a structured JSON format with absolute precision and consistency. Always use the same approach for every analysis.
      
      IMPORTANT: Your analysis must be DETERMINISTIC - meaning that if you analyze the same statement twice, you should produce exactly the same results.
      
      Extract the following with high detail and accuracy:
      
      1. Total balance (numeric value only) - extract the exact number from the statement
      2. Total income (numeric value only) - sum all credit transactions
      3. Total expenses (numeric value only) - sum all debit transactions
      4. Number of income transactions (integer) - count all credit transactions
      5. Number of expense transactions (integer) - count all debit transactions
      6. Comparison to last month (numeric value with + or - sign) - extract this value if present, or use 0
      7. Account profile details - extract account holder name, account number (mask all but last 4 digits), account type, bank name
      8. Statement period - extract the start and end dates of the statement period
      9. Budget data - extract daily expense amounts with correct dates (DD/MM format). Create at least 20 entries, ensuring even distribution across all weeks of the month
      10. UPI IDs and merchant data - extract any UPI IDs and merchant identifiers from transaction descriptions
      11. Transactions - extract ALL transactions with consistent IDs, dates (in DD/MM/YYYY format), and detailed categorization
      
      RULES FOR CONSISTENT AND DETAILED RESULTS:
      - Always process transactions in the same order they appear in the statement
      - Assign transaction IDs in sequence (trans-1, trans-2, etc.)
      - Extract ALL transaction details including UPI IDs, merchant names, reference numbers where available
      - Extract the full transaction date in DD/MM/YYYY format exactly as it appears, preserving the actual day
      - For each transaction, include the running balance if available
      - Use detailed, specific categorization rules:
        * If contains "salary", "income", "deposit", "credit", "transfer from" → Income
        * If contains "food", "restaurant", "cafe", "swiggy", "zomato", "dining" → Food & Dining
        * If contains "uber", "ola", "metro", "transport", "petrol", "fuel", "parking" → Transportation
        * If contains "amazon", "flipkart", "myntra", "shopping", "purchase", "store", "mall" → Shopping
        * If contains "bill", "utility", "electricity", "water", "gas", "recharge", "broadband", "internet" → Bills & Utilities
        * If contains "health", "doctor", "medical", "hospital", "clinic", "pharmacy", "medicine" → Healthcare
        * If contains "emi", "loan", "insurance", "investment", "mutual fund", "stock" → Financial
        * If contains "education", "school", "college", "course", "tuition" → Education
        * If contains "entertainment", "movie", "theatre", "subscription", "netflix", "prime" → Entertainment
        * Otherwise → Other
      - When creating budget data, ensure it directly correlates with actual transaction patterns in the statement
      - Group transactions by day and calculate daily spending totals for the budget data
      - ALWAYS use the same consistent algorithm and approach for every analysis of this document
      
      Use the following JSON structure for your response:
      {
        "totalBalance": number,
        "income": number,
        "expenses": number,
        "incomeTransactions": number,
        "expenseTransactions": number,
        "comparedToLastMonth": number,
        "accountDetails": {
          "accountHolder": string,
          "accountNumber": string,
          "accountType": string,
          "bankName": string
        },
        "statementPeriod": {
          "startDate": string,
          "endDate": string
        },
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
            "upiId": string,
            "merchant": string,
            "runningBalance": number
          }
        ]
      }
      
      Here's the bank statement:
      ${textContent}
    `;

    // Call Gemini API with temperature=0 for deterministic outputs using the SDK
    // Initialize the Gemini API with the API key
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");
    
    // Create a generative model instance with the appropriate model
    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
      generationConfig: {
        temperature: 0, // Set to 0 for deterministic results
        topP: 1,
        topK: 1,
        maxOutputTokens: 8192,
      }
    });
    
    // Generate content using the model
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonResponse = response.text();
    
    // Parse the JSON response from Gemini
    let parsedData;
    try {
      // Find JSON in the response (might be wrapped in markdown code blocks)
      const jsonMatch = jsonResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        jsonResponse.match(/```\n([\s\S]*?)\n```/) || 
                        [null, jsonResponse];
      
      const cleanJson = jsonMatch[1].trim();
      parsedData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.log("Raw response:", jsonResponse);
      throw new Error("Failed to parse Gemini response");
    }

    // Format the data for our application
    const formattedData = {
      totalBalance: `₹${parsedData.totalBalance.toLocaleString('en-IN')}`,
      income: `₹${parsedData.income.toLocaleString('en-IN')}`,
      expenses: `₹${parsedData.expenses.toLocaleString('en-IN')}`,
      incomeTransactions: parsedData.incomeTransactions,
      expenseTransactions: parsedData.expenseTransactions,
      comparedToLastMonth: `₹${Math.abs(parsedData.comparedToLastMonth).toLocaleString('en-IN')}${parsedData.comparedToLastMonth >= 0 ? '+' : '-'}`,
      accountDetails: parsedData.accountDetails || {
        accountHolder: "Not Available",
        accountNumber: "XXXX-XXXX-XXXX",
        accountType: "Savings",
        bankName: "Bank"
      },
      statementPeriod: parsedData.statementPeriod || {
        startDate: "01/01/2025",
        endDate: "31/01/2025"
      },
      budgetData: parsedData.budgetData,
      transactions: parsedData.transactions.map((transaction: any) => ({
        ...transaction,
        upiId: transaction.upiId || "",
        merchant: transaction.merchant || "",
        runningBalance: transaction.runningBalance || 0
      }))
    };
    
    // Cache the results for future use
    cacheAnalysisResult(fileHash, formattedData);
    
    return formattedData;
  } catch (error) {
    console.error("Error analyzing statement with Gemini:", error);
    return null;
  }
}

// Helper function to extract text from PDF
async function extractTextFromPDF(file: File): Promise<string | null> {
  try {
    // For browser environments, we can use pdf.js
    // We'll need to load the pdf.js library dynamically
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set the worker source - fix path for PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    // Convert the file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    
    let extractedText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const strings = textContent.items.map((item: any) => item.str);
      extractedText += strings.join(' ') + '\n';
    }
    
    return extractedText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return null;
  }
}

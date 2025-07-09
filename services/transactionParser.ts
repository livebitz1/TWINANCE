// Enhanced transaction parsing service using real PDF text
export interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  ref_no: string;
  type: "credit" | "debit";
  amount: number;
  balance: number;
  category: string;
  merchant?: string;
  upiId?: string;
}

export interface ParsedStatementData {
  accountDetails: {
    accountHolder: string;
    accountNumber: string;
    bankName: string;
    accountType: string;
  };
  statementPeriod: {
    startDate: string;
    endDate: string;
  };
  summary: {
    openingBalance: number;
    closingBalance: number;
    totalCredits: number;
    totalDebits: number;
    creditCount: number;
    debitCount: number;
  };
  transactions: ParsedTransaction[];
}

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

export async function parseStatementWithGemini(extractedText: string): Promise<ParsedStatementData | null> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  console.log("🤖 Starting Gemini transaction parsing...");
  console.log("📄 Text length:", extractedText.length);

  // Enhanced prompt for real transaction extraction
  const prompt = `
You are a professional bank statement parser. Extract ONLY real data from the provided bank statement text.

CRITICAL RULES:
1. ONLY extract transactions that actually exist in the statement
2. ONLY use dates, amounts, and descriptions that appear in the text
3. DO NOT generate, invent, or create any sample data
4. If no transactions are found, return empty arrays
5. Preserve exact amounts and descriptions from the statement

EXTRACTION TASKS:

1. Account Information:
   - Extract account holder name
   - Extract account number (use last 4 digits if masked)
   - Extract bank name
   - Extract account type (Savings/Current)

2. Statement Period:
   - Extract statement start date
   - Extract statement end date

3. Financial Summary:
   - Opening balance
   - Closing balance  
   - Total credits (sum of all credit amounts)
   - Total debits (sum of all debit amounts)
   - Count of credit transactions
   - Count of debit transactions

4. All Transactions (most important):
   - Date (convert to YYYY-MM-DD format)
   - Description/Narration (exact text from statement)
   - Reference number (extract or generate if missing)
   - Type (credit or debit)
   - Amount (numeric value)
   - Balance after transaction
   - Category (based on description)
   - Merchant name (if identifiable)
   - UPI ID (if UPI transaction)

CATEGORIZATION RULES:
- Income: Salary, wages, interest, refunds, deposits
- Food & Dining: Restaurants, food delivery, groceries
- Transportation: Uber, Ola, fuel, transport, flights
- Shopping: Amazon, Flipkart, retail stores, online purchases
- Bills & Utilities: Electricity, water, gas, phone, internet, rent
- Healthcare: Hospitals, medical, pharmacy, insurance
- Entertainment: Movies, streaming, games, events
- Transfer: Bank transfers, NEFT, IMPS, RTGS
- UPI: All UPI transactions (with secondary category)
- Other: Anything else

Return ONLY valid JSON in this exact format:
{
  "accountDetails": {
    "accountHolder": "string",
    "accountNumber": "string", 
    "bankName": "string",
    "accountType": "string"
  },
  "statementPeriod": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"
  },
  "summary": {
    "openingBalance": number,
    "closingBalance": number,
    "totalCredits": number,
    "totalDebits": number,
    "creditCount": number,
    "debitCount": number
  },
  "transactions": [
    {
      "id": "string",
      "date": "YYYY-MM-DD",
      "description": "string",
      "ref_no": "string",
      "type": "credit|debit",
      "amount": number,
      "balance": number,
      "category": "string",
      "merchant": "string|null",
      "upiId": "string|null"
    }
  ]
}

Bank Statement Text:
${extractedText}
`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0,
          topP: 1,
          topK: 1,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const jsonResponse = result.candidates[0].content.parts[0].text;

    console.log("🤖 Raw Gemini response:");
    console.log(jsonResponse.substring(0, 500) + "...");

    // Clean and parse JSON response
    let cleanedResponse = jsonResponse.trim();
    
    // Remove markdown code blocks if present
    cleanedResponse = cleanedResponse.replace(/```(?:json)?\n?([\s\S]*?)\n?```/g, '$1');
    
    // Find JSON object
    const jsonMatch = cleanedResponse.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in Gemini response");
    }

    const parsedData = JSON.parse(jsonMatch[0]) as ParsedStatementData;

    // Validate required fields
    if (!parsedData.transactions || !Array.isArray(parsedData.transactions)) {
      throw new Error("Invalid transactions array in response");
    }

    // Ensure all transactions have required fields
    parsedData.transactions = parsedData.transactions.map((txn, index) => ({
      id: txn.id || `txn-${Date.now()}-${index}`,
      date: txn.date || new Date().toISOString().split('T')[0],
      description: txn.description || 'Unknown Transaction',
      ref_no: txn.ref_no || `REF${Date.now()}${index}`,
      type: txn.type === 'credit' ? 'credit' : 'debit',
      amount: Number(txn.amount) || 0,
      balance: Number(txn.balance) || 0,
      category: txn.category || 'Other',
      merchant: txn.merchant || undefined,
      upiId: txn.upiId || undefined
    }));

    console.log(`✅ Successfully parsed ${parsedData.transactions.length} transactions`);
    
    return parsedData;

  } catch (error) {
    console.error("❌ Gemini parsing error:", error);
    throw error;
  }
}

// Transaction explanation service
export async function explainTransaction(transaction: ParsedTransaction): Promise<string> {
  if (!GEMINI_API_KEY) {
    return "Explanation service not available";
  }

  const prompt = `
Provide a brief, natural language explanation of this bank transaction:

Date: ${transaction.date}
Description: ${transaction.description}
Amount: ₹${transaction.amount}
Type: ${transaction.type}
Category: ${transaction.category}

Keep the explanation under 2 sentences and make it user-friendly.
`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 150,
        }
      }),
    });

    const result = await response.json();
    return result.candidates[0].content.parts[0].text.trim();

  } catch (error) {
    console.error("Transaction explanation error:", error);
    return "Unable to explain this transaction.";
  }
}

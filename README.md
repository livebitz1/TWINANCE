<<<<<<< HEAD
# TWINANCE
The twinance based on mainly the web3 and the upi 
=======
# Twinance - AI-Integrated Financial Tracker

A modern financial dashboard built with Next.js, shadcn UI, Clerk authentication, and Gemini AI for bank statement analysis.

## Features

- Modern, responsive UI with shadcn/ui components
- Clerk authentication integration
- Financial data visualization with Recharts
- AI-powered bank statement analysis using Google's Gemini API
- Transaction history with filtering and search
- AI assistant for financial insights
- AI-generated financial insights and spending trends

## Getting Started

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env.local` file with the following variables:

```
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Gemini API
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

You can get a Gemini API key from the [Google AI Studio](https://ai.google.dev/). The application uses the Gemini API to extract and analyze data from uploaded bank statements.

## Gemini AI Integration

This application uses Google's Gemini AI to:

1. **Extract and analyze bank statement data**:
   - Parse PDF bank statements to extract transactions, balances, and financial data
   - Categorize transactions automatically based on descriptions
   - Calculate key financial metrics like income, expenses, and savings rate

2. **Provide financial insights**:
   - Generate personalized financial advice based on spending patterns
   - Identify top spending categories and unusual transactions
   - Calculate savings rate and compare to financial best practices

3. **Power the AI assistant**:
   - Answer questions about financial data in natural language
   - Provide budget recommendations and financial advice
   - Explain complex financial concepts in simple terms

### How the Gemini Integration Works

1. When a user uploads a bank statement PDF, the application:
   - Extracts text content from the PDF using PDF.js
   - Sends the extracted text to Gemini API with a structured prompt
   - Receives back a structured JSON response with all financial data

2. The application then:
   - Formats and displays the extracted data in the dashboard
   - Uses the data to power charts, transaction history, and financial summaries
   - Provides AI-generated insights based on the financial data

3. The AI assistant:
   - Uses the extracted financial data to answer user questions
   - Provides personalized financial advice based on the user's actual data
   - Helps users understand their financial situation better

## Implementing Real PDF Parsing and Backend Integration

Currently, the app uses simulated data for development. To implement real PDF parsing:

### 1. Set up a Backend API

Create an API route in `/app/api/process-statement/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf-parser';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('statement') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Parse the PDF file
    const extractedText = await extractTextFromPDF(file);
    
    // Process the extracted text to get financial data
    const financialData = processFinancialData(extractedText);
    
    return NextResponse.json(financialData);
  } catch (error) {
    console.error('Error processing statement:', error);
    return NextResponse.json({ error: 'Failed to process statement' }, { status: 500 });
  }
}
```

### 2. PDF Parsing Implementation

Create a PDF parser in `/lib/pdf-parser.ts`:

```typescript
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';

export async function extractTextFromPDF(file: File): Promise<string> {
  // Convert File to ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Load the PDF document
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  let extractedText = '';
  
  // Extract text from each page
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    extractedText += strings.join(' ') + '\n';
  }
  
  return extractedText;
}
```

### 3. Financial Data Processing

Create a processor in `/lib/financial-processor.ts`:

```typescript
import { BankStatementData, Transaction } from '@/services/bankStatementService';

export function processFinancialData(text: string): BankStatementData {
  // Implement regex patterns to extract financial information
  // This will be specific to the format of your bank statements
  
  // Example implementation:
  const balanceMatch = text.match(/Balance: ₹([\d,]+)/);
  const totalBalance = balanceMatch ? balanceMatch[1].replace(/,/g, '') : '0';
  
  // Extract transactions using regex
  const transactionMatches = text.matchAll(/Date: ([\d\/]+).*Amount: ₹([\d,]+).*Description: (.*?)(?=Date:|$)/gs);
  
  // Process transactions
  const transactions: Transaction[] = [];
  for (const match of transactionMatches) {
    // Process each transaction
    // ...
  }
  
  // Return processed data
  return {
    totalBalance: `₹${Number(totalBalance).toLocaleString('en-IN')}`,
    income: '₹0', // Calculate from transactions
    expenses: '₹0', // Calculate from transactions
    incomeTransactions: 0,
    expenseTransactions: 0,
    comparedToLastMonth: '₹0',
    budgetData: [],
    transactions
  };
}
```

### 4. Update Service Integration

Update the `processBankStatement` function in `bankStatementService.ts` to use the real API:

```typescript
export async function processBankStatement(file: File): Promise<BankStatementData | null> {
  try {
    const formData = new FormData();
    formData.append("statement", file);
    
    const response = await fetch('/api/process-statement', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to process statement');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error processing bank statement:", error);
    return null;
  }
}
```

## Deterministic Analysis for Consistent Results

The Twinance application ensures deterministic and consistent results when analyzing the same bank statement multiple times. This is critical for a financial application, as users expect the same analysis results for the same input data.

### Deterministic Features

1. **Enhanced Caching System**:
   - Each uploaded PDF is hashed based on its content and metadata
   - Analysis results are cached both in-memory and in localStorage
   - Subsequent uploads of the same file retrieve cached results

2. **Gemini API Configuration**:
   - Temperature set to 0 for deterministic outputs
   - Structured prompts with explicit instructions for consistency
   - Seed values included in prompts based on file properties

3. **Fallback Simulation**:
   - If Gemini API fails, a deterministic simulation is used
   - Simulation is based on filename hash to ensure the same results
   - Consistent algorithms for transaction generation and categorization

4. **Deterministic UI Components**:
   - AIInsights component uses consistent algorithms based on financial data
   - AIAssistant uses deterministic response selection for the same queries
   - Data processing in all components follows deterministic patterns

### How It Works

1. When a bank statement is uploaded:
   - A unique hash is generated for the file
   - The system checks if this file has been analyzed before
   - If yes, it retrieves the cached results; if no, it performs a new analysis

2. For new analyses:
   - The Gemini API is configured for deterministic outputs
   - The same file will always produce the same structured data
   - Results are cached for future reference

3. The UI components:
   - Use deterministic algorithms to generate insights and visualizations
   - Always produce the same output for the same input data
   - Cache results to ensure consistency across sessions

This approach ensures that users get consistent analysis results every time they upload the same bank statement, building trust in the application's AI-powered insights.

## Dependencies

- Next.js
- Shadcn UI
- Clerk Authentication
- Recharts
- Tailwind CSS
- PDF.js (for PDF text extraction)
- Gemini API (for AI analysis and insights)

## License

MIT
>>>>>>> d318a8a (push)

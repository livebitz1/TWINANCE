"use client";

// Enhanced Client-side PDF extraction utilities with comprehensive bank statement parsing
// Only uses browser-compatible libraries

let pdfjsLib: any = null;

// Bank statement data structure
export interface BankStatementData {
  rawText: string;
  accountInfo: {
    accountNumber?: string;
    accountHolderName?: string;
    bankName?: string;
    ifscCode?: string;
    branchName?: string;
    accountType?: string;
    customerID?: string;
  };
  statementPeriod: {
    startDate?: string;
    endDate?: string;
  };
  balance: {
    openingBalance?: number;
    closingBalance?: number;
    currentBalance?: number;
  };
  transactions: Array<{
    date: string;
    description: string;
    debit?: number;
    credit?: number;
    balance?: number;
    referenceNumber?: string;
    mode?: string;
  }>;
  summary: {
    totalCredits?: number;
    totalDebits?: number;
    numberOfTransactions?: number;
    numberOfCredits?: number;
    numberOfDebits?: number;
  };
  metadata: {
    pageCount: number;
    extractionMethod: string;
    extractionDate: string;
    fileSize: number;
  };
}

export async function extractTextFromPDF(file: File): Promise<string | null> {
  console.log(`Starting PDF extraction for file: ${file.name}`);
  
  // Try method 1: Server-side API (most reliable)
  try {
    console.log("Attempting server-side API method...");
    const result = await extractWithServerAPI(file);
    if (result && result.trim().length > 0) {
      console.log(`✅ Server-side API successful: ${result.length} characters`);
      return result;
    }
  } catch (error) {
    console.log("Server-side API method failed:", error);
  }

  // Try method 2: Enhanced PDF.js (browser-compatible)
  try {
    console.log("Attempting pdfjs-dist method...");
    const result = await extractWithPdfJs(file);
    if (result && result.trim().length > 0) {
      console.log(`✅ pdfjs-dist successful: ${result.length} characters`);
      return result;
    }
  } catch (error) {
    console.log("pdfjs-dist method failed:", error);
  }

  // Try method 3: OCR fallback for image-based PDFs (client-side only)
  if (typeof window !== 'undefined') {
    try {
      console.log("Attempting OCR fallback method...");
      const { extractTextWithOCR } = await import('./ocrUtils');
      const result = await extractTextWithOCR(file);
      if (result && result.trim().length > 0) {
        console.log(`✅ OCR fallback successful: ${result.length} characters`);
        return result;
      }
    } catch (error) {
      console.log("OCR fallback method failed:", error);
    }
  }

  // All methods failed
  console.log("All PDF text extraction methods failed");
  throw new Error('All PDF extraction methods failed - cannot extract text from this PDF file. Please ensure the PDF contains readable text and is not password-protected or corrupted.');
}

/**
 * Enhanced extraction with comprehensive bank statement parsing
 */
export async function extractBankStatementData(file: File): Promise<BankStatementData> {
  console.log(`Starting comprehensive bank statement extraction for: ${file.name}`);
  
  const startTime = Date.now();
  
  // Extract raw text from PDF
  const rawText = await extractTextFromPDF(file);
  
  if (!rawText) {
    throw new Error('Failed to extract text from PDF');
  }

  console.log(`Raw text extracted: ${rawText.length} characters`);
  
  // Parse the extracted text into structured data
  const statementData: BankStatementData = {
    rawText,
    accountInfo: parseAccountInfo(rawText),
    statementPeriod: parseStatementPeriod(rawText),
    balance: parseBalanceInfo(rawText),
    transactions: parseTransactions(rawText),
    summary: {
      totalCredits: 0,
      totalDebits: 0,
      numberOfTransactions: 0,
      numberOfCredits: 0,
      numberOfDebits: 0,
    },
    metadata: {
      pageCount: 0,
      extractionMethod: 'enhanced-parser',
      extractionDate: new Date().toISOString(),
      fileSize: file.size,
    },
  };

  // Calculate summary statistics
  statementData.summary = calculateSummary(statementData.transactions);
  
  const extractionTime = Date.now() - startTime;
  console.log(`✅ Bank statement extraction completed in ${extractionTime}ms`);
  console.log(`Extracted ${statementData.transactions.length} transactions`);
  console.log(`Account: ${statementData.accountInfo.accountNumber || 'Unknown'}`);
  console.log(`Period: ${statementData.statementPeriod.startDate} to ${statementData.statementPeriod.endDate}`);
  
  return statementData;
}

/**
 * Parse account information from raw text
 */
function parseAccountInfo(text: string): BankStatementData['accountInfo'] {
  const accountInfo: BankStatementData['accountInfo'] = {};

  // Account Number patterns
  const accountNumberPatterns = [
    /Account\s*(?:Number|No\.?|#)\s*:?\s*(\d{9,18})/i,
    /A\/C\s*(?:No\.?|Number)\s*:?\s*(\d{9,18})/i,
    /Account\s*:\s*(\d{9,18})/i,
    /(\d{9,18})\s*(?=Account|A\/C)/i,
  ];

  for (const pattern of accountNumberPatterns) {
    const match = text.match(pattern);
    if (match) {
      accountInfo.accountNumber = match[1].trim();
      break;
    }
  }

  // Account Holder Name patterns
  const namePatterns = [
    /(?:Account\s*Holder|Name|Customer\s*Name)\s*:?\s*([A-Z][A-Z\s\.]{2,50})/i,
    /Dear\s+([A-Z][A-Z\s\.]{2,50})/i,
    /(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+([A-Z][A-Z\s\.]{2,50})/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      accountInfo.accountHolderName = match[1].trim();
      break;
    }
  }

  // Bank Name patterns
  const bankNamePatterns = [
    /(HDFC\s*Bank|State\s*Bank\s*of\s*India|ICICI\s*Bank|Axis\s*Bank|Kotak\s*Mahindra\s*Bank|IDFC\s*First\s*Bank|Yes\s*Bank|IndusInd\s*Bank|Bank\s*of\s*Baroda|Punjab\s*National\s*Bank|Canara\s*Bank|Union\s*Bank|Indian\s*Bank)/i,
  ];

  for (const pattern of bankNamePatterns) {
    const match = text.match(pattern);
    if (match) {
      accountInfo.bankName = match[1].trim();
      break;
    }
  }

  // IFSC Code patterns
  const ifscPatterns = [
    /IFSC\s*(?:Code)?\s*:?\s*([A-Z]{4}0[A-Z0-9]{6})/i,
    /([A-Z]{4}0[A-Z0-9]{6})/,
  ];

  for (const pattern of ifscPatterns) {
    const match = text.match(pattern);
    if (match && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(match[1])) {
      accountInfo.ifscCode = match[1].trim();
      break;
    }
  }

  // Branch Name patterns
  const branchPatterns = [
    /Branch\s*:?\s*([A-Z][A-Za-z\s,\.]{2,50})/i,
    /Branch\s*Name\s*:?\s*([A-Z][A-Za-z\s,\.]{2,50})/i,
  ];

  for (const pattern of branchPatterns) {
    const match = text.match(pattern);
    if (match) {
      accountInfo.branchName = match[1].trim();
      break;
    }
  }

  // Account Type patterns
  const accountTypePatterns = [
    /Account\s*Type\s*:?\s*(Savings|Current|Salary|NRI|Fixed\s*Deposit)/i,
    /(Savings|Current|Salary)\s*Account/i,
  ];

  for (const pattern of accountTypePatterns) {
    const match = text.match(pattern);
    if (match) {
      accountInfo.accountType = match[1].trim();
      break;
    }
  }

  // Customer ID patterns
  const customerIdPatterns = [
    /Customer\s*ID\s*:?\s*(\d{6,15})/i,
    /CIF\s*(?:No\.?|Number)?\s*:?\s*(\d{6,15})/i,
  ];

  for (const pattern of customerIdPatterns) {
    const match = text.match(pattern);
    if (match) {
      accountInfo.customerID = match[1].trim();
      break;
    }
  }

  return accountInfo;
}

/**
 * Parse statement period from raw text
 */
function parseStatementPeriod(text: string): BankStatementData['statementPeriod'] {
  const period: BankStatementData['statementPeriod'] = {};

  // Date format patterns
  const datePatterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
    // DD MMM YYYY (e.g., 01 Jan 2024)
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/gi,
    // YYYY-MM-DD
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
  ];

  // Statement period patterns
  const periodPatterns = [
    /Statement\s*Period\s*:?\s*(.+?)\s*(?:to|-)?\s*(.+?)(?:\n|$)/i,
    /From\s*:?\s*(.+?)\s*To\s*:?\s*(.+?)(?:\n|$)/i,
    /Period\s*:?\s*(.+?)\s*to\s*(.+?)(?:\n|$)/i,
  ];

  for (const pattern of periodPatterns) {
    const match = text.match(pattern);
    if (match) {
      period.startDate = normalizeDate(match[1].trim());
      period.endDate = normalizeDate(match[2].trim());
      if (period.startDate && period.endDate) {
        break;
      }
    }
  }

  // If period not found, try to extract first and last transaction dates
  if (!period.startDate || !period.endDate) {
    const dates = extractAllDates(text);
    if (dates.length > 0) {
      period.startDate = dates[0];
      period.endDate = dates[dates.length - 1];
    }
  }

  return period;
}

/**
 * Parse balance information from raw text
 */
function parseBalanceInfo(text: string): BankStatementData['balance'] {
  const balance: BankStatementData['balance'] = {};

  // Opening Balance patterns
  const openingBalancePatterns = [
    /Opening\s*Balance\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
    /Opening\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
    /Balance\s*(?:B\/F|b\/f|Brought\s*Forward)\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of openingBalancePatterns) {
    const match = text.match(pattern);
    if (match) {
      balance.openingBalance = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Closing Balance patterns
  const closingBalancePatterns = [
    /Closing\s*Balance\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
    /Closing\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
    /Balance\s*(?:C\/F|c\/f|Carried\s*Forward)\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of closingBalancePatterns) {
    const match = text.match(pattern);
    if (match) {
      balance.closingBalance = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Current Balance patterns
  const currentBalancePatterns = [
    /Current\s*Balance\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
    /Available\s*Balance\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of currentBalancePatterns) {
    const match = text.match(pattern);
    if (match) {
      balance.currentBalance = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  return balance;
}

/**
 * Parse transactions from raw text with enhanced detection
 */
function parseTransactions(text: string): BankStatementData['transactions'] {
  const transactions: BankStatementData['transactions'] = [];
  
  // Split text into lines
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Transaction line patterns - more comprehensive
  const transactionPatterns = [
    // Pattern 1: Date | Description | Debit | Credit | Balance
    /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+(?:(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*))?(?:\s+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*))?(?:\s+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*))?/,
    
    // Pattern 2: Date Description Amount (Debit/Credit indicator)
    /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+(?:Dr|Cr|Debit|Credit)?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
    
    // Pattern 3: Date | Description | Amount | Dr/Cr | Balance
    /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)\s+(Dr|Cr)/i,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip header lines
    if (isHeaderLine(line)) {
      continue;
    }

    // Try to match transaction patterns
    for (const pattern of transactionPatterns) {
      const match = line.match(pattern);
      
      if (match) {
        const transaction = parseTransactionLine(match, line);
        if (transaction) {
          transactions.push(transaction);
          break;
        }
      }
    }

    // Also try to parse UPI/NEFT/IMPS transactions which may have multiple lines
    if (line.match(/UPI|NEFT|IMPS|RTGS|NACH|ECS|ATM/i)) {
      const transaction = parseMultiLineTransaction(lines, i);
      if (transaction) {
        transactions.push(transaction);
      }
    }
  }

  // Sort transactions by date
  transactions.sort((a, b) => {
    const dateA = parseDateToTimestamp(a.date);
    const dateB = parseDateToTimestamp(b.date);
    return dateA - dateB;
  });

  console.log(`Parsed ${transactions.length} transactions`);
  
  return transactions;
}

/**
 * Check if a line is a header line
 */
function isHeaderLine(line: string): boolean {
  const headerKeywords = [
    'transaction', 'date', 'description', 'debit', 'credit', 'balance',
    'particulars', 'withdrawal', 'deposit', 'narration', 'value date',
    'chq', 'cheque', 'ref', 'reference', 'mode', 'type'
  ];
  
  const lowerLine = line.toLowerCase();
  let keywordCount = 0;
  
  for (const keyword of headerKeywords) {
    if (lowerLine.includes(keyword)) {
      keywordCount++;
    }
  }
  
  // If line contains 2 or more header keywords, it's likely a header
  return keywordCount >= 2;
}

/**
 * Parse a single transaction line
 */
function parseTransactionLine(match: RegExpMatchArray, fullLine: string): BankStatementData['transactions'][0] | null {
  try {
    const date = normalizeDate(match[1]);
    if (!date) return null;

    const description = match[2]?.trim() || '';
    if (description.length < 3) return null;

    const transaction: BankStatementData['transactions'][0] = {
      date,
      description,
    };

    // Extract amounts - try to intelligently detect debit/credit
    const amounts = [match[3], match[4], match[5]].filter(Boolean);
    
    if (amounts.length > 0) {
      // Check for Dr/Cr indicators
      const isDr = fullLine.match(/\bDr\b/i) !== null;
      const isCr = fullLine.match(/\bCr\b/i) !== null;

      if (amounts.length === 1) {
        const amount = parseFloat(amounts[0].replace(/,/g, ''));
        if (isDr || description.match(/debit|withdraw|payment|transfer\s*to/i)) {
          transaction.debit = amount;
        } else if (isCr || description.match(/credit|deposit|transfer\s*from|salary|interest/i)) {
          transaction.credit = amount;
        } else {
          // Default to debit if unclear
          transaction.debit = amount;
        }
      } else if (amounts.length === 2) {
        // Likely debit and credit columns
        const amt1 = parseFloat(amounts[0].replace(/,/g, ''));
        const amt2 = parseFloat(amounts[1].replace(/,/g, ''));
        
        if (amt1 > 0 && amt2 === 0) {
          transaction.debit = amt1;
        } else if (amt2 > 0 && amt1 === 0) {
          transaction.credit = amt2;
        } else {
          transaction.debit = amt1;
          transaction.credit = amt2;
        }
      } else if (amounts.length >= 3) {
        // Likely debit, credit, balance
        transaction.debit = parseFloat(amounts[0].replace(/,/g, '')) || undefined;
        transaction.credit = parseFloat(amounts[1].replace(/,/g, '')) || undefined;
        transaction.balance = parseFloat(amounts[2].replace(/,/g, '')) || undefined;
      }
    }

    // Extract reference number
    const refMatch = fullLine.match(/(?:Ref|Reference|UTR|RRN|TXN)\s*(?:No\.?|Number)?\s*:?\s*(\w+)/i);
    if (refMatch) {
      transaction.referenceNumber = refMatch[1];
    }

    // Extract transaction mode
    const modeMatch = fullLine.match(/\b(UPI|NEFT|IMPS|RTGS|NACH|ECS|ATM|Cheque|Cash|Card|Online)\b/i);
    if (modeMatch) {
      transaction.mode = modeMatch[1].toUpperCase();
    }

    return transaction;
  } catch (error) {
    console.error('Error parsing transaction line:', error);
    return null;
  }
}

/**
 * Parse multi-line transaction (for UPI, NEFT, etc.)
 */
function parseMultiLineTransaction(lines: string[], startIndex: number): BankStatementData['transactions'][0] | null {
  const currentLine = lines[startIndex];
  const nextLine = lines[startIndex + 1] || '';
  
  const dateMatch = currentLine.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  if (!dateMatch) return null;

  const date = normalizeDate(dateMatch[1]);
  if (!date) return null;

  // Combine current and next line for description
  const description = (currentLine + ' ' + nextLine).trim();

  const transaction: BankStatementData['transactions'][0] = {
    date,
    description,
  };

  // Extract amounts from both lines
  const amountPattern = /(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/g;
  const amounts: number[] = [];
  
  let match;
  while ((match = amountPattern.exec(currentLine + ' ' + nextLine)) !== null) {
    amounts.push(parseFloat(match[1].replace(/,/g, '')));
  }

  if (amounts.length > 0) {
    // Determine if debit or credit based on keywords
    const isDebit = description.match(/debit|withdraw|payment|transfer\s*to|sent/i) !== null;
    const isCredit = description.match(/credit|deposit|transfer\s*from|received|salary/i) !== null;

    if (isCredit) {
      transaction.credit = amounts[0];
    } else if (isDebit) {
      transaction.debit = amounts[0];
    } else {
      transaction.debit = amounts[0];
    }

    if (amounts.length > 1) {
      transaction.balance = amounts[amounts.length - 1];
    }
  }

  // Extract reference number
  const refMatch = description.match(/(?:Ref|UTR|RRN|TXN)\s*:?\s*(\w+)/i);
  if (refMatch) {
    transaction.referenceNumber = refMatch[1];
  }

  // Extract mode
  const modeMatch = description.match(/\b(UPI|NEFT|IMPS|RTGS|NACH|ECS|ATM)\b/i);
  if (modeMatch) {
    transaction.mode = modeMatch[1].toUpperCase();
  }

  return transaction;
}

/**
 * Calculate summary statistics from transactions
 */
function calculateSummary(transactions: BankStatementData['transactions']): BankStatementData['summary'] {
  const summary: BankStatementData['summary'] = {
    totalCredits: 0,
    totalDebits: 0,
    numberOfTransactions: transactions.length,
    numberOfCredits: 0,
    numberOfDebits: 0,
  };

  for (const transaction of transactions) {
    if (transaction.credit && transaction.credit > 0) {
      summary.totalCredits = (summary.totalCredits || 0) + transaction.credit;
      summary.numberOfCredits = (summary.numberOfCredits || 0) + 1;
    }
    if (transaction.debit && transaction.debit > 0) {
      summary.totalDebits = (summary.totalDebits || 0) + transaction.debit;
      summary.numberOfDebits = (summary.numberOfDebits || 0) + 1;
    }
  }

  return summary;
}

/**
 * Normalize date to DD/MM/YYYY format
 */
function normalizeDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;

  // Try DD/MM/YYYY or DD-MM-YYYY
  let match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) {
      year = '20' + year;
    }
    return `${day}/${month}/${year}`;
  }

  // Try DD MMM YYYY
  match = dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = monthMap[match[2].toLowerCase().substring(0, 3)];
    const year = match[3];
    return `${day}/${month}/${year}`;
  }

  return undefined;
}

/**
 * Extract all dates from text
 */
function extractAllDates(text: string): string[] {
  const dates: string[] = [];
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
  
  let match;
  while ((match = datePattern.exec(text)) !== null) {
    const normalized = normalizeDate(match[1]);
    if (normalized) {
      dates.push(normalized);
    }
  }

  return dates;
}

/**
 * Parse date to timestamp for sorting
 */
function parseDateToTimestamp(dateStr: string): number {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return 0;
  
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  
  return new Date(year, month, day).getTime();
}

// Server API extraction (existing function)
async function extractWithServerAPI(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/parse-statement', {
    method: 'POST',
    body: formData,
  });

  if (response.ok) {
    const data = await response.json();
    if (data.success && data.text && data.text.trim().length > 0) {
      console.log(`Server API success (${data.method || 'pdf-parse'}): ${data.text.length} characters`);
      return data.text;
    }
  } else if (response.status === 422 || response.status === 500) {
    const errorData = await response.json();
    console.log(`Server API failed (${response.status}): ${errorData.message || errorData.error}`);
    if (errorData.canRetry) {
      throw new Error(`Server extraction failed: ${errorData.message}`);
    }
  }

  throw new Error(`Server API failed: ${response.status}`);
}

// PDF.js extraction (existing function with enhancements)
async function extractWithPdfJs(file: File): Promise<string | null> {
  if (!pdfjsLib) {
    try {
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
      
      if (typeof window !== 'undefined') {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          console.log("PDF.js worker configured successfully");
        } catch (workerError) {
          console.log("Worker configuration failed, trying legacy path:", workerError);
          try {
            const pdfWorker = await import('pdfjs-dist/legacy/build/pdf.worker.entry');
            pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;
          } catch (legacyError) {
            console.log("Legacy worker also failed, using fallback");
            pdfjsLib.GlobalWorkerOptions.workerSrc = null;
          }
        }
      }
    } catch (importError) {
      console.error("Failed to import pdfjs-dist:", importError);
      throw new Error("PDF.js import failed");
    }
  }

  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask = pdfjsLib.getDocument({ 
    data: arrayBuffer,
    standardFontDataUrl: '/standard_fonts/',
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    verbosity: 0,
    disableAutoFetch: true,
    disableStream: true
  });

  const pdf = await loadingTask.promise;
  let extractedText = '';
  
  console.log(`PDF has ${pdf.numPages} pages`);
  
  // Enhanced text extraction with better spacing and line breaks
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Sort items by vertical position (y) then horizontal position (x)
      const items = textContent.items.sort((a: any, b: any) => {
        if (Math.abs(a.transform[5] - b.transform[5]) > 5) {
          return b.transform[5] - a.transform[5]; // Sort by y position (top to bottom)
        }
        return a.transform[4] - b.transform[4]; // Sort by x position (left to right)
      });

      let currentY = items[0]?.transform[5] || 0;
      let lineText = '';
      
      for (const item of items) {
        if ('str' in item && item.str.trim()) {
          const itemY = item.transform[5];
          
          // New line detected (vertical position changed significantly)
          if (Math.abs(currentY - itemY) > 5) {
            if (lineText.trim()) {
              extractedText += lineText.trim() + '\n';
            }
            lineText = item.str;
            currentY = itemY;
          } else {
            // Same line - add space if needed
            if (lineText && !lineText.endsWith(' ') && !item.str.startsWith(' ')) {
              lineText += ' ';
            }
            lineText += item.str;
          }
        }
      }
      
      // Add last line
      if (lineText.trim()) {
        extractedText += lineText.trim() + '\n';
      }
      
      extractedText += '\n'; // Page separator
      
      console.log(`Extracted text from page ${pageNum}: ${lineText.length} characters`);
    } catch (pageError) {
      console.error(`Error extracting text from page ${pageNum}:`, pageError);
    }
  }
  
  console.log(`Total extracted text length: ${extractedText.length} characters`);
  
  if (extractedText.trim().length === 0) {
    throw new Error('No text could be extracted from the PDF');
  }
  
  return extractedText.trim();
}
"use client";

import { IndianBankStatementParser } from "./advancedBankStatementParser";

/**
 * Test utility to help debug PDF parsing issues
 */
export class ParsingDebugger {
  
  /**
   * Test parsing with sample bank statement text
   */
  static testWithSampleText(): void {
    const sampleText = `
    Statement Period: 01/04/2025 to 30/06/2025
    Account No: 1234567890
    Account Holder: JOHN DOE
    HDFC BANK
    
    14/06/25 UPI to SHREE SHYAM ENTERPRI ₹100
    14/06/25 UPI to SHREE SHYAM ENTERPRI ₹150
    20/06/25 UPI to GOOGLE PLAYSTORE ₹990
    23/06/25 UPI to KALU RAM YADAV ₹90
    26/06/25 UPI to AYUSH MEENA ₹200
    `;
    
    console.log("=== TESTING SAMPLE BANK STATEMENT ===");
    const result = IndianBankStatementParser.parseStatement(sampleText);
    
    if (result) {
      console.log("✅ Parsing successful!");
      console.log("Transactions found:", result.transactions.length);
      console.log("Sample transactions:", result.transactions.slice(0, 3));
      console.log("Total income:", result.income);
      console.log("Total expenses:", result.expenses);
    } else {
      console.log("❌ Parsing failed!");
    }
  }
  
  /**
   * Log detailed parsing information for debugging
   */
  static debugParsing(text: string): void {
    console.log("=== PARSING DEBUG INFO ===");
    console.log("Original text length:", text.length);
    console.log("First 500 characters:", text.substring(0, 500));
    
    // Test different regex patterns
    const patterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s+UPI[:\s]*(.+?)\s+₹?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s+(.+?)\s+₹?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
    ];
    
    patterns.forEach((pattern, index) => {
      const matches = Array.from(text.matchAll(pattern));
      console.log(`Pattern ${index + 1} matches:`, matches.length);
      if (matches.length > 0) {
        console.log("Sample match:", matches[0]);
      }
    });
    
    // Test line-by-line approach
    const lines = text.split('\n');
    console.log("Total lines:", lines.length);
    
    const linesWithDates = lines.filter(line => 
      line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/)
    );
    console.log("Lines with dates:", linesWithDates.length);
    
    if (linesWithDates.length > 0) {
      console.log("Sample date line:", linesWithDates[0]);
    }
  }
  
  /**
   * Validate that transactions match expected format
   */
  static validateTransactions(transactions: any[]): boolean {
    if (!Array.isArray(transactions)) {
      console.error("Transactions is not an array");
      return false;
    }
    
    for (const [index, transaction] of transactions.entries()) {
      const required = ['id', 'date', 'description', 'amount', 'type'];
      const missing = required.filter(field => !(field in transaction));
      
      if (missing.length > 0) {
        console.error(`Transaction ${index} missing fields:`, missing);
        return false;
      }
      
      // Validate date format (DD/MM/YYYY)
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(transaction.date)) {
        console.error(`Transaction ${index} has invalid date format:`, transaction.date);
        return false;
      }
      
      // Validate amount is a number
      if (typeof transaction.amount !== 'number' || isNaN(transaction.amount)) {
        console.error(`Transaction ${index} has invalid amount:`, transaction.amount);
        return false;
      }
      
      // Validate type
      if (!['credit', 'debit'].includes(transaction.type)) {
        console.error(`Transaction ${index} has invalid type:`, transaction.type);
        return false;
      }
    }
    
    console.log("✅ All transactions are valid");
    return true;
  }
}

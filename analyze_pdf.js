#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple PDF text extraction using Node.js
async function extractPDFText() {
  try {
    const pdfPath = 'Acct Statement_XX8129_07072025.pdf';
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    console.log('=== PDF FILE ANALYSIS ===');
    console.log(`File size: ${pdfBuffer.length} bytes`);
    
    // Convert to string and look for text patterns
    const text = pdfBuffer.toString('latin1');
    
    // Look for common bank statement patterns
    const patterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,  // Dates
      /₹[\d,]+\.?\d*/g,                // Currency amounts
      /(\d+\.\d{2})/g,                 // Decimal amounts
      /UPI|NEFT|IMPS|ATM/gi,          // Transaction types
      /Credit|Debit|Balance/gi,       // Account terms
      /[A-Z][a-z]+ [A-Z][a-z]+/g     // Names/descriptions
    ];
    
    console.log('\n=== EXTRACTED PATTERNS ===');
    
    patterns.forEach((pattern, index) => {
      const matches = text.match(pattern) || [];
      if (matches.length > 0) {
        console.log(`Pattern ${index + 1} matches:`, matches.slice(0, 10));
      }
    });
    
    // Look for specific financial data
    const amountMatches = text.match(/[\d,]+\.?\d*/g) || [];
    const largeAmounts = amountMatches
      .filter(amount => {
        const num = parseFloat(amount.replace(/,/g, ''));
        return num > 1000 && num < 100000;
      })
      .slice(0, 20);
    
    console.log('\n=== POTENTIAL AMOUNTS ===');
    console.log('Large amounts found:', largeAmounts);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

extractPDFText();

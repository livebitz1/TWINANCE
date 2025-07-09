#!/usr/bin/env node

// Test script to validate PDF extraction endpoint
const fs = require('fs');
const FormData = require('form-data');

async function testPDFExtraction() {
  console.log("🧪 Testing PDF extraction endpoint...");
  
  try {
    // Test with a simple text file as PDF (to simulate)
    const testContent = `
BANK STATEMENT
Account Holder: John Doe
Account Number: ****1234
Statement Period: 01/01/2024 - 31/01/2024

Date        Description                 Amount      Balance
01/01/2024  Opening Balance            0.00        25000.00
02/01/2024  Salary Credit              45000.00    70000.00
03/01/2024  ATM Withdrawal             -2000.00    68000.00
05/01/2024  UPI Payment - Swiggy       -850.00     67150.00
07/01/2024  Bill Payment - Electricity -1200.00    65950.00
    `;
    
    // Test with fetch
    const fetch = (await import('node-fetch')).default;
    
    const formData = new FormData();
    const testBuffer = Buffer.from(testContent);
    formData.append('file', testBuffer, { filename: 'test-statement.pdf', contentType: 'application/pdf' });
    
    console.log("Sending test request to http://localhost:3000/api/parse-statement");
    
    const response = await fetch('http://localhost:3000/api/parse-statement', {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log("✅ PDF extraction endpoint is working!");
      console.log(`Extracted ${result.text.length} characters`);
      console.log("Method used:", result.method);
      console.log("Text preview:", result.text.substring(0, 200));
    } else {
      console.log("❌ PDF extraction failed:");
      console.log("Status:", response.status);
      console.log("Response:", result);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.log("Make sure the development server is running on port 3000");
  }
}

// Wait a moment for server to start, then test
setTimeout(testPDFExtraction, 3000);

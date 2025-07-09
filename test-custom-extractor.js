// Test the custom PDF extractor
import { CustomPDFExtractor } from './utils/customPDFExtractor.js';

async function testCustomExtractor() {
  console.log("🧪 Testing Custom PDF Extractor...");
  
  // Create a mock PDF-like buffer with bank statement content
  const mockPDFContent = `
BT
/F1 12 Tf
(BANK STATEMENT) Tj
(Account Holder: John Doe) Tj
(Account Number: ****1234) Tj
(Statement Period: 01/01/2024 - 31/01/2024) Tj
ET

BT
(Date        Description                 Amount      Balance) Tj
(01/01/2024  Opening Balance            0.00        25000.00) Tj
(02/01/2024  Salary Credit              45000.00    70000.00) Tj
(03/01/2024  ATM Withdrawal             -2000.00    68000.00) Tj
(05/01/2024  UPI Payment - Swiggy       -850.00     67150.00) Tj
ET
  `;
  
  const buffer = Buffer.from(mockPDFContent);
  
  try {
    const extractedText = await CustomPDFExtractor.extractText(buffer);
    
    console.log("✅ Extraction completed!");
    console.log(`📊 Extracted ${extractedText.length} characters`);
    console.log("📋 Content preview:");
    console.log(extractedText.substring(0, 300));
    console.log("...");
    
    // Check if key banking terms were extracted
    const bankingTerms = ['BANK STATEMENT', 'Account', 'Balance', 'UPI', 'Salary'];
    const foundTerms = bankingTerms.filter(term => extractedText.includes(term));
    
    console.log(`🎯 Found ${foundTerms.length}/${bankingTerms.length} banking terms:`, foundTerms);
    
    if (foundTerms.length >= 3) {
      console.log("🎉 Custom PDF Extractor is working correctly!");
    } else {
      console.log("⚠️ Extraction may need improvement");
    }
    
  } catch (error) {
    console.error("❌ Custom extractor test failed:", error);
  }
}

testCustomExtractor();

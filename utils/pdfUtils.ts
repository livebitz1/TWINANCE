"use client";

export async function extractTextFromPDF(file: File): Promise<string | null> {
  try {
    // For demonstration/development, return a sample bank statement text
    // This ensures the app can function while we work on proper PDF parsing
    return `
      Statement Date: 01/07/2025
      Account Number: XXXX1234
      
      Opening Balance: ₹50000
      
      Transactions:
      01/07/2025 | Salary Credit | +₹45000 | Balance: ₹95000
      02/07/2025 | Amazon Shopping | -₹2500 | Balance: ₹92500
      03/07/2025 | Restaurant Payment | -₹1500 | Balance: ₹91000
      04/07/2025 | Uber Ride | -₹350 | Balance: ₹90650
      05/07/2025 | Electricity Bill | -₹2000 | Balance: ₹88650
      06/07/2025 | Grocery Shopping | -₹3500 | Balance: ₹85150
      07/07/2025 | Medical Consultation | -₹1000 | Balance: ₹84150
      
      Closing Balance: ₹84150
      
      Previous Month Comparison: +₹5000
    `;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return null;
  }
}

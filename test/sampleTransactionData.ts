// Test file to verify the enhanced TransactionHistory component

import { Transaction } from "../services/bankStatementService";

export const sampleTransactions: Transaction[] = [
  {
    id: "trans-1",
    date: "08/07/2025",
    description: "UPI - GOOGLE PLAYSTORE",
    amount: 299,
    type: "debit",
    category: "UPI",
    referenceNumber: "0000545857794292",
    balanceAfter: 84851,
    merchant: "Google Play",
    upiId: "merchant@paytm"
  },
  {
    id: "trans-2",
    date: "07/07/2025",
    description: "Salary Credit",
    amount: 45000,
    type: "credit",
    category: "Income",
    referenceNumber: "0000545857794293",
    balanceAfter: 85150,
    merchant: "Company HR"
  },
  {
    id: "trans-3",
    date: "06/07/2025",
    description: "Amazon Purchase",
    amount: 2500,
    type: "debit",
    category: "Shopping",
    referenceNumber: "0000545857794294",
    balanceAfter: 40150,
    merchant: "Amazon"
  },
  {
    id: "trans-4",
    date: "05/07/2025",
    description: "UPI - SWIGGY",
    amount: 350,
    type: "debit",
    category: "Food & Dining",
    referenceNumber: "0000545857794295",
    balanceAfter: 42650,
    merchant: "Swiggy",
    upiId: "vendor@phonepe"
  },
  {
    id: "trans-5",
    date: "04/07/2025",
    description: "NEFT Transfer",
    amount: 5000,
    type: "debit",
    category: "Transfer",
    referenceNumber: "0000545857794296",
    balanceAfter: 43000,
    merchant: "SBI"
  }
];

console.log("Sample transactions for testing:", sampleTransactions);

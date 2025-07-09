"use client";

import React, { createContext, useState, useContext } from "react";
import { BankStatementData, processBankStatement, Transaction } from "@/services/bankStatementService";

interface BankStatementContextType {
  hasUploadedStatement: boolean;
  setHasUploadedStatement: (value: boolean) => void;
  financialData: BankStatementData;
  setFinancialData: (data: BankStatementData) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  processFile: (file: File) => Promise<boolean>;
}

// Empty initial state instead of mock data
const initialFinancialData: BankStatementData = {
  totalBalance: "₹0",
  income: "₹0",
  expenses: "₹0",
  incomeTransactions: 0,
  expenseTransactions: 0,
  comparedToLastMonth: "₹0",
  budgetData: [],
  transactions: []
};

const BankStatementContext = createContext<BankStatementContextType | undefined>(undefined);

export function BankStatementProvider({ children }: { children: React.ReactNode }) {
  const [hasUploadedStatement, setHasUploadedStatement] = useState(false);
  const [financialData, setFinancialData] = useState<BankStatementData>(initialFinancialData);
  const [isProcessing, setIsProcessing] = useState(false);

  // Function to process a bank statement file
  const processFile = async (file: File): Promise<boolean> => {
    try {
      setIsProcessing(true);
      
      // Debug log file processing
      console.log(`🔄 Processing file: ${file.name} (${file.size} bytes)`);
      console.log("🚨 REAL DATA ONLY - No mock data will be generated");
      
      // Process the bank statement file - ONLY accept real data
      const result = await processBankStatement(file);
      
      if (result) {
        // Use ONLY real data from the PDF
        console.log("✅ Real data extracted successfully from PDF");
        console.log(`📊 Transactions found: ${result.transactions.length}`);
        console.log(`💰 Total Balance: ${result.totalBalance}`);
        console.log(`📅 Period: ${result.statementPeriod?.startDate} to ${result.statementPeriod?.endDate}`);
        
        setFinancialData(result);
        setHasUploadedStatement(true);
        setIsProcessing(false);
        return true;
      }
      
      // If no result, this means extraction failed
      console.error("❌ EXTRACTION FAILED: No real data could be extracted from PDF");
      setIsProcessing(false);
      
      // Do NOT set hasUploadedStatement to true - show error state
      return false;
      
    } catch (error) {
      console.error("❌ PROCESSING FAILED:", error);
      setIsProcessing(false);
      
      // Do NOT generate any fallback data - show error state
      console.error("❌ NO fallback data will be generated");
      console.error("❌ Dashboard will show empty state until valid PDF is uploaded");
      
      return false;
    }
  };

  return (
    <BankStatementContext.Provider
      value={{ 
        hasUploadedStatement, 
        setHasUploadedStatement, 
        financialData, 
        setFinancialData,
        isProcessing,
        setIsProcessing,
        processFile
      }}
    >
      {children}
    </BankStatementContext.Provider>
  );
}

export function useBankStatement() {
  const context = useContext(BankStatementContext);
  if (context === undefined) {
    throw new Error("useBankStatement must be used within a BankStatementProvider");
  }
  return context;
}

"use client";

import React, { createContext, useState, useContext, useEffect } from "react";
import { BankStatementData, processBankStatement, Transaction } from "@/services/bankStatementService";
import { getAllCachedHashes, getCachedAnalysis } from "@/services/cacheService";

interface BankStatementContextType {
  hasUploadedStatement: boolean;
  setHasUploadedStatement: (value: boolean) => void;
  financialData: BankStatementData;
  setFinancialData: (data: BankStatementData) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  processFile: (file: File) => Promise<boolean>;
  currentFileHash: string | null;
  setCurrentFileHash: (hash: string | null) => void;
  cachedFiles: string[];
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
  const [currentFileHash, setCurrentFileHash] = useState<string | null>(null);
  const [cachedFiles, setCachedFiles] = useState<string[]>([]);
  
  // Load cached files on initialization
  useEffect(() => {
    const hashes = getAllCachedHashes();
    setCachedFiles(hashes);
    
    // If we have cached files, log them for debugging
    if (hashes.length > 0) {
      console.log(`Found ${hashes.length} cached file analyses`);
    }
  }, []);

  // Function to process a bank statement file
  const processFile = async (file: File): Promise<boolean> => {
    try {
      setIsProcessing(true);
      
      // Debug log file processing
      console.log(`Processing file: ${file.name} (${file.size} bytes)`);
      
      // Process the bank statement file
      const result = await processBankStatement(file);
      
      if (result) {
        // Use real data from the API
        setFinancialData(result);
        setHasUploadedStatement(true);
        
        // Update cached files list
        const hashes = getAllCachedHashes();
        setCachedFiles(hashes);
        
        setIsProcessing(false);
        return true;
      }
      
      setIsProcessing(false);
      return false;
    } catch (error) {
      console.error("Error processing file:", error);
      setIsProcessing(false);
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
        processFile,
        currentFileHash,
        setCurrentFileHash,
        cachedFiles
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

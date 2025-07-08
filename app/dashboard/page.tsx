"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import DashboardNavbar from "@/components/DashboardNavbar";
import FinancialSummaryCard from "@/components/FinancialSummaryCard";
import BudgetChart from "@/components/BudgetChart";
import AIAssistant from "@/components/AIAssistant";
import AIInsights from "@/components/AIInsights";
import BankStatementUpload from "@/components/BankStatementUpload";
import TransactionHistory from "@/components/TransactionHistory";
import { BankStatementProvider, useBankStatement } from "@/contexts/BankStatementContext";
import { Toaster } from "@/components/ui/toaster";

// The inner dashboard component that uses the BankStatement context
function DashboardContent() {
  const { hasUploadedStatement, setHasUploadedStatement, financialData } = useBankStatement();

  return (
    <div className="h-full flex flex-col">
      {/* Fixed top bar with padding */}
      <div className="sticky top-0 z-10 bg-black/70 backdrop-blur-md px-6 py-4 border-b border-border/30 shadow-md">
        <div className="max-w-[1400px] mx-auto">
          <DashboardNavbar />
        </div>
      </div>
      
      {/* Scrollable content area with proper padding */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          {/* Bank Statement Upload or Financial Summary Cards */}
          {!hasUploadedStatement ? (
            <div className="my-8">
              <BankStatementUpload onUploadSuccess={() => setHasUploadedStatement(true)} />
            </div>
          ) : (
            <>
              {/* Account Info Banner */}
              {financialData.accountDetails && financialData.statementPeriod && (
                <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20 backdrop-blur-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-lg font-medium">{financialData.accountDetails.accountHolder}</h2>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <div>Account: {financialData.accountDetails.accountNumber}</div>
                        <div>Type: {financialData.accountDetails.accountType}</div>
                        <div>Bank: {financialData.accountDetails.bankName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">Statement Period</div>
                      <div className="text-sm text-muted-foreground">
                        {financialData.statementPeriod.startDate} to {financialData.statementPeriod.endDate}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                <FinancialSummaryCard 
                  title="TOTAL BALANCE" 
                  amount={financialData.totalBalance} 
                  description={`You have extra ${financialData.comparedToLastMonth} compared to last month`} 
                />
                
                <FinancialSummaryCard 
                  title="INCOME" 
                  amount={financialData.income}
                  transactions={financialData.incomeTransactions} 
                />
                
                <FinancialSummaryCard 
                  title="EXPENSES" 
                  amount={financialData.expenses}
                  transactions={financialData.expenseTransactions} 
                />
              </div>
            </>
          )}
          
          {/* Bottom Section: Budget Chart and AI Assistant */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
            <div className="md:col-span-2">
              <BudgetChart isBlurred={!hasUploadedStatement} />
            </div>
            
            <div className="h-full">
              <AIAssistant isBlurred={!hasUploadedStatement} />
            </div>
          </div>
          
          {/* AI Insights Section - Placed before Transaction History for better visibility */}
          <div className="mb-6">
            <AIInsights isBlurred={!hasUploadedStatement} />
          </div>
          
          {/* Transaction History Section */}
          <TransactionHistory 
            transactions={financialData.transactions} 
            isBlurred={!hasUploadedStatement} 
          />
        </div>
      </div>
    </div>
  );
}

// The main dashboard page wrapper
export default function DashboardPage() {
  const { isLoaded, userId } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Wait for Clerk to load
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  // Redirect if not signed in (client-side)
  if (isClient && !userId) {
    redirect("/sign-in");
    return null;
  }

  return (
    <BankStatementProvider>
      <DashboardContent />
      <Toaster />
    </BankStatementProvider>
  );
}

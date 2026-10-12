"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import DashboardNavbar from "@/components/DashboardNavbar";
import FinancialSummaryCard from "@/components/FinancialSummaryCard";
import BudgetChart from "@/components/BudgetChart";
import AIAssistant from "@/components/AIAssistant";
import BankStatementUpload from "@/components/BankStatementUpload";
import TransactionHistory from "@/components/TransactionHistory";
import { BankStatementProvider, useBankStatement } from "@/contexts/BankStatementContext";
import { Toaster } from "@/components/ui/toaster";

// The inner dashboard component that uses the BankStatement context
function DashboardContent() {
  const { hasUploadedStatement, setHasUploadedStatement, financialData } = useBankStatement();

  // h-screen, not min-h-screen, on the root element below: a percentage height
  // ("h-full" on its child) can only resolve against an ancestor with a
  // *definite* height, and min-height does not count as one. With min-height
  // here, "h-full flex flex-col" had no real height to fill, so it just sized to
  // its own content instead - which meant "flex-1 overflow-y-auto" never became
  // a bounded scroll region and the whole document scrolled natively instead.
  return (
    <div className="h-screen bg-background">
      <div className="h-full flex flex-col">
        {/* Fixed top bar with padding */}
        <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-md px-6 py-4 border-b border-border/30 shadow-md">
          <div className="max-w-[1400px] mx-auto">
            <DashboardNavbar />
          </div>
        </div>
        
        {/* Scrollable content area with proper padding */}
        <div className="flex-1 overflow-y-auto py-6 bg-background">
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
                  <div className="bg-card/10 backdrop-blur-sm border border-border/30 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Account Holder</p>
                        <p className="font-medium">{financialData.accountDetails.accountHolder}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Account Number</p>
                        <p className="font-medium">{financialData.accountDetails.accountNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Statement Period</p>
                        <p className="font-medium">
                          {financialData.statementPeriod.startDate} to {financialData.statementPeriod.endDate}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Account Type</p>
                        <p className="font-medium">{financialData.accountDetails.accountType}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial Summary Cards Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
                  <FinancialSummaryCard
                    title="Total Balance"
                    amount={financialData.totalBalance}
                    description="Current account balance"
                  />
                  <FinancialSummaryCard
                    title="Income"
                    amount={financialData.income}
                    description={`From ${financialData.incomeTransactions} transactions`}
                  />
                  <FinancialSummaryCard
                    title="Expenses"
                    amount={financialData.expenses}
                    description={`From ${financialData.expenseTransactions} transactions`}
                  />
                </div>

                {/* Charts and Insights Section */}
                {/* Each card sits in its own height-bounded wrapper rather than
                    inheriting a height from the grid row: a grid container with a
                    fixed height does not actually force its (default auto-sized)
                    rows to share that height evenly, so that wouldn't have bounded
                    the stacked mobile layout correctly. An explicit height per
                    wrapper works the same way at every breakpoint. Without it, the
                    AI chat's message list (which would otherwise have no ancestor
                    to bound it) grows the whole card as replies come in instead of
                    scrolling, and on the lg: two-column layout the chart card -
                    stretched to match via the grid's default row-stretch - grows
                    right along with it, stretching its bars taller and taller. */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Budget Chart */}
                  <div className="h-[600px]">
                    <BudgetChart isBlurred={!hasUploadedStatement} />
                  </div>

                  {/* AI Assistant */}
                  <div className="h-[600px]">
                    <AIAssistant isBlurred={!hasUploadedStatement} />
                  </div>
                </div>

                {/* AI Insights - Temporarily disabled */}
                {/* <AIInsights isBlurred={!hasUploadedStatement} /> */}

                {/* Transaction History */}
                <TransactionHistory
                  transactions={financialData.transactions}
                  isBlurred={!hasUploadedStatement}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const { isLoaded, userId } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show loading state while clerk loads
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  // Redirect to sign in if no user
  if (!userId && isClient) {
    redirect("/sign-in");
  }

  return (
    <BankStatementProvider>
      <DashboardContent />
      <Toaster />
    </BankStatementProvider>
  );
}

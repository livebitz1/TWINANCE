"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useBankStatement } from "@/contexts/BankStatementContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { geminiNLP } from "@/services/geminiNLPService";
import { Sparkles, BarChart3, TrendingUp, Loader2 } from "lucide-react";

interface AIInsightsProps {
  isBlurred?: boolean;
}

export default function AIInsights({ isBlurred = false }: AIInsightsProps) {
  const { hasUploadedStatement, financialData } = useBankStatement();
  const [insights, setInsights] = useState<string[]>([]);
  const [spendingTrends, setSpendingTrends] = useState<{ name: string; amount: number }[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Generate insights based on financial data
  useEffect(() => {
    if (!hasUploadedStatement || isBlurred) return;

    setIsLoading(true);

    // Generate spending trends deterministically
    if (financialData.transactions.length > 0) {
      const trends = generateDeterministicSpendingTrends(financialData.transactions);
      setSpendingTrends(trends);
      
      // Generate category breakdown
      const breakdown = generateCategoryBreakdown(financialData.transactions);
      setCategoryBreakdown(breakdown);
    }
    
    // Generate deterministic insights first for immediate display
    const baseInsights = generateDeterministicInsights(financialData);
    setInsights(baseInsights);
    setIsLoading(false);
    
    // Then enhance with AI-generated insights if we have the Gemini API available
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      generateAIInsights(financialData);
    }
  }, [hasUploadedStatement, financialData, isBlurred]);

  // Generate AI-powered insights using Gemini
  const generateAIInsights = async (financialData: any) => {
    try {
      setIsGeneratingInsights(true);
      
      // Create a detailed financial context for the AI
      const financialContext = getFinancialAnalysisContext(financialData);
      
      // Create a prompt for Gemini to generate personalized insights
      const prompt = `Based on the following financial data, provide 3-5 insightful, specific, and actionable financial observations or recommendations. Format each insight as a concise paragraph with specific numbers and percentages from the data.`;
      
      // Call Gemini NLP to generate insights
      const aiInsightsText = await geminiNLP.generateResponse(prompt, financialContext);
      
      // Parse the response into separate insights
      const aiInsights = aiInsightsText
        .split(/\n\s*\n|\n-\s*/) // Split on blank lines or bullet points
        .map(insight => insight.trim())
        .filter(insight => insight.length > 10) // Filter out short or empty lines
        .map(insight => insight.replace(/^\d+\.\s*/, '').trim()); // Remove numbering if present
      
      // Combine with our deterministic insights but prioritize AI insights
      if (aiInsights.length > 0) {
        const combinedInsights = [...aiInsights];
        
        // Add deterministic insights if needed to have at least 5 total
        const currentInsights = insights.filter(insight => 
          !aiInsights.some(aiInsight => 
            aiInsight.includes(insight.substring(0, 20)) || 
            insight.includes(aiInsight.substring(0, 20))
          )
        );
        
        while (combinedInsights.length < 5 && currentInsights.length > 0) {
          combinedInsights.push(currentInsights.shift()!);
        }
        
        setInsights(combinedInsights);
      }
    } catch (error) {
      console.error("Error generating AI insights:", error);
      // Fallback to deterministic insights already set
    } finally {
      setIsGeneratingInsights(false);
    }
  };
  
  // Helper to create a comprehensive financial context for the AI
  const getFinancialAnalysisContext = (financialData: any) => {
    // Calculate some basic financial metrics
    const totalBalance = parseFloat(financialData.totalBalance.replace(/[₹,]/g, '')) || 0;
    const income = parseFloat(financialData.income.replace(/[₹,]/g, '')) || 0;
    const expenses = parseFloat(financialData.expenses.replace(/[₹,]/g, '')) || 0;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    
    // Get category breakdown
    const categories: Record<string, number> = {};
    financialData.transactions
      .filter((t: any) => t.type === 'debit')
      .forEach((t: any) => {
        if (!categories[t.category]) categories[t.category] = 0;
        categories[t.category] += t.amount;
      });
    
    const categoryBreakdown = Object.entries(categories)
      .map(([name, value]) => ({ name, value, percentage: (value / expenses) * 100 }))
      .sort((a, b) => b.value - a.value);
      
    // Get day of week spending patterns
    const dayOfWeekSpending: Record<string, number> = {
      "Monday": 0, "Tuesday": 0, "Wednesday": 0, "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0
    };
    
    financialData.transactions
      .filter((t: any) => t.type === 'debit' && t.date)
      .forEach((t: any) => {
        try {
          const [day, month, year] = t.date.split('/').map(Number);
          const date = new Date(year, month - 1, day);
          const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
          dayOfWeekSpending[dayOfWeek] += t.amount;
        } catch (e) {
          // Skip invalid dates
        }
      });
    
    // Find recurring merchants (appearing more than once)
    const merchants: Record<string, {count: number, total: number}> = {};
    financialData.transactions
      .filter((t: any) => t.type === 'debit' && t.merchant)
      .forEach((t: any) => {
        if (!merchants[t.merchant]) merchants[t.merchant] = { count: 0, total: 0 };
        merchants[t.merchant].count += 1;
        merchants[t.merchant].total += t.amount;
      });
    
    const recurringMerchants = Object.entries(merchants)
      .filter(([, data]) => (data as any).count > 1)
      .sort(([, a], [, b]) => (b as any).total - (a as any).total)
      .slice(0, 5);
    
    // Format the context for the AI
    return `
      FINANCIAL DATA ANALYSIS:
      
      Account Details:
      - Account Holder: ${financialData.accountDetails?.accountHolder || 'Unknown'}
      - Account Type: ${financialData.accountDetails?.accountType || 'Unknown'}
      - Bank: ${financialData.accountDetails?.bankName || 'Unknown'}
      - Statement Period: ${financialData.statementPeriod?.startDate || 'Unknown'} to ${financialData.statementPeriod?.endDate || 'Unknown'}
      
      Financial Summary:
      - Current Balance: ${financialData.totalBalance}
      - Total Income: ${financialData.income}
      - Total Expenses: ${financialData.expenses}
      - Savings Rate: ${savingsRate.toFixed(1)}%
      - Income Transactions: ${financialData.incomeTransactions}
      - Expense Transactions: ${financialData.expenseTransactions}
      - Compared to Last Month: ${financialData.comparedToLastMonth}
      
      Category Breakdown:
      ${categoryBreakdown.map(c => `- ${c.name}: ₹${c.value.toLocaleString('en-IN')} (${c.percentage.toFixed(1)}%)`).join('\n')}
      
      Day of Week Spending:
      ${Object.entries(dayOfWeekSpending)
        .map(([day, amount]) => `- ${day}: ₹${amount.toLocaleString('en-IN')}`)
        .join('\n')}
      
      Top Recurring Merchants:
      ${recurringMerchants.map(([merchant, data]) => 
        `- ${merchant}: ${(data as any).count} transactions, ₹${(data as any).total.toLocaleString('en-IN')} total`
      ).join('\n')}
      
      IMPORTANT GUIDANCE:
      - Provide specific, data-driven insights about spending patterns, savings opportunities, and financial behaviors
      - Highlight unusual or noteworthy patterns in the transaction data
      - Focus on actionable recommendations that would help improve financial health
      - Include specific amounts or percentages in your insights to make them more concrete
      - Each insight should be self-contained and focused on a single observation or recommendation
    `;
  };

  return (
    <Card className={cn(
      "bg-background/10 backdrop-blur-sm border-border/30 w-full mt-6 transition-all shadow-md hover:shadow-lg",
      isBlurred && "hover:opacity-60"
    )}>
      <CardHeader className="pb-2 border-b border-border/20">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-primary" />
            AI INSIGHTS
          </CardTitle>
          {isGeneratingInsights && (
            <div className="flex items-center text-xs text-primary-foreground px-2 py-1 bg-primary/20 rounded-full">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Enhancing insights...
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={cn("p-4", isBlurred && "blur-sm select-none")}>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !hasUploadedStatement ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No insights available.</p>
            <p className="text-sm text-muted-foreground mt-2">Upload a bank statement to view AI-powered insights.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-md font-medium mb-2 flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-primary" />
                Financial Insights
              </h3>
              <ul className="space-y-2">
                {insights.map((insight, index) => (
                  <li key={index} className="p-3 rounded-lg border border-border/30 bg-background/5 shadow-sm hover:shadow-md transition-shadow">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
            
            {spendingTrends.length > 0 && (
              <div>
                <h3 className="text-md font-medium mb-2 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                  Spending Trends
                </h3>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={spendingTrends}
                      margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.5)" />
                      <YAxis 
                        stroke="rgba(255, 255, 255, 0.5)" 
                        tickFormatter={(value) => `₹${value / 1000}k`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                        contentStyle={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          borderRadius: '8px',
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {categoryBreakdown.length > 0 && (
              <div>
                <h3 className="text-md font-medium mb-2 flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2 text-primary" />
                  Category Breakdown
                </h3>
                <div className="flex flex-col space-y-2">
                  {categoryBreakdown.map((category, index) => (
                    <div key={index} className="rounded-lg border border-border/30 bg-background/5 shadow-sm overflow-hidden">
                      <div className="flex justify-between p-3">
                        <span className="text-sm font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground">₹{category.value.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-1 bg-background/20">
                        <div 
                          className="h-full bg-primary" 
                          style={{ 
                            width: `${Math.min(100, (category.value / categoryBreakdown[0].value) * 100)}%`,
                            transition: 'width 1s ease-in-out'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to generate deterministic insights based on financial data
function generateDeterministicInsights(financialData: any): string[] {
  const insights: string[] = [];
  
  // Generate a consistent hash/seed based on the financial data to ensure determinism
  const dataFingerprint = JSON.stringify({
    totalBalance: financialData.totalBalance,
    income: financialData.income,
    expenses: financialData.expenses,
    transactionCount: financialData.transactions.length
  });
  
  // Use this hash to ensure the same insights are generated for identical data
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  };
  
  const dataHash = hashCode(dataFingerprint);
  
  // Calculate income vs expense ratio deterministically
  const income = parseFloat(financialData.income.replace(/[₹,]/g, ''));
  const expenses = parseFloat(financialData.expenses.replace(/[₹,]/g, ''));
  
  if (!isNaN(income) && !isNaN(expenses) && income > 0) {
    const savingRate = ((income - expenses) / income) * 100;
    
    // Fixed insight based on saving rate thresholds
    if (savingRate > 30) {
      insights.push(`Great job! You're saving ${savingRate.toFixed(1)}% of your income. This is above the recommended 20% savings rate.`);
    } else if (savingRate > 20) {
      insights.push(`You're saving ${savingRate.toFixed(1)}% of your income, which is aligned with the recommended 20% savings rate.`);
    } else if (savingRate > 0) {
      insights.push(`You're saving ${savingRate.toFixed(1)}% of your income. Consider increasing your savings to reach the recommended 20% rate.`);
    } else {
      insights.push(`You're spending more than your income. Consider reviewing your expenses to avoid going into debt.`);
    }
  }
  
  // Analyze largest expense categories deterministically
  if (financialData.transactions.length > 0) {
    // Always sort transactions by ID first to ensure deterministic processing
    const sortedTransactions = [...financialData.transactions].sort((a, b) => 
      a.id.localeCompare(b.id)
    );
    
    const categories: Record<string, number> = {};
    
    sortedTransactions.forEach((transaction: any) => {
      if (transaction.type === 'debit') {
        if (!categories[transaction.category]) {
          categories[transaction.category] = 0;
        }
        categories[transaction.category] += transaction.amount;
      }
    });
    
    // Find largest category deterministically
    let largestCategory = '';
    let largestAmount = 0;
    
    // Use sorted keys to ensure deterministic iteration
    const sortedCategories = Object.keys(categories).sort();
    
    for (const category of sortedCategories) {
      if (categories[category] > largestAmount) {
        largestAmount = categories[category];
        largestCategory = category;
      }
    }
    
    if (largestCategory) {
      const percentage = (largestAmount / expenses) * 100;
      insights.push(`Your largest expense category is ${largestCategory}, accounting for ${percentage.toFixed(1)}% of your total expenses.`);
    }
  }
  
  // Comparison to previous month - deterministic
  const comparedToLastMonth = financialData.comparedToLastMonth;
  if (comparedToLastMonth && comparedToLastMonth !== '₹0' && comparedToLastMonth !== '₹0+') {
    const isPositive = comparedToLastMonth.includes('+');
    
    if (isPositive) {
      insights.push(`Your balance has increased by ${comparedToLastMonth} compared to last month. Keep up the good work!`);
    } else {
      insights.push(`Your balance has decreased by ${comparedToLastMonth} compared to last month. Consider reviewing your expenses.`);
    }
  }
  
  // Generate a few more insights based on the data hash to ensure we always have 
  // the same exact insights for the same data
  const predefinedInsights = [
    "Regular financial reviews help you stay on top of your finances and identify areas for improvement.",
    "Consider setting up automatic transfers to a savings account to build your emergency fund.",
    "A healthy emergency fund should cover 3-6 months of expenses. Make this a priority if you don't have one yet.",
    "Diversifying your investments can help reduce risk and maximize returns over time.",
    "Tracking your expenses by category can help identify areas where you might be overspending.",
    "Consider using budgeting tools to help you stick to your financial goals.",
    "Review your subscriptions and recurring charges regularly to eliminate services you don't use.",
    "Paying off high-interest debt should be a priority to reduce unnecessary expenses.",
    "Consider consulting with a financial advisor to optimize your investment strategy.",
    "Review your insurance policies annually to ensure you have adequate coverage at competitive rates."
  ];
  
  // Select additional insights deterministically based on the data hash
  // Always pick the same ones for the same data
  const insightCount = Math.min(3, predefinedInsights.length);
  const selectedIndices: number[] = [];
  
  for (let i = 0; i < insightCount; i++) {
    // Use the hash to deterministically select indices
    const index = Math.abs((dataHash + i * 1000) % predefinedInsights.length);
    if (!selectedIndices.includes(index)) {
      selectedIndices.push(index);
    }
  }
  
  selectedIndices.sort().forEach(index => {
    insights.push(predefinedInsights[index]);
  });
  
  return insights;
}

// Helper function to generate deterministic spending trends
function generateDeterministicSpendingTrends(transactions: any[]): { name: string; amount: number }[] {
  // Group transactions by date deterministically
  const groupedByDate: Record<string, number> = {};
  
  // Sort transactions first to ensure deterministic processing
  const sortedTransactions = [...transactions].sort((a, b) => a.id.localeCompare(b.id));
  
  sortedTransactions.forEach(transaction => {
    if (transaction.type === 'debit') {
      const date = transaction.date;
      if (!groupedByDate[date]) {
        groupedByDate[date] = 0;
      }
      groupedByDate[date] += transaction.amount;
    }
  });
  
  // Convert to array and sort by date
  const trends = Object.keys(groupedByDate).sort().map(date => ({
    name: date,
    amount: groupedByDate[date]
  }));
  
  // Sort by date deterministically
  trends.sort((a, b) => {
    const datePartsA = a.name.split('/');
    const datePartsB = b.name.split('/');
    
    // Ensure we're comparing dates in a consistent format (DD/MM/YYYY)
    const dateA = new Date(
      parseInt(datePartsA[2] || new Date().getFullYear().toString()), 
      parseInt(datePartsA[1] || '0') - 1, 
      parseInt(datePartsA[0] || '0')
    );
    
    const dateB = new Date(
      parseInt(datePartsB[2] || new Date().getFullYear().toString()), 
      parseInt(datePartsB[1] || '0') - 1, 
      parseInt(datePartsB[0] || '0')
    );
    
    return dateA.getTime() - dateB.getTime();
  });
  
  // Limit to last 10 entries to avoid clutter
  return trends.slice(-10);
}

// Helper function to generate category breakdown
function generateCategoryBreakdown(transactions: any[]): { name: string; value: number }[] {
  // Group transactions by category and sum amounts
  const categories: Record<string, number> = {};
  
  // Sort transactions first to ensure deterministic processing
  const sortedTransactions = [...transactions].sort((a, b) => a.id.localeCompare(b.id));
  
  // Only consider debit transactions for spending analysis
  sortedTransactions
    .filter(transaction => transaction.type === 'debit')
    .forEach(transaction => {
      if (!categories[transaction.category]) {
        categories[transaction.category] = 0;
      }
      categories[transaction.category] += transaction.amount;
    });
  
  // Convert to array and sort by amount (descending)
  const result = Object.entries(categories)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  
  return result;
}

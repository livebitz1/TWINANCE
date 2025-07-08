"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Bot, Loader2 } from "lucide-react";
import { useBankStatement } from "@/contexts/BankStatementContext";
import { Transaction } from "@/services/bankStatementService";

interface AIAssistantProps {
  isBlurred?: boolean;
}

export default function AIAssistant({ isBlurred = false }: AIAssistantProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { content: "Hello! I'm your financial assistant. I can answer questions about your bank statement and provide financial insights.", sender: "ai" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { hasUploadedStatement, financialData } = useBankStatement();

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isBlurred || !hasUploadedStatement) return;

    // Add user message
    setMessages((prev) => [...prev, { content: message, sender: "user" }]);
    
    // Clear input
    const userMessage = message;
    setMessage("");
    setIsLoading(true);
    
    // In a production app, you would send this to Gemini API
    // For now, simulate the AI response based on the query and financial data
    setTimeout(() => {
      const aiResponse = generateAIResponse(userMessage, financialData);
      setMessages((prev) => [
        ...prev,
        { content: aiResponse, sender: "ai" },
      ]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <Card className={cn(
      "bg-background/10 backdrop-blur-sm border-border/30 h-full transition-all shadow-md hover:shadow-lg",
      isBlurred && "hover:opacity-60"
    )}>
      <CardHeader className="pb-2 border-b border-border/20">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium flex items-center">
            <Bot className="h-5 w-5 mr-2 text-primary" />
            AI ASSISTANT
          </CardTitle>
          <div className="text-xs bg-primary/20 text-primary-foreground px-2 py-1 rounded-full">
            Gemini AI
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className={cn("space-y-3 h-[150px] sm:h-[180px] md:h-[220px] overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent", isBlurred && "blur-sm select-none")}>
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`p-2 rounded-lg border border-border/30 ${
                msg.sender === 'ai' ? 'bg-background/20' : 'bg-primary/20'
              } ${msg.sender === 'ai' ? '' : 'ml-auto max-w-[80%]'} ${msg.sender === 'ai' ? 'max-w-[80%]' : ''} shadow-sm`}
            >
              {msg.content}
            </div>
          ))}
          
          {isLoading && (
            <div className="p-2 rounded-lg border border-border/30 bg-background/20 max-w-[80%] shadow-sm flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing your finances...
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <form onSubmit={handleSendMessage} className="flex w-full gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={hasUploadedStatement ? "Ask about your finances..." : "Upload a statement first..."}
            className={cn(
              "flex-1 rounded-lg border border-border/30 bg-background/10 p-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-inner",
              (isBlurred || !hasUploadedStatement) && "cursor-not-allowed opacity-50"
            )}
            disabled={isBlurred || !hasUploadedStatement || isLoading}
          />
          <button 
            type="submit" 
            className={cn(
              "rounded-lg border border-border/30 bg-background/10 p-2 px-4 hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm",
              (isBlurred || !hasUploadedStatement || isLoading) && "cursor-not-allowed opacity-50"
            )}
            disabled={isBlurred || !hasUploadedStatement || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : "ASK"}
          </button>
        </form>
      </CardFooter>
    </Card>
  );
}

// Helper function to generate AI responses based on the user query and financial data
interface FinancialData {
  totalBalance: string;
  income: string;
  expenses: string;
  incomeTransactions: number;
  expenseTransactions: number;
  comparedToLastMonth: string;
  transactions: Transaction[];
}

function generateAIResponse(query: string, financialData: FinancialData): string {
  const lowerQuery = query.toLowerCase().trim();
  
  // Create a deterministic hash based on the query to ensure consistent responses
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  };
  
  // Generate query fingerprint for deterministic responses
  const queryFingerprint = lowerQuery.split(' ').sort().join(' ');
  const queryHash = hashCode(queryFingerprint);
  
  // Log for debugging
  console.log(`Query: "${lowerQuery}", Hash: ${queryHash}`);
  
  // Calculate some basic financial metrics for responses
  const income = parseFloat(financialData.income.replace(/[₹,]/g, '')) || 0;
  const expenses = parseFloat(financialData.expenses.replace(/[₹,]/g, '')) || 0;
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  
  // Transaction analysis - ensure deterministic processing by sorting first
  let largestExpense = { amount: 0, description: "", category: "" };
  const categories: Record<string, number> = {};
  
  // Sort transactions by ID for deterministic processing
  const sortedTransactions = [...financialData.transactions].sort((a, b) => 
    a.id.localeCompare(b.id)
  );
  
  sortedTransactions.forEach((transaction: Transaction) => {
    if (transaction.type === 'debit' && transaction.amount > largestExpense.amount) {
      largestExpense = transaction;
    }
    
    if (transaction.type === 'debit') {
      if (!categories[transaction.category]) {
        categories[transaction.category] = 0;
      }
      categories[transaction.category] += transaction.amount;
    }
  });
  
  // Sort categories by amount - ensure deterministic ordering
  const sortedCategories = Object.entries(categories)
    .sort(([keyA, valueA], [keyB, valueB]) => {
      // First sort by value (descending)
      const diff = (valueB as number) - (valueA as number);
      // If values are equal, sort by category name for determinism
      return diff !== 0 ? diff : keyA.localeCompare(keyB);
    })
    .slice(0, 3);
  
  // Use predefined response patterns based on query intent
  if (lowerQuery.includes("balance") || lowerQuery.includes("total") || lowerQuery.match(/how much( money)? do i have/)) {
    return `Your current balance is ${financialData.totalBalance}. ${
      parseFloat(financialData.comparedToLastMonth) > 0 
        ? `This is ${financialData.comparedToLastMonth} more than last month.` 
        : `This is ${financialData.comparedToLastMonth} less than last month.`
    }`;
  } 
  else if (lowerQuery.includes("income") || lowerQuery.includes("earn") || lowerQuery.includes("salary")) {
    return `Your total income is ${financialData.income} from ${financialData.incomeTransactions} transactions.`;
  }
  else if (lowerQuery.includes("expense") || lowerQuery.includes("spend") || lowerQuery.includes("spending")) {
    return `Your total expenses are ${financialData.expenses} from ${financialData.expenseTransactions} transactions.`;
  }
  else if (lowerQuery.includes("saving") || lowerQuery.includes("save")) {
    return `Your savings rate is ${savingsRate.toFixed(1)}%. ${
      savingsRate >= 20 
        ? "That's good! Financial experts recommend saving at least 20% of your income." 
        : "Financial experts recommend saving at least 20% of your income. Consider reviewing your expenses to increase your savings."
    }`;
  }
  else if (lowerQuery.includes("budget") || lowerQuery.includes("recommend")) {
    return `Based on your income of ${financialData.income}, a recommended budget would be:
    • 50% for needs (₹${(income * 0.5).toLocaleString('en-IN')})
    • 30% for wants (₹${(income * 0.3).toLocaleString('en-IN')})
    • 20% for savings (₹${(income * 0.2).toLocaleString('en-IN')})
    Currently, you're spending about ${((expenses / income) * 100).toFixed(1)}% of your income.`;
  }
  else if (lowerQuery.includes("largest") || lowerQuery.includes("biggest") || lowerQuery.includes("highest")) {
    if (lowerQuery.includes("expense") || lowerQuery.includes("spending") || lowerQuery.includes("transaction")) {
      return `Your largest expense was ₹${largestExpense.amount.toLocaleString('en-IN')} for "${largestExpense.description}" in the ${largestExpense.category} category.`;
    } else if (lowerQuery.includes("category") || lowerQuery.includes("categories")) {
      return `Your top spending categories are: ${
        sortedCategories.map(([category, amount]) => 
          `${category}: ₹${(amount as number).toLocaleString('en-IN')}`
        ).join(', ')
      }.`;
    }
  }
  else if (lowerQuery.includes("improve") || lowerQuery.includes("better") || lowerQuery.includes("advice")) {
    if (savingsRate < 20) {
      return `To improve your finances, consider increasing your savings rate from ${savingsRate.toFixed(1)}% to at least 20%. Focus on reducing expenses in your highest spending categories: ${
        sortedCategories.slice(0, 2).map(([category]) => category).join(' and ')
      }.`;
    } else {
      return `You're doing well with a savings rate of ${savingsRate.toFixed(1)}%! Consider investing some of your savings for long-term growth or building an emergency fund if you don't already have one.`;
    }
  }
  
  // For any query that doesn't match predefined patterns, use a deterministic
  // selection from predefined answers based on the query hash
  const predefinedResponses = [
    `I've analyzed your financial data showing a balance of ${financialData.totalBalance}, with income of ${financialData.income} and expenses of ${financialData.expenses}. How else can I help you understand your finances?`,
    `Based on your statement, you have ${financialData.totalBalance} in your account with ${financialData.incomeTransactions} income transactions and ${financialData.expenseTransactions} expense transactions. Is there anything specific you'd like to know?`,
    `Your financial summary shows ${financialData.totalBalance} balance, ${financialData.income} income, and ${financialData.expenses} expenses. Let me know if you need more specific insights.`,
    `I can see that your account has ${financialData.totalBalance}, with monthly income of ${financialData.income} and expenses of ${financialData.expenses}. What other financial information would you like?`,
    `According to your statement, you have ${financialData.totalBalance} in your account. Your income is ${financialData.income} and your expenses are ${financialData.expenses}. How can I help you further?`
  ];
  
  // Use the query hash to deterministically select a response
  const responseIndex = Math.abs(queryHash % predefinedResponses.length);
  return predefinedResponses[responseIndex];
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Bot, Loader2, Send, RefreshCw, Sparkles, Brain } from "lucide-react";
import { useBankStatement } from "@/contexts/BankStatementContext";
import { geminiNLP } from "@/services/geminiNLPService";
import { aiTraining } from "@/services/aiTrainingService";

interface Message {
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

interface AIAssistantProps {
  isBlurred?: boolean;
}

export default function AIAssistant({ isBlurred = false }: AIAssistantProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { 
      content: "Hi there! I'm your personal financial assistant powered by Gemini AI. I can analyze your bank statement, answer questions about your spending, and provide tailored financial advice. How can I help you today?", 
      sender: "ai", 
      timestamp: new Date() 
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [conversationContext, setConversationContext] = useState<string>("");
  const { hasUploadedStatement, financialData } = useBankStatement();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Build conversation context whenever messages change
  useEffect(() => {
    if (messages.length > 1) {
      const contextString = messages.map(msg => 
        `${msg.sender.toUpperCase()}: ${msg.content}`
      ).join('\n\n');
      setConversationContext(contextString);
    }
  }, [messages]);

  // Generate a financial summary for context
  const getFinancialContext = () => {
    if (!financialData) return "";
    
    // Get account holder's first name for personalization
    const fullName = financialData.accountDetails?.accountHolder || 'User';
    const firstName = fullName.split(' ')[0];
    
    // Get recent transactions for context
    const recentTransactions = financialData.transactions 
      ? financialData.transactions.slice(0, 5).map(t => 
          `${t.date}: ${t.description} (${t.type === 'credit' ? '+' : '-'}₹${t.amount.toLocaleString('en-IN')}) - ${t.category}`
        ).join('\n')
      : 'No recent transactions';
      
    return `
      FINANCIAL DATA CONTEXT:
      User's Name: ${firstName} (full name: ${fullName})
      Account: ${financialData.accountDetails?.accountType || 'bank'} account (${financialData.accountDetails?.accountNumber || 'Unknown'}) at ${financialData.accountDetails?.bankName || 'bank'}
      Statement Period: From ${financialData.statementPeriod?.startDate || 'unknown'} to ${financialData.statementPeriod?.endDate || 'unknown'}
      Current Balance: ₹${parseFloat(financialData.totalBalance).toLocaleString('en-IN')}
      Income: ₹${parseFloat(financialData.income).toLocaleString('en-IN')}
      Expenses: ₹${parseFloat(financialData.expenses).toLocaleString('en-IN')}
      Income Transactions: ${financialData.incomeTransactions}
      Expense Transactions: ${financialData.expenseTransactions}
      Compared to Last Month: ${financialData.comparedToLastMonth}
      Top Categories: ${getTopCategories()}
      
      RECENT TRANSACTIONS:
      ${recentTransactions}
      
      USER CONTEXT:
      - ${firstName} has uploaded a bank statement and is looking for personalized financial advice
      - You should refer to them by their first name occasionally for a personalized experience
      - Provide specific, actionable financial insights based on their actual transaction data
      - Be conversational and friendly, not formal or technical
    `;
  };
  
  // Helper to get top spending categories for context
  const getTopCategories = () => {
    if (!financialData || !financialData.transactions) return "No categories available";
    
    const categories: Record<string, number> = {};
    
    financialData.transactions.forEach((transaction: any) => {
      if (transaction.type === 'debit') {
        if (!categories[transaction.category]) {
          categories[transaction.category] = 0;
        }
        categories[transaction.category] += transaction.amount;
      }
    });
    
    return Object.entries(categories)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([category, amount]) => `${category}: ₹${(amount as number).toLocaleString('en-IN')}`)
      .join(', ');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isBlurred || !hasUploadedStatement) return;

    // Add user message
    const userMsg = { content: message, sender: "user" as const, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    
    // Clear input
    const userMessage = message;
    setMessage("");
    setIsLoading(true);
    
    try {
      // Build the context for the AI to have comprehensive financial information
      const financialContext = getFinancialContext();
      
      // Include recent conversation history for context (last 6 messages)
      const recentMessages = messages.slice(-6);
      const conversationHistory = recentMessages.map(msg => 
        `${msg.sender.toUpperCase()}: ${msg.content}`
      ).join('\n\n');
      
      // The full context combines financial data and conversation history
      const fullContext = `
        ${financialContext}
        
        RECENT CONVERSATION:
        ${conversationHistory}
        
        USER: ${userMessage}
        
        As a friendly, conversational AI financial assistant, respond to the user in a natural, helpful way.
        
        RESPONSE GUIDELINES:
        1. Be warm, friendly, and personable - like a knowledgeable friend who's good with finances
        2. Use natural, conversational language (contractions, casual phrasing, etc.)
        3. Provide specific insights based on their actual financial data
        4. Be concise but informative - aim for clarity over formality
        5. Use their name and personal details from their account when relevant
        6. Express encouragement and positivity when appropriate
        7. If you don't know something specific, be honest about it
        8. End with a conversational hook or follow-up question when appropriate
        
        Your personality: Friendly, helpful, knowledgeable but not stuffy, supportive, and genuinely interested in helping improve the user's financial situation.
      `;
      
      // Get AI response from Gemini NLP
      const aiResponse = await geminiNLP.generateResponse(userMessage, fullContext);
      
      // Add AI response to messages
      setMessages((prev) => [
        ...prev,
        { content: aiResponse, sender: "ai", timestamp: new Date() },
      ]);
    } catch (error) {
      console.error("Error getting response from AI:", error);
      setMessages((prev) => [
        ...prev,
        { 
          content: "I'm sorry, I encountered an error processing your request. Please try again.", 
          sender: "ai", 
          timestamp: new Date() 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to train the AI on financial data
  const handleTrainAI = async () => {
    if (!financialData) return;
    
    setIsTraining(true);
    
    try {
      // Use the AI training service for comprehensive training
      const trainingResult = await aiTraining.trainAI(financialData);
      
      // Add training confirmation message
      setMessages((prev) => [
        ...prev,
        { 
          content: "I've thoroughly analyzed your financial data and now have a much better understanding of your unique financial situation. I can provide highly personalized advice based on your specific spending patterns, transaction history, and financial goals. How can I help you today?", 
          sender: "ai", 
          timestamp: new Date() 
        },
      ]);
    } catch (error) {
      console.error("Error training AI:", error);
      setMessages((prev) => [
        ...prev,
        { 
          content: "I encountered an issue while analyzing your financial data. Let's continue with our conversation.", 
          sender: "ai", 
          timestamp: new Date() 
        },
      ]);
    } finally {
      setIsTraining(false);
    }
  };
  
  // Helper to get transaction patterns for AI training
  const getTransactionPatterns = () => {
    if (!financialData || !financialData.transactions) return "No transaction data available";
    
    // Group transactions by day of week
    const dayOfWeekSpending: Record<string, number> = {
      "Monday": 0, "Tuesday": 0, "Wednesday": 0, "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0
    };
    
    // Group transactions by week of month
    const weekOfMonthSpending: Record<string, number> = {
      "Week 1": 0, "Week 2": 0, "Week 3": 0, "Week 4": 0, "Week 5": 0
    };
    
    financialData.transactions.forEach((transaction: any) => {
      if (transaction.type === 'debit' && transaction.date) {
        // Parse the date (DD/MM/YYYY format)
        const [day, month, year] = transaction.date.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        
        // Get day of week
        const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
        dayOfWeekSpending[dayOfWeek] += transaction.amount;
        
        // Calculate week of month (1-5)
        const weekOfMonth = Math.ceil(day / 7);
        const weekKey = `Week ${weekOfMonth}`;
        if (weekOfMonthSpending[weekKey] !== undefined) {
          weekOfMonthSpending[weekKey] += transaction.amount;
        }
      }
    });
    
    return `
      Day of Week Spending:
      ${Object.entries(dayOfWeekSpending)
        .map(([day, amount]) => `- ${day}: ₹${amount.toLocaleString('en-IN')}`)
        .join('\n')}
      
      Week of Month Spending:
      ${Object.entries(weekOfMonthSpending)
        .map(([week, amount]) => `- ${week}: ₹${amount.toLocaleString('en-IN')}`)
        .join('\n')}
    `;
  };
  
  // Helper to get spending habits for AI training
  const getSpendingHabits = () => {
    if (!financialData || !financialData.transactions) return "No spending data available";
    
    // Analyze recurring transactions
    const merchants: Record<string, {count: number, total: number, dates: string[]}> = {};
    
    // Track category spending
    const categories: Record<string, number> = {};
    
    // Track potential recurring expenses
    financialData.transactions.forEach((transaction: any) => {
      if (transaction.type === 'debit') {
        // Track category spending
        if (!categories[transaction.category]) {
          categories[transaction.category] = 0;
        }
        categories[transaction.category] += transaction.amount;
        
        // Track merchant spending
        if (transaction.merchant) {
          if (!merchants[transaction.merchant]) {
            merchants[transaction.merchant] = { count: 0, total: 0, dates: [] };
          }
          merchants[transaction.merchant].count += 1;
          merchants[transaction.merchant].total += transaction.amount;
          merchants[transaction.merchant].dates.push(transaction.date);
        }
      }
    });
    
    // Find recurring merchants (appearing more than once)
    const recurringMerchants = Object.entries(merchants)
      .filter(([, data]) => data.count > 1)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5);
    
    // Calculate category percentages
    const totalExpenses = Object.values(categories).reduce((sum, amount) => sum + amount, 0);
    const categoryPercentages = Object.entries(categories).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
    
    return `
      Category Breakdown:
      ${categoryPercentages.map(({ category, amount, percentage }) => 
        `- ${category}: ₹${amount.toLocaleString('en-IN')} (${percentage.toFixed(1)}%)`
      ).join('\n')}
      
      Recurring Merchants:
      ${recurringMerchants.length > 0 
        ? recurringMerchants.map(([merchant, data]) => 
            `- ${merchant}: ${data.count} transactions, ₹${data.total.toLocaleString('en-IN')} total`
          ).join('\n')
        : "No recurring merchants identified"
      }
      
      Potential Subscriptions/Bills:
      ${recurringMerchants.length > 0
        ? recurringMerchants
            .filter(([, data]) => data.count >= 1 && /bill|subscription|emi|payment/i.test(data.dates.join(' ')))
            .map(([merchant, data]) => `- ${merchant}: ₹${(data.total / data.count).toLocaleString('en-IN')} average per transaction`)
            .join('\n') || "None detected"
        : "None detected"
      }
    `;
  };

  return (
    <Card className={cn(
      "bg-background/10 backdrop-blur-sm border-primary/20 h-full transition-all shadow-md hover:shadow-lg flex flex-col",
      "relative overflow-hidden",
      isBlurred && "hover:opacity-60"
    )}>
      {/* Subtle animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-30 pointer-events-none z-0"></div>
      
      <CardHeader className="pb-2 border-b border-border/20 bg-primary/5 relative z-10">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium flex items-center">
            <Bot className="h-5 w-5 mr-2 text-primary" />
            Your AI Financial Assistant
          </CardTitle>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleTrainAI}
              disabled={isBlurred || !hasUploadedStatement || isTraining}
              className={cn(
                "text-xs bg-primary/10 hover:bg-primary/20 text-primary-foreground p-1 rounded-full transition-colors flex items-center",
                (isBlurred || !hasUploadedStatement || isTraining) && "opacity-50 cursor-not-allowed"
              )}
              title="Train AI on your financial data for more personalized advice"
            >
              {isTraining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
            </button>
            <div className="text-xs bg-primary/20 text-primary-foreground px-2 py-1 rounded-full flex items-center">
              <Sparkles className="h-3 w-3 mr-1" />
              Gemini AI
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-grow overflow-hidden relative z-10">
        <div className={cn(
          "space-y-3 h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent", 
          isBlurred && "blur-sm select-none"
        )}>
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border ${
                msg.sender === 'ai' 
                  ? 'border-primary/20 bg-primary/5' 
                  : 'border-border/30 bg-background/20'
              } ${
                msg.sender === 'ai' 
                  ? 'mr-8' 
                  : 'ml-8'
              } shadow-sm animate-in fade-in-50 duration-300`}
            >
              <div className="flex items-start">
                {msg.sender === 'ai' && (
                  <Bot className="h-5 w-5 mr-2 mt-1 text-primary flex-shrink-0" />
                )}
                <div className="text-sm">
                  {msg.content.split('\n').map((text, i) => (
                    <React.Fragment key={i}>
                      {text}
                      {i < msg.content.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="text-xs opacity-50 mt-1 text-right">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 mr-8 shadow-sm flex items-center animate-pulse">
              <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
              <span className="text-sm">Analyzing your finances...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </CardContent>

      <CardFooter className="pt-0 relative z-10">
        <form onSubmit={handleSendMessage} className="flex w-full gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={hasUploadedStatement ? "Ask me anything about your finances..." : "Upload a statement first..."}
            className={cn(
              "flex-1 rounded-lg border border-primary/20 bg-background/10 p-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-inner",
              (isBlurred || !hasUploadedStatement) && "cursor-not-allowed opacity-50"
            )}
            disabled={isBlurred || !hasUploadedStatement || isLoading}
          />
          <button 
            type="submit" 
            className={cn(
              "rounded-lg border border-primary/20 bg-primary/20 p-2 px-4 hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm flex items-center justify-center",
              (isBlurred || !hasUploadedStatement || isLoading) && "cursor-not-allowed opacity-50"
            )}
            disabled={isBlurred || !hasUploadedStatement || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </CardFooter>
    </Card>
  );
}

// Legacy code is removed as we now use the Gemini NLP service directly

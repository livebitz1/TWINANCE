"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Bot, Loader2, Send, Sparkles, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { useBankStatement } from "@/contexts/BankStatementContext";
import { AIFinancialChatService, ChatMessage, QueryType } from "@/services/aiChatService";
import ReactMarkdown from "react-markdown";

interface AIAssistantProps {
  isBlurred?: boolean;
}

// Suggested questions for quick access
const SUGGESTED_QUESTIONS = [
  { icon: TrendingUp, text: "How much did I spend last month?", category: "monthly" },
  { icon: Calendar, text: "What did I buy yesterday?", category: "daily" },
  { icon: DollarSign, text: "Show my food expenses", category: "category" },
  { icon: Sparkles, text: "Give me savings tips", category: "savings" },
];

export default function AIAssistant({ isBlurred = false }: AIAssistantProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "👋 Hello! I'm your AI financial assistant with full access to your bank statement. Ask me anything about your spending, savings, or specific transactions!",
      timestamp: new Date()
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { hasUploadedStatement, financialData } = useBankStatement();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || message;
    if (!textToSend.trim() || isBlurred || !hasUploadedStatement) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMessage]);

    // Clear input and hide suggestions
    setMessage("");
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      // Build context from financial data
      const context = {
        transactions: financialData.transactions || [],
        totalBalance: financialData.totalBalance || "₹0",
        income: financialData.income || "₹0",
        expenses: financialData.expenses || "₹0",
        statementPeriod: financialData.statementPeriod
      };

      // Process query with AI service
      const aiResponse = await AIFinancialChatService.processQuery(
        textToSend,
        context,
        messages
      );

      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error('[AI Assistant] Error:', error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try asking your question differently.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setMessage(question);
    handleSendMessage(question);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  return (
    <Card className={cn(
      // overflow-hidden is the hard backstop: the inner flex-1/min-h-0/overflow-y-auto
      // chain below should already keep the message list inside the card, but
      // without this, anything that chain doesn't catch renders straight past the
      // card's border into whatever comes next in the page instead of being
      // clipped or scrolled.
      "bg-background/10 backdrop-blur-sm border-border/30 h-full overflow-hidden transition-all shadow-md hover:shadow-lg flex flex-col",
      isBlurred && "hover:opacity-60"
    )}>
      <CardHeader className="pb-2 border-b border-border/20 flex-shrink-0">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium flex items-center">
            <Bot className="h-5 w-5 mr-2 text-primary" />
            AI FINANCIAL ASSISTANT
          </CardTitle>
          <div className="text-xs bg-primary/20 text-primary-foreground px-2 py-1 rounded-full flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Gemini AI
          </div>
        </div>
        {hasUploadedStatement && (
          <div className="text-xs text-muted-foreground mt-1">
            {financialData.transactions?.length || 0} transactions analyzed
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Messages */}
        {/* min-h-0 overrides the flex default of min-height:auto, which sizes a
            flex child to its content and silently defeats overflow-y-auto - the
            box would keep growing with every reply instead of scrolling. */}
        <div className={cn(
          "flex-1 min-h-0 space-y-3 overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent",
          isBlurred && "blur-sm select-none"
        )}>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "p-3 rounded-lg border border-border/30 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === 'assistant'
                  ? 'bg-background/20 max-w-[85%]'
                  : 'bg-primary/20 ml-auto max-w-[85%]'
              )}
            >
              <div className="text-sm prose prose-invert max-w-none">
                {msg.role === 'assistant' ? (
                  <ReactMarkdown
                    components={{
                      h2: ({ node, ...props }) => <h2 className="text-sm font-bold mt-2 mb-1 uppercase tracking-wider opacity-80" {...props} />,
                      p: ({ node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                      li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
                      strong: ({ node, ...props }) => <strong className="text-primary font-bold" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
              {msg.metadata?.queryType && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                  <span className="bg-primary/10 px-2 py-0.5 rounded">
                    {msg.metadata.queryType.replace('_', ' ')}
                  </span>
                  {msg.metadata.transactionsShown && msg.metadata.transactionsShown > 0 && (
                    <span>{msg.metadata.transactionsShown} transactions</span>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="p-3 rounded-lg border border-border/30 bg-background/20 max-w-[85%] shadow-sm flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing your finances...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {showSuggestions && hasUploadedStatement && messages.length <= 1 && (
          <div className="mb-3 space-y-2">
            <div className="text-xs text-muted-foreground mb-2">Try asking:</div>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedQuestion(q.text)}
                  className="text-xs p-2 rounded-lg border border-border/30 bg-background/5 hover:bg-primary/10 transition-colors text-left flex items-start gap-2"
                  disabled={isBlurred || isLoading}
                >
                  <q.icon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{q.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
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
              "rounded-lg border border-border/30 bg-primary/10 p-2 px-4 hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm flex items-center gap-2",
              (isBlurred || !hasUploadedStatement || isLoading || !message.trim()) && "cursor-not-allowed opacity-50"
            )}
            disabled={isBlurred || !hasUploadedStatement || isLoading || !message.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </form>
      </CardFooter>
    </Card>
  );
}

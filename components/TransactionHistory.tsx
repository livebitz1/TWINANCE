"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Transaction } from "@/services/bankStatementService";
import { Search, Calendar, MoreVertical } from "lucide-react";

interface TransactionHistoryProps {
  transactions: Transaction[];
  isBlurred?: boolean;
}

export default function TransactionHistory({ transactions, isBlurred = false }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");

  const filteredTransactions = transactions
    .filter(transaction => 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(transaction => filter === "all" || transaction.type === filter);

  // Category color mapping
  const getCategoryColor = (category: string): string => {
    const colorMap: Record<string, string> = {
      "Income": "bg-green-500",
      "Food & Dining": "bg-orange-500",
      "Transportation": "bg-blue-500",
      "Shopping": "bg-purple-500",
      "Bills & Utilities": "bg-red-500",
      "Healthcare": "bg-cyan-500",
      "Other": "bg-gray-500"
    };
    
    return colorMap[category] || "bg-gray-500";
  };

  return (
    <Card className={cn(
      "bg-background/10 backdrop-blur-sm border-border/30 w-full mt-6 transition-all",
      isBlurred && "hover:opacity-60"
    )}>
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="text-lg font-medium">Transaction History</CardTitle>
          
          {!isBlurred && (
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-2 text-sm rounded-lg border border-border/30 bg-background/10 w-full focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setFilter("all")} 
                  className={`px-3 py-2 text-sm rounded-lg border border-border/30 ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-background/10"}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilter("credit")} 
                  className={`px-3 py-2 text-sm rounded-lg border border-border/30 ${filter === "credit" ? "bg-primary text-primary-foreground" : "bg-background/10"}`}
                >
                  Credits
                </button>
                <button 
                  onClick={() => setFilter("debit")} 
                  className={`px-3 py-2 text-sm rounded-lg border border-border/30 ${filter === "debit" ? "bg-primary text-primary-foreground" : "bg-background/10"}`}
                >
                  Debits
                </button>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={cn("", isBlurred && "blur-sm select-none")}>
        {transactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No transaction data available.</p>
            <p className="text-sm text-muted-foreground mt-2">Upload a bank statement to view your transactions.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4 max-h-[400px] overflow-y-auto pr-2">
            {filteredTransactions.map((transaction) => (
              <div 
                key={transaction.id}
                className="flex justify-between items-center p-3 rounded-lg border border-border/30 bg-background/5 hover:bg-background/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getCategoryColor(transaction.category)}`} />
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{transaction.date}</span>
                      <span className="text-xs text-muted-foreground bg-background/20 px-2 py-0.5 rounded-full">
                        {transaction.category}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`font-medium ${transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                    {transaction.type === 'credit' ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString('en-IN')}
                  </p>
                  <button className="p-1 rounded-full hover:bg-background/20">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

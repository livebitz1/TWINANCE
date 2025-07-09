"use client";

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Transaction } from "@/services/bankStatementService";
import { explainTransaction } from "@/services/transactionExplanationService";
import {
  Search, 
  Calendar, 
  Filter, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight,
  Info,
  Bot,
  Loader2,
  CreditCard,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface TransactionHistoryProps {
  transactions: Transaction[];
  isBlurred?: boolean;
}

type SortField = 'date' | 'amount' | 'description';
type SortDirection = 'asc' | 'desc';

export default function TransactionHistory({ transactions, isBlurred = false }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string>("");
  const [showExplanationDialog, setShowExplanationDialog] = useState(false);
  
  const itemsPerPage = 10;

  // Extract unique categories and months from transactions
  const uniqueCategories = useMemo(() => {
    const categories = [...new Set(transactions.map(t => t.category))];
    return categories.sort();
  }, [transactions]);

  const uniqueMonths = useMemo(() => {
    const months = [...new Set(transactions.map(t => {
      const [, month, year] = t.date.split('/');
      return `${month}/${year}`;
    }))];
    return months.sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(Number);
      const [monthB, yearB] = b.split('/').map(Number);
      if (yearA !== yearB) return yearB - yearA;
      return monthB - monthA;
    });
  }, [transactions]);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    const filtered = transactions.filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (transaction.merchant && transaction.merchant.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (transaction.referenceNumber && transaction.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = typeFilter === "all" || transaction.type === typeFilter;
      const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter;
      
      let matchesMonth = true;
      if (monthFilter !== "all") {
        const [, month, year] = transaction.date.split('/');
        const transactionMonth = `${month}/${year}`;
        matchesMonth = transactionMonth === monthFilter;
      }
      
      return matchesSearch && matchesType && matchesCategory && matchesMonth;
    });

    // Sort transactions
    filtered.sort((a, b) => {
      let aValue: string | number | Date, bValue: string | number | Date;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.date.split('/').reverse().join('-'));
          bValue = new Date(b.date.split('/').reverse().join('-'));
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [transactions, searchTerm, typeFilter, categoryFilter, monthFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredAndSortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExplainTransaction = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsExplaining(true);
    setShowExplanationDialog(true);
    setExplanation("");
    
    try {
      const explanation = await explainTransaction(transaction);
      setExplanation(explanation);
    } catch {
      setExplanation("Sorry, I couldn't analyze this transaction at the moment. Please try again later.");
    } finally {
      setIsExplaining(false);
    }
  };

  const getCategoryColor = (category: string): string => {
    const colorMap: Record<string, string> = {
      "Income": "bg-green-500",
      "Food & Dining": "bg-orange-500",
      "Transportation": "bg-blue-500",
      "Shopping": "bg-purple-500",
      "Bills & Utilities": "bg-red-500",
      "Healthcare": "bg-cyan-500",
      "UPI": "bg-indigo-500",
      "Transfer": "bg-yellow-500",
      "Other": "bg-gray-500"
    };
    
    return colorMap[category] || "bg-gray-500";
  };

  const getTransactionIcon = (type: string) => {
    return type === 'credit' ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const formatAmount = (amount: number, type: string) => {
    const formatted = `₹${Math.abs(amount).toLocaleString('en-IN')}`;
    return type === 'credit' ? `+${formatted}` : `-${formatted}`;
  };

  const resetFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setMonthFilter("all");
    setSortField('date');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  return (
    <>
      <Card className={cn(
        "bg-background/10 backdrop-blur-sm border-border/30 w-full mt-6 transition-all",
        isBlurred && "hover:opacity-60"
      )}>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl font-semibold">Transaction History</CardTitle>
              <span className="text-sm text-muted-foreground bg-primary/20 px-3 py-1 rounded-full">
                {filteredAndSortedTransactions.length} transactions
              </span>
            </div>
            
            {!isBlurred && (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="text-sm"
              >
                <Filter className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            )}
          </div>
          
          {/* Search and Filters */}
          {!isBlurred && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search transactions, merchants, UPI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm rounded-lg border border-border/30 bg-background/10 w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={(value: "all" | "credit" | "debit") => setTypeFilter(value)}>
                <SelectTrigger className="bg-background/10 border-border/30">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credit Only</SelectItem>
                  <SelectItem value="debit">Debit Only</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-background/10 border-border/30">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="bg-background/10 border-border/30">
                  <SelectValue placeholder="Filter by month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {uniqueMonths.map(month => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        
        <CardContent className={cn("", isBlurred && "blur-sm select-none")}>
          {transactions.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">No transaction data available.</p>
              <p className="text-sm text-muted-foreground mt-2">Upload a bank statement to view your transactions.</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 bg-background/5 rounded-lg border border-border/20 mb-4">
                <div className="col-span-1 flex items-center">
                  <span className="text-sm font-medium text-muted-foreground">Type</span>
                </div>
                <div className="col-span-2 flex items-center cursor-pointer" onClick={() => handleSort('date')}>
                  <span className="text-sm font-medium text-muted-foreground">Date</span>
                  <ArrowUpDown className="h-3 w-3 ml-1" />
                </div>
                <div className="col-span-3 flex items-center cursor-pointer" onClick={() => handleSort('description')}>
                  <span className="text-sm font-medium text-muted-foreground">Description</span>
                  <ArrowUpDown className="h-3 w-3 ml-1" />
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm font-medium text-muted-foreground">Category</span>
                </div>
                <div className="col-span-2 flex items-center cursor-pointer" onClick={() => handleSort('amount')}>
                  <span className="text-sm font-medium text-muted-foreground">Amount</span>
                  <ArrowUpDown className="h-3 w-3 ml-1" />
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm font-medium text-muted-foreground">Actions</span>
                </div>
              </div>
              
              {/* Transaction Rows */}
              <div className="space-y-3">
                {paginatedTransactions.map((transaction) => (
                  <div 
                    key={transaction.id}
                    className={cn(
                      "grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-lg border transition-all hover:shadow-md",
                      transaction.type === 'credit' 
                        ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10" 
                        : "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
                    )}
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden col-span-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          <span className="text-sm font-medium">{transaction.type === 'credit' ? 'Credit' : 'Debit'}</span>
                        </div>
                        <span className={cn(
                          "text-lg font-semibold",
                          transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'
                        )}>
                          {formatAmount(transaction.amount, transaction.type)}
                        </span>
                      </div>
                      
                      <div>
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{transaction.date}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getCategoryColor(transaction.category)}`} />
                          <span className="text-xs text-muted-foreground">{transaction.category}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExplainTransaction(transaction)}
                          className="h-8 w-8 p-0"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Desktop Layout */}
                    <div className="hidden md:contents">
                      <div className="col-span-1 flex items-center">
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          <span className="text-sm font-medium capitalize">{transaction.type}</span>
                        </div>
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{transaction.date}</span>
                        </div>
                      </div>
                      
                      <div className="col-span-3 flex items-center">
                        <div>
                          <p className="text-sm font-medium">{transaction.description}</p>
                          {transaction.referenceNumber && (
                            <p className="text-xs text-muted-foreground">Ref: {transaction.referenceNumber}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getCategoryColor(transaction.category)}`} />
                          <span className="text-sm">{transaction.category}</span>
                        </div>
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        <span className={cn(
                          "text-sm font-semibold",
                          transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'
                        )}>
                          {formatAmount(transaction.amount, transaction.type)}
                        </span>
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExplainTransaction(transaction)}
                          className="text-xs"
                        >
                          <Info className="h-4 w-4 mr-1" />
                          Explain
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedTransactions.length)} of {filteredAndSortedTransactions.length} transactions
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Transaction Explanation Dialog */}
      <Dialog open={showExplanationDialog} onOpenChange={setShowExplanationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Transaction Analysis
            </DialogTitle>
            <DialogDescription>
              Get insights about your transaction from our AI assistant
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              {/* Transaction Details */}
              <div className="bg-background/50 p-4 rounded-lg border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{selectedTransaction.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className={cn(
                      "font-semibold",
                      selectedTransaction.type === 'credit' ? 'text-green-500' : 'text-red-500'
                    )}>
                      {formatAmount(selectedTransaction.amount, selectedTransaction.type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{selectedTransaction.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getCategoryColor(selectedTransaction.category)}`} />
                      <span className="font-medium">{selectedTransaction.category}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* AI Explanation */}
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI Insights
                </h4>
                {isExplaining ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing transaction...
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{explanation}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

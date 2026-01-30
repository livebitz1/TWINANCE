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
import { Transaction, normalizeTransactionDate } from "@/services/bankStatementService";
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
  TrendingDown,
  X,
  FileText
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
      const dateNorm = normalizeTransactionDate(t.date);
      const parts = dateNorm.split('/');
      if (parts.length < 3) return '';
      const [, month, year] = parts;
      return `${month}/${year}`;
    }))].filter(Boolean);
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
        const dateNorm = normalizeTransactionDate(transaction.date);
        const parts = dateNorm.split('/');
        if (parts.length >= 3) {
          const transactionMonth = `${parts[1]}/${parts[2]}`;
          matchesMonth = transactionMonth === monthFilter;
        }
      }
      
      return matchesSearch && matchesType && matchesCategory && matchesMonth;
    });

    // Sort transactions
    filtered.sort((a, b) => {
      let aValue: string | number | Date, bValue: string | number | Date;
      
      switch (sortField) {
        case 'date': {
          const normA = normalizeTransactionDate(a.date);
          const normB = normalizeTransactionDate(b.date);
          const partsA = normA.split('/');
          const partsB = normB.split('/');
          aValue = partsA.length >= 3 ? new Date(Number(partsA[2]), Number(partsA[1]) - 1, Number(partsA[0])) : new Date(0);
          bValue = partsB.length >= 3 ? new Date(Number(partsB[2]), Number(partsB[1]) - 1, Number(partsB[0])) : new Date(0);
          break;
        }
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

  const hasActiveFilters = searchTerm !== "" || typeFilter !== "all" || categoryFilter !== "all" || monthFilter !== "all";

  return (
    <>
      <Card className={cn(
        "bg-background/10 backdrop-blur-sm border-border/30 w-full mt-6 transition-all shadow-lg",
        isBlurred && "hover:opacity-60"
      )}>
        <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Transaction History
              </CardTitle>
              <span className="text-xs sm:text-sm text-muted-foreground bg-primary/20 px-2 sm:px-3 py-1 rounded-full font-medium">
                {filteredAndSortedTransactions.length} {filteredAndSortedTransactions.length === 1 ? 'transaction' : 'transactions'}
              </span>
            </div>
            
            {!isBlurred && hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
          
          {/* Search and Filters */}
          {!isBlurred && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm rounded-lg border border-border/30 bg-background/10 w-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/60"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={(value: "all" | "credit" | "debit") => setTypeFilter(value)}>
                <SelectTrigger className="bg-background/10 border-border/30 h-10 text-sm">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credit Only</SelectItem>
                  <SelectItem value="debit">Debit Only</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-background/10 border-border/30 h-10 text-sm">
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
                <SelectTrigger className="bg-background/10 border-border/30 h-10 text-sm">
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
        
        <CardContent className={cn("px-4 sm:px-6 pb-4 sm:pb-6", isBlurred && "blur-sm select-none")}>
          {transactions.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <CreditCard className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg text-muted-foreground font-medium">No transaction data available.</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Upload a bank statement to view your transactions.</p>
            </div>
          ) : filteredAndSortedTransactions.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <Search className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg text-muted-foreground font-medium">No transactions found.</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Try adjusting your filters or search terms.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="mt-4"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            </div>
          ) : (
            <>
              {/* Table Header - Desktop Only */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-3 xl:gap-4 p-3 xl:p-4 bg-background/5 rounded-lg border border-border/20 mb-3 xl:mb-4">
                <div className="col-span-1 flex items-center">
                  <span className="text-xs xl:text-sm font-medium text-muted-foreground">Type</span>
                </div>
                <div 
                  className="col-span-2 flex items-center cursor-pointer hover:text-primary transition-colors" 
                  onClick={() => handleSort('date')}
                >
                  <span className="text-xs xl:text-sm font-medium text-muted-foreground">Date</span>
                  <ArrowUpDown className={cn(
                    "h-3 w-3 ml-1 transition-all",
                    sortField === 'date' && "text-primary"
                  )} />
                </div>
                <div 
                  className="col-span-3 flex items-center cursor-pointer hover:text-primary transition-colors" 
                  onClick={() => handleSort('description')}
                >
                  <span className="text-xs xl:text-sm font-medium text-muted-foreground">Description</span>
                  <ArrowUpDown className={cn(
                    "h-3 w-3 ml-1 transition-all",
                    sortField === 'description' && "text-primary"
                  )} />
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-xs xl:text-sm font-medium text-muted-foreground">Category</span>
                </div>
                <div 
                  className="col-span-2 flex items-center cursor-pointer hover:text-primary transition-colors" 
                  onClick={() => handleSort('amount')}
                >
                  <span className="text-xs xl:text-sm font-medium text-muted-foreground">Amount</span>
                  <ArrowUpDown className={cn(
                    "h-3 w-3 ml-1 transition-all",
                    sortField === 'amount' && "text-primary"
                  )} />
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-xs xl:text-sm font-medium text-muted-foreground">Actions</span>
                </div>
              </div>
              
              {/* Transaction Rows */}
              <div className="space-y-2 sm:space-y-3">
                {paginatedTransactions.map((transaction) => (
                  <div 
                    key={transaction.id}
                    className={cn(
                      "grid grid-cols-1 lg:grid-cols-12 gap-3 xl:gap-4 p-3 sm:p-4 rounded-lg border transition-all hover:shadow-md",
                      transaction.type === 'credit' 
                        ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10 hover:border-green-500/30" 
                        : "bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30"
                    )}
                  >
                    {/* Mobile & Tablet Layout */}
                    <div className="lg:hidden col-span-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {getTransactionIcon(transaction.type)}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{transaction.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground">{normalizeTransactionDate(transaction.date)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={cn(
                            "text-base sm:text-lg font-semibold whitespace-nowrap",
                            transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'
                          )}>
                            {formatAmount(transaction.amount, transaction.type)}
                          </span>
                        </div>
                      </div>
                      
                      {transaction.referenceNumber && (
                        <div className="text-xs text-muted-foreground bg-background/30 px-2 py-1 rounded inline-block">
                          Ref: {transaction.referenceNumber}
                        </div>
                      )}
                      
                      {transaction.flagged && (
                        <div className="flex items-start gap-2 p-2 bg-yellow-100/50 border border-yellow-300/50 rounded-md">
                          <Info className="h-3 w-3 text-yellow-700 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-yellow-900">{transaction.flagReason}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getCategoryColor(transaction.category)}`} />
                          <span className="text-xs text-muted-foreground">{transaction.category}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExplainTransaction(transaction)}
                          className="h-8 text-xs"
                        >
                          <Info className="h-3 w-3 mr-1" />
                          Explain
                        </Button>
                      </div>
                    </div>
                    
                    {/* Desktop Layout */}
                    <div className="hidden lg:contents">
                      <div className="col-span-1 flex items-center">
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                        </div>
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs xl:text-sm">{normalizeTransactionDate(transaction.date)}</span>
                        </div>
                      </div>
                      
                      <div className="col-span-3 flex items-center min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs xl:text-sm font-medium truncate" title={transaction.description}>
                            {transaction.description}
                          </p>
                          {transaction.referenceNumber && (
                            <p className="text-xs text-muted-foreground truncate" title={`Ref: ${transaction.referenceNumber}`}>
                              Ref: {transaction.referenceNumber}
                            </p>
                          )}
                          {transaction.flagged && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-900 rounded text-xs border border-yellow-300" title={transaction.flagReason}>
                                <Info className="h-3 w-3 text-yellow-700" />
                                <span className="truncate max-w-[150px]">{transaction.flagReason}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getCategoryColor(transaction.category)}`} />
                          <span className="text-xs xl:text-sm truncate" title={transaction.category}>{transaction.category}</span>
                        </div>
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        <span className={cn(
                          "text-xs xl:text-sm font-semibold",
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
                          className="text-xs h-8"
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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 border-t border-border/30">
                  <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                    Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedTransactions.length)}</span> of <span className="font-medium">{filteredAndSortedTransactions.length}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-8 sm:h-9"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Previous</span>
                    </Button>
                    
                    <div className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-background/20 rounded-md border border-border/30">
                      <span className="text-xs sm:text-sm font-medium">{currentPage}</span>
                      <span className="text-xs sm:text-sm text-muted-foreground">/</span>
                      <span className="text-xs sm:text-sm text-muted-foreground">{totalPages}</span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-8 sm:h-9"
                    >
                      <span className="hidden sm:inline mr-1">Next</span>
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
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bot className="h-5 w-5 text-primary flex-shrink-0" />
              AI Transaction Analysis
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Get insights about your transaction from our AI assistant
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 mt-2">
              {/* Transaction Details */}
              <div className="bg-background/50 p-3 sm:p-4 rounded-lg border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Description</p>
                    <p className="font-medium text-sm sm:text-base truncate" title={selectedTransaction.description}>
                      {selectedTransaction.description}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Amount</p>
                    <p className={cn(
                      "font-semibold text-sm sm:text-base",
                      selectedTransaction.type === 'credit' ? 'text-green-500' : 'text-red-500'
                    )}>
                      {formatAmount(selectedTransaction.amount, selectedTransaction.type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Date</p>
                    <p className="font-medium text-sm sm:text-base">{selectedTransaction.date}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Category</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getCategoryColor(selectedTransaction.category)}`} />
                      <span className="font-medium text-sm sm:text-base truncate">{selectedTransaction.category}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* AI Explanation */}
              <div className="bg-primary/5 p-3 sm:p-4 rounded-lg border border-primary/20">
                <h4 className="font-medium mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Bot className="h-4 w-4 flex-shrink-0" />
                  AI Insights
                </h4>
                {isExplaining ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                    <span className="text-sm">Analyzing transaction...</span>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm leading-relaxed text-foreground/90">{explanation}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
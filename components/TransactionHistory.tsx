"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Transaction } from "@/services/bankStatementService";
import { 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  ArrowDownUp, 
  ChevronDown, 
  ChevronsUpDown,
  FileText,
  SlidersHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { parse, isValid } from "date-fns";

interface TransactionHistoryProps {
  transactions: Transaction[];
  isBlurred?: boolean;
}

export default function TransactionHistory({ transactions, isBlurred = false }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "category" | "balance">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateRange, setDateRange] = useState<"all" | "week" | "month" | "custom">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [merchantFilter, setMerchantFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [view, setView] = useState<"card" | "table">("table");

  // Extract unique categories and merchants from transactions
  const categories = useMemo(() => {
    if (!transactions || transactions.length === 0) return ["all"];
    const uniqueCategories = ["all", ...new Set(transactions.map(t => t.category))];
    return uniqueCategories;
  }, [transactions]);

  const merchants = useMemo(() => {
    if (!transactions || transactions.length === 0) return ["all"];
    const allMerchants = transactions.map(t => t.merchant).filter(Boolean) as string[];
    const uniqueMerchants = ["all", ...new Set(allMerchants)];
    return uniqueMerchants;
  }, [transactions]);

  // Parse date from DD/MM/YYYY format
  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      const date = parse(dateStr, "dd/MM/yyyy", new Date());
      return isValid(date) ? date : null;
    } catch (e) {
      return null;
    }
  };

  // Apply filtering, sorting, and search
  const filteredTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    return transactions
      .filter(transaction => {
        // Text search
        const matchesSearch = searchTerm === "" || 
          transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (transaction.merchant && transaction.merchant.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (transaction.upiId && transaction.upiId.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (transaction.id && transaction.id.toLowerCase().includes(searchTerm.toLowerCase()));

        // Transaction type filter
        const matchesTypeFilter = filter === "all" || transaction.type === filter;
        
        // Category filter
        const matchesCategoryFilter = categoryFilter === "all" || transaction.category === categoryFilter;
        
        // Merchant filter
        const matchesMerchantFilter = merchantFilter === "all" || transaction.merchant === merchantFilter;

        // Date range filter
        const dateMatches = (() => {
          if (dateRange === "all") return true;
          
          const transactionDate = parseDate(transaction.date);
          if (!transactionDate) return false;
          
          const now = new Date();
          
          switch (dateRange) {
            case "week": {
              const weekAgo = new Date(now.setDate(now.getDate() - 7));
              return transactionDate >= weekAgo;
            }
            case "month": {
              const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
              return transactionDate >= monthAgo;
            }
            case "custom": {
              if (!startDate || !endDate) return true;
              const start = parseDate(startDate);
              const end = parseDate(endDate);
              if (!start || !end) return true;
              return transactionDate >= start && transactionDate <= end;
            }
            default:
              return true;
          }
        })();

        return matchesSearch && matchesTypeFilter && matchesCategoryFilter && matchesMerchantFilter && dateMatches;
      })
      .sort((a, b) => {
        if (sortBy === "date") {
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);
          if (dateA && dateB) {
            return sortOrder === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
          }
          return 0;
        } else if (sortBy === "amount") {
          return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
        } else if (sortBy === "category") {
          return sortOrder === "asc" 
            ? a.category.localeCompare(b.category) 
            : b.category.localeCompare(a.category);
        } else if (sortBy === "balance") {
          const balanceA = a.runningBalance || 0;
          const balanceB = b.runningBalance || 0;
          return sortOrder === "asc" ? balanceA - balanceB : balanceB - balanceA;
        }
        return 0;
      });
  }, [transactions, searchTerm, filter, sortBy, sortOrder, dateRange, categoryFilter, merchantFilter, startDate, endDate]);

  // Toggle sort order when clicking on the same sort field
  const handleSort = (field: "date" | "amount" | "category" | "balance") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Category color mapping
  const getCategoryColor = (category: string): string => {
    const colorMap: Record<string, string> = {
      "Income": "bg-green-500",
      "Food & Dining": "bg-orange-500",
      "Transportation": "bg-blue-500",
      "Shopping": "bg-purple-500",
      "Bills & Utilities": "bg-red-500",
      "Healthcare": "bg-cyan-500",
      "Financial": "bg-indigo-500",
      "Education": "bg-amber-500",
      "Entertainment": "bg-pink-500",
      "Transfer": "bg-blue-500",
      "Services": "bg-yellow-500",
      "Other": "bg-gray-500"
    };
    
    return colorMap[category] || "bg-gray-500";
  };

  // Export transactions to CSV
  const exportToCSV = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) return;
    
    const headers = ["Date", "Description", "Ref No.", "Type", "Amount (₹)", "Category", "Closing Balance"];
    const csvRows = [
      headers.join(','), // Header row
      ...filteredTransactions.map(t => [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`, // Escape quotes in CSV
        t.id,
        t.type,
        t.amount,
        t.category,
        t.runningBalance || ''
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create a link and trigger download
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transaction_history_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className={cn(
      "bg-background/10 backdrop-blur-sm border-border/30 w-full mt-6 transition-all",
      isBlurred && "hover:opacity-60"
    )}>
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-lg font-medium">Transaction History</CardTitle>
            <CardDescription>
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
            </CardDescription>
          </div>
          
          {!isBlurred && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView(view === "card" ? "table" : "card")}
                className="flex items-center gap-1"
                title={`Switch to ${view === "card" ? "table" : "card"} view`}
              >
                {view === "card" ? (
                  <>
                    <FileText className="h-4 w-4" />
                    Table
                  </>
                ) : (
                  <>
                    <SlidersHorizontal className="h-4 w-4" />
                    Cards
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="flex items-center gap-1"
                title="Export transactions to CSV"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      {!isBlurred && (
        <div className="px-4 pb-2">
          <div className="flex flex-col md:flex-row gap-3 w-full">
            <div className="relative flex-grow">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-4 py-2 text-sm rounded-lg border border-border/30 bg-background/10 w-full focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={filter} onValueChange={(value) => setFilter(value as "all" | "credit" | "debit")}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credits</SelectItem>
                  <SelectItem value="debit">Debits</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {merchants.length > 1 && (
                <Select value={merchantFilter} onValueChange={setMerchantFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Merchant" />
                  </SelectTrigger>
                  <SelectContent>
                    {merchants.map(merchant => (
                      <SelectItem key={merchant} value={merchant}>
                        {merchant === "all" ? "All Merchants" : merchant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {dateRange === "all" && "All Dates"}
                      {dateRange === "week" && "Last 7 Days"}
                      {dateRange === "month" && "Last 30 Days"}
                      {dateRange === "custom" && "Custom Range"}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Date Range</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDateRange("all")}>All Dates</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateRange("week")}>Last 7 Days</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateRange("month")}>Last 30 Days</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateRange("custom")}>
                    Custom Range
                  </DropdownMenuItem>
                  
                  {dateRange === "custom" && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="p-2 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <label htmlFor="start-date" className="text-xs">Start:</label>
                          <input
                            id="start-date"
                            type="text"
                            placeholder="DD/MM/YYYY"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-border/30 bg-background/10 w-full"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label htmlFor="end-date" className="text-xs">End:</label>
                          <input
                            id="end-date"
                            type="text"
                            placeholder="DD/MM/YYYY"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-border/30 bg-background/10 w-full"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <ArrowDownUp className="h-4 w-4" />
                    <span>Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</span>
                    {sortOrder === "asc" ? (
                      <ChevronsUpDown className="h-4 w-4 ml-1" />
                    ) : (
                      <ChevronsUpDown className="h-4 w-4 ml-1 rotate-180" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleSort("date")}>
                    Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("amount")}>
                    Amount {sortBy === "amount" && (sortOrder === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("category")}>
                    Category {sortBy === "category" && (sortOrder === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("balance")}>
                    Balance {sortBy === "balance" && (sortOrder === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}
      
      <CardContent className={cn("", isBlurred && "blur-sm select-none")}>
        {transactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No transaction data available.</p>
            <p className="text-sm text-muted-foreground mt-2">Upload a bank statement to view your transactions.</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No transactions match your search criteria.</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or search term.</p>
          </div>
        ) : view === "table" ? (
          // Table View
          <div className="rounded-md border border-border/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-background/20">
                  <tr className="border-b border-border/30">
                    <th 
                      className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-background/30"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {sortBy === "date" && (
                          <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                    <th className="px-4 py-3 text-left font-medium">Ref No.</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th 
                      className="px-4 py-3 text-right font-medium cursor-pointer hover:bg-background/30"
                      onClick={() => handleSort("amount")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Amount (₹)
                        {sortBy === "amount" && (
                          <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-background/30"
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center gap-1">
                        Category
                        {sortBy === "category" && (
                          <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right font-medium cursor-pointer hover:bg-background/30"
                      onClick={() => handleSort("balance")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Closing Balance
                        {sortBy === "balance" && (
                          <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr 
                      key={transaction.id}
                      className="border-b border-border/30 hover:bg-background/10"
                    >
                      <td className="px-4 py-3">{transaction.date}</td>
                      <td className="px-4 py-3">
                        <div>
                          {transaction.description}
                          {transaction.merchant && (
                            <span className="ml-2 text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                              {transaction.merchant}
                            </span>
                          )}
                        </div>
                        {transaction.upiId && (
                          <div className="text-xs text-muted-foreground mt-1">
                            UPI: {transaction.upiId}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{transaction.id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                          transaction.type === 'credit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${
                        transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {transaction.type === 'credit' ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${getCategoryColor(transaction.category)}`}></span>
                          {transaction.category}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {transaction.runningBalance !== undefined ? (
                          <span className={transaction.runningBalance >= 0 ? 'text-green-500' : 'text-red-500'}>
                            ₹{transaction.runningBalance.toLocaleString('en-IN')}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Card View
          <div className="space-y-4 mt-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {filteredTransactions.map((transaction) => (
              <div 
                key={transaction.id}
                className="flex flex-col p-3 rounded-lg border border-border/30 bg-background/5 hover:bg-background/10 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getCategoryColor(transaction.category)}`} />
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{transaction.date}</span>
                        <span className="text-xs text-muted-foreground bg-background/20 px-2 py-0.5 rounded-full">
                          {transaction.category}
                        </span>
                        {transaction.merchant && (
                          <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                            {transaction.merchant}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`font-medium ${transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                      {transaction.type === 'credit' ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString('en-IN')}
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded-full hover:bg-background/20">
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setCategoryFilter(transaction.category)}>
                          Filter by Category
                        </DropdownMenuItem>
                        {transaction.merchant && (
                          <DropdownMenuItem onClick={() => setMerchantFilter(transaction.merchant || "")}>
                            Filter by Merchant
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {/* Additional transaction details row */}
                <div className="mt-2 pt-2 border-t border-border/10 flex justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    {transaction.upiId && (
                      <span className="bg-background/20 px-2 py-1 rounded-md">
                        UPI: {transaction.upiId}
                      </span>
                    )}
                    <span className="bg-background/20 px-2 py-1 rounded-md">
                      Ref: {transaction.id}
                    </span>
                  </div>
                  {transaction.runningBalance !== undefined && (
                    <span className={`bg-background/20 px-2 py-1 rounded-md ${transaction.runningBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      Balance: ₹{transaction.runningBalance.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

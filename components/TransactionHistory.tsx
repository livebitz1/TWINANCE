"use client";

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Bot,
  Loader2,
  FileText,
  CreditCard,
  X,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";

interface TransactionHistoryProps {
  transactions: Transaction[];
  isBlurred?: boolean;
}

type SortField = 'date' | 'amount' | 'description' | 'category';
type SortDirection = 'asc' | 'desc';

export default function TransactionHistory({ transactions, isBlurred = false }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Explanation State
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string>("");
  const [showExplanationDialog, setShowExplanationDialog] = useState(false);

  const itemsPerPage = 8;

  // --- Derived State: Unique Categories ---
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.category || "Other"))).sort();
  }, [transactions]);

  // --- Filter Logic ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        t.description.toLowerCase().includes(searchLower) ||
        t.category?.toLowerCase().includes(searchLower) ||
        t.merchant?.toLowerCase().includes(searchLower);

      // Filters
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, searchTerm, typeFilter, categoryFilter]);

  // --- Sorting Logic ---
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let valA: any = a[sortField as keyof Transaction];
      let valB: any = b[sortField as keyof Transaction];

      if (sortField === 'date') {
        const dateA = normalizeTransactionDate(a.date).split('/').reverse().join('');
        const dateB = normalizeTransactionDate(b.date).split('/').reverse().join('');
        return sortDirection === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
      }

      if (sortField === 'amount') {
        return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }

      // Default string comparison
      valA = (valA || "").toString().toLowerCase();
      valB = (valB || "").toString().toLowerCase();

      return sortDirection === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }, [filteredTransactions, sortField, sortDirection]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const currentData = sortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- Handlers ---
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to newest/highest first
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setCurrentPage(1);
    setSortField('date');
    setSortDirection('desc');
  };

  const handleExplain = async (t: Transaction) => {
    setSelectedTransaction(t);
    setShowExplanationDialog(true);
    setIsExplaining(true);
    setExplanation("");
    try {
      const result = await explainTransaction(t);
      setExplanation(result);
    } catch {
      setExplanation("Unable to analyze this transaction right now.");
    } finally {
      setIsExplaining(false);
    }
  };

  // --- Helpers ---
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'Food & Dining': 'bg-orange-100 text-orange-700 border-orange-200',
      'Shopping': 'bg-purple-100 text-purple-700 border-purple-200',
      'Transportation': 'bg-blue-100 text-blue-700 border-blue-200',
      'Bills & Utilities': 'bg-red-100 text-red-700 border-red-200',
      'Income': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Investment': 'bg-teal-100 text-teal-700 border-teal-200',
      'Transfer': 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[cat] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <Card className={cn(
      "w-full bg-background/50 backdrop-blur-md border-border/40 shadow-sm transition-all",
      isBlurred && "blur-sm opacity-60 pointer-events-none"
    )}>
      <CardHeader className="px-6 py-4 border-b border-border/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Transaction History
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Showing {filteredTransactions.length} transactions
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search merchant, desc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-4 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="credit">Income</SelectItem>
                <SelectItem value="debit">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchTerm || typeFilter !== 'all' || categoryFilter !== 'all') && (
              <Button variant="ghost" size="icon" onClick={clearFilters} className="h-9 w-9" title="Clear Filters">
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[130px] cursor-pointer hover:text-primary" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">
                    Date
                    {sortField === 'date' && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </TableHead>
                <TableHead className="w-[40%] cursor-pointer hover:text-primary" onClick={() => handleSort('description')}>
                  <div className="flex items-center gap-1">
                    Description
                    {sortField === 'description' && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </TableHead>
                <TableHead className="w-[150px] cursor-pointer hover:text-primary" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">
                    Category
                    {sortField === 'category' && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => handleSort('amount')}>
                  <div className="flex items-center justify-end gap-1">
                    Amount
                    {sortField === 'amount' && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </TableHead>
                <TableHead className="w-[80px] text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    {transactions.length === 0 ? "No transactions found." : "No results match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                currentData.map((t) => (
                  <TableRow key={t.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-xs text-muted-foreground">
                      {normalizeTransactionDate(t.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm truncate max-w-[280px]" title={t.description}>
                          {t.description}
                        </span>
                        {t.merchant && (
                          <span className="text-xs text-muted-foreground">{t.merchant}</span>
                        )}
                        {t.flagged && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-0.5">
                            <Info className="w-3 h-3" />
                            {t.flagReason}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-normal whitespace-nowrap", getCategoryColor(t.category))}>
                        {t.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={cn(
                        "flex items-center justify-end gap-1 font-semibold",
                        t.type === 'credit' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {t.type === 'credit' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        {formatCurrency(t.amount)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleExplain(t)}
                      >
                        <Bot className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/10 bg-muted/10">
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={showExplanationDialog} onOpenChange={setShowExplanationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Insight</DialogTitle>
            <DialogDescription>
              AI Analysis for <span className="font-semibold text-foreground">{selectedTransaction?.merchant || 'this transaction'}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 p-4 bg-muted/40 rounded-lg border border-border/50 text-sm leading-relaxed">
            {isExplaining ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing spending pattern...
              </div>
            ) : (
              explanation
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
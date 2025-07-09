"use client";

import React, { useState, useEffect } from "react";
import { Search, Calendar, TrendingUp, TrendingDown, Info, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ParsedTransaction, ParsedStatementData, explainTransaction } from "@/services/transactionParser";

interface EnhancedDashboardProps {
  statementData: ParsedStatementData;
}

export default function EnhancedDashboard({ statementData }: EnhancedDashboardProps) {
  const [transactions] = useState<ParsedTransaction[]>(statementData.transactions);
  const [filteredTransactions, setFilteredTransactions] = useState<ParsedTransaction[]>(statementData.transactions);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  // Get unique categories for filter
  const categories = ["All", ...Array.from(new Set(transactions.map(t => t.category)))];

  // Filter transactions based on search and filters
  useEffect(() => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.ref_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.merchant?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "All") {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Type filter
    if (selectedType !== "All") {
      filtered = filtered.filter(t => t.type === selectedType);
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(t => {
        const txnDate = new Date(t.date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return txnDate >= startDate && txnDate <= endDate;
      });
    }

    setFilteredTransactions(filtered);
  }, [searchTerm, selectedCategory, selectedType, dateRange, transactions]);

  // Handle transaction explanation
  const handleExplainTransaction = async (transaction: ParsedTransaction) => {
    if (explanations[transaction.id]) {
      setExpandedTransaction(expandedTransaction === transaction.id ? null : transaction.id);
      return;
    }

    try {
      const explanation = await explainTransaction(transaction);
      setExplanations(prev => ({
        ...prev,
        [transaction.id]: explanation
      }));
      setExpandedTransaction(transaction.id);
    } catch (error) {
      console.error("Failed to explain transaction:", error);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Export transactions
  const exportTransactions = () => {
    const csvContent = [
      ['Date', 'Description', 'Reference', 'Type', 'Amount', 'Balance', 'Category'],
      ...filteredTransactions.map(t => [
        t.date,
        t.description,
        t.ref_no,
        t.type,
        t.amount.toString(),
        t.balance.toString(),
        t.category
      ])
    ].map(row => row.join(',')).join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Financial Dashboard</h1>
          <p className="text-slate-300">
            {statementData.accountDetails.bankName} • {statementData.accountDetails.accountNumber} • 
            {statementData.statementPeriod.startDate} to {statementData.statementPeriod.endDate}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Closing Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(statementData.summary.closingBalance)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-200" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Credits</p>
                <p className="text-2xl font-bold">{formatCurrency(statementData.summary.totalCredits)}</p>
                <p className="text-sm text-blue-200">{statementData.summary.creditCount} transactions</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-200" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-r from-red-500 to-red-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100">Total Debits</p>
                <p className="text-2xl font-bold">{formatCurrency(statementData.summary.totalDebits)}</p>
                <p className="text-sm text-red-200">{statementData.summary.debitCount} transactions</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-200" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Net Change</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(statementData.summary.totalCredits - statementData.summary.totalDebits)}
                </p>
                <p className="text-sm text-purple-200">{transactions.length} total transactions</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-200" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6 bg-slate-800 border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 rounded-md bg-slate-700 border-slate-600 text-white"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full p-2 rounded-md bg-slate-700 border-slate-600 text-white"
              >
                <option value="All">All</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">Date From</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">Date To</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <p className="text-slate-300">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </p>
            <Button onClick={exportTransactions} variant="outline" size="sm" className="text-slate-300">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </Card>

        {/* Transactions Table */}
        <Card className="bg-slate-800 border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-4 text-slate-300">Date</th>
                  <th className="text-left p-4 text-slate-300">Description</th>
                  <th className="text-left p-4 text-slate-300">Category</th>
                  <th className="text-right p-4 text-slate-300">Amount</th>
                  <th className="text-right p-4 text-slate-300">Balance</th>
                  <th className="text-center p-4 text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <React.Fragment key={transaction.id}>
                    <tr className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="p-4 text-slate-200">{formatDate(transaction.date)}</td>
                      <td className="p-4">
                        <div className="text-slate-200">{transaction.description}</div>
                        <div className="text-sm text-slate-400">Ref: {transaction.ref_no}</div>
                        {transaction.merchant && (
                          <div className="text-sm text-slate-400">Merchant: {transaction.merchant}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={transaction.type === 'credit' ? 'default' : 'destructive'}>
                          {transaction.category}
                        </Badge>
                      </td>
                      <td className={`p-4 text-right font-semibold ${
                        transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                      </td>
                      <td className="p-4 text-right text-slate-200">
                        {formatCurrency(transaction.balance)}
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExplainTransaction(transaction)}
                          className="text-slate-400 hover:text-slate-200"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                    {expandedTransaction === transaction.id && explanations[transaction.id] && (
                      <tr>
                        <td colSpan={6} className="p-4 bg-slate-700/20">
                          <div className="text-slate-300 text-sm border-l-4 border-blue-500 pl-4">
                            <strong>AI Explanation:</strong> {explanations[transaction.id]}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

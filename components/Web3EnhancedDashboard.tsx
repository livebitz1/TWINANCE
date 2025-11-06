"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar } from "lucide-react";
import { WalletData } from "@/types/web3";

interface Web3EnhancedDashboardProps {
  walletAddress: string;
  walletData: WalletData;
}

export default function Web3EnhancedDashboard({ walletAddress, walletData }: Web3EnhancedDashboardProps) {
  const transactions = walletData.transactions || [];
  const nfts = walletData.nfts || [];
  const tokens = walletData.tokens || [];

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Web3 Dashboard</h1>
          <p className="text-slate-300">Wallet: {walletAddress}</p>
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Balance</p>
                <p className="text-2xl font-bold">{walletData.balance} SOL</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-200" />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Tokens</p>
                <p className="text-2xl font-bold">{tokens.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-200" />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">NFTs</p>
                <p className="text-2xl font-bold">{nfts.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-200" />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100">Transactions</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-indigo-200" />
            </div>
          </Card>
        </div>
        {/* Transactions Table */}
        <Card className="bg-slate-800 border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-4 text-slate-300">Date</th>
                  <th className="text-left p-4 text-slate-300">Signature</th>
                  <th className="text-left p-4 text-slate-300">Type</th>
                  <th className="text-right p-4 text-slate-300">Amount (SOL)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-slate-400 text-center">No transactions found.</td></tr>
                ) : (
                  transactions.slice(0, 20).map((tx: { date?: string; signature?: string; type?: string; amount?: number }, idx: number) => (
                    <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="p-4 text-slate-200">{formatDate(tx.date || "")}</td>
                      <td className="p-4 text-slate-200">{tx.signature}</td>
                      <td className="p-4">
                        <Badge variant={tx.type === 'credit' ? 'default' : 'destructive'}>
                          {tx.type || '-'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right font-semibold text-blue-400">{tx.amount || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

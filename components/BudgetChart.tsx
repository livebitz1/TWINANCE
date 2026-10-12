"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  ComposedChart
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import WeekSelector from "./WeekSelector";
import { useBankStatement } from "@/contexts/BankStatementContext";
import { Transaction, normalizeTransactionDate, buildBudgetDataFromTransactions } from "@/services/bankStatementService";
import { CalendarDays, TrendingUp, TrendingDown, BarChart3, Calendar, ArrowUpDown, PieChart } from "lucide-react";

type ChartView = 'week' | 'month' | 'balance' | 'comparison' | 'category';
type ChartType = 'bar' | 'line' | 'area';

interface BudgetChartProps {
  isBlurred?: boolean;
}

interface MonthlyData {
  month: string;
  year: number;
  totalExpenses: number;
  totalIncome: number;
  transactionCount: number;
  averageDaily: number;
  // Dynamic weekly data
  weeklyData: { week: number; startDate: string; endDate: string; amount: number; transactions: number; income: number }[];
  dailyData: { date: string; amount: number; income: number; day: number; fullDate: string }[];
}

// Helper to get week number and range
function getWeekDetails(date: Date) {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const day = date.getDate();
  // Simple week calculation: 1-7 = week 1, 8-14 = week 2, etc.
  const weekNum = Math.ceil(day / 7);
  return weekNum > 4 ? 4 : weekNum; // Cap at 4 weeks for simplicity in view, or we can allow 5
}

// Helper function to get month name
function getMonthName(monthNum: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNum - 1] || 'Unknown';
}

// Robust parsing of transactions
function getMonthlyInsights(transactions: Transaction[]): MonthlyData[] {
  const monthlyMap: Record<string, MonthlyData> = {};

  transactions.forEach(transaction => {
    try {
      // Normalize date first
      const dateStr = normalizeTransactionDate(transaction.date);
      const parts = dateStr.split('/').map(Number);
      if (parts.length < 3) return;

      const [day, month, year] = parts;
      const monthKey = `${month}-${year}`;
      const txnDate = new Date(year, month - 1, day);

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: getMonthName(month),
          year: year,
          totalExpenses: 0,
          totalIncome: 0,
          transactionCount: 0,
          averageDaily: 0,
          weeklyData: Array(5).fill(0).map((_, i) => ({
            week: i + 1,
            startDate: '', // Can calculate dynamic ranges if needed
            endDate: '',
            amount: 0,
            transactions: 0,
            income: 0
          })),
          dailyData: []
        };
      }

      const monthData = monthlyMap[monthKey];
      monthData.transactionCount++;
      const amount = Math.abs(transaction.amount); // Ensure positive for charts

      if (transaction.type === 'credit') {
        monthData.totalIncome += amount;
      } else {
        monthData.totalExpenses += amount;
      }

      // Weekly Data updates
      // Using simple 4-week bucket for consistent UI, blending 5th week into 4th or showing 5
      // Let's use 5 weeks to be accurate
      const weekNum = Math.ceil(day / 7);
      const targetWeek = weekNum > 5 ? 5 : weekNum;

      if (transaction.type === 'debit') {
        monthData.weeklyData[targetWeek - 1].amount += amount;
      } else {
        monthData.weeklyData[targetWeek - 1].income += amount;
      }
      monthData.weeklyData[targetWeek - 1].transactions++;

      // Daily Data updates
      const existingDay = monthData.dailyData.find(d => d.day === day);
      if (existingDay) {
        if (transaction.type === 'debit') {
          existingDay.amount += amount;
        } else {
          existingDay.income += amount;
        }
      } else {
        monthData.dailyData.push({
          date: `${day}/${month}`,
          fullDate: dateStr,
          amount: transaction.type === 'debit' ? amount : 0,
          income: transaction.type === 'credit' ? amount : 0,
          day: day
        });
      }

    } catch (e) {
      console.warn("Error parsing transaction date:", transaction.date);
    }
  });

  // Post-process: Sort days and calc averages
  Object.values(monthlyMap).forEach(monthData => {
    monthData.dailyData.sort((a, b) => a.day - b.day);
    const daysWithTxn = monthData.dailyData.length || 1;
    monthData.averageDaily = monthData.totalExpenses / 30; // Approx monthly avg

    // Filter out empty weeks if using 5
    monthData.weeklyData = monthData.weeklyData.filter(w => w.amount > 0 || w.income > 0 || w.transactions > 0);
  });

  // Sort months descending (newest first)
  return Object.values(monthlyMap).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    // Month name to number roughly, or simpler: just use key comparison if we had it, 
    // but the object is built randomly.
    // Let's rely on the parsing of Month Name back to number if needed, or better, 
    // since we don't store month Num in the object except implicitly. 
    // Actually we parse month name. Let's add better sorting.
    // Ideally we stored 'monthNum' in MonthlyData. Let's fix that next time.
    // For now, simple string compare might be wrong for months.
    return 0; // The previous logic was also slightly flawed.
  }).sort((a, b) => {
    // Robust Sort
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return (b.year * 12 + months.indexOf(b.month)) - (a.year * 12 + months.indexOf(a.month));
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl">
        <p className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wider">{label}</p>

        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 mb-1 last:mb-0">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-sm font-medium text-gray-200 capitalize">
              {entry.name === 'amount' ? 'Expenses' : entry.name}:
            </span>
            <span className="text-sm font-bold text-white ml-auto">
              ₹{Number(entry.value).toLocaleString('en-IN')}
            </span>
          </div>
        ))}

        {data.transactions !== undefined && (
          <div className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-400">
            {data.transactions} transactions
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function BudgetChart({ isBlurred = false }: BudgetChartProps) {
  const [activeView, setActiveView] = useState<ChartView>('month');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [activeWeek, setActiveWeek] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState<string>('current');
  const [comparisonMonth, setComparisonMonth] = useState<string>('previous');
  const { financialData, hasUploadedStatement } = useBankStatement();

  const monthlyInsights = useMemo(() => {
    if (!hasUploadedStatement || !financialData.transactions) return [];
    return getMonthlyInsights(financialData.transactions);
  }, [financialData.transactions, hasUploadedStatement]);

  const currentMonthData = useMemo(() => {
    if (monthlyInsights.length === 0) return null;
    if (selectedMonth === 'current') return monthlyInsights[0];
    return monthlyInsights.find(m => `${m.month}-${m.year}` === selectedMonth) || monthlyInsights[0];
  }, [monthlyInsights, selectedMonth]);

  const chartData = useMemo(() => {
    if (activeView === "category") {
      if (!hasUploadedStatement || !financialData.transactions?.length) return [];
      const { byCategory } = buildBudgetDataFromTransactions(financialData.transactions);
      return byCategory.map((c) => ({ name: c.name, amount: c.amount, transactions: 0 }));
    }

    if (!currentMonthData) return [];

    switch (activeView) {
      case 'week':
        return currentMonthData.weeklyData.map(week => ({
          name: `Week ${week.week}`,
          amount: week.amount,
          income: week.income,
          transactions: week.transactions
        }));

      case 'month':
        return currentMonthData.dailyData.map(day => ({
          name: day.date,
          amount: day.amount,
          income: day.income,
          fullDate: day.fullDate
        }));

      case 'balance':
        let balance = 0;
        return currentMonthData.dailyData.map(day => {
          balance += (day.income - day.amount);
          return {
            name: day.date,
            amount: balance,
            income: day.income,
            expense: day.amount
          };
        });

      case 'comparison':
        if (monthlyInsights.length < 2) return [];
        const comp = monthlyInsights.find(m => `${m.month}-${m.year}` === comparisonMonth) || monthlyInsights[1];
        // Compare weeks
        return currentMonthData.weeklyData.map((week, idx) => ({
          name: `Week ${week.week}`,
          current: week.amount,
          comparison: comp?.weeklyData[idx]?.amount || 0
        }));

      default:
        return [];
    }
  }, [activeView, currentMonthData, monthlyInsights, comparisonMonth, hasUploadedStatement, financialData]);

  // Calculations for Insight Cards
  const insights = useMemo(() => {
    if (!currentMonthData) return null;
    const net = currentMonthData.totalIncome - currentMonthData.totalExpenses;
    const rate = currentMonthData.totalIncome > 0 ? (net / currentMonthData.totalIncome) * 100 : 0;

    return {
      daily: currentMonthData.averageDaily,
      expense: currentMonthData.totalExpenses,
      income: currentMonthData.totalIncome,
      savings: rate
    };
  }, [currentMonthData]);

  // Render content
  return (
    <Card className={cn(
      // overflow-hidden is the hard backstop: if the header's controls and
      // insight tiles ever need more room than the card's bounded height
      // leaves, this clips the excess instead of letting it render past the
      // card's border into whatever section comes next on the page.
      "bg-background/10 backdrop-blur-sm border-border/30 w-full overflow-hidden transition-all shadow-md hover:shadow-lg h-full flex flex-col",
      isBlurred && "hover:opacity-60"
    )}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Analytics Dashboard
            </CardTitle>

            {/* Chart Type Toggle */}
            <div className="flex bg-background/20 rounded-lg p-1 border border-border/20">
              {(['bar', 'line', 'area'] as ChartType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  disabled={isBlurred}
                  className={cn(
                    "px-3 py-1 text-xs rounded-md capitalize transition-all",
                    chartType === t
                      ? "bg-primary text-primary-foreground shadow-sm font-medium"
                      : "text-muted-foreground hover:bg-white/5"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          {!isBlurred && monthlyInsights.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-background/20 border-border/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Month</SelectItem>
                  {monthlyInsights.map((m, i) => (
                    <SelectItem key={i} value={`${m.month}-${m.year}`}>
                      {m.month} {m.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="h-4 w-px bg-border/30 mx-2" />

              {(['week', 'month', 'balance', 'comparison', 'category'] as ChartView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setActiveView(v)}
                  className={cn(
                    "relative px-4 py-2 text-xs font-medium rounded-full transition-all duration-300 overflow-hidden group",
                    // Glassmorphism Base
                    "backdrop-blur-md border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]",
                    activeView === v
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white hover:border-white/20 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                  )}
                >
                  <span className="relative z-10">{v.charAt(0).toUpperCase() + v.slice(1)}</span>
                  {/* Liquid shine effect on hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
                </button>
              ))}
            </div>
          )}

          {/* Insight Cards */}
          {insights && !isBlurred && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-1">
              {[
                { label: 'Total Income', val: insights.income, color: 'text-emerald-400', icon: TrendingUp },
                { label: 'Total Expenses', val: insights.expense, color: 'text-rose-400', icon: TrendingDown },
                { label: 'Daily Average', val: insights.daily, color: 'text-blue-400', icon: CalendarDays },
                { label: 'Savings Rate', val: insights.savings, suffix: '%', color: 'text-purple-400', icon: PieChart },
              ].map((item, i) => (
                <div key={i} className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-3 flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-white/10 transition-all" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{item.label}</span>
                  <div className="flex items-center gap-2 z-10">
                    <item.icon className={cn("h-4 w-4", item.color)} />
                    <span className="text-lg font-bold text-white">
                      {item.suffix ? item.val.toFixed(1) + '%' : `₹${item.val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-[300px] p-2 pt-4">
        <div className={cn("w-full h-full", isBlurred && "blur-md opacity-50")}>
          {!hasUploadedStatement || chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-3">
              <div className="bg-white/5 p-4 rounded-full">
                <BarChart3 className="h-8 w-8 opacity-40" />
              </div>
              <p className="text-sm">No analytics data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="colorComparison" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.4} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#666"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#666"
                  fontSize={10}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />

                {/* Render Logic based on view */}
                {activeView === 'comparison' ? (
                  <>
                    <Bar dataKey="current" name="Current" fill="url(#colorExpense)" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="comparison" name="Previous" fill="url(#colorComparison)" radius={[4, 4, 0, 0]} barSize={20} />
                  </>
                ) : activeView === 'balance' ? (
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#8b5cf6"
                    fill="url(#colorExpense)"
                    strokeWidth={3}
                  />
                ) : (
                  chartType === 'line' ? (
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#1e1e1e' }}
                      activeDot={{ r: 6, fill: '#60a5fa' }}
                    />
                  ) : chartType === 'area' ? (
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#3b82f6"
                      fill="url(#colorExpense)"
                    />
                  ) : (
                    <Bar
                      dataKey="amount"
                      fill="url(#colorExpense)"
                      radius={[6, 6, 0, 0]}
                      barSize={30}
                    />
                  )
                )}

              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

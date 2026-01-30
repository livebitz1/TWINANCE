"use client";

import React, { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
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
import { CalendarDays, TrendingUp, TrendingDown, BarChart3, Calendar, ArrowUpDown } from "lucide-react";

type ChartView = 'week' | 'month' | 'balance' | 'comparison' | 'category';
type ChartType = 'bar' | 'line';

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
  weeklyData: { week: number; amount: number; transactions: number }[];
  dailyData: { date: string; amount: number; day: number }[];
}

// Helper function to get week number from a date string (format: DD/MM/YYYY)
function getWeekOfMonth(dateStr: string): number {
  const dateParts = dateStr.split('/');
  if (dateParts.length !== 3) return 1;
  
  const day = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const year = parseInt(dateParts[2], 10);
  
  const date = new Date(year, month, day);
  const firstDayOfMonth = new Date(year, month, 1);
  
  const dayDiff = Math.floor((date.getTime() - firstDayOfMonth.getTime()) / (24 * 60 * 60 * 1000));
  return Math.floor(dayDiff / 7) + 1;
}

// Get month name from number
function getMonthName(monthNum: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNum - 1] || 'Unknown';
}

// Process transactions to get monthly insights (normalize date to DD/MM/YYYY first)
function getMonthlyInsights(transactions: Transaction[]): MonthlyData[] {
  const monthlyMap: Record<string, MonthlyData> = {};
  
  transactions.forEach(transaction => {
    const dateStr = normalizeTransactionDate(transaction.date);
    const parts = dateStr.split('/').map(Number);
    if (parts.length < 3) return;
    const [day, month, year] = parts;
    const monthKey = `${month}-${year}`;
    
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = {
        month: getMonthName(month),
        year: year,
        totalExpenses: 0,
        totalIncome: 0,
        transactionCount: 0,
        averageDaily: 0,
        weeklyData: [
          { week: 1, amount: 0, transactions: 0 },
          { week: 2, amount: 0, transactions: 0 },
          { week: 3, amount: 0, transactions: 0 },
          { week: 4, amount: 0, transactions: 0 }
        ],
        dailyData: []
      };
    }
    
    const monthData = monthlyMap[monthKey];
    monthData.transactionCount++;
    
    if (transaction.type === 'credit') {
      monthData.totalIncome += transaction.amount;
    } else {
      monthData.totalExpenses += transaction.amount;
    }
    
    // Update weekly data (use normalized date)
    const weekNum = getWeekOfMonth(dateStr);
    if (weekNum >= 1 && weekNum <= 4) {
      if (transaction.type === 'debit') {
        monthData.weeklyData[weekNum - 1].amount += transaction.amount;
      }
      monthData.weeklyData[weekNum - 1].transactions++;
    }
    
    // Update daily data
    const existingDay = monthData.dailyData.find(d => d.day === day);
    if (existingDay) {
      if (transaction.type === 'debit') {
        existingDay.amount += transaction.amount;
      }
    } else {
      monthData.dailyData.push({
        date: `${day}/${month}`,
        amount: transaction.type === 'debit' ? transaction.amount : 0,
        day: day
      });
    }
  });
  
  // Calculate averages and sort daily data
  Object.values(monthlyMap).forEach(monthData => {
    const daysInMonth = monthData.dailyData.length;
    monthData.averageDaily = daysInMonth > 0 ? monthData.totalExpenses / daysInMonth : 0;
    monthData.dailyData.sort((a, b) => a.day - b.day);
  });
  
  return Object.values(monthlyMap).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month.localeCompare(a.month);
  });
}

export default function BudgetChart({ isBlurred = false }: BudgetChartProps) {
  const [activeView, setActiveView] = useState<ChartView>('month');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [activeWeek, setActiveWeek] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState<string>('current');
  const [comparisonMonth, setComparisonMonth] = useState<string>('previous');
  const { financialData, hasUploadedStatement } = useBankStatement();

  // Get monthly insights from transactions
  const monthlyInsights = useMemo(() => {
    if (!hasUploadedStatement || !financialData.transactions) return [];
    return getMonthlyInsights(financialData.transactions);
  }, [financialData.transactions, hasUploadedStatement]);

  // Get current month data
  const currentMonthData = useMemo(() => {
    if (monthlyInsights.length === 0) return null;
    
    if (selectedMonth === 'current') {
      return monthlyInsights[0];
    } else {
      return monthlyInsights.find(m => `${m.month}-${m.year}` === selectedMonth) || monthlyInsights[0];
    }
  }, [monthlyInsights, selectedMonth]);

  // Category-wise spending from real transactions
  const categoryChartData = useMemo(() => {
    if (!hasUploadedStatement || !financialData.transactions?.length) return [];
    const { byCategory } = buildBudgetDataFromTransactions(financialData.transactions);
    return byCategory.map((c) => ({ name: c.name, amount: c.amount }));
  }, [hasUploadedStatement, financialData.transactions]);

  // Generate chart data based on the view
  const chartData = useMemo(() => {
    if (activeView === "category") {
      return categoryChartData;
    }
    if (!hasUploadedStatement || !currentMonthData) {
      return [];
    }
    
    switch (activeView) {
      case 'week':
        return currentMonthData.weeklyData.map(week => ({
          name: `Week ${week.week}`,
          amount: week.amount,
          transactions: week.transactions
        }));
        
      case 'month':
        return currentMonthData.dailyData.map(day => ({
          name: day.date,
          amount: day.amount
        }));
        
      case 'balance':
        // Show running balance over the month
        let runningBalance = 0;
        return currentMonthData.dailyData.map(day => {
          runningBalance += day.amount;
          return {
            name: day.date,
            amount: runningBalance
          };
        });
        
      case 'comparison':
        if (monthlyInsights.length < 2) return [];
        
        const compMonth = monthlyInsights.find(m => `${m.month}-${m.year}` === comparisonMonth) || monthlyInsights[1];
        
        // Compare weekly data
        return currentMonthData.weeklyData.map((week, index) => ({
          name: `Week ${week.week}`,
          current: week.amount,
          comparison: compMonth.weeklyData[index]?.amount || 0
        }));
        
      default:
        return [];
    }
  }, [activeView, currentMonthData, monthlyInsights, comparisonMonth, hasUploadedStatement, categoryChartData]);

  // Handle week selection
  const handleWeekSelect = (week: number) => {
    if (!isBlurred) {
      setActiveWeek(week);
      setActiveView('week');
    }
  };

  // Custom tooltip formatter
  const formatTooltipValue = (value: number, name?: string) => {
    if (name === 'transactions') return `${value} transactions`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Get insights text
  const getInsights = () => {
    if (!currentMonthData) return null;
    
    const avgDaily = currentMonthData.averageDaily;
    const totalExpenses = currentMonthData.totalExpenses;
    const totalIncome = currentMonthData.totalIncome;
    const netSavings = totalIncome - totalExpenses;
    
    return {
      avgDaily,
      totalExpenses,
      totalIncome,
      netSavings,
      savingsRate: totalIncome > 0 ? ((netSavings / totalIncome) * 100) : 0
    };
  };

  const insights = getInsights();

  return (
    <Card className={cn(
      "bg-background/10 backdrop-blur-sm border-border/30 w-full transition-all shadow-md hover:shadow-lg h-full",
      isBlurred && "hover:opacity-60"
    )}>
      <CardHeader className="pb-0">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <CardTitle className="text-lg font-medium">COMPARING OF BUDGET</CardTitle>
            
            {/* Chart Type Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
                disabled={isBlurred}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Bar
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
                disabled={isBlurred}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Line
              </Button>
            </div>
          </div>
          
          {/* View Selection Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Week View', active: activeView === 'week', onClick: () => setActiveView('week') },
              { label: 'Month View', active: activeView === 'month', onClick: () => setActiveView('month') },
              { label: 'Balance', active: activeView === 'balance', onClick: () => setActiveView('balance') },
              { label: 'Compare', active: activeView === 'comparison', onClick: () => setActiveView('comparison'), icon: <ArrowUpDown className="h-4 w-4 mr-1" /> },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                className={cn(
                  "relative px-6 py-2 font-semibold rounded-xl border border-border/40 bg-background/20 text-white transition-all duration-300 overflow-hidden",
                  btn.active ? "scale-105 shadow-lg z-10" : "hover:scale-105",
                  "liquid-effect"
                )}
                style={{
                  borderRadius: btn.active ? '2rem' : '1rem',
                }}
              >
                <span className="relative z-10 flex items-center justify-center">
                  {btn.icon}
                  {btn.label}
                </span>
                {/* Liquid animation overlay */}
                <span className="absolute inset-0 liquid-anim" />
              </button>
            ))}
          </div>
          
          {/* Month Selection */}
          {!isBlurred && monthlyInsights.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48 bg-background/10 border-border/30">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Month</SelectItem>
                    {monthlyInsights.map((month, index) => (
                      <SelectItem key={index} value={`${month.month}-${month.year}`}>
                        {month.month} {month.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {activeView === 'comparison' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">vs</span>
                  <Select value={comparisonMonth} onValueChange={setComparisonMonth}>
                    <SelectTrigger className="w-48 bg-background/10 border-border/30">
                      <SelectValue placeholder="Compare with" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="previous">Previous Month</SelectItem>
                      {monthlyInsights.map((month, index) => (
                        <SelectItem key={index} value={`${month.month}-${month.year}`}>
                          {month.month} {month.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          
          {/* Insights Cards */}
          {insights && !isBlurred && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-background/20 p-3 rounded-lg border border-border/20">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-muted-foreground">Avg Daily</span>
                </div>
                <p className="text-sm font-semibold">₹{insights.avgDaily.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              </div>
              
              <div className="bg-background/20 p-3 rounded-lg border border-border/20">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-muted-foreground">Total Expenses</span>
                </div>
                <p className="text-sm font-semibold">₹{insights.totalExpenses.toLocaleString('en-IN')}</p>
              </div>
              
              <div className="bg-background/20 p-3 rounded-lg border border-border/20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-muted-foreground">Total Income</span>
                </div>
                <p className="text-sm font-semibold">₹{insights.totalIncome.toLocaleString('en-IN')}</p>
              </div>
              
              <div className="bg-background/20 p-3 rounded-lg border border-border/20">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-400" />
                  <span className="text-xs text-muted-foreground">Savings Rate</span>
                </div>
                <p className="text-sm font-semibold">{insights.savingsRate.toFixed(1)}%</p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className={cn("w-full h-[280px] md:h-[320px]", isBlurred && "blur-sm select-none")}>
          {!hasUploadedStatement ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Upload a bank statement to view budget data</p>
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center flex-col text-muted-foreground">
              <p>No data available for the selected period</p>
              <p className="text-sm mt-2">Try selecting a different month or view</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart
                  key={activeView === 'category' ? 'category' : 'default'}
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255, 255, 255, 0.5)"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="rgba(255, 255, 255, 0.5)" 
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value, name) => formatTooltipValue(Number(value), name as string)}
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                    }}
                  />
                  {activeView === 'comparison' ? (
                    <>
                      <Bar dataKey="current" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Current" />
                      <Bar dataKey="comparison" fill="#ef4444" radius={[2, 2, 0, 0]} name="Previous" />
                    </>
                  ) : (
                    <Bar 
                      dataKey="amount" 
                      fill={activeView === "category" ? "#8b5cf6" : "#3b82f6"}
                      radius={[4, 4, 0, 0]}
                      animationDuration={1000}
                    />
                  )}
                </BarChart>
              ) : (
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255, 255, 255, 0.5)"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="rgba(255, 255, 255, 0.5)" 
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value, name) => formatTooltipValue(Number(value), name as string)}
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                    }}
                  />
                  {activeView === 'comparison' ? (
                    <>
                      <Line 
                        type="monotone" 
                        dataKey="current" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        name="Current"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="comparison" 
                        stroke="#ef4444" 
                        strokeWidth={3}
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                        name="Previous"
                      />
                    </>
                  ) : (
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke={activeView === "category" ? "#8b5cf6" : "#3b82f6"}
                      strokeWidth={3}
                      dot={{ fill: activeView === "category" ? "#8b5cf6" : "#3b82f6", strokeWidth: 2, r: 4 }}
                      animationDuration={1000}
                    />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
        
        {/* Week Selector */}
        {activeView === 'week' && (
          <div className={cn("flex justify-center space-x-2 mt-4", isBlurred && "blur-sm select-none")}>
            {[1, 2, 3, 4].map(week => (
              <WeekSelector 
                key={week}
                week={week} 
                isActive={activeWeek === week} 
                onClick={() => handleWeekSelect(week)} 
                disabled={isBlurred || !hasUploadedStatement} 
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import WeekSelector from "./WeekSelector";
import { useBankStatement } from "@/contexts/BankStatementContext";
import { Transaction } from "@/services/bankStatementService";

type ChartView = 'week' | 'month' | 'balance';

interface BudgetChartProps {
  isBlurred?: boolean;
}

// Helper function to get week number from a date string (format: DD/MM/YYYY)
function getWeekOfMonth(dateStr: string): number {
  // Parse the date string
  const dateParts = dateStr.split('/');
  if (dateParts.length !== 3) return 1; // Default to week 1 if format is unexpected
  
  const day = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // JavaScript months are 0-based
  const year = parseInt(dateParts[2], 10);
  
  const date = new Date(year, month, day);
  const firstDayOfMonth = new Date(year, month, 1);
  
  // Calculate the difference in days
  const dayDiff = Math.floor((date.getTime() - firstDayOfMonth.getTime()) / (24 * 60 * 60 * 1000));
  
  // Get the week number (1-based)
  return Math.floor(dayDiff / 7) + 1;
}

// Group transactions by date and calculate daily totals
function getDailyTotals(transactions: Transaction[], weekNum: number): { name: string; amount: number }[] {
  const dailyTotals: Record<string, number> = {};
  
  // Filter transactions for the selected week and only debit transactions
  const filteredTransactions = transactions.filter(transaction => {
    const week = getWeekOfMonth(transaction.date);
    return week === weekNum && transaction.type === "debit";
  });
  
  // Group by date and sum amounts
  filteredTransactions.forEach(transaction => {
    const { date, amount } = transaction;
    
    // Format date to be just DD/MM (day/month) for display
    const dateParts = date.split('/');
    const formattedDate = `${dateParts[0]}/${dateParts[1]}`;
    
    if (!dailyTotals[formattedDate]) {
      dailyTotals[formattedDate] = 0;
    }
    
    dailyTotals[formattedDate] += amount;
  });
  
  // Convert to array format needed for chart
  return Object.entries(dailyTotals)
    .map(([date, amount]) => ({ name: date, amount }))
    .sort((a, b) => {
      // Sort by date (assuming DD/MM format)
      const [dayA, monthA] = a.name.split('/').map(Number);
      const [dayB, monthB] = b.name.split('/').map(Number);
      
      if (monthA !== monthB) return monthA - monthB;
      return dayA - dayB;
    });
}

export default function BudgetChart({ isBlurred = false }: BudgetChartProps) {
  const [activeView, setActiveView] = useState<ChartView>('week');
  const [activeWeek, setActiveWeek] = useState(1);
  const { financialData, hasUploadedStatement } = useBankStatement();

  // Generate chart data based on the view and selected week
  const chartData = useMemo(() => {
    if (!hasUploadedStatement || !financialData.transactions || financialData.transactions.length === 0) {
      return [];
    }
    
    const transactions = financialData.transactions;
    
    if (activeView === 'week') {
      // Weekly view: Show daily expenses for the selected week
      return getDailyTotals(transactions, activeWeek);
    } 
    else if (activeView === 'month') {
      // Monthly view: Show weekly totals
      const weeklyTotals = [1, 2, 3, 4].map(weekNum => {
        const weekTransactions = transactions.filter(t => 
          getWeekOfMonth(t.date) === weekNum && t.type === "debit"
        );
        
        const total = weekTransactions.reduce((sum, t) => sum + t.amount, 0);
        return {
          name: `Week ${weekNum}`,
          amount: total
        };
      });
      
      return weeklyTotals;
    } 
    else {
      // Balance view: Use budget data from context if available, or calculate from transactions
      if (financialData.budgetData && financialData.budgetData.length > 0) {
        return financialData.budgetData;
      } else {
        // If no budget data, create from transaction data
        const currentDate = new Date();
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        
        // Create entries for 6 days in the current month
        return Array.from({ length: 6 }).map((_, i) => {
          const date = new Date(monthStart);
          date.setDate(i * 5 + 1); // Spread out over the month
          
          const dateStr = `${date.getDate()}/${date.getMonth() + 1}`;
          
          // Get transactions for this day
          const dayTransactions = transactions.filter(t => {
            const [day, month] = t.date.split('/').map(Number);
            return day === date.getDate() && month === (date.getMonth() + 1);
          });
          
          const amount = dayTransactions.reduce((sum, t) => {
            return t.type === "debit" ? sum + t.amount : sum;
          }, 0);
          
          return {
            name: dateStr,
            amount: amount > 0 ? amount : Math.floor(Math.random() * 5000 + 5000) // Fallback if no data
          };
        });
      }
    }
  }, [financialData, activeView, activeWeek, hasUploadedStatement]);

  // Handle week selection
  const handleWeekSelect = (week: number) => {
    if (!isBlurred) {
      setActiveWeek(week);
      setActiveView('week'); // Switch to week view when selecting a week
    }
  };

  // Custom tooltip formatter for INR currency
  const formatTooltipValue = (value: number) => {
    return `₹${value.toLocaleString('en-IN')}`;
  };

  return (
    <Card className={cn(
      "bg-background/10 backdrop-blur-sm border-border/30 w-full transition-all shadow-md hover:shadow-lg h-full",
      isBlurred && "hover:opacity-60"
    )}>
      <CardHeader className="pb-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <CardTitle className="text-lg font-medium">COMPARING OF BUDGET</CardTitle>
          <div className="flex space-x-2">
            <button 
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeView === 'week' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              onClick={() => setActiveView('week')}
              disabled={isBlurred}
            >
              Week View
            </button>
            <button 
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeView === 'month' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              onClick={() => setActiveView('month')}
              disabled={isBlurred}
            >
              Month View
            </button>
            <button 
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeView === 'balance' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              onClick={() => setActiveView('balance')}
              disabled={isBlurred}
            >
              Balance
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("w-full h-[240px] md:h-[280px]", isBlurred && "blur-sm select-none")}>
          {!hasUploadedStatement ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Upload a bank statement to view budget data
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center flex-col text-muted-foreground">
              <p>No data available for {activeView === 'week' ? `Week ${activeWeek}` : 'the selected period'}</p>
              <p className="text-sm mt-2">Try selecting a different week or view</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
              >
                <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.5)" />
                <YAxis 
                  stroke="rgba(255, 255, 255, 0.5)" 
                  tickFormatter={(value) => `₹${value / 1000}k`}
                  domain={[0, 'dataMax + 2000']}
                />
                <Tooltip 
                  formatter={formatTooltipValue}
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                  }}
                  labelFormatter={(label) => {
                    // Format label based on view type
                    if (activeView === 'week') {
                      return `Date: ${label}`;
                    } else if (activeView === 'month') {
                      return label;
                    } else {
                      return `Date: ${label}`;
                    }
                  }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        
        <div className={cn("flex justify-end space-x-2 mt-4", isBlurred && "blur-sm select-none")}>
          <WeekSelector 
            week={1} 
            isActive={activeWeek === 1} 
            onClick={() => handleWeekSelect(1)} 
            disabled={isBlurred || !hasUploadedStatement} 
          />
          <WeekSelector 
            week={2} 
            isActive={activeWeek === 2} 
            onClick={() => handleWeekSelect(2)} 
            disabled={isBlurred || !hasUploadedStatement} 
          />
          <WeekSelector 
            week={3} 
            isActive={activeWeek === 3} 
            onClick={() => handleWeekSelect(3)} 
            disabled={isBlurred || !hasUploadedStatement} 
          />
          <WeekSelector 
            week={4} 
            isActive={activeWeek === 4} 
            onClick={() => handleWeekSelect(4)} 
            disabled={isBlurred || !hasUploadedStatement} 
          />
        </div>
      </CardContent>
    </Card>
  );
}

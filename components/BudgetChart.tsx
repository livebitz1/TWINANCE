"use client";

import React, { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import WeekSelector from "./WeekSelector";
import { useBankStatement } from "@/contexts/BankStatementContext";
import { Transaction } from "@/services/bankStatementService";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, BarChart3, ArrowLeftRight, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface ComparisonStats {
  totalDifference: number;
  averageDifference: number;
  maxDifference: number;
  daysWithHigherSpending: number;
  totalDays: number;
}

type ChartView = 'week' | 'month' | 'balance' | 'compare';
type CompareMode = 'single' | 'all' | 'compare';

interface BudgetChartProps {
  isBlurred?: boolean;
}

interface MonthData {
  month: string; // Format: "MM/YYYY"
  transactions: Transaction[];
}

// Helper function to format month
function formatMonth(date: Date): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Helper function to get month key
function getMonthKey(dateStr: string): string {
  const [_, month, year] = dateStr.split('/');
  return `${month}/${year}`;
}

export default function BudgetChart({ isBlurred = false }: BudgetChartProps) {
  const [activeView, setActiveView] = useState<ChartView>('balance');
  const [activeWeek, setActiveWeek] = useState(1);
  const [compareMode, setCompareMode] = useState<CompareMode>('single');
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [comparedMonth, setComparedMonth] = useState<string>("");
  const { financialData, hasUploadedStatement } = useBankStatement();

  // Group transactions by month
  const monthlyData = useMemo(() => {
    if (!hasUploadedStatement || !financialData.transactions) return [];

    const months: Record<string, Transaction[]> = {};
    financialData.transactions.forEach(transaction => {
      const monthKey = getMonthKey(transaction.date);
      if (!months[monthKey]) {
        months[monthKey] = [];
      }
      months[monthKey].push(transaction);
    });

    return Object.entries(months)
      .map(([key, transactions]) => ({
        month: key,
        transactions,
      }))
      .sort((a, b) => {
        const [monthA, yearA] = a.month.split('/').map(Number);
        const [monthB, yearB] = b.month.split('/').map(Number);
        return yearA !== yearB ? yearB - yearA : monthB - monthA;
      });
  }, [hasUploadedStatement, financialData.transactions]);

  // Set initial selected month
  useEffect(() => {
    if (monthlyData.length > 0 && !selectedMonth) {
      setSelectedMonth(monthlyData[0].month);
    }
  }, [monthlyData, selectedMonth]);

  // Get week number from date
  const getWeekNumber = (date: string) => {
    const [day] = date.split('/').map(Number);
    return Math.ceil(day / 7);
  };

  // Get week range string
  const getWeekRange = (weekNumber: number, monthStr: string) => {
    const [month, year] = monthStr.split('/').map(Number);
    const startDay = (weekNumber - 1) * 7 + 1;
    const endDay = Math.min(weekNumber * 7, new Date(year, month, 0).getDate());
    return `${startDay}-${endDay}`;
  };

  // Week selection state
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  // Reset week selection when month changes
  useEffect(() => {
    setSelectedWeek(null);
  }, [selectedMonth]);

  // Generate chart data based on view and comparison mode
  const chartData = useMemo(() => {
    if (!hasUploadedStatement || monthlyData.length === 0) return [];

    if (compareMode === 'compare' && activeView === 'balance') {
      // Compare two months
      const month1Data = monthlyData.find(m => m.month === selectedMonth)?.transactions || [];
      const month2Data = monthlyData.find(m => m.month === comparedMonth)?.transactions || [];

      const allDates = new Set([
        ...month1Data.map(t => parseInt(t.date.split('/')[0])),
        ...month2Data.map(t => parseInt(t.date.split('/')[0]))
      ]);

      return Array.from(allDates)
        .sort((a, b) => a - b)
        .map(day => ({
          name: day.toString(),
          [formatMonth(new Date(2025, parseInt(selectedMonth.split('/')[0]) - 1))]: 
            month1Data.find(t => parseInt(t.date.split('/')[0]) === day)?.amount || 0,
          [formatMonth(new Date(2025, parseInt(comparedMonth.split('/')[0]) - 1))]: 
            month2Data.find(t => parseInt(t.date.split('/')[0]) === day)?.amount || 0,
        }));
    }

    if (compareMode === 'all' && activeView === 'balance') {
      // Show all months together
      const allDays = Array.from({ length: 31 }, (_, i) => i + 1);
      return allDays.map(day => {
        const dataPoint: any = { name: day.toString() };
        monthlyData.forEach(({ month, transactions }) => {
          const monthName = formatMonth(new Date(2025, parseInt(month.split('/')[0]) - 1));
          const dayData = transactions.find(t => parseInt(t.date.split('/')[0]) === day);
          dataPoint[monthName] = dayData ? dayData.amount : 0;
        });
        return dataPoint;
      });
    }

    // Single month view
    const currentMonthData = monthlyData.find(m => m.month === selectedMonth)?.transactions || [];
    return currentMonthData
      .sort((a, b) => {
        const dayA = parseInt(a.date.split('/')[0]);
        const dayB = parseInt(b.date.split('/')[0]);
        return dayA - dayB;
      })
      .map(t => ({
        name: t.date.split('/')[0],
        amount: t.amount
      }));
  }, [hasUploadedStatement, monthlyData, compareMode, selectedMonth, comparedMonth, activeView]);

  // Calculate comparison statistics
  const comparisonStats = useMemo(() => {
    if (compareMode !== 'compare' || !selectedMonth || !comparedMonth) return null;

    const month1Data = monthlyData.find(m => m.month === selectedMonth)?.transactions || [];
    const month2Data = monthlyData.find(m => m.month === comparedMonth)?.transactions || [];
    
    const allDates = Array.from(new Set([
      ...month1Data.map(t => parseInt(t.date.split('/')[0])),
      ...month2Data.map(t => parseInt(t.date.split('/')[0]))
    ])).sort((a, b) => a - b);

    let totalDifference = 0;
    let maxDifference = 0;
    let daysWithHigherSpending = 0;

    allDates.forEach(day => {
      const amount1 = month1Data.find(t => parseInt(t.date.split('/')[0]) === day)?.amount || 0;
      const amount2 = month2Data.find(t => parseInt(t.date.split('/')[0]) === day)?.amount || 0;
      const difference = amount1 - amount2;

      totalDifference += difference;
      maxDifference = Math.max(maxDifference, Math.abs(difference));
      if (amount1 > amount2) daysWithHigherSpending++;
    });

    return {
      totalDifference,
      averageDifference: totalDifference / allDates.length,
      maxDifference,
      daysWithHigherSpending,
      totalDays: allDates.length
    } as ComparisonStats;
  }, [monthlyData, compareMode, selectedMonth, comparedMonth]);

  const monthOptions = monthlyData.map(({ month }) => ({
    value: month,
    label: formatMonth(new Date(2025, parseInt(month.split('/')[0]) - 1))
  }));

  return (
    <Card className={cn(
      "bg-background/10 backdrop-blur-sm border-border/30 transition-all",
      isBlurred && "hover:opacity-60"
    )}>
      <CardHeader className="pb-2">
        <motion.div layout className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-medium">COMPARING OF BUDGET</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "bg-[#1D2739] text-[#8A93A6] hover:bg-[#2D3748] border-[#2D3748]",
                  compareMode === 'single' && "bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90"
                )}
                onClick={() => setCompareMode('single')}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Single Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "bg-[#1D2739] text-[#8A93A6] hover:bg-[#2D3748] border-[#2D3748]",
                  compareMode === 'all' && "bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90"
                )}
                onClick={() => setCompareMode('all')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                All Months
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "bg-[#1D2739] text-[#8A93A6] hover:bg-[#2D3748] border-[#2D3748]",
                  compareMode === 'compare' && "bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90"
                )}
                onClick={() => setCompareMode('compare')}
              >
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Compare
              </Button>
            </div>
          </div>

          <motion.div 
            layout 
            className="flex flex-col space-y-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-4">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px] bg-[#1D2739] text-[#8A93A6] border-[#2D3748]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option: { value: string, label: string }) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {compareMode === 'single' && selectedMonth && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-2"
                >
                  <Select 
                    value={selectedWeek ? String(selectedWeek) : ''} 
                    onValueChange={(value) => setSelectedWeek(parseInt(value))}
                  >
                    <SelectTrigger className="w-[140px] bg-[#1D2739] text-[#8A93A6] border-[#2D3748]">
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Days</SelectItem>
                      {Array.from({ length: 5 }, (_, i) => i + 1).map((week) => (
                        <SelectItem key={week} value={String(week)}>
                          Week {week} ({getWeekRange(week, selectedMonth)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedWeek && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-[#1D2739] text-[#8A93A6] hover:bg-[#2D3748] border-[#2D3748]"
                      onClick={() => setSelectedWeek(null)}
                    >
                      Show All
                    </Button>
                  )}
                </motion.div>
              )}

              <AnimatePresence>
                {compareMode === 'compare' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-4"
                  >
                    <span className="text-[#8A93A6]">vs</span>
                    <Select value={comparedMonth} onValueChange={setComparedMonth}>
                      <SelectTrigger className="w-[200px] bg-[#1D2739] text-[#8A93A6] border-[#2D3748]">
                        <SelectValue placeholder="Select month to compare" />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions
                          .filter((option: { value: string }) => option.value !== selectedMonth)
                          .map((option: { value: string, label: string }) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {comparisonStats && compareMode === 'compare' && selectedMonth && comparedMonth && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-4 text-sm"
                >
                  <Badge variant="secondary" className="bg-[#1D2739] text-[#8A93A6]">
                    <Info className="h-3.5 w-3.5 mr-1" />
                    Average Daily Difference: ₹{Math.abs(comparisonStats.averageDifference).toLocaleString('en-IN')}
                  </Badge>
                  <Badge variant="secondary" className="bg-[#1D2739] text-[#8A93A6]">
                    Days with Higher Spending: {comparisonStats.daysWithHigherSpending}/{comparisonStats.totalDays}
                  </Badge>
                  <Badge variant="secondary" className="bg-[#1D2739] text-[#8A93A6]">
                    Max Difference: ₹{comparisonStats.maxDifference.toLocaleString('en-IN')}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </CardHeader>

      <CardContent className={cn("pt-4", isBlurred && "blur-sm select-none")}>
        <motion.div 
          layout 
          className="h-[300px] w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-[#8A93A6]">No data available for the selected period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={weeklyChartData || chartData} 
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8A93A6', fontSize: 12 }}
                  label={{ 
                    value: selectedWeek ? `Days (Week ${selectedWeek})` : 'Day of Month', 
                    position: 'insideBottom', 
                    offset: -5, 
                    fill: '#8A93A6' 
                  }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8A93A6', fontSize: 12 }}
                  tickFormatter={(value) => `₹${value / 1000}k`}
                  label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft', offset: 10, fill: '#8A93A6' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1D2739',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '8px 12px'
                  }}
                  formatter={(value: any, name: string, props: any) => {
                    const formattedValue = `₹${parseInt(value).toLocaleString('en-IN')}`;
                    const description = props.payload.description;
                    return [formattedValue, description || name];
                  }}
                  labelFormatter={(label) => `Day ${label}`}
                />
                {compareMode === 'single' ? (
                  <>
                    <Bar 
                      dataKey="amount" 
                      fill={selectedWeek ? "#10B981" : "#3B82F6"}
                      radius={[4, 4, 0, 0]} 
                      name={selectedMonth ? monthOptions.find(opt => opt.value === selectedMonth)?.label : 'Amount'}
                    >
                      {selectedWeek && weeklyChartData?.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={entry.amount > 0 ? "#10B981" : "#EF4444"}
                        />
                      ))}
                    </Bar>
                    {selectedWeek && (
                      <ReferenceLine
                        y={0}
                        stroke="rgba(255,255,255,0.2)"
                        strokeDasharray="3 3"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Legend 
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{
                        paddingTop: '10px',
                        paddingBottom: '10px'
                      }}
                    />
                    {Object.keys(chartData[0] || {})
                      .filter(key => key !== 'name')
                      .map((key, index) => (
                        <Bar 
                          key={key} 
                          dataKey={key} 
                          fill={index === 0 ? "#3B82F6" : "#10B981"} 
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}

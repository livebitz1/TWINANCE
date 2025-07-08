"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface WeekSelectorProps {
  week: number;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  dateRange?: string; // Optional date range to display
}

export default function WeekSelector({
  week,
  isActive = false,
  onClick,
  className,
  disabled = false,
  dateRange,
}: WeekSelectorProps) {
  // Helper function to get the date range for the week
  const getWeekDateRange = (weekNum: number): string => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Get the first day of the current month
    const firstDay = new Date(currentYear, currentMonth, 1);

    // Calculate the start day of the requested week
    const startDay = new Date(firstDay);
    startDay.setDate(firstDay.getDate() + (weekNum - 1) * 7);

    // Calculate the end day (start + 6 days)
    const endDay = new Date(startDay);
    endDay.setDate(startDay.getDate() + 6);

    // Format dates as DD/MM
    const formatDate = (date: Date) => `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;

    return `${formatDate(startDay)}-${formatDate(endDay)}`;
  };

  // Use provided date range or calculate it
  const displayRange = dateRange || getWeekDateRange(week);

  return (
    <button
      className={cn(
        "p-2 px-4 text-sm border border-border/30 rounded-lg transition-all flex flex-col items-center",
        isActive ? "bg-primary text-primary-foreground shadow-md" : "bg-background/10 backdrop-blur-sm hover:bg-background/20 shadow-sm",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={onClick}
      disabled={disabled}
      title={`View data for Week ${week} (${displayRange})`}
    >
      <span className="font-medium">WEEK {week}</span>
      <span className="text-xs opacity-80 mt-1">{displayRange}</span>
    </button>
  );
}

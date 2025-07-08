"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FinancialSummaryCardProps {
  title: string;
  amount: string;
  description?: string;
  transactions?: number;
  className?: string;
  isBlurred?: boolean;
}

export default function FinancialSummaryCard({
  title,
  amount,
  description,
  transactions,
  className,
  isBlurred = false,
}: FinancialSummaryCardProps) {
  return (
    <Card className={cn(
      "bg-background/10 backdrop-blur-sm border-border/30 transition-all overflow-hidden h-full shadow-md hover:shadow-lg", 
      className, 
      isBlurred && "hover:opacity-60"
    )}>
      <CardHeader className="pb-2 border-b border-border/20">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className={cn(
          "text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-300",
          isBlurred && "blur-sm select-none"
        )}>
          {amount}
        </div>
        {description && (
          <p className={cn(
            "text-sm text-muted-foreground",
            isBlurred && "blur-sm select-none"
          )}>
            {description}
          </p>
        )}
        {transactions !== undefined && (
          <div className={cn(
            "mt-4 text-sm text-right",
            isBlurred && "blur-sm select-none"
          )}>
            <span className="py-1 px-3 rounded-full bg-primary/20 text-primary-foreground/90 text-xs font-medium shadow-inner">
              {transactions} Transactions
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

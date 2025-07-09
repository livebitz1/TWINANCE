"use client";

import React, { useState } from "react";
import EnhancedUpload from "@/components/EnhancedUpload";
import EnhancedDashboard from "@/components/EnhancedDashboard";
import { ParsedStatementData } from "@/services/transactionParser";

export default function FinancialApp() {
  const [statementData, setStatementData] = useState<ParsedStatementData | null>(null);

  const handleUploadSuccess = (data: ParsedStatementData) => {
    setStatementData(data);
  };

  const handleBackToUpload = () => {
    setStatementData(null);
  };

  return (
    <div className="min-h-screen">
      {!statementData ? (
        <EnhancedUpload onUploadSuccess={handleUploadSuccess} />
      ) : (
        <div>
          <div className="fixed top-4 left-4 z-10">
            <button
              onClick={handleBackToUpload}
              className="bg-slate-800 text-white px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors"
            >
              ← Upload New Statement
            </button>
          </div>
          <EnhancedDashboard statementData={statementData} />
        </div>
      )}
    </div>
  );
}

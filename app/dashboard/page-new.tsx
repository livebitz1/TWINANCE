"use client";

import { useAuth } from "@clerk/nextjs";
import FinancialApp from "@/components/FinancialApp";

export default function Dashboard() {
  const { isSignedIn, isLoaded } = useAuth();

  // Show loading while auth is being checked
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    window.location.href = "/";
    return null;
  }

  return <FinancialApp />;
}

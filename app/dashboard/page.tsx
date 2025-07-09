"use client";

import { useAuth } from "@clerk/nextjs";
import ClientDashboard from "./client-dashboard";

// The main dashboard page component with authentication
export default function Dashboard() {
  const { isSignedIn, isLoaded } = useAuth();

  // Show loading while auth is being checked
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-lg">Loading...</div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    window.location.href = "/";
    return null;
  }

  return <ClientDashboard />;
}

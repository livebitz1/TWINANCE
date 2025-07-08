"use client";

import { Toaster } from "@/components/ui/toaster";
import "../globals.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen h-screen flex flex-col overflow-hidden bg-gradient-to-br from-black to-gray-900 text-white">
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {children}
      </div>
      <Toaster />
    </div>
  );
}

"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserButton, SignInButton, useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useBankStatement } from "@/contexts/BankStatementContext";

export default function DashboardNavbar() {
  const { isSignedIn } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const { hasUploadedStatement } = useBankStatement();

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <button onClick={() => window.location.href = '/'} className="focus:outline-none">
            <img src="/twinance-logo.png" alt="Twinance Logo" className="w-24 h-24 object-contain rounded-2xl shadow-lg" />
          </button>
          <h1 className="text-xl font-bold">Twinance</h1>
        </div>
        <div className="sm:ml-6 mt-2 sm:mt-0">
          <Tabs defaultValue="this-month" className="w-auto">
            <TabsList className="bg-background/10 backdrop-blur-sm border border-border/30">
              <TabsTrigger 
                value="this-month" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                disabled={!hasUploadedStatement}
              >
                This - Month
              </TabsTrigger>
              <TabsTrigger 
                value="upi" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                disabled={!hasUploadedStatement}
              >
                UPI
              </TabsTrigger>
              <TabsTrigger 
                value="crypto" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                disabled={!hasUploadedStatement}
              >
                CRYPTO
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 sm:mt-0">
        {isClient && isSignedIn ? (
          <div className="flex items-center gap-3">
            {/* Show user name next to profile avatar */}
            <UserName />
            <div className="rounded-lg border border-border/30 p-1 px-1 bg-background/10 backdrop-blur-sm hover:bg-background/20 transition-colors">
              <UserButton 
                afterSignOutUrl="/" 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-9 h-9"
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <SignInButton mode="modal">
            <button className="rounded-lg border border-border/30 p-2 px-4 bg-background/10 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground transition-colors">
              Sign In
            </button>
          </SignInButton>
        )}
      </div>
    </div>
  );

function UserName() {
  const { user } = useUser();
  if (!user) return null;
  return (
    <span className="text-base font-semibold text-blue-300 mr-2">{user.fullName || user.username || (user.emailAddresses && user.emailAddresses[0]?.emailAddress)}</span>
  );
}
}

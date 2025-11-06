"use client";

import React from "react";
import { UserButton, SignInButton, useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function Web3Navbar() {
  const { isSignedIn } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-0">
        <div className="flex items-center gap-2">
          <img
            src="/twinance-logo.png"
            alt="Twinance Logo"
            className="h-8 w-8 object-contain"
          />
          <span className="text-xl font-bold">Twinance</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isClient && (
          <>
            {isSignedIn ? (
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8",
                  },
                }}
              />
            ) : (
              <SignInButton mode="modal">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Sign In
                </button>
              </SignInButton>
            )}
          </>
        )}
      </div>
    </div>
  );
}

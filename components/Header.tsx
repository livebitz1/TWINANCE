"use client";

import Link from "next/link";
import { UserButton, SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function Header() {
  const [isClient, setIsClient] = useState(false);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <header>
      <div className="header-container">
        <Link href="/" className="logo">
          Twinance
        </Link>
        <nav>
          {isClient && isSignedIn ? (
            <>
              <Link href="/dashboard" className="btn btn-outline">
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : isClient ? (
            <>
              <SignInButton mode="modal">
                <button className="btn btn-outline">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="btn btn-primary">Sign Up</button>
              </SignUpButton>
            </>
          ) : (
            <div className="flex gap-4">
              <div className="btn btn-outline">Sign In</div>
              <div className="btn btn-primary">Sign Up</div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

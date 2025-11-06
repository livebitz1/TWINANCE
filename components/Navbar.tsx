"use client";


import Link from "next/link";
import { UserButton, useAuth, SignUpButton } from "@clerk/nextjs";
import TermsCard from "./TermsCard";
import PrivacyCard from "./PrivacyCard";
import { useState } from "react";

export default function Navbar() {
  const { isSignedIn } = useAuth();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  return (
    <div className="relative w-full flex items-center justify-center" style={{ top: '-1.5rem' }}>
      {/* Blue Side Cards as Background, not from Navbar */}
      <div className="pointer-events-none fixed left-0 top-0 h-screen flex items-center z-0 hidden md:flex">
        <div
          className="w-80 h-[32rem] bg-gradient-to-br from-blue-700 via-blue-500 to-transparent opacity-70 shadow-2xl"
          style={{
            borderTopLeftRadius: '3rem',
            borderBottomLeftRadius: '3rem',
            transform: 'skewY(-18deg) translateX(-40%)',
            boxShadow: '0 0 60px 10px rgba(0,80,255,0.25)',
          }}
        ></div>
      </div>
      <div className="pointer-events-none fixed right-0 top-0 h-screen flex items-center z-0 hidden md:flex">
        <div
          className="w-80 h-[32rem] bg-gradient-to-bl from-blue-700 via-blue-500 to-transparent opacity-70 shadow-2xl"
          style={{
            borderTopRightRadius: '3rem',
            borderBottomRightRadius: '3rem',
            transform: 'skewY(18deg) translateX(40%)',
            boxShadow: '0 0 60px 10px rgba(0,80,255,0.25)',
          }}
        ></div>
      </div>
      {/* Main Navbar */}
      <nav className="w-full flex items-center justify-between px-8 py-4 z-20 relative" style={{borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem', background: 'none'}}>
        <div className="flex items-center gap-3">
          <Link href="/">
            <img src="/twinance-logo.png" alt="Twinance Logo" className="w-24 h-24 object-contain" />
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center gap-10">
          <Link href="/dashboard" className="text-sm font-medium text-white/80 hover:text-white transition">Dashboard</Link>
          <button
            className="text-sm font-medium text-white/80 hover:text-white transition focus:outline-none"
            onClick={() => setShowTerms(true)}
          >TERMS</button>
          <button
            className="text-sm font-medium text-white/80 hover:text-white transition focus:outline-none"
            onClick={() => setShowPrivacy(true)}
          >PRIVACY</button>
        </div>
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <div className="w-10 h-10 rounded-lg border border-white/30 flex items-center justify-center bg-black/60">
              <UserButton afterSignOutUrl="/" />
            </div>
          ) : (
            <Link href="/sign-up">
              <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-400 text-white font-bold shadow-lg hover:scale-105 transition-transform text-sm border border-blue-700/40">
                Sign Up
              </button>
            </Link>
          )}
        </div>
      </nav>
      {showTerms && (
        <div id="terms-card">
          <TermsCard onClose={() => setShowTerms(false)} />
        </div>
      )}
      {showPrivacy && (
        <div id="privacy-card">
          <PrivacyCard onClose={() => setShowPrivacy(false)} />
        </div>
      )}
    </div>
  );
}

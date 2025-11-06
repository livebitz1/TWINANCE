"use client";
import { useEffect, useState } from "react";
import { SignIn } from "@clerk/nextjs";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning!";
  if (hour < 18) return "Good Afternoon!";
  return "Good Evening!";
}

export default function SignInPage() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(true);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      {/* Dark mode toggle (visual only) */}
      <button aria-label="Toggle dark mode" className="fixed bottom-6 left-6 z-50 p-2 rounded-full bg-white shadow-lg hover:bg-blue-100 transition-colors">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M6.05 17.95l-1.414 1.414M17.95 17.95l-1.414-1.414M6.05 6.05L4.636 7.464" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      <div className="flex flex-1 w-full h-full flex-col md:flex-row">
        {/* Left side: Welcome & branding */}
        <div className={`w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 relative min-h-[320px] overflow-hidden transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          aria-label="Welcome panel">
          {/* Animated floating blobs */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
            <svg className="absolute top-0 left-0 animate-float-slow" width="320" height="320" viewBox="0 0 320 320" fill="none">
              <circle cx="160" cy="160" r="120" fill="#2563eb22" />
            </svg>
            <svg className="absolute bottom-0 right-0 animate-float-fast" width="180" height="180" viewBox="0 0 180 180" fill="none">
              <rect x="30" y="30" width="120" height="120" rx="40" fill="#6366f122" />
            </svg>
            <svg className="absolute top-1/2 left-1/2 animate-float-medium" style={{transform: 'translate(-50%,-50%)'}} width="200" height="200" viewBox="0 0 200 200" fill="none">
              <ellipse cx="100" cy="100" rx="80" ry="60" fill="#fff1" />
            </svg>
          </div>
          {/* Logo & Brand */}
          <div className="mb-10 flex flex-col items-center z-10">
            <div className="bg-white rounded-full p-4 mb-3 shadow-lg">
              {/* Replace with your logo image if available */}
              <svg width="48" height="48" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#2563eb" /></svg>
            </div>
            <span className="text-white text-3xl font-extrabold tracking-wide drop-shadow-lg">Twinance</span>
          </div>
          <h1 className="text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-indigo-300 mb-6 drop-shadow-xl z-10 animate-fade-in" style={{fontFamily:'inherit'}}>{getGreeting()}</h1>
          <p className="text-white/90 text-xl mb-10 text-center max-w-lg z-10 animate-fade-in delay-100">Track your finances seamlessly with <span className="font-bold text-indigo-200">AI assistance</span>. Get insights, manage budgets, and visualize your financial health all in one place.</p>
          {/* Social icons with hover effects */}
          <div className="absolute bottom-10 left-8 flex gap-8 z-10">
            <a href="#" aria-label="Facebook" className="text-white/80 hover:text-white transition-transform transform hover:scale-110"><svg width="28" height="28" fill="currentColor"><circle cx="14" cy="14" r="14" /></svg></a>
            <a href="#" aria-label="Twitter" className="text-white/80 hover:text-white transition-transform transform hover:scale-110"><svg width="28" height="28" fill="currentColor"><rect x="6" y="6" width="16" height="16" rx="5" /></svg></a>
            <a href="#" aria-label="Instagram" className="text-white/80 hover:text-white transition-transform transform hover:scale-110"><svg width="28" height="28" fill="currentColor"><circle cx="14" cy="14" r="12" /></svg></a>
          </div>
          {/* Decorative sparkles */}
          <div className="absolute top-8 right-8 animate-pulse z-10">
            <svg width="32" height="32" fill="none"><circle cx="16" cy="16" r="16" fill="#fff3" /></svg>
          </div>
        </div>
        {/* Right side: Login card */}
        <div className={`w-full md:w-1/2 flex flex-col justify-center items-center bg-gradient-to-br from-white via-blue-50 to-indigo-100 p-8 md:p-16 min-h-[320px] relative overflow-hidden transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          aria-label="Login panel">
          {/* Decorative background shapes */}
          <div className="absolute top-0 right-0 w-full h-full pointer-events-none z-0">
            <svg className="absolute top-0 right-0 animate-float-slow" width="220" height="220" viewBox="0 0 220 220" fill="none">
              <circle cx="110" cy="110" r="90" fill="#2563eb11" />
            </svg>
            <svg className="absolute bottom-0 left-0 animate-float-medium" width="120" height="120" viewBox="0 0 120 120" fill="none">
              <rect x="20" y="20" width="80" height="80" rx="24" fill="#6366f111" />
            </svg>
          </div>
          <div className="w-full max-w-lg z-10 shadow-2xl rounded-3xl bg-white/90 backdrop-blur-lg border border-blue-100 p-12 animate-fade-in">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-extrabold text-blue-700 mb-2 drop-shadow-lg">Sign In to Twinance</h2>
              <p className="text-muted-foreground text-lg">Welcome back! Sign in to your account</p>
            </div>
            {/* Clerk social button styled for Google */}
            {/* Clerk sign-in form (rest of providers/fields) */}
            <SignIn
              appearance={{
                elements: {
                  formButtonPrimary:
                    "w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold text-lg shadow-lg hover:from-indigo-500 hover:to-blue-600 transition-all mt-4",
                  card: "bg-white/95 border border-blue-100 rounded-xl shadow p-6",
                  rootBox: "w-full",
                  headerTitle: "text-xl font-bold text-blue-700 mb-1",
                  headerSubtitle: "text-muted-foreground mb-2",
                  socialButtonsBlockButton:
                    "w-full flex items-center justify-center gap-3 py-3 mb-6 rounded-xl bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all focus:outline-none block",
                  dividerRow: "my-4",
                  formFieldInput:
                    "w-full px-4 py-3 rounded border border-blue-200 bg-white text-lg focus:ring-2 focus:ring-blue-600 focus:border-indigo-500 transition-all",
                  formFieldLabel: "text-sm font-semibold text-muted-foreground mb-1",
                  footerAction: "text-sm text-muted-foreground mt-4",
                  footerActionLink: "text-indigo-600 font-semibold hover:underline",
                },
              }}
              routing="path"
              path="/sign-in"
            />
            <div className="flex flex-col items-center mt-6 w-full space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-bold text-blue-700">&#128274;</span>
                <span className="font-semibold">Your credentials are encrypted and secure.</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-bold text-indigo-600">&#43;</span>
                <span className="font-semibold">New here?</span>
                <a
                  href="/sign-up"
                  className="text-indigo-600 font-bold hover:underline ml-1"
                >
                  Create an account
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


"use client";
import { useEffect, useState } from "react";
import { SignUp } from "@clerk/nextjs";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning!";
  if (hour < 18) return "Good Afternoon!";
  return "Good Evening!";
}

export default function SignUpPage() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(true);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      {/* Dark mode toggle (visual only) */}
      <button aria-label="Toggle dark mode" className="fixed bottom-6 left-6 z-50 p-2 rounded-full bg-white shadow-lg hover:bg-blue-100 transition-colors">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M6.05 17.95l-1.414 1.414M17.95 17.95l-1.414-1.414M6.05 6.05L4.636 7.464" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      <div className="flex w-full h-full flex-col md:flex-row overflow-hidden">
        {/* Left side: Welcome & branding */}
        <div className={`w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 relative h-full overflow-hidden transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          aria-label="Welcome panel">
          {/* Animated gradient background */}
          <div className="absolute inset-0 w-full h-full z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-blue-800 to-blue-600 animate-gradient-move opacity-80"></div>
            <svg className="absolute top-0 left-0 animate-float-slow" width="420" height="420" viewBox="0 0 420 420" fill="none">
              <circle cx="210" cy="210" r="180" fill="#2563eb33" />
            </svg>
            <svg className="absolute bottom-0 right-0 animate-float-fast" width="240" height="240" viewBox="0 0 240 240" fill="none">
              <rect x="40" y="40" width="160" height="160" rx="60" fill="#6366f144" />
            </svg>
            <svg className="absolute top-1/2 left-1/2 animate-float-medium" style={{transform: 'translate(-50%,-50%)'}} width="300" height="300" viewBox="0 0 300 300" fill="none">
              <ellipse cx="150" cy="150" rx="120" ry="90" fill="#fff2" />
            </svg>
            {/* Animated sparkles */}
            <svg className="absolute top-12 right-24 animate-pulse" width="40" height="40" fill="none"><circle cx="20" cy="20" r="20" fill="#fff5" /></svg>
            <svg className="absolute bottom-16 left-24 animate-pulse" width="32" height="32" fill="none"><circle cx="16" cy="16" r="16" fill="#fff3" /></svg>
          </div>
          {/* Glassmorphism card */}
          <div className="relative z-10 flex flex-col items-center justify-center px-8 py-12 rounded-3xl bg-white/10 backdrop-blur-2xl shadow-2xl border border-blue-400/30 max-w-xl mx-auto">
            {/* Glowing animated logo */}
            <div className="mb-8 flex flex-col items-center">
              <div className="bg-white rounded-full p-6 mb-4 shadow-lg animate-glow">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" fill="#2563eb" /><circle cx="32" cy="32" r="28" fill="#2563eb" className="animate-pulse" /></svg>
              </div>
              <span className="text-white text-4xl font-extrabold tracking-wide drop-shadow-lg animate-fade-in">Twinance</span>
            </div>
            {/* Dynamic greeting with enhanced typography */}
            <h1 className="text-7xl md:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-indigo-400 mb-8 drop-shadow-2xl animate-fade-in-slow" style={{fontFamily:'inherit'}}>{getGreeting()}</h1>
            {/* Motivational subtitle/tagline */}
            <p className="text-white/90 text-2xl md:text-3xl mb-8 text-center max-w-2xl z-10 animate-fade-in delay-100 font-semibold">Create your account and start tracking your finances with <span className="font-bold text-indigo-200">AI assistance</span>. Get insights, manage budgets, and visualize your financial health all in one place.<br/><span className="block mt-4 text-blue-200 text-xl font-bold">Empower your future. Own your financial journey.</span></p>
            {/* Interactive social icons with hover and focus effects */}
            <div className="flex gap-10 mt-6 z-10">
              <a href="#" aria-label="Facebook" className="text-white/80 hover:text-blue-400 focus:text-blue-400 transition-transform transform hover:scale-110 focus:scale-110 outline-none"><svg width="32" height="32" fill="currentColor"><circle cx="16" cy="16" r="16" /></svg></a>
              <a href="#" aria-label="Twitter" className="text-white/80 hover:text-blue-400 focus:text-blue-400 transition-transform transform hover:scale-110 focus:scale-110 outline-none"><svg width="32" height="32" fill="currentColor"><rect x="8" y="8" width="16" height="16" rx="6" /></svg></a>
              <a href="#" aria-label="Instagram" className="text-white/80 hover:text-blue-400 focus:text-blue-400 transition-transform transform hover:scale-110 focus:scale-110 outline-none"><svg width="32" height="32" fill="currentColor"><circle cx="16" cy="16" r="14" /></svg></a>
            </div>
          </div>
        </div>
        {/* Right side: Sign-up card */}
        {/* Right side: Sign-up card (copied from Sign-in page for identical UI) */}
        <div className={`w-full md:w-1/2 flex flex-col justify-center items-center bg-gradient-to-br from-white via-blue-50 to-indigo-100 p-8 md:p-16 min-h-[320px] relative overflow-hidden transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          aria-label="Sign-up panel">
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
              <h2 className="text-4xl font-extrabold text-blue-700 mb-2 drop-shadow-lg">Sign Up for Twinance</h2>
              <p className="text-muted-foreground text-lg">Create your account to get started</p>
            </div>
            <SignUp
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
              path="/sign-up"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();
  
  // If authenticated, redirect to dashboard
  if (userId) {
    redirect("/dashboard");
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex items-center justify-center mb-6">
          <Image 
            src="/globe.svg" 
            alt="Twinance Logo" 
            width={60} 
            height={60}
            className="mr-2"
          />
          <h1 className="text-4xl font-bold">Twinance</h1>
        </div>
        
        <h2 className="text-2xl font-semibold">AI-Integrated Financial Tracker</h2>
        
        <p className="text-muted-foreground">
          Track your finances seamlessly with AI assistance. Get insights, manage budgets,
          and visualize your financial health all in one place.
        </p>
        
        <div className="space-y-4 pt-4">
          <SignInButton mode="modal">
            <button className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors">
              Sign In to Dashboard
            </button>
          </SignInButton>
          
          <p className="text-sm text-muted-foreground">
            New to Twinance? Sign in to create an account.
          </p>
        </div>
      </div>
    </div>
  );
}

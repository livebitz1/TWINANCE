
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import Header from "@/components/Header";

// Import Inter font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Twinance - AI Integrated Financial Tracker",
  description: "Track your finances with AI assistance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${inter.variable} font-sans bg-background text-foreground`}>
          {/* Header is only shown on non-dashboard pages */}
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}

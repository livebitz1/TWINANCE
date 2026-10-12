"use client";

import { Transaction } from "./bankStatementService";

// Goes through this app's own server route, which holds the API key and targets a
// current model. This previously called "gemini-pro" directly using a browser
// visible key; that model has since been retired, so the call always failed and
// every explanation silently came from the local fallback below.
const GEMINI_PROXY_URL = "/api/gemini-chat";

export async function explainTransaction(transaction: Transaction): Promise<string> {
  try {
    const prompt = `
      Analyze this financial transaction and provide a helpful explanation in a friendly, conversational tone.
      
      Transaction Details:
      - Date: ${transaction.date}
      - Description: ${transaction.description}
      - Amount: ₹${transaction.amount.toLocaleString('en-IN')}
      - Type: ${transaction.type}
      - Category: ${transaction.category}
      ${transaction.referenceNumber ? `- Reference: ${transaction.referenceNumber}` : ''}
      ${transaction.merchant ? `- Merchant: ${transaction.merchant}` : ''}
      ${transaction.upiId ? `- UPI ID: ${transaction.upiId}` : ''}
      
      Please provide:
      1. A brief explanation of what this transaction represents
      2. Any insights about the merchant/service if recognizable
      3. Tips for managing similar transactions in the future
      4. Any potential concerns or recommendations
      
      Keep the response concise (2-3 sentences) and helpful for personal finance management.
    `;

    const response = await fetch(GEMINI_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        config: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 256,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    if (!result?.response) throw new Error("Empty explanation from API");
    return result.response;
  } catch (error) {
    console.error("Error explaining transaction:", error);
    
    // Fallback explanation based on transaction data
    return generateFallbackExplanation(transaction);
  }
}

function generateFallbackExplanation(transaction: Transaction): string {
  const { description, amount, type, category } = transaction;
  
  if (type === "credit") {
    if (category === "Income") {
      return `This is a salary or income credit of ₹${amount.toLocaleString('en-IN')}. Consider allocating this amount across your savings, investments, and expenses based on your financial goals.`;
    } else {
      return `You received ₹${amount.toLocaleString('en-IN')} from ${description}. This could be a refund, transfer, or other credit transaction.`;
    }
  } else {
    const categoryAdvice = {
      "Food & Dining": "Consider tracking your food expenses to maintain a healthy dining budget.",
      "Transportation": "Transportation costs can add up quickly. Consider using public transport or carpooling when possible.",
      "Shopping": "Review your shopping habits and consider if this purchase aligns with your budget.",
      "Bills & Utilities": "Regular bill payments are essential. Consider setting up auto-pay to avoid late fees.",
      "Healthcare": "Health expenses are important investments. Keep receipts for insurance claims if applicable.",
      "Other": "Review this expense category and consider if it fits your monthly budget."
    };
    
    const advice = categoryAdvice[category as keyof typeof categoryAdvice] || "Monitor spending in this category to stay within budget.";
    
    return `You spent ₹${amount.toLocaleString('en-IN')} on ${description}. ${advice}`;
  }
}

"use client";

import { Transaction } from "./bankStatementService";

// Gemini API configuration
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

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

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 256,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result: GeminiResponse = await response.json();
    return result.candidates[0].content.parts[0].text;
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

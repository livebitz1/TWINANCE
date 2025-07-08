"use client";

import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini AI with your API key
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

/**
 * Utility class for interacting with Gemini AI for natural language processing
 */
export class GeminiNLPService {
  private genAI: GoogleGenerativeAI;
  
  constructor() {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");
  }
  
  /**
   * Generate a response to a natural language query
   * @param query The user's question or prompt
   * @param context Optional context to provide additional information
   * @returns The AI-generated response
   */
  async generateResponse(query: string, context?: string): Promise<string> {
    try {
      // Construct prompt with context if provided
      const prompt = context 
        ? `Given the following context:\n${context}\n\nAnswer this question: ${query}` 
        : query;
      
      // Get the generative model (gemini-pro is optimized for text)
      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-pro",
        generationConfig: {
          temperature: 0.4, // Lower for more deterministic outputs, higher for more creative
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        }
      });
      
      // Generate content
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error generating response from Gemini:", error);
      return "I'm sorry, I wasn't able to process your request at this time.";
    }
  }
  
  /**
   * Analyze sentiment of a text
   * @param text The text to analyze
   * @returns The sentiment analysis result
   */
  async analyzeSentiment(text: string): Promise<{ sentiment: string; score: number; explanation: string }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
        Analyze the sentiment of the following text and return a JSON object with the following fields:
        - sentiment: Either "positive", "negative", or "neutral"
        - score: A number between -1 (very negative) and 1 (very positive)
        - explanation: A brief explanation of why this sentiment was detected
        
        Text to analyze: "${text}"
        
        Return ONLY the JSON object and nothing else.
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      
      // Parse the JSON response
      try {
        // Handle potential markdown formatting
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                          responseText.match(/```\n([\s\S]*?)\n```/) || 
                          [null, responseText];
        
        const cleanJson = jsonMatch[1].trim();
        return JSON.parse(cleanJson);
      } catch (parseError) {
        console.error("Error parsing sentiment analysis response:", parseError);
        return {
          sentiment: "neutral",
          score: 0,
          explanation: "Unable to analyze sentiment due to an error."
        };
      }
    } catch (error) {
      console.error("Error analyzing sentiment with Gemini:", error);
      return {
        sentiment: "neutral",
        score: 0,
        explanation: "Error occurred during sentiment analysis."
      };
    }
  }
  
  /**
   * Extract key information from a text
   * @param text The text to analyze
   * @param entities Types of entities to extract (e.g., ["dates", "amounts", "names"])
   * @returns Extracted information
   */
  async extractEntities(text: string, entities: string[]): Promise<Record<string, any>> {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
        Extract the following types of information from the text below:
        ${entities.map(entity => `- ${entity}`).join('\n')}
        
        Text: "${text}"
        
        Return a JSON object where each key is one of the entity types, and the value is an array of extracted entities.
        Return ONLY the JSON object and nothing else.
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      
      // Parse the JSON response
      try {
        // Handle potential markdown formatting
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                          responseText.match(/```\n([\s\S]*?)\n```/) || 
                          [null, responseText];
        
        const cleanJson = jsonMatch[1].trim();
        return JSON.parse(cleanJson);
      } catch (parseError) {
        console.error("Error parsing entity extraction response:", parseError);
        return {};
      }
    } catch (error) {
      console.error("Error extracting entities with Gemini:", error);
      return {};
    }
  }
  
  /**
   * Summarize a long text
   * @param text The text to summarize
   * @param maxWords Optional maximum words for the summary
   * @returns The summary
   */
  async summarizeText(text: string, maxWords?: number): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const lengthConstraint = maxWords ? `in ${maxWords} words or less` : "concisely";
      
      const prompt = `
        Summarize the following text ${lengthConstraint}. Focus on the key points and main ideas.
        
        Text to summarize:
        "${text}"
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error summarizing text with Gemini:", error);
      return "Unable to generate summary at this time.";
    }
  }
}

// Export a singleton instance for use throughout the application
export const geminiNLP = new GeminiNLPService();

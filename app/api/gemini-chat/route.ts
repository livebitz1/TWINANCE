import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
// Use gemini-flash-latest (stable alias)
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

/**
 * Server-side proxy for Gemini AI chat requests
 * Bypasses CORS restrictions by making requests from the server
 */
export async function POST(req: NextRequest) {
    try {
        if (!GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'Gemini API key not configured' },
                { status: 500 }
            );
        }

        const body = await req.json();
        const { prompt, config } = body;

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        console.log('[Gemini Chat API] Processing request');

        // Make request to Gemini API from server-side
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: config || {
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Gemini Chat API] Error:', errorText);

            // Pass through the status code (e.g., 429)
            return NextResponse.json(
                { error: `Gemini API error: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const result = await response.json();
        return NextResponse.json({
            success: true,
            response: result.candidates[0].content.parts[0].text
        });

    } catch (error) {
        console.error('[Gemini Chat API] Server error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

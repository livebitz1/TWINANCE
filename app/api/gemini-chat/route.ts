import { NextRequest, NextResponse } from 'next/server';

// Server-only key first. NEXT_PUBLIC_ is only honoured as a fallback for older
// setups, because that prefix bundles the key into the browser JS where any
// visitor can read it.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
// gemini-flash-lite-latest: the cheapest generally-available Gemini tier (roughly
// a quarter to a sixth of standard Flash's per-token price), and a "latest" alias
// so it keeps tracking Google's current Lite model instead of pointing at a dated
// version that eventually gets sunset. It does not support "thinking" at all -
// sending thinkingConfig rejects the request outright - but that's fine here:
// nothing in this app needs reasoning, only fast structured extraction and
// grounded answers over data already supplied in the prompt.
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent";

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
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 2048,
                    ...(config || {}),
                    // gemini-flash-lite-latest rejects thinkingConfig outright (it is not
                    // a thinking model), so any caller-supplied value is dropped here
                    // rather than forwarded - a caller written for a different model
                    // must not be able to break every request through this route.
                    thinkingConfig: undefined,
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

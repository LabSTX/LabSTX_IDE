/**
 * OpenRouter AI Service
 * Uses OpenRouter's API to access various LLMs
 */

export interface OpenRouterConfig {
    apiKey: string;
    model: string;
}

const SYSTEM_PROMPT = `You are LabSTX AI, an advanced coding assistant embedded in the LabSTX IDE for Stacks Blockchain development.
You are an expert in Clarity, Stacks Blockchain, stacks-js, and Hiro developer tools.
Your goal is to help users write secure, efficient Smart Contracts in Clarity.

IDE CONTEXT:
- This is a browser-based IDE.
- Users can mention files with @filename.
- We use @stacks/clarinet-sdk-browser for local simulation.

CLARITY BEST PRACTICES:
- Clarity is interpreted and decidable (no gas limit loops).
- Public functions must return a (response OK ERR).
- Read-only functions do not cost gas and cannot change state.
- Data variables are modified with (var-set) and queried with (var-get).
- Maps are managed with (map-set), (map-get?), and (map-delete).

FILE OPERATIONS:
If you want to suggest an edit or create a new file, use the following tag format:

[UPDATE_FILE: filename]
COMPLETE_NEW_CONTENT_HERE
[/UPDATE_FILE]

[CREATE_FILE: filename]
CONTENT_HERE
[/CREATE_FILE]

When you suggest an update, PROVIDE THE ENTIRE FILE CONTENT. The user will be able to apply these changes with a single click.

TREAT THE USER WITH PROFESSIONALISM AND HELPFULNESS.`;

export const generateOpenRouterResponse = async (
    message: string,
    contextCode: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    config: OpenRouterConfig
): Promise<string> => {
    if (!config.apiKey) {
        return "API Key is missing. Please add your OpenRouter API Key in PROJECT SETTINGS.";
    }

    try {
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.map(m => ({
                role: m.role === 'model' ? 'assistant' : 'user',
                content: m.parts[0].text
            })),
            {
                role: 'user',
                content: `Context:\n${contextCode}\n\nQuestion: ${message}`
            }
        ];

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'HTTP-Referer': 'https://labstx.io', // Optional
                'X-Title': 'LabSTX IDE', // Optional
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.model || 'openai/gpt-4o',
                messages: messages
            })
        });

        if (!response.ok) {
            const error = await response.json();
            return `OpenRouter Error: ${error.error?.message || response.statusText}`;
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response from AI.';
    } catch (error: any) {
        console.error('OpenRouter Error:', error);
        return `Connection Error: ${error.message}`;
    }
};

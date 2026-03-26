/**
 * OpenRouter AI Service
 * Uses OpenRouter's API to access various LLMs
 */

export interface OpenRouterConfig {
    apiKey: string;
    model: string;
    customContext?: string;
}

/**
 * Fetches content from a URL or returns the original context if it's not a URL
 */
const prepareContext = async (context?: string): Promise<string> => {
    if (!context || !context.trim()) return '';
    const trimmed = context.trim();
    if (trimmed.startsWith('http')) {
        try {
            const res = await fetch(trimmed);
            if (!res.ok) return `[Failed to fetch custom context from ${trimmed}]`;
            return await res.text();
        } catch (e) {
            return `[Error fetching custom context from ${trimmed}]`;
        }
    }
    return trimmed;
};

const SYSTEM_PROMPT = `You are LabSTX AI, an advanced coding assistant embedded in the LabSTX IDE for Stacks Blockchain development.
You are an expert in Clarity, Stacks Blockchain, stacks-js, and Hiro developer tools.
Your goal is to help users write secure, efficient Smart Contracts in Clarity.

STACKS TECHNICAL CONTEXT (Hiro LLM Reference):
- Nakamoto Upgrade: Faster blocks (~5s), 100% Bitcoin finality.
- sBTC: Decentralized 1:1 Bitcoin-backed asset on Stacks.
- PoX-4: The latest Proof-of-Transfer iteration (SIP-028).
- Clarity 2.1+: Support for bits-to-int, new-block-height, etc.

IDE CONTEXT:
- This is a browser-based IDE.
- Users can mention files with @path/to/file.
- We use @stacks/clarinet-sdk-browser for local simulation.

FILE OPERATIONS:
If you want to suggest an edit or create a new file, use the following tag format:

[UPDATE_FILE: path/to/filename]
COMPLETE_NEW_CONTENT_HERE
[/UPDATE_FILE]

[CREATE_FILE: path/to/filename]
CONTENT_HERE
[/CREATE_FILE]

RULES:
1. When you suggest an update, PROVIDE THE ENTIRE FILE CONTENT.
2. DO NOT wrap the content of [UPDATE_FILE] or [CREATE_FILE] in markdown code blocks like \`\`\`clarity or \`\`\`. Just provide the raw file content.
3. Always use the full relative path if known (e.g. contracts/my-contract.clar).

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
        const extraContext = await prepareContext(config.customContext);
        const finalSystemPrompt = extraContext ? `${SYSTEM_PROMPT}\n\nADDITIONAL CONTEXT/REFERENCE:\n${extraContext}` : SYSTEM_PROMPT;

        const messages = [
            { role: 'system', content: finalSystemPrompt },
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

export const streamOpenRouterResponse = async (
    message: string,
    contextCode: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    config: OpenRouterConfig,
    onChunk: (text: string) => void
): Promise<void> => {
    if (!config.apiKey) {
        onChunk("API Key is missing. Please add your OpenRouter API Key in PROJECT SETTINGS.");
        return;
    }

    try {
        const extraContext = await prepareContext(config.customContext);
        const finalSystemPrompt = extraContext ? `${SYSTEM_PROMPT}\n\nADDITIONAL CONTEXT/REFERENCE:\n${extraContext}` : SYSTEM_PROMPT;

        const messages = [
            { role: 'system', content: finalSystemPrompt },
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
                'HTTP-Referer': 'https://labstx.io',
                'X-Title': 'LabSTX IDE',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.model || 'openai/gpt-4o',
                messages: messages,
                stream: true
            })
        });

        if (!response.ok) {
            const error = await response.json();
            onChunk(`OpenRouter Error: ${error.error?.message || response.statusText}`);
            return;
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Response body is null");

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                    const dataStr = line.trim().slice(6);
                    if (dataStr === '[DONE]') break;
                    try {
                        const data = JSON.parse(dataStr);
                        const content = data.choices[0]?.delta?.content;
                        if (content) onChunk(content);
                    } catch (e) { }
                }
            }
        }
    } catch (error: any) {
        console.error('OpenRouter Streaming Error:', error);
        onChunk(`Connection Error: ${error.message}`);
    }
};

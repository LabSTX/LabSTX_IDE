/**
 * ChainGPT Web3 LLM Service
 * Uses ChainGPT's REST API for Web3-aware AI assistance
 */

export type AIProvider = 'gemini' | 'chaingpt';

interface ChainGPTResponse {
    status: boolean;
    message: string;
    data?: {
        bot: string;
    };
}

const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const SESSION_ID = generateUUID();

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

export const generateChainGPTResponse = async (
    message: string,
    contextCode: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[]
): Promise<string> => {
    const apiKey = "CHAINGPT_API_KEY_PLACEHOLDER"; // Should be moved to settings ideally

    try {
        const fullQuestion = `${SYSTEM_PROMPT}\n\nCurrent Code Context:\n${contextCode}\n\nUser Question: ${message}`;

        const contextInjection = {
            companyName: "LabSTX",
            companyDescription: "A Web3 IDE for Stacks blockchain smart contract development.",
            purpose: "To assist developers with Clarity smart contract development.",
            cryptoToken: true,
            tokenInformation: {
                tokenName: "Stacks",
                tokenSymbol: "STX",
                blockchain: ["STACKS"]
            },
            aiTone: "PRE_SET_TONE",
            selectedTone: "PROFESSIONAL"
        };

        const response = await fetch('https://api.chaingpt.org/chat/stream', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.CHAINGPT_API_KEY || ''}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'general_assistant',
                question: fullQuestion,
                chatHistory: 'on',
                sdkUniqueId: SESSION_ID,
                useCustomContext: true,
                contextInjection: contextInjection
            })
        });

        if (!response.ok) {
            return `ChainGPT Error: ${response.statusText}`;
        }

        const responseText = await response.text();
        return responseText.trim() || "No response generated.";
    } catch (error: any) {
        return `Connection Error: ${error.message}`;
    }
};

export const streamChainGPTResponse = async (
    message: string,
    contextCode: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    onChunk: (text: string) => void
): Promise<void> => {
    try {
        const fullQuestion = `${SYSTEM_PROMPT}\n\nCurrent Code Context:\n${contextCode}\n\nUser Question: ${message}`;

        const contextInjection = {
            companyName: "LabSTX",
            companyDescription: "A Web3 IDE for Stacks blockchain smart contract development.",
            purpose: "To assist developers with Clarity smart contract development.",
            cryptoToken: true,
            tokenInformation: {
                tokenName: "Stacks",
                tokenSymbol: "STX",
                blockchain: ["STACKS"]
            },
            aiTone: "PRE_SET_TONE",
            selectedTone: "PROFESSIONAL"
        };

        const response = await fetch('https://api.chaingpt.org/chat/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'general_assistant',
                question: fullQuestion,
                chatHistory: 'on',
                sdkUniqueId: SESSION_ID,
                useCustomContext: true,
                contextInjection: contextInjection
            })
        });

        if (!response.ok) {
            onChunk(`ChainGPT Error: ${response.statusText}`);
            return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
            const text = await response.text();
            onChunk(text);
            return;
        }

        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            onChunk(chunk);
        }
    } catch (error: any) {
        onChunk(`Connection Error: ${error.message}`);
    }
};

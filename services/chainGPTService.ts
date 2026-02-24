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

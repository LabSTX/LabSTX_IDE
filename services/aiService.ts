/**
 * Unified AI Service
 * Manages AI providers (ChainGPT Web3 LLM)
 */

import { generateOpenRouterResponse, OpenRouterConfig, streamOpenRouterResponse } from './openRouterService';

export const generateAIResponse = async (
    message: string,
    contextCode: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    config?: { 
        provider: 'openrouter', 
        openRouter?: OpenRouterConfig
    },
    wallet?: string
): Promise<string> => {
    if (config?.provider === 'openrouter' && config.openRouter) {
        console.log(`🤖 Using AI Provider: OpenRouter (${config.openRouter.model})`);
        return generateOpenRouterResponse(message, contextCode, history, config.openRouter);
    }

    // Default to OpenRouter with generic config if possible, or throw error
    console.error(`🤖 AI Provider not configured correctly. Expected openrouter.`);
    return "AI configuration error: Please check your settings.";
};

export const streamAIResponse = async (
    message: string,
    contextCode: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    config: { 
        provider: 'openrouter', 
        openRouter?: OpenRouterConfig
    },
    onChunk: (text: string) => void,
    wallet?: string
): Promise<void> => {
    if (config?.provider === 'openrouter' && config.openRouter) {
        console.log(`🤖 Streaming AI Provider: OpenRouter (${config.openRouter.model})`);
        return streamOpenRouterResponse(message, contextCode, history, config.openRouter, onChunk);
    }

    console.error(`🤖 AI Provider not configured correctly for streaming.`);
    onChunk("AI configuration error: Please check your settings.");
};



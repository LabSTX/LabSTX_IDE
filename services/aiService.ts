/**
 * Unified AI Service
 * Manages AI providers (ChainGPT Web3 LLM)
 */

import { generateChainGPTResponse, AIProvider } from './chainGPTService';
import { generateOpenRouterResponse, OpenRouterConfig } from './openRouterService';

export type { AIProvider };

export const generateAIResponse = async (
    message: string,
    contextCode: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    config?: { provider: 'chaingpt' | 'openrouter', openRouter?: OpenRouterConfig }
): Promise<string> => {
    if (config?.provider === 'openrouter' && config.openRouter) {
        console.log(`🤖 Using AI Provider: OpenRouter (${config.openRouter.model})`);
        return generateOpenRouterResponse(message, contextCode, history, config.openRouter);
    }

    // Default to ChainGPT
    console.log(`🤖 Using AI Provider: ChainGPT`);
    return generateChainGPTResponse(message, contextCode, history);
};



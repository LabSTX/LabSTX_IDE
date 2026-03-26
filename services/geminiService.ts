export const generateGeminiResponse = async (
  message: string,
  contextCode: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  config: { apiKey: string; model: string },
  wallet?: string
): Promise<string> => {
  if (!config.apiKey) {
    return "Error: Gemini API Key is missing. Please add it in PROJECT SETTINGS.";
  }

  try {
    // Determine backend URL (matches logic in App.tsx)
    const backendUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:5001'
        : window.location.origin.replace('3000', '5001');

    const response = await fetch(`${backendUrl}/ide-api/ai/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        contextCode,
        history,
        config,
        wallet
      })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Backend proxy error');
    }

    const data = await response.json();
    return data.text || "No response generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Gemini Error: ${error.message || "I encountered an error processing your request."}`;
  }
};

export const streamGeminiResponse = async (
  message: string,
  contextCode: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  config: { apiKey: string; model: string },
  onChunk: (text: string) => void,
  wallet?: string
): Promise<void> => {
  if (!config.apiKey) {
    onChunk("Error: Gemini API Key is missing. Please add it in PROJECT SETTINGS.");
    return;
  }

  try {
    const backendUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:5001'
        : window.location.origin.replace('3000', '5001');

    const response = await fetch(`${backendUrl}/ide-api/ai/gemini/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        contextCode,
        history,
        config
      })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Backend proxy error');
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
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            if (data.error) {
              onChunk(`\nError: ${data.error}`);
            } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
              onChunk(data.candidates[0].content.parts[0].text);
            }
          } catch (e) {
            // Partial JSON or other format - ignore for now as Gemini/SSE can be complex
          }
        }
      }
    }
  } catch (error: any) {
    console.error("Gemini Streaming Error:", error);
    onChunk(`\nGemini Error: ${error.message || "I encountered an error processing your request."}`);
  }
};

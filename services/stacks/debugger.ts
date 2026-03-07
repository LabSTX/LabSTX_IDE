import { CompilationResult } from '../../types';

export interface DebugLine {
    id: string;
    type: 'input' | 'output' | 'error';
    content: string;
}

export interface TraceStep {
    depth: number;
    contract: string;
    function: string;
    args: string[];
    result?: string;
    spent: number;
}

export interface StateVar {
    name: string;
    type: string;
    value: string;
}

/**
 * Clarity Debugger (Backend-powered)
 * This service handles REPL execution and state inspection by calling the Node.js backend.
 */
export class ClarityDebugger {
    /**
     * Executes a Clarity expression via the backend Simnet
     */
    static async execute(
        sessionId: string,
        expression: string,
        contractContext?: { code: string; name: string }
    ): Promise<{ output: string; success: boolean; trace?: TraceStep[]; state?: StateVar[] }> {
        try {

            // 2. Execute the snippet
            const response = await fetch('/ide-api/clarity/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snippet: expression, sessionId })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Execution failed');
            }

            const result = await response.json();

            return {
                success: result.success,
                output: result.result,
                trace: [] // Trace implementation can be added to backend
            };
        } catch (error: any) {
            console.error('[Debugger] Backend execution error:', error);
            return {
                success: false,
                output: `Error: ${error.message}`
            };
        }
    }

    /**
     * Gets state data from the backend
     */
    static async getDebugData(
        sessionId: string,
        code: string,
        contractName: string
    ): Promise<{ state: StateVar[]; trace: TraceStep[] }> {
        try {

            // Fetch state for this specific contract
            const response = await fetch('/ide-api/clarity/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contractName, sessionId })
            });

            if (!response.ok) {
                // Return gracefully if workspace expired, let frontend resync later
                if (response.status === 404) return { state: [], trace: [] };
                throw new Error('State fetch failed');
            }

            const result = await response.json();

            return {
                state: result.state && result.state.length > 0 ? result.state : [
                    { name: 'Simnet Status', type: 'system', value: 'Connected to Backend' },
                    { name: 'Block Height', type: 'uint', value: result.blockHeight?.toString() || '0' },
                    { name: 'Deployer', type: 'principal', value: result.deployer || '...' }
                ],
                trace: []
            };
        } catch (error) {
            console.error('[Debugger] Failed to get state:', error);
            return { state: [], trace: [] };
        }
    }
}

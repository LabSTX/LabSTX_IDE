import { CompilationResult } from '../../types';
import { getSimnet } from './simnet';

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

export class ClarityDebugger {
    /**
     * Executes a Clarity expression locally in the browser simnet
     */
    static async execute(
        expression: string,
        contractContext?: { code: string; name: string }
    ): Promise<{ output: string; success: boolean; trace?: TraceStep[]; state?: StateVar[] }> {
        try {
            const simnet = await getSimnet();
            const deployer = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

            // If context provided, ensure the contract is available in the simnet
            if (contractContext) {
                try {
                    simnet.deployContract(contractContext.name, contractContext.code, deployer);
                } catch (e) {
                    // Might be already deployed, which is fine
                }
            }

            // runSnippet returns the evaluation result
            const result = simnet.runSnippet(expression);

            return {
                success: true,
                output: result.toString(), // Simplified conversion
                trace: [] // SDK-browser trace extraction might be more complex
            };
        } catch (error: any) {
            console.error('Clarity local debug error:', error);
            return {
                success: false,
                output: error.message || 'Execution failed'
            };
        }
    }

    /**
     * Gets the current state for a specific contract locally
     */
    static async getDebugData(
        code: string,
        contractName: string
    ): Promise<{ state: StateVar[]; trace: TraceStep[] }> {
        try {
            const simnet = await getSimnet();
            const deployer = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

            // Ensure contract is deployed to analyze it
            const normalizedName = contractName.replace(/\.clar$/, '');
            let contract;
            try {
                contract = simnet.deployContract(normalizedName, code, deployer);
            } catch (e) {
                // If it exists, retrieve it
                contract = simnet.getContractInterface(`${deployer}.${normalizedName}`);
            }

            // Extract "state" - Clarinet SDK might have better ways, 
            // but we'll try to get variables if possible.
            // This is a simplified version using the interface.
            const state: StateVar[] = [];
            if (contract && contract.variables) {
                for (const v of contract.variables) {
                    try {
                        const val = simnet.getDataVar(normalizedName, v.name, deployer);
                        state.push({
                            name: v.name,
                            type: v.type,
                            value: val.toString()
                        });
                    } catch (e) {
                        state.push({ name: v.name, type: v.type, value: '(unknown)' });
                    }
                }
            }

            return {
                state: state.length > 0 ? state : [
                    { name: 'Loading...', type: 'status', value: 'Simnet ready' }
                ],
                trace: []
            };
        } catch (error: any) {
            console.error('Clarity local analyze error:', error);
            return {
                state: [],
                trace: []
            };
        }
    }
}

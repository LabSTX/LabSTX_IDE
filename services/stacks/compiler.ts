import { CompilationResult, ContractMetadata, EntryPoint, EntryPointArg } from '../../types';
import { getSimnet } from './simnet';

/**
 * Stacks Clarity Compiler/Checker Service
 */
export class ClarityCompiler {
    static async check(
        code: string,
        contractName: string
    ): Promise<CompilationResult> {
        try {
            console.log(`Checking Clarity contract: ${contractName} locally...`);

            const simnet = await getSimnet();

            // In Clarinet SDK, deploying a contract acts as a check.
            // We use a dummy address for checking
            const deployer = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

            try {
                // For a "check", we can just try to deploy it. 
                // If it's already there, we might need to handle that, 
                // but usually for an IDE we want to re-validate.
                // Simnet allows multiple deployments or we can use a unique name.
                const checkName = `${contractName.replace(/\.clar$/, '')}_check_${Date.now()}`;

                // deployContract returns the contract interface if successful, or throws if not.
                simnet.deployContract(checkName, code, deployer);

                const entryPoints = this.extractEntryPoints(code);
                return {
                    success: true,
                    warnings: [],
                    metadata: {
                        entryPoints,
                        contractType: 'clarity'
                    }
                };
            } catch (error: any) {
                return {
                    success: false,
                    errors: [error.message || 'Validation failed']
                };
            }
        } catch (error: any) {
            console.error('Clarity local check error:', error);
            return this.checkLocalFallback(code, contractName);
        }
    }

    private static checkLocalFallback(code: string, contractName: string): CompilationResult {
        const errors: string[] = [];

        // Very basic Lisp-style parenthesis matching
        const openParens = (code.match(/\(/g) || []).length;
        const closeParens = (code.match(/\)/g) || []).length;

        if (openParens !== closeParens) {
            errors.push(`Parenthesis mismatch: ${openParens} open vs ${closeParens} closed.`);
        }

        if (errors.length > 0) {
            return { success: false, errors };
        }

        const entryPoints = this.extractEntryPoints(code);
        return {
            success: true,
            warnings: ['Offline check: limited validation available'],
            metadata: {
                entryPoints,
                contractType: 'clarity'
            }
        };
    }

    private static extractEntryPoints(code: string): EntryPoint[] {
        const entryPoints: EntryPoint[] = [];

        // Regex for (define-public (name args) ...)
        const publicFnRegex = /\(define-public\s+\(([\w-]+)\s*([^)]*)\)/g;
        let match;

        while ((match = publicFnRegex.exec(code)) !== null) {
            const name = match[1];
            const argsStr = match[2] || '';

            const args: EntryPointArg[] = [];
            const argRegex = /\(([\w-]+)\s+([\w-]+)\)/g;
            let argMatch;
            while ((argMatch = argRegex.exec(argsStr)) !== null) {
                args.push({
                    name: argMatch[1],
                    type: argMatch[2]
                });
            }

            entryPoints.push({
                name,
                args,
                access: 'Public',
                ret: 'response' // Clarity public functions siempre devuelven un response
            });
        }

        // Regex for (define-read-only (name args) ...)
        const readOnlyFnRegex = /\(define-read-only\s+\(([\w-]+)\s*([^)]*)\)/g;
        while ((match = readOnlyFnRegex.exec(code)) !== null) {
            const name = match[1];
            const argsStr = match[2] || '';
            const args: EntryPointArg[] = [];
            const argRegex = /\(([\w-]+)\s+([\w-]+)\)/g;
            let argMatch;
            while ((argMatch = argRegex.exec(argsStr)) !== null) {
                args.push({
                    name: argMatch[1],
                    type: argMatch[2]
                });
            }

            entryPoints.push({
                name,
                args,
                access: 'Public', // Read-only is public in access terms
                ret: 'any'
            });
        }

        return entryPoints;
    }
}

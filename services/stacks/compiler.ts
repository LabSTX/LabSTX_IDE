import { CompilationResult, ContractMetadata, EntryPoint, EntryPointArg } from '../../types';

/**
 * Stacks Clarity Compiler/Checker Service (Backend-powered)
 */
export class ClarityCompiler {
    static async check(
        code: string,
        contractName: string
    ): Promise<CompilationResult> {
        try {
            console.log(`[Compiler] Checking ${contractName} via backend...`);

            const response = await fetch('/ide-api/clarity/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, name: contractName })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.errors?.[0] || 'Verification failed');
            }

            const result = await response.json();
            return {
                success: result.success,
                warnings: [],
                metadata: result.metadata || {
                    entryPoints: this.extractEntryPoints(code),
                    contractType: 'clarity'
                },
                errors: result.errors || []
            };
        } catch (error: any) {
            console.error('[Compiler] Backend error:', error);
            return {
                success: false,
                errors: [error.message || 'Validation failed']
            };
        }
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
                ret: 'response'
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
                access: 'Public',
                ret: 'any'
            });
        }

        return entryPoints;
    }
}

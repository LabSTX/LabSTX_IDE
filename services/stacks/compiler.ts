import { CompilationResult, ContractMetadata, EntryPoint, EntryPointArg } from '../../types';

/**
 * Stacks Clarity Compiler/Checker Service (Backend-powered)
 */
export class ClarityCompiler {
    static async initWorkspace(
        sessionId: string,
        zipBlob: Blob
    ): Promise<CompilationResult> {
        try {
            console.log(`[Compiler] Initializing workspace via full sync...`);

            const formData = new FormData();
            formData.append('sessionId', sessionId);
            formData.append('workspace', zipBlob, 'workspace.zip');

            const response = await fetch('/ide-api/project/init', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.errors?.[0] || 'Verification failed');
            }

            const result = await response.json();
            return {
                success: result.success,
                warnings: [],
                metadata: {
                    entryPoints: [], // Entry points can be parsed fully later if needed
                    contractType: 'clarity'
                },
                errors: result.errors || []
            };
        } catch (error: any) {
            console.error('[Compiler] Backend error (init):', error);
            return {
                success: false,
                errors: [error.message || 'Validation failed']
            };
        }
    }

    static async updateWorkspace(
        sessionId: string,
        changedFiles: Record<string, string>,
        deletedPaths?: string[],
        renames?: { from: string, to: string }[]
    ): Promise<CompilationResult> {
        try {
            console.log(`[Compiler] Updating workspace via delta sync...`);

            const response = await fetch('/ide-api/project/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, changedFiles, deletedPaths, renames })
            });

            if (!response.ok) {
                const error = await response.json();
                if (response.status === 404 && error.error?.includes('Workspace expired')) {
                    throw new Error('WORKSPACE_EXPIRED');
                }
                throw new Error(error.errors?.[0] || 'Verification failed');
            }

            const result = await response.json();
            return {
                success: result.success,
                warnings: [],
                metadata: {
                    entryPoints: [],
                    contractType: 'clarity'
                },
                errors: result.errors || []
            };
        } catch (error: any) {
            if (error.message === 'WORKSPACE_EXPIRED') {
                throw error; // Re-throw to be caught by the frontend 404 fallback mechanism
            }
            console.error('[Compiler] Backend error (update):', error);
            return {
                success: false,
                errors: [error.message || 'Validation failed']
            };
        }
    }


    static async getWorkspaceFiles(
        sessionId: string
    ): Promise<Record<string, string>> {
        const response = await fetch(`/ide-api/project/files/${sessionId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch workspace files (Status: ${response.status})`);
        }
        const data = await response.json();
        return data.files || {};
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

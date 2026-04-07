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

    public static extractEntryPoints(code: string): EntryPoint[] {
        // Pre-process to strip comments and strings to avoid false positives
        const cleanCode = code
            .replace(/;;.*$/gm, '') // Strip comments
            .replace(/"[^"]*"/g, '""'); // Replace string content with empty string

        const entryPoints: EntryPoint[] = [];

        // Helper to extract functions by keyword (define-public, define-read-only)
        const extractByKeyword = (keyword: string, access: 'Public' | 'ReadOnly') => {
            let pos = 0;
            while (pos < cleanCode.length) {
                const keywordIndex = cleanCode.indexOf(`(${keyword}`, pos);
                if (keywordIndex === -1) break;

                // Find the start of the (name args) block
                const startOfSignature = cleanCode.indexOf('(', keywordIndex + keyword.length);
                if (startOfSignature === -1) {
                    pos = keywordIndex + keyword.length;
                    continue;
                }

                // Find matching ')' for the (name args) block
                let depth = 0;
                let endOfSignature = -1;
                for (let i = startOfSignature; i < cleanCode.length; i++) {
                    if (cleanCode[i] === '(') depth++;
                    else if (cleanCode[i] === ')') depth--;
                    if (depth === 0) {
                        endOfSignature = i;
                        break;
                    }
                }

                if (endOfSignature === -1) {
                    pos = keywordIndex + keyword.length;
                    continue;
                }

                const signature = cleanCode.substring(startOfSignature + 1, endOfSignature).trim();
                const firstSpace = signature.search(/\s/);
                const name = firstSpace === -1 ? signature : signature.substring(0, firstSpace).trim();
                const argsStr = firstSpace === -1 ? "" : signature.substring(firstSpace).trim();

                const args: EntryPointArg[] = [];
                let argPos = 0;
                while (argPos < argsStr.length) {
                    const argStart = argsStr.indexOf('(', argPos);
                    if (argStart === -1) break;

                    let argDepth = 0;
                    let argEnd = -1;
                    for (let i = argStart; i < argsStr.length; i++) {
                        if (argsStr[i] === '(') argDepth++;
                        else if (argsStr[i] === ')') argDepth--;
                        if (argDepth === 0) {
                            argEnd = i;
                            break;
                        }
                    }
                    if (argEnd === -1) break;

                    const argFull = argsStr.substring(argStart + 1, argEnd).trim();
                    const spaceIndex = argFull.search(/\s/);
                    if (spaceIndex !== -1) {
                        args.push({
                            name: argFull.substring(0, spaceIndex).trim(),
                            type: argFull.substring(spaceIndex).trim()
                        });
                    }
                    argPos = argEnd + 1;
                }

                entryPoints.push({
                    name,
                    args: args.map(arg => ({
                        name: arg.name,
                        type: this.parseClarityType(arg.type as string)
                    })),
                    access,
                    ret: access === 'Public' ? 'response' : 'any'
                });

                pos = endOfSignature + 1;
            }
        };

        extractByKeyword('define-public', 'Public');
        extractByKeyword('define-read-only', 'ReadOnly');

        return entryPoints;
    }

    /**
     * Internal helper to parse a Clarity type string into a structured object
     * e.g. "{ version: (buff 1), hashbytes: (buff 32) }" -> { tuple: [...] }
     */
    private static parseClarityType(typeStr: string): any {
        const trimmed = typeStr.trim();
        
        // Handle Tuples: { field1: type1, field2: type2 }
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            const inner = trimmed.substring(1, trimmed.length - 1).trim();
            const fields: EntryPointArg[] = [];
            
            // Basic parsing of "name: type" pairs, handling nested parentheses
            let currentField = '';
            let depth = 0;
            for (let i = 0; i < inner.length; i++) {
                const char = inner[i];
                if (char === '(' || char === '{') depth++;
                else if (char === ')' || char === '}') depth--;
                
                if (char === ',' && depth === 0) {
                    fields.push(this.parseTupleField(currentField));
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
            if (currentField.trim()) {
                fields.push(this.parseTupleField(currentField));
            }
            
            return { tuple: fields };
        }
        
        // Handle Buffers: (buff 32)
        if (trimmed.startsWith('(buff ') && trimmed.endsWith(')')) {
            return { buffer: { length: parseInt(trimmed.replace('(buff ', '').replace(')', '')) } };
        }

        // Default: return as string for simple types (uint, principal, etc)
        return trimmed;
    }

    private static parseTupleField(fieldStr: string): EntryPointArg {
        const firstColon = fieldStr.indexOf(':');
        if (firstColon === -1) {
            return { name: fieldStr.trim(), type: 'any' };
        }
        return {
            name: fieldStr.substring(0, firstColon).trim(),
            type: this.parseClarityType(fieldStr.substring(firstColon + 1))
        };
    }
}

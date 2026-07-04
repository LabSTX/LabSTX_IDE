import { loadWASM } from 'onigasm';
import { Registry } from 'monaco-textmate';
import { wireTmGrammars } from 'monaco-editor-textmate';

import onigWasm from 'onigasm/lib/onigasm.wasm?url';
import clarityTMLanguage from './clarity.tmLanguage.json';

let wasmLoaded = false;

// Basic Dark theme mapped to TM scopes
const themeData = {
    settings: [
        {
            settings: {
                foreground: '#D4D4D4',
                background: '#1E1E1E'
            }
        },
        {
            scope: ['comment.line.semicolon.clarity', 'comment'],
            settings: { foreground: '#6A9955' }
        },
        {
            scope: ['constant.language.clarity', 'keyword.declaration.clarity', 'keyword.control.clarity', 'keyword', 'storage.type.modifier'],
            settings: { foreground: '#569CD6' }
        },
        {
            scope: ['constant.numeric.uint.clarity', 'constant.numeric.int.clarity', 'constant.numeric'],
            settings: { foreground: '#B5CEA8' }
        },
        {
            scope: ['string.quoted.double.clarity', 'string'],
            settings: { foreground: '#CE9178' }
        },
        {
            scope: ['entity.name.function.clarity', 'entity.name.function'],
            settings: { foreground: '#DCDCAA' }
        },
        {
            scope: ['variable.parameter.clarity', 'variable', 'variable.other.clarity'],
            settings: { foreground: '#9CDCFE' }
        },
        {
            scope: ['entity.name.type.clarity', 'entity.name.type', 'entity.name.type.numeric.clarity', 'entity.name.type.principal.clarity', 'entity.name.type.bool.clarity'],
            settings: { foreground: '#4EC9B0' }
        },
        {
            scope: ['constant.other.principal.clarity'],
            settings: { foreground: '#D16969' }
        },
        {
            scope: ['constant.language.bool.clarity', 'constant.language.none.clarity', 'constant.language.some.clarity'],
            settings: { foreground: '#569CD6' }
        }
    ]
};

export async function setupTextMate(monaco: any, editor: any) {
    try {
        // Load WASM from the bundled onigasm asset
        if (!wasmLoaded) {
            await loadWASM(onigWasm);
            wasmLoaded = true;
        }

        const registry = new Registry({
            theme: themeData as any,
            getGrammarDefinition: async (scopeName: string, dependentScope: string): Promise<any> => {
                if (scopeName === 'source.clar') {
                    return {
                        format: 'json',
                        content: clarityTMLanguage as any
                    };
                }
                return null as any;
            }
        });

        const grammars = new Map();
        grammars.set('clarity', 'source.clar');

        await wireTmGrammars(monaco, registry, grammars, editor);
    } catch (e) {
        console.error('Failed to initialize TextMate wrapper', e);
    }
}

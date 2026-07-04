
import React, { useEffect, useRef, useCallback } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import * as monacoLocal from 'monaco-editor';
import {
    initClarityLSP,
    sendManifest,
    sendDidOpen,
    sendDidChange,
    sendDidClose,
    requestHover,
    requestCompletion,
    requestDefinition,
    requestFormatting,
    closeManifest,
    resetLSP,
    attachMonaco,
    sendDidSave,
} from '../../src/lsp/clarityClient';
import { setupTextMate } from '../../src/lsp/textmate';
import languageConfiguration from '../../src/lsp/language-configuration.json';

let providersRegistered = false;

// Global LSP promise — shared across remounts so we don't re-init unnecessarily
let lspReadyPromise: Promise<void> | null = null;

let completionGeneration = 0;

// ─── Debounce budgets ────────────────────────────────────────────────────────
//
//  Three tiers — ordered by user-visibility impact:
//
//  1. ONCHANGE (150 ms)  — parent state update.  Fast enough to feel instant
//     while still batching rapid keystrokes, so the parent never re-renders on
//     every character.
//
//  2. LSP_CHANGE (500 ms) — sendDidSave sync.  Triggers a full project re-check
//     in the WASM core; needs a longer budget than a cheap incremental sync to
//     avoid hammering the single-locked WASM core on every keystroke.
//
//  3. TEXTMATE (600 ms) — grammar re-application.  setupTextMate re-tokenises
//     the whole document, which is expensive.  Only fire it after a real pause,
//     not during fast typing.  The grammar handles incremental updates natively
//     between these calls.

const ONCHANGE_DEBOUNCE_MS = 150;
const LSP_CHANGE_DEBOUNCE_MS = 800;
const TEXTMATE_DEBOUNCE_MS = 600;

const normalizeLanguageConfiguration = (config: any) => {
    const normalizePairs = (pairs: any) => {
        if (!Array.isArray(pairs)) return pairs;
        return pairs.map((pair: any) => {
            if (Array.isArray(pair) && pair.length === 2) {
                return { open: pair[0], close: pair[1] };
            }
            return pair;
        });
    };

    return {
        ...config,
        autoClosingPairs: normalizePairs(config.autoClosingPairs),
        surroundingPairs: normalizePairs(config.surroundingPairs),
    };
};

const normalizeHoverContents = (contents: any): Array<{ value: string }> => {
    if (contents === undefined || contents === null) return [];

    const items = Array.isArray(contents) ? contents : [contents];
    return items.flatMap((item: any) => {
        if (typeof item === 'string') {
            return [{ value: item }];
        }

        if (item && typeof item === 'object') {
            if (typeof item.value === 'string') {
                if (item.kind === 'markdown' || item.kind === 'MarkupContent') {
                    return [{ value: item.value }];
                }
                if (item.language && item.language !== 'markdown') {
                    return [{ value: `\`\`\`${item.language}\n${item.value}\n\`\`\`` }];
                }
                return [{ value: item.value }];
            }
        }

        try {
            return [{ value: JSON.stringify(item) }];
        } catch {
            return [];
        }
    });
};

interface Props {
    code: string;
    filePath?: string;
    activeFilePath?: string;
    manifestFileContent?: string;
    manifestFilePath?: string;
    theme?: 'dark' | 'light';
    language?: string;
    settings?: any;
    action?: any;
    onChange?: (value: string | undefined) => void;
    onSave?: () => void;
    onActionComplete?: () => void;
    findQuery?: string;
    lineEnding?: string;
    onCursorChange?: (position: any) => void;
    activeFileId?: string;
    onFileDrop?: (files: FileList | File[]) => void;
    onRunNodeCommand?: (command: string) => void;
    devnetFileContent?: string;
    onUnassociatedContract?: (path: string) => void;
}

const CodeEditor: React.FC<Props> = ({
    code,
    filePath,
    activeFilePath,
    manifestFileContent,
    devnetFileContent,
    theme = 'dark',
    language,
    onChange,
    onCursorChange,
    onUnassociatedContract,
}) => {
    const monaco = useMonaco();

    useEffect(() => {
        if (monaco) attachMonaco(monaco);
    }, [monaco]);

    const docVersionRef = useRef(1);
    const editorRef = useRef<monacoLocal.editor.IStandaloneCodeEditor | null>(null);

    // ─── Debounce timer handles ───────────────────────────────────────────────
    const textMateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onChangeDebouncedRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lspChangeDebouncedRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const textMateAppliedRef = useRef(false);

    // ─── Ref-based "last value we sent upward" ───────────────────────────────
    //
    //  We need to distinguish between:
    //    (a) `code` changed because the user typed (we sent it via onChange → parent stored it)
    //    (b) `code` changed because the parent set it externally (file load, format, etc.)
    //
    //  In case (a) we must NOT push the value back into Monaco — Monaco already
    //  has it.  In case (b) we must call editor.setValue() to sync.
    //
    //  lastSentValueRef tracks the most recent value we dispatched upward, so
    //  the useEffect below can tell the two cases apart.
    const lastSentValueRef = useRef<string>(code);

    // ─── Ref-stable handles for props used inside long-lived closures ────────
    //
    //  Monaco event listeners are registered once on mount.  If we close over
    //  `onChange` / `onCursorChange` directly those closures would hold stale
    //  references when the parent re-renders with new callbacks.  Storing props
    //  in refs and always reading the ref inside the listener keeps callbacks
    //  fresh without re-registering the listener.
    const onChangeRef = useRef(onChange);
    const onCursorChangeRef = useRef(onCursorChange);

    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { onCursorChangeRef.current = onCursorChange; }, [onCursorChange]);

    // ─── Ref-stable contractUri for closures ─────────────────────────────────
    //
    //  LSP calls inside onDidChangeModelContent need the current contractUri,
    //  but the listener is registered once on mount with the URI at that point.
    //  Storing it in a ref lets the listener always pick up the latest path.
    const contractUriRef = useRef('');

    const safePath = activeFilePath || filePath;
    const isClarity = !!safePath && safePath.toLowerCase().endsWith('.clar');
    const languageId = isClarity ? 'clarity' : (language || 'plaintext');
    const contractUri = safePath ? `file:///${safePath.startsWith('/') ? safePath.slice(1) : safePath}` : '';
    const contractRelPath = safePath ? safePath.replace(/^\//, '') : '';
    const manifestContent = manifestFileContent ?? '';

    useEffect(() => {
        contractUriRef.current = contractUri;
    }, [contractUri]);

    const onUnassociatedContractRef = useRef(onUnassociatedContract);
    useEffect(() => { onUnassociatedContractRef.current = onUnassociatedContract; }, [onUnassociatedContract]);

    useEffect(() => {
        if (!isClarity || !manifestContent || !contractRelPath) return;

        const paths: string[] = [];
        const lines = manifestContent.split('\n');
        let inContractsSection = false;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('[')) {
                inContractsSection = trimmed.startsWith('[contracts');
            } else if (inContractsSection && trimmed.startsWith('path')) {
                const match = trimmed.match(/path\s*=\s*['"]([^'"]+)['"]/);
                if (match && match[1]) {
                    paths.push(match[1]);
                }
            }
        }

        const normalizedRelPath = contractRelPath.replace(/\\/g, '/');
        const isAssociated = paths.some(p => normalizedRelPath.endsWith(p.replace(/\\/g, '/')));

        if (!isAssociated && onUnassociatedContractRef.current) {
            onUnassociatedContractRef.current(contractRelPath);
        }
    }, [contractRelPath, manifestContent, isClarity]);

    // ─── 1. Register Clarity language config ─────────────────────────────────
    useEffect(() => {
        if (!monaco || !isClarity) return;
        const hasClarity = monaco.languages.getLanguages().some((lang) => lang.id === 'clarity');
        if (!hasClarity) monaco.languages.register({ id: 'clarity' });
        monaco.languages.setLanguageConfiguration(
            'clarity',
            normalizeLanguageConfiguration(languageConfiguration) as any
        );
    }, [monaco, isClarity]);

    // ─── 2. Boot LSP eagerly ─────────────────────────────────────────────────
    useEffect(() => {
        if (!isClarity) return;

        docVersionRef.current = 1;
        textMateAppliedRef.current = false;

        const setupLSP = async (retry = true): Promise<void> => {
            try {
                await initClarityLSP();
                await sendManifest(manifestContent, { [contractUri]: code }, devnetFileContent, contractRelPath);
                await sendDidOpen(contractUri, 'clarity', docVersionRef.current, code);
                console.debug('[CodeEditor] LSP ready for', contractUri);
            } catch (err) {
                console.error('[CodeEditor] LSP Error:', err);
                if (retry) {
                    console.log('[CodeEditor] Retrying LSP initialization...');
                    resetLSP();
                    return setupLSP(false);
                }
            }
        };

        lspReadyPromise = setupLSP();

        return () => {
            sendDidClose(contractUri);
            closeManifest();
            lspReadyPromise = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contractUri, manifestContent, isClarity]);

    // ─── 3. Sync EXTERNAL code changes into the editor ───────────────────────
    //
    //  This is the intentional counterpart to going uncontrolled.
    //
    //  When the parent changes `code` for a reason OTHER than the user typing
    //  (e.g. file load, auto-format, template insert), we need to push the new
    //  value into Monaco.  But when `code` changed because WE sent it via
    //  onChange, pushing it back would:
    //    • reset the cursor to position 0 (editor.setValue resets selection)
    //    • trigger another onDidChangeModelContent → infinite loop
    //
    //  The guard `code === lastSentValueRef.current` short-circuits case (a).
    //  Only genuinely external updates reach editor.setValue().
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        // This value came from us — do nothing.
        if (code === lastSentValueRef.current) return;

        // External update: sync into Monaco while preserving cursor position.
        lastSentValueRef.current = code;
        const currentEditorValue = editor.getValue();
        if (currentEditorValue === code) return; // already in sync, bail early

        const position = editor.getPosition();
        editor.setValue(code);

        if (position) {
            const lineCount = editor.getModel()?.getLineCount() ?? 1;
            editor.setPosition({
                lineNumber: Math.min(position.lineNumber, lineCount),
                column: position.column,
            });
        }
    }, [code]);

    // ─── 4. Debounced TextMate application ───────────────────────────────────
    const scheduleTextMate = useCallback(() => {
        if (!monaco || !isClarity) return;
        if (textMateTimerRef.current !== null) clearTimeout(textMateTimerRef.current);

        textMateTimerRef.current = setTimeout(async () => {
            textMateTimerRef.current = null;
            const editor = editorRef.current;
            if (!editor) return;
            try {
                await setupTextMate(monaco, editor);
                textMateAppliedRef.current = true;
                console.debug('[CodeEditor] TextMate grammar applied');
            } catch (err) {
                console.debug('[CodeEditor] TextMate setup failed:', err);
            }
        }, TEXTMATE_DEBOUNCE_MS);
    }, [monaco, isClarity]);

    // ─── 5. Editor mount ─────────────────────────────────────────────────────
    const handleMount = useCallback(async (
        editor: monacoLocal.editor.IStandaloneCodeEditor
    ) => {
        if (!monaco) return;
        attachMonaco(monaco);
        editorRef.current = editor;

        // Seed lastSentValueRef with what the editor actually holds right now
        // (it was initialised from `defaultValue`, which equals `code` at mount).
        lastSentValueRef.current = editor.getValue();

        if (isClarity) {
            if (!monaco.languages.getLanguages().find(l => l.id === 'clarity')) {
                monaco.languages.register({ id: 'clarity' });
            }

            // ── Register language providers (once per session) ───────────────
            if (!providersRegistered) {
                providersRegistered = true;

                // Hover -------------------------------------------------------
                monaco.languages.registerHoverProvider('clarity', {
                    provideHover: async (model, position) => {
                        if (lspReadyPromise) {
                            try { await lspReadyPromise; } catch { /* already logged */ }
                        }

                        const uri = model.uri.toString();
                        const useLine = position.lineNumber;
                        const useCol = position.column;

                        console.debug('[CodeEditor] Hover at', useLine, useCol);

                        let res: any;
                        try {
                            res = await Promise.race([
                                requestHover(uri, useLine - 1, useCol - 1),
                                new Promise<null>((_, reject) =>
                                    setTimeout(() => reject(new Error('hover timeout')), 1500)
                                )
                            ]);
                        } catch (err) {
                            console.debug('[CodeEditor] Hover error/timeout:', err);
                            res = null;
                        }

                        const hoverItems = Array.isArray(res) ? res : [res];
                        let contents = hoverItems.flatMap((item: any) =>
                            normalizeHoverContents(item?.contents)
                        );

                        if (contents.length === 0) return null;

                        const rangeSource = hoverItems.find((item: any) => item?.range);
                        const normalizedRange = rangeSource?.range;

                        if (!normalizedRange) return { contents };

                        return {
                            range: new monaco.Range(
                                normalizedRange.start.line + 1, normalizedRange.start.character + 1,
                                normalizedRange.end.line + 1, normalizedRange.end.character + 1
                            ),
                            contents
                        };
                    }
                });

                // Completion --------------------------------------------------
                monaco.languages.registerCompletionItemProvider('clarity', {
                    provideCompletionItems: async (model, position) => {
                        const myGen = ++completionGeneration;
                        if (lspReadyPromise) {
                            try { await lspReadyPromise; } catch { /* already logged */ }
                        }
                        try {
                            const res = await requestCompletion(
                                model.uri.toString(), position.lineNumber - 1, position.column - 1
                            );
                            if (myGen !== completionGeneration) return { suggestions: [] };
                            const items = Array.isArray(res) ? res : (res?.items ?? []);
                            if (!items.length) return { suggestions: [] };
                            return {
                                suggestions: items.map((item: any) => {
                                    const insertText = item.insertText || item.textEdit?.newText || item.label;
                                    const isSnippet = item.insertTextFormat === 2 || insertText.includes('${');
                                    return {
                                        label: item.label,
                                        kind: item.kind,
                                        insertText: insertText,
                                        insertTextRules: isSnippet
                                            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                                            : undefined,
                                        documentation: item.documentation,
                                        detail: item.detail
                                    };
                                })
                            };
                        } catch (err) {
                            console.debug('[CodeEditor] Completion failed', err);
                            return { suggestions: [] };
                        }
                    }
                });

                // Definition --------------------------------------------------
                monaco.languages.registerDefinitionProvider('clarity', {
                    provideDefinition: async (model, position) => {
                        if (lspReadyPromise) {
                            try { await lspReadyPromise; } catch { /* already logged */ }
                        }
                        try {
                            const res = await requestDefinition(
                                model.uri.toString(), position.lineNumber - 1, position.column - 1
                            );
                            if (!res) return null;
                            const loc = Array.isArray(res) ? res[0] : res;
                            if (!loc) return null;
                            return {
                                uri: monaco.Uri.parse(loc.uri),
                                range: new monaco.Range(
                                    loc.range.start.line + 1, loc.range.start.character + 1,
                                    loc.range.end.line + 1, loc.range.end.character + 1
                                )
                            };
                        } catch (err) {
                            console.debug('[CodeEditor] Definition failed', err);
                            return null;
                        }
                    }
                });

                // Formatting --------------------------------------------------
                monaco.languages.registerDocumentFormattingEditProvider('clarity', {
                    provideDocumentFormattingEdits: async (model) => {
                        if (lspReadyPromise) {
                            try { await lspReadyPromise; } catch { /* already logged */ }
                        }
                        try {
                            const res = await requestFormatting(model.uri.toString());
                            if (!res) return [];
                            return res.map((edit: any) => ({
                                range: new monaco.Range(
                                    edit.range.start.line + 1, edit.range.start.character + 1,
                                    edit.range.end.line + 1, edit.range.end.character + 1
                                ),
                                text: edit.newText
                            }));
                        } catch (err) {
                            console.debug('[CodeEditor] Formatting failed', err);
                            return [];
                        }
                    }
                });
            }
        }

        // ── Content change listener ────────────────────────────────────────────
        //
        //  This replaces the old `onChange` prop on <Editor>.
        //
        //  Why?  The `value` controlled prop creates a React round-trip:
        //    type → onChange → parent setState → re-render → value prop back
        //    into Monaco → Monaco model update.
        //
        //  That loop adds latency (React scheduler + diffing) between a
        //  keypress and the model being "stable", which is perceivable as
        //  lag and can cause cursor glitches if the re-render lands while
        //  the user is mid-gesture.
        //
        //  Monaco's own text buffer is always authoritative.  We listen to
        //  it here and propagate outward with appropriate debouncing — parent
        //  state is a *cache* of Monaco's buffer, not the other way around.
        //
        //  IMPORTANT: Registered for ALL file types, not just Clarity.
        //  This enables dirty file tracking for markdown, JSON, etc.
        const contentDisposable = editor.onDidChangeModelContent(() => {
            const value = editor.getValue();
            const uri = contractUriRef.current;
            docVersionRef.current += 1;

            const currentDocVersion = docVersionRef.current;

            // Tier 1 — parent state (150 ms) ──────────────────────────────────
            //  Short enough to feel instant, long enough to coalesce bursts
            //  of characters into single setState calls.
            //  Runs for ALL file types to enable dirty tracking.
            if (onChangeDebouncedRef.current) clearTimeout(onChangeDebouncedRef.current);
            onChangeDebouncedRef.current = setTimeout(() => {
                if (isClarity) {
                    sendDidChange(uri, currentDocVersion, value);
                }
                lastSentValueRef.current = value; // mark before calling onChange
                onChangeRef.current?.(value);
            }, ONCHANGE_DEBOUNCE_MS);

            // Tier 2 — sendDidSave (500 ms) ───────────────────────────────────
            //  Triggers a full project re-check in the WASM core, which causes
            //  the LSP to emit publishDiagnostics.  Longer budget than a cheap
            //  incremental sync to avoid hammering the single-locked WASM core.
            //  Only runs for Clarity files.
            if (isClarity) {
                if (lspChangeDebouncedRef.current) clearTimeout(lspChangeDebouncedRef.current);
                lspChangeDebouncedRef.current = setTimeout(() => {
                    sendDidSave(uri, value).catch((err) =>
                        console.warn('[ClarityLSP] sendDidSave failed', err)
                    );
                }, LSP_CHANGE_DEBOUNCE_MS);
            }

            // Tier 3 — TextMate re-tokenisation (600 ms) ──────────────────────
            //  setupTextMate re-tokenises the whole document.  Only do it
            //  after the user genuinely pauses; the native incremental
            //  tokeniser handles everything in between.
            //  Only runs for Clarity files.
            if (isClarity) {
                scheduleTextMate();
            }
        });

        if (isClarity) {
            // ── Cursor listener ───────────────────────────────────────────────
            try {
                const pos = editor.getPosition();
                if (pos) onCursorChangeRef.current?.({ lineNumber: pos.lineNumber, column: pos.column });

                const cursorDisposable = editor.onDidChangeCursorPosition((e) => {
                    onCursorChangeRef.current?.({ lineNumber: e.position.lineNumber, column: e.position.column });
                });

                editor.onDidDispose(() => {
                    try { contentDisposable.dispose(); } catch { }
                    try { cursorDisposable.dispose(); } catch { }
                });
            } catch (err) {
                console.debug('[CodeEditor] Failed to attach cursor listener', err);
            }

            // ── Initial TextMate pass ─────────────────────────────────────────
            scheduleTextMate();
        } else {
            // ── Cleanup for non-Clarity files ──────────────────────────────────
            //  Still need to dispose contentDisposable to avoid memory leaks
            try {
                editor.onDidDispose(() => {
                    try { contentDisposable.dispose(); } catch { }
                });
            } catch (err) {
                console.debug('[CodeEditor] Failed to attach cleanup listener', err);
            }
        }
    }, [monaco, isClarity, scheduleTextMate]);
    //
    //  Note: onChange / onCursorChange are intentionally NOT in the dep array.
    //  They are accessed via onChangeRef / onCursorChangeRef so the listener
    //  is registered once and always calls the latest callback.

    // ─── 6. Cleanup all timers on unmount ────────────────────────────────────
    useEffect(() => {
        return () => {
            if (textMateTimerRef.current !== null) clearTimeout(textMateTimerRef.current);
            if (onChangeDebouncedRef.current !== null) clearTimeout(onChangeDebouncedRef.current);
            if (lspChangeDebouncedRef.current !== null) clearTimeout(lspChangeDebouncedRef.current);
        };
    }, []);

    return (
        <div className="h-full w-full border border-white/10 overflow-visible">
            <Editor
                height="100%"
                path={contractUri}
                defaultLanguage={languageId}
                defaultValue={code}
                // ↑ KEY: `defaultValue` instead of `value`.
                //
                // `value` is a controlled prop — Monaco React calls
                // editor.setValue() on every render that produces a new `value`
                // string, resetting the cursor and interrupting in-flight IME
                // compositions.
                //
                // `defaultValue` is used only when Monaco creates a new model
                // for this `path`.  After that, Monaco owns its buffer; we
                // push external updates via editor.setValue() in the useEffect
                // above, only when the parent genuinely changed the code from
                // outside.
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                // onChange prop removed — all change handling happens inside
                // onDidChangeModelContent registered in handleMount above.
                onMount={handleMount}
                options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    automaticLayout: true,
                    quickSuggestions: isClarity,
                    wordBasedSuggestions: 'off',
                    hover: isClarity ? { enabled: true, delay: 300 } : { enabled: false },
                }}
            />
        </div>
    );
};

export default CodeEditor;
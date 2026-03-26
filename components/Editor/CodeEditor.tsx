import React, { useEffect, useRef, useCallback } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { ProjectSettings } from '../../types';

// --- Helper: Standard debounce hook ---
function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
}

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
  settings: ProjectSettings;
  theme: 'dark' | 'light';
  action?: { type: 'save' | 'gotoLine' | 'updateContent' | null, timestamp: number, line?: number, column?: number, content?: string };
  onSave?: () => void;
  findQuery?: string;
  lineEnding?: 'LF' | 'CRLF';
  onCursorChange?: (position: { lineNumber: number, column: number }) => void;
  onActionComplete?: () => void;
  activeFileId?: string | null;
  onFileDrop?: (files: FileList) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = React.memo(({
  code, language, onChange,
  readOnly = false, settings, theme,
  action, onSave, findQuery, lineEnding = 'LF',
  onCursorChange, onActionComplete, activeFileId, onFileDrop
}) => {
  const monaco = useMonaco();

  // Using a Ref instead of State for the editor instance prevents unnecessary re-renders
  const editorRef = useRef<any>(null);
  const lastActionTimestampRef = useRef<number>(0);
  const lastLineEndingRef = useRef<string>('');

  // ==========================================
  // 1. STATE SYNCHRONIZATION (Performance Optimized)
  // ==========================================

  // Wait 300ms after they stop typing before sending the state up to React
  const debouncedOnChange = useDebounce((val: string) => {
    onChange(val);
  }, 300);

  // External Sync: Handle file switching or external code updates
  useEffect(() => {
    if (!editorRef.current) return;

    // If the editor has focus, the user is actively typing. Do not overwrite them!
    if (editorRef.current.hasTextFocus()) return;

    const currentModelValue = editorRef.current.getValue();

    // Only update Monaco if the parent state is actually different (e.g., switched files)
    if (currentModelValue !== code) {
      editorRef.current.setValue(code || '');
    }
  }, [code, activeFileId]);

  // ==========================================
  // 2. EDITOR ACTIONS & COMMANDS
  // ==========================================

  // Handle external actions (Save, GotoLine, UpdateContent)
  useEffect(() => {
    if (!editorRef.current || !action || !action.type || action.timestamp <= lastActionTimestampRef.current) return;

    lastActionTimestampRef.current = action.timestamp;

    if (action.type === 'save') {
      // Force an immediate flush of the value before saving to ensure latest code is caught
      onChange(editorRef.current.getValue());
      onSave?.();
    } else if (action.type === 'gotoLine' && action.line) {
      const line = action.line;
      const column = action.column ?? 1;
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column });
      editorRef.current.focus();
    } else if (action.type === 'updateContent' && action.content !== undefined) {
      editorRef.current.setValue(action.content);
    }

    onActionComplete?.();
  }, [action, onSave, onActionComplete, onChange]);


  // Handle find-in-code widget
  useEffect(() => {
    if (!editorRef.current || findQuery === undefined) return;
    if (findQuery === '') {
      editorRef.current.trigger('searchBox', 'closeFindWidget', null);
      return;
    }
    try {
      editorRef.current.trigger('searchBox', 'actions.find', null);
      const findController = editorRef.current.getContribution('editor.contrib.findController') as any;
      if (findController) findController.setSearchString(findQuery);
    } catch (e) {
      console.warn('Find widget error:', e);
    }
  }, [findQuery]);

  // Handle line endings (LF/CRLF) 
  useEffect(() => {
    if (!editorRef.current || !monaco) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const eol = lineEnding === 'CRLF'
      ? monaco.editor.EndOfLineSequence.CRLF
      : monaco.editor.EndOfLineSequence.LF;

    if (model.getEndOfLineSequence() !== eol) {
      model.setEOL(eol);
      lastLineEndingRef.current = lineEnding;
      // Notify parent immediately of the EOL change as it affects the content string
      onChange(model.getValue());
    }
  }, [lineEnding, monaco, activeFileId]);

  // ==========================================
  // 3. MONACO SETUP (Languages & Themes)
  // ==========================================

  useEffect(() => {
    if (monaco) {
      // Register additional language features
      monaco.languages.register({ id: 'rust' });
      monaco.languages.register({ id: 'typescript' });
      monaco.languages.register({ id: 'toml' });

      // Configure TypeScript provider to ignore module-not-found errors (useful for WebContainers)
      // This hides the red squiggly lines for imports that Monaco can't resolve locally
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        diagnosticCodesToIgnore: [2307, 2305, 7016, 2792],
      });

      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
        diagnosticCodesToIgnore: [2307, 2305, 7016, 2792],
      });

      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        allowJs: true,
        typeRoots: ["node_modules/@types"]
      });

      // Register Clarity
      monaco.languages.register({ id: 'clarity' });
      monaco.languages.setMonarchTokensProvider('clarity', {
        tokenizer: {
          root: [
            [/\b(define-public|define-private|define-read-only|define-constant|define-data-var|define-map|define-trait|define-fungible-token|define-non-fungible-token)\b/, 'keyword'],
            [/\b(begin|let|if|match|asserts!|try!|unwrap!|unwrap-panic|unwrap-err!|unwrap-err-panic|ok|err|default-to)\b/, 'keyword'],
            [/\b(var-get|var-set|map-get\?|map-set|map-insert|map-delete|get|merge)\b/, 'keyword'],
            [/\b(stx-transfer\?|stx-get-balance|contract-call\?|as-contract|at-block|get-block-info\?)\b/, 'keyword'],
            [/\b(is-eq|is-none|is-some|is-standard|not|and|or)\b/, 'keyword'],
            [/\b(tx-sender|contract-caller|block-height|burn-block-height|stx-ledger-address)\b/, 'variable'],
            [/\b(uint|int|bool|principal|buff|optional|response|list|string-ascii|string-utf8)\b/, 'type'],
            [/[()]/, 'delimiter'],
            [/\b[0-9]+\b/, 'number'],
            [/\bu[0-9]+\b/, 'number'],
            [/\b0x[0-9a-fA-F]+\b/, 'number'],
            [/"[^"]*"/, 'string'],
            [/'[^']*'/, 'string'],
            [/;;.*$/, 'comment'],
          ]
        }
      });

      // Define Dark Theme
      monaco.editor.defineTheme('caspier-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '608b4e' },
          { token: 'keyword', foreground: '007bff', fontStyle: 'bold' },
          { token: 'string', foreground: 'ce9178' },
          { token: 'number', foreground: 'b5cea8' },
        ],
        colors: {
          'editor.background': '#0a0a0a',
          'editor.foreground': '#e0e0e0',
          'editorCursor.foreground': '#007bff',
          'editor.lineHighlightBackground': '#111111',
          'editorLineNumber.foreground': '#444444',
          'editorLineNumber.activeForeground': '#007bff',
          'editor.selectionBackground': '#007bff33',
        }
      });

      // Define Light Theme
      monaco.editor.defineTheme('caspier-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '008000' },
          { token: 'keyword', foreground: '007bff', fontStyle: 'bold' },
          { token: 'string', foreground: 'a31515' },
          { token: 'number', foreground: '098658' },
        ],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#1a1a1a',
          'editorCursor.foreground': '#007bff',
          'editor.lineHighlightBackground': '#f9f9f9',
          'editorLineNumber.foreground': '#9ca3af',
          'editorLineNumber.activeForeground': '#007bff',
          'editor.selectionBackground': '#007bff1a',
        }
      });
    }
  }, [monaco]);

  // Switch theme when prop changes
  useEffect(() => {
    if (monaco) {
      monaco.editor.setTheme(theme === 'dark' ? 'caspier-dark' : 'caspier-light');
    }
  }, [monaco, theme]);

  const mapLanguage = (lang: string) => {
    if (lang === 'rust' || lang === 'rs') return 'rust';
    if (lang === 'typescript' || lang === 'ts' || lang === 'assemblyscript' || lang === 'as') return 'typescript';
    if (lang === 'clarity' || lang === 'clar') return 'clarity';
    if (lang === 'sol' || lang === 'solidity') return 'sol';
    if (lang === 'js' || lang === 'javascript') return 'javascript';
    if (lang === 'toml') return 'toml';
    if (lang === 'makefile') return 'makefile';
    if (lang === 'json') return 'json';
    if (lang === 'markdown' || lang === 'md') return 'markdown';
    if (lang === 'plaintext' || lang === 'txt') return 'plaintext';
    return lang;
  };

  return (
    <div
      className="w-full h-full overflow-hidden relative"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files.length > 0) {
          onFileDrop?.(e.dataTransfer.files);
        }
      }}
    >
      <Editor
        height="100%"
        theme={theme === 'dark' ? 'caspier-dark' : 'caspier-light'}
        language={mapLanguage(language)}
        path={activeFileId || 'default'}

        // UNCONTROLLED MODE: Pass initial value, but let Monaco handle internal typing state
        defaultValue={code}

        onChange={(value) => {
          if (value !== undefined) {
            debouncedOnChange(value);
          }
        }}

        onMount={(editor) => {
          editorRef.current = editor;

          // Immediate Sync on Blur: If the user clicks away, flush state instantly
          editor.onDidBlurEditorText(() => {
            onChange(editor.getValue());
          });

          // Debounced Cursor Position: Prevents spamming parent component with state updates
          let cursorTimeout: ReturnType<typeof setTimeout>;
          editor.onDidChangeCursorPosition((ev: any) => {
            clearTimeout(cursorTimeout);
            cursorTimeout = setTimeout(() => {
              onCursorChange?.({
                lineNumber: ev.position.lineNumber,
                column: ev.position.column
              });
            }, 100);
          });
        }}

        options={React.useMemo(() => ({
          readOnly,
          minimap: { enabled: settings.minimap },
          fontSize: settings.fontSize,
          wordWrap: settings.wordWrap,
          tabSize: settings.tabSize,
          fontFamily: "'JetBrains Mono', monospace",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          renderLineHighlight: 'line',
        }), [readOnly, settings])}
      />
    </div>
  );
});

export default CodeEditor;
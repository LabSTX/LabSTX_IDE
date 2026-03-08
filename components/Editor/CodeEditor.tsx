import React, { useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { ProjectSettings } from '../../types';

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
  settings: ProjectSettings;
  theme: 'dark' | 'light';
  action?: { type: 'save' | 'gotoLine' | null, timestamp: number, line?: number, column?: number };
  onSave?: () => void;
  /** When set, opens Monaco's find widget and highlights all matches */
  findQuery?: string;
  lineEnding?: 'LF' | 'CRLF';
  onCursorChange?: (position: { lineNumber: number, column: number }) => void;
  onActionComplete?: () => void;
  activeFileId?: string | null;
}

const CodeEditor: React.FC<CodeEditorProps> = React.memo(({
  code, language, onChange,
  readOnly = false, settings, theme,
  action, onSave, findQuery, lineEnding = 'LF',
  onCursorChange, onActionComplete, activeFileId
}) => {
  const monaco = useMonaco();
  const [editor, setEditor] = React.useState<any>(null);
  const lastActionTimestampRef = React.useRef<number>(0);
  const lastLineEndingRef = React.useRef<string>(''); // Start empty to force sync
  const lastActiveFileIdRef = React.useRef<string | null>(null);

  // Robust value synchronization: Only update Monaco if the prop 'code' 
  // actually differs from the current editor content (ignoring EOL differences).
  React.useEffect(() => {
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    const normalize = (s: string) => s ? s.replace(/\r\n/g, '\n') : '';
    const currentCode = model.getValue();

    // Only apply if there's a real content change from outside (e.g. Undo/Redo/Switch/Remount)
    if (normalize(currentCode) !== normalize(code)) {
      const range = model.getFullModelRange();
      editor.executeEdits('remote-sync', [{ range, text: code }]);
    }
  }, [editor, code, activeFileId]); // Handle content, file, AND mount/instance changes

  // Handle external actions (Save, GotoLine)
  useEffect(() => {
    if (!editor || !action || !action.type || action.timestamp <= lastActionTimestampRef.current) return;

    lastActionTimestampRef.current = action.timestamp;

    if (action.type === 'save') {
      onSave?.();
    } else if (action.type === 'gotoLine' && action.line) {
      const line = action.line;
      const column = action.column ?? 1;
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column });
      editor.focus();
    }

    // Notify parent that action is processed so it can be cleared
    onActionComplete?.();
  }, [editor, action, onSave, onActionComplete]);

  // Handle find-in-code: open Monaco's find widget and set search string
  useEffect(() => {
    if (!editor) return;
    if (findQuery === undefined) return;
    if (findQuery === '') {
      // Close find widget when query is cleared
      editor.trigger('searchBox', 'closeFindWidget', null);
      return;
    }
    try {
      // Open the find widget
      editor.trigger('searchBox', 'actions.find', null);
      // Access the find controller contribution to set the search string
      const findController = editor.getContribution('editor.contrib.findController') as any;
      if (findController) {
        findController.setSearchString(findQuery);
      }
    } catch (e) {
      console.warn('Find widget error:', e);
    }
  }, [editor, findQuery]);

  // Handle line endings (LF/CRLF) 
  // Optimized to only run when lineEnding prop actually changes from user intent
  useEffect(() => {
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    const eol = lineEnding === 'CRLF'
      ? monaco.editor.EndOfLineSequence.CRLF
      : monaco.editor.EndOfLineSequence.LF;

    // Detect if we actually need a manual EOL swap
    if (model.getEndOfLineSequence() !== eol) {
      model.setEOL(eol);
      lastLineEndingRef.current = lineEnding;
    }
  }, [editor, lineEnding, monaco, activeFileId]); // Re-sync when lineEnding OR file changes

  useEffect(() => {
    if (monaco) {
      // Register additional language features
      monaco.languages.register({ id: 'rust' });
      monaco.languages.register({ id: 'typescript' });
      monaco.languages.register({ id: 'toml' });

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
          { token: 'keyword', foreground: 'ff2d2e', fontStyle: 'bold' },
          { token: 'string', foreground: 'ce9178' },
          { token: 'number', foreground: 'b5cea8' },
        ],
        colors: {
          'editor.background': '#0a0a0a',
          'editor.foreground': '#e0e0e0',
          'editorCursor.foreground': '#ff2d2e',
          'editor.lineHighlightBackground': '#111111',
          'editorLineNumber.foreground': '#444444',
          'editorLineNumber.activeForeground': '#ff2d2e',
          'editor.selectionBackground': '#ff2d2e33',
        }
      });

      // Define Light Theme
      monaco.editor.defineTheme('caspier-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '008000' },
          { token: 'keyword', foreground: 'd00000', fontStyle: 'bold' },
          { token: 'string', foreground: 'a31515' },
          { token: 'number', foreground: '098658' },
        ],
        colors: {
          'editor.background': '#f9fafb', // gray-50
          'editor.foreground': '#111827', // gray-900
          'editorCursor.foreground': '#ff2d2e',
          'editor.lineHighlightBackground': '#f3f4f6', // gray-100
          'editorLineNumber.foreground': '#9ca3af', // gray-400
          'editorLineNumber.activeForeground': '#ff2d2e',
          'editor.selectionBackground': '#ff2d2e1a',
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
    // Casper contract languages
    if (lang === 'rust' || lang === 'rs') return 'rust';
    if (lang === 'typescript' || lang === 'ts' || lang === 'assemblyscript' || lang === 'as') return 'typescript';
    // Other languages
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
    <div className="w-full h-full overflow-hidden">
      <Editor
        height="100%"
        language={mapLanguage(language)}
        /* 
           Uncontrolled mode: We don't pass 'value' here to prevent the library 
           from triggering 'setValue' on every render. Our useEffect above 
           handles manual synchronization only when values actually differ.
        */
        path={activeFileId || 'default'}
        onChange={onChange}
        onMount={(e) => {
          setEditor(e);

          // Listen for cursor position changes
          e.onDidChangeCursorPosition((ev: any) => {
            const pos = {
              lineNumber: ev.position.lineNumber,
              column: ev.position.column
            };

            // Update App level state (for status bar)
            onCursorChange?.(pos);
          });
        }}
        // Initial theme logic is handled by the useEffect above
        theme={theme === 'dark' ? 'caspier-dark' : 'caspier-light'}
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
        }), [readOnly, settings, theme])}
      />
    </div>
  );
});

export default CodeEditor;

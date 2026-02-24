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
  action?: { type: 'undo' | 'redo' | 'save' | 'gotoLine' | null, timestamp: number, line?: number, column?: number };
  onSave?: () => void;
  /** When set, opens Monaco's find widget and highlights all matches */
  findQuery?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  code, language, onChange,
  readOnly = false, settings, theme,
  action, onSave, findQuery
}) => {
  const monaco = useMonaco();
  const editorRef = React.useRef<any>(null);

  // Handle external actions (Undo, Redo, Save, GotoLine)
  useEffect(() => {
    if (!editorRef.current || !action || !action.type) return;

    if (action.type === 'undo') {
      editorRef.current.trigger('toolbar', 'undo', null);
    } else if (action.type === 'redo') {
      editorRef.current.trigger('toolbar', 'redo', null);
    } else if (action.type === 'save') {
      onSave?.();
    } else if (action.type === 'gotoLine' && action.line) {
      const line = action.line;
      const column = action.column ?? 1;
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column });
      editorRef.current.focus();
    }
  }, [action, onSave]);

  // Handle find-in-code: open Monaco's find widget and set search string
  useEffect(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
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
  }, [findQuery]);

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
        value={code}
        onChange={onChange}
        onMount={(editor) => {
          editorRef.current = editor;
        }}
        // Initial theme logic is handled by the useEffect above
        theme={theme === 'dark' ? 'caspier-dark' : 'caspier-light'}
        options={{
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
        }}
      />
    </div>
  );
};

export default CodeEditor;
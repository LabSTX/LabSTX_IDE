/**
 * Simple Clarity LSP Service
 * Providing autocomplete, hover, definitions, and signature help.
 */

export interface ClarityMarker {
  severity: number;
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface ClarityBuiltin {
  label: string;
  insertText: string;
  detail: string;
  documentation: string;
  signature: string;
}

export const CLARITY_KEYWORDS = [
  'define-public', 'define-private', 'define-read-only', 'define-constant',
  'define-data-var', 'define-map', 'define-trait', 'define-fungible-token',
  'define-non-fungible-token', 'begin', 'let', 'if', 'match', 'asserts!',
  'try!', 'unwrap!', 'unwrap-panic', 'unwrap-err!', 'unwrap-err-panic',
  'ok', 'err', 'default-to', 'var-get', 'var-set', 'map-get?', 'map-set',
  'map-insert', 'map-delete', 'get', 'merge', 'stx-transfer?', 'stx-get-balance',
  'contract-call?', 'as-contract', 'at-block', 'get-block-info?', 'is-eq',
  'is-none', 'is-some', 'is-standard', 'not', 'and', 'or', 'tx-sender',
  'contract-caller', 'block-height', 'burn-block-height', 'stx-ledger-address'
];

export const CLARITY_TYPES = [
  'uint', 'int', 'bool', 'principal', 'buff', 'optional', 'response', 'list',
  'string-ascii', 'string-utf8'
];

export const CLARITY_BUILTINS: ClarityBuiltin[] = [
  { 
    label: '+', 
    insertText: '(+ ${1:arg1} ${2:arg2})', 
    detail: 'Addition',
    documentation: 'Adds a sequence of integers and returns the result. If an overflow or underflow occurs, a runtime error is thrown.',
    signature: '(+ int [int ...]) -> int | (+ uint [uint ...]) -> uint'
  },
  { 
    label: '-', 
    insertText: '(- ${1:arg1} ${2:arg2})', 
    detail: 'Subtraction',
    documentation: 'Subtracts a sequence of integers and returns the result. If an overflow or underflow occurs, a runtime error is thrown.',
    signature: '(- int [int ...]) -> int | (- uint [uint ...]) -> uint'
  },
  { 
    label: '*', 
    insertText: '(* ${1:arg1} ${2:arg2})', 
    detail: 'Multiplication',
    documentation: 'Multiplies a sequence of integers and returns the result. If an overflow or underflow occurs, a runtime error is thrown.',
    signature: '(* int [int ...]) -> int | (* uint [uint ...]) -> uint'
  },
  { 
    label: '/', 
    insertText: '(/ ${1:arg1} ${2:arg2})', 
    detail: 'Division',
    documentation: 'Divides a sequence of integers and returns the result. If a division by zero occurs, a runtime error is thrown.',
    signature: '(/ int [int ...]) -> int | (/ uint [uint ...]) -> uint'
  },
  { 
    label: 'var-get', 
    insertText: '(var-get ${1:var-name})', 
    detail: 'Get Variable',
    documentation: 'Returns the value of a data variable.',
    signature: '(var-get variable-name) -> any'
  },
  { 
    label: 'var-set', 
    insertText: '(var-set ${1:var-name} ${2:value})', 
    detail: 'Set Variable',
    documentation: 'Sets the value of a data variable. Returns true on success.',
    signature: '(var-set variable-name any) -> bool'
  },
  { 
    label: 'map-get?', 
    insertText: '(map-get? ${1:map-name} ${2:key})', 
    detail: 'Get Map Value',
    documentation: 'Returns the value associated with a key in a map, or none if it does not exist.',
    signature: '(map-get? map-name key-tuple) -> (optional any)'
  },
  { 
    label: 'ok', 
    insertText: '(ok ${1:value})', 
    detail: 'Success Response',
    documentation: 'Constructs a response indicating success.',
    signature: '(ok any) -> (response any any)'
  },
  { 
    label: 'err', 
    insertText: '(err ${1:code})', 
    detail: 'Error Response',
    documentation: 'Constructs a response indicating an error.',
    signature: '(err any) -> (response any any)'
  },
  { 
    label: 'define-public', 
    insertText: '(define-public (${1:name} (${2:arg} ${3:type}))\n\t(begin\n\t\t${4:(ok true)})\n)', 
    detail: 'Public Function',
    documentation: 'Defines a public function that can be called by other users or contracts. Must return a response type.',
    signature: '(define-public (name (arg1 type1) ...) body) -> (response any any)'
  }
];

export class ClarityLSP {
  /**
   * Provides completion items for the Monaco editor
   */
  static getCompletions(monaco: any, range: any) {
    const suggestions: any[] = [];

    // Keywords
    CLARITY_KEYWORDS.forEach(k => {
      suggestions.push({
        label: k,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: k,
        range
      });
    });

    // Types
    CLARITY_TYPES.forEach(t => {
      suggestions.push({
        label: t,
        kind: monaco.languages.CompletionItemKind.TypeParameter,
        insertText: t,
        range
      });
    });

    // Builtins / Snippets
    CLARITY_BUILTINS.forEach(b => {
      suggestions.push({
        label: b.label,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: b.insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: b.detail,
        range
      });
    });

    return { suggestions };
  }

  /**
   * Provides hover information
   */
  static getHover(id: string) {
    const builtin = CLARITY_BUILTINS.find(b => b.label === id);
    if (builtin) {
      return {
        contents: [
          { value: `**${builtin.label}**` },
          { value: `\`${builtin.signature}\`` },
          { value: builtin.documentation }
        ]
      };
    }

    if (CLARITY_KEYWORDS.includes(id)) {
      return {
        contents: [
          { value: `**${id}**` },
          { value: 'Clarity Keyword' }
        ]
      };
    }

    return null;
  }

  /**
   * Provides definitions for a given symbol
   */
  static getDefinitions(code: string, word: string, monaco: any) {
    const lines = code.split('\n');
    const results: any[] = [];

    // Simple regex to find definitions
    // Matches: (define-public (name ...), (define-private (name ...), (define-read-only (name ...), (define-constant name ...), (define-data-var name ...), (define-map name ...)
    const defRegex = new RegExp(`\\(define-(?:public|private|read-only|constant|data-var|map|trait|fungible-token|non-fungible-token)\\s+(?:\\()?${word}\\b`, 'g');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(word)) {
            let match;
            while ((match = defRegex.exec(line)) !== null) {
                const startCol = match.index + match[0].indexOf(word) + 1;
                results.push({
                    range: new monaco.Range(i + 1, startCol, i + 1, startCol + word.length)
                });
            }
        }
    }

    return results;
  }

  /**
   * Provides signature help
   */
  static getSignatureHelp(id: string) {
    const builtin = CLARITY_BUILTINS.find(b => b.label === id);
    if (builtin) {
        return {
            signatures: [{
                label: builtin.signature,
                documentation: builtin.documentation,
                parameters: [] // We can refine this later if needed
            }],
            activeSignature: 0,
            activeParameter: 0
        };
    }
    return null;
  }

  /**
   * Scans the code for bracket matching errors
   */
  static getDiagnostics(code: string): ClarityMarker[] {
    const markers: ClarityMarker[] = [];
    const stack: { char: string; line: number; col: number }[] = [];
    const lines = code.split('\n');

    for (let l = 0; l < lines.length; l++) {
      const line = lines[l];
      let isString = false;
      let stringChar = '';

      for (let c = 0; c < line.length; c++) {
        const char = line[c];

        // Skip comments (ignore the rest of the line)
        if (!isString && char === ';' && line[c + 1] === ';') {
          break;
        }

        // Handle strings to ignore brackets inside them
        if ((char === '"' || char === "'") && (c === 0 || line[c - 1] !== '\\')) {
          if (!isString) {
            isString = true;
            stringChar = char;
          } else if (char === stringChar) {
            isString = false;
          }
        }

        if (isString) continue;

        // Bracket logic
        if (char === '(') {
          stack.push({ char, line: l + 1, col: c + 1 });
        } else if (char === ')') {
          if (stack.length === 0) {
            markers.push({
              severity: 8, // MarkerSeverity.Error
              message: "Unexpected closing bracket ')' without matching '('",
              startLineNumber: l + 1,
              startColumn: c + 1,
              endLineNumber: l + 1,
              endColumn: c + 2
            });
          } else {
            stack.pop();
          }
        }
      }
    }

    // Identify unclosed brackets at end of file
    while (stack.length > 0) {
      const open = stack.pop()!;
      markers.push({
        severity: 8,
        message: "Missing closing bracket ')' for this '('",
        startLineNumber: open.line,
        startColumn: open.col,
        endLineNumber: open.line,
        endColumn: open.col + 1
      });
    }

    return markers;
  }
}

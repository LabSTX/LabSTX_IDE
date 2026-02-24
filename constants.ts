import { FileNode, ProjectSettings } from './types';

export const DEFAULT_SETTINGS: ProjectSettings = {
  fontSize: 14,
  wordWrap: 'on',
  minimap: false,
  tabSize: 2, // Clarity/Lisp standard is usually 2 spaces
  autoCompile: true, // Clarity is interpreted, so "check" is fast
  enableOptimization: false, // Not applicable to Clarity
  network: 'testnet', // Stacks Testnet
  clarityVersion: '2.0',
  aiModel: 'openai/gpt-4o',
  aiApiKey: ''
};

export const INITIAL_FILES: FileNode[] = [
  {
    id: 'root',
    name: 'clarity_counter',
    type: 'folder',
    children: [
      {
        id: 'Clarinet.toml', // The "Cargo.toml" of the Stacks world
        name: 'Clarinet.toml',
        type: 'file',
        language: 'toml',
        content: `[project]
name = "clarity_counter"
authors = []
description = "A simple counter on Stacks"
telemetry = false
requirements = []
[contracts.simple-counter]
path = "contracts/simple-counter.clar"
clarity_version = 2`
      },
      {
        id: 'contracts',
        name: 'contracts',
        type: 'folder',
        children: [
          {
            id: 'simple-counter.clar',
            name: 'simple-counter.clar',
            type: 'file',
            language: 'clarity',
            content: `;; Simple Counter Contract
;; A basic Clarity contract to manage a numeric state

;; Define the data variable
(define-data-var counter uint u0)

;; Public function to increment
(define-public (increment)
  (begin
    (var-set counter (+ (var-get counter) u1))
    (ok (var-get counter))))

;; Read-only function to get current value
(define-read-only (get-counter)
  (ok (var-get counter)))
`
          }
        ]
      },
      {
        id: 'README.md',
        name: 'README.md',
        type: 'file',
        language: 'markdown',
        content: `# Clarity Counter Contract

A basic Stacks smart contract written in Clarity.

## Features
- **Decidable**: No gas limit issues like EVM.
- **Interpreted**: No compilation to WASM needed.
- **Stateful**: Stores a single \`uint\` counter.

## How to use
1. **Check**: Run the Clarity checker to validate syntax.
2. **Deploy**: Send to Stacks Testnet or Mainnet.
3. **Interact**: Call \`increment\` to update the blockchain state.
`
      }
    ]
  }
];
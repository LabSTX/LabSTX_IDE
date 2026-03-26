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
  aiProvider: 'openrouter',
  aiModel: 'qwen/qwen-2.5-7b-instruct',
  aiApiKey: '',
  openRouterKeySource: 'custom',
};

export const INITIAL_FILES: FileNode[] = [
  {
    id: 'Clarinet.toml',
    name: 'Clarinet.toml',
    type: 'file',
    language: 'toml',
    content: `[project]
name = "simple-counter"
description = "A complete Clarinet project with Vitest testing"
authors = []
telemetry = false
cache_dir = "./.requirements"

[contracts.simple-counter]
path = "contracts/simple-counter.clar"
clarity_version = 3
epoch = 'latest'`
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

(define-data-var counter uint u0)

(define-public (increment)
  (begin
    (var-set counter (+ (var-get counter) u1))
    (ok (var-get counter))))

(define-read-only (get-counter)
  (ok (var-get counter)))`
      }
    ]
  },
  {
    id: 'settings',
    name: 'settings',
    type: 'folder',
    children: [
      {
        id: 'Devnet.toml',
        name: 'Devnet.toml',
        type: 'file',
        language: 'toml',
        content: `[network]
name = "simnet"
[accounts.deployer]
mnemonic = "twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw"
balance = 100000000000000
[accounts.wallet_1]
mnemonic = "sell invite acquire kitten bamboo drastic jelly vivid peace spawn twice guilt pave pen trash pretty park cube fragile unaware remain midnight betray rebuild"
balance = 100000000000000`
      },
      {
        id: 'Simnet.toml',
        name: 'Simnet.toml',
        type: 'file',
        language: 'toml',
        content: `[network]
name = "simnet"
[accounts.deployer]
mnemonic = "twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw"
balance = 100000000000000
[accounts.wallet_1]
mnemonic = "sell invite acquire kitten bamboo drastic jelly vivid peace spawn twice guilt pave pen trash pretty park cube fragile unaware remain midnight betray rebuild"
balance = 100000000000000`
      }
    ]
  },
  {
    id: 'tests',
    name: 'tests',
    type: 'folder',
    children: [
      {
        id: 'simple-counter.test.ts',
        name: 'simple-counter.test.ts',
        type: 'file',
        language: 'typescript',
        content: `import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

// 1. Define the accounts globally so ALL tests can use them
const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;

describe("simple-counter", () => {
  it("ensures counter starts at 0", () => {
    const { result } = simnet.callReadOnlyFn(
      "simple-counter",
      "get-counter",
      [],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(0));
  });

  it("increments the counter", () => {
    // 1. Increment the counter (wallet1 is safely accessible here now)
    const { result } = simnet.callPublicFn(
      "simple-counter",
      "increment",
      [],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(1));

    // 2. Read the new state
    const readResult = simnet.callReadOnlyFn(
      "simple-counter",
      "get-counter",
      [],
      wallet1
    );
    expect(readResult.result).toBeOk(Cl.uint(1));
  });
});`
      }
    ]
  },
  {
    id: 'package.json',
    name: 'package.json',
    type: 'file',
    language: 'json',
    content: `{
  "name": "simple-counter",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "vitest"
  },
  "devDependencies": {
    "@hirosystems/clarinet-sdk": "latest",
    "vitest-environment-clarinet": "^2.3.1",
    "typescript": "^5.0.0",
    "vitest": "^1.6.1"
  }
}`
  },
  {
    id: 'tsconfig.json',
    name: 'tsconfig.json',
    type: 'file',
    language: 'json',
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["tests/**/*"]
}`
  },
  {
    id: 'vitest.config.js',
    name: 'vitest.config.js',
    type: 'file',
    language: 'javascript',
    content: `import { defineConfig } from 'vitest/config';
import { vitestSetupFilePath, getClarinetVitestsArgv } from '@hirosystems/clarinet-sdk/vitest';

export default defineConfig({
  test: {
    environment: 'clarinet',
    pool: 'forks',
    poolOptions: {
      threads: { singleThread: true },
      forks: { singleFork: true },
    },
    setupFiles: [
      vitestSetupFilePath,
    ],
    environmentOptions: {
      clarinet: {
        ...getClarinetVitestsArgv(),
      },
    },
  },
});`
  }
];
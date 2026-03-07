export const completeClarityStarterExample = {
    'contracts/simple-counter.clar': `;; Simple Counter Contract

(define-data-var counter uint u0)

(define-public (increment)
  (begin
    (var-set counter (+ (var-get counter) u1))
    (ok (var-get counter))))

(define-read-only (get-counter)
  (ok (var-get counter)))
`,

    'Clarinet.toml': `[project]
name = "simple-counter"
description = "A complete Clarinet project with Vitest testing"
authors = []
telemetry = false
cache_dir = "./.requirements"

[contracts.simple-counter]
path = "contracts/simple-counter.clar"
clarity_version = 2
epoch = 2.4
`,

    'settings/Devnet.toml': `[network]
name = "simnet"
[accounts.deployer]
mnemonic = "twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw"
balance = 100000000000000
[accounts.wallet_1]
mnemonic = "sell invite acquire kitten bamboo drastic jelly vivid peace spawn twice guilt pave pen trash pretty park cube fragile unaware remain midnight betray rebuild"
balance = 100000000000000`,

    'settings/Simnet.toml': `[network]
name = "simnet"
[accounts.deployer]
mnemonic = "twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw"
balance = 100000000000000
[accounts.wallet_1]
mnemonic = "sell invite acquire kitten bamboo drastic jelly vivid peace spawn twice guilt pave pen trash pretty park cube fragile unaware remain midnight betray rebuild"
balance = 100000000000000`,

    'package.json': `{
  "name": "simple-counter",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "vitest"
  },
  "devDependencies": {
    "@hirosystems/clarinet-sdk": "latest",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
`,

    'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["tests/**/*"]
}
`,

    'vitest.config.js': `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'clarinet',
    pool: 'forks',
    poolOptions: {
      threads: { singleThread: true },
      forks: { singleFork: true },
    },
  },
});
`,

    'tests/simple-counter.test.ts': `import { describe, expect, it } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;

describe('simple-counter', () => {
  it('ensures counter starts at 0', () => {
    const { result } = simnet.callReadOnlyFn('simple-counter', 'get-counter', [], deployer);
    expect(result).toBeUint(0);
  });

  it('increments the counter', () => {
    const { result } = simnet.callPublicFn('simple-counter', 'increment', [], deployer);
    expect(result).toBeOk(Cl.uint(1));
    
    const readResult = simnet.callReadOnlyFn('simple-counter', 'get-counter', [], deployer);
    expect(readResult.result).toBeUint(1);
  });
});
`
};
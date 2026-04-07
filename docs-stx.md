Clarinet JS SDK
Browser SDK Reference
The browser build of the Clarinet SDK lets you interact with simnet directly from web experiences, so you can run Clarity tests without standing up a Node.js server.

Installation
Install

Copy
npm install @stacks/clarinet-sdk-browser
Usage
The browser SDK implements the same API as the Node.js Clarinet SDK. All methods, properties, and custom matchers work identically.

Empty session
Empty session (TypeScript)

Copy
import { initSimnet } from '@stacks/clarinet-sdk-browser';

const simnet = await initSimnet();
await simnet.initEmptySession();

// Execute Clarity code directly
const result = simnet.runSnippet("(+ 1 2)");
console.log(result); // 3
With a Clarinet project
For testing with an existing Clarinet project using a virtual file system:

Using a Clarinet project (TypeScript)

Copy
import { initSimnet } from '@stacks/clarinet-sdk-browser';

const simnet = await initSimnet();
await simnet.initSession("/project", "Clarinet.toml");

// Your contracts are now available
const count = simnet.getDataVar('counter', 'count');
Virtual file system

Using a Clarinet project in the browser requires setting up a virtual file system. Documentation and examples for this advanced use case are coming soon.

Common use cases
Interactive contract playground
Playground example (TypeScript)

Copy
import { initSimnet } from '@stacks/clarinet-sdk-browser';
import { Cl } from '@stacks/transactions';

// Initialize simnet
const simnet = await initSimnet();
await simnet.initEmptySession();

// Deploy a simple contract
const sourceCode = `
(define-data-var counter uint u0)

(define-public (increment)
  (ok (var-set counter (+ (var-get counter) u1))))

(define-read-only (get-counter)
  (ok (var-get counter)))
`;

simnet.deployContract('counter', sourceCode, null, simnet.deployer);

// Interact with the contract
simnet.callPublicFn('counter', 'increment', [], simnet.deployer);
const count = simnet.callReadOnlyFn('counter', 'get-counter', [], simnet.deployer);
console.log(count.result); // (ok u1)
Testing in browser-based IDEs
Browser test example (TypeScript + Vitest)

Copy
import { initSimnet } from '@stacks/clarinet-sdk-browser';
import { expect } from 'vitest';

const simnet = await initSimnet();
await simnet.initEmptySession();

// Run tests directly in the browser
test('counter increments correctly', () => {
  simnet.deployContract('counter', counterCode, null, simnet.deployer);
  
  const result = simnet.callPublicFn('counter', 'increment', [], simnet.deployer);
  expect(result.result).toBeOk(Cl.uint(1));
  
  const count = simnet.getDataVar('counter', 'counter');
  expect(count).toBeUint(1);
});
Browser compatibility
The browser SDK works in all modern browsers that support:

ES2020+ JavaScript features

WebAssembly

Dynamic imports

Tested browsers include:

Chrome/Edge 90+

Firefox 89+

Safari 15+
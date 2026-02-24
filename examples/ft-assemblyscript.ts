// Fungible Token Contract Example (AssemblyScript)
export const ftAssemblyScriptExample = {
  'package.json': `{
  "name": "fungible-token",
  "version": "1.0.0",
  "description": "Casper Fungible Token Contract",
  "main": "index.ts",
  "scripts": {
    "build": "asc index.ts --target wasm32 --exportRuntime"
  },
  "dependencies": {
    "@assemblyscript/loader": "^0.27.0"
  },
  "devDependencies": {
    "assemblyscript": "^0.27.0"
  }
}`,
  
  'index.ts': `// Fungible Token Contract for Casper Network
// AssemblyScript implementation

@external
export function transfer(recipient: string, amount: u64): void {
  // Transfer tokens from caller to recipient
  // Implementation would interact with Casper runtime
}

@external
export function balance_of(account: string): u64 {
  // Get balance of an account
  return 0;
}

@external
export function total_supply(): u64 {
  // Get total supply of tokens
  return 0;
}

@external
export function approve(spender: string, amount: u64): void {
  // Approve spender to transfer tokens
}

@external
export function allowance(owner: string, spender: string): u64 {
  // Get allowance
  return 0;
}

@external
export function mint(recipient: string, amount: u64): void {
  // Mint new tokens (only owner)
}

@external
export function burn(amount: u64): void {
  // Burn tokens
}`
};











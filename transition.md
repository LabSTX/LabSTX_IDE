# Transition Plan: CasperIDE to LabSTX IDE

This document outlines the steps required to transition the codebase from supporting the Casper Network (Rust/AssemblyScript) to the Stacks Blockchain (Clarity).

## 1. Project Identity & Branding
- [ ] **Rename Project**: Change "CasperIDE" to "LabSTX"
- [ ] **UI Refresh**:
    - Replace the Casper logo (`public/CASPIER.png`, `public/Caspier-horizontal.svg`) with Stacks logos.
    - Update the color scheme from Casper dots/blue to Stacks orange/purple/white.
    - Update `index.html` title and meta descriptions.

## 2. Editor & Language Support
- [ ] **Clarity Integration**:
    - Add `.clar` to supported extensions in `App.getLanguageFromExtension`.
    - Configure Monaco Editor for Clarity syntax highlighting.
    - (Optionally) Integrate `clarity-lsp` for advanced autocompletion.
- [ ] **Default Templates**:
    - Replace Casper Rust/AS templates in `services/templates.ts` with common Clarity examples (counter, NFT, DAO).

## 3. Compiler & Backend (The "GCP Stuff")
Stacks uses **Clarity**, which is an interpreted, decidable language. It doesn't compile to WASM like Casper contracts.

### Replacement Strategy:
Instead of a Rust-to-WASM compilation server on GCP, we need a **Clarinet Runtime** server.

- [ ] **Custom Code Server**: 
    - Create a Node.js backend that has `clarinet` CLI installed.
    - **Endpoint `/check`**: Receives Clarity code, runs `clarinet check`, and returns errors/warnings.
    - **Endpoint `/test`**: Runs `clarinet test` and returns results.
- [ ] **Frontend `ClarityCompiler`**:
    - Create `services/stacks/compiler.ts` to replace `services/casper/compiler.ts`.
    - It will call the `/check` endpoint instead of `/compile`.
- [ ] **Proxy Update**:
    - Update `api/compile.js` (Vercel proxy) to forward to the new Stacks backend.

#### Clarinet Server (Proposed Alternative to GCP Rust Server)
```javascript
// stacks-server-template.js
const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

app.post("/check", (req, res) => {
    const { code, contractName } = req.body;
    const projectDir = `/tmp/stacks_${Date.now()}`;
    fs.mkdirSync(path.join(projectDir, "contracts"), { recursive: true });
    
    // Clarinet.toml
    fs.writeFileSync(path.join(projectDir, "Clarinet.toml"), `[project]\nname = "work"`);
    fs.writeFileSync(path.join(projectDir, "contracts", `${contractName}.clar`), code);

    exec(`cd ${projectDir} && clarinet check`, (error, stdout, stderr) => {
        // Parse stderr/stdout for Clarity errors
        res.json({ success: !error, output: stdout || stderr });
        fs.rmSync(projectDir, { recursive: true });
    });
});

app.listen(8080);
```

## 4. Wallet Connectivity
Casper uses CSPR Click; Stacks uses **Stacks Connect**.

- [ ] **Dependencies**:
    - Install `@stacks/connect`, `@stacks/transactions`, `@stacks/common`, `@stacks/network`.
    - Remove `@make-software/csprclick-core-client`, `@make-software/csprclick-ui`, `casper-js-sdk`.
- [ ] **Wallet Service**:
    - Replace `services/casper/wallet.ts` with `services/stacks/wallet.ts`.
    - Use `showConnect` from `@stacks/connect` for authentication.
- [ ] **UI Components**:
    - Update `components/Layout/Header.tsx` to handle Stacks wallet connection.

## 5. Debugging Implementation
Clarity is a decidable language, making it easier to debug through static analysis and local execution traces.

### Implementation Strategy:
- [ ] **Clarity REPL (Terminal)**:
    - Integrate `xterm.js` into the "Terminal" view.
    - Connect to a WebSocket on the Custom Code Server that runs `clarinet console`. 
- [ ] **Trace Debugger**:
    - Use `clarinet test --trace` to get execution traces.
    - Parse the resulting JSON/YAML trace to show a step-by-step execution in a new "Debug" sidebar.
- [ ] **State Inspector**:
    - Since Clarity state (Data Maps, Variables) is explicit, create a component to visualize the local Clarinet Devnet state.

#### Debugging Architecture:
1. **Frontend**: User triggers "Debug".
2. **Backend**: Runs `clarinet test --trace` on the temporary contract.
3. **Frontend**: Receives the trace and populates a "State Tree" and "Execution Steps" list.

## 6. Deployment Workflow
- [ ] **Transaction Building**:
    - Replace `services/casper/deployment.ts` logic.
    - Use `makeContractDeploy` from `@stacks/transactions`.
    - Handle Stacks transaction signing (Post-conditions, fee estimation).

## 7. Configuration & State
- [ ] **Types**:
    - Update `types.ts` to include Stacks-specific types (e.g., `StacksNetwork`, `ClarityValue`).
- [ ] **Environment Variables**:
    - Replace `VITE_CASPER_RPC_URL` with `VITE_STACKS_API_URL`.
    - Update `VITE_COMPILER_SERVICE_URL` to point to the Stacks backend.

## 8. Summary of Major Substitutions

| Feature | Casper (Current) | Stacks (Target) |
| :--- | :--- | :--- |
| **Language** | Rust / AssemblyScript | Clarity (.clar) |
| **Compiler** | Rustc / Asc (to WASM) | Clarinet (Validation only) |
| **Wallet** | CSPR Click / Casper Wallet | Hiro (Leather) / Xverse |
| **JS Library** | `casper-js-sdk` | `@stacks/transactions` |
| **Infrastructure** | GCP Rust Compiler | Custom Node.js + Clarinet Server |
| **Debug** | WASM analysis | `clarinet console` (REPL) |

---
*Created on: 2026-02-23*

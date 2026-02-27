# Clarity Compile and Debug Implementation

This document outlines the implementation for connecting the **Compile** and **Debug** buttons in the Laboratorio Stacks (LabSTX) IDE to an external Clarity server (Clarinet).

## 1. Architecture Overview

The IDE communicates with an external server (typically running a Clarinet-based backend) via REST API.

- **Frontend**: React/TypeScript
- **Service Layer**: 
    - `ClarityCompiler`: Handles contract validation and entry-point extraction.
    - `ClarityDebugger`: Handles REPL execution and state analysis.
- **External Server**: Clarinet Runtime / LabSTX Backend

## 2. API Endpoints

The external server should expose the following endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/check` | `POST` | Validates Clarity code. Returns success/failure and errors. |
| `/debug/execute` | `POST` | Executes a Clarity expression. Returns output and trace. |
| `/debug/analyze` | `POST` | Analyzes a contract. Returns state variables and history. |

## 3. Service Implementation

### Clarity Compiler (`services/stacks/compiler.ts`)

```typescript
export class ClarityCompiler {
    static async check(code: string, contractName: string): Promise<CompilationResult> {
        const compilerUrl = import.meta.env.VITE_COMPILER_SERVICE_URL;
        const response = await fetch(`${compilerUrl}/check`, {
            method: 'POST',
            body: JSON.stringify({ code, contractName })
        });
        return await response.json();
    }
}
```

## 🎯 File Requirements & Generation

### Mandatory Files (What you must create)
To run a Clarinet project, you personally must provide:
1.  **`Clarinet.toml`**: The brain of your project. Defines name, contracts, and requirements.
2.  **`contracts/*.clar`**: Your actual Clarity smart contracts.

### Generated Files (What Clarinet creates for you)
Clarinet generates these automatically during the lifecycle of a project:
1.  **`deployments/`**: Created when you run `clarinet deployments generate`. Contains the plans for Devnet, Testnet, and Mainnet.
2.  **`settings/*.toml`**: Contains network-specific configurations like RPC URLs and accounts.
3.  **`tests/*.ts`**: Initialized when creating a project/contract; these are TypeScript files using the Clarinet testing framework.


## 📁 FULL PROJECT STRUCTURE (Professional Setup)
```text
my-project/
├── Clarinet.toml      🔥 required
├── contracts/         🔥 required
│    └── my-contract.clar
├── tests/             🧪 optional
│    └── my-test.ts
├── deployments/       🚀 created when generating plans
│    ├── default.devnet-plan.yaml
│    ├── default.testnet-plan.yaml
│    └── default.mainnet-plan.yaml
├── settings/          🌐 network configs
│    ├── Devnet.toml
│    ├── Testnet.toml
│    └── Mainnet.toml
└── node_modules/      (Internal testing dependencies)
```

## 🔥 Deployment Workflow
When you run `clarinet deployments apply --testnet`, the following happens:
1.  Reads **`Clarinet.toml`** for project context.
2.  Follows the plan in **`deployments/default.testnet-plan.yaml`**.
3.  Uses account/network info from **`settings/Testnet.toml`**.
4.  Signs and broadcasts transactions to the Stacks network.

### Clarity Debugger (`services/stacks/debugger.ts`)

```typescript
export class ClarityDebugger {
    static async execute(expression: string, context?: object) {
        const debuggerUrl = import.meta.env.VITE_COMPILER_SERVICE_URL;
        const response = await fetch(`${debuggerUrl}/debug/execute`, {
            method: 'POST',
            body: JSON.stringify({ expression, context })
        });
        return await response.json();
    }
}
```

## 4. UI Integration

### App Header Buttons

In `App.tsx`, we added the `Debug` button and connected both to their respective handlers:

```tsx
<Button onClick={handleCompile}>Compile</Button>
<Button onClick={handleDebug}>Debug</Button>
```

### Debug Panels

1. **Clarity REPL**: Connected to `ClarityDebugger.execute`.
2. **State Inspector**: Fetches contract variables from `/debug/analyze`.
3. **Trace Viewer**: Visualizes the execution trace returned by the debugger.

## 5. Configuration

Set the environment variable in your `.env` file:

```env
VITE_COMPILER_SERVICE_URL=http://your-clarinet-server-url:8080
```

## 6. How to Run

1. Ensure your Clarinet external server is running.
2. Update the `VITE_COMPILER_SERVICE_URL` to point to it.
3. Open a `.clar` file.
4. Click **Compile** to check for errors.
5. Click **Debug** to open the REPL and interact with the contract.

---

### 📂 Project Context Reconstruction
Commands like `clarinet check`, `clarinet test`, and `clarinet deployments` require more than just a single contract; they rely on the entire project structure (`Clarinet.toml`, multiple contracts, traits, and settings).

The LabSTX IDE handles this through **Project Context Sync**:
1.  **Workspace Traversal**: Before a command is sent, the IDE frontend "collects" all relevant files from the virtual workspace (the `FileNode` tree).
2.  **Payload Bundling**: All `.clar`, `.toml`, and `.yaml` files are bundled into the API request sent to `/ide-api/clarity/terminal`.
3.  **On-the-Fly Reconstruction**: The `ide-api` backend uses the `createTempProject` utility to recreate this exact file structure in an isolated temporary directory.
4.  **CLI Invocation**: Clarinet is then executed within this reconstructed environment, allowing it to correctly resolve cross-contract dependencies, configuration settings, and deployment plans.

---

### 📢 Full Output Transparency
To ensure a professional development experience, the LabSTX IDE provides complete visibility into Clarinet's execution:
*   **Complete Stream Capture**: The `ide-api` captures both `stdout` and `stderr` from the Clarinet process. No information is truncated or "cleaned," ensuring users see every detail.
*   **Raw Terminal Rendering**: The `TerminalPanel.tsx` displays the raw output lines exactly as they appear in a native shell. This includes exact error messages, linting warnings, and diagnostic info from commands like `clarinet check`.
*   **Auditability**: By keeping the full response, users can verify exactly what Clarinet found, making debugging significantly easier than with filtered summaries.

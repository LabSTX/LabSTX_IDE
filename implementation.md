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

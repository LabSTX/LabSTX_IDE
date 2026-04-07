import { init, initSimnet, Simnet } from '@stacks/clarinet-sdk-browser';

import wasmUrl from '@stacks/clarinet-sdk-wasm-browser/clarinet_sdk_bg.wasm?url';

let simnetInstance: Simnet | null = null;
let initPromise: Promise<Simnet> | null = null;
let isWasmLoaded = false;
export let sessionID = 0;

// Global mutex to serialize all access to the single-threaded WASM engine
let executionQueue: Promise<void> = Promise.resolve();

/**
 * Initializes the WASM engine and a fresh Simnet session.
 */
/**
 * Boots the WASM engine and returns the raw Simnet instance.
 * Does NOT initialize a session.
 */
export async function getRawSimnet(): Promise<Simnet> {
    if (simnetInstance) return simnetInstance;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        if (!isWasmLoaded) {
            await init(wasmUrl);
            isWasmLoaded = true;
        }
        const instance = await initSimnet();
        simnetInstance = instance;
        return instance;
    })();

    return initPromise;
}

/**
 * Resets the Simnet instance, forcing a fresh session on the next call.
 */
export function resetSimnet() {
    simnetInstance = null;
    initPromise = null;
    sessionID++;
    console.log("[Simnet] Instance reset requested.");
}

/**
 * Initializes the WASM engine and a fresh Simnet session (Empty Mode).
 */
export async function getSimnet(): Promise<Simnet> {
    const instance = await getRawSimnet();

    // Check if session is already initialized (some versions have a sessionId or similar)
    // For our usage, we just ensure it's called at least once.
    if (!(instance as any)._isInitialized) {
        try {
            await (instance as any).initEmptySession({ enabled: false });
            (instance as any)._isInitialized = true;

            // Default configuration
            (instance as any).deployer = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
            try {
                // Use 2.5 or 3.0 for Nakamoto depending on browser SDK support
                // "2.4", "2.5", "3.0" are typically supported in newer clarinet sdks
                if (typeof (instance as any).setEpoch === 'function') {
                    (instance as any).setEpoch("3.4");
                    console.log("[Simnet] Set epoch to 3.4");
                }
            } catch (e) {
                console.warn("[Simnet] setEpoch failed:", e);
            }
        } catch (e) {
            console.warn("[Simnet] initEmptySession failed (might be already initialized):", e);
        }
    }

    return instance;
}

/**
 * Initializes a Simnet session with a project structure (Clarinet.toml).
 * Clears any previous session state if possible.
 */
export async function initProjectSession(rootPath: string, configPath: string): Promise<Simnet> {
    const simnet = await getRawSimnet();
    try {
        console.log(`[Simnet] Initializing project session at ${rootPath} with ${configPath}`);

        // Ensure we reset any previous session before project init
        // Some WASM builds are sensitive to this
        await (simnet as any).initSession(rootPath, configPath);
        (simnet as any)._isInitialized = true;

        return simnet;
    } catch (error) {
        console.error("[Simnet] Project initialization failed:", error);
        throw error;
    }
}

/**
 * Ensures a task is executed against the Simnet exclusively.
 */
export async function runExclusively<T>(task: (simnet: Simnet) => Promise<T> | T): Promise<T> {
    const nextTask = (async () => {
        // Serialized access
        await executionQueue;

        const simnet = await getSimnet();

        try {
            return await task(simnet);
        } catch (error: any) {
            const errorMsg = String(error?.message || error || "Unknown error").toLowerCase();

            // Detect panics and invalid states
            if (errorMsg.includes('unreachable') ||
                errorMsg.includes('recursive') ||
                errorMsg.includes('aliasing') ||
                errorMsg.includes('panic') ||
                errorMsg.includes('session') ||
                errorMsg.includes('enabled')) {
                console.error("[Simnet] Critical engine error detected. Resetting instance...", errorMsg);
                simnetInstance = null;
                initPromise = null;
                sessionID++;
            }
            throw error;
        }
    })();

    executionQueue = (async () => {
        try { await nextTask; } catch (e) { }
    })();

    return nextTask;
}

/**
 * Returns the 10 pre-funded accounts from the current simnet instance.
 */
export async function getAccounts(): Promise<string[]> {
    return runExclusively((simnet) => {
        // Simnet instance has an 'accounts' array of account objects
        const accounts = (simnet as any).accounts || [];
        return accounts.map((a: any) => a.address);
    });
}

/**
 * Returns the balance of an account in STX.
 */
export async function getAccountBalance(address: string): Promise<string> {
    return runExclusively((simnet) => {
        try {
            // Clarinet SDK returns balance as BigInt (micro-STX)
            const balance = (simnet as any).getAccountBalance?.(address);
            if (balance !== undefined && balance !== null) {
                return (Number(balance) / 1000000).toFixed(2);
            }

            // Fallback for older or different SDK versions: check the accounts array directly
            const accounts = (simnet as any).accounts || [];
            const account = accounts.find((a: any) => a.address === address);
            if (account && account.balance !== undefined) {
                return (Number(account.balance) / 1000000).toFixed(2);
            }

            return "100.00";
        } catch (e) {
            console.error("[Simnet] Error fetching balance for", address, e);
            return "100.00";
        }
    });
}

/**
 * Mines empty blocks to advance the state of the simulation.
 */
export async function mineBlocks(count: number): Promise<void> {
    return runExclusively((simnet) => {
        return (simnet as any).mineEmptyBlocks(count);
    });
}

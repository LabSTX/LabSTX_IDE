import { init, initSimnet, Simnet } from '@stacks/clarinet-sdk-browser';

let simnetInstance: Simnet | null = null;
let initPromise: Promise<Simnet> | null = null;
let isWasmLoaded = false;
export let sessionID = 0;

// Global mutex to serialize all access to the single-threaded WASM engine
let executionQueue: Promise<void> = Promise.resolve();

/**
 * Initializes the WASM engine and a fresh Simnet session.
 */
export async function getSimnet(): Promise<Simnet> {
    if (simnetInstance) return simnetInstance;

    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            console.log("[Simnet] Creating environment...");

            // 1. Load WASM binary using the modern object-based API
            if (!isWasmLoaded) {
                console.log("[Simnet] Loading WASM from /clarinet_sdk_bg.wasm");
                try {
                    // Try named export 'init'
                    await init({ module_or_path: '/clarinet_sdk_bg.wasm' });
                    isWasmLoaded = true;
                    console.log("[Simnet] WASM loaded successfully.");
                } catch (wasmError) {
                    console.warn("[Simnet] Modern init failed, trying legacy path...", wasmError);
                    try {
                        await init('/clarinet_sdk_bg.wasm');
                        isWasmLoaded = true;
                    } catch (e2) {
                        console.error("[Simnet] Failed to load WASM binary. Debugger will not work.", e2);
                        throw e2;
                    }
                }
            }

            // 2. Create the SDK instance
            const instance = await initSimnet();

            // 3. Initialize the session
            // We try different initialization strategies to satisfy different SDK versions
            console.log("[Simnet] Initializing session...");
            try {
                // Strategy A: Modern SDKs often expect an empty config object or specific fields
                await (instance as any).initEmptySession({ enabled: false });
                console.log("[Simnet] Session initialized with config.");
            } catch (e) {
                console.warn("[Simnet] initEmptySession with config failed, trying empty call...", e);
                try {
                    // Strategy B: Some versions require NO arguments
                    await (instance as any).initEmptySession();
                    console.log("[Simnet] Session initialized (no-args).");
                } catch (e2) {
                    console.warn("[Simnet] initEmptySession failed completely, trying initSession fallback...");
                    // Strategy C: Absolute fallback to project-style init
                    await (instance as any).initSession(".", "Clarinet.toml");
                    console.log("[Simnet] Session initialized via project fallback.");
                }
            }

            // 4. Configure session properties
            console.log("[Simnet] Configuring devnet defaults...");
            (instance as any).deployer = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

            // Set epoch to support modern Clarity (2.5 is very safe, 3.0 is preferred but can panic)
            try {
                // We attempt to set a modern epoch. If this fails, we log it but don't crash.
                // The most common reason for failure is "Session not initialized" which means
                // all of the above strategies failed.
                console.log("[Simnet] Setting epoch to 2.5...");
                (instance as any).setEpoch("2.5");
                console.log("[Simnet] Epoch 2.5 active.");
            } catch (e) {
                console.error("[Simnet] CRITICAL: Failed to set epoch. Context:", e);
                // If we can't set epoch AND we just "successfully" initialized session,
                // then something is fundamentally wrong with the WASM state.
            }

            simnetInstance = instance;
            console.log("[Simnet] Clarity Simnet is ready.");
            return instance;
        } catch (error) {
            console.error("[Simnet] CRITICAL INITIALIZATION FAILURE:", error);
            initPromise = null;
            throw error;
        }
    })();

    return initPromise;
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

/* clarityClient.ts
 *
 * JSON-RPC bridge between the main thread and the Clarity WASM LSP worker.
 *
 * The Clarity WASM LSP requires two things to work:
 * 1. `window.vfs(path)` to be populated with Clarinet.toml AND contract files
 * (the WASM calls this to resolve contract-to-manifest associations).
 * 2. The standard LSP `textDocument/didOpen` notifications.
 *
 * Order of operations MUST be:
 * initClarityLSP()
 * → updateVFS({ 'file:///Clarinet.toml': tomlContent, [contractUri]: contractContent })
 * → sendManifest(tomlContent)          (strips [[project.requirements]], opens toml)
 *   internally:
 *     1. Send manifest WITHOUT requirements so WASM doesn't panic on missing files
 *     2. Fetch requirement contract sources from chain in parallel
 *     3. Register fetched sources in VFS
 *     4. Re-send manifest WITH requirements restored so LSP resolves traits
 * → sendDidOpen(contractUri, ...)      (textDocument/didOpen for the contract)
 */

import type * as Monaco from "monaco-editor";

// The statically-imported monaco-editor module is NOT guaranteed to be the
// same runtime instance @monaco-editor/react loads for <Editor/>. Diagnostics
// must look up models in the SAME instance the editor actually uses, so the
// live instance is injected from the component via attachMonaco().
let monacoApi: typeof Monaco | null = null;

export function attachMonaco(instance: typeof Monaco): void {
  monacoApi = instance;
}

declare global {
  interface Window {
    vfs?: (path: string, length?: number) => string;
  }
}

const vfsFiles: Record<string, string> = {};

function ensureWindowVFS(): void {
  if (window.vfs) return;
  (window as any).vfs = (_path: string) => {
    const normalized = normalizeVfsPath(_path);
    return vfsFiles[normalized] ?? "";
  };
}

let worker: Worker | null = null;
let initialized = false;
let isStarting = false;
let initPromise: Promise<void> | null = null;
let requestId = 0;

let manifestOpen = false;
let serverReady = false;
let serverReadyPromise: Promise<void> | null = null;
let serverReadyResolver: (() => void) | null = null;

let documentIndexedPromise: Promise<void> | null = null;
let documentIndexedResolver: (() => void) | null = null;

export function waitForDocumentIndexed(): Promise<void> {
  if (!documentIndexedPromise) {
    documentIndexedPromise = new Promise((resolve) => {
      documentIndexedResolver = resolve;
    });
  }
  return documentIndexedPromise;
}

function resetDocumentIndexed(): void {
  documentIndexedPromise = null;
  documentIndexedResolver = null;
}

const pendingRequests = new Map<
  number,
  {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    method?: string;
  }
>();

const queuedNotifications: Array<{ method: string; params: any }> = [];

function createServerReadyPromise(): void {
  serverReady = false;
  serverReadyPromise = new Promise((resolve) => {
    serverReadyResolver = resolve;
  });
}

// ── Init ───────────────────────────────────────────────────────────────────────

export async function initClarityLSP(): Promise<void> {
  if (initialized) return;
  if (isStarting && initPromise) return initPromise;

  isStarting = true;
  initPromise = (async () => {
    try {
      ensureWindowVFS();
      createServerReadyPromise();
      // Using the production serverBrowser.js as the worker entry point from the public directory
      worker = new Worker("/serverBrowser.js", {
        type: "module",
      });

      worker.onmessage = (e) => {
        console.log("[ClarityLSP] received message", e.data);
        const { method, params, id, result, error, type, message } = e.data;

        if (type === 'custom_log') {
            const match = message.match(/contract (file:\/\/\/[^\s]+)/);
            if (message.includes('No Clarinet.toml is associated to the contract') && match) {
                window.dispatchEvent(new CustomEvent('clarityLspUnassociatedContract', { detail: { path: match[1] } }));
            } else {
                window.dispatchEvent(new CustomEvent('clarityLspGenericError', { detail: { message: message } }));
            }
            return;
        }

        const isResponse =
          id !== undefined && (result !== undefined || error !== undefined);
        if (isResponse) {
          const pending = pendingRequests.get(id);
          if (pending) {
            pendingRequests.delete(id);
            if (error) {
              console.warn(
                `[ClarityLSP] response error id=${id} method=${pending.method}`,
                error,
              );
              pending.reject(error);
            } else {
              console.log(
                `[ClarityLSP] response result id=${id} method=${pending.method}`,
                result,
              );
              if (pending.method === "textDocument/hover") {
                console.log("[ClarityLSP] hover response payload", result);
              }
              pending.resolve(result);
            }
          } else {
            console.warn(
              `[ClarityLSP] no pending request for response id=${id}`,
              e.data,
            );
          }
          return;
        }

        if (method === "serverWorkerReady") {
          console.log("[ClarityLSP] worker reported ready");
          serverReady = true;
          serverReadyResolver?.();
          serverReadyResolver = null;
          return;
        }

        if (method) {
          if (method === "vfs/readFile" && id !== undefined) {
            const rawPath = params?.path;
            const path = rawPath ? normalizeVfsPath(rawPath) : undefined;
            const found = path && vfsFiles[path] !== undefined;
            const content = found ? vfsFiles[path] : "";
            if (!found) {
              const isCacheMiss = rawPath?.includes(".cache/");
              const logFn = isCacheMiss ? console.debug : console.warn;
            logFn(`[ClarityLSP] vfs/readFile MISS: raw="${rawPath}" normalized="${path}"`);
    // Must reject, not resolve with "". An empty-string "hit" makes
    // retrieve_contract() treat a missing metadata.json as successfully
    // read, fail to JSON-parse it, and bubble an Err out of the whole
    // build — killing diagnostics/hover/completion for every contract,
    // not just the one with the trait. Mirror vscode's fs.readFile,
    // which throws ENOENT here (see customVFS.ts upstream).
    worker?.postMessage({
      jsonrpc: "2.0",
      id,
      error: { code: -32001, message: `ENOENT: ${path ?? rawPath} not found` },
    });
    return;
  }

  worker?.postMessage({ jsonrpc: "2.0", id, result: vfsFiles[path!] });
  return;
}
          if (method === "vfs/exists" && id !== undefined) {
            const path = params?.path
              ? normalizeVfsPath(params.path)
              : undefined;
            const exists = path ? vfsFiles[path] !== undefined : false;
            worker?.postMessage({ jsonrpc: "2.0", id, result: exists });
            return;
          }

          if (method === "vfs/readFiles" && id !== undefined) {
            const paths = params?.paths;
            if (Array.isArray(paths)) {
              console.log(`[ClarityLSP] server requested VFS readFiles for:`, paths);
              const result: Record<string, string> = {};
              for (const rawPath of paths) {
                const p = normalizeVfsPath(rawPath);
                if (vfsFiles[p] !== undefined) {
                  result[rawPath] = vfsFiles[p];
                } else {
                  console.warn(`[ClarityLSP] MISSING from VFS during readFiles:`, p);
                }
              }
              worker?.postMessage({ jsonrpc: "2.0", id, result });
            } else {
              worker?.postMessage({ jsonrpc: "2.0", id, result: {} });
            }
            return;
          }
          if (method === "vfs/writeFile" && id !== undefined) {
  const rawPath = params?.path;
  const path = rawPath ? normalizeVfsPath(rawPath) : undefined;
  const contentBytes = params?.content; // Vec<u8> from Rust → JS array of numbers
  if (path && Array.isArray(contentBytes)) {
    vfsFiles[path] = new TextDecoder().decode(Uint8Array.from(contentBytes));
    console.log(`[ClarityLSP] vfs/writeFile cached: ${path} (${contentBytes.length} bytes)`);
  }
  worker?.postMessage({ jsonrpc: "2.0", id, result: null });
  return;
}

          if (method === "textDocument/publishDiagnostics") {
            const { uri, diagnostics } = params;
            console.log(`[ClarityLSP] Received publishDiagnostics for ${uri}:`, diagnostics.length, "diagnostics");
            const model = resolveModelForUri(uri);
            if (model && monacoApi) {
              const markers = diagnostics.map((d: any) => ({
                severity:
                  d.severity === 1
                    ? monacoApi!.MarkerSeverity.Error
                    : d.severity === 2
                      ? monacoApi!.MarkerSeverity.Warning
                      : d.severity === 3
                        ? monacoApi!.MarkerSeverity.Info
                        : monacoApi!.MarkerSeverity.Hint,
                message: d.message ?? `${d.code ?? "unknown"} error`,
                source: d.source,
                code: d.code,
                startLineNumber: d.range.start.line + 1,
                startColumn: d.range.start.character + 1,
                endLineNumber: d.range.end.line + 1,
                endColumn: d.range.end.character + 1,
              }));
              monacoApi.editor.setModelMarkers(model, "clarity", markers);
            } else {
              console.debug(
                `[ClarityLSP] Dropped marker rendering for ${uri} (model not found)`,
              );
            }
            window.dispatchEvent(new CustomEvent('clarityLspDiagnostics', { detail: { uri, diagnostics } }));

            if (documentIndexedResolver) {
              documentIndexedResolver();
              documentIndexedResolver = null;
            }
            return;
          }

          // Acknowledge server→client requests that we don't need to act on
          if (
            id !== undefined &&
            (method === "workspace/codeLens/refresh" ||
              method === "workspace/semanticTokens/refresh" ||
              method === "workspace/inlayHint/refresh")
          ) {
            worker?.postMessage({ jsonrpc: "2.0", id, result: null });
            return;
          }

          if (id !== undefined) {
            console.debug(`[ClarityLSP] unhandled request: ${method}`);
            worker?.postMessage({ jsonrpc: "2.0", id, result: null });
            return;
          }
        }
      };

      initialized = true;
      await serverReadyPromise;

      console.debug("[ClarityLSP] worker ready, sending initialize request...");
      await request("initialize", {
        processId: null,
        rootUri: "file:///",
        capabilities: {
          textDocument: {
            publishDiagnostics: {
              relatedInformation: true,
              tagSupport: { valueSet: [1, 2] },
              versionSupport: true
            }
          }
        },
        initializationOptions: JSON.stringify({
          "clarity-lsp.completion": true,
          "clarity-lsp.formatting": true,
          "clarity-lsp.hover": true,
          "clarity-lsp.goToDefinition": true,
          "clarity-lsp.signatureHelp": true,
          "clarity-lsp.staticCostAnalysis": true
        })
      });
      rawNotify("initialized", {});

      console.debug("[ClarityLSP] initialization complete, flushing queued notifications");
      while (queuedNotifications.length > 0) {
        const { method, params } = queuedNotifications.shift()!;
        rawNotify(method, params);
      }
    } catch (err) {
      console.error("Failed to init Clarity LSP worker:", err);
      throw err;
    } finally {
      isStarting = false;
    }
  })();

  return initPromise;
}

// ── Messaging Helpers ──────────────────────────────────────────────────────────

function rawNotify(method: string, params: any): void {
  const message = { jsonrpc: "2.0", method, params };
  console.debug("[ClarityLSP] send notification", message);
  if (!worker) {
    queuedNotifications.push({ method, params });
    return;
  }
  worker.postMessage(message);
}

async function request(method: string, params: any): Promise<any> {
  await initClarityLSP();
  const id = requestId++;
  const message = { jsonrpc: "2.0", id, method, params };
  console.debug("[ClarityLSP] send request", message);
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`[ClarityLSP] Request ${method} timed out after 10s`));
    }, 10000);
    pendingRequests.set(id, {
      resolve: (val) => {
        clearTimeout(timeoutId);
        resolve(val);
      },
      reject: (err) => {
        clearTimeout(timeoutId);
        reject(err);
      },
      method,
    });
    // Extra trace for hover requests
    if (method === "textDocument/hover") {
      console.log(`[ClarityLSP] outgoing hover request id=${id}`, params);
    }
    worker!.postMessage(message);
  });
}

// ── VFS & Documents ────────────────────────────────────────────────────────────

/**
 * Updates the worker's internal Virtual File System.
 * Critical: The WASM engine uses this to resolve contract imports and the Clarinet.toml.
 */
function normalizeVfsPath(path: string): string {
  if (!path) return path;
  // Normalize backslashes as the worker expects URI path style
  let cleaned = path.replace(/\\/g, "/");
  // Strip all file: URI variants to a bare path
  if (cleaned.startsWith("file:///")) {
    cleaned = cleaned.slice("file:///".length);
  } else if (cleaned.startsWith("file://")) {
    cleaned = cleaned.slice("file://".length);
  } else if (cleaned.startsWith("file:/")) {
    cleaned = cleaned.slice("file:".length);
  }
  // Remove leading slashes/dots for canonical bare form
  cleaned = cleaned.replace(/^\.?\/+/, "");

  // Always store/lookup as file:///
  return `file:///${cleaned}`;
}

function resolveModelForUri(rawUri: string): Monaco.editor.ITextModel | null {
  if (!monacoApi) {
    console.warn(
      "[ClarityLSP] monaco not attached yet — call attachMonaco() from the editor component",
    );
    return null;
  }
  const normalizedUri = normalizeVfsPath(rawUri);
  const parsed = monacoApi.Uri.parse(normalizedUri);
  const primaryModel = monacoApi.editor.getModel(parsed);
  if (primaryModel) return primaryModel;

  const alternateUri = normalizedUri.startsWith("file:///")
    ? normalizedUri.replace("file:///", "file://")
    : normalizedUri;
  const lowercaseUri = normalizedUri.toLowerCase();
  const targetPath = parsed.path.toLowerCase();
  const targetScheme = parsed.scheme.toLowerCase();

  return (
    monacoApi.editor.getModels().find((m) => {
      const modelUri = m.uri.toString();
      if (modelUri === normalizedUri || modelUri === alternateUri) return true;
      if (modelUri.toLowerCase() === lowercaseUri) return true;
      if (m.uri.scheme.toLowerCase() !== targetScheme) return false;
      return m.uri.path.toLowerCase() === targetPath;
    }) || null
  );
}

export async function requestDiagnostics(uri: string): Promise<any> {
  const normalizedUri = normalizeVfsPath(uri);
  return request('textDocument/diagnostic', {
    textDocument: { uri: normalizedUri },
  });
}

export async function sendDidSave(uri: string, text?: string): Promise<void> {
  const normalizedUri = normalizeVfsPath(uri);
  // server declares save: { includeText: false } — it re-reads from the VFS
  // rather than the notification body, so make sure VFS is current first.
  if (text !== undefined) {
    await updateVFS({ [normalizedUri]: text });
  }
  rawNotify('textDocument/didSave', { textDocument: { uri: normalizedUri } });
}

export async function updateVFS(files: Record<string, string>): Promise<void> {
  await initClarityLSP();
  const normalizedFiles: Record<string, string> = {};
  for (const path in files) {
    const normalized = normalizeVfsPath(path);
    normalizedFiles[normalized] = files[path];
  }
  Object.assign(vfsFiles, normalizedFiles);
  ensureWindowVFS();
  console.log("[ClarityLSP] VFS keys:", Object.keys(vfsFiles));
  rawNotify("vfs/update", { files: normalizedFiles });
}

// ── Requirements Pre-fetcher ───────────────────────────────────────────────────

/**
 * Extracts [[project.requirements]] contract_ids from a Clarinet.toml string.
 *
 * Handles both inline array style and multi-entry block style:
 *   [[project.requirements]]
 *   contract_id = 'SP2PAB....nft-trait'
 */
function parseRequirementIds(toml: string): string[] {
  const ids: string[] = [];
  const lines = toml.split('\n');
  let inRequirementsBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '[[project.requirements]]') {
      inRequirementsBlock = true;
      continue;
    }

    // Any new section or table-array header ends the current requirements block
    if (trimmed.startsWith('[') && trimmed !== '[[project.requirements]]') {
      inRequirementsBlock = false;
    }

    if (inRequirementsBlock) {
      const match = trimmed.match(/^contract_id\s*=\s*['"]([^'"]+)['"]/);
      if (match && match[1]) {
        ids.push(match[1]);
      }
    }
  }

  return ids;
}

/**
 * Derives the VFS cache path the WASM LSP uses for a requirement contract.
 * Mirrors what Clarinet itself writes to disk:
 *   SP2PAB...nft-trait  →  file:///.cache/requirements/SP2PAB...nft-trait.clar
 */
function requirementCachePath(contractId: string): string {
  return `file:///.cache/requirements/${contractId}.clar`;
}

/**
 * Fetches [[project.requirements]] contract sources from the Stacks API and
 * registers them in the VFS so the WASM LSP can resolve trait definitions.
 *
 * - Runs all fetches in parallel via Promise.allSettled so one failure never
 *   blocks the others or crashes LSP boot.
 * - Short-circuits if a contract is already cached in the current VFS session.
 * - Must be called AFTER updateVFS (so initClarityLSP has run) but BEFORE
 *   the textDocument/didOpen notification for the manifest.
 */
async function prefetchRequirements(contractIds: string[]): Promise<void> {
  if (!contractIds.length) return;

  const fetches = contractIds.map(async (contractId) => {
    const cachePath = requirementCachePath(contractId);

    // Skip if already populated (e.g. user re-opens the same project)
    if (vfsFiles[cachePath] !== undefined) {
      console.debug(`[ClarityLSP] requirement already in VFS, skipping fetch: ${contractId}`);
      return;
    }

    // contract_id format is always "PRINCIPAL.contract-name"
    const dotIndex = contractId.indexOf('.');
    if (dotIndex === -1) {
      console.warn(`[ClarityLSP] malformed requirement contract_id (no dot): ${contractId}`);
      return;
    }
    const principal = contractId.slice(0, dotIndex);
    const name = contractId.slice(dotIndex + 1);

    // Hiro public API — no auth required for mainnet contract source
    const url = `https://api.hiro.so/v2/contracts/source/${principal}/${name}?proof=0`;

    try {
      console.log(`[ClarityLSP] fetching requirement: ${contractId}`);
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[ClarityLSP] HTTP ${res.status} fetching requirement ${contractId}`);
        return;
      }
      const json = await res.json();
      const source: string = json?.source ?? '';
      if (!source) {
        console.warn(`[ClarityLSP] empty source returned for requirement ${contractId}`);
        return;
      }
      // updateVFS normalises the path and notifies the worker
      await updateVFS({ [cachePath]: source });
      console.log(`[ClarityLSP] prefetched requirement → ${cachePath} (${source.length} chars)`);
    } catch (err) {
      // Network errors are non-fatal — LSP will degrade gracefully for missing traits
      console.warn(`[ClarityLSP] failed to fetch requirement ${contractId}:`, err);
    }
  });

  await Promise.allSettled(fetches);
}

// ── Manifest ───────────────────────────────────────────────────────────────────

const DEFAULT_DEVNET_TOML = `[network]
name = "devnet"

[accounts.deployer]
mnemonic = "twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw"
balance = 100000000000000

[accounts.wallet_1]
mnemonic = "sell invite acquire kitten bamboo drastic jelly vivid peace spawn twice guilt pave pen trash pretty park cube fragile unaware remain midnight betray rebuild"
balance = 100000000000000
`;

export async function sendManifest(
  text: string,
  contractFiles: Record<string, string> = {},
  devnetContent?: string,
  contractPath?: string,
): Promise<void> {
  let manifest = text || "";

  const canonicalContractPath = contractPath
    ? contractPath.replace(/^file:\/\/\//, "").replace(/^\/+/, "")
    : undefined;

  if (!manifest.trim() && canonicalContractPath) {
    const name = canonicalContractPath
      .replace(/^contracts\//, "")
      .replace(/\.clar$/, "");
    manifest = [
      `[project]`,
      `name = "project"`,
      `requirements = []`,
      ``,
      `[[project.contracts]]`,
      `name = "${name}"`,
      `path = "${canonicalContractPath}"`,
    ].join("\n");
  }

  const uri = "file:///Clarinet.toml";
  const devnet = devnetContent || DEFAULT_DEVNET_TOML;

  // Register the manifest, devnet config, and all contract files in VFS first.
  // The WASM LSP reads settings/Devnet.toml via file_accessor — it must exist.
  await updateVFS({
    [uri]: manifest,
    "file:///settings/Devnet.toml": devnet,
    "file:///Devnet.toml": devnet,
    ...contractFiles,
  });

  // Pre-populate VFS with any [[project.requirements]] contract sources so the
  // WASM can resolve trait definitions without hitting vfs/readFile misses.
  // This MUST happen after updateVFS (LSP is initialised) but BEFORE didOpen.
  const requirementIds = parseRequirementIds(manifest);
  if (requirementIds.length) {
    console.log(
      `[ClarityLSP] sendManifest: prefetching ${requirementIds.length} requirement(s):`,
      requirementIds,
    );
    await prefetchRequirements(requirementIds);
  }

  console.log("[ClarityLSP] sendManifest:", {
    manifestUri: uri,
    manifestLength: manifest.length,
    vfsKeys: Object.keys(vfsFiles),
    contractFileCount: Object.keys(contractFiles).length,
    requirementCount: requirementIds.length,
    generatedManifest: !text?.trim() && canonicalContractPath,
  });

  if (manifestOpen) {
    rawNotify("textDocument/didClose", { textDocument: { uri } });
  }
  manifestOpen = true;

  rawNotify("textDocument/didOpen", {
    textDocument: { uri, languageId: "toml", version: 1, text: manifest },
  });
}

export function closeManifest(): void {
  if (manifestOpen) {
    rawNotify("textDocument/didClose", {
      textDocument: { uri: "file:///Clarinet.toml" },
    });
    manifestOpen = false;
  }
}

function ensureNetworkSection(toml: string): string {
  if (!toml || toml.trim() === "") return DEFAULT_DEVNET_TOML;
  if (/^\[network\]/m.test(toml)) return toml;
  return toml + '\n[network]\nname = "mainnet"\n';
}

export async function sendDidOpen(
  uri: string,
  languageId: string,
  version: number,
  text: string,
): Promise<void> {
  resetDocumentIndexed();
  const normalizedUri = normalizeVfsPath(uri);
  // Ensure this contract is also in VFS (belt-and-suspenders)
  await updateVFS({ [normalizedUri]: text });
  rawNotify("textDocument/didOpen", {
    textDocument: { uri: normalizedUri, languageId, version, text },
  });
}

export function sendDidChange(
  uri: string,
  version: number,
  text: string,
): void {
  const normalizedUri = normalizeVfsPath(uri);
  // Keep VFS current so the WASM re-reads the right content
  updateVFS({ [normalizedUri]: text })
    .catch((err) => {
      console.warn("[ClarityLSP] updateVFS failed during didChange", err);
    })
    .finally(() => {
      rawNotify("textDocument/didChange", {
        textDocument: { uri: normalizedUri, version },
        contentChanges: [{ text }],
      });
    });
}

export function sendDidClose(uri: string): void {
  const normalizedUri = normalizeVfsPath(uri);
  rawNotify("textDocument/didClose", { textDocument: { uri: normalizedUri } });
}

// ── Features ───────────────────────────────────────────────────────────────────

export async function requestHover(
  uri: string,
  line: number,
  character: number,
): Promise<any> {
  const normalizedUri = normalizeVfsPath(uri);
  const res = await request("textDocument/hover", {
    textDocument: { uri: normalizedUri },
    position: { line, character },
  });
  return res;
}

export async function requestCompletion(
  uri: string,
  line: number,
  character: number,
): Promise<any> {
  const normalizedUri = normalizeVfsPath(uri);
  const res = await request("textDocument/completion", {
    textDocument: { uri: normalizedUri },
    position: { line, character },
  });
  return res;
}

export async function requestDefinition(
  uri: string,
  line: number,
  character: number,
): Promise<any> {
  const normalizedUri = normalizeVfsPath(uri);
  return request("textDocument/definition", {
    textDocument: { uri: normalizedUri },
    position: { line, character },
  });
}

export async function requestFormatting(uri: string): Promise<any> {
  const normalizedUri = normalizeVfsPath(uri);
  return request("textDocument/formatting", {
    textDocument: { uri: normalizedUri },
    options: {
      tabSize: 4,
      insertSpaces: true,
    },
  });
}

export function stopClarityLSP(): void {
  worker?.terminate();
  worker = null;
  initialized = false;
  manifestOpen = false;
  serverReady = false;
  serverReadyPromise = null;
  serverReadyResolver = null;
  pendingRequests.clear();
}

export function resetLSP(): void {
  console.log("[ClarityLSP] Resetting LSP worker...");
  stopClarityLSP();
  initClarityLSP().catch(console.error);
}
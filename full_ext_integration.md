# LabSTX IDE — Extension Integration Guide

> **Version:** 1.0  
> **Audience:** Extension developers who want to build plugins for the LabSTX IDE.  
> **Scope:** Architecture overview, the Extension API surface, manifest format, lifecycle hooks, tab/editor/sidebar interaction, event bus, and complete worked examples.

---

## Table of Contents

1. [Overview](#1-overview)
2. [How the Extension System Works](#2-how-the-extension-system-works)
3. [Extension Manifest (`labstx-ext.json`)](#3-extension-manifest-labstx-extjson)
4. [Extension Entry Point](#4-extension-entry-point)
5. [The LabSTX Extension API](#5-the-labstx-extension-api)
   - 5.1 [Tab API](#51-tab-api)
   - 5.2 [Editor API](#52-editor-api)
   - 5.3 [Sidebar API](#53-sidebar-api)
   - 5.4 [Commands API](#54-commands-api)
   - 5.5 [Event Bus API](#55-event-bus-api)
   - 5.6 [File System API](#56-file-system-api)
   - 5.7 [Terminal API](#57-terminal-api)
   - 5.8 [Notifications API](#58-notifications-api)
   - 5.9 [Storage API](#59-storage-api)
6. [Extension Lifecycle](#6-extension-lifecycle)
7. [UI Contribution Points](#7-ui-contribution-points)
8. [Working with Tabs — Deep Dive](#8-working-with-tabs--deep-dive)
9. [Working with the Monaco Editor](#9-working-with-the-monaco-editor)
10. [Complete Example Extensions](#10-complete-example-extensions)
    - [Example A: Word Count Panel](#example-a-word-count-panel)
    - [Example B: Auto-Formatter on Save](#example-b-auto-formatter-on-save)
    - [Example C: Custom Preview Tab](#example-c-custom-preview-tab)
    - [Example D: Contract Linter Sidebar](#example-d-contract-linter-sidebar)
11. [Extension Communication — Inter-Extension Messaging](#11-extension-communication--inter-extension-messaging)
12. [Security & Sandboxing Rules](#12-security--sandboxing-rules)
13. [Publishing Your Extension](#13-publishing-your-extension)
14. [Extension API Quick Reference](#14-extension-api-quick-reference)

---

## 1. Overview

LabSTX IDE supports a **first-class extension system** modelled closely after VS Code's extension model. Extensions are self-contained TypeScript/JavaScript modules that are loaded at runtime by the **Extension Host** — a sandboxed environment that mediates all interaction between the extension and the IDE core.

Extensions can:

- **Open, close, focus, and create editor tabs** (including fully custom React-rendered tabs)
- **Read and write files** in the virtual workspace
- **Decorate and manipulate the Monaco editor** (add decorations, hover providers, diagnostics, commands)
- **Register sidebar panels** in the left and right sidebars
- **Emit and listen to IDE events** (file save, compile finish, wallet connect, etc.)
- **Register commands** that appear in the Command Palette (Ctrl+Shift+P)
- **Write to the terminal and output panels**
- **Persist state** via a namespaced key-value store

---

## 2. How the Extension System Works

```
┌─────────────────────────────────────────────────────┐
│                   LabSTX IDE Core                    │
│                                                     │
│   App.tsx  ──► ExtensionHost  ──► Extension API     │
│                     │                               │
│           ┌─────────┼──────────┐                    │
│           ▼         ▼          ▼                    │
│      Tab Manager  EventBus  File System             │
└─────────────────────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    extension-a   extension-b   extension-c
   (sandboxed)   (sandboxed)   (sandboxed)
```

1. On startup, the IDE scans the `extensions/` folder inside the workspace root.
2. Each subfolder that contains a valid `labstx-ext.json` manifest is loaded.
3. The **Extension Host** calls each extension's `activate(context)` function, passing a `context` object that is the sole bridge to the IDE.
4. All IDE interaction **must** go through `context.api.*`. Direct import of IDE internals is forbidden.
5. On workspace close or extension disable, the host calls each extension's `deactivate()` function.

---

## 3. Extension Manifest (`labstx-ext.json`)

Every extension **must** include a `labstx-ext.json` file at its root.

```jsonc
{
  // Required fields
  "id": "my-publisher.my-cool-ext",       // Unique reverse-domain ID
  "name": "My Cool Extension",
  "version": "1.0.0",
  "description": "Does cool things in LabSTX IDE.",
  "author": "Your Name <you@example.com>",
  "main": "dist/index.js",                // Compiled entry point

  // Optional fields
  "icon": "assets/icon.png",              // 128x128 PNG
  "repository": "https://github.com/you/my-cool-ext",
  "license": "MIT",
  "engines": {
    "labstx": ">=1.2.0"                   // Minimum IDE version
  },

  // Contribution points — declarative registration
  "contributes": {

    // Commands registered in the Command Palette
    "commands": [
      {
        "id": "myCoolExt.sayHello",
        "title": "My Extension: Say Hello",
        "shortcut": "Ctrl+Shift+H"
      }
    ],

    // Activity bar icons linking to sidebar panels
    "activityBarItems": [
      {
        "id": "myCoolExt.panel",
        "title": "My Panel",
        "icon": "assets/panel-icon.svg",  // SVG preferred
        "position": "bottom"              // "top" | "bottom"
      }
    ],

    // File associations — activate extension when these are opened
    "activationEvents": [
      "onLanguage:clarity",               // On opening a .clar file
      "onCommand:myCoolExt.sayHello",     // On command execution
      "onTabOpen:@abi-*",                 // On ABI preview tab open
      "onStartup",                        // Always activate on IDE start
      "onFileOpen:.clar"                  // On .clar file open
    ],

    // Context menu items for editor tabs
    "tabContextMenu": [
      {
        "id": "myCoolExt.analyzeTab",
        "label": "Analyze with My Extension",
        "when": "tabLanguage == 'clarity'"  // Conditional display
      }
    ],

    // Status bar items
    "statusBarItems": [
      {
        "id": "myCoolExt.status",
        "text": "$(my-icon) Ready",
        "alignment": "right",             // "left" | "right"
        "priority": 100
      }
    ]
  }
}
```

---

## 4. Extension Entry Point

The `main` field points to a compiled JS file that **default-exports** an object with `activate` and optionally `deactivate` functions.

```typescript
// src/index.ts
import type { ExtensionContext } from '@labstx/ext-api';

export function activate(context: ExtensionContext): void {
  // All setup goes here
  console.log('[my-cool-ext] activated');

  // Register a command declared in the manifest
  context.api.commands.register('myCoolExt.sayHello', () => {
    context.api.notifications.info('Hello from My Cool Extension!');
  });

  // Push disposables so the IDE can clean up on deactivate
  context.subscriptions.push(
    context.api.events.on('file:saved', (e) => {
      console.log('File saved:', e.fileName);
    })
  );
}

export function deactivate(): void {
  // Optional cleanup — disposables are auto-disposed by the host
  console.log('[my-cool-ext] deactivated');
}
```

> **`context.subscriptions`** — An array of `Disposable` objects. Push anything returned by `on()`, `register()`, etc. The host will call `.dispose()` on all of them when the extension is deactivated.

---

## 5. The LabSTX Extension API

The full API is available on `context.api`. Below is the complete surface area.

---

### 5.1 Tab API

`context.api.tabs`

The Tab API lets you open, close, focus, list, and create fully custom tabs.

```typescript
interface TabsAPI {
  /**
   * Returns an array of all currently open tab IDs.
   * Special tab IDs: '@home', '@abi-<fileId>', '@md-<fileId>'
   */
  getOpen(): string[];

  /**
   * Returns the ID of the currently focused tab, or null.
   */
  getActive(): string | null;

  /**
   * Focuses (activates) an existing tab by ID.
   * Throws if the tab does not exist.
   */
  focus(tabId: string): void;

  /**
   * Opens a file from the virtual file system and focuses it.
   * Returns the tab ID that was activated.
   */
  openFile(fileId: string): string;

  /**
   * Closes a tab by ID. If it is the active tab, the IDE will
   * automatically focus the next available tab.
   */
  close(tabId: string): void;

  /**
   * Closes all open tabs.
   */
  closeAll(): void;

  /**
   * Opens a fully custom extension tab rendered with a React component.
   * The tab will receive the `tabId` as a prop.
   *
   * @param tabId     - Unique ID for the tab (prefix with your ext ID, e.g. 'myCoolExt.myTab')
   * @param label     - The label shown on the tab handle
   * @param component - A React component factory (() => JSX.Element)
   * @param options   - Optional: icon, closeable, preview mode
   */
  openCustom(
    tabId: string,
    label: string,
    component: React.ComponentType<{ tabId: string }>,
    options?: {
      icon?: string;         // URL or SVG string
      closeable?: boolean;   // default: true
      preview?: boolean;     // Opens as preview (italic tab) like VS Code
    }
  ): string;

  /**
   * Check if a tab is currently open.
   */
  isOpen(tabId: string): boolean;

  /**
   * Triggered when any tab becomes active.
   * Returns a Disposable.
   */
  onDidChangeActive(handler: (tabId: string | null) => void): Disposable;

  /**
   * Triggered when a tab is opened.
   */
  onDidOpen(handler: (tabId: string) => void): Disposable;

  /**
   * Triggered when a tab is closed.
   */
  onDidClose(handler: (tabId: string) => void): Disposable;
}
```

**Quick Examples:**

```typescript
// Open a file tab
context.api.tabs.openFile('simple-counter.clar');

// Open a custom React tab
import MyPanel from './MyPanel';
context.api.tabs.openCustom(
  'myCoolExt.dashboard',
  'My Dashboard',
  MyPanel,
  { preview: false }
);

// Focus the home tab
context.api.tabs.focus('@home');

// Listen for tab switches
context.subscriptions.push(
  context.api.tabs.onDidChangeActive((tabId) => {
    console.log('User switched to tab:', tabId);
  })
);
```

---

### 5.2 Editor API

`context.api.editor`

```typescript
interface EditorAPI {
  /**
   * Get the full text content of the currently active editor.
   * Returns null if no code editor is active (e.g. Home tab).
   */
  getText(): string | null;

  /**
   * Replace the entire content of the active editor.
   */
  setText(text: string): void;

  /**
   * Get selected text in the active editor.
   */
  getSelection(): string | null;

  /**
   * Replace selected text with new text.
   */
  replaceSelection(text: string): void;

  /**
   * Insert text at the current cursor position.
   */
  insertAtCursor(text: string): void;

  /**
   * Get the Monaco editor instance (underlying IStandaloneCodeEditor).
   * Use for advanced Monaco operations (decorations, markers, etc.)
   * May return null if the editor is not mounted.
   */
  getMonacoInstance(): import('monaco-editor').editor.IStandaloneCodeEditor | null;

  /**
   * Add decorations to the active editor.
   * Returns a decoration collection ID you can use to remove them later.
   */
  addDecorations(
    decorations: import('monaco-editor').editor.IModelDeltaDecoration[]
  ): string;

  /**
   * Remove decorations by their collection ID.
   */
  removeDecorations(collectionId: string): void;

  /**
   * Set error/warning/info markers (appears in Problems panel).
   */
  setMarkers(
    fileId: string,
    markers: import('monaco-editor').editor.IMarkerData[]
  ): void;

  /**
   * Clear all markers set by this extension.
   */
  clearMarkers(fileId?: string): void;

  /**
   * Register a hover provider for a language.
   * Returns a Disposable.
   */
  registerHoverProvider(
    language: string,
    provider: import('monaco-editor').languages.HoverProvider
  ): Disposable;

  /**
   * Register a completion provider for a language.
   */
  registerCompletionProvider(
    language: string,
    provider: import('monaco-editor').languages.CompletionItemProvider
  ): Disposable;

  /**
   * Move the editor cursor to a specific line and column.
   */
  goToLine(line: number, column?: number): void;

  /**
   * Scroll the editor so a specific line is visible.
   */
  revealLine(line: number): void;

  /**
   * Triggered whenever the active editor content changes.
   */
  onDidChangeContent(handler: (text: string) => void): Disposable;

  /**
   * Triggered when the active editor file changes (tab switch or file open).
   */
  onDidChangeActiveFile(handler: (fileId: string | null) => void): Disposable;
}
```

---

### 5.3 Sidebar API

`context.api.sidebar`

```typescript
interface SidebarAPI {
  /**
   * Register a React component as a panel in the left sidebar.
   * The panel appears in the Activity Bar as a clickable icon.
   * Must match an `activityBarItems` entry in your manifest.
   */
  registerLeftPanel(
    panelId: string,
    component: React.ComponentType
  ): Disposable;

  /**
   * Register a React component as a panel in the right sidebar.
   */
  registerRightPanel(
    panelId: string,
    component: React.ComponentType
  ): Disposable;

  /**
   * Switch the left sidebar to show your panel.
   */
  showLeftPanel(panelId: string): void;

  /**
   * Show/hide the left sidebar.
   */
  setLeftVisible(visible: boolean): void;

  /**
   * Show/hide the right sidebar.
   */
  setRightVisible(visible: boolean): void;
}
```

---

### 5.4 Commands API

`context.api.commands`

```typescript
interface CommandsAPI {
  /**
   * Register a handler for a command declared in your manifest.
   * Returns a Disposable.
   */
  register(commandId: string, handler: (...args: any[]) => any): Disposable;

  /**
   * Programmatically execute any registered command (yours or built-in).
   */
  execute(commandId: string, ...args: any[]): Promise<any>;

  /**
   * Built-in command IDs you can execute:
   *
   *   'labstx.compile'        — Run Clarinet Check on active file
   *   'labstx.debug'          — Open debug session
   *   'labstx.deploy'         — Switch to Deploy view
   *   'labstx.saveFile'       — Save active file
   *   'labstx.openHome'       — Open Home tab
   *   'labstx.openPreview'    — Open Preview tab for active file
   *   'labstx.toggleTerminal' — Toggle terminal panel
   */
}
```

---

### 5.5 Event Bus API

`context.api.events`

The Event Bus is the primary mechanism for reacting to IDE lifecycle events.

```typescript
interface EventBusAPI {
  /**
   * Subscribe to an IDE event.
   * Returns a Disposable — push to context.subscriptions.
   */
  on<T extends IDEEventName>(
    event: T,
    handler: (payload: IDEEventPayload[T]) => void
  ): Disposable;

  /**
   * Emit a custom event that other extensions can listen to.
   * Prefix your event name with your extension ID.
   */
  emit(event: string, payload?: any): void;
}

// ─── Built-in IDE Events ───────────────────────────────────────────────────

type IDEEventName =
  | 'file:opened'          // A file tab was opened
  | 'file:closed'          // A file tab was closed
  | 'file:saved'           // A file was saved (Ctrl+S)
  | 'file:changed'         // File content changed (debounced, 500ms)
  | 'file:created'         // A new file was created in the file tree
  | 'file:deleted'         // A file was deleted from the file tree
  | 'file:renamed'         // A file was renamed
  | 'tab:changed'          // Active tab switched
  | 'compile:started'      // Clarinet Check started
  | 'compile:success'      // Clarinet Check passed
  | 'compile:error'        // Clarinet Check failed
  | 'debug:started'        // Debug session opened
  | 'deploy:success'       // Contract deployed successfully
  | 'wallet:connected'     // Wallet connected
  | 'wallet:disconnected'  // Wallet disconnected
  | 'workspace:switched'   // User switched workspace
  | 'theme:changed'        // IDE theme toggled (dark/light)
  | 'terminal:command'     // User ran a terminal command
  | 'settings:changed';    // Project settings updated

// ─── Event Payload Types ───────────────────────────────────────────────────

interface IDEEventPayload {
  'file:opened':        { fileId: string; fileName: string; language: string };
  'file:closed':        { fileId: string; fileName: string };
  'file:saved':         { fileId: string; fileName: string; content: string };
  'file:changed':       { fileId: string; fileName: string; content: string };
  'file:created':       { fileId: string; fileName: string; type: 'file' | 'folder' };
  'file:deleted':       { fileId: string; fileName: string };
  'file:renamed':       { fileId: string; oldName: string; newName: string };
  'tab:changed':        { tabId: string | null; previousTabId: string | null };
  'compile:started':    { fileId: string; fileName: string };
  'compile:success':    { fileId: string; fileName: string; output: string };
  'compile:error':      { fileId: string; fileName: string; errors: string[] };
  'debug:started':      { fileId: string; fileName: string };
  'deploy:success':     { contractName: string; deployHash: string; network: string };
  'wallet:connected':   { type: string; address: string };
  'wallet:disconnected': {};
  'workspace:switched': { name: string };
  'theme:changed':      { theme: 'dark' | 'light' };
  'terminal:command':   { command: string };
  'settings:changed':   { key: string; value: any };
}
```

---

### 5.6 File System API

`context.api.fs`

```typescript
interface FileSystemAPI {
  /**
   * Read a file's content by its ID.
   * Returns null if the file doesn't exist.
   */
  read(fileId: string): string | null;

  /**
   * Write content to a file by its ID.
   * Creates the file if it doesn't exist (requires parentId for creation).
   */
  write(fileId: string, content: string): void;

  /**
   * Create a new file in the workspace.
   */
  create(
    parentId: string,
    name: string,
    type: 'file' | 'folder',
    content?: string
  ): string; // Returns the new fileId

  /**
   * Delete a file or folder (recursively).
   */
  delete(fileId: string): void;

  /**
   * Rename a file or folder.
   */
  rename(fileId: string, newName: string): void;

  /**
   * Find a file by name (searches entire workspace).
   * Returns the fileId or null.
   */
  find(name: string): string | null;

  /**
   * List all files in the workspace as a flat array.
   */
  list(): Array<{ id: string; name: string; type: 'file' | 'folder'; language?: string }>;

  /**
   * Get the full file tree as a nested FileNode structure.
   */
  getTree(): FileNode[];
}
```

---

### 5.7 Terminal API

`context.api.terminal`

```typescript
interface TerminalAPI {
  /**
   * Write a line to the terminal panel.
   */
  write(message: string, type?: 'info' | 'success' | 'error' | 'command' | 'warning'): void;

  /**
   * Write a line to the Output panel.
   */
  writeOutput(line: string): void;

  /**
   * Clear the terminal.
   */
  clear(): void;

  /**
   * Show the terminal panel (if hidden).
   */
  show(): void;
}
```

---

### 5.8 Notifications API

`context.api.notifications`

```typescript
interface NotificationsAPI {
  /** Show an info toast notification */
  info(message: string, options?: NotificationOptions): void;

  /** Show a success toast notification */
  success(message: string, options?: NotificationOptions): void;

  /** Show a warning toast notification */
  warning(message: string, options?: NotificationOptions): void;

  /** Show an error toast notification */
  error(message: string, options?: NotificationOptions): void;

  /**
   * Show a modal dialog with custom buttons.
   * Returns the label of the clicked button.
   */
  prompt(
    message: string,
    buttons: string[]
  ): Promise<string>;
}

interface NotificationOptions {
  duration?: number;       // ms, default 4000
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

---

### 5.9 Storage API

`context.api.storage`

Extensions get a namespaced key-value store backed by `localStorage`. The namespace is automatically prefixed with your extension ID.

```typescript
interface StorageAPI {
  get<T>(key: string, defaultValue?: T): T | undefined;
  set(key: string, value: any): void;
  delete(key: string): void;
  clear(): void;
  keys(): string[];
}
```

---

## 6. Extension Lifecycle

```
IDE Starts
    │
    ▼
Extension Host scans extensions/ folder
    │
    ▼
Reads labstx-ext.json for each extension
    │
    ▼
Checks activationEvents
    │
    ├── onStartup ──────────────────────► activate(context) immediately
    │
    ├── onLanguage:clarity ──────────────► activate(context) when user opens .clar
    │
    ├── onCommand:myExt.cmd ─────────────► activate(context) when command is invoked
    │
    └── onFileOpen:.clar ────────────────► activate(context) on file open
                                           matching pattern

    [Extension is active]
    │
    ├── context.api.* calls ──────────────► IDE responds
    │
    └── context.subscriptions ────────────► Auto-disposed on deactivate

IDE Closes / Extension Disabled
    │
    ▼
deactivate() called
    │
    ▼
All subscriptions auto-disposed
```

---

## 7. UI Contribution Points

| Contribution Point       | Where it appears                        | Manifest Key                |
|--------------------------|-----------------------------------------|-----------------------------|
| Command Palette command  | `Ctrl+Shift+P` palette                  | `contributes.commands`      |
| Activity Bar icon        | Left vertical icon bar                  | `contributes.activityBarItems` |
| Tab context menu item    | Right-click on an editor tab            | `contributes.tabContextMenu`|
| Status bar item          | Bottom red status bar                   | `contributes.statusBarItems`|
| Custom tab content       | Main editor area                        | `context.api.tabs.openCustom()` |
| Left sidebar panel       | Left sidebar (replaces Explorer, etc.)  | `context.api.sidebar.registerLeftPanel()` |
| Right sidebar panel      | Right sidebar (beside AI panel)         | `context.api.sidebar.registerRightPanel()` |
| Terminal line            | Terminal panel                          | `context.api.terminal.write()` |
| Editor decoration        | Monaco editor gutter/inline             | `context.api.editor.addDecorations()` |
| Monaco marker            | Problems panel + editor squiggle        | `context.api.editor.setMarkers()` |
| Hover provider           | Editor tooltip on hover                 | `context.api.editor.registerHoverProvider()` |
| Completion provider      | Editor autocomplete                     | `context.api.editor.registerCompletionProvider()` |

---

## 8. Working with Tabs — Deep Dive

### 8.1 Tab ID Conventions

| Tab Type              | ID Format                        | Example                         |
|-----------------------|----------------------------------|---------------------------------|
| Home tab              | `@home`                          | `@home`                         |
| Regular file          | The file's node ID               | `simple-counter.clar`           |
| ABI Preview tab       | `@abi-<fileId>`                  | `@abi-simple-counter.clar`      |
| Markdown Preview tab  | `@md-<fileId>`                   | `@md-README.md`                 |
| Extension custom tab  | Any string prefixed by your ext  | `myCoolExt.dashboard`           |

### 8.2 Triggering a Tab Programmatically

```typescript
// Open a file in a tab and focus it
context.api.tabs.openFile('simple-counter.clar');

// Trigger the built-in ABI preview for a clarity file
const tabId = '@abi-simple-counter.clar';
if (!context.api.tabs.isOpen(tabId)) {
  // Open the ABI tab first by running the built-in command
  await context.api.commands.execute('labstx.openPreview');
} else {
  context.api.tabs.focus(tabId);
}

// Open a completely custom tab
import { MyDashboard } from './MyDashboard';

context.api.tabs.openCustom(
  'myCoolExt.dashboard',
  '📊 Dashboard',
  MyDashboard,
  { closeable: true, preview: false }
);
```

### 8.3 Reacting to Tab Changes

```typescript
// Called every time the user switches tabs
context.subscriptions.push(
  context.api.tabs.onDidChangeActive((tabId) => {
    if (tabId?.startsWith('@abi-')) {
      const fileId = tabId.replace('@abi-', '');
      context.api.terminal.write(`ABI Preview opened for: ${fileId}`, 'info');
    }
  })
);
```

### 8.4 Injecting Content into the Tab via Events

If you have a custom tab open that needs to react to IDE events, use the Event Bus inside your React component:

```typescript
// Inside your custom tab component
import { useEffect, useState, useContext } from 'react';
import { ExtensionEventBusContext } from '@labstx/ext-api/react';

const MyCustomTab: React.FC<{ tabId: string }> = ({ tabId }) => {
  const eventBus = useContext(ExtensionEventBusContext);
  const [lastSave, setLastSave] = useState<string>('');

  useEffect(() => {
    const disposable = eventBus.on('file:saved', (e) => {
      setLastSave(`${e.fileName} saved at ${new Date().toLocaleTimeString()}`);
    });
    return () => disposable.dispose();
  }, []);

  return <div>Last save: {lastSave || 'No saves yet'}</div>;
};
```

---

## 9. Working with the Monaco Editor

### 9.1 Adding Decorations (Highlights)

```typescript
const monaco = context.api.editor.getMonacoInstance();
if (!monaco) return;

const decorationId = context.api.editor.addDecorations([
  {
    range: new monacoAPI.Range(3, 1, 3, 40),  // line 3, col 1–40
    options: {
      isWholeLine: false,
      className: 'ext-highlight-warning',    // CSS class you define
      glyphMarginClassName: 'ext-glyph-warning',
      hoverMessage: { value: '⚠️ This function is deprecated' }
    }
  }
]);

// Later — clean up
context.api.editor.removeDecorations(decorationId);
```

### 9.2 Registering a Hover Provider

```typescript
context.subscriptions.push(
  context.api.editor.registerHoverProvider('clarity', {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const docs: Record<string, string> = {
        'stx-transfer?': 'Transfers STX from sender to recipient. Returns `(response bool uint)`.',
        'map-get?':      'Retrieves a value from a map. Returns `(optional value-type)`.'
      };

      const content = docs[word.word];
      if (!content) return null;

      return {
        contents: [
          { value: `**Clarity Built-in** \`${word.word}\`` },
          { value: content }
        ]
      };
    }
  })
);
```

### 9.3 Setting Error Markers (Problems Panel)

```typescript
context.subscriptions.push(
  context.api.events.on('file:saved', async (e) => {
    if (!e.fileName.endsWith('.clar')) return;

    const issues = await myLinter.check(e.content);

    context.api.editor.setMarkers(e.fileId, issues.map(issue => ({
      severity: 8,     // monaco.MarkerSeverity.Error = 8
      message: issue.message,
      startLineNumber: issue.line,
      startColumn: issue.column,
      endLineNumber: issue.line,
      endColumn: issue.column + issue.length
    })));
  })
);
```

---

## 10. Complete Example Extensions

---

### Example A: Word Count Panel

A simple sidebar panel that displays live word/character/line counts for the active file.

**`labstx-ext.json`:**
```json
{
  "id": "demo.word-count",
  "name": "Word Count",
  "version": "1.0.0",
  "description": "Shows word/character/line count for the active file.",
  "main": "dist/index.js",
  "contributes": {
    "activityBarItems": [
      {
        "id": "wordCount.panel",
        "title": "Word Count",
        "icon": "assets/count-icon.svg",
        "position": "bottom"
      }
    ]
  }
}
```

**`src/WordCountPanel.tsx`:**
```tsx
import React, { useState, useEffect, useContext } from 'react';
import { ExtensionContext } from '@labstx/ext-api/react';

const WordCountPanel: React.FC = () => {
  const ctx = useContext(ExtensionContext);
  const [stats, setStats] = useState({ words: 0, chars: 0, lines: 0 });

  useEffect(() => {
    const update = () => {
      const text = ctx.api.editor.getText() ?? '';
      setStats({
        words: text.trim() === '' ? 0 : text.trim().split(/\s+/).length,
        chars: text.length,
        lines: text.split('\n').length
      });
    };

    update(); // Initial
    const d = ctx.api.editor.onDidChangeContent(text => {
      setStats({
        words: text.trim() === '' ? 0 : text.trim().split(/\s+/).length,
        chars: text.length,
        lines: text.split('\n').length
      });
    });

    return () => d.dispose();
  }, []);

  return (
    <div style={{ padding: 16, color: 'var(--color-text)' }}>
      <h3>📝 Word Count</h3>
      <table>
        <tbody>
          <tr><td>Words</td><td><strong>{stats.words}</strong></td></tr>
          <tr><td>Characters</td><td><strong>{stats.chars}</strong></td></tr>
          <tr><td>Lines</td><td><strong>{stats.lines}</strong></td></tr>
        </tbody>
      </table>
    </div>
  );
};

export default WordCountPanel;
```

**`src/index.ts`:**
```typescript
import type { ExtensionContext } from '@labstx/ext-api';
import WordCountPanel from './WordCountPanel';

export function activate(context: ExtensionContext) {
  context.api.sidebar.registerLeftPanel('wordCount.panel', WordCountPanel);
}
```

---

### Example B: Auto-Formatter on Save

Automatically formats Clarity code every time a `.clar` file is saved.

```typescript
// src/index.ts
import type { ExtensionContext } from '@labstx/ext-api';
import { formatClarity } from './formatter';

export function activate(context: ExtensionContext) {

  context.subscriptions.push(
    context.api.events.on('file:saved', async (e) => {
      if (!e.fileName.endsWith('.clar')) return;

      const formatted = formatClarity(e.content);
      if (formatted !== e.content) {
        context.api.editor.setText(formatted);
        context.api.terminal.write(
          `[Auto-Formatter] Formatted ${e.fileName}`,
          'success'
        );
      }
    })
  );

  // Register a manual format command as well
  context.subscriptions.push(
    context.api.commands.register('formatter.formatNow', () => {
      const text = context.api.editor.getText();
      if (!text) return;
      context.api.editor.setText(formatClarity(text));
      context.api.notifications.success('File formatted!');
    })
  );
}
```

---

### Example C: Custom Preview Tab

Opens a custom "Contract Visualiser" tab that renders a flowchart of the active Clarity contract's functions.

```typescript
// src/index.ts
import type { ExtensionContext } from '@labstx/ext-api';
import ContractVisualiser from './ContractVisualiser';

export function activate(context: ExtensionContext) {
  const TAB_ID = 'contractVis.mainTab';

  context.subscriptions.push(
    context.api.commands.register('contractVis.open', () => {
      const text = context.api.editor.getText();
      if (!text) {
        context.api.notifications.warning('Open a Clarity file first.');
        return;
      }

      // Pass the current code via storage so the component can read it
      context.api.storage.set('currentCode', text);

      context.api.tabs.openCustom(
        TAB_ID,
        '🔷 Contract Visualiser',
        ContractVisualiser,
        { closeable: true }
      );
    })
  );

  // Update the tab when the file changes
  context.subscriptions.push(
    context.api.editor.onDidChangeContent((text) => {
      if (context.api.tabs.isOpen(TAB_ID)) {
        context.api.storage.set('currentCode', text);
        // ContractVisualiser can poll storage or use its own event listener
        context.api.events.emit('contractVis:codeUpdated', { code: text });
      }
    })
  );
}
```

---

### Example D: Contract Linter Sidebar

A sidebar panel listing all warnings in the current Clarity file, with click-to-navigate.

```typescript
// src/index.ts
import type { ExtensionContext } from '@labstx/ext-api';
import LinterPanel from './LinterPanel';
import { runLint, LintIssue } from './linter';

export function activate(context: ExtensionContext) {
  context.api.sidebar.registerLeftPanel('linter.panel', LinterPanel);

  let issues: LintIssue[] = [];

  const runLintAndUpdate = (fileId: string, content: string, fileName: string) => {
    if (!fileName.endsWith('.clar')) {
      context.api.editor.clearMarkers(fileId);
      return;
    }

    issues = runLint(content);

    // Update Monaco markers (shows squiggles + Problems panel)
    context.api.editor.setMarkers(fileId, issues.map(i => ({
      severity: i.severity === 'error' ? 8 : 4,
      message: i.message,
      startLineNumber: i.line,
      startColumn: i.column,
      endLineNumber: i.line,
      endColumn: i.endColumn
    })));

    // Push to storage so the panel can read it
    context.api.storage.set('lintIssues', issues);
    context.api.events.emit('linter:updated', { issues });
  };

  context.subscriptions.push(
    context.api.events.on('file:changed', (e) => {
      runLintAndUpdate(e.fileId, e.content, e.fileName);
    })
  );

  context.subscriptions.push(
    context.api.events.on('tab:changed', () => {
      const text = context.api.editor.getText();
      // We need fileId & fileName — resolve via tabs API
      const activeTab = context.api.tabs.getActive();
      if (text && activeTab) {
        runLintAndUpdate(activeTab, text, activeTab); // simplified
      }
    })
  );
}
```

---

## 11. Extension Communication — Inter-Extension Messaging

Extensions can communicate with each other using the Event Bus with namespaced event names.

**Extension A (publisher):**
```typescript
// Emit a custom event
context.api.events.emit('extensionA:analysisComplete', {
  fileId: 'counter.clar',
  results: { complexity: 42, warnings: 3 }
});
```

**Extension B (subscriber):**
```typescript
// Listen for Extension A's event
context.subscriptions.push(
  context.api.events.on('extensionA:analysisComplete' as any, (payload: any) => {
    context.api.notifications.info(
      `Analysis done for ${payload.fileId}: complexity ${payload.results.complexity}`
    );
  })
);
```

> **Convention:** Prefix custom events with your extension ID to avoid collisions. E.g. `my-publisher.my-ext:eventName`.

---

## 12. Security & Sandboxing Rules

Extensions in LabSTX run in a **restricted sandbox**. The following rules are enforced:

| Action | Allowed | Reason |
|---|---|---|
| Access `context.api.*` | ✅ Yes | Approved IDE bridge |
| Import npm packages bundled in your extension | ✅ Yes | You control your bundle |
| `fetch()` to external URLs | ✅ Yes (with CSP rules) | Network access permitted |
| Direct DOM manipulation (outside your React component's root) | ❌ No | Could break IDE UI |
| `window.parent.*` or iframe escape | ❌ No | Sandboxed |
| Direct access to `window.localStorage` (not via `context.api.storage`) | ❌ No | Namespace collision risk |
| Access to other extension's `context` | ❌ No | Use Event Bus instead |
| Dynamic `import()` of IDE-internal modules | ❌ No | Use the API |
| `eval()` or `new Function()` | ❌ No | XSS risk |
| Reading the host filesystem (node `fs` module) | ❌ No | Browser environment; use File System API |

---

## 13. Publishing Your Extension

### Folder Structure

Place your extension inside the workspace `extensions/` folder:

```
extensions/
└── my-publisher.my-ext/
    ├── labstx-ext.json      ← Required manifest
    ├── dist/
    │   └── index.js         ← Compiled JS (main entry)
    ├── assets/
    │   └── icon.svg
    └── src/
        └── index.ts         ← Source (not loaded directly)
```

### Build Configuration

Use `esbuild` or `webpack` to bundle your extension. Key settings:

```js
// esbuild.config.js
require('esbuild').build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'browser',
  format: 'esm',
  external: [
    '@labstx/ext-api',  // Provided by the IDE host at runtime
    'react',            // Provided by the IDE
    'react-dom'         // Provided by the IDE
  ],
  tsconfig: 'tsconfig.json'
});
```

### TypeScript Setup

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "types": ["@labstx/ext-api/types"]
  }
}
```

### Dev Mode (Hot Reload)

During development you can enable **extension hot reload** from the IDE settings:

```
Settings → Extensions → Developer: Enable HMR for Extensions
```

When enabled, the IDE watches the `extensions/` folder and reloads changed extensions without a full restart.

---

## 14. Extension API Quick Reference

```typescript
// ─── Tabs ──────────────────────────────────────────────────────────────────
context.api.tabs.getOpen()                     // string[]
context.api.tabs.getActive()                   // string | null
context.api.tabs.openFile(fileId)              // string (tabId)
context.api.tabs.openCustom(id, label, Comp)   // string (tabId)
context.api.tabs.focus(tabId)                  // void
context.api.tabs.close(tabId)                  // void
context.api.tabs.isOpen(tabId)                 // boolean
context.api.tabs.onDidChangeActive(fn)         // Disposable
context.api.tabs.onDidOpen(fn)                 // Disposable
context.api.tabs.onDidClose(fn)                // Disposable

// ─── Editor ────────────────────────────────────────────────────────────────
context.api.editor.getText()                   // string | null
context.api.editor.setText(text)              // void
context.api.editor.getSelection()             // string | null
context.api.editor.replaceSelection(text)     // void
context.api.editor.insertAtCursor(text)       // void
context.api.editor.getMonacoInstance()        // IStandaloneCodeEditor | null
context.api.editor.addDecorations(decs)       // string (collectionId)
context.api.editor.removeDecorations(id)      // void
context.api.editor.setMarkers(fileId, marks)  // void
context.api.editor.clearMarkers(fileId?)      // void
context.api.editor.goToLine(line, col?)       // void
context.api.editor.registerHoverProvider(lang, provider)      // Disposable
context.api.editor.registerCompletionProvider(lang, provider) // Disposable
context.api.editor.onDidChangeContent(fn)     // Disposable
context.api.editor.onDidChangeActiveFile(fn)  // Disposable

// ─── Sidebar ───────────────────────────────────────────────────────────────
context.api.sidebar.registerLeftPanel(id, Comp)   // Disposable
context.api.sidebar.registerRightPanel(id, Comp)  // Disposable
context.api.sidebar.showLeftPanel(id)             // void
context.api.sidebar.setLeftVisible(v)             // void
context.api.sidebar.setRightVisible(v)            // void

// ─── Commands ──────────────────────────────────────────────────────────────
context.api.commands.register(id, handler)    // Disposable
context.api.commands.execute(id, ...args)     // Promise<any>

// ─── Events ────────────────────────────────────────────────────────────────
context.api.events.on(event, handler)         // Disposable
context.api.events.emit(event, payload?)      // void

// ─── File System ───────────────────────────────────────────────────────────
context.api.fs.read(fileId)                   // string | null
context.api.fs.write(fileId, content)         // void
context.api.fs.create(parentId, name, type)   // string (fileId)
context.api.fs.delete(fileId)                 // void
context.api.fs.rename(fileId, newName)        // void
context.api.fs.find(name)                     // string | null
context.api.fs.list()                         // FileInfo[]

// ─── Terminal ──────────────────────────────────────────────────────────────
context.api.terminal.write(msg, type?)        // void
context.api.terminal.writeOutput(line)        // void
context.api.terminal.clear()                  // void
context.api.terminal.show()                   // void

// ─── Notifications ─────────────────────────────────────────────────────────
context.api.notifications.info(msg, opts?)    // void
context.api.notifications.success(msg, opts?) // void
context.api.notifications.warning(msg, opts?) // void
context.api.notifications.error(msg, opts?)   // void
context.api.notifications.prompt(msg, btns)   // Promise<string>

// ─── Storage ───────────────────────────────────────────────────────────────
context.api.storage.get(key, default?)        // T | undefined
context.api.storage.set(key, value)           // void
context.api.storage.delete(key)               // void
context.api.storage.clear()                   // void
context.api.storage.keys()                    // string[]
```

---

*Document maintained by the LabSTX IDE team. For issues or contributions, open a PR at the LabSTX IDE repository.*

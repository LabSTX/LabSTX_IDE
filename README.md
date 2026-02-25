# LabSTX

**Browser-Based Clarity Smart Contract IDE for Stacks Blockchain**  

> **Live App**: [https://lab-stx-ide.vercel.app](https://lab-stx-ide.vercel.app)

---

## 🚀 Overview

LabSTX is a **fully browser-based IDE** for writing, compiling, deploying, testing, and debugging **Clarity smart contracts** on the **Stacks blockchain**.  

No local toolchain is required — everything runs in the browser via the **Clarinet SDK**.  

Inspired by Remix IDE, with a **VS Code-like interface**, AI assistance, GitHub integration, and live deployment pipelines.

---

## ✨ Key Features

### 🖊️ Code Editor
- Monaco Editor with **Clarity syntax highlighting**  
- Multi-file tabs with unsaved-change indicators  
- Undo/Redo, configurable editor settings (font size, word wrap, tab size, minimap)  
- Markdown preview & **ABI Preview** for Clarity contracts  
- Quick-start shortcuts for new files  

### 📁 File & Project Management
- In-browser virtual filesystem (create, rename, delete, move files/folders)  
- Project templates & ZIP import/export  
- GitHub integration: clone repos, OAuth authentication for private repos  

### ⚡ Compilation
- **Clarity in-browser checks** using `@stacks/clarinet-sdk-browser`  
- Post-condition and cost analysis for contracts  

### 🚀 Deployment
- Deploy Clarity contracts to **Stacks Testnet or Mainnet** via Hiro Wallet  
- Configure runtime arguments, entry points, and gas fees  
- View transaction & contract hashes  

### 🔗 Wallet Integration
- **Stacks Wallets**: Hiro Wallet via `@stacks/connect`  

### 🤖 AI Assistant
- Multi-provider AI support: **OpenRouter**, **ChainGPT**  
- Context-aware Clarity contract suggestions  
- `[UPDATE_FILE:]` and `[CREATE_FILE:]` commands  
- Bring Your Own Key (BYOK) supported  

### 🐛 Debugging
- **Clarity REPL** — interactive console for simnet evaluation  
- **State Inspector** — inspect contract data maps and variables  
- **Trace Viewer** — visualize execution traces and function calls  
- **Metadata Inspector** — view contract ABI  

### 🔌 Git Integration
- Git status panel: stage/unstage, commit, branch management  
- Backend Git API for operations  

### 📋 Terminal & Problems Panel
- Compilation & deployment logs  
- Problems tab with jump-to-line & copy features  

### ⌨️ Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| `Ctrl+S` | Save current file |
| `Ctrl+Shift+B` | Compile active contract |
| `Ctrl+Shift+D` | Deploy contract |
| `Ctrl+\`` | Toggle terminal |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |

---

## 🗂️ Project Structure


IDE/
├── components/ # UI Components (Editor, Debugger, Deploy, GitHub)
├── services/ # Blockchain, AI, Git services
├── examples/ # Starter Clarity contract templates
├── docs/ # Developer documentation
├── App.tsx # Root component
├── constants.ts # Default settings
├── types.ts # Type definitions
├── vite.config.ts
├── vercel.json
└── package.json


---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Vite + React + TypeScript |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Clarity (Stacks) | `@stacks/clarinet-sdk-browser`, `@stacks/connect`, `@stacks/transactions` |
| Wallet | Hiro Wallet (`@stacks/connect`) |
| AI Assistant | OpenRouter, ChainGPT |
| Archive / Export | `jszip` |
| Backend API | Node.js + Express (`labstx-ide-api.onrender.com`) |
| Deployment | Vercel |

---

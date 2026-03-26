# LabSTX

**Full Browser IDE for Clarity Smart Contracts (Multi-file, Clarinet-powered)**

> **Live App**: [https://lab-stx-ide.vercel.app](https://lab-stx-ide.vercel.app)

---

## 🚀 What is LabSTX?

LabSTX is a **browser-based IDE for building complete Clarity smart contract projects** — not just single-contract playgrounds.

It enables developers to:

* Create and manage **multi-file Clarity projects**
* Run **Clarinet-like workflows entirely in the browser**
* Deploy directly to **Stacks testnet and mainnet**
* Skip all local installation and environment setup

👉 **Core Idea:** Everything you normally need locally (Clarinet, file system, tooling) — now runs in your browser.

---

## ⚡ Why LabSTX exists

Clarity development today has a major friction point:

### Local Development Pain

To start building with Clarity using Clarinet locally, you typically need to:

* Install Clarinet CLI
* Set up your development environment
* Configure project structure manually
* Learn CLI commands before writing contracts

This creates a **high barrier to entry**, especially for:

* New developers
* Hackathon participants
* Developers coming from other ecosystems

---

## 💡 What LabSTX changes

LabSTX removes this friction by providing:

> A **zero-setup, full-featured Clarity IDE** that works instantly in the browser.

No installation. No configuration. No context switching.

---

## 🔥 Detailed Comparison

| Capability          | LabSTX (Browser IDE)                 | Clarinet (Local Setup)            |
| ------------------- | ------------------------------------ | --------------------------------- |
| Setup Time          | ✅ **0–1 min (open URL)**             | ❌ **10–30+ mins install & setup** |
| Environment Setup   | ❌ None required                      | ⚠️ Required (CLI, dependencies)   |
| Multi-file Projects | ✅ Full support                       | ✅ Full support                    |
| Clarinet Workflow   | ✅ In-browser                         | ✅ CLI-based                       |
| Deployment          | ✅ Built-in (UI)                      | ⚠️ CLI + wallet setup             |
| Debugging Tools     | ✅ Intergrated stxer.xyz              | ⚠️ CLI-based / limited UX         |
| AI Assistance       | ✅ Integrated                         | ❌ None                            |
| Learning Curve      | ✅ Low (UI-driven)                    | ❌ Higher (CLI-based)              |
| Accessibility       | ✅ Works anywhere (browser)           | ❌ Machine-dependent               |
| Onboarding Speed    | ✅ **Minutes**                        | ❌ **Hours (for beginners)**       |

👉 LabSTX reduces onboarding friction from **hours → minutes**.

---

## 🛠 Clarinet Command Support

LabSTX provides a web-based replacement for the most common Clarinet CLI workflows.

| Clarinet Command | LabSTX Support | Interface | Notes |
| :--- | :--- | :--- | :--- |
| `clarinet check` | ✅ **Full** | UI / Auto-run | Real-time syntax & logic verification |
| `clarinet test` | ✅ **Full** | UI / Terminal | Run unit tests with visual results |
| `clarinet console` | ✅ **Full** | Terminal | Interactive contract interaction |
| `clarinet contract new` | ✅ **Full** | Terminal | Create new contracts and test files |
| `clarinet requirements` | ✅ **Full** | Terminal | Dependency and requirement checking |
| `clarinet devnet start` | ❌ **No** | N/A | Docker/Local node orchestration not supported |
| `clarinet devnet stop` | ❌ **No** | N/A | Docker/Local node orchestration not supported |
| `clarinet integrate` | ❌ **Planned** | N/A | Complex integration testing in progress |

**Note**: Most commands are supported only the commands that needs docker like `clarinet devnet start` are not supported 

---

## ✨ Core Capabilities


### 🧠 Development Environment

* Monaco Editor with Clarity syntax highlighting
* Full **multi-file project system** (`Clarinet.toml` support)
* Tabbed editing with unsaved state tracking
* ABI preview and markdown rendering
* **Neo-Brutalist UI**: High-contrast, premium design for enhanced focus

### ⚙️ Execution & Compilation

* In-browser compilation using `Clarinet installed on the server`
* Real-time error reporting and terminal feedback

### 🚀 Deployment Pipeline

* Deploy contracts to **Stacks testnet and mainnet** via Leather Wallet
* Configure arguments, entry points, and gas fees visually
* View transaction hashes and contract IDs instantly
* **Live Hiro Explorer Links**: Direct links to view deployments on-chain

### 🐛 Debugging & Inspection

* Debug contract interaction with integrated stxer.xyz
* REPL environment for local testing

### 🔗 Integrations & AI

* GitHub integration (clone repositories, authentication)
* **AI Coding Assistant** (OpenRouter) with project context
* **AI Quota Tracking**: Real-time credits and usage monitoring
* ZIP import/export for project sharing

---

### 🔐 Security & Connectivity
* **Wallet-First Experience**: Connect your Stacks wallet (Laser/Xverse) to unlock full IDE potential
* Secure deployment environment with mandatory connection for sensitive operations
* Encrypted local storage for project state and settings

---

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to get started.

---

## 👥 Who is this for?

* **New developers** → Learn Clarity without setup friction
* **Hackathon builders** → Start building instantly
* **Experienced developers** → Rapid prototyping without context switching
* **Educators** → Teach Clarity in classrooms without installation issues

---

## 📈 Current Status

* ✅ Functional public beta
* ✅ Full IDE experience running in-browser
* 🚧 Actively being improved based on user feedback

---

## 🎯 Vision

LabSTX aims to:

* Lower the barrier to entry for Clarity development
* Increase the number of developers building on Stacks
* Provide a **complete alternative to local Clarinet workflows**
* Enable faster onboarding globally, especially in regions with limited dev setup resources

---

## 🧰 Tech Stack

* React + TypeScript + Vite
* Monaco Editor (`@monaco-editor/react`)
* `@stacks/clarinet-sdk-browser`
* `@stacks/connect`, `@stacks/transactions`
* Node.js backend (Git + API services)
* Vercel (deployment)

---

## 🔗 Links

* Live App: [https://lab-stx-ide.vercel.app](https://lab-stx-ide.vercel.app)
* GitHub: [https://github.com/LabSTX/LabSTX_IDE](https://github.com/LabSTX/LabSTX_IDE)

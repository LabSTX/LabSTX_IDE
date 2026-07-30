# <img src="./public/lab_stx_dark.png" alt="LabSTX Logo" width="40" align="center" /> LabSTX: Lightweight Smart Contract Clarity IDE &nbsp; <br/> [![Stacks Documentation](https://img.shields.io/badge/Stacks_Documentation-Referenced_&_Trusted-blue)](https://docs.stacks.co/clarinet/overview#additional-resources)

[![Watch the demo video](public/labstx-intro.mp4)](public/labstx-intro.mp4)

## Overview

LabSTX is a browser-native Integrated Development Environment (IDE) specifically engineered for the Clarity smart contract language. Unlike basic playgrounds, LabSTX supports multi-file project architectures powered by an integrated Clarinet runtime.

By abstracting away the complexities of local environment configuration, LabSTX enables developers to move from ideation to on-chain deployment in a single, cohesive web-based workflow.

---


## High-Level Objectives

* **Onboarding Efficiency:** Reduce developer setup time from hours to seconds.
* **Tooling Parity:** Provide the full power of the Clarinet CLI within a GUI-driven environment.
* **Accessibility:** Enable high-quality smart contract development from any hardware capable of running a modern browser.
* **Deployment Security:** Offer seamless, secure integration with leading Stacks wallets for Testnet and Mainnet execution.
* **Deployment Type:** Support both wallet extension and clarinet deployments types


## ⚡ The Motivation

Local development environments for Clarity often represent a significant barrier to entry. Managing dependencies such as the Clarinet CLI, and specific Node.js versions often leads to "it works on my machine" syndrome and high friction for new contributors.

LabSTX eliminates these barriers by providing a pre-configured, cloud-synced workspace.

## Feature Comparison: LabSTX IDE and its Alternatives

| Capability        | **LabSTX IDE (Cloud)**          | Clarinet (Local)           | Hiro IDE (official)| Hiro Sandbox | Claride |
| ----------------- | --------------------------- | -------------------------- | ----------------------- | ------- | --- |
| **Multi-file Support**| ✅ **Yes**                  | ✅ Yes                      | Partially | ❌ No | ⚠️ Limited |
| **LSP Support**| ✅ **Yes** (but still in preview v1.2.2)| ✅ Yes (not as default) |✅ Yes| ❌ No | ❌ No |
| **Templates**| ✅ **Yes** (Access to LabSTX Templates & Hiro Templates)                 | ❌ No| ❌ No | ❌ No | ❌ No |
| **Active Development**| ✅ **Yes**  | ⚠️ Periodic                 | ❌ Stale                | ❌ Stale | ❌ Stale |
| **Setup Latency** | ✅ Immediate (URL-based)     | ❌ ~30m Installation/Config | ✅ Immediate            | ✅ Immediate | ✅ Immediate |
| **Environment Sync**| ✅ Native Cloud Persistence | ❌ Machine-dependent        | ❌ Session-only         | ❌ Session-only | ❌ Session-only |
| **AI Integration**| ✅ Native Assistant         | ❌ Requires 3rd-party setup | ❌ No                   | ❌ No | ❌ No |
| **Wallet Integration**| ✅ Xverse & Leather + Simnet         | Simnet       | Wallet  Only  | Wallet Only| Wallet Only


## 🛠 Technical Features

### 1. Advanced Project Management

Bootstrapping a new protocol is streamlined via our Template Gallery. Whether building a simple SIP-010 token or a complex DAO structure, our templates provide the required `Clarinet.toml` and directory structures instantly.

<p align="center">
  <img src="./pics/template_view.JPG" alt="Template Gallery" width="85%"/>
</p>

<p align="center">
  <em>The LabSTX Template Gallery for standardized project initialization.</em>
</p>

### 2. Integrated Clarinet Runtime

We have mapped standard CLI workflows to an intuitive visual interface, ensuring that experienced developers feel at home while guiding newcomers through the development lifecycle.

| Command | Support | Interface | Implementation Detail |
| --- | --- | --- | --- |
| clarinet contracts new | ✅ Full | Terminal UI | Generate files and settings for a new contract |
| clarinet contracts rm | ✅ Full | Terminal UI | Remove files and settings for a contract |
| clarinet check | ✅ Full | Terminal UI | Validate contract syntax and perform type checking |
| clarinet test | ✅ Full | Terminal UI | Automated execution of Clarity unit tests |
| clarinet console | ✅ Full | Terminal UI | Interactive REPL for contract interaction and testing |
| clarinet deployments check | ✅ Full | Terminal UI | Check deployment file format |
| clarinet deployments generate | ✅ Full | Terminal UI | Generate a new deployment plan |
| clarinet deployments apply | ✅ Full | Terminal UI | Apply a deployment to Devnet, Testnet, or Mainnet |
| clarinet requirements add | ✅ Full | Terminal UI | Add a mainnet contract as a project dependency |
| clarinet lsp | ✅ Full | IDE / Editor | Start the Language Server Protocol service for Clarity |
| clarinet dap | ✅ Full | IDE / Editor | Start the Debug Adapter Protocol service for debugging |
| clarinet format | ✅ Full | Terminal UI | Format Clarity code files according to standard conventions |
| clarinet completions | ✅ Full | Terminal UI | Generate shell completion scripts |
| clarinet devnet start |  ❌ Not Supported | Terminal UI | Start a local Devnet network for interacting with contracts |
| clarinet devnet package | ❌ Not Supported | Terminal UI | Generate a package of required Devnet artifacts |



<br/>

<p align="center">
  <img src="./pics/clarinet_check.JPG" alt="Clarinet Check" width="85%"/>
</p>
<p align="center">
  <img src="./pics/clarinet_console.JPG" alt="Clarinet Console" width="85%"/>
  </p>
  <p><em>Standardised diagnostic checks and interactive REPL environment.</em></p>


<p align="center">
  <img src="./pics/npm-run-test_(clarinet_test).JPG" alt="Unit Testing" width="85%"/>
</p>

<p align="center">
  <em>Comprehensive unit testing output with integrated terminal reporting.</em>
</p>

### 3. AI-Assisted Development

The IDE features a context-aware AI assistant integrated via OpenRouter. The assistant analyzes your specific multi-file project structure to provide relevant code suggestions, debugging advice, and architectural optimizations.

<p align="center">
  <img src="./pics/ai_view.JPG" alt="AI Assistant" width="85%"/>
</p>

<p align="center">
  <em>AI Assistant for code generation and debugging.</em>
</p>

## ✨ Core Capabilities

### 🧠 Modern Development Environment

* **Monaco Editor:** Industry-standard editor with Clarity syntax highlighting.
* **Project System:** Full `Clarinet.toml` support and tabbed editing.
* **Neo-Brutalist UI:** A high-contrast, premium design aesthetic focused on developer productivity.

### 🚀 Deployment & Security

* **Direct-to-Chain:** Deploy to Stacks Testnet/Mainnet via Leather or Xverse wallets.
* **Visual Configuration:** Configure gas fees and arguments through a DeployPanel
* **Secure Auth:** Wallet-first experience ensures your private keys never touch the IDE.

### 🐛 Debugging

* **stxer.xyz Integration:** Deep link into advanced contract inspection tools.
* **Live Explorer Links:** Immediate access to Hiro Explorer after every transaction.

## 👥 Who is LabSTX for?

* **New Developers:** Learn Clarity without fighting installation errors.
* **Hackathon Builders:** Go from "Idea" to "Deployed" in record time.
* **Educators:** Lead workshops where every student has the exact same environment instantly.
* **Power Users:** Rapidly prototype new contract logic without cluttering your local machine.

## 🧰 Tech Stack

* **Frontend:** React, TypeScript, Vite
* **Editor:** Monaco Editor (`@monaco-editor/react`)
* **Blockchain Logic:** `@stacks/clarinet-sdk-browser`, `@stacks/connect`, `@stacks/transactions`
* **Backend:** Node.js (Git services, API, AI integration)
* **Deployment:** Vercel

## 🎯 Our Vision

LabSTX aims to lower the barrier to entry for the Stacks ecosystem. By providing a complete, browser-native alternative to local Clarinet workflows, we enable a global community of developers to build on Bitcoin-secured smart contracts regardless of their hardware or setup constraints.

## 💰 Donations

If you find this project useful, please consider supporting our development with a donation. Your contribution helps us maintain and improve the IDE, ensuring it remains a valuable resource for the Stacks community. You can send your donations:

[Donate Now!](https://labstx.online/donate)





Your generosity is greatly appreciated and will help us continue to serve the developer community!

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to get started.

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE).

© 2024 LabSTX Team. Built for the Stacks Community.

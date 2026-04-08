# LabSTX Technical Specification

**Version:** 1.2.1  
**Date:** April 8, 2026  
**Maintainer:** Prudence (OYEWALE PRUDENCE)  
**Repository:** https://github.com/LabSTX/LabSTX_IDE  
**Live IDE:** https://ide.labstx.online

## 1. Overview

LabSTX is a **fully browser-based IDE** for Clarity smart contract development on the Stacks blockchain. It eliminates the friction of local Clarinet setup by running a complete Clarinet environment directly in the browser.

**Core Goal:**  
Lower the onboarding barrier for new and existing Clarity developers (especially in regions like Africa) by providing a production-grade, multi-file development experience without any local installation.

## 2. Key Features

- Full multi-file Clarinet project support (Clarinet.toml, contracts/, tests/, settings/)
- Dynamic Hiro template integration for instant project scaffolding
- Built-in AI assistant (context-aware code generation and editing)
- GitHub OAuth integration (clone repositories directly into workspace)
- One-click deployment to testnet and mainnet via Xverse & Leather Wallet
- In-browser terminal + STXER debugger
- Real-time ABI preview and contract analysis
- Live analytics dashboard (deployments, wallet connections, usage metrics)

## 3. High-Level Architecture

LabSTX follows a **client-side heavy architecture**:

Browser (Client)
├── UI Layer (React + Tailwind + Neo-brutalist design)
├── Editor Layer (Monaco Editor + Clarity syntax highlighting)
├── Virtual Filesystem (WebContainer + in-memory FS)
├── Clarity Runtime (@stacks
/clarinet-sdk-browser)
├── AI Layer (OpenRouter / ChainGPT API)
├── Blockchain Integration (Xverse & Leather Wallet + Stacks.js)
└── Analytics Layer (local + optional backend tracking)

All heavy operations (compilation, testing, deployment simulation) run in the browser using WebContainer technology.

## 4. Tech Stack

| Layer              | Technology                                      |
|--------------------|-------------------------------------------------|
| Frontend Framework | React + TypeScript + Tailwind CSS               |
| Code Editor        | Monaco Editor                                   |
| In-browser Runtime | WebContainer + @stacks/clarinet-sdk-browser     |
| AI Integration     | OpenRouter + ChainGPT API                       |
| Blockchain         | @stacks/connect + Xverse & Leather Wallet                   |
| Authentication     | Wallet connect + GitHub OAuth                                    |
| Styling            | Tailwind + custom neo-brutalist design system   |
| Deployment         | Vercel (frontend) + GitHub for source control   |

## 5. Core Technical Components & Data Flow

1. **Virtual Filesystem**  
   - Uses WebContainer to emulate a full Node.js environment.
   - Supports `Clarinet.toml`, multiple contracts, tests, and settings.

2. **Compilation & Testing**  
   - Calls `@stacks/clarinet-sdk-browser` directly in the browser.
   - Results are streamed to the terminal and problems panel.

3. **AI Assistant**  
   - Sends current file + workspace context to OpenRouter/ChainGPT.
   - Can create new files or edit existing ones.

4. **Deployment Flow**  
   - Generates transaction using Stacks.js + Hiro Wallet.
   - Shows real-time status and explorer link.

5. **Analytics Dashboard**  
   - Tracks wallet connections, compilations, and deployments.
   - Data is stored locally and optionally synced (future).

## 6. Security & Performance Considerations

- All code execution happens in the browser sandbox (WebContainer).
- No server-side code execution for user contracts.
- Wallet interactions are handled exclusively through Hiro Wallet (no private keys stored).
- AI API keys are stored server-side (environment variables) and rate-limited.

## 7. Current Limitations

- Heavy reliance on browser resources (may be slower on low-end devices).
- No persistent cloud workspaces, only Browser Storage.
- Limited to single-user workspaces for now.

## 8. Future Roadmap (High-Level)

- Integration into https://docs.stacks.co/ as alternative to Local Clarinet for new developers
- Advanced debugging features
- More AI capabilities (test generation, security audit suggestions)
- Integration with external tools
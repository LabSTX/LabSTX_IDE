# LabSTX IDE: Deployment & Interaction Guide

This document explains how to use the **STX Contract Deploy** and **Interact with Contract** features within the LabSTX IDE.

## 1. Deploying a Contract

To deploy a Clarity smart contract to the Stacks blockchain:

1.  **Select a File**: In the sidebar, select the `.clar` file you wish to deploy. A preview of the code will appear in the deployment panel.
2.  **Connect Wallet**: Click the **Connect Stacks Wallet** button. This will trigger the Stacks browser extension (e.g., Hiro Wallet or Xverse).
3.  **Choose Network**: Select between `mainnet`, `testnet`, or `devnet`. Ensure your wallet is set to the matching network.
4.  **Balance Check**: Your real-time STX balance is displayed at the top of the section.
5.  **Advanced Options** (Optional):
    *   **Custom Fee**: Manually set the transaction fee in micro-STX (uSTX).
    *   **Custom Nonce**: Resolve stuck transactions by manually specifying the nonce.
6.  **Deploy**: Click **Deploy**. Your wallet will prompt you to authorize the transaction. Once broadcast, the transaction ID (TXID) will appear in the **Activity History**.

## 2. Interacting with Contracts

Once a contract is deployed, or if you want to interact with an existing contract:

### Activity History Integration
*   Your recently deployed contracts are saved in the **Activity History**.
*   Click the **"Use"** button next to any contract in the history to instantly populate the **Contract Hash** field below.

### Call Contract (Transaction)
Use this for functions that change the state of the blockchain (requires gas).
1.  **Contract Hash**: Ensure the format is `Principal.contract-name` (e.g., `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.my-contract`).
2.  **Entry Point**: Enter the name of the public function you want to call (e.g., `increment`, `transfer`).
3.  **Arguments (JSON)**: Provide arguments in JSON format.
    *   *Example*: `["ST1...address", 500]`
4.  **Call**: Click **Call Contract**. This will open your wallet to sign and broadcast the transaction.

### Query State (Free Read)
Use this for read-only functions (getters) that do not cost gas.
1.  **Key Name**: Specify the function name or data map key you wish to query.
2.  **Query**: Click **Query State**. The result is fetched directly from the Stacks API without requiring a wallet transaction. Results are currently logged to the browser console/terminal.

## 3. Network Configuration
*   **Testnet**: `https://api.testnet.hiro.so` (Default)
*   **Mainnet**: `https://api.mainnet.hiro.so`
*   **Local Devnet**: Uses standard mocknet configurations.

---
*Tip: Always double-check your arguments and network before broadcasting transactions.*

# Tutorial: Testing your Fungible Token (MTK)

Since you have deployed the **My Token (MTK)** contract, follow these steps to test its functionality using the **Interact with Contract** panel.

## 1. Initial Setup
*   Go to the **Activity History** in the Deploy Panel.
*   Find your `my-token` deployment and click **"Use"**.
*   This will automatically fill the **Contract Hash** (e.g., `ST1...Address.my-token`).

---

## 2. Minting Tokens (Transaction)
Use this to create your initial supply. 

1.  **Entry Point**: Type **`mint`** (must be lowercase, no spaces).
    *   *⚠️ Common Error: Do Not use `increment` if that is still in the input field!*
2.  **Arguments (JSON)**: `[1000000, "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"]`
    *   *Arg 1: Amount (Uint)*
    *   *Arg 2: Recipient Address (Principal)*
3.  **Action**: Click **Call Contract**.
4.  **Confirm**: Authorize the transaction in your wallet.

---

### 🔍 How to Fix "NoSuchPublicFunction":
If you see this error, it means the IDE is looking for a function that doesn't exist in the contract you selected.

1.  **Check the Tab**: Are you sure you are interacting with `my-token` and not `simple-counter`?
2.  **Check the Code**: Open `contracts/my-token.clar` in the editor. Look for `(define-public (mint ...)`. The name after `define-public` is what goes into the **Entry Point**.
3.  **No Spaces**: Ensure there are no leading or trailing spaces in the Entry Point or Contract Hash fields.
4.  **Wait for Confirmation**: If you just deployed, the function won't "exist" on-chain until the transaction is confirmed (approx. 10 mins).


---

## 3. Checking Your Balance (Read-Only)
Check how many tokens you have without spending any gas.

1.  **Entry Point**: Type `get-balance`
2.  **Arguments (JSON)**: `["ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"]`
    *   *Note: Use the same address you minted to.*
3.  **Action**: Click **Query State** in the green section.
4.  **Result**: The terminal/console will show the balance (e.g., `u1000000`).

---

## 4. Transferring Tokens
Send tokens to another address.

1.  **Entry Point**: Type `transfer`
2.  **Arguments (JSON)**: `[500, "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", "ST2REHHSSTG0G83X6S09N5SDRD542YV49N2W7P82O", null]`
    *   *Args: [Amount, YourAddress, RecipientAddress, Memo]*
3.  **Action**: Click **Call Contract**.
4.  **Confirm**: Sign the transaction.

---

## 5. Metadata Queries
Test the SIP-010 standard getters:

| Function | Entry Point | Arguments | Expected Result |
| :--- | :--- | :--- | :--- |
| **Get Name** | `get-name` | `[]` | `"My Token"` |
| **Get Symbol** | `get-symbol` | `[]` | `"MTK"` |
| **Get Decimals** | `get-decimals` | `[]` | `u6` |
| **Total Supply**| `get-total-supply` | `[]` | Total tokens minted |

---

### ⚠️ Troubleshooting: "Transaction Rejected"
If your wallet says "Unable to broadcast transaction":

1.  **Contract Not Found**: If you are trying to *Call* or *Query* a contract you just deployed, it may not be confirmed yet. Stacks blocks take ~10 minutes. Wait until you see the contract on the [Explorer](https://explorer.stacks.co).
2.  **Insufficient Fee**: The Testnet can be congested. Try setting a **Custom Fee** of `2000` or `3000` (uSTX) in the **Advanced Options** section.
3.  **Network Mismatch**: Ensure your **Hiro Wallet** is set to the same network (e.g., Testnet) as the IDE.
4.  **Contract Already Exists**: If you get an error during *Deployment*, try changing the contract name in the `.clar` file and the `Clarinet.toml` (e.g., `my-token-v2`).

# 📘 WASM Compilation & Deployment Guide

Complete technical documentation for how CasperIDE compiles Rust smart contracts to WASM and deploys them to the Casper blockchain.

---

## Table of Contents

1. [WASM Compilation Process](#wasm-compilation-process)
2. [Deployment Architecture](#deployment-architecture)
3. [Remote Compilation Service](#remote-compilation-service)
4. [Optimization Pipeline](#optimization-pipeline)
5. [Deployment Process](#deployment-process)
6. [Troubleshooting](#troubleshooting)

---

## WASM Compilation Process

### Overview

CasperIDE uses a **remote compilation architecture** where Rust smart contracts are compiled on a dedicated GCP VM rather than in the browser. This approach overcomes browser limitations and provides a full-featured Rust toolchain.

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    WASM Compilation Flow                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│  CasperIDE   │ 1. User writes Rust contract
│  (Browser)   │    in Monaco Editor
└──────┬───────┘
       │
       │ 2. Click "Compile" button
       │    POST /compile with source code
       ▼
┌──────────────────────────────────┐
│  GCP Compilation Server          │
│  (Ubuntu VM, Port 8080)          │
│                                  │
│  ┌────────────────────────────┐ │
│  │ 3. Create temp Cargo       │ │
│  │    project in /tmp/        │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ 4. Write source to lib.rs  │ │
│  │    Generate Cargo.toml     │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ 5. Compile with:           │ │
│  │    cargo +nightly-2024-    │ │
│  │    10-01 build --release   │ │
│  │    --target wasm32-        │ │
│  │    unknown-unknown         │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ 6. Optimize WASM with:     │ │
│  │    wasm-opt -Oz            │ │
│  │    (30-50% size reduction) │ │
│  └────────────────────────────┘ │
└──────────────┬───────────────────┘
               │
               │ 7. Return compiled .wasm binary
               ▼
┌──────────────────────────────┐
│  CasperIDE (Browser)         │
│                              │
│  - Store WASM in memory      │
│  - Display compilation stats │
│  - Enable deployment         │
└──────────────────────────────┘
```

### Technical Details

#### 1. Source Code Preparation

When you click "Compile" in CasperIDE:
- Current editor content is read
- Source code is converted to a Blob
- Sent via `FormData` in a multipart POST request

#### 2. Cargo Project Generation

The GCP server creates a temporary Cargo project:

**Generated Cargo.toml:**
```toml
[package]
name = "casper_contract"
version = "0.1.0"
edition = "2021"

[dependencies]
casper-contract = { version = "3.0.0", default-features = false }
casper-types = { version = "3.0.0", default-features = false }
wee_alloc = "0.4.5"

[profile.release]
lto = true              # Link-time optimization
codegen-units = 1       # Single codegen unit for better optimization
opt-level = "z"         # Optimize for size

[lib]
crate-type = ["cdylib"] # Create dynamic library for WASM
```

**Project Structure:**
```
/tmp/casper_contract_<timestamp>/
├── Cargo.toml
├── src/
│   └── lib.rs          # Your contract code
└── target/
    └── wasm32-unknown-unknown/
        └── release/
            └── casper_contract.wasm
```

#### 3. Rust Compilation

**Command executed:**
```bash
cargo +nightly-2024-10-01 build \
  --release \
  --target wasm32-unknown-unknown
```

**Why nightly-2024-10-01?**
- Casper contracts use `#![feature]` attributes requiring nightly Rust
- Specific nightly version ensures compatibility
- Newer nightly versions have restrictions on `#[no_mangle]`
- This pinned version is tested and stable for Casper contracts

**Compilation Steps:**
1. Download dependencies (first run only)
2. Compile `casper-types` crate
3. Compile `casper-contract` crate
4. Compile your contract code
5. Link everything into WASM binary
6. Apply release profile optimizations

**Typical compilation time:** 40-60 seconds

#### 4. WASM Optimization

After successful compilation, the WASM binary is optimized using `wasm-opt`:

```bash
wasm-opt -Oz casper_contract.wasm -o casper_contract_opt.wasm
```

**Optimization flags:**
- `-Oz`: Optimize aggressively for size
- Removes dead code
- Inlines functions where beneficial
- Reduces binary size by 30-50%

**Example results:**
```
Original WASM size: 156,789 bytes (153.11 KB)
Optimized WASM size: 78,394 bytes (76.56 KB)
Size reduction: 50.0%
```

#### 5. Response to Browser

The server responds with:
- **Binary data**: The optimized WASM file
- **Headers**:
  - `Content-Type: application/wasm`
  - `X-Compilation-Time: <milliseconds>`
  - `X-WASM-Size: <bytes>`

---

## Remote Compilation Service

### GCP Server Setup

**Location:** `~/casper-compiler-service/server.js` on GCP VM

**Tech Stack:**
- **Runtime:** Node.js + Express
- **Port:** 8080 (exposed via GCP firewall)
- **CORS:** Enabled for cross-origin requests

**Key Endpoints:**

1. **Health Check**
   ```
   GET /health
   
   Response:
   {
     "status": "ok",
     "message": "Casper compilation service is running",
     "timestamp": "2026-01-20T01:04:36.000Z"
   }
   ```

2. **Compile Endpoint**
   ```
   POST /compile
   Content-Type: multipart/form-data
   
   Body:
   - source: File (lib.rs content)
   
   Response: Binary WASM file
   ```

### Server Configuration

**Environment:**
- **OS:** Ubuntu 22.04 LTS
- **Rust Toolchain:** nightly-2024-10-01
- **WASM Target:** wasm32-unknown-unknown
- **Optimization Tool:** wasm-opt (binaryen)

**Installation on GCP VM:**

```bash
# Install Rust nightly
rustup install nightly-2024-10-01
rustup target add wasm32-unknown-unknown --toolchain nightly-2024-10-01

# Install wasm-opt
sudo apt-get update
sudo apt-get install -y binaryen

# Verify installations
rustc +nightly-2024-10-01 --version
wasm-opt --version

# Setup compilation service
mkdir ~/casper-compiler-service
cd ~/casper-compiler-service
npm init -y
npm install express multer cors

# Copy server.js from IDE/gcp-server-template.js
# Start the service
node server.js
```

**Production deployment with PM2:**

```bash
# Install PM2
sudo npm install -g pm2

# Start service
cd ~/casper-compiler-service
pm2 start server.js --name casper-compiler

# Auto-start on boot
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs casper-compiler
```

### Security Considerations

> **⚠️ IMPORTANT:** Current setup is for **DEVELOPMENT ONLY**

For production deployment, implement:

1. **Authentication**: API keys or OAuth
2. **Rate Limiting**: Prevent abuse
3. **Docker Sandboxing**: Isolate compilations
4. **Resource Limits**: CPU/memory caps, timeouts
5. **HTTPS**: TLS encryption
6. **IP Whitelisting**: Restrict access
7. **Input Validation**: Sanitize source code
8. **Logging & Monitoring**: Track usage and errors

---

## Optimization Pipeline

### Two-Stage Optimization

#### Stage 1: Cargo Release Profile

Configured in `Cargo.toml`:

```toml
[profile.release]
lto = true              # Link-Time Optimization
codegen-units = 1       # Single codegen unit
opt-level = "z"         # Optimize for size (vs "s" or "3")
```

**Results:**
- Smaller WASM files
- Inline function calls
- Dead code elimination
- Aggressive size optimizations

#### Stage 2: wasm-opt Post-Processing

Applied after Cargo compilation:

```bash
wasm-opt -Oz input.wasm -o output.wasm
```

**Advanced optimization flags available:**
- `-O`: Basic optimizations
- `-O2`: More optimizations
- `-O3`: Maximum optimizations
- `-Oz`: Optimize for size (default)
- `-Os`: Optimize for size (less aggressive)

**wasm-opt features:**
- Removes unused code
- Optimizes control flow
- Constant folding
- Function inlining
- Table compression

### Size Optimization Tips

For even smaller WASM files:

1. **Use `wee_alloc`** (already included)
   ```rust
   #[global_allocator]
   static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
   ```

2. **Minimize dependencies**
   - Only import what you need
   - Avoid large crates

3. **Strip debug info**
   ```toml
   [profile.release]
   strip = true
   ```

4. **Use `panic = "abort"` (for no_std contracts)**
   ```toml
   [profile.release]
   panic = "abort"
   ```

---

## Deployment Architecture

### Frontend to Blockchain Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Deployment Architecture                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────┐
│  CasperIDE   │ 1. User has compiled WASM
│  (Browser)   │ 2. Clicks "Deploy" button
└──────┬───────┘
       │
       │ 3. Configure deployment params:
       │    - Contract name
       │    - Constructor args
       │    - Payment amount
       │    - Network (Testnet/Mainnet)
       ▼
┌─────────────────────────────────┐
│  Deployment Service             │
│  (services/casper/deployment.ts)│
│                                 │
│  4. Build Deploy object using   │
│     casper-js-sdk:              │
│     - ExecutableDeployItem      │
│     - ModuleBytes (WASM)        │
│     - RuntimeArgs               │
│     - StandardPayment           │
└────────┬────────────────────────┘
         │
         │ 5. Request signature from wallet
         ▼
┌─────────────────────────────────┐
│  Casper Wallet                  │
│  (Browser Extension)            │
│                                 │
│  6. User reviews and signs      │
│     deployment with private key │
└────────┬────────────────────────┘
         │
         │ 7. Signed Deploy JSON
         ▼
┌─────────────────────────────────┐
│  RPC Proxy                      │
│  (Local: proxy-server.cjs OR    │
│   Vercel: /api/rpc)             │
│                                 │
│  8. Forward to Casper RPC node  │
└────────┬────────────────────────┘
         │
         │ 9. HTTP POST to RPC endpoint
         ▼
┌─────────────────────────────────┐
│  Casper Network                 │
│  (Testnet/Mainnet)              │
│                                 │
│  - Validates deploy             │
│  - Executes WASM contract       │
│  - Returns deploy_hash          │
└────────┬────────────────────────┘
         │
         │ 10. Deploy hash response
         ▼
┌─────────────────────────────────┐
│  CasperIDE                      │
│                                 │
│  - Display deploy hash          │
│  - Show link to block explorer  │
│  - Monitor deployment status    │
└─────────────────────────────────┘
```

### Deployment Process Details

#### Step 1: Prepare Deploy Parameters

**User configures:**
- **Contract Name:** Identifier for the contract
- **Constructor Arguments:** Runtime arguments as key-value pairs
- **Payment Amount:** Gas payment in motes (1 CSPR = 10^9 motes)
- **Network:** Casper Testnet or Mainnet

**Recommended payment amounts:**
- Simple contracts: 3-5 CSPR
- Medium complexity: 10-50 CSPR
- Large contracts: 100-200 CSPR
- Odra framework contracts: 300-500 CSPR

#### Step 2: Build Deploy Object

Using `casper-js-sdk`:

```typescript
import { DeployUtil, CLValueBuilder, RuntimeArgs } from "casper-js-sdk";

// Create runtime arguments
const runtimeArgs = RuntimeArgs.fromMap({
  message: CLValueBuilder.string("Hello, Casper!")
});

// Create deploy
const deploy = DeployUtil.makeDeploy(
  new DeployUtil.DeployParams(
    publicKey,              // From wallet
    networkName,            // "casper-test" or "casper"
    1,                      // Gas price
    1800000                 // TTL (30 minutes)
  ),
  DeployUtil.ExecutableDeployItem.newModuleBytes(
    wasmBytes,              // Compiled WASM
    runtimeArgs
  ),
  DeployUtil.standardPayment(paymentAmount) // In motes
);
```

#### Step 3: Sign with Wallet

**Casper Wallet Integration:**

```typescript
// Request signature from Casper Wallet extension
const signedDeployJSON = await window.CasperWalletProvider.sign(
  deployJSON,
  publicKeyHex
);
```

**Wallet displays:**
- Contract details
- Payment amount
- Network
- Deployment hash

**User must:**
- Review and approve
- Enter password if required
- Confirm transaction

#### Step 4: Send to RPC Endpoint

**RPC Method:** `account_put_deploy`

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "account_put_deploy",
  "params": {
    "deploy": {
      "hash": "abc123...",
      "header": { ... },
      "payment": { ... },
      "session": {
        "ModuleBytes": {
          "module_bytes": "<base64-encoded-wasm>",
          "args": [ ... ]
        }
      },
      "approvals": [
        {
          "signer": "01abc...",
          "signature": "def456..."
        }
      ]
    }
  },
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "deploy_hash": "abc123def456..."
  },
  "id": 1
}
```

#### Step 5: Monitor Deployment

**Get deploy info:**
```json
{
  "method": "info_get_deploy",
  "params": {
    "deploy_hash": "abc123..."
  }
}
```

**Deploy lifecycle:**
1. **Received:** Deploy in mempool
2. **Processed:** Included in a block
3. **Executed:** Contract executed
4. **Finalized:** Block finalized

**Success indicators:**
- `execution_results[0].result.Success`
- Contract hash returned
- Entry in block explorer

---

## Deployment Environments

### Contract Upgrades

Casper supports contract versioning through **Contract Packages**, allowing you to deploy new versions without replacing existing code.

#### Key Concepts

**Contract Package:**
- Container for multiple contract versions
- Created during initial deployment with `storage::create_contract_package_at_hash()`
- Identified by a package hash (`contract-package-wasm...`)

**Access URef:**
- Permission token for deploying upgrades
- Acts like an "admin key" for the package
- **Critical:** Must be saved during V1 deployment
- **Without it:** Contract is locked forever

**Version Management:**
- Versions are sequential: 1, 2, 3, ...
- Old versions remain on chain
- State persists across upgrades

#### Deployment Types

**Fresh Deployment (V1):**
```rust
// Creates new package
let (package_hash, access_uref) = storage::create_contract_package_at_hash();
let (contract_hash, version) = storage::add_contract_version(
    package_hash,
    entry_points,
    named_keys
);

// CRITICAL: Save these!
runtime::put_key("my_package", package_hash.into());
runtime::put_key("my_access_uref", access_uref.into());
```

**Upgrade Deployment (V2+):**
```rust
// Retrieve from V1 deployment
let access_uref: URef = runtime::get_key("my_access_uref").unwrap_or_revert();
let package_hash: ContractPackageHash = runtime::get_key("my_package").unwrap_or_revert();

// Add new version
let (contract_hash, version) = storage::add_contract_version(
    package_hash,
    updated_entry_points,
    named_keys
);
```

#### Upgrade Flow in CasperIDE

**V1 Deployment:**
1. Load "Upgradeable Counter V1" template
2. Compile contract
3. Select "Fresh Deploy" mode
4. Deploy to testnet
5. **Save** package hash and Access URef from block explorer

**V2 Upgrade:**
1. Load "Upgradeable Counter V2" template
2. Compile contract
3. Select "Upgrade Contract" mode
4. Enter package hash from V1
5. Deploy upgrade
6. Verify new version and entry points

#### State Persistence

State automatically carries over across upgrades:

```rust
// V1 creates state
let counter_uref = storage::new_uref(42u64);
named_keys.insert("counter", Key::URef(counter_uref));

// V2 inherits same state
let counter_key = runtime::get_key("counter"); // Still 42!
```

#### Security Considerations

> **⚠️ CRITICAL: Access URef Management**
> - Back up Access URef immediately after V1 deployment
> - Store securely (like a private key)
> - Loss = contract frozen forever
> - Never commit to public repositories
> - Consider multi-sig for production

#### Verification Checklist

After upgrade deployment:
- [ ] Package shows increased version number
- [ ] Old entry points still accessible
- [ ] New entry points available
- [ ] State values match pre-upgrade
- [ ] Contract hash updated in named keys

For complete upgrade documentation, see [CONTRACT_UPGRADES.md](file:///C:/Users/jayas/Videos/SIS/CasperIDE/IDE/docs/CONTRACT_UPGRADES.md).

---

### Vercel Deployment

When deployed to Vercel, CasperIDE uses serverless functions for the RPC proxy:

**Architecture:**
```
CasperIDE (Vercel Static Site)
     ↓
/api/rpc (Vercel Serverless Function)
     ↓
Casper RPC Node (Testnet/Mainnet)
```

**Configuration:** `vercel.json`
```json
{
  "rewrites": [
    { "source": "/api/rpc", "destination": "/api/rpc.js" }
  ]
}
```

**RPC Proxy:** `api/rpc.js`
- Forwards requests to Casper nodes
- Adds CORS headers
- Handles errors

**Environment Variables:**
```env
VITE_COMPILER_SERVICE_URL=http://<GCP_VM_IP>:8080
GEMINI_API_KEY=<optional>
```

### Local Development

For local development:

**Terminal 1: Dev Server**
```bash
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2: RPC Proxy**
```bash
node proxy-server.cjs
# Runs on http://localhost:3001
```

**Environment:**
- Frontend uses `http://localhost:3001/rpc` for RPC calls
- Auto-detects environment: `import.meta.env.PROD`

---

## Troubleshooting

### Compilation Issues

#### Error: "Failed to connect to compilation service"

**Causes:**
1. GCP VM is stopped
2. Firewall not configured for port 8080
3. Compilation service not running
4. Wrong IP in `.env`

**Solutions:**
```bash
# Check VM status in GCP Console
# Ensure firewall allows TCP:8080

# On GCP VM:
cd ~/casper-compiler-service
node server.js

# Verify in browser:
http://<GCP_VM_IP>:8080/health
```

#### Error: "#[no_mangle] cannot be used on internal language items"

**Cause:** Using wrong Rust version

**Solution:**
```bash
# On GCP VM:
rustup install nightly-2024-10-01
rustup default nightly-2024-10-01
# Restart server
```

#### Error: "Compilation timed out"

**Causes:**
- First compilation (downloading dependencies)
- Complex contract
- Low VM resources

**Solutions:**
- Wait for first compilation (can take 2-5 minutes)
- Increase timeout in `server.js` (currently 300 seconds)
- Upgrade GCP VM to higher tier

#### Error: "WASM file not found after compilation"

**Cause:** Compilation failed but error not captured

**Solution:**
```bash
# On GCP VM, check logs:
pm2 logs casper-compiler

# Test manually:
cd /tmp
mkdir test && cd test
# Create minimal project and compile
cargo +nightly-2024-10-01 build --target wasm32-unknown-unknown
```

### Deployment Issues

#### Error: "User cancelled signing"

**Cause:** User rejected wallet signature request

**Solution:** Click "Deploy" again and approve in wallet

#### Error: "ApiError::EarlyEndOfStream [17]"

**Cause:** WASM file too large (usually >1MB unoptimized)

**Solutions:**
1. Ensure `wasm-opt` is installed and working
2. Check optimization is enabled in `server.js`
3. Reduce contract complexity
4. Remove unused dependencies

#### Error: "User error: 64658" (Insufficient gas)

**Cause:** Payment amount too low

**Solutions:**
- Increase payment amount
- For Odra contracts: use 300-500 CSPR
- For simple contracts: use 10-50 CSPR

#### Error: "Invalid deploy"

**Causes:**
- Invalid runtime arguments
- Wrong network configuration
- Malformed deploy JSON

**Solutions:**
- Verify argument types match contract expectations
- Check network name: "casper-test" or "casper"
- Review deploy JSON in browser console

#### Error: "RPC endpoint not responding"

**Causes:**
- RPC proxy not running (local dev)
- Network issues
- Casper node downtime

**Solutions:**
```bash
# Local dev: ensure proxy is running
node proxy-server.cjs

# Try different RPC node
# Testnet nodes:
https://rpc.testnet.casperlabs.io/rpc
https://node-clarity-testnet.make.services/rpc

# Check node status
curl -X POST <RPC_URL> \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"info_get_status","id":1}'
```

### CORS Issues

**Symptoms:** 
- "CORS policy: No 'Access-Control-Allow-Origin' header"
- Deployment works but RPC calls fail

**Solutions:**

**For GCP server:**
```javascript
// In server.js
const cors = require('cors');
app.use(cors());
```

**For Vercel deployment:**
```javascript
// In api/rpc.js
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

### Performance Optimization

**Slow compilation:**
1. Upgrade GCP VM (e2-micro → e2-small)
2. Clear Cargo cache: `rm -rf ~/.cargo/registry`
3. Use local caching for dependencies

**Large WASM files:**
1. Verify `wasm-opt` is running
2. Add `wasm-snip` for additional stripping
3. Use `panic = "abort"` in Cargo.toml
4. Strip debug symbols

**Deployment failures:**
1. Start with simple contracts to verify setup
2. Gradually increase complexity
3. Monitor gas costs in block explorer
4. Use testnet before mainnet

---

## Quick Reference

### Essential Commands

**GCP VM Setup:**
```bash
# Install nightly
rustup install nightly-2024-10-01
rustup target add wasm32-unknown-unknown --toolchain nightly-2024-10-01

# Install wasm-opt
sudo apt-get install -y binaryen

# Start service
cd ~/casper-compiler-service
node server.js
```

**Local Development:**
```bash
# Terminal 1
npm run dev

# Terminal 2
node proxy-server.cjs
```

**Vercel Deployment:**
```bash
vercel login
vercel --prod
```

### Key Files

- **Compilation Server:** `gcp-server-template.js`
- **Deployment Service:** `services/casper/deployment.ts`
- **Wallet Integration:** `services/casper/casper-wallet-service.ts`
- **RPC Proxy (Local):** `proxy-server.cjs`
- **RPC Proxy (Vercel):** `api/rpc.js`

### Network Endpoints

**Casper Testnet:**
- RPC: `https://rpc.testnet.casperlabs.io/rpc`
- Explorer: `https://testnet.cspr.live`

**Casper Mainnet:**
- RPC: `https://rpc.mainnet.casperlabs.io/rpc`
- Explorer: `https://cspr.live`

---

## Additional Resources

- **Casper Documentation:** https://docs.casper.network/
- **casper-js-sdk:** https://github.com/casper-ecosystem/casper-js-sdk
- **Rust WASM Book:** https://rustwasm.github.io/docs/book/
- **Binaryen (wasm-opt):** https://github.com/WebAssembly/binaryen

---

**Last Updated:** January 2026  
**Version:** 3.0 (using casper-contract v3.0.0 + nightly-2024-10-01)

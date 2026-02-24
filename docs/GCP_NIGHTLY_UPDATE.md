# 🔧 GCP Server Update Guide - Fix Nightly Toolchain

This guide will fix the `#[no_mangle]` compilation error on your GCP compilation server.

## The Problem

Your GCP server is failing with:
```
error: `#[no_mangle]` cannot be used on internal language items
```

This happens because newer Rust nightly versions have restrictions on `#[no_mangle]` attributes.

## The Solution

Pin the GCP server to use **Rust nightly-2024-10-01**, which is compatible with Casper contracts.

---

## 📋 Step-by-Step Fix

### Step 1: SSH into Your GCP VM

```bash
# Use GCP Console SSH or from terminal
gcloud compute ssh casper-compiler-vm --zone=<your-zone>
```

### Step 2: Install Rust Nightly 2024-10-01

```bash
# Install the specific nightly version
rustup install nightly-2024-10-01

# Add wasm32 target for this toolchain
rustup target add wasm32-unknown-unknown --toolchain nightly-2024-10-01

# Verify installation
rustc +nightly-2024-10-01 --version
```

**Expected output:**
```
rustc 1.83.0-nightly (4ac7bcbaad 2024-09-30)
```

### Step 3: Install Binaryen (for wasm-opt)

```bash
# Install binaryen package
sudo apt-get update
sudo apt-get install -y binaryen

# Verify installation
wasm-opt --version
```

**Expected output:**
```
wasm-opt version 105 (or similar)
```

### Step 4: Update server.js on GCP VM

```bash
# Navigate to your compilation service directory
cd ~/casper-compiler-service

# Backup the old server
cp server.js server.js.backup

# Download the updated template or copy the new server.js content
# Option 1: If you can copy from your local machine
# (Copy the content from gcp-server-template.js and paste into server.js)

# Option 2: Use nano to edit
nano server.js
```

**Make these key changes in `server.js`:**

1. **Update Cargo.toml section** (around line 46):
   ```javascript
   casper-contract = { version = "3.0.0", default-features = false }
   casper-types = { version = "3.0.0", default-features = false }
   wee_alloc = "0.4.5"

   [profile.release]
   lto = true
   codegen-units = 1
   opt-level = "z"
   ```

2. **Update cargo build command** (around line 67):
   ```javascript
   const cmd = `cd ${projectDir} && cargo +nightly-2024-10-01 build --release --target wasm32-unknown-unknown 2>&1`;
   ```

3. Save and exit (Ctrl+X, then Y, then Enter)

### Step 5: Restart the Server

```bash
# If running with node directly
# First, kill any existing process
pkill -f "node server.js"

# Start the server
node server.js
```

**OR if using PM2:**

```bash
# Restart with PM2
pm2 restart casper-compiler

# View logs
pm2 logs casper-compiler
```

### Step 6: Verify the Fix

You should see output like:
```
============================================================
🚀 Casper Compilation Service
============================================================
✓ Server running on port 8080
✓ Health check: http://localhost:8080/health
✓ Compile endpoint: POST http://localhost:8080/compile
✓ Started at: 2026-01-16T04:52:51.905Z
✓ Rust version: rustc 1.83.0-nightly (4ac7bcbaad 2024-09-30)
✓ Using casper-contract 3.0.0
============================================================
```

### Step 7: Test Compilation from CasperIDE

1. Open CasperIDE in your browser
2. Load any Casper contract
3. Click **Compile**
4. You should see successful compilation!

---

## 🧪 Quick Test Command

Test the toolchain directly on GCP:

```bash
# Create a test directory
mkdir -p /tmp/test-compile && cd /tmp/test-compile

# Create a minimal Cargo.toml
cat > Cargo.toml << 'EOF'
[package]
name = "test"
version = "0.1.0"
edition = "2021"

[dependencies]
casper-contract = { version = "3.0.0", default-features = false }

[lib]
crate-type = ["cdylib"]
EOF

# Create a minimal lib.rs
mkdir src
cat > src/lib.rs << 'EOF'
#![no_std]
#![no_main]

#[no_mangle]
pub extern "C" fn call() {}
EOF

# Compile with nightly-2024-10-01
cargo +nightly-2024-10-01 build --release --target wasm32-unknown-unknown

# Check if WASM was created
ls -lh target/wasm32-unknown-unknown/release/*.wasm

# Cleanup
cd ~ && rm -rf /tmp/test-compile
```

If this works without errors, your setup is correct! ✅

---

## 🔍 Troubleshooting

### Issue: "toolchain 'nightly-2024-10-01' is not installed"

**Solution:**
```bash
rustup install nightly-2024-10-01
rustup target add wasm32-unknown-unknown --toolchain nightly-2024-10-01
```

### Issue: "wasm-opt: command not found"

**Solution:**
```bash
sudo apt-get update
sudo apt-get install -y binaryen
```

The server will still work, but WASM files won't be optimized.

### Issue: Server shows old Rust version

**Solution:**
Make sure your `server.js` has the updated cargo command:
```javascript
cargo +nightly-2024-10-01 build
```

### Issue: Still getting compilation errors

**Solutions:**
1. Clear Cargo cache:
   ```bash
   rm -rf ~/.cargo/registry
   rm -rf ~/.cargo/git
   ```

2. Verify the nightly version:
   ```bash
   rustc +nightly-2024-10-01 --version
   ```

3. Check server logs for details:
   ```bash
   pm2 logs casper-compiler
   # OR if running directly, check terminal output
   ```

---

## 📊 What Changed?

| Component | Old Value | New Value | Reason |
|-----------|-----------|-----------|--------|
| Rust Toolchain | System default | `nightly-2024-10-01` | Avoids `#[no_mangle]` error |
| casper-contract | v1.4.4 or v4.0.0 | v3.0.0 | Stable and compatible |
| Optimization | None | wasm-opt -Oz | 30-50% size reduction |
| Cargo Profile | Default | LTO + opt-level=z | Better WASM output |

---

## ✅ Success Indicators

After the update, you should see:

1. ✅ Server starts successfully
2. ✅ Rust version shows `nightly-2024-10-01`
3. ✅ Compilation completes without `#[no_mangle]` errors
4. ✅ WASM files are optimized (check logs for size reduction)
5. ✅ Compilation time: 40-60 seconds for typical contracts

---

## 🎯 Keep the Server Running

To ensure the server stays running after you disconnect:

```bash
# Install PM2 if not already installed
sudo npm install -g pm2

# Start the server with PM2
cd ~/casper-compiler-service
pm2 start server.js --name casper-compiler

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup
# Follow the command it outputs

# View status
pm2 status

# View logs
pm2 logs casper-compiler
```

---

**Need Help?** Check the compilation logs in CasperIDE's terminal panel for detailed error messages.

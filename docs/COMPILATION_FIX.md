# 🔧 Fix Compilation Errors on GCP VM

## Problem
Compilation is reaching the server but failing with empty STDERR. This usually means:
- Wrong Casper contract dependency versions
- Rust toolchain issues
- Missing dependencies

## Quick Fix

### Step 1: Update server.js with Compatible Versions

SSH into your GCP VM and update the Cargo.toml template in server.js:

```bash
cd ~/casper-compiler-service
nano server.js
```

Find this section (around line 30-40):
```javascript
const cargoToml = `
[package]
name = "casper_contract"
version = "0.1.0"
edition = "2021"

[dependencies]
casper-contract = "4.0.0"
casper-types = "4.0.0"

[lib]
crate-type = ["cdylib"]
`.trim();
```

**Replace with these WORKING versions:**
```javascript
const cargoToml = `
[package]
name = "casper_contract"
version = "0.1.0"
edition = "2021"

[dependencies]
casper-contract = "1.4.4"
casper-types = "1.5.0"

[lib]
crate-type = ["cdylib"]
`.trim();
```

Save (Ctrl+O, Enter, Ctrl+X) and restart:
```bash
node server.js
```

### Step 2: Verify Rust Toolchain

Make sure you have the right Rust version:

```bash
rustc --version
# Should be 1.70 or higher

rustup update
rustup target add wasm32-unknown-unknown
```

### Step 3: Test with Simple Contract

Try compiling this simple test contract first:

```rust
#![no_std]
#![no_main]

#[no_mangle]
pub extern "C" fn call() {
    // Empty contract for testing
}
```

### Step 4: Check Cargo Cache

First compilation downloads dependencies. This can take 2-5 minutes. Check if it's downloading:

```bash
# On GCP VM, check what's happening:
ls -la /tmp/casper_contract_*/

# Check cargo cache:
du -sh ~/.cargo/registry/
```

### Step 5: Manual Test Compilation

Test compilation manually on the VM:

```bash
cd /tmp
mkdir test_contract
cd test_contract

# Create Cargo.toml
cat > Cargo.toml << 'EOF'
[package]
name = "test_contract"
version = "0.1.0"
edition = "2021"

[dependencies]
casper-contract = "1.4.4"
casper-types = "1.5.0"

[lib]
crate-type = ["cdylib"]
EOF

# Create src directory
mkdir src

# Create simple contract
cat > src/lib.rs << 'EOF'
#![no_std]
#![no_main]

extern crate alloc;
use alloc::string::String;
use casper_contract::contract_api::{runtime, storage};
use casper_types::Key;

const KEY_NAME: &str = "my_value";
const RUNTIME_ARG_MESSAGE: &str = "message";

#[no_mangle]
pub extern "C" fn call() {
    let message: String = runtime::get_named_arg(RUNTIME_ARG_MESSAGE);
    let message_uref = storage::new_uref(message);
    let key = Key::URef(message_uref);
    runtime::put_key(KEY_NAME, key);
}
EOF

# Try compiling
cargo build --release --target wasm32-unknown-unknown
```

**If this works**, you'll see:
```
Compiling casper-types v1.5.0
Compiling casper-contract v1.4.4
Compiling test_contract v0.1.0
Finished release [optimized] target(s) in XXs
```

**If it fails**, you'll see the actual error message. Share that with me!

### Step 6: Increase Timeout

The compilation took 54 seconds and timed out. Update server.js timeout:

Find this line:
```javascript
exec(cmd, { maxBuffer: 1024 * 1024 * 10, timeout: 120000 }, (error, stdout, stderr) => {
```

Change timeout to 300000 (5 minutes):
```javascript
exec(cmd, { maxBuffer: 1024 * 1024 * 10, timeout: 300000 }, (error, stdout, stderr) => {
```

### Step 7: Better Error Logging

Update the error handling in server.js to capture both stdout and stderr:

Find this section:
```javascript
if (error) {
  console.error(`[${new Date().toISOString()}] Compilation failed (${compilationTime}ms)`);
  console.error("STDERR:", stderr);
  cleanup();
  return res.status(400).json({ 
    error: "Compilation failed", 
    details: stderr || stdout,
    compilationTime: `${compilationTime}ms`
  });
}
```

Change to:
```javascript
if (error) {
  console.error(`[${new Date().toISOString()}] Compilation failed (${compilationTime}ms)`);
  console.error("STDOUT:", stdout);
  console.error("STDERR:", stderr);
  console.error("ERROR:", error.message);
  cleanup();
  return res.status(400).json({ 
    error: "Compilation failed", 
    details: stderr || stdout || error.message,
    stdout: stdout,
    stderr: stderr,
    compilationTime: `${compilationTime}ms`
  });
}
```

## Most Likely Issue

The **casper-contract 4.0.0** version is too new and incompatible. Use **1.4.4** instead.

## Quick Commands Summary

```bash
# On GCP VM:
cd ~/casper-compiler-service

# Backup
cp server.js server.js.backup

# Edit (change versions to 1.4.4 and 1.5.0)
nano server.js

# Restart
node server.js

# Test in IDE - should work now!
```

## Expected Success Output

After fixing, you should see:
```
[timestamp] Starting compilation...
Project directory: /tmp/casper_contract_XXXXX
    Updating crates.io index
   Compiling casper-types v1.5.0
   Compiling casper-contract v1.4.4
   Compiling casper_contract v0.1.0
    Finished release [optimized] target(s) in 45.2s
[timestamp] ✓ Compilation successful!
WASM size: 45678 bytes (44.61 KB)
Compilation time: 45234ms
```

---

**TL;DR:** Change `casper-contract = "4.0.0"` to `"1.4.4"` and `casper-types = "4.0.0"` to `"1.5.0"` in server.js, then restart!

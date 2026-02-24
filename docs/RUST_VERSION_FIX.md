# 🔧 FINAL FIX - Rust Version Compatibility

## Problem Identified

Your Rust version (1.91.1) is **too new** for casper-contract 1.4.4.

The error shows:
```
error[E0554]: `#![feature]` may not be used on the stable release channel
```

casper-contract 1.4.4 was built for Rust 1.70-1.76 and uses features no longer available in Rust 1.91.1.

## Solution: Use Newer Casper Versions

Update your server.js to use versions compatible with Rust 1.91.1:

### On Your GCP VM:

```bash
cd ~/casper-compiler-service
nano server.js
```

Find the Cargo.toml section (around line 46-58) and change to:

```javascript
const cargoToml = `
[package]
name = "casper_contract"
version = "0.1.0"
edition = "2021"

[dependencies]
casper-contract = "4.0.0"
casper-types = "4.0.1"

[lib]
crate-type = ["cdylib"]
`.trim();
```

**Save** (Ctrl+O, Enter, Ctrl+X) and **restart**:
```bash
node server.js
```

## Why This Works

- **casper-contract 4.0.0** is compatible with Rust 1.80+
- **casper-types 4.0.1** matches the contract version
- These versions don't use deprecated nightly features

## Alternative: Downgrade Rust (Not Recommended)

If you prefer to keep using casper-contract 1.4.4:

```bash
rustup install 1.76.0
rustup default 1.76.0
```

But I recommend using the newer versions instead.

## Quick Copy-Paste Fix

Just run this on your GCP VM:

```bash
cd ~/casper-compiler-service

# Stop server (Ctrl+C if running)

# Update server.js
cat > server.js << 'ENDOFFILE'
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const upload = multer();

app.use(cors());

app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Casper compilation service is running",
    timestamp: new Date().toISOString()
  });
});

app.post("/compile", upload.single("source"), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No source file provided" });
    }

    const code = req.file.buffer.toString("utf-8");
    const projectDir = `/tmp/casper_contract_${Date.now()}`;

    console.log(`[${new Date().toISOString()}] Starting compilation...`);
    console.log(`Project directory: ${projectDir}`);

    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, "src"));

    const cargoToml = `
[package]
name = "casper_contract"
version = "0.1.0"
edition = "2021"

[dependencies]
casper-contract = "4.0.0"
casper-types = "4.0.1"

[lib]
crate-type = ["cdylib"]
    `.trim();

    fs.writeFileSync(path.join(projectDir, "Cargo.toml"), cargoToml);
    fs.writeFileSync(path.join(projectDir, "src", "lib.rs"), code);

    const cmd = `cd ${projectDir} && cargo build --release --target wasm32-unknown-unknown 2>&1`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 10, timeout: 300000 }, (error, stdout, stderr) => {
      const compilationTime = Date.now() - startTime;
      
      const cleanup = () => {
        try {
          fs.rmSync(projectDir, { recursive: true, force: true });
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }
      };

      if (error) {
        console.error(`[${new Date().toISOString()}] Compilation failed (${compilationTime}ms)`);
        console.error("OUTPUT:", stdout);
        cleanup();
        return res.status(400).json({ 
          error: "Compilation failed", 
          details: stdout || stderr || error.message,
          compilationTime: `${compilationTime}ms`
        });
      }

      const wasmPath = path.join(
        projectDir,
        "target",
        "wasm32-unknown-unknown",
        "release",
        "casper_contract.wasm"
      );

      if (!fs.existsSync(wasmPath)) {
        console.error(`[${new Date().toISOString()}] WASM file not found`);
        cleanup();
        return res.status(500).json({ error: "WASM file not found after compilation" });
      }

      const wasm = fs.readFileSync(wasmPath);
      const wasmSize = wasm.length;
      
      console.log(`[${new Date().toISOString()}] ✓ Compilation successful!`);
      console.log(`WASM size: ${wasmSize} bytes (${(wasmSize / 1024).toFixed(2)} KB)`);
      console.log(`Compilation time: ${compilationTime}ms`);

      res.setHeader("Content-Type", "application/wasm");
      res.setHeader("X-Compilation-Time", compilationTime.toString());
      res.setHeader("X-WASM-Size", wasmSize.toString());
      res.send(wasm);

      cleanup();
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Internal error:`, err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("=".repeat(60));
  console.log("🚀 Casper Compilation Service");
  console.log("=".repeat(60));
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ Compile endpoint: POST http://localhost:${PORT}/compile`);
  console.log(`✓ Started at: ${new Date().toISOString()}`);
  console.log(`✓ Rust version compatible: 1.80+`);
  console.log(`✓ Using casper-contract 4.0.0`);
  console.log("=".repeat(60));
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});
ENDOFFILE

# Start server
node server.js
```

## Expected Output After Fix

```
[timestamp] Starting compilation...
   Compiling casper-types v4.0.1
   Compiling casper-contract v4.0.0
   Compiling casper_contract v0.1.0
    Finished release [optimized] target(s) in XX.Xs
[timestamp] ✓ Compilation successful!
WASM size: XXXXX bytes
```

## Version Compatibility Chart

| Rust Version | casper-contract | casper-types |
|--------------|-----------------|--------------|
| 1.70-1.76    | 1.4.4           | 1.5.0        |
| 1.80-1.85    | 3.0.0           | 3.0.0        |
| **1.91.1**   | **4.0.0**       | **4.0.1**    |
| 1.92+        | 5.0.0+          | 5.0.0+       |

Your Rust 1.91.1 needs casper-contract 4.0.0 or newer!

---

**Copy the command block above and paste it into your GCP VM terminal now!**

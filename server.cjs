const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");
const os = require("os");

const app = express();
const upload = multer();

// Enable CORS for development
app.use(cors());

app.get("/health", (req, res) => {
    res.json({ status: "ok", environment: "local-wsl" });
});

app.post("/compile", upload.single("source"), async (req, res) => {
    const startTime = Date.now();
    try {
        if (!req.file) return res.status(400).json({ error: "No source file provided" });

        const code = req.file.buffer.toString("utf-8");
        const tmpDir = os.tmpdir();
        const projectDir = path.join(tmpDir, `casper_local_${Date.now()}`);

        console.log(`[${new Date().toLocaleTimeString()}] Compiling...`);

        fs.mkdirSync(projectDir, { recursive: true });
        fs.mkdirSync(path.join(projectDir, "src"));

        const cargoToml = `
[package]
name = "casper_contract"
version = "0.1.0"
edition = "2021"

[dependencies]
casper-contract = { version = "3.0.0", default-features = false }
casper-types = { version = "3.0.0", default-features = false }
wee_alloc = "0.4.5"

[lib]
crate-type = ["cdylib"]
`.trim();

        fs.writeFileSync(path.join(projectDir, "Cargo.toml"), cargoToml);
        fs.writeFileSync(path.join(projectDir, "src", "lib.rs"), code);

        // Using a specific nightly date that is compatible with Casper v3.0.0
        const cmd = `cd ${projectDir} && cargo +nightly-2024-10-01 build --release --target wasm32-unknown-unknown`;

        exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            const cleanup = () => fs.rmSync(projectDir, { recursive: true, force: true });

            if (error) {
                console.error("Compilation Error:", stderr || error.message);
                cleanup();
                return res.status(400).json({ error: "Compilation failed", details: stderr });
            }

            const wasmPath = path.join(projectDir, "target", "wasm32-unknown-unknown", "release", "casper_contract.wasm");
            if (!fs.existsSync(wasmPath)) {
                cleanup();
                return res.status(500).json({ error: "WASM not found" });
            }

            const wasm = fs.readFileSync(wasmPath);
            res.setHeader("Content-Type", "application/wasm");
            res.send(wasm);
            cleanup();
            console.log(`[${new Date().toLocaleTimeString()}] ✓ Success (${Date.now() - startTime}ms)`);
        });
    } catch (err) {
        res.status(500).json({ error: "Internal error", details: err.message });
    }
});

const PORT = 8081;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Casper Local WSL Backend running on http://localhost:${PORT}`);
});

// GCP Compilation Service for CasperIDE
// Updated for Casper 2.0 testnet (casper-contract 5.0)

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

        // Cargo.toml for Casper 2.0 (casper-contract 5.0)
        // casper-types is explicitly added to fix import issues
        const cargoToml = `
[package]
name = "casper_contract"
version = "0.1.0"
edition = "2021"

[dependencies]
casper-contract = "5.0"
casper-types = "6.0"

[profile.release]
lto = true
codegen-units = 1
opt-level = "z"

[lib]
crate-type = ["cdylib"]
    `.trim();

        fs.writeFileSync(path.join(projectDir, "Cargo.toml"), cargoToml);
        fs.writeFileSync(path.join(projectDir, "src", "lib.rs"), code);

        const cmd = `cd ${projectDir} && cargo +nightly-2025-01-01 build --release --target wasm32-unknown-unknown 2>&1`;

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
                console.error("STDOUT:", stdout);
                console.error("STDERR:", stderr);
                cleanup();
                return res.status(400).json({
                    error: "Compilation failed",
                    details: stderr || stdout || error.message,
                    compilationTime: `${compilationTime}ms`
                });
            }

            const wasmPath = path.join(projectDir, "target", "wasm32-unknown-unknown", "release", "casper_contract.wasm");

            if (!fs.existsSync(wasmPath)) {
                cleanup();
                return res.status(500).json({ error: "WASM file not found after compilation" });
            }

            let wasm = fs.readFileSync(wasmPath);
            const originalSize = wasm.length;
            console.log(`[${new Date().toISOString()}] ✓ Compilation successful!`);
            console.log(`Original WASM size: ${originalSize} bytes`);

            const optimizedPath = wasmPath.replace(".wasm", "_opt.wasm");
            try {
                require("child_process").execSync(`wasm-opt -Oz ${wasmPath} -o ${optimizedPath}`);
                if (fs.existsSync(optimizedPath)) {
                    wasm = fs.readFileSync(optimizedPath);
                    console.log(`Optimized WASM size: ${wasm.length} bytes`);
                }
            } catch (optError) {
                console.log(`⚠ wasm-opt not available`);
            }

            res.setHeader("Content-Type", "application/wasm");
            res.send(wasm);
            cleanup();
        });
    } catch (err) {
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
    console.log("=".repeat(60));
    console.log("🚀 Casper Compilation Service (Casper 2.0)");
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ casper-contract 5.0 + casper-types 6.0`);
    console.log(`✓ nightly-2025-01-01`);
    console.log("=".repeat(60));
});

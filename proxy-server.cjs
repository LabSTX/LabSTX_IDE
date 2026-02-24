const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Official Casper testnet node + backups
const CASPER_TESTNET_NODES = [
    "https://node.testnet.casper.network/rpc",
    "http://95.216.1.154:7777/rpc",
    "http://136.243.10.17:7777/rpc"
];

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        service: "casper-rpc-proxy",
        nodes: CASPER_TESTNET_NODES
    });
});

// Universal RPC proxy - handles all JSON-RPC methods from casper-js-sdk
app.post("/rpc", async (req, res) => {
    const method = req.body.method || 'unknown';
    console.log(`[${new Date().toLocaleTimeString()}] RPC Request: ${method}`);

    const fetch = (await import('node-fetch')).default;

    for (const nodeUrl of CASPER_TESTNET_NODES) {
        try {
            console.log(`  → Trying ${nodeUrl}...`);

            const response = await fetch(nodeUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(req.body),
                timeout: 15000
            });

            if (response.ok) {
                const data = await response.json();

                // Check for JSON-RPC errors
                if (data.error) {
                    console.warn(`  ✗ RPC Error from ${nodeUrl}:`, data.error.message);
                    continue;
                }

                console.log(`  ✓ Success via ${nodeUrl}`);
                return res.json(data);
            } else {
                console.warn(`  ✗ HTTP ${response.status} from ${nodeUrl}`);
            }
        } catch (error) {
            console.warn(`  ✗ Failed ${nodeUrl}:`, error.message);
        }
    }

    console.error('  ✗ All nodes failed');
    res.status(500).json({
        jsonrpc: "2.0",
        error: {
            code: -1,
            message: "All Casper nodes unreachable. Please check your internet connection."
        },
        id: req.body.id || null
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`\n🌐 Casper RPC Proxy Server`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Status: http://localhost:${PORT}/health`);
    console.log(`RPC Endpoint: http://localhost:${PORT}/rpc`);
    console.log(`\nForwarding to testnet nodes:`);
    CASPER_TESTNET_NODES.forEach((node, i) => {
        console.log(`  ${i + 1}. ${node}`);
    });
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

// Vercel Serverless Function for Casper RPC Proxy
// This replaces proxy-server.cjs when deployed to Vercel

const CASPER_TESTNET_NODES = [
    "https://node.testnet.casper.network/rpc",
    "http://95.216.1.154:7777/rpc",
    "http://136.243.10.17:7777/rpc"
];

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed. Use POST.'
        });
    }

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const method = req.body.method || 'unknown';
    console.log(`[RPC] ${method}`);

    // Try each Casper node until one succeeds
    for (const nodeUrl of CASPER_TESTNET_NODES) {
        try {
            const response = await fetch(nodeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(req.body),
                signal: AbortSignal.timeout(15000) // 15s timeout
            });

            if (response.ok) {
                const data = await response.json();

                // Check for JSON-RPC errors
                if (data.error) {
                    console.warn(`RPC Error from ${nodeUrl}:`, data.error.message);
                    continue;
                }

                console.log(`✓ Success via ${nodeUrl}`);
                return res.status(200).json(data);
            } else {
                console.warn(`HTTP ${response.status} from ${nodeUrl}`);
            }
        } catch (error) {
            console.warn(`Failed ${nodeUrl}:`, error.message);
        }
    }

    // All nodes failed
    console.error('All Casper nodes failed');
    return res.status(500).json({
        jsonrpc: "2.0",
        error: {
            code: -1,
            message: "All Casper nodes unreachable. Please check your internet connection."
        },
        id: req.body.id || null
    });
}

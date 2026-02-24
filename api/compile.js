// Vercel Serverless Function - Compilation Proxy
// Proxies compilation requests to GCP server to avoid mixed content errors

import { IncomingMessage } from 'http';

export const config = {
    api: {
        bodyParser: false, // We need raw request stream
    },
    maxDuration: 300, // 5 minutes
};

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const compilerUrl = process.env.VITE_COMPILER_SERVICE_URL || 'http://20.193.142.1:8080';

        console.log('[Compile Proxy] Forwarding request to:', compilerUrl);

        // Use dynamic import for node-fetch if native fetch fails
        const fetchFn = globalThis.fetch;

        // Forward the raw request to GCP
        const response = await fetchFn(`${compilerUrl}/compile`, {
            method: 'POST',
            headers: {
                'Content-Type': req.headers['content-type'],
            },
            body: req,
            duplex: 'half', // Required for streaming request body
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Compile Proxy] GCP returned error:', errorText);
            return res.status(response.status).send(errorText);
        }

        // Forward response headers
        const compilationTime = response.headers.get('x-compilation-time');
        const wasmSize = response.headers.get('x-wasm-size');

        res.setHeader('Content-Type', 'application/wasm');
        if (compilationTime) res.setHeader('X-Compilation-Time', compilationTime);
        if (wasmSize) res.setHeader('X-WASM-Size', wasmSize);

        // Stream the WASM binary back
        const buffer = await response.arrayBuffer();
        console.log('[Compile Proxy] Success! Returning WASM:', buffer.byteLength, 'bytes');

        return res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('[Compile Proxy] Error:', error);
        return res.status(500).json({
            error: 'Compilation proxy error',
            message: error.message,
            stack: error.stack,
        });
    }
}

const https = require('https');
const http = require('http');

const body = JSON.stringify({
    jsonrpc: '2.0',
    method: 'info_get_status',
    params: [],
    id: 1
});

const urls = [
    'http://52.35.59.254:7777/rpc',
    'https://node-clarity-testnet.make.services/rpc',
    'https://rpc.testnet.casperlabs.io/rpc',
    'http://85.208.51.127:7777/rpc',
    'http://135.181.208.231:7777/rpc'
];

async function checkUrl(url) {
    return new Promise((resolve) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': body.length
            },
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✅ ${url} is working (Status 200)`);
                    resolve(true);
                } else {
                    console.log(`❌ ${url} returned status ${res.statusCode}`);
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.log(`❌ ${url} failed: ${e.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            console.log(`❌ ${url} timed out`);
            resolve(false);
        });

        req.write(body);
        req.end();
    });
}

async function run() {
    console.log('Testing RPC endpoints...');
    for (const url of urls) {
        await checkUrl(url);
    }
}

run();

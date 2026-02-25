import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLARINET_VERSION = 'v2.11.0';
const BINARY_NAME = 'clarinet-linux-x64-glibc.tar.gz';
const DOWNLOAD_URL = `https://github.com/stx-labs/clarinet/releases/download/${CLARINET_VERSION}/${BINARY_NAME}`;

async function downloadWithRedirects(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                downloadWithRedirects(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
            file.on('error', (err) => {
                fs.unlinkSync(dest);
                reject(err);
            });
        }).on('error', (err) => {
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            reject(err);
        });
    });
}

async function setup() {
    if (os.platform() !== 'linux') {
        console.log('Skipping Clarinet download: Local system is not Linux.');
        return;
    }

    // Always install to the 'bin' folder relative to THIS script
    const binDir = path.join(__dirname, 'bin');
    const binaryPath = path.join(binDir, 'clarinet');

    if (fs.existsSync(binaryPath)) {
        console.log('✅ Clarinet already installed in ' + binDir);
        return;
    }

    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

    console.log(`📥 Downloading Clarinet ${CLARINET_VERSION} for Linux...`);

    const tarPath = path.join(__dirname, 'clarinet.tar.gz');

    try {
        await downloadWithRedirects(DOWNLOAD_URL, tarPath);
        console.log('📦 Extracting...');

        // Hiro's tar usually contains the 'clarinet' binary at the root
        execSync(`tar -xzf ${tarPath} -C ${binDir}`);

        // Sometimes tar extraction behavior varies, double check
        const extractedPath = path.join(binDir, 'clarinet');
        if (fs.existsSync(extractedPath)) {
            fs.chmodSync(extractedPath, '755');
        }

        fs.unlinkSync(tarPath);
        console.log('🚀 Clarinet installed successfully to ' + extractedPath);
    } catch (err) {
        if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);
        console.error('❌ Failed to install Clarinet:', err.message);
        process.exit(1);
    }
}

setup();

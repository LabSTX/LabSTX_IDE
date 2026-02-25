import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import os from 'os';

const CLARINET_VERSION = 'v2.11.0';
const BINARY_NAME = 'clarinet-linux-x64-glibc.tar.gz';
const DOWNLOAD_URL = `https://github.com/hirosystems/clarinet/releases/download/${CLARINET_VERSION}/${BINARY_NAME}`;

async function setup() {
    if (os.platform() !== 'linux') {
        console.log('Skipping Clarinet download: Local system is not Linux.');
        console.log('On Windows/macOS, please install Clarinet manually.');
        return;
    }

    const binDir = path.join(process.cwd(), 'bin');
    const binaryPath = path.join(binDir, 'clarinet');

    if (fs.existsSync(binaryPath)) {
        console.log('✅ Clarinet already installed in ./bin');
        return;
    }

    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir);

    console.log(`📥 Downloading Clarinet ${CLARINET_VERSION} for Linux...`);

    const tarPath = path.join(process.cwd(), 'clarinet.tar.gz');
    const file = fs.createWriteStream(tarPath);

    https.get(DOWNLOAD_URL, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log('📦 Extracting...');
            try {
                execSync(`tar -xzf ${tarPath} -C ${binDir}`);
                // The tar contains 'clarinet', so it might be at bin/clarinet or just ./clarinet
                // Hiro's tar usually puts the binary in the root of the archive.
                // If it extracted to the current dir, move it.
                if (fs.existsSync(path.join(process.cwd(), 'clarinet'))) {
                    fs.renameSync(path.join(process.cwd(), 'clarinet'), binaryPath);
                }

                fs.chmodSync(binaryPath, '755');
                fs.unlinkSync(tarPath);
                console.log('🚀 Clarinet installed successfully to ./bin/clarinet');
            } catch (err) {
                console.error('❌ Failed to extract Clarinet:', err.message);
            }
        });
    }).on('error', (err) => {
        fs.unlinkSync(tarPath);
        console.error('❌ Failed to download Clarinet:', err.message);
    });
}

setup();

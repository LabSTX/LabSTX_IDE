import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

dotenv.config();

const __apiDir = path.dirname(fileURLToPath(import.meta.url));
const execPromise = promisify(exec);
const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const PORT = 5001;
const DEPLOYER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

// Storage for REPL history per session
const replHistory: string[] = [];
let activeContract: { name: string; code: string } | null = null;

// Determine the path to the Clarinet binary
const getClarinetPath = () => {
    // Check 1: Adjacent bin folder (standalone deployment)
    const localBin = path.join(__apiDir, 'bin', 'clarinet');
    if (fs.existsSync(localBin)) return localBin;

    // Check 2: Process CWD bin (common for some hosting)
    const cwdBin = path.join(process.cwd(), 'bin', 'clarinet');
    if (fs.existsSync(cwdBin)) return cwdBin;

    // Fallback: System path
    return 'clarinet';
};

const CLARINET_CMD = getClarinetPath();
console.log(`[CLI] Using Clarinet command: ${CLARINET_CMD}`);

/**
 * Creates a temporary Clarinet project for a specific operation
 */
async function createTempProject(contracts: { name: string; code: string }[]) {
    const root = path.join(os.tmpdir(), `clarinet-${Date.now()}`);
    fs.mkdirSync(root, { recursive: true });
    fs.mkdirSync(path.join(root, 'contracts'));
    fs.mkdirSync(path.join(root, 'settings'));

    // Create Clarinet.toml
    let clarinetToml = `[project]\nname = "temp-project"\nauthors = []\ndescription = ""\ntelemetry = false\n[repl]\ncosts_version = 2\npurify_stack = true\nshow_costs = false\n`;

    for (const contract of contracts) {
        const cleanName = contract.name.replace(/\.clar$/, '');
        const contractPath = path.join('contracts', `${cleanName}.clar`);
        fs.writeFileSync(path.join(root, contractPath), contract.code);

        clarinetToml += `\n[contracts.${cleanName}]\npath = "${contractPath.replace(/\\/g, '/')}"\nsummary = ""\ndepends_on = []\n`;
    }

    fs.writeFileSync(path.join(root, 'Clarinet.toml'), clarinetToml);

    // Use the official Clarinet 3.4.0 default mnemonic (24 words)
    const simnetToml = `[network]\nname = "simnet"\n\n[accounts.deployer]\nmnemonic = "twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw"\nbalance = 100000000000000\n\n[accounts.wallet_1]\nmnemonic = "sell invite acquire kitten bamboo drastic jelly vivid peace spawn twice guilt pave pen trash pretty park cube fragile unaware remain midnight betray rebuild"\nbalance = 100000000000000`;

    fs.writeFileSync(path.join(root, 'settings', 'Simnet.toml'), simnetToml);
    fs.writeFileSync(path.join(root, 'settings', 'Devnet.toml'), simnetToml);

    return root;
}

// 1. Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', engine: 'Clarinet CLI' });
});

// 2. Check Contract (Using clarinet check)
app.post('/api/clarity/check', async (req, res) => {
    const { code, name } = req.body;
    let projectDir = '';
    try {
        projectDir = await createTempProject([{ name, code }]);
        console.log(`[CLI] Running check for ${name}...`);

        let success = true;
        let output = "";
        let errors: string[] = [];

        try {
            const { stdout, stderr } = await execPromise(`${CLARINET_CMD} check`, { cwd: projectDir });
            // Combine stdout and stderr for a full terminal-like log
            output = (stdout || "") + (stderr || "");
            success = true;
        } catch (err: any) {
            success = false;
            output = (err.stdout || "") + (err.stderr || "");
            const errLines = output.split('\n')
                .filter((l: string) => l.includes('error:') || l.includes('syntax error'));
            errors = errLines.length > 0 ? errLines : [err.message || "Check failed"];
        }

        res.json({ success, output, errors });
    } catch (error: any) {
        res.status(500).json({ success: false, errors: [error.message || "Internal server error"] });
    } finally {
        if (projectDir) fs.rmSync(projectDir, { recursive: true, force: true });
    }
});

// 3. Deploy (Update Context)
app.post('/api/clarity/deploy', async (req, res) => {
    const { code, name } = req.body;
    activeContract = { name, code };
    console.log(`[CLI] Updated active contract context: ${name}`);
    res.json({ success: true });
});

// 4. Execute Expression (Using clarinet console pipe)
app.post('/api/clarity/execute', async (req, res) => {
    const { snippet } = req.body;
    let projectDir = '';
    try {
        const contracts = activeContract ? [activeContract] : [];
        projectDir = await createTempProject(contracts);

        // Include simple trace/assets collection
        const script = [...replHistory, snippet].join('\n') + '\n::get_assets\n';
        const scriptPath = path.join(projectDir, 'repl_input.clar');
        fs.writeFileSync(scriptPath, script);

        console.log(`[CLI] Executing snippet: ${snippet}`);

        const { stdout, stderr } = await execPromise(`${CLARINET_CMD} console < repl_input.clar`, { cwd: projectDir });
        const combinedOutput = stdout + (stderr || "");
        const lines = combinedOutput.split('\n');

        let result = "Expression executed.";
        if (combinedOutput.includes('error:')) {
            const errorMatch = combinedOutput.match(/error: .+/g);
            result = errorMatch ? errorMatch[errorMatch.length - 1] : "Error occurred";
        } else {
            const snippetLine = lines.findIndex(l => l.includes(`>> ${snippet}`));
            if (snippetLine !== -1 && lines[snippetLine + 1]) {
                result = lines[snippetLine + 1].trim();
            } else {
                const outputLines = lines.filter(l => l.trim().length > 0 && !l.startsWith('>>') && !l.includes('Clarinet') && !l.includes('Asset balance'));
                result = outputLines[outputLines.length - 1] || "Success";
            }
        }

        if (!result.toLowerCase().includes('error')) {
            replHistory.push(snippet);
        }

        res.json({
            success: !result.toLowerCase().includes('error'),
            result: result,
            events: []
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (projectDir) fs.rmSync(projectDir, { recursive: true, force: true });
    }
});

// 5. Get State (Simulated via clarinet console)
app.post('/api/clarity/state', async (req, res) => {
    const { contractName } = req.body;
    let projectDir = '';
    try {
        const contracts = activeContract ? [activeContract] : [];
        projectDir = await createTempProject(contracts);

        const script = '::get_assets\n';
        const scriptPath = path.join(projectDir, 'state_input.clar');
        fs.writeFileSync(scriptPath, script);

        const { stdout } = await execPromise(`${CLARINET_CMD} console < state_input.clar`, { cwd: projectDir });

        const lines = stdout.split('\n');
        const state: any[] = [];

        lines.forEach(line => {
            if (line.includes('Asset balance')) {
                const match = line.match(/Asset balance (.+): (.+)/);
                if (match) {
                    state.push({ name: match[1], type: 'asset', value: match[2] });
                }
            }
        });

        res.json({
            success: true,
            state,
            blockHeight: 1,
            deployer: DEPLOYER
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (projectDir) fs.rmSync(projectDir, { recursive: true, force: true });
    }
});

// 6. Terminal Execution (Generic clarinet command)
app.post('/api/clarity/terminal', async (req, res) => {
    const { command } = req.body;
    let projectDir = '';
    try {
        const contracts = activeContract ? [activeContract] : [];
        projectDir = await createTempProject(contracts);

        console.log(`[CLI] Terminal command: ${command}`);

        if (!command.trim().startsWith('clarinet')) {
            return res.json({ success: false, output: 'Only clarinet commands are allowed.' });
        }

        const finalCommand = command.replace(/^clarinet/, CLARINET_CMD);
        const { stdout, stderr } = await execPromise(finalCommand, { cwd: projectDir });
        res.json({
            success: true,
            output: stdout + (stderr || "")
        });
    } catch (error: any) {
        res.json({
            success: false,
            output: (error.stdout || "") + (error.stderr || "") || error.message
        });
    } finally {
        if (projectDir) fs.rmSync(projectDir, { recursive: true, force: true });
    }
});


// --- Git API Routes ---

const REPO_ROOT = process.cwd();

app.get('/api/git/status', async (req, res) => {
    try {
        const { stdout: statusOut } = await execPromise('git status --porcelain', { cwd: REPO_ROOT });
        const { stdout: branchOut } = await execPromise('git branch --show-current', { cwd: REPO_ROOT });

        const lines = statusOut.split('\n').filter(Boolean);
        const modifiedFiles: string[] = [];
        const stagedFiles: string[] = [];
        const untrackedFiles: string[] = [];

        lines.forEach(line => {
            const status = line.substring(0, 2);
            const file = line.substring(3).trim();

            if (status[0] !== ' ' && status[0] !== '?') {
                stagedFiles.push(file);
            }
            if (status[1] === 'M' || status[1] === 'D') {
                modifiedFiles.push(file);
            }
            if (status === '??') {
                untrackedFiles.push(file);
                modifiedFiles.push(file);
            }
        });

        res.json({
            success: true,
            branch: branchOut.trim(),
            modifiedFiles,
            stagedFiles,
            untrackedFiles
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/git/stage', async (req, res) => {
    const { filePath } = req.body;
    try {
        await execPromise(`git add "${filePath}"`, { cwd: REPO_ROOT });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/git/unstage', async (req, res) => {
    const { filePath } = req.body;
    try {
        await execPromise(`git restore --staged "${filePath}"`, { cwd: REPO_ROOT });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/git/discard', async (req, res) => {
    const { filePath } = req.body;
    try {
        await execPromise(`git restore "${filePath}"`, { cwd: REPO_ROOT });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/git/commit', async (req, res) => {
    const { message } = req.body;
    try {
        await execPromise(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: REPO_ROOT });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/git/log', async (req, res) => {
    try {
        const { stdout } = await execPromise('git log -n 20 --pretty=format:"%H|%an|%at|%s|%D" --all', { cwd: REPO_ROOT });
        const commits = stdout.split('\n').filter(Boolean).map(line => {
            const [hash, author, date, message, refNames] = line.split('|');
            let branch = 'main';
            if (refNames) {
                const branchMatch = refNames.match(/-> ([\w/-]+)/) || refNames.match(/base\/([\w/-]+)/);
                if (branchMatch) branch = branchMatch[1];
                else if (refNames.includes('HEAD')) {
                    const parts = refNames.split(', ');
                    branch = parts[0].replace('HEAD -> ', '').trim();
                }
            }

            return {
                id: hash,
                hash: hash.substring(0, 7),
                author,
                date: parseInt(date) * 1000,
                message,
                branch: branch || 'main'
            };
        });
        res.json({ success: true, commits });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/git/branches', async (req, res) => {
    try {
        const { stdout } = await execPromise('git branch --format="%(refname:short)"', { cwd: REPO_ROOT });
        const branches = stdout.split('\n').filter(Boolean);
        res.json({ success: true, branches });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/git/checkout', async (req, res) => {
    const { branch, create } = req.body;
    try {
        const cmd = create ? `git checkout -b "${branch}"` : `git checkout "${branch}"`;
        await execPromise(cmd, { cwd: REPO_ROOT });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// --- GitHub Auth Routes ---

app.get('/ide-api/auth/github', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: 'GitHub OAuth not configured' });

    const redirectUri = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/ide-api/auth/github/callback`;
    const scope = 'read:user user:email repo gist';
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    res.redirect(githubAuthUrl);
});

app.get('/ide-api/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/?error=no_code');

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.redirect('/?error=oauth_not_configured');

    try {
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) return res.redirect('/?error=' + tokenData.error);

        const accessToken = tokenData.access_token;
        const userResponse = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/vnd.github.v3+json' }
        });

        const userData = await userResponse.json();
        const cookieValue = JSON.stringify({
            token: accessToken,
            user: { login: userData.login, avatar_url: userData.avatar_url, name: userData.name, id: userData.id }
        });

        const encodedCookie = Buffer.from(cookieValue).toString('base64');
        res.setHeader('Set-Cookie', `github_auth=${encodedCookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
        res.redirect('http://localhost:3000/');
    } catch (error) {
        console.error('GitHub OAuth error:', error);
        res.redirect('/?error=oauth_failed');
    }
});

app.get('/ide-api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'github_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.redirect('http://localhost:3000/');
});

// --- GitHub API Proxy Routes ---

app.get('/api/github/user', (req, res) => {
    const authCookie = req.cookies?.github_auth;
    if (!authCookie) return res.json({ authenticated: false });
    try {
        const decoded = Buffer.from(authCookie, 'base64').toString('utf-8');
        const authData = JSON.parse(decoded);
        res.json({ authenticated: true, user: authData.user });
    } catch (error) {
        res.json({ authenticated: false });
    }
});

app.get('/api/github/repos', async (req, res) => {
    const authCookie = req.cookies?.github_auth;
    if (!authCookie) return res.status(401).json({ error: 'Not authenticated' });

    try {
        const decoded = Buffer.from(authCookie, 'base64').toString('utf-8');
        const authData = JSON.parse(decoded);
        const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
            headers: { 'Authorization': `Bearer ${authData.token}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        const repos = await response.json();
        res.json({
            repos: Array.isArray(repos) ? repos.map((r: any) => ({
                id: r.id, name: r.name, full_name: r.full_name, description: r.description,
                html_url: r.html_url, clone_url: r.clone_url, private: r.private, language: r.language
            })) : []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch repositories' });
    }
});

app.post('/api/github/clone', async (req, res) => {
    const authCookie = req.cookies?.github_auth;
    let token = '';

    if (authCookie) {
        try {
            const decoded = Buffer.from(authCookie, 'base64').toString('utf-8');
            const authData = JSON.parse(decoded);
            token = authData.token;
        } catch (e) { }
    }

    try {
        const { owner, repo, branch = 'main' } = req.body;
        const headers: any = { 'Accept': 'application/vnd.github.v3+json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
        let treeResponse = await fetch(treeUrl, { headers });

        if (!treeResponse.ok && branch === 'main') {
            treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
            treeResponse = await fetch(treeUrl, { headers });
        }

        if (!treeResponse.ok) {
            const err = await treeResponse.json();
            throw new Error(err.message || 'Failed to fetch repository tree. Is it public?');
        }

        const tree = await treeResponse.json();
        const files = (tree.tree as any[]).filter(item => item.type === 'blob');
        const fileContents: Record<string, string> = {};

        const fileBatch = files.slice(0, 50);
        await Promise.all(fileBatch.map(async (file: any) => {
            if (file.size > 500000) return;
            if (/\.(png|jpg|jpeg|gif|ico|pdf|zip|tar|gz|woff|woff2|ttf|eot)$/i.test(file.path)) return;

            try {
                const blobRes = await fetch(file.url, { headers });
                if (blobRes.ok) {
                    const blob: any = await blobRes.json();
                    fileContents[file.path] = Buffer.from(blob.content, 'base64').toString('utf-8');
                }
            } catch (e) {
                console.warn(`Failed to fetch ${file.path}`);
            }
        }));

        res.json({ success: true, files: fileContents });
    } catch (error: any) {
        console.error('Clone error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/github/gist', async (req, res) => {
    const authCookie = req.cookies?.github_auth;
    if (!authCookie) return res.status(401).json({ error: 'Not authenticated' });

    try {
        const decoded = Buffer.from(authCookie, 'base64').toString('utf-8');
        const authData = JSON.parse(decoded);
        const { description, files, isPublic } = req.body;

        const gistFiles: any = {};
        for (const [name, content] of Object.entries(files)) {
            const safeName = (name as string).replace(/\//g, '_');
            gistFiles[safeName] = { content };
        }

        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authData.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ description: description || 'Created with LabSTX IDE', public: isPublic, files: gistFiles })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to create gist');
        }

        const gist = await response.json();
        res.json({ success: true, url: gist.html_url });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\x1b[32m🚀 Clarinet CLI Backend running at http://localhost:${PORT}\x1b[0m`);
});

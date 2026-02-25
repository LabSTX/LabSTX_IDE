// Clone a GitHub repository (fetch files)
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authCookie = req.cookies?.github_auth;

    if (!authCookie) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const decoded = Buffer.from(authCookie, 'base64').toString('utf-8');
        const authData = JSON.parse(decoded);
        const token = authData.token;

        const { owner, repo, branch = 'main' } = req.body;

        if (!owner || !repo) {
            return res.status(400).json({ error: 'Owner and repo are required' });
        }

        // Get repository contents
        const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

        const treeResponse = await fetch(contentsUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!treeResponse.ok) {
            // Try 'master' branch if 'main' fails
            if (branch === 'main') {
                return handler({ ...req, body: { ...req.body, branch: 'master' } }, res);
            }
            throw new Error('Failed to fetch repository');
        }

        const tree = await treeResponse.json();

        // Filter to get only files (blobs), not directories
        const files = tree.tree.filter(item => item.type === 'blob');

        // Fetch content for each file (limit to reasonable size)
        const fileContents = {};
        const maxFiles = 50;
        const maxFileSize = 100000; // 100KB

        for (const file of files.slice(0, maxFiles)) {
            try {
                // Skip large files and binary files
                if (file.size > maxFileSize) continue;
                if (/\.(png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot|pdf|zip|tar|gz)$/i.test(file.path)) continue;

                const blobResponse = await fetch(file.url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (blobResponse.ok) {
                    const blob = await blobResponse.json();
                    // Decode base64 content
                    const content = Buffer.from(blob.content, 'base64').toString('utf-8');
                    fileContents[file.path] = content;
                }
            } catch (e) {
                console.warn(`Failed to fetch file ${file.path}:`, e.message);
            }
        }

        res.json({
            success: true,
            repo: `${owner}/${repo}`,
            files: fileContents,
            fileCount: Object.keys(fileContents).length
        });

    } catch (error) {
        console.error('Error cloning repo:', error);
        res.status(500).json({ error: 'Failed to clone repository' });
    }
}

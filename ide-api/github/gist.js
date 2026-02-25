// Create a GitHub Gist from workspace files
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

        const { description, files, isPublic } = req.body;

        if (!files || Object.keys(files).length === 0) {
            return res.status(400).json({ error: 'No files provided' });
        }

        // Format files for Gist API
        const gistFiles = {};
        for (const [filename, content] of Object.entries(files)) {
            gistFiles[filename] = { content };
        }

        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description: description || 'Created with CasperIDE',
                public: isPublic !== false,
                files: gistFiles
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create gist');
        }

        const gist = await response.json();

        res.json({
            success: true,
            url: gist.html_url,
            id: gist.id
        });

    } catch (error) {
        console.error('Error creating gist:', error);
        res.status(500).json({ error: 'Failed to create gist' });
    }
}

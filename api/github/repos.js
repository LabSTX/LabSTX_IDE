// List user's GitHub repositories
export default async function handler(req, res) {
    const authCookie = req.cookies?.github_auth;

    if (!authCookie) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const decoded = Buffer.from(authCookie, 'base64').toString('utf-8');
        const authData = JSON.parse(decoded);
        const token = authData.token;

        const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch repos');
        }

        const repos = await response.json();

        // Return simplified repo data
        const simplifiedRepos = repos.map(repo => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            html_url: repo.html_url,
            clone_url: repo.clone_url,
            private: repo.private,
            language: repo.language,
            updated_at: repo.updated_at
        }));

        res.json({ repos: simplifiedRepos });

    } catch (error) {
        console.error('Error fetching repos:', error);
        res.status(500).json({ error: 'Failed to fetch repositories' });
    }
}

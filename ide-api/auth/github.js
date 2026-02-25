// GitHub OAuth - Redirect to GitHub authorization
export default function handler(req, res) {
    const clientId = process.env.GITHUB_CLIENT_ID;

    if (!clientId) {
        return res.status(500).json({ error: 'GitHub OAuth not configured' });
    }

    const redirectUri = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/ide-api/auth/github/callback`;

    const scope = 'read:user user:email repo gist';

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

    res.redirect(githubAuthUrl);
}

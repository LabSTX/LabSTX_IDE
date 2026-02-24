// GitHub OAuth Callback - Exchange code for access token
export default async function handler(req, res) {
    const { code } = req.query;

    if (!code) {
        return res.redirect('/?error=no_code');
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.redirect('/?error=oauth_not_configured');
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: code
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error('GitHub OAuth error:', tokenData.error);
            return res.redirect('/?error=' + tokenData.error);
        }

        const accessToken = tokenData.access_token;

        // Get user info
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        const userData = await userResponse.json();

        // Set HTTP-only cookie with token (encrypted in production)
        const cookieValue = JSON.stringify({
            token: accessToken,
            user: {
                login: userData.login,
                avatar_url: userData.avatar_url,
                name: userData.name,
                id: userData.id
            }
        });

        // Base64 encode for cookie safety
        const encodedCookie = Buffer.from(cookieValue).toString('base64');

        res.setHeader('Set-Cookie', `github_auth=${encodedCookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);

        // Redirect back to app
        res.redirect('/');

    } catch (error) {
        console.error('GitHub OAuth callback error:', error);
        res.redirect('/?error=oauth_failed');
    }
}

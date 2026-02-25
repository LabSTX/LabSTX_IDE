// Get current GitHub user from cookie
export default function handler(req, res) {
    const authCookie = req.cookies?.github_auth;

    if (!authCookie) {
        return res.status(401).json({ authenticated: false });
    }

    try {
        const decoded = Buffer.from(authCookie, 'base64').toString('utf-8');
        const authData = JSON.parse(decoded);

        res.json({
            authenticated: true,
            user: authData.user
        });
    } catch (error) {
        res.status(401).json({ authenticated: false });
    }
}

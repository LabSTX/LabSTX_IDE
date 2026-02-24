// Logout - Clear GitHub auth cookie
export default function handler(req, res) {
    res.setHeader('Set-Cookie', 'github_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.redirect('/');
}

import React, { useState, useEffect, useRef } from 'react';

interface GitHubUser {
    login: string;
    avatar_url: string;
    name: string | null;
    id: number;
}

interface GitHubAuthProps {
    onClone?: (files: Record<string, string>, repoName: string) => void;
    onGistCreated?: (url: string) => void;
    workspaceFiles?: Record<string, string>;
}

export const GitHubAuth: React.FC<GitHubAuthProps> = ({
    onClone,
    onGistCreated,
    workspaceFiles = {}
}) => {
    const [user, setUser] = useState<GitHubUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [modalType, setModalType] = useState<'clone' | 'gist' | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Check authentication status on mount
    useEffect(() => {
        checkAuth();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/github/user');
            if (!response.ok) return;

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (data.authenticated) {
                    setUser(data.user);
                }
            }
        } catch (error) {
            // Silently fail in dev if backend is missing
            if (process.env.NODE_ENV === 'production') {
                console.error('Auth check failed:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = () => {
        window.location.href = '/api/auth/github';
    };

    const handleLogout = () => {
        window.location.href = '/api/auth/logout';
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-caspier-muted text-xs">
                <span className="animate-pulse">...</span>
            </div>
        );
    }

    if (!user) {
        return (
            <button
                onClick={handleLogin}
                className="flex items-center gap-2 px-3 py-1.5 bg-caspier-dark border border-caspier-border rounded hover:bg-caspier-black hover:border-caspier-red transition-colors text-xs"
            >
                <GitHubIcon className="w-4 h-4" />
                <span>Login with GitHub</span>
            </button>
        );
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 bg-caspier-dark border border-caspier-border rounded-full hover:bg-caspier-black hover:border-labstx-orange transition-all duration-200 group shadow-sm active:translate-y-[1px]"
            >
                {user.avatar_url ? (
                    <img
                        src={user.avatar_url}
                        alt={user.login}
                        className="w-5 h-5 rounded-full border border-caspier-border group-hover:border-labstx-orange transition-colors"
                    />
                ) : (
                    <div className="w-5 h-5 rounded-full bg-caspier-panel flex items-center justify-center border border-caspier-border">
                        <GitHubIcon className="w-3 h-3 text-caspier-muted" />
                    </div>
                )}
                <span className="text-[11px] font-bold text-caspier-text group-hover:text-labstx-orange transition-colors">{user.login}</span>
                <ChevronDownIcon className={`w-3 h-3 text-caspier-muted transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-caspier-black/80 backdrop-blur-xl border border-caspier-border rounded-lg shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-caspier-border bg-caspier-panel/30">
                        <div className="flex items-center gap-3">
                            <img src={user.avatar_url} className="w-8 h-8 rounded-lg shadow-inner" />
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black text-caspier-text truncate">{user.name || user.login}</span>
                                <span className="text-[10px] text-caspier-muted font-bold tracking-tighter uppercase opacity-70">GitHub Developer</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-1.5">
                        <button
                            onClick={() => { setModalType('clone'); setMenuOpen(false); }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-bold text-caspier-text hover:bg-labstx-orange/10 hover:text-labstx-orange rounded-md transition-all group"
                        >
                            <div className="flex items-center gap-2">
                                <CloneIcon className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                                <span>Clone Project</span>
                            </div>
                            <span className="text-[9px] text-caspier-muted font-mono opacity-50 px-1 border border-caspier-border rounded">C</span>
                        </button>
                        <button
                            onClick={() => { setModalType('gist'); setMenuOpen(false); }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-bold text-caspier-text hover:bg-labstx-orange/10 hover:text-labstx-orange rounded-md transition-all group"
                        >
                            <div className="flex items-center gap-2">
                                <GistIcon className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                                <span>Publish Gist</span>
                            </div>
                            <span className="text-[9px] text-caspier-muted font-mono opacity-50 px-1 border border-caspier-border rounded">G</span>
                        </button>
                    </div>

                    <div className="border-t border-caspier-border m-1.5 opacity-50" />

                    <div className="p-1.5 pt-0">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-red-500 hover:bg-red-500/10 rounded-md transition-all group"
                        >
                            <DisconnectIcon className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            )}

            {modalType === 'clone' && (
                <CloneModal
                    onClose={() => setModalType(null)}
                    onClone={onClone}
                />
            )}

            {modalType === 'gist' && (
                <GistModal
                    onClose={() => setModalType(null)}
                    onCreated={onGistCreated}
                    files={workspaceFiles}
                />
            )}
        </div>
    );
};

// Clone Modal Component
const CloneModal: React.FC<{
    onClose: () => void;
    onClone?: (files: Record<string, string>, repoName: string) => void;
}> = ({ onClose, onClone }) => {
    const [repos, setRepos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cloning, setCloning] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchRepos();
    }, []);

    const fetchRepos = async () => {
        try {
            const response = await fetch('/api/github/repos');
            const data = await response.json();
            setRepos(data.repos || []);
        } catch (error) {
            console.error('Failed to fetch repos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClone = async (repo: any) => {
        setCloning(true);
        try {
            const [owner, repoName] = repo.full_name.split('/');
            const response = await fetch('/api/github/clone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, repo: repoName })
            });
            const data = await response.json();
            if (data.success && onClone) {
                onClone(data.files, repo.name);
                onClose();
            }
        } catch (error) {
            console.error('Clone failed:', error);
        } finally {
            setCloning(false);
        }
    };

    const filteredRepos = repos.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-caspier-dark border border-caspier-border rounded-lg w-[500px] max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-caspier-border">
                    <h3 className="text-sm font-bold">Clone Repository</h3>
                    <button onClick={onClose} className="text-caspier-muted hover:text-caspier-text">✕</button>
                </div>

                <div className="p-4 border-b border-caspier-border">
                    <input
                        type="text"
                        placeholder="Search repositories..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full px-3 py-2 bg-caspier-black border border-caspier-border rounded text-xs focus:border-caspier-red outline-none"
                    />
                </div>

                <div className="overflow-y-auto max-h-[400px]">
                    {loading ? (
                        <div className="p-4 text-center text-caspier-muted text-xs">Loading repositories...</div>
                    ) : filteredRepos.length === 0 ? (
                        <div className="p-4 text-center text-caspier-muted text-xs">No repositories found</div>
                    ) : (
                        filteredRepos.map(repo => (
                            <div key={repo.id} className="p-3 border-b border-caspier-border hover:bg-caspier-black transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium">{repo.name}</span>
                                            {repo.private && (
                                                <span className="px-1 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] rounded">Private</span>
                                            )}
                                            {repo.language && (
                                                <span className="text-[10px] text-caspier-muted">{repo.language}</span>
                                            )}
                                        </div>
                                        {repo.description && (
                                            <p className="text-[10px] text-caspier-muted mt-1 truncate">{repo.description}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleClone(repo)}
                                        disabled={cloning}
                                        className="px-3 py-1 bg-caspier-red text-caspier-black text-xs font-bold rounded hover:bg-red-400 disabled:opacity-50 transition-colors"
                                    >
                                        {cloning ? '...' : 'Clone'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// Gist Modal Component
const GistModal: React.FC<{
    onClose: () => void;
    onCreated?: (url: string) => void;
    files: Record<string, string>;
}> = ({ onClose, onCreated, files }) => {
    const [description, setDescription] = useState('Created with CasperIDE');
    const [isPublic, setIsPublic] = useState(true);
    const [creating, setCreating] = useState(false);
    const [result, setResult] = useState<{ url?: string; error?: string } | null>(null);

    const handleCreate = async () => {
        if (Object.keys(files).length === 0) {
            setResult({ error: 'No files to publish' });
            return;
        }

        setCreating(true);
        try {
            const response = await fetch('/api/github/gist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, isPublic, files })
            });
            const data = await response.json();
            if (data.success) {
                setResult({ url: data.url });
                if (onCreated) onCreated(data.url);
            } else {
                setResult({ error: data.error });
            }
        } catch (error) {
            setResult({ error: 'Failed to create gist' });
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-caspier-dark border border-caspier-border rounded-lg w-[400px]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-caspier-border">
                    <h3 className="text-sm font-bold">Publish to Gist</h3>
                    <button onClick={onClose} className="text-caspier-muted hover:text-caspier-text">✕</button>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <label className="text-xs text-caspier-muted block mb-1">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-caspier-black border border-caspier-border rounded text-xs focus:border-caspier-red outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="public"
                            checked={isPublic}
                            onChange={e => setIsPublic(e.target.checked)}
                            className="accent-caspier-red"
                        />
                        <label htmlFor="public" className="text-xs">Public gist</label>
                    </div>

                    <div className="text-xs text-caspier-muted">
                        {Object.keys(files).length} file(s) will be published
                    </div>

                    {result?.url && (
                        <div className="p-2 bg-green-500/20 border border-green-500 rounded text-xs">
                            ✅ Gist created: <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-green-400 underline">{result.url}</a>
                        </div>
                    )}

                    {result?.error && (
                        <div className="p-2 bg-red-500/20 border border-red-500 rounded text-xs text-red-400">
                            ❌ {result.error}
                        </div>
                    )}

                    <button
                        onClick={handleCreate}
                        disabled={creating || !!result?.url}
                        className="w-full py-2 bg-caspier-red text-caspier-black text-xs font-bold rounded hover:bg-red-400 disabled:opacity-50 transition-colors"
                    >
                        {creating ? 'Publishing...' : result?.url ? 'Published!' : 'Publish Gist'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Icons
const GitHubIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6,9 12,15 18,9" />
    </svg>
);

const CloneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
);

const GistIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);

const DisconnectIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16,17 21,12 16,7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

export default GitHubAuth;

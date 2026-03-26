import React, { useState } from 'react';
import { GitHubIcon, RocketIcon, PlayIcon } from '../UI/Icons';

import { Button } from '../UI/Button';

interface PublicCloneModalProps {
    onClone: (files: Record<string, string>, repoName: string) => void;
}

export const PublicCloneModal: React.FC<PublicCloneModalProps> = ({ onClone }) => {
    const [repoUrl, setRepoUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClone = async () => {
        if (!repoUrl) {
            setError('Please enter a repository URL');
            return;
        }

        // Basic GitHub URL parsing
        // Supports: 
        // https://github.com/owner/repo
        // github.com/owner/repo
        // owner/repo
        let owner = '';
        let repo = '';

        try {
            const cleanUrl = repoUrl.replace('https://', '').replace('http://', '').replace('www.', '');
            const parts = cleanUrl.split('/');

            if (parts[0] === 'github.com') {
                owner = parts[1];
                repo = parts[2]?.replace('.git', '');
            } else if (parts.length >= 2) {
                owner = parts[0];
                repo = parts[1]?.replace('.git', '');
            }

            if (!owner || !repo) {
                throw new Error('Invalid URL format');
            }
        } catch (e) {
            setError('Invalid GitHub URL. Use format: owner/repo or github.com/owner/repo');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/ide-api/github/clone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, repo })
            });

            const data = await response.json();

            if (data.success) {
                onClone(data.files, repo);
                closeModal();
            } else {
                setError(data.error || 'Failed to clone repository. Make sure it is public.');
            }
        } catch (err) {
            setError('Network error or server unavailable');
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        const modal = document.getElementById('public-clone-modal');
        if (modal) modal.style.display = 'none';
        setRepoUrl('');
        setError(null);
    };

    return (
        <div
            id="public-clone-modal"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm hidden items-center justify-center z-[100]"
            onClick={closeModal}
        >
            <div
                className="bg-caspier-dark border border-caspier-border rounded-xl w-[450px] shadow-2xl overflow-hidden animate-in zoom-in duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 bg-gradient-to-br from-caspier-black to-caspier-dark border-b border-caspier-border">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-labstx-orange/10 rounded-lg">
                            <GitHubIcon className="w-6 h-6 text-labstx-orange" />

                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight">Clone Repository</h3>
                            <p className="text-xs text-caspier-muted uppercase font-bold tracking-widest">Import from GitHub</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-caspier-muted block mb-2">Repository URL or Path</label>
                        <input
                            type="text"
                            placeholder="e.g. hirosystems/clarity-examples"
                            value={repoUrl}
                            onChange={e => setRepoUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleClone()}
                            className="w-full bg-caspier-black border border-caspier-border rounded-lg px-4 py-3 text-sm text-caspier-text focus:border-labstx-orange outline-none transition-colors placeholder:text-caspier-muted/50"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 font-medium animate-in slide-in-from-top-2">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="pt-2 flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={closeModal}
                            className="flex-1 py-2.5 rounded-lg font-bold border-caspier-border"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleClone}
                            disabled={loading || !repoUrl}
                            className="flex-1 py-2.5 rounded-lg bg-labstx-orange text-white border-labstx-orange hover:bg-labstx-orange/90 disabled:opacity-50"
                        >
                            <div className="flex items-center gap-2">
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <RocketIcon className="w-4 h-4" />
                                )}
                                <span>{loading ? 'Cloning...' : 'Start Clone'}</span>
                            </div>
                        </Button>
                    </div>

                    <div className="pt-4 border-t border-caspier-border0">
                        <div className="flex items-center gap-2 text-[10px] text-caspier-muted uppercase font-bold tracking-tighter">
                            <PlayIcon className="w-3 h-3" />
                            <span>Tip: Copy the HTTPS link from any public GitHub repo.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

import React, { useRef, useEffect } from 'react';
import { useGitHubAuth } from '../../contexts/GitHubAuthContext';
import { GitHubIcon, UserIcon, LogOutIcon, FileTextIcon, BugIcon, SettingsIcon } from './Icons';

interface AccountPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    anchorRect: DOMRect | null;
    onSettings?: () => void;
}

const AccountPopover: React.FC<AccountPopoverProps> = ({ isOpen, onClose, anchorRect, onSettings }) => {
    const { user, login, logout, isAuthenticated } = useGitHubAuth();
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen || !anchorRect) return null;

    const top = anchorRect.top;
    const left = anchorRect.right + 8;

    return (
        <div
            ref={popoverRef}
            className="fixed z-[100] w-64 bg-caspier-black border border-caspier-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200"
            style={{ top: Math.min(top, window.innerHeight - 300), left }}
        >
            <div className="p-4 border-b border-caspier-border bg-caspier-panel/30">
                {isAuthenticated && user ? (
                    <div className="flex items-center gap-3">
                        <img
                            src={user.avatar_url}
                            alt={user.login}
                            className="w-10 h-10 rounded-full border border-caspier-border"
                        />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-caspier-text truncate">
                                {user.name || user.login}
                            </span>
                            <span className="text-[10px] text-caspier-muted uppercase tracking-wider font-bold">
                                Clarity Developer
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-caspier-dark border border-caspier-border flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-caspier-muted" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-caspier-text">Not signed in</span>
                            <span className="text-[10px] text-caspier-muted">Sign in with Github</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-1.5">
                {!isAuthenticated ? (
                    <button
                        onClick={() => {
                            login();
                            onClose();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-caspier-text hover:bg-labstx-orange/10 hover:text-labstx-orange rounded-md transition-all group"
                    >
                        <GitHubIcon className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                        <span>Login with GitHub</span>
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            logout();
                            onClose();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-md transition-all group"
                    >
                        <LogOutIcon className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                        <span>Sign Out</span>
                    </button>
                )}

                <div className="h-px bg-caspier-border my-1.5 mx-1" />
                {isAuthenticated && user && (
                    <button
                        onClick={() => {
                            if (onSettings) onSettings();
                            onClose();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-caspier-text hover:bg-caspier-panel rounded-md transition-all group"
                    >
                        <SettingsIcon className="w-4 h-4 opacity-70 group-hover:opacity-100 text-labstx-orange" />
                        <span>Account Settings</span>
                    </button>
                )}

                <a
                    href="https://docs.labstx.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-caspier-text hover:bg-caspier-panel rounded-md transition-all group"
                >
                    <FileTextIcon className="w-4 h-4 opacity-70 group-hover:opacity-100 text-blue-500" />
                    <span>Documentation</span>
                </a>

                <button
                    onClick={() => {
                        // This could trigger a global event or prop call to open the bug modal
                        // For now we'll just close the popover
                        onClose();
                        window.dispatchEvent(new CustomEvent('open-bug-report'));
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-caspier-text hover:bg-caspier-panel rounded-md transition-all group"
                >
                    <BugIcon className="w-4 h-4 opacity-70 group-hover:opacity-100 text-red-500" />
                    <span>Report an Issue</span>
                </button>
            </div>
        </div>
    );
};

export default AccountPopover;

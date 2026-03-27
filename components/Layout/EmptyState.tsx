import { ChevronRight } from 'lucide-react';
import React from 'react';

interface EmptyStateProps {
    onCreateFile: () => void;
    onOpenProject: () => void;
    onToggleSearch: () => void;
    onToggleCommandPalette: () => void;
    theme: 'dark' | 'light';
}

const EmptyState: React.FC<EmptyStateProps> = ({
    onCreateFile,
    onOpenProject,
    onToggleSearch,
    onToggleCommandPalette,
    theme,
}) => {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-caspier-dark select-none">
            <div className="max-w-md w-full flex flex-col gap-8">

                {/* Minimal Logo Section */}
                <div className="flex flex-col items-center opacity-20 grayscale hover:grayscale-0 transition-all duration-500">
                    {theme === 'dark' ? (
                        <img
                            src="/lab_stx_dark.png"
                            alt="stacks"
                            className="mb-2" width={100} height={100}
                        />
                    ) : (
                        <img
                            src="/lab_stx.png"
                            alt="stacks"
                            className="mb-2" width={100} height={100}
                        />
                    )}


                    <span className="text-xs font-medium tracking-[0.3em] text-white uppercase">LabSTX IDE</span>
                </div>

                {/* Vertical Action List (The VS Code Style) */}
                <div className="flex flex-col gap-3">
                    <EditorAction label="New File" shortcut="Ctrl+N" onClick={onCreateFile} />
                    <EditorAction label="Open Project" shortcut="Ctrl+Shift+O" onClick={onOpenProject} />
                    <EditorAction label="Search Everywhere" shortcut="Ctrl+F" onClick={onToggleSearch} />
                    <EditorAction label="Show All Commands" shortcut="Ctrl+Shift+P" onClick={onToggleCommandPalette} />
                    <EditorAction label="Ask AI Assistant" shortcut="Ctrl+I" onClick={() => { }} />
                    <div className="h-[1px] bg-caspier-border my-2 opacity-50" />
                    <a
                        href="https://docs.google.com/forms/d/e/1FAIpQLSegIYqoTgB6U9s-cQDsx_Csf2b8Jfa3JJ8jz8EcrJg1oGssIg/viewform"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between px-4 py-2 rounded-full border border-blue-500/20 transition-all text-left"
                    >
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-blue-400 uppercase tracking-tighter">
                                ✨ Join Early Access
                            </span>
                            <span className="text-[10px] text-blue-300 opacity-60 font-medium">
                                Influence future Stacks features
                            </span>
                        </div>
                        <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform"><ChevronRight /></span>
                    </a>
                </div>


            </div>
        </div>
    );
};

const EditorAction = ({ label, shortcut, onClick }: { label: string, shortcut: string, onClick: () => void }) => (
    <button
        onClick={onClick}
        className="group flex items-center justify-between px-3 py-1.5 rounded-md hover:bg-caspier-hover/50 transition-colors text-left"
    >
        <span className="text-[13px] text-caspier-muted group-hover:text-blue-400 transition-colors">
            {label}
        </span>
        <div className="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
            {shortcut.split('+').map((key, i) => (
                <span key={i} className="text-[10px] font-mono bg-caspier-black px-1.5 py-0.5 rounded border border-caspier-border">
                    {key}
                </span>
            ))}
        </div>
    </button>
);

export default EmptyState;
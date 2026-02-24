import React from 'react';
import {
    RocketIcon, FilePlusIcon, FolderPlusIcon, GithubIcon,
    BotIcon, PlayIcon, ShieldIcon, ActivityIcon, ChevronRightIcon
} from './Icons';

interface HomeTabProps {
    onCreateFile: () => void;
    onImportWorkspace: () => void;
    onSelectWalkthrough: (id: string) => void;
    onClone: () => void;
    theme: 'dark' | 'light';
}

const HomeTab: React.FC<HomeTabProps> = ({ onCreateFile, onImportWorkspace, onSelectWalkthrough, onClone, theme }) => {
    return (
        <div className="h-full w-full overflow-y-auto bg-background text-foreground selection:bg-primary/10 animate-in fade-in duration-700">
            <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
                    <div className="flex items-center gap-5">
                        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10">
                            <img
                                src={theme === 'dark' ? "/lab_stx_dark.png" : "/lab_stx.png"}
                                alt="LabSTX Logo"
                                className="w-10 h-10 object-contain"
                            />
                        </div>
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight">
                                LabSTX <span className="text-blue-500">IDE</span>
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1 max-w-md">
                                The professional workspace for building, testing, and deploying Clarity smart contracts.
                            </p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-12">

                    {/* Left Column: Actions & Recent (7 cols) */}
                    <div className="md:col-span-7 space-y-12">
                        <section>
                            <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Start</h2>
                            <div className="grid gap-3">
                                <ActionCard
                                    icon={<FilePlusIcon className="w-5 h-5 text-blue-500" />}
                                    title="New Clarity File"
                                    description="Create a new .clar smart contract"
                                    onClick={onCreateFile}
                                />
                                <ActionCard
                                    icon={<FolderPlusIcon className="w-5 h-5 text-blue-500" />}
                                    title="Import Project"
                                    description="Upload a .zip or local folder"
                                    onClick={onImportWorkspace}
                                />
                                <ActionCard
                                    icon={<GithubIcon className="w-5 h-5 text-purple-500" />}
                                    title="Clone Repository"
                                    description="Import directly from GitHub"
                                    onClick={onClone}
                                />
                            </div>
                        </section>

                        <section>
                            <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Recent Workspaces</h2>
                            <div className="flex flex-col items-center justify-center py-10 px-4 border border-gray-400/20 border border-gray-400/20-dashed rounded-md bg-muted/30">
                                <p className="text-xs text-muted-foreground italic">No recent projects found.</p>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Walkthroughs & Features (5 cols) */}
                    <div className="md:col-span-5 space-y-10">
                        <section>
                            <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Learning</h2>
                            <div className="space-y-2">
                                {[
                                    { id: 'get-started', title: 'Getting Started', icon: RocketIcon, color: 'text-blue-500' },
                                    { id: 'deploy-contract', title: 'Deployment Guide', icon: PlayIcon, color: 'text-green-500' },
                                    { id: 'security', title: 'Security Best Practices', icon: ShieldIcon, color: 'text-red-500' }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => onSelectWalkthrough(item.id)}
                                        className="group flex items-center justify-between w-full p-3 rounded-lg border border-gray-400/20 bg-card hover:bg-accent transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon className={`w-4 h-4 ${item.color}`} />
                                            <span className="text-sm font-medium">{item.title}</span>
                                        </div>
                                        <ChevronRightIcon className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="p-6 rounded-md border border-gray-400/20 bg-card">
                            <div className="flex items-center gap-2 mb-4">
                                <ActivityIcon className="w-4 h-4 text-blue-500" />
                                <h3 className="text-sm font-semibold">IDE Capabilities</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <BotIcon className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        <strong className="text-foreground">AI Advisor:</strong> Debug and optimize Clarity code with context-aware suggestions.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <ShieldIcon className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        <strong className="text-foreground">Nakamoto Ready:</strong> Full support for the latest Stacks network upgrades.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-24 pt-8 border-t border-gray-400/20 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-muted-foreground font-medium uppercase tracking-widest">
                    <div>© 2026 LabSTX IDE • Clarity v2.1</div>
                    <div className="flex gap-8">
                        <a href="#" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">Docs</a>
                        <a href="#" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">GitHub</a>
                        <a href="#" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">Support</a>
                    </div>
                </footer>
            </div>
        </div>
    );
};

/* Sub-component for cleaner Action Buttons */
const ActionCard = ({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick: () => void }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-4 w-full p-4 rounded-md border border-gray-400/20 bg-card hover:bg-accent hover:border border-gray-400/20-accent-foreground/20 transition-all text-left group"
    >
        <div className="p-3 rounded-lg bg-muted group-hover:bg-background transition-colors">
            {icon}
        </div>
        <div>
            <div className="font-medium text-sm">{title}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
        </div>
    </button>
);

export default HomeTab;
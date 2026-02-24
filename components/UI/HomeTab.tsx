import React from 'react';
import { RocketIcon, FilePlusIcon, FolderPlusIcon, GithubIcon, BotIcon, PlayIcon, ShieldIcon, ActivityIcon, ChevronRightIcon } from './Icons';

interface HomeTabProps {
    onCreateFile: () => void;
    onImportWorkspace: () => void;
    onSelectWalkthrough: (id: string) => void;
    onClone: () => void;
    theme: 'dark' | 'light';
}

const HomeTab: React.FC<HomeTabProps> = ({ onCreateFile, onImportWorkspace, onSelectWalkthrough, onClone, theme }) => {
    return (
        <div className="h-full w-full overflow-y-auto bg-caspier-dark text-caspier-text select-none animate-in fade-in duration-500 font-inter">
            <div className="max-w-6xl mx-auto px-10 py-16">

                {/* Header Section */}
                <header className="mb-16">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-labstx-orange/10 rounded-xl">
                            {theme === 'dark' ? (
                                <img
                                    src="/lab_stx_dark.png"
                                    alt="stacks"
                                    className="block object-contain w-[60px]"
                                />
                            ) : (
                                <img
                                    src="/lab_stx.png"
                                    alt="stacks"
                                    className="block object-contain w-[60px]"
                                />
                            )}
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-caspier-text mb-1">
                                LabSTX <span className="text-labstx-orange">IDE</span>
                            </h1>
                            <p className="text-caspier-muted font-medium">Build, test, and deploy Clarity smart contracts on Stacks.</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

                    {/* Left Column: Start */}
                    <section className="space-y-10">
                        <div>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                Start
                            </h2>
                            <div className="space-y-4">
                                <button
                                    onClick={onCreateFile}
                                    className="w-full flex items-center gap-4 p-4 rounded-lg bg-caspier-black/40 border border-caspier-border hover:border-labstx-orange group transition-all"
                                >
                                    <div className="p-2.5 bg-labstx-orange/10 rounded-lg group-hover:bg-labstx-orange/20 transition-colors">
                                        <FilePlusIcon className="w-5 h-5 text-labstx-orange" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-sm">New Clarity File</div>
                                        <div className="text-xs text-caspier-muted">Create a new .clar smart contract</div>
                                    </div>
                                </button>

                                <button
                                    onClick={onImportWorkspace}
                                    className="w-full flex items-center gap-4 p-4 rounded-lg bg-caspier-black/40 border border-caspier-border hover:border-labstx-orange group transition-all"
                                >
                                    <div className="p-2.5 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                        <FolderPlusIcon className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-sm">Import Project</div>
                                        <div className="text-xs text-caspier-muted">Upload a .zip or from local folder</div>
                                    </div>
                                </button>

                                <button
                                    onClick={onClone}
                                    className="w-full flex items-center gap-4 p-4 rounded-lg bg-caspier-black/40 border border-caspier-border hover:border-labstx-orange group transition-all"
                                >
                                    <div className="p-2.5 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                                        <GithubIcon className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-sm">Clone Repository</div>
                                        <div className="text-xs text-caspier-muted">Clone from GitHub directly</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                Recent
                            </h2>
                            <div className="text-caspier-muted text-sm italic py-4 px-2 border border-dashed border-caspier-border rounded-lg text-center">
                                Your recent projects and files will appear here.
                            </div>
                        </div>
                    </section>

                    {/* Right Column: Walkthroughs & Features */}
                    <section className="space-y-10">
                        <div>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-labstx-orange">
                                Walkthroughs
                            </h2>
                            <div className="space-y-4">
                                {[
                                    { id: 'get-started', title: 'Getting Started with Clarity', desc: 'Learn the basics of Clarity syntax and structure.', icon: RocketIcon, color: 'text-orange-400' },
                                    { id: 'deploy-contract', title: 'Deploying Your First Contract', desc: 'Connect a wallet and broadcast to testnet.', icon: PlayIcon, color: 'text-green-400' },
                                    { id: 'security-best-practices', title: 'Security Best Practices', desc: 'Write safe and bug-free smart contracts.', icon: ShieldIcon, color: 'text-red-400' }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => onSelectWalkthrough(item.id)}
                                        className="w-full flex items-center justify-between p-4 rounded-lg bg-caspier-black/40 border border-caspier-border hover:border-labstx-orange transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded bg-caspier-dark group-hover:bg-caspier-hover transition-colors`}>
                                                <item.icon className={`w-5 h-5 ${item.color}`} />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-sm">{item.title}</div>
                                                <div className="text-[11px] text-caspier-muted">{item.desc}</div>
                                            </div>
                                        </div>
                                        <ChevronRightIcon className="w-4 h-4 text-caspier-muted group-hover:text-labstx-orange transition-transform group-hover:translate-x-1" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                Key Features
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-lg bg-caspier-dark border border-caspier-border">
                                    <BotIcon className="w-5 h-5 text-indigo-400 mb-2" />
                                    <div className="text-xs font-bold mb-1 uppercase tracking-wider text-caspier-muted">AI Assistant</div>
                                    <div className="text-[11px] text-caspier-muted leading-relaxed">Integrated Clarity advisor to help debug and optimize.</div>
                                </div>
                                <div className="p-4 rounded-lg bg-caspier-dark border border-caspier-border">
                                    <ActivityIcon className="w-5 h-5 text-yellow-400 mb-2" />
                                    <div className="text-xs font-bold mb-1 uppercase tracking-wider text-caspier-muted">Real-time Check</div>
                                    <div className="text-[11px] text-caspier-muted leading-relaxed">Instant syntax validation and semantic analysis.</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 rounded-xl bg-gradient-to-br from-labstx-orange/20 to-transparent border border-labstx-orange/20">
                            <div className="flex items-center gap-3 mb-2">
                                <RocketIcon className="w-5 h-5 text-labstx-orange" />
                                <span className="font-black text-sm uppercase tracking-widest text-labstx-orange">New in v1.2.0</span>
                            </div>
                            <ul className="text-xs text-caspier-muted space-y-2 list-disc list-inside">
                                <li>Support for Stacks Nakamoto upgrade features</li>
                                <li>Enhanced Clarity syntax highlighting</li>
                                <li>Multiple wallet provider detection (Xverse, Hiro, Leather)</li>
                                <li>Interactive deployment previewer</li>
                            </ul>
                        </div>
                    </section>

                </div>

                {/* Footer */}
                <footer className="mt-20 pt-8 border-t border-caspier-border flex justify-between items-center text-[10px] text-caspier-muted uppercase font-bold tracking-widest">
                    <div>Powered by Clarity & Stacks</div>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-labstx-orange transition-colors">Documentation</a>
                        <a href="#" className="hover:text-labstx-orange transition-colors">GitHub</a>
                        <a href="#" className="hover:text-labstx-orange transition-colors">Community</a>
                    </div>
                </footer>

            </div>
        </div>
    );
};

export default HomeTab;

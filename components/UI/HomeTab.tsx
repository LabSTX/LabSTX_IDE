import React from 'react';
import {
    PlusIcon,
    UploadIcon,
    GitHubIcon,

    FileTextIcon,
    ShieldIcon,
    RocketIcon,
    BotIcon,
    ChevronRightIcon,
    ExternalLinkIcon,
    TerminalIcon,
    GlobeIcon,
    CodeIcon,
    FolderPlusIcon,
    ClockIcon,
    TerminalSquareIcon,
    YoutubeIcon,
    TwitterIcon,
    LinkedinIcon,
    MessageSquareIcon,
    BookOpenIcon,
    DownloadIcon
} from './Icons';
import { ActivityView } from '../../types';
import { CircleQuestionMark } from 'lucide-react';

interface HomeTabProps {
    onCreateFile: () => void;
    onCreateFolder: () => void;
    onCreateWorkspace: () => void;
    onImportWorkspace: () => void;
    onSelectWalkthrough: (id: string) => void;
    onClone: () => void;
    theme: 'dark' | 'light';
    onSelectView: (view: ActivityView) => void;
    onSelectWorkspace: (name: string) => void;
    onOpenStats: () => void;
    workspaceMetadata: Record<string, { createdAt: number }>;

    workspaceNames: string[];
}

interface FeatureCardProps {
    badge: string;
    title: string;
    description: string;
    bullets: string[];
    buttonText: string;
    icon: any;
    onClick?: () => void;
}

const IconButton: React.FC<{ icon: any; title: string; onClick?: () => void }> = ({ icon: Icon, title, onClick }) => (
    <button
        onClick={onClick}
        className="p-2.5 rounded-lg bg-caspier-black border border-caspier-border text-slate-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
        title={title}
    >
        <Icon className="w-5 h-5" />
    </button>
);

const Logo = ({ className, theme = 'dark' }: { className?: string, theme?: 'dark' | 'light' }) => {
    const isLight = theme === 'light';
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="-120 -130 240 260">
            <defs>
                <linearGradient id={`logoGradientHome-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={isLight ? "#45B2FF" : "#45B2FF"} />
                    <stop offset="100%" stopColor={isLight ? "#2E8BCF" : "#2E8BCF"} />
                </linearGradient>
            </defs>
            <g stroke="none" strokeWidth="0" fill={`url(#logoGradientHome-${theme})`}>
                <path d="M 0 -115.47 L 100 -57.735 L 100 -5 L 0 -62.735 L -100 -5 L -100 -57.735 Z" />
                <path d="M 0 -42.735 L 74.02 0 L 0 42.735 L -74.02 0 Z" opacity={isLight ? "0.9" : "0.8"} />
                <path d="M -100 5 L -17.32 52.735 L -17.32 105.47 L -100 57.735 Z" opacity={isLight ? "0.7" : "0.6"} />
                <path d="M 100 5 L 17.32 52.735 L 17.32 105.47 L 100 57.735 Z" opacity={isLight ? "0.7" : "0.6"} />
            </g>
        </svg>
    );
};

const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
};

const FeatureCard: React.FC<FeatureCardProps & { theme: 'dark' | 'light' }> = ({ badge, title, description, bullets, buttonText, icon: Icon, onClick, theme }) => {
    const isLight = theme === 'light';
    return (
        <div className={`group relative flex flex-col ${isLight ? 'bg-white border-slate-200' : 'bg-caspier-black border-slate-700/50'} border p-6 overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl ${isLight ? 'hover:shadow-blue-500/5' : 'hover:shadow-black/20'} `}>
            <div className={`absolute -top-16 -right-16 w-48 h-48 ${isLight ? 'bg-blue-500/5' : 'bg-blue-500/5'} rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500 pointer-events-none`} />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className={`px-3 py-1 ${isLight ? 'bg-blue-50 border-blue-100' : 'bg-blue-500/10 border-blue-500/20'} rounded-full border`}>
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{badge}</span>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${isLight ? 'bg-slate-50 text-slate-400' : 'bg-slate-800/50 text-slate-400'} flex items-center justify-center group-hover:text-blue-500 group-hover:bg-blue-50 transition-all duration-300`}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>

                <h3 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'} mb-2`}>{title}</h3>
                <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm mb-6 leading-relaxed`}>
                    {description}
                </p>

                <ul className="space-y-3 mb-8">
                    {bullets.map((bullet, i) => (
                        <li key={i} className={`flex items-center gap-2.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {bullet}
                        </li>
                    ))}
                </ul>

                <button
                    onClick={onClick}
                    className={`mt-auto w-full py-3 ${isLight ? 'bg-slate-50 hover:bg-blue-500 text-slate-600 hover:text-white' : 'bg-[#232730] hover:bg-blue-500 text-slate-300 hover:text-white'} rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 group/btn`}
                >
                    {buttonText}
                    <ChevronRightIcon className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
};

const HomeTab: React.FC<HomeTabProps> = ({
    onCreateFile,
    onCreateFolder,
    onCreateWorkspace,
    onImportWorkspace,
    onSelectWalkthrough,
    onClone,
    theme,
    onSelectView,
    onSelectWorkspace,
    onOpenStats,
    workspaceMetadata,
    workspaceNames
}) => {
    const isLight = theme === 'light';
    const CARDS_DATA: FeatureCardProps[] = [
        {
            badge: 'v1.5.0 Release',
            title: 'AI Smart Contracts',
            description: 'Generate, audit and document Clarity contracts using our integrated Stacks-trained AI assistant.',
            bullets: ['Auto-completion for Clarity', 'Natural Language to Code', 'Logical Error Detection'],
            buttonText: 'Try AI Assistant',
            icon: BotIcon
        },
        {
            badge: 'Templates',
            title: 'Starter Templates',
            description: 'Explore curated templates for various use-cases and get started quickly.',
            bullets: ['NFTs', 'DeFi', 'DAOs', 'Tooling'],
            buttonText: 'Check out',
            icon: CodeIcon
        },
        {
            badge: 'Mainnet Ready',
            title: 'One-Click Deploy',
            description: 'Seamlessly deploy your contracts toTestnet or Mainnet with built-in wallet integration.',
            bullets: ['Multi-wallet Support', 'Custom fee', 'Custom Nonce'],
            buttonText: 'Explore Deployment',
            icon: RocketIcon
        }
    ];



    return (
        <div className={`flex flex-col h-full ${isLight ? 'bg-slate-50 text-slate-800' : 'bg-grey-800 text-slate-200'} overflow-y-auto selection:bg-blue-500/30`}>
            {/* Top Navigation */}
            <header className={`px-6 py-4 flex justify-between items-center gap-3 border-b ${isLight ? 'border-caspier-border bg-white/80' : 'border-caspier-border'} backdrop-blur-md sticky top-0 z-50`}>
                <div className='flex' />
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onSelectView(ActivityView.HELP_WALKTHROUGH)}
                        className={` flex items-center gap-2 px-4 py-2 ${isLight ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#232730] hover:bg-[#2A2F3A] border-slate-700 text-slate-200'} border rounded-full text-sm font-medium transition-colors`}
                    >
                        <CircleQuestionMark className="w-4 h-4 text-blue-500" />
                        Walkthroughs
                    </button>
                    <button
                        onClick={onCreateWorkspace}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-medium transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Create new workspace
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left Column - Hero & Actions */}
                    <div className="lg:col-span-6 flex flex-col gap-12">
                        {/* Hero Section */}
                        <div className={`relative overflow-hidden ${isLight ? 'bg-white border-slate-200 ' : 'bg-caspier-black border-slate-800'} border p-10`}>
                            <div className={`absolute top-0 right-0 w-96 h-96 ${isLight ? 'bg-blue-500/10' : 'bg-blue-600/10'} rounded-full blur-[100px] -z-10`} />
                            <div className={`absolute -bottom-24 -left-24 w-64 h-64 ${isLight ? 'bg-emerald-500/10' : 'bg-emerald-600/5'} rounded-full blur-[80px] -z-10`} />
                            {/* main card */}


                            <div className="relative z-10 flex-grow">
                                <div className="flex items-center gap-3 mb-4">
                                    {theme === 'dark' ? (
                                        <img
                                            src="/lab_stx_dark.png"
                                            alt="stacks"
                                            className="block object-contain w-[40px]"
                                        />
                                    ) : (
                                        <img
                                            src="/lab_stx.png"
                                            alt="stacks"
                                            className="block object-contain w-[60px]"
                                        />
                                    )}
                                    <h1 className={`text-3xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>LabSTX <span className="text-blue-500">IDE</span></h1>
                                </div>

                                <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-lg mb-6`}>
                                    Learn. Explore. <span className="text-blue-500 font-medium">Create.</span>
                                </p>

                                <div className="flex gap-1 mb-8">

                                    <IconButton icon={TwitterIcon} title="Twitter" onClick={() => window.open('https://twitter.com/stackslaborg', '_blank')} />

                                    <IconButton icon={GitHubIcon} title="GitHub" onClick={() => window.open('https://github.com/labstx', '_blank')} />

                                    <IconButton icon={MessageSquareIcon} title="Discord" onClick={() => window.open('https://discord.gg/xpTRKeBDA3', '_blank')} />
                                </div>

                                <div className="grid grid-cols-1 gap-3 mb-6">
                                    <button
                                        onClick={() => window.open('https://docs.stacks.co', '_blank')}
                                        className={`py-2.5 px-4 bg-transparent border ${isLight ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 text-slate-300'}  text-sm font-medium transition-all flex items-center justify-center gap-2`}
                                    >
                                        <BookOpenIcon size={16} className="text-slate-500" />
                                        Documentation
                                    </button>
                                    <button
                                        onClick={() => window.open('https://stacks.co', '_blank')}
                                        className={`hidden py-2.5 px-4 bg-transparent border ${isLight ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 text-slate-300'} rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2`}
                                    >
                                        <GlobeIcon size={16} className="text-slate-500" />
                                        Website
                                    </button>
                                </div>

                                <button
                                    onClick={onCreateWorkspace}
                                    className="hidden w-full py-3.5 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                >
                                    <DownloadIcon size={18} strokeWidth={2.5} />
                                    Download LabSTX Desktop Windows v1.1.6
                                </button>

                                <div className="hidden mt-4 text-center">
                                    <a href="#" className={`text-xs ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-500 hover:text-slate-300'} underline underline-offset-4 transition-colors`}>
                                        Other versions and platforms
                                    </a>
                                </div>

                                <div className={`mt-8 pt-8 border-t ${isLight ? 'border-slate-100' : 'border-slate-800/50'}`}>
                                    <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm mb-6 leading-relaxed`}>
                                        The most powerful IDE for building, testing, and deploying <span className={`${isLight ? 'text-slate-900' : 'text-white'} font-semibold`}>Smart Contracts on Stacks</span>.
                                    </p>

                                    <div className="hidden grid grid-cols-2 gap-3">
                                        <button
                                            onClick={onImportWorkspace}
                                            className={`py-2.5 px-4 bg-transparent border ${isLight ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 text-slate-300'} rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2`}
                                        >
                                            <UploadIcon className="w-4 h-4 text-slate-500" />
                                            Import Project
                                        </button>
                                        <button
                                            onClick={onClone}
                                            className={`py-2.5 px-4 ${isLight ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200' : 'bg-[#232730] hover:bg-[#2A2F3A] text-slate-400 hover:text-white border-slate-700'} border rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2`}
                                        >
                                            <GitHubIcon className="w-[18px] h-[18px]" />

                                            Clone Repo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Workspaces */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className={`text-xs font-bold uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Recent Workspaces</h3>
                            </div>

                            <div className="grid gap-3">
                                {workspaceNames.slice(0, 4).map((name) => (
                                    <div
                                        key={name}
                                        onClick={() => onSelectWorkspace(name)}
                                        className={`group flex items-center justify-between p-4 ${isLight ? 'bg-white border-slate-200 hover:border-blue-500/30' : 'bg-caspier-black border-caspier-border hover:bg-caspier-black hover:border-caspier-border/10'} border transition-all cursor-pointer shadow-sm`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-lg ${isLight ? 'bg-slate-50 text-slate-400' : 'bg-slate-800/50 text-slate-500'} flex items-center justify-center group-hover:text-blue-500 transition-colors`}>
                                                <ClockIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className={`text-sm font-semibold ${isLight ? 'text-slate-700 group-hover:text-slate-900' : 'text-slate-300 group-hover:text-white'} transition-colors capitalize`}>{name.replace(/_/g, ' ')}</h4>
                                                <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Modified {workspaceMetadata[name] ? formatRelativeTime(workspaceMetadata[name].createdAt) : 'some time ago'}</p>
                                            </div>
                                        </div>
                                        <ChevronRightIcon className={`w-4 h-4 ${isLight ? 'text-slate-300' : 'text-slate-700'} group-hover:text-blue-500 transition-all group-hover:translate-x-1`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Features */}
                    <div className="lg:col-span-6 flex flex-col gap-6">
                        {CARDS_DATA.map((card, i) => (
                            <FeatureCard key={i} {...card} theme={theme} />
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer Background Decor */}
            <div className="fixed bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-blue-500/5 to-transparent pointer-events-none -z-10" />
        </div>
    );
};

export default HomeTab;

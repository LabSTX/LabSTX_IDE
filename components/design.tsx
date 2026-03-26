import React from 'react';
import {
    BookOpen,
    Plus,
    Github,
    Twitter,
    Linkedin,
    Monitor,
    Youtube,
    MessageSquare,
    Download,
    TerminalSquare,
    Globe,
    CheckCircle2,
    Bot,
    PlayCircle,
    FolderOpen,
    ChevronRight,
    Layers
} from 'lucide-react';

// --- Types ---
interface Workspace {
    id: string;
    name: string;
    time: string;
}

interface FeatureCardProps {
    badge: string;
    title: string;
    description?: string;
    bullets?: string[];
    buttonText: string;
    icon: React.ElementType;
    primary?: boolean;
}

// --- Mock Data ---
const RECENT_WORKSPACES: Workspace[] = [
    { id: '1', name: 'MultiSig Wallet', time: 'created 2 minutes ago' },
    { id: '2', name: 'default_workspace', time: 'created 2 weeks ago' },
];

const CARDS_DATA: FeatureCardProps[] = [
    {
        badge: 'v1.5.0 Release',
        title: 'v1.5.0 Release',
        bullets: [
            'Consider Supporting Remix',
            'Maximize Right Panel or Terminal',
            'Clone Now in Workspace Modal'
        ],
        buttonText: 'Release Notes',
        icon: Layers,
    },
    {
        badge: 'RemixAI Assistant',
        title: 'RemixAI Assistant',
        description: 'RemixAI Assistant is a tool that helps you write code faster and easier.',
        buttonText: 'Build with AI',
        icon: Bot,
    },
    {
        badge: 'Remix Desktop',
        title: 'Remix Desktop Release',
        description: 'Remix Desktop is now released! It has access to the native terminal, downloadable compilers for offline work, and uses the wallet of your choice!',
        buttonText: 'Try it Out!',
        icon: Monitor,
    },
    {
        badge: 'Remix Guide',
        title: 'Remix Guide Videos',
        description: 'Watch videos to get up to speed with Remix and Solidity!',
        buttonText: 'Start Watching!',
        icon: PlayCircle,
    }
];

// --- Components ---

const IconButton = ({ Icon }: { Icon: React.ElementType }) => (
    <button className="text-slate-400 hover:text-slate-100 transition-colors p-1.5 rounded-md hover:bg-slate-800">
        <Icon size={18} strokeWidth={2} />
    </button>
);

const FeatureCard: React.FC<FeatureCardProps> = ({ badge, title, description, bullets, buttonText, icon: Icon }) => (
    <div className="group relative flex flex-col bg-[#1A1D24] border border-slate-700/50 rounded-2xl p-6 overflow-hidden hover:border-slate-600 transition-all duration-300 hover:shadow-xl hover:shadow-black/20">
        {/* Abstract background accent (Microsoft Fluent style) */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500 pointer-events-none" />

        {/* Top-right Icon Graphic */}
        <div className="absolute top-6 right-6 text-slate-700/30 group-hover:text-blue-500/10 transition-colors duration-500 pointer-events-none">
            <Icon size={80} strokeWidth={1} />
        </div>

        <div className="relative z-10 flex flex-col h-full">
            <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {badge}
                </span>
            </div>

            <h3 className="text-lg font-semibold text-slate-100 mb-3">{title}</h3>

            <div className="flex-grow mb-6">
                {description && (
                    <p className="text-sm text-slate-400 leading-relaxed">
                        {description}
                    </p>
                )}

                {bullets && (
                    <ul className="space-y-2.5">
                        {bullets.map((bullet, idx) => (
                            <li key={idx} className="flex items-start text-sm text-slate-300">
                                <CheckCircle2 className="w-4 h-4 text-slate-500 mr-2 shrink-0 mt-0.5" />
                                <span>{bullet}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <button className="w-full mt-auto py-2.5 px-4 bg-[#232730] hover:bg-[#2A2F3A] border border-slate-700 text-sm font-medium text-slate-200 rounded-xl transition-colors flex items-center justify-center group-hover:border-slate-600">
                {buttonText}
            </button>
        </div>
    </div>
);

export default function App() {
    return (
        <div className="min-h-screen bg-[#0E1116] text-slate-200 font-sans selection:bg-blue-500/30">

            {/* Top Navigation */}
            <header className="px-6 py-4 flex justify-end items-center gap-3 border-b border-slate-800/50 bg-[#0E1116]/80 backdrop-blur-md sticky top-0 z-50">
                <button className="flex items-center gap-2 px-4 py-2 bg-[#232730] hover:bg-[#2A2F3A] border border-slate-700 rounded-lg text-sm font-medium transition-colors">
                    <BookOpen size={16} className="text-slate-400" />
                    Start Learning
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
                    <Plus size={16} />
                    Create a new Workspace
                </button>
            </header>

            {/* Main Content Layout */}
            <main className="max-w-[1600px] mx-auto p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                    {/* Left Column (Hero & Workspaces) */}
                    <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-8">

                        {/* Hero Card */}
                        <div className="relative bg-[#1A1D24] rounded-2xl border border-slate-800 overflow-hidden flex flex-col p-8">
                            {/* Decorative Abstract BG */}
                            <div className="absolute inset-0 opacity-20 pointer-events-none">
                                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill="url(#grid)" />
                                    <circle cx="100%" cy="0%" r="80%" fill="url(#grid)" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="1" className="blur-sm" />
                                </svg>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
                            </div>

                            <div className="relative z-10 flex-grow">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-white p-2 rounded-xl">
                                        <TerminalSquare size={28} className="text-[#0E1116]" strokeWidth={2.5} />
                                    </div>
                                    <h1 className="text-3xl font-bold tracking-tight text-white">REMIX</h1>
                                </div>

                                <p className="text-slate-400 text-lg mb-6">
                                    Learn. Explore. <span className="text-blue-400 font-medium">Create.</span>
                                </p>

                                <div className="flex gap-1 mb-8">
                                    <IconButton Icon={Youtube} />
                                    <IconButton Icon={Twitter} />
                                    <IconButton Icon={Linkedin} />
                                    <IconButton Icon={Github} />
                                    <IconButton Icon={MessageSquare} />
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <button className="py-2.5 px-4 bg-transparent border border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 text-slate-300">
                                        <BookOpen size={16} className="text-slate-500" />
                                        Documentation
                                    </button>
                                    <button className="py-2.5 px-4 bg-transparent border border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 text-slate-300">
                                        <Globe size={16} className="text-slate-500" />
                                        Website
                                    </button>
                                </div>

                                <button className="w-full py-3.5 px-4 bg-[#45B2FF] hover:bg-[#3AA0E8] text-[#0A1929] rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                                    <Download size={18} strokeWidth={2.5} />
                                    Download Remix Desktop Windows v1.1.6
                                </button>

                                <div className="mt-4 text-center">
                                    <a href="#" className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4 transition-colors">
                                        Other versions and platforms
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Recent Workspaces */}
                        <div className="flex flex-col">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 px-1">
                                Recent Workspaces
                            </h2>
                            <div className="flex flex-col gap-1">
                                {RECENT_WORKSPACES.map((ws) => (
                                    <button
                                        key={ws.id}
                                        className="group flex items-center justify-between p-3 rounded-xl hover:bg-[#1A1D24] border border-transparent hover:border-slate-800 transition-all text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FolderOpen size={18} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{ws.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-slate-500">{ws.time}</span>
                                            <ChevronRight size={14} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity -ml-2" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Right Column (Feature Cards) */}
                    <div className="lg:col-span-7 xl:col-span-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full content-start">
                            {CARDS_DATA.map((card, idx) => (
                                <FeatureCard key={idx} {...card} />
                            ))}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
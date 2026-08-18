import React, { useState } from 'react';
import {
    Search,
    Filter,
    Upload,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    BarChart2
} from 'lucide-react';

export type Level = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Tutorial {
    id: string;
    level: Level;
    chapters: number;
    title: string;
    tags: string[];
    description: string;
}

const ALL_LEVELS: Level[] = ['Beginner', 'Intermediate', 'Advanced'];

const ALL_TAGS = [
    'Bitcoin', 'Clarity', 'Clarinet', 'Code Patterns', 'Contracts', 'DAO', 'DeFi',
    'Debugging', 'Governance', 'Interoperability', 'LSP', 'NFT', 'Oracle',
    'PoX', 'Security', 'SIP-009', 'SIP-010', 'Stacks', 'Testing', 'Tokens',
    'Transactions', 'Video', 'Wallets'
];

const TUTORIALS: Tutorial[] = [
    { id: '1', level: 'Beginner', chapters: 6, title: 'Basics of LabSTX', tags: ['LabSTX'], description: 'Set up a fresh Stacks project and learn the standard Clarity development workflow in LabSTX.' },
    { id: '2', level: 'Beginner', chapters: 1, title: 'A Video Intro to Clarity', tags: ['Clarity', 'Video'], description: 'Learn the core ideas behind Clarity contracts, state, and Stacks execution.' },
    { id: '3', level: 'Beginner', chapters: 15, title: 'Clarity Beginner Course', tags: ['Clarity'], description: 'Cover variables, functions, conditions, maps, tuples, and contract design in Clarity.' },
    { id: '4', level: 'Beginner', chapters: 6, title: 'SIP-010 Token Course', tags: ['Clarity', 'Tokens', 'SIP-010'], description: 'Build and test your own fungible token on Stacks using the SIP-010 standard.' },
    { id: '5', level: 'Beginner', chapters: 6, title: 'SIP-009 NFT Course', tags: ['Clarity', 'Tokens', 'SIP-009'], description: 'Create a Stacks NFT contract and understand token minting and transfer logic.' },
    { id: '6', level: 'Beginner', chapters: 7, title: 'Intro to Bitcoin Anchoring', tags: ['Bitcoin', 'Stacks', 'Security'], description: 'Understand how Stacks anchors to Bitcoin and why settlement security matters.' },
    { id: '7', level: 'Beginner', chapters: 10, title: 'Clarity Fundamentals by Stacks Academy', tags: ['Clarity'], description: 'Learn contract state, maps, functions, public calls, and error handling in Clarity.' },
    { id: '8', level: 'Beginner', chapters: 9, title: 'Clarinet Project Template', tags: ['Clarinet', 'Stacks'], description: 'Scaffold contracts, tests, and local scripts using a production-ready starter project.' },
    { id: '9', level: 'Beginner', chapters: 5, title: 'Multisig Wallet', tags: ['Clarity', 'Wallets', 'Security'], description: 'Build a simple multisig wallet pattern for Stacks transactions and authorization.' },
    { id: '10', level: 'Beginner', chapters: 1, title: 'Stacks Basics Videos', tags: ['Stacks', 'Video'], description: 'Learn the basics of accounts, wallets, transactions, and smart contracts on Stacks.' },
    { id: '11', level: 'Intermediate', chapters: 7, title: 'Cross-chain Patterns with Bitcoin', tags: ['Bitcoin', 'Stacks', 'Interoperability'], description: 'Understand how Stacks uses Bitcoin-backed security and interacts with the wider crypto ecosystem.' },
    { id: '12', level: 'Intermediate', chapters: 15, title: 'Advanced Clarity Concepts', tags: ['Clarity', 'Debugging', 'LSP'], description: 'Explore traits, errors, tuples, optional values, and safe contract-call patterns.' },
    { id: '13', level: 'Intermediate', chapters: 3, title: 'NFT Marketplace Contract', tags: ['Clarity', 'Tokens', 'SIP-009'], description: 'Design a basic marketplace for listing and purchasing NFTs on Stacks.' },
    { id: '14', level: 'Intermediate', chapters: 11, title: 'Stacks Token Standards Workshop', tags: ['Clarity', 'SIP-010', 'SIP-009', 'Tokens'], description: 'Build real-token patterns with fungible and non-fungible assets and transfer logic.' },
    { id: '15', level: 'Intermediate', chapters: 4, title: 'Clarinet Test Runner', tags: ['Clarinet', 'Testing'], description: 'Write and run contract tests to verify behavior before deployment.' },
    { id: '16', level: 'Intermediate', chapters: 5, title: 'Principal Validation Patterns', tags: ['Clarity', 'Security'], description: 'Learn how caller and contract identity checks must be handled carefully in Stacks apps.' },
    { id: '17', level: 'Intermediate', chapters: 5, title: 'Unchecked Contract Calls', tags: ['Clarity', 'Security', 'Debugging'], description: 'Understand the risks of calling contracts without validating results and handling failures safely.' },
    { id: '18', level: 'Intermediate', chapters: 1, title: 'Bad Randomness on Stacks', tags: ['Clarity', 'Security', 'Oracle'], description: 'Explore why predictable randomness is risky and how to use verifiable inputs safely.' },
    { id: '19', level: 'Intermediate', chapters: 4, title: 'Time-Based Logic', tags: ['Clarity', 'Security', 'Stacks'], description: 'Review how time-based assumptions and block behavior affect contract decisions.' },
    { id: '20', level: 'Intermediate', chapters: 5, title: 'Stacks Swap Course', tags: ['Clarity', 'Tokens', 'DeFi'], description: 'Study an AMM-style swap contract and learn how Stacks DeFi patterns work.' },
    { id: '21', level: 'Intermediate', chapters: 3, title: 'Denial of Service (DoS)', tags: ['Clarity', 'Security', 'Governance'], description: 'Learn how smart contracts can become unavailable and how to design resilient logic.' },
    { id: '22', level: 'Intermediate', chapters: 1, title: 'Reentrancy Risk', tags: ['Clarity', 'Security', 'Contracts'], description: 'Understand reentrancy and safe state update patterns when building contracts.' },
    { id: '23', level: 'Intermediate', chapters: 3, title: 'Bridge Design', tags: ['Clarity', 'Interoperability', 'Stacks'], description: 'Understand secure bridge and transfer patterns for moving value between systems.' },
    { id: '24', level: 'Intermediate', chapters: 2, title: 'Principal Validation', tags: ['Clarity', 'Security', 'Wallets'], description: 'Study common validation and authorization mistakes when working with Stacks principals.' },
    { id: '25', level: 'Intermediate', chapters: 1, title: 'Access Control Mistakes', tags: ['Clarity', 'Security', 'Governance'], description: 'Review authorization issues and safe patterns for admin-only functions.' },
    { id: '26', level: 'Intermediate', chapters: 2, title: 'Multi-call Patterns', tags: ['Clarity', 'Contracts', 'DeFi'], description: 'Aggregate multiple contract calls into a single transaction to reduce friction and improve UX.' },
    { id: '27', level: 'Intermediate', chapters: 9, title: 'Oracle Attack Patterns', tags: ['Clarity', 'Security', 'Oracle'], description: 'Study how price feeds and data sources can be manipulated and how to design safer inputs.' },
    { id: '28', level: 'Intermediate', chapters: 8, title: 'Flash Loan Mechanics', tags: ['Clarity', 'DeFi', 'Stacks'], description: 'Understand how flash-loan logic works in DeFi and how to model it safely in Clarity.' },
    { id: '29', level: 'Intermediate', chapters: 4, title: 'Oracle Manipulation', tags: ['Clarity', 'Security', 'Oracle'], description: 'Examine unsafe price assumptions and secure ways to integrate external data into Stacks contracts.' },
    { id: '30', level: 'Intermediate', chapters: 1, title: 'Centralization Risks', tags: ['Clarity', 'Security', 'Governance'], description: 'Learn the trade-offs of admin keys, governance contracts, and protocol centralization.' },
    { id: '31', level: 'Intermediate', chapters: 4, title: 'Honeypot Detection', tags: ['Clarity', 'Security', 'Tokens'], description: 'Recognize suspicious token logic and scam patterns in Stacks contract ecosystems.' },
    { id: '32', level: 'Intermediate', chapters: 1, title: 'Contract Existence Checks', tags: ['Clarity', 'Security', 'Stacks'], description: 'Understand how to validate whether an address is a contract without making unsafe assumptions.' },
    { id: '33', level: 'Intermediate', chapters: 3, title: 'Decentralized Exchange', tags: ['Clarity', 'DeFi', 'Tokens'], description: 'Build a basic AMM and swap workflow using Clarity smart contracts.' },
    { id: '34', level: 'Intermediate', chapters: 4, title: 'Transaction Ordering', tags: ['Clarity', 'Security', 'Stacks'], description: 'Understand why ordering and mempool behavior matter for dapp UX and protocol safety.' },
    { id: '35', level: 'Intermediate', chapters: 1, title: 'Arithmetic Safety', tags: ['Clarity', 'Security'], description: 'Review arithmetic safety and how Clarity reduces common overflow and underflow issues.' },
    { id: '36', level: 'Intermediate', chapters: 1, title: 'Signature Replay', tags: ['Clarity', 'Security', 'Stacks'], description: 'Learn how signatures and message validation must be designed to avoid replay risks.' },
    { id: '37', level: 'Advanced', chapters: 5, title: 'Deploy with Traits and Libraries', tags: ['Clarity', 'Clarinet', 'Code Patterns'], description: 'Write reusable contract logic and compose modules with safe deployment patterns.' },
    { id: '38', level: 'Advanced', chapters: 7, title: 'All about Modular Contracts', tags: ['Clarity', 'Code Patterns', 'Security'], description: 'Explore upgradeable and modular contract architectures in the Stacks ecosystem.' },
    { id: '39', level: 'Advanced', chapters: 8, title: 'Debugging with Clarity LSP', tags: ['Clarity', 'Debugging', 'LSP'], description: 'Use editor diagnostics and language tooling to inspect contract execution and fix issues.' },
    { id: '40', level: 'Advanced', chapters: 1, title: 'Advanced Stacks Topics', tags: ['Clarity', 'Stacks', 'Video'], description: 'Explore advanced Stacks development topics including wallets, authority patterns, and app design.' }
];

export const renderLearnSTX = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(true);
    const [selectedLevels, setSelectedLevels] = useState<Level[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isLevelOpen, setIsLevelOpen] = useState(true);
    const [isTagsOpen, setIsTagsOpen] = useState(true);

    const toggleLevel = (level: Level) => {
        setSelectedLevels((prev) =>
            prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
        );
    };

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const clearFilters = () => {
        setSelectedLevels([]);
        setSelectedTags([]);
        setSearchQuery('');
    };

    // Filtering logic runs directly on render instead of using useMemo
    const filteredTutorials = TUTORIALS.filter((tutorial) => {
        // Level filter
        if (selectedLevels.length > 0 && !selectedLevels.includes(tutorial.level)) {
            return false;
        }
        // Tag filter
        if (
            selectedTags.length > 0 &&
            !selectedTags.some((tag) => tutorial.tags.includes(tag))
        ) {
            return false;
        }
        // Search query filter
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const matchesTitle = tutorial.title.toLowerCase().includes(query);
            const matchesDesc = tutorial.description.toLowerCase().includes(query);
            const matchesTag = tutorial.tags.some((t) =>
                t.toLowerCase().includes(query)
            );
            return matchesTitle || matchesDesc || matchesTag;
        }
        return true;
    });

    return (
        <div className="h-full flex flex-col bg-caspier-dark text-caspier-text overflow-hidden">
            <div className="flex items-center justify-between px-3 py-3 border-b border-caspier-border bg-caspier-black/40">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-caspier-muted">
                    <span className="text-caspier-text">LearnSTX</span>
                </div>
                <button
                    className="p-1 text-caspier-muted hover:text-labstx-orange transition-colors"
                    title="Open External"
                    type="button"
                >
                    <ExternalLink size={14} />
                </button>
            </div>

            <div className="px-3 py-3 border-b border-caspier-border bg-caspier-black/30">
                <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-labstx-orange/10 hover:bg-labstx-orange text-labstx-orange hover:text-white border border-labstx-orange rounded-full transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-sm"
                >
                    <Upload size={14} />
                    <span>Import tutorial repo</span>
                </button>
            </div>

            <div className="p-3 border-b border-caspier-border bg-caspier-black/20">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-caspier-muted" size={14} />
                        <input
                            type="text"
                            placeholder="Search tutorials..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-caspier-dark border border-caspier-border text-caspier-text text-[11px] font-medium px-2.5 py-1.5 pl-8 focus:border-labstx-orange outline-none rounded transition-colors placeholder:text-caspier-muted"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                            showFilters
                                ? 'border-labstx-orange bg-labstx-orange/10 text-labstx-orange'
                                : 'border-caspier-border bg-caspier-dark text-caspier-muted hover:border-caspier-muted hover:text-caspier-text'
                        }`}
                    >
                        <Filter size={12} />
                        <span>Filters</span>
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="px-3 py-3 border-b border-caspier-border bg-caspier-black/30">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-caspier-muted">Filters</span>
                        {(selectedLevels.length > 0 || selectedTags.length > 0 || searchQuery) && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="text-[10px] font-bold text-labstx-orange hover:underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="rounded-xl border border-caspier-border bg-caspier-dark/50 p-2.5 space-y-2.5">
                        <div className="border-b border-caspier-border/60 pb-2">
                            <button
                                type="button"
                                onClick={() => setIsLevelOpen(!isLevelOpen)}
                                className="w-full flex items-center justify-between py-1 text-[10px] font-black uppercase tracking-[0.2em] text-caspier-muted hover:text-caspier-text transition-colors"
                            >
                                <span>Level</span>
                                {isLevelOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>

                            {isLevelOpen && (
                                <div className="mt-2 space-y-2">
                                    {ALL_LEVELS.map((level) => (
                                        <label
                                            key={level}
                                            className="flex items-center gap-2.5 text-[11px] text-caspier-muted cursor-pointer hover:text-caspier-text transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedLevels.includes(level)}
                                                onChange={() => toggleLevel(level)}
                                                className="rounded bg-caspier-black border-caspier-border text-labstx-orange focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                                            />
                                            <span>{level}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-0.5">
                            <button
                                type="button"
                                onClick={() => setIsTagsOpen(!isTagsOpen)}
                                className="w-full flex items-center justify-between py-1 text-[10px] font-black uppercase tracking-[0.2em] text-caspier-muted hover:text-caspier-text transition-colors"
                            >
                                <span>Tags</span>
                                {isTagsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>

                            {isTagsOpen && (
                                <div className="mt-2 space-y-2 max-h-52 overflow-y-auto pr-1">
                                    {ALL_TAGS.map((tag) => (
                                        <label
                                            key={tag}
                                            className="flex items-center gap-2.5 text-[11px] text-caspier-muted cursor-pointer hover:text-caspier-text transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedTags.includes(tag)}
                                                onChange={() => toggleTag(tag)}
                                                className="rounded bg-caspier-black border-caspier-border text-labstx-orange focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                                            />
                                            <span>{tag}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-caspier-dark/30">
                {filteredTutorials.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-caspier-muted">
                        No tutorials found matching your filters.
                    </div>
                ) : (
                    filteredTutorials.map((tutorial) => (
                        <div
                            key={tutorial.id}
                            className="rounded border border-caspier-border bg-caspier-black/40 p-3 transition-all hover:border-labstx-orange/40 hover:bg-labstx-orange/[0.03]"
                        >
                            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-caspier-muted mb-2.5">
                                <div className="flex items-center gap-1.5 text-caspier-text">
                                    <BarChart2 size={12} className="text-labstx-orange" />
                                    <span>{tutorial.level}</span>
                                </div>
                                <span>
                                    {tutorial.chapters} {tutorial.chapters === 1 ? 'chapter' : 'chapters'}
                                </span>
                            </div>

                            <h2 className="text-[12px] font-bold text-caspier-text mb-2 leading-tight">
                                {tutorial.title}
                            </h2>

                            {tutorial.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                    {tutorial.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="text-[9px] font-medium text-caspier-muted bg-caspier-dark border border-caspier-border px-1.5 py-0.5 rounded"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <p className="text-[10px] leading-relaxed text-caspier-muted">
                                {tutorial.description}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
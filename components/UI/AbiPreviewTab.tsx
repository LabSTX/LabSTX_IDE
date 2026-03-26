import React, { useMemo, useState } from 'react';
import { CopyIcon, SearchIcon, DownloadIcon, ChevronDownIcon, ChevronRightIcon, EyeIcon } from './Icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AbiArg {
    name: string;
    type: string;
}

interface AbiFunction {
    name: string;
    access: 'public' | 'read-only' | 'private';
    args: AbiArg[];
    outputs: string;
}

interface AbiDataVar {
    name: string;
    type: string;
    access: 'variable';
}

interface AbiMap {
    name: string;
    key: string;
    value: string;
}

interface AbiEvent {
    line: number;
    topic?: string;
    raw: string;
}

interface ParsedAbi {
    contractName: string;
    functions: AbiFunction[];
    datavars: AbiDataVar[];
    maps: AbiMap[];
    events: AbiEvent[];
    nfts: string[];
    fts: string[];
    traits: string[];
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseClarityAbi(code: string, fileName: string): ParsedAbi {
    const contractName = fileName.replace(/\.clar$/i, '');
    const functions: AbiFunction[] = [];
    const datavars: AbiDataVar[] = [];
    const maps: AbiMap[] = [];
    const events: AbiEvent[] = [];
    const nfts: string[] = [];
    const fts: string[] = [];
    const traits: string[] = [];

    const lines = code.split('\n');

    // A helper that reads a balanced parenthesis block starting at a position
    const readBalanced = (src: string, start: number): string => {
        let depth = 0;
        let i = start;
        let result = '';
        while (i < src.length) {
            const ch = src[i];
            if (ch === '(') depth++;
            if (ch === ')') {
                depth--;
                result += ch;
                i++;
                if (depth === 0) break;
            } else {
                result += ch;
                i++;
            }
        }
        return result;
    };

    // Extract top-level s-expressions
    const extractTopLevel = (src: string): string[] => {
        const exprs: string[] = [];
        let i = 0;
        while (i < src.length) {
            if (src[i] === '(') {
                const block = readBalanced(src, i);
                exprs.push(block);
                i += block.length;
            } else {
                i++;
            }
        }
        return exprs;
    };

    // Normalise whitespace for regex matching
    const normalised = code.replace(/;;[^\n]*/g, '').replace(/\s+/g, ' ');

    // ── Functions ──
    const fnRegex = /\(define-(public|read-only|private)\s+\(([^\s)]+)([^)]*)\)([^)]*)\)/g;
    let m: RegExpExecArray | null;

    // Better approach: multi-line function extractor
    const funcPatterns = [
        { access: 'public' as const, re: /\(define-public\s+\(/ },
        { access: 'read-only' as const, re: /\(define-read-only\s+\(/ },
        { access: 'private' as const, re: /\(define-private\s+\(/ },
    ];

    for (const { access, re } of funcPatterns) {
        let fidx = 0;
        while (true) {
            const match = normalised.slice(fidx).match(re);
            if (!match) break;
            const start = fidx + (match.index ?? 0);
            const block = readBalanced(normalised, start);
            fidx = start + block.length;

            // Parse name & args from first S-expr inside block
            const inner = block.slice(1, -1).trim(); // remove outer parens
            // After define-X we have (name arg1 arg2 ...)
            const sigMatch = inner.match(/define-(?:public|read-only|private)\s+\(([^\s)]+)((?:\s+\([^\)]+\))*)\s*\)/);
            if (!sigMatch) continue;

            const name = sigMatch[1];
            const argsRaw = sigMatch[2].trim();

            const args: AbiArg[] = [];
            const argRe = /\(([^\s)]+)\s+([^)]+)\)/g;
            let am: RegExpExecArray | null;
            while ((am = argRe.exec(argsRaw)) !== null) {
                args.push({ name: am[1], type: am[2].trim() });
            }

            // Output type: look for (ok ...) or (err ...) pattern or trailing type
            const outputMatch = inner.match(/\(ok\s+([^)]+)\)/) || inner.match(/response\s+([^\s)]+)/);
            const outputs = access === 'read-only' ? 'any' : 'response';

            functions.push({ name, access, args, outputs });
        }
    }

    // ── Data vars ──
    const dvarRe = /\(define-data-var\s+([^\s]+)\s+([^\s]+)/g;
    while ((m = dvarRe.exec(normalised)) !== null) {
        datavars.push({ name: m[1], type: m[2], access: 'variable' });
    }

    // ── Maps ──
    const mapRe = /\(define-map\s+([^\s]+)\s+([^\s{]+)/g;
    while ((m = mapRe.exec(normalised)) !== null) {
        const name = m[1];
        // Try to grab key/value types
        const rest = normalised.slice((m.index ?? 0) + m[0].length);
        const keyBlock = readBalanced(rest + ')', 0);
        const afterKey = rest.slice(keyBlock.length).trim();
        const valBlock = readBalanced(afterKey + ')', 0);
        maps.push({ name, key: keyBlock.replace(/[()]/g, '').trim() || 'any', value: valBlock.replace(/[()]/g, '').trim() || 'any' });
    }

    // ── Events / prints ──
    lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith(';;')) return;
        const printMatch = trimmed.match(/\(print\s+(.+)\)/);
        if (printMatch) {
            events.push({ line: idx + 1, raw: printMatch[1].trim() });
        }
    });

    // ── NFTs ──
    const nftRe = /\(define-non-fungible-token\s+([^\s]+)/g;
    while ((m = nftRe.exec(normalised)) !== null) nfts.push(m[1]);

    // ── FTs ──
    const ftRe = /\(define-fungible-token\s+([^\s]+)/g;
    while ((m = ftRe.exec(normalised)) !== null) fts.push(m[1]);

    // ── Traits ──
    const traitRe = /\(use-trait\s+([^\s]+)\s+([^\s)]+)/g;
    while ((m = traitRe.exec(normalised)) !== null) traits.push(`${m[1]} → ${m[2]}`);

    const implRe = /\(impl-trait\s+([^\s)]+)/g;
    while ((m = implRe.exec(normalised)) !== null) traits.push(`impl: ${m[1]}`);

    return { contractName, functions, datavars, maps, events, nfts, fts, traits };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${color}`}>
        {label}
    </span>
);

const accessBadge = (access: AbiFunction['access']) => {
    switch (access) {
        case 'public': return <Badge label="public" color="bg-labstx-orange/15 text-labstx-orange border border-caspier-border" />;
        case 'read-only': return <Badge label="read-only" color="bg-blue-500/15 text-blue-400 border border-blue-500/30" />;
        case 'private': return <Badge label="private" color="bg-caspier-muted/15 text-caspier-muted border border-caspier-muted/30" />;
    }
};

interface SectionProps {
    title: string;
    count: number;
    color: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, count, color, icon, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="mb-6">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-caspier-hover transition-colors group mb-1"
            >
                <span className={`text-sm ${color}`}>{icon}</span>
                <span className="font-bold text-sm text-caspier-text flex-1 text-left">{title}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color} bg-current/10`} style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {count}
                </span>
                {open
                    ? <ChevronDownIcon className="w-3.5 h-3.5 text-caspier-muted" />
                    : <ChevronRightIcon className="w-3.5 h-3.5 text-caspier-muted" />
                }
            </button>
            {open && <div className="space-y-2 pl-2">{children}</div>}
        </div>
    );
};

const FunctionCard: React.FC<{ fn: AbiFunction; onCopy: (text: string) => void }> = ({ fn, onCopy }) => {
    const [open, setOpen] = useState(false);

    const signature = `(${fn.name}${fn.args.map(a => ` (${a.name} ${a.type})`).join('')})`;

    return (
        <div className="rounded-lg border border-caspier-border bg-caspier-black/50 overflow-hidden transition-all hover:border-caspier-muted/50">
            <div
                role="button"
                tabIndex={0}
                onClick={() => setOpen(o => !o)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpen(o => !o);
                    }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-caspier-hover/30 transition-colors cursor-pointer group"
            >
                {open
                    ? <ChevronDownIcon className="w-3 h-3 text-caspier-muted flex-shrink-0" />
                    : <ChevronRightIcon className="w-3 h-3 text-caspier-muted flex-shrink-0" />
                }
                <span className="font-mono text-sm text-caspier-text font-semibold flex-1 truncate">{fn.name}</span>
                {accessBadge(fn.access)}
                <span className="text-[10px] text-caspier-muted ml-2">{fn.args.length} param{fn.args.length !== 1 ? 's' : ''}</span>
                <button
                    onClick={e => { e.stopPropagation(); onCopy(signature); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-labstx-orange text-caspier-muted transition-all ml-1"
                    title="Copy signature"
                >
                    <CopyIcon className="w-3 h-3" />
                </button>
            </div>

            {open && (
                <div className="px-4 pb-4 pt-1 border-t border-caspier-border bg-caspier-dark/30 space-y-3">
                    {/* Signature */}
                    <div>
                        <div className="text-[10px] text-caspier-muted uppercase tracking-widest mb-1 font-bold">Signature</div>
                        <div className="font-mono text-xs bg-caspier-black rounded-md px-3 py-2 text-labstx-orange/90 border border-caspier-border flex items-center justify-between gap-2">
                            <span className="flex-1 truncate">{signature}</span>
                            <button onClick={() => onCopy(signature)} className="text-caspier-muted hover:text-labstx-orange transition-colors flex-shrink-0">
                                <CopyIcon className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Parameters */}
                    {fn.args.length > 0 && (
                        <div>
                            <div className="text-[10px] text-caspier-muted uppercase tracking-widest mb-2 font-bold">Parameters</div>
                            <div className="space-y-1.5">
                                {fn.args.map((arg, i) => (
                                    <div key={i} className="flex items-center gap-3 text-xs font-mono bg-caspier-black/50 rounded px-3 py-1.5 border border-caspier-border">
                                        <span className="text-blue-300 font-semibold flex-shrink-0">{arg.name}</span>
                                        <span className="text-caspier-muted">:</span>
                                        <span className="text-green-300">{arg.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {fn.args.length === 0 && (
                        <div className="text-[11px] text-caspier-muted italic">No parameters</div>
                    )}

                    {/* Returns */}
                    <div>
                        <div className="text-[10px] text-caspier-muted uppercase tracking-widest mb-1 font-bold">Returns</div>
                        <div className="inline-flex items-center px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono">
                            {fn.access === 'public' ? 'response<ok, err>' : fn.outputs}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const FnIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 inline-block">
        <path d="M2 4h3l2 8h3" /><path d="M6 8h4" /><path d="M11 4l2 4-2 4" />
    </svg>
);
const DbIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 inline-block">
        <ellipse cx="8" cy="4" rx="5" ry="2" /><path d="M3 4v8c0 1.1 2.24 2 5 2s5-.9 5-2V4" /><path d="M3 8c0 1.1 2.24 2 5 2s5-.9 5-2" />
    </svg>
);
const MapIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 inline-block">
        <rect x="1" y="3" width="14" height="10" rx="1.5" /><path d="M5 3v10M11 3v10M1 8h14" />
    </svg>
);
const EventIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 inline-block">
        <path d="M8 2L2 8l6 6 6-6-6-6z" /><path d="M8 5v3M8 10v1" />
    </svg>
);
const TokenIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 inline-block">
        <circle cx="8" cy="8" r="6" /><path d="M8 4v8M5.5 6h4a1.5 1.5 0 0 1 0 3h-4a1.5 1.5 0 0 1 0 3h5" />
    </svg>
);
const TraitIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 inline-block">
        <path d="M2 4h12M2 8h8M2 12h5" /><polyline points="12 6 14 8 12 10" />
    </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

interface AbiPreviewTabProps {
    code: string;
    fileName: string;
    theme: 'dark' | 'light';
}

const AbiPreviewTab: React.FC<AbiPreviewTabProps> = ({ code, fileName, theme }) => {
    const [search, setSearch] = useState('');
    const [copied, setCopied] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<'all' | 'public' | 'read-only' | 'private'>('all');

    const abi = useMemo(() => parseClarityAbi(code, fileName), [code, fileName]);

    const copyText = (text: string) => {
        navigator.clipboard.writeText(text).catch(() => { });
        setCopied(text);
        setTimeout(() => setCopied(null), 2000);
    };

    const downloadAbi = () => {
        const abiJson = {
            contractName: abi.contractName,
            functions: abi.functions.map(fn => ({
                name: fn.name,
                access: fn.access,
                args: fn.args,
                outputs: { type: fn.access === 'public' ? 'response' : fn.outputs }
            })),
            'data-vars': abi.datavars.map(v => ({ name: v.name, type: v.type, access: v.access })),
            'maps': abi.maps.map(m => ({ name: m.name, key: { type: m.key }, value: { type: m.value } })),
            'non-fungible-tokens': abi.nfts.map(n => ({ name: n })),
            'fungible-tokens': abi.fts.map(f => ({ name: f })),
        };
        const blob = new Blob([JSON.stringify(abiJson, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${abi.contractName}.abi.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const searchLower = search.toLowerCase();

    const filteredFunctions = abi.functions.filter(fn => {
        const matchesSearch = !search || fn.name.toLowerCase().includes(searchLower) || fn.args.some(a => a.name.toLowerCase().includes(searchLower));
        const matchesFilter = activeFilter === 'all' || fn.access === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const publicFns = filteredFunctions.filter(f => f.access === 'public');
    const readOnlyFns = filteredFunctions.filter(f => f.access === 'read-only');
    const privateFns = filteredFunctions.filter(f => f.access === 'private');

    const filteredVars = abi.datavars.filter(v => !search || v.name.toLowerCase().includes(searchLower));
    const filteredMaps = abi.maps.filter(m => !search || m.name.toLowerCase().includes(searchLower));
    const filteredEvts = abi.events.filter(e => !search || e.raw.toLowerCase().includes(searchLower));

    const isEmpty = !code || code.trim().length === 0;
    const isClar = fileName.endsWith('.clar') || fileName.endsWith('.clarity');

    return (
        <div className={`h-full flex flex-col overflow-hidden select-none ${theme === 'light' ? 'bg-[#f5f5f5] text-gray-900' : 'bg-caspier-dark text-caspier-text'}`}>

            {/* ── Header ── */}
            <div className={`flex-shrink-0 px-6 py-4 border-b ${theme === 'light' ? 'border-gray-200 bg-white' : 'border-caspier-border bg-caspier-black/60'}`}>
                <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-labstx-orange/15 border border-caspier-border flex items-center justify-center">
                            <EyeIcon className="w-4 h-4 text-labstx-orange" />
                        </div>
                        <div>
                            <h1 className="font-black text-base tracking-tight">ABI Preview</h1>
                            <p className="text-[11px] text-caspier-muted font-mono">{abi.contractName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {copied && (
                            <span className="text-[11px] text-green-400 font-semibold animate-in fade-in slide-in-from-right-2 duration-200">
                                Copied!
                            </span>
                        )}
                        <button
                            onClick={() => copyText(JSON.stringify({
                                contractName: abi.contractName,
                                functions: abi.functions,
                                variables: abi.datavars,
                                maps: abi.maps,
                            }, null, 2))}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-caspier-border hover:border-labstx-orange hover:text-labstx-orange text-caspier-muted transition-all"
                            title="Copy ABI as JSON"
                        >
                            <CopyIcon className="w-3.5 h-3.5" />
                            Copy JSON
                        </button>
                        <button
                            onClick={downloadAbi}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-labstx-orange/10 border border-caspier-border text-labstx-orange hover:bg-labstx-orange/20 transition-all"
                            title="Download ABI JSON"
                        >
                            <DownloadIcon className="w-3.5 h-3.5" />
                            Export
                        </button>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="flex gap-4 text-[11px] text-caspier-muted mb-3">
                    <span><span className="text-labstx-orange font-bold">{abi.functions.filter(f => f.access === 'public').length}</span> public</span>
                    <span><span className="text-blue-400 font-bold">{abi.functions.filter(f => f.access === 'read-only').length}</span> read-only</span>
                    <span><span className="text-caspier-muted font-bold">{abi.functions.filter(f => f.access === 'private').length}</span> private</span>
                    <span className="text-caspier-border">│</span>
                    <span><span className="text-yellow-400 font-bold">{abi.datavars.length}</span> vars</span>
                    <span><span className="text-cyan-400 font-bold">{abi.maps.length}</span> maps</span>
                    {abi.events.length > 0 && <span><span className="text-pink-400 font-bold">{abi.events.length}</span> events</span>}
                    {abi.nfts.length > 0 && <span><span className="text-purple-400 font-bold">{abi.nfts.length}</span> NFT</span>}
                    {abi.fts.length > 0 && <span><span className="text-green-400 font-bold">{abi.fts.length}</span> FT</span>}
                </div>

                {/* Search + Filter */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-caspier-muted pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Filter functions, variables, maps..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border outline-none focus:border-labstx-orange transition-colors font-mono
                                ${theme === 'light'
                                    ? 'bg-white border-gray-200 text-gray-700 placeholder-gray-400'
                                    : 'bg-caspier-black border-caspier-border text-caspier-text placeholder-caspier-muted/50'
                                }`}
                        />
                    </div>
                    <div className="flex gap-1">
                        {(['all', 'public', 'read-only', 'private'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-wider
                                    ${activeFilter === f
                                        ? 'bg-labstx-orange text-caspier-black border-labstx-orange'
                                        : 'border-caspier-border text-caspier-muted hover:border-caspier-border hover:text-caspier-text'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">

                {isEmpty && (
                    <div className="flex flex-col items-center justify-center h-48 text-caspier-muted text-sm gap-3">
                        <EyeIcon className="w-10 h-10 opacity-20" />
                        <p className="text-center">
                            {!isClar
                                ? 'ABI Preview is only available for Clarity (.clar) contracts.'
                                : 'This file is empty. Write a Clarity contract to see its ABI.'}
                        </p>
                    </div>
                )}

                {!isEmpty && (
                    <>
                        {/* Public Functions */}
                        {(activeFilter === 'all' || activeFilter === 'public') && publicFns.length > 0 && (
                            <Section
                                title="Public Functions"
                                count={publicFns.length}
                                color="text-labstx-orange"
                                icon={<FnIcon />}
                                defaultOpen={true}
                            >
                                {publicFns.map((fn, i) => (
                                    <FunctionCard key={i} fn={fn} onCopy={copyText} />
                                ))}
                            </Section>
                        )}

                        {/* Read-Only Functions */}
                        {(activeFilter === 'all' || activeFilter === 'read-only') && readOnlyFns.length > 0 && (
                            <Section
                                title="Read-Only Functions"
                                count={readOnlyFns.length}
                                color="text-blue-400"
                                icon={<FnIcon />}
                                defaultOpen={true}
                            >
                                {readOnlyFns.map((fn, i) => (
                                    <FunctionCard key={i} fn={fn} onCopy={copyText} />
                                ))}
                            </Section>
                        )}

                        {/* Private Functions */}
                        {(activeFilter === 'all' || activeFilter === 'private') && privateFns.length > 0 && (
                            <Section
                                title="Private Functions"
                                count={privateFns.length}
                                color="text-caspier-muted"
                                icon={<FnIcon />}
                                defaultOpen={false}
                            >
                                {privateFns.map((fn, i) => (
                                    <FunctionCard key={i} fn={fn} onCopy={copyText} />
                                ))}
                            </Section>
                        )}

                        {/* Data Variables */}
                        {activeFilter === 'all' && filteredVars.length > 0 && (
                            <Section
                                title="Data Variables"
                                count={filteredVars.length}
                                color="text-yellow-400"
                                icon={<DbIcon />}
                                defaultOpen={true}
                            >
                                {filteredVars.map((v, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-caspier-border bg-caspier-black/40 font-mono text-xs hover:border-yellow-400/30 transition-colors">
                                        <span className="text-yellow-300 font-semibold">{v.name}</span>
                                        <span className="text-caspier-muted">:</span>
                                        <span className="text-green-300">{v.type}</span>
                                        <Badge label="var" color="text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 ml-auto" />
                                    </div>
                                ))}
                            </Section>
                        )}

                        {/* Maps */}
                        {activeFilter === 'all' && filteredMaps.length > 0 && (
                            <Section
                                title="Maps"
                                count={filteredMaps.length}
                                color="text-cyan-400"
                                icon={<MapIcon />}
                                defaultOpen={true}
                            >
                                {filteredMaps.map((map, i) => (
                                    <div key={i} className="px-4 py-2.5 rounded-lg border border-caspier-border bg-caspier-black/40 font-mono text-xs hover:border-cyan-400/30 transition-colors">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-cyan-300 font-semibold">{map.name}</span>
                                            <Badge label="map" color="text-cyan-400 bg-cyan-400/10 border border-cyan-400/20" />
                                        </div>
                                        <div className="flex gap-4 text-[11px]">
                                            <span><span className="text-caspier-muted">key:</span> <span className="text-green-300">{map.key || 'any'}</span></span>
                                            <span><span className="text-caspier-muted">value:</span> <span className="text-purple-300">{map.value || 'any'}</span></span>
                                        </div>
                                    </div>
                                ))}
                            </Section>
                        )}

                        {/* NFTs */}
                        {activeFilter === 'all' && abi.nfts.length > 0 && (
                            <Section title="Non-Fungible Tokens" count={abi.nfts.length} color="text-purple-400" icon={<TokenIcon />} defaultOpen>
                                {abi.nfts.map((n, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-caspier-border bg-caspier-black/40 font-mono text-xs">
                                        <span className="text-purple-300 font-semibold">{n}</span>
                                        <Badge label="NFT" color="text-purple-400 bg-purple-400/10 border border-purple-400/20 ml-auto" />
                                    </div>
                                ))}
                            </Section>
                        )}

                        {/* FTs */}
                        {activeFilter === 'all' && abi.fts.length > 0 && (
                            <Section title="Fungible Tokens" count={abi.fts.length} color="text-green-400" icon={<TokenIcon />} defaultOpen>
                                {abi.fts.map((f, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-caspier-border bg-caspier-black/40 font-mono text-xs">
                                        <span className="text-green-300 font-semibold">{f}</span>
                                        <Badge label="FT" color="text-green-400 bg-green-400/10 border border-green-400/20 ml-auto" />
                                    </div>
                                ))}
                            </Section>
                        )}

                        {/* Traits */}
                        {activeFilter === 'all' && abi.traits.length > 0 && (
                            <Section title="Traits" count={abi.traits.length} color="text-pink-400" icon={<TraitIcon />} defaultOpen>
                                {abi.traits.map((t, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-caspier-border bg-caspier-black/40 font-mono text-xs">
                                        <span className="text-pink-300 font-semibold">{t}</span>
                                    </div>
                                ))}
                            </Section>
                        )}

                        {/* Events */}
                        {activeFilter === 'all' && filteredEvts.length > 0 && (
                            <Section title="Events (print calls)" count={filteredEvts.length} color="text-pink-400" icon={<EventIcon />} defaultOpen={false}>
                                {filteredEvts.map((ev, i) => (
                                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 rounded-lg border border-caspier-border bg-caspier-black/40 font-mono text-xs hover:border-pink-400/30 transition-colors">
                                        <span className="text-caspier-muted text-[10px] pt-0.5 flex-shrink-0">:{ev.line}</span>
                                        <span className="text-pink-300 break-all">{ev.raw}</span>
                                    </div>
                                ))}
                            </Section>
                        )}

                        {/* No results */}
                        {search && filteredFunctions.length === 0 && filteredVars.length === 0 && filteredMaps.length === 0 && filteredEvts.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-32 text-caspier-muted text-sm gap-2">
                                <SearchIcon className="w-6 h-6 opacity-30" />
                                <p>No results for "<span className="text-caspier-text">{search}</span>"</p>
                            </div>
                        )}

                        {/* Empty contract (parsed but no definitions) */}
                        {!search && abi.functions.length === 0 && abi.datavars.length === 0 && abi.maps.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-48 text-caspier-muted text-sm gap-3 py-8">
                                <EyeIcon className="w-10 h-10 opacity-20" />
                                <p className="text-center text-xs max-w-xs">
                                    No public functions, read-only functions, data variables, or maps found.
                                    <br />
                                    Add Clarity definitions like <code className="font-mono text-labstx-orange/70">define-public</code> or <code className="font-mono text-blue-400/70">define-read-only</code>.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AbiPreviewTab;

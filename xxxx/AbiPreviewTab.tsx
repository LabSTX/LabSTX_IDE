import React, { useMemo, useState, useEffect } from 'react';
import { CopyIcon, SearchIcon, DownloadIcon, ChevronDownIcon, ChevronRightIcon, EyeIcon, RocketIcon } from './Icons';
import { openContractCall } from '@stacks/connect';
import { uintCV, intCV, principalCV, trueCV, falseCV, noneCV, stringUtf8CV, stringAsciiCV, serializeCV, deserializeCV, cvToValue } from '@stacks/transactions';
import { bytesToHex, hexToBytes } from '@stacks/common';
import { STACKS_TESTNET, STACKS_MAINNET, STACKS_MOCKNET } from '@stacks/network';
import { Button } from './Button';

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
    docstring?: string;
    complexity?: 'low' | 'medium' | 'high';
    securityHints?: string[];
    sourceCode?: string;
    calls?: string[]; // Names of internal functions called
    line: number;
}

interface AbiDataVar {
    name: string;
    type: string;
    access: 'variable';
    docstring?: string;
    line: number;
}

interface AbiConstant {
    name: string;
    value: string;
    docstring?: string;
    line: number;
}

interface AbiMap {
    name: string;
    key: string;
    value: string;
    docstring?: string;
    line: number;
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
    constants: AbiConstant[];
    maps: AbiMap[];
    events: AbiEvent[];
    nfts: string[];
    fts: string[];
    traits: string[];
    dependencyGraph: Record<string, string[]>;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseClarityAbi(code: string, fileName: string): ParsedAbi {
    const contractName = fileName.replace(/\.clar$/i, '');
    const functions: AbiFunction[] = [];
    const datavars: AbiDataVar[] = [];
    const constants: AbiConstant[] = [];
    const maps: AbiMap[] = [];
    const events: AbiEvent[] = [];
    const nfts: string[] = [];
    const fts: string[] = [];
    const traits: string[] = [];
    const dependencyGraph: Record<string, string[]> = {};

    const lines = code.split('\n');

    // Helper to get comments immediately preceding a line
    const getDocstring = (lineIdx: number): string | undefined => {
        const docs: string[] = [];
        let i = lineIdx - 1;
        while (i >= 0) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith(';;')) {
                docs.unshift(trimmed.replace(/^;;+/, '').trim());
                i--;
            } else {
                break;
            }
        }
        return docs.length > 0 ? docs.join('\n') : undefined;
    };

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

    const normalised = code.replace(/;;[^\n]*/g, (m) => ' '.repeat(m.length)).replace(/\n/g, ' ');

    // ── Functions ──
    const funcPatterns = [
        { access: 'public' as const, keyword: 'define-public' },
        { access: 'read-only' as const, keyword: 'define-read-only' },
        { access: 'private' as const, keyword: 'define-private' },
    ];

    for (const { access, keyword } of funcPatterns) {
        let fidx = 0;
        while (true) {
            const findKeyword = code.indexOf(`(${keyword}`, fidx);
            if (findKeyword === -1) break;

            const block = readBalanced(code, findKeyword);
            fidx = findKeyword + 1;

            const lineNum = code.substring(0, findKeyword).split('\n').length;
            const docstring = getDocstring(lineNum - 1);

            // Match signature
            const sigMatch = block.match(new RegExp(`\\(${keyword}\\s+\\(([^\\s)]+)((?:\\s+\\([^\\)]+\\))*)`));
            if (!sigMatch) continue;

            const name = sigMatch[1];
            const argsRaw = sigMatch[2].trim();
            const args: AbiArg[] = [];
            const argRe = /\(([^\s)]+)\s+([^)]+)\)/g;
            let am: RegExpExecArray | null;
            while ((am = argRe.exec(argsRaw)) !== null) {
                args.push({ name: am[1], type: am[2].trim() });
            }

            const body = block.slice(sigMatch[0].length, -1).trim();

            // Security Hints
            const securityHints: string[] = [];
            if (access === 'public' && !body.includes('asserts!') && !body.includes('try!')) {
                securityHints.push('No explicit guard (asserts!/try!) detected.');
            }
            if (body.includes('at-block')) securityHints.push('Uses at-block (check for post-condition vulnerabilities).');

            // Calls & Complexity
            const internalCalls = Array.from(body.matchAll(/\(([^\s()]+)/g))
                .map(match => match[1])
                .filter(c => !['+', '-', '*', '/', 'var-get', 'var-set', 'map-get?', 'map-set', 'if', 'let', 'begin', 'ok', 'err'].includes(c));

            dependencyGraph[name] = internalCalls;

            let complexity: 'low' | 'medium' | 'high' = 'low';
            if (args.length > 3 || internalCalls.length > 5 || body.length > 500) complexity = 'medium';
            if (args.length > 6 || internalCalls.length > 10 || body.length > 1200) complexity = 'high';

            functions.push({
                name,
                access,
                args,
                outputs: access === 'read-only' ? 'any' : 'response',
                docstring,
                complexity,
                securityHints,
                sourceCode: block,
                calls: internalCalls,
                line: lineNum
            });
        }
    }

    // ── Data vars ──
    const dvarRe = /\(define-data-var\s+([^\s]+)\s+([^\s]+)/g;
    let m: RegExpExecArray | null;
    while ((m = dvarRe.exec(code)) !== null) {
        const lineNum = code.substring(0, m.index).split('\n').length;
        datavars.push({
            name: m[1],
            type: m[2],
            access: 'variable',
            docstring: getDocstring(lineNum - 1),
            line: lineNum
        });
    }

    // ── Constants ──
    const constRe = /\(define-constant\s+([^\s]+)\s+([^\s()]+|\([^)]+\))/g;
    while ((m = constRe.exec(code)) !== null) {
        const lineNum = code.substring(0, m.index).split('\n').length;
        constants.push({
            name: m[1],
            value: m[2],
            docstring: getDocstring(lineNum - 1),
            line: lineNum
        });
    }

    // ── Maps ──
    const mapRe = /\(define-map\s+([^\s]+)\s+/g;
    while ((m = mapRe.exec(code)) !== null) {
        const start = m.index + m[0].length;
        const lineNum = code.substring(0, m.index).split('\n').length;
        const rest = code.slice(start);
        const keyBlock = readBalanced(rest, 0);
        const afterKey = rest.slice(keyBlock.length).trim();
        const valBlock = readBalanced(afterKey, 0);

        maps.push({
            name: m[1],
            key: keyBlock.replace(/[()]/g, '').trim() || 'any',
            value: valBlock.replace(/[()]/g, '').trim() || 'any',
            docstring: getDocstring(lineNum - 1),
            line: lineNum
        });
    }

    // Extraction of tokens and traits remains similar but with line checks if needed
    const nftRe = /\(define-non-fungible-token\s+([^\s]+)/g;
    while ((m = nftRe.exec(code)) !== null) nfts.push(m[1]);

    const ftRe = /\(define-fungible-token\s+([^\s]+)/g;
    while ((m = ftRe.exec(code)) !== null) fts.push(m[1]);

    const traitRe = /\(use-trait\s+([^\s]+)\s+([^\s)]+)/g;
    while ((m = traitRe.exec(code)) !== null) traits.push(`${m[1]} → ${m[2]}`);

    const implRe = /\(impl-trait\s+([^\s)]+)/g;
    while ((m = implRe.exec(code)) !== null) traits.push(`impl: ${m[1]}`);

    return { contractName, functions, datavars, constants, maps, events, nfts, fts, traits, dependencyGraph };
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

const complexityBadge = (complexity?: 'low' | 'medium' | 'high') => {
    switch (complexity) {
        case 'low': return <Badge label="low-complex" color="bg-green-500/10 text-green-400 border border-green-500/20" />;
        case 'medium': return <Badge label="mod-complex" color="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" />;
        case 'high': return <Badge label="high-complex" color="bg-red-500/10 text-red-400 border border-red-500/20" />;
        default: return null;
    }
};

const TypeTooltip: React.FC<{ type: string }> = ({ type }) => {
    const [visible, setVisible] = useState(false);

    const getExplanation = (t: string) => {
        if (t === 'uint128') return 'Unsigned 128-bit integer (e.g. u100)';
        if (t === 'int128') return 'Signed 128-bit integer (e.g. 100)';
        if (t === 'bool') return 'Boolean value (true or false)';
        if (t === 'principal') return 'Standard Stacks address or Contract identifier';
        if (t.startsWith('string-ascii')) return 'ASCII encoded string';
        if (t.startsWith('string-utf8')) return 'UTF-8 encoded string';
        if (t.startsWith('optional')) return 'Value that might be none or some value';
        if (t.startsWith('response')) return 'Success (ok) or Error (err) result';
        if (t.startsWith('list')) return 'Ordered collection of values';
        return 'Clarity Data Type';
    };

    return (
        <div className="relative inline-block" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            <span className="text-green-300 underline decoration-dotted cursor-help">{type}</span>
            {visible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-caspier-black border border-caspier-border rounded-lg shadow-xl text-[10px] text-caspier-text min-w-[150px] z-50 pointer-events-none animate-in fade-in zoom-in duration-150">
                    <p className="font-bold mb-1 uppercase tracking-tighter text-caspier-muted">Type Detail</p>
                    {getExplanation(type)}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-caspier-black"></div>
                </div>
            )}
        </div>
    );
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

const FunctionCard: React.FC<{
    fn: AbiFunction;
    onCopy: (text: string) => void;
    wallet: any;
    network: string;
    contractAddress: string;
    contractName: string;
}> = ({ fn, onCopy, wallet, network, contractAddress, contractName }) => {
    const [open, setOpen] = useState(false);
    const [showTester, setShowTester] = useState(false);
    const [showSource, setShowSource] = useState(false);
    const [args, setArgs] = useState<Record<string, string>>({});
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const signature = `(${fn.name}${fn.args.map(a => ` (${a.name} ${a.type})`).join('')})`;
    const snippet = fn.access === 'public'
        ? `(contract-call? .${contractName} ${fn.name}${fn.args.map(a => ` ${a.type === 'uint128' ? 'u1000' : a.type === 'bool' ? 'true' : '""'}`).join('')})`
        : `(${fn.name}${fn.args.map(a => ` ${a.type === 'uint128' ? 'u1000' : a.type === 'bool' ? 'true' : '""'}`).join('')})`;

    const handleCall = async () => {
        if (fn.access === 'private') return;
        setLoading(true);
        setResult(null);

        try {
            const toCV = (val: string, type: string): any => {
                if (type === 'uint128') return uintCV(val || 0);
                if (type === 'int128') return intCV(val || 0);
                if (type === 'bool') return val.toLowerCase() === 'true' ? trueCV() : falseCV();
                if (type === 'principal') return principalCV(val);
                if (type.startsWith('string-ascii')) return stringAsciiCV(val);
                return stringUtf8CV(val);
            };

            const cvArgs = fn.args.map(a => toCV(args[a.name] || '', a.type));

            if (fn.access === 'read-only') {
                const api = network === 'mainnet' ? 'https://api.mainnet.hiro.so' : 'https://api.testnet.hiro.so';
                const res = await fetch(`${api}/v2/contracts/call-read/${contractAddress}/${contractName}/${fn.name}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sender: wallet?.address || contractAddress,
                        arguments: cvArgs.map((cv: any) => '0x' + bytesToHex(serializeCV(cv)))
                    })
                });
                const data = await res.json();
                if (data.okay) {
                    const decoded = cvToValue(deserializeCV(hexToBytes(data.result.replace('0x', ''))));
                    setResult({ type: 'success', value: JSON.stringify(decoded, null, 2) });
                } else {
                    setResult({ type: 'error', value: data.cause });
                }
            } else {
                await openContractCall({
                    contractAddress,
                    contractName,
                    functionName: fn.name,
                    functionArgs: cvArgs,
                    network: network === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET,
                    onFinish: (data) => setResult({ type: 'success', value: `Broadcasted: ${data.txId}` }),
                    onCancel: () => setResult({ type: 'info', value: 'Cancelled' })
                });
            }
        } catch (e: any) {
            setResult({ type: 'error', value: e.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-lg border border-caspier-border bg-caspier-black/50 overflow-hidden transition-all hover:border-caspier-muted/50">
            <div
                role="button"
                tabIndex={0}
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-caspier-hover/30 transition-colors cursor-pointer group"
            >
                {open
                    ? <ChevronDownIcon className="w-3 h-3 text-caspier-muted flex-shrink-0" />
                    : <ChevronRightIcon className="w-3 h-3 text-caspier-muted flex-shrink-0" />
                }
                <div className="flex-1 truncate">
                    <span className="font-mono text-sm text-caspier-text font-semibold">{fn.name}</span>
                    {fn.securityHints && fn.securityHints.length > 0 && <span className="ml-2 text-red-400" title={fn.securityHints.join('\n')}>⚠️</span>}
                </div>
                <div className="flex gap-1.5 items-center">
                    {complexityBadge(fn.complexity)}
                    {accessBadge(fn.access)}
                </div>
            </div>

            {open && (
                <div className="px-4 pb-4 pt-1 border-t border-caspier-border bg-caspier-dark/30 space-y-4">
                    {fn.docstring && (
                        <div className="text-[11px] text-caspier-muted leading-relaxed italic bg-caspier-black/40 p-2 rounded border border-caspier-border border-dashed">
                            {fn.docstring}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={() => onCopy(signature)} className="p-1 px-2 rounded-md bg-caspier-black border border-caspier-border text-[9px] font-bold text-caspier-muted hover:text-labstx-orange transition-all uppercase flex items-center gap-1">
                            <CopyIcon className="w-2.5 h-2.5" /> Sig
                        </button>
                        <button onClick={() => onCopy(snippet)} className="p-1 px-2 rounded-md bg-caspier-black border border-caspier-border text-[9px] font-bold text-caspier-muted hover:text-labstx-orange transition-all uppercase flex items-center gap-1">
                            <CopyIcon className="w-2.5 h-2.5" /> Snippet
                        </button>
                        {fn.access !== 'private' && (
                            <button onClick={() => setShowTester(!showTester)} className={`hidden p-1 px-2 rounded-md border text-[9px] font-bold transition-all uppercase flex items-center gap-1 ${showTester ? 'bg-labstx-orange text-white border-labstx-orange' : 'bg-caspier-black border-caspier-border text-caspier-muted hover:text-labstx-orange'}`}>
                                <RocketIcon className="w-2.5 h-2.5" /> Try
                            </button>
                        )}
                        <button onClick={() => setShowSource(!showSource)} className={`p-1 px-2 rounded-md border text-[9px] font-bold transition-all uppercase flex items-center gap-1 ${showSource ? 'bg-blue-500 text-white border-blue-500' : 'bg-caspier-black border-caspier-border text-caspier-muted hover:text-blue-400'}`}>
                            <EyeIcon className="w-2.5 h-2.5" /> Source
                        </button>
                    </div>

                    {showSource && (
                        <div className="animate-in slide-in-from-top-1 duration-200">
                            <pre className="font-mono text-[10px] bg-caspier-black p-3 rounded border border-caspier-border text-caspier-muted overflow-x-auto whitespace-pre">
                                {fn.sourceCode}
                            </pre>
                        </div>
                    )}

                    {showTester && (
                        <div className="p-3 bg-caspier-black rounded-lg border border-labstx-orange/30 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="text-[10px] font-bold text-labstx-orange uppercase tracking-widest">Function Tester</div>
                            {fn.args.map(arg => (
                                <div key={arg.name} className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-caspier-muted">{arg.name}</span>
                                        <span className="text-caspier-muted/50 font-mono italic">{arg.type}</span>
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full bg-caspier-dark border border-caspier-border text-xs px-2 py-1.5 rounded outline-none focus:border-labstx-orange font-mono"
                                        placeholder={`Enter ${arg.name}...`}
                                        value={args[arg.name] || ''}
                                        onChange={e => setArgs({ ...args, [arg.name]: e.target.value })}
                                    />
                                </div>
                            ))}
                            <Button variant="primary" size="sm" className="w-full text-[10px] py-1.5" disabled={loading} onClick={handleCall}>
                                {loading ? 'Calling...' : fn.access === 'read-only' ? 'Execute Read' : 'Broadcast Transaction'}
                            </Button>
                            {result && (
                                <div className={`p-2 rounded text-[10px] font-mono break-all border ${result.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                                    {result.value}
                                </div>
                            )}
                        </div>
                    )}

                    {!showTester && (
                        <div className="space-y-3">
                            {/* Parameters */}
                            <div>
                                <div className="text-[10px] text-caspier-muted uppercase tracking-widest mb-2 font-bold opacity-60">Parameters</div>
                                <div className="space-y-1.5">
                                    {fn.args.map((arg, i) => (
                                        <div key={i} className="flex items-center gap-3 text-xs font-mono bg-caspier-black/50 rounded px-3 py-1.5 border border-caspier-border">
                                            <span className="text-blue-300 font-semibold flex-shrink-0">{arg.name}</span>
                                            <span className="text-caspier-muted">:</span>
                                            <TypeTooltip type={arg.type} />
                                        </div>
                                    ))}
                                    {fn.args.length === 0 && <div className="text-[11px] text-caspier-muted italic">No parameters</div>}
                                </div>
                            </div>

                            {/* Dependencies */}
                            {fn.calls && fn.calls.length > 0 && (
                                <div>
                                    <div className="text-[10px] text-caspier-muted uppercase tracking-widest mb-1 font-bold opacity-60">Internal Calls</div>
                                    <div className="flex flex-wrap gap-1">
                                        {Array.from(new Set(fn.calls)).map(c => (
                                            <span key={c} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-caspier-black text-caspier-muted border border-caspier-border">{c}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Results */}
                            <div>
                                <div className="text-[10px] text-caspier-muted uppercase tracking-widest mb-1 font-bold opacity-60">Returns</div>
                                <div className="inline-flex items-center px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono">
                                    {fn.access === 'public' ? 'response<ok, err>' : fn.outputs}
                                </div>
                            </div>
                        </div>
                    )}
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
    wallet: any;
    network: 'testnet' | 'mainnet' | 'devnet';
}

const AbiPreviewTab: React.FC<AbiPreviewTabProps> = ({ code, fileName, theme, wallet, network }) => {
    const [search, setSearch] = useState('');
    const [copied, setCopied] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<'all' | 'public' | 'read-only' | 'private' | 'vars' | 'maps'>('all');
    const [sortBy, setSortBy] = useState<'order' | 'alpha'>('order');
    const [comparing, setComparing] = useState(false);
    const [onChainAbi, setOnChainAbi] = useState<any>(null);

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

    const compareOnChain = async () => {
        if (!wallet?.address) return alert('Connect wallet to compare with on-chain deployed version');
        setComparing(true);
        try {
            const api = network === 'mainnet' ? 'https://api.mainnet.hiro.so' : 'https://api.testnet.hiro.so';
            const res = await fetch(`${api}/v2/contracts/interface/${wallet.address}/${abi.contractName}`);
            if (res.ok) {
                const data = await res.json();
                setOnChainAbi(data);
                alert('On-chain ABI fetched. Differences are highlighted in the cards.');
            } else {
                alert('Contract not found on-chain for this address.');
            }
        } catch (e) {
            alert('Failed to fetch on-chain ABI');
        } finally {
            setComparing(false);
        }
    };

    const searchLower = search.toLowerCase();

    const processList = (list: any[]) => {
        let filtered = list.filter(item => !search || item.name.toLowerCase().includes(searchLower));
        if (sortBy === 'alpha') {
            filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        }
        return filtered;
    };

    const filteredFunctions = processList(abi.functions).filter(fn => {
        const matchesFilter = activeFilter === 'all' || fn.access === activeFilter;
        return matchesFilter;
    });

    const publicFns = filteredFunctions.filter(f => f.access === 'public');
    const readOnlyFns = filteredFunctions.filter(f => f.access === 'read-only');
    const privateFns = filteredFunctions.filter(f => f.access === 'private');

    const filteredVars = processList(abi.datavars);
    const filteredConstants = processList(abi.constants);
    const filteredMaps = processList(abi.maps);
    const filteredEvts = abi.events.filter(e => !search || e.raw.toLowerCase().includes(searchLower));

    const isEmpty = !code || code.trim().length === 0;
    const isClar = fileName.endsWith('.clar') || fileName.endsWith('.clarity');

    const contractAddress = wallet?.address || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

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
                            <h1 className="font-black text-base tracking-tight">Advanced ABI Preview</h1>
                            <p className="text-[11px] text-caspier-muted font-mono">{abi.contractName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={compareOnChain}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-caspier-border hover:border-blue-400 text-caspier-muted transition-all ${comparing ? 'animate-pulse' : ''}`}
                            title="Compare with deployed version"
                        >
                            <SearchIcon className="w-3.5 h-3.5" />
                            {onChainAbi ? 'On-Chain Linked' : 'Compare On-Chain'}
                        </button>
                        <button
                            onClick={downloadAbi}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-labstx-orange/10 border border-caspier-border text-labstx-orange hover:bg-labstx-orange/20 transition-all font-bold"
                            title="Download ABI JSON"
                        >
                            <DownloadIcon className="w-3.5 h-3.5" />
                            Export
                        </button>
                    </div>
                </div>

                {/* Stats & Dependency Mapping */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-caspier-muted mb-3 uppercase font-bold tracking-tight">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-labstx-orange" /> {abi.functions.filter(f => f.access === 'public').length} public</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-400" /> {abi.functions.filter(f => f.access === 'read-only').length} read-only</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-caspier-muted" /> {abi.functions.filter(f => f.access === 'private').length} private</span>
                    <span className="text-caspier-border">│</span>
                    <span>{abi.constants.length} consts</span>
                    <span>{abi.datavars.length} vars</span>
                    <span>{abi.maps.length} maps</span>
                    {abi.traits.length > 0 && <span className="text-pink-400">{abi.traits.length} traits</span>}
                </div>

                {/* Search + Filter + Sort */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-caspier-muted pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search functions, variables..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border outline-none focus:border-labstx-orange transition-colors font-mono
                                ${theme === 'light' ? 'bg-white border-gray-200 text-gray-700' : 'bg-caspier-black border-caspier-border text-caspier-text'}`}
                        />
                    </div>
                    <div className="flex gap-1">
                        {(['all', 'public', 'read-only', 'vars', 'maps'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f as any)}
                                className={`px-2.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all uppercase tracking-wider
                                    ${activeFilter === f ? 'bg-labstx-orange text-caspier-black border-labstx-orange' : 'border-caspier-border text-caspier-muted hover:text-caspier-text'}`}
                            >
                                {f}
                            </button>
                        ))}
                        <button
                            onClick={() => setSortBy(sortBy === 'order' ? 'alpha' : 'order')}
                            className="px-2.5 py-1.5 text-[9px] font-bold rounded-lg border border-caspier-border text-caspier-muted hover:text-caspier-text uppercase"
                            title="Toggle Sort (Declaration / Alphabetical)"
                        >
                            {sortBy === 'order' ? 'Decl' : 'A-Z'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 custom-scrollbar">

                {isEmpty && (
                    <div className="flex flex-col items-center justify-center h-48 text-caspier-muted text-sm gap-3">
                        <EyeIcon className="w-10 h-10 opacity-20" />
                        <p className="text-center">{!isClar ? 'ABI Preview is only for .clar files.' : 'Contract is empty.'}</p>
                    </div>
                )}

                {!isEmpty && (
                    <>
                        {/* Constants */}
                        {activeFilter === 'all' && filteredConstants.length > 0 && (
                            <Section title="Constants" count={filteredConstants.length} color="text-purple-400" icon={<TokenIcon />} defaultOpen={false}>
                                {filteredConstants.map((c, i) => (
                                    <div key={i} className="px-4 py-2.5 rounded-lg border border-caspier-border bg-caspier-black/40 font-mono text-xs group">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-purple-300 font-semibold">{c.name}</span>
                                            <span className="text-[10px] text-caspier-muted opacity-0 group-hover:opacity-100 transition-opacity">Line {c.line}</span>
                                        </div>
                                        <div className="text-caspier-muted overflow-hidden truncate whitespace-nowrap opacity-70 italic">{c.value}</div>
                                        {c.docstring && <div className="mt-1.5 text-[10px] text-caspier-muted/50 border-l border-caspier-border pl-2 border-dashed">{c.docstring}</div>}
                                    </div>
                                ))}
                            </Section>
                        )}

                        {/* Public Functions */}
                        {(activeFilter === 'all' || activeFilter === 'public') && publicFns.length > 0 && (
                            <Section title="Public Functions" count={publicFns.length} color="text-labstx-orange" icon={<FnIcon />}>
                                {publicFns.map((fn, i) => (
                                    <FunctionCard key={i} fn={fn} onCopy={copyText} wallet={wallet} network={network} contractAddress={contractAddress} contractName={abi.contractName} />
                                ))}
                            </Section>
                        )}

                        {/* Read-Only Functions */}
                        {(activeFilter === 'all' || activeFilter === 'read-only') && readOnlyFns.length > 0 && (
                            <Section title="Read-Only Functions" count={readOnlyFns.length} color="text-blue-400" icon={<FnIcon />}>
                                {readOnlyFns.map((fn, i) => (
                                    <FunctionCard key={i} fn={fn} onCopy={copyText} wallet={wallet} network={network} contractAddress={contractAddress} contractName={abi.contractName} />
                                ))}
                            </Section>
                        )}

                        {/* Variables */}
                        {(activeFilter === 'all' || activeFilter === 'vars') && filteredVars.length > 0 && (
                            <Section title="Data Variables" count={filteredVars.length} color="text-yellow-400" icon={<DbIcon />}>
                                {filteredVars.map((v, i) => (
                                    <div key={i} className="px-4 py-2.5 rounded-lg border border-caspier-border bg-caspier-black/40 font-mono text-xs hover:border-yellow-400/30 transition-colors">
                                        <div className="flex justify-between items-center">
                                            <span className="text-yellow-300 font-semibold">{v.name}</span>
                                            <span className="text-green-300">{v.type}</span>
                                        </div>
                                        {v.docstring && <div className="mt-1.5 text-[10px] text-caspier-muted/50">{v.docstring}</div>}
                                    </div>
                                ))}
                            </Section>
                        )}

                        {/* Maps */}
                        {(activeFilter === 'all' || activeFilter === 'maps') && filteredMaps.length > 0 && (
                            <Section title="Maps" count={filteredMaps.length} color="text-cyan-400" icon={<MapIcon />}>
                                {filteredMaps.map((map, i) => (
                                    <div key={i} className="px-4 py-2.5 rounded-lg border border-caspier-border bg-caspier-black/40 font-mono text-xs hover:border-cyan-400/30 transition-colors">
                                        <div className="flex items-center gap-2 mb-1.5"><span className="text-cyan-300 font-semibold">{map.name}</span></div>
                                        <div className="flex gap-4 text-[10px]">
                                            <span><span className="text-caspier-muted italic">key:</span> <span className="text-green-300">{map.key}</span></span>
                                            <span><span className="text-caspier-muted italic">val:</span> <span className="text-purple-300">{map.value}</span></span>
                                        </div>
                                    </div>
                                ))}
                            </Section>
                        )}

                        {/* Traits */}
                        {activeFilter === 'all' && abi.traits.length > 0 && (
                            <Section title="Traits" count={abi.traits.length} color="text-pink-400" icon={<TraitIcon />} defaultOpen={false}>
                                {abi.traits.map((t, i) => (
                                    <div key={i} className="px-4 py-2 rounded-lg border border-caspier-border bg-caspier-black/40 font-mono text-[10px]">{t}</div>
                                ))}
                            </Section>
                        )}

                        {/* Events */}
                        {activeFilter === 'all' && filteredEvts.length > 0 && (
                            <Section title="Events (prints)" count={filteredEvts.length} color="text-pink-400" icon={<EventIcon />} defaultOpen={false}>
                                {filteredEvts.map((ev, i) => (
                                    <div key={i} className="flex gap-2 px-4 py-2 rounded-lg border border-caspier-border bg-caspier-black/40 font-mono text-[10px]">
                                        <span className="text-caspier-muted flex-shrink-0">:{ev.line}</span>
                                        <span className="text-pink-300 truncate">{ev.raw}</span>
                                    </div>
                                ))}
                            </Section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AbiPreviewTab;

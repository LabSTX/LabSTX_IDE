
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { PlayIcon, TrashIcon, DatabaseIcon, UserIcon, ClockIcon, CodeIcon, ChevronRightIcon, TerminalIcon } from './Icons';
import { runExclusively } from '../../services/stacks/simnet';

interface SimnetTabProps {
    activeAccount: string;
    onAccountChange?: (address: string) => void;
    theme: 'dark' | 'light';
}

interface ExecutionResult {
    id: string;
    code: string;
    result: string;
    timestamp: number;
    account: string;
    success: boolean;
}

const CHEAT_SHEET = [
    { label: 'Addition', code: '(+ 1 2)' },
    { label: 'Current Block', code: 'block-height' },
    { label: 'Check Balance', code: '(stx-get-balance tx-sender)' },
    { label: 'Contract Call (Internal)', code: '(contract-call? .my-contract my-function)' },
    { label: 'Define Data Var', code: '(define-data-var counter uint u0)' },
    { label: 'Get Data Var', code: '(var-get counter)' },
];

export const SimnetTab: React.FC<SimnetTabProps> = ({ activeAccount, onAccountChange, theme }) => {
    const [code, setCode] = useState('(+ 1 2)');
    const [results, setResults] = useState<ExecutionResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const resultsEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [results]);

    const handleRun = async () => {
        if (!code.trim() || isRunning) return;

        setIsRunning(true);
        const timestamp = Date.now();
        const executionId = `exec-${timestamp}`;

        try {
            const output = await runExclusively((simnet) => {
                // Pass the active account as the sender for proper resolution of '.' shorthands
                return (simnet as any).runSnippet(code, activeAccount);
            });

            const newResult: ExecutionResult = {
                id: executionId,
                code: code,
                result: String(output),
                timestamp: timestamp,
                account: activeAccount,
                success: !String(output).toLowerCase().includes('error')
            };

            setResults(prev => [...prev, newResult]);
        } catch (error: any) {
            setResults(prev => [...prev, {
                id: executionId,
                code: code,
                result: error.message || String(error),
                timestamp: timestamp,
                account: activeAccount,
                success: false
            }]);
        } finally {
            setIsRunning(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'Enter') {
            handleRun();
        }
    };

    const clearResults = () => setResults([]);

    return (
        <div className="flex flex-col h-full bg-caspier-black text-caspier-text overflow-hidden">
            {/* Header */}
            <div className="flex flex-col flex-shrink-0 border-b border-caspier-border bg-caspier-panel/30">
                <div className="px-8 py-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-labstx-orange/10 flex items-center justify-center border border-labstx-orange/20">
                            <DatabaseIcon className="w-6 h-6 text-labstx-orange" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-widest text-white">Simnet Scratchpad</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-black text-caspier-muted uppercase tracking-widest">Local WASM Engine Active</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end px-4 py-2 bg-caspier-black/50 border border-caspier-border rounded-xl">
                            <span className="text-[8px] font-black text-caspier-muted uppercase tracking-widest mb-0.5">Active Sender</span>
                            <div className="flex items-center gap-2">
                                <UserIcon className="w-3.5 h-3.5 text-labstx-orange opacity-70" />
                                <span className="text-[11px] font-mono font-bold text-caspier-text">{activeAccount.substring(0, 10)}...{activeAccount.substring(activeAccount.length - 8)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Side: Editor & Cheat Sheet */}
                <div className="w-1/2 flex flex-col border-r border-caspier-border p-8 space-y-6 overflow-hidden">
                    <div className="flex flex-col flex-1 gap-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <CodeIcon className="w-4 h-4 text-caspier-muted" />
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-caspier-muted">Clarity Snippet</h2>
                            </div>
                            <span className="text-[9px] font-bold text-caspier-muted/50 uppercase">Ctrl + Enter to run</span>
                        </div>

                        <div className="flex-1 relative group">
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                onKeyDown={handleKeyDown}
                                spellCheck={false}
                                className="w-full h-full bg-caspier-black border-2 border-caspier-border rounded-2xl p-6 font-mono text-sm text-caspier-text focus:border-labstx-orange outline-none transition-all resize-none shadow-inner"
                                placeholder="(+ 1 2)"
                            />
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <CodeIcon className="w-5 h-5 text-caspier-border" />
                            </div>
                        </div>

                        <Button
                            onClick={handleRun}
                            disabled={isRunning}
                            size="lg"
                            className="w-full py-4 uppercase font-black tracking-[0.2em] relative overflow-hidden group"
                        >
                            {isRunning ? (
                                <div className="flex items-center gap-3">
                                    <ClockIcon className="w-5 h-5 animate-spin" />
                                    <span>Executing Snippet...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <PlayIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span>Run Clarity Snippet</span>
                                </div>
                            )}
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-caspier-muted px-1">Cheat Sheet</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {CHEAT_SHEET.map(item => (
                                <button
                                    key={item.label}
                                    onClick={() => setCode(item.code)}
                                    className="p-3 bg-caspier-panel/40 border border-caspier-border rounded-xl text-left hover:border-labstx-orange hover:bg-labstx-orange/5 transition-all group"
                                >
                                    <div className="text-[9px] font-black uppercase text-caspier-muted group-hover:text-labstx-orange transition-colors mb-1">{item.label}</div>
                                    <div className="text-[10px] font-mono text-caspier-text truncate opacity-70">{item.code}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Results */}
                <div className="w-1/2 flex flex-col bg-caspier-black/30 p-0 overflow-hidden">
                    <div className="px-8 py-4 border-b border-caspier-border flex justify-between items-center bg-caspier-black/20">
                        <div className="flex items-center gap-2">
                            <TerminalIcon className="w-4 h-4 text-caspier-muted" />
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-caspier-muted">Execution History</h2>
                        </div>
                        {results.length > 0 && (
                            <button
                                onClick={clearResults}
                                className="text-[9px] font-black uppercase text-red-500/60 hover:text-red-500 transition-colors flex items-center gap-1.5"
                            >
                                <TrashIcon className="w-3 h-3" />
                                Clear History
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                        {results.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale pointer-events-none">
                                <TerminalIcon className="w-16 h-16 mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest">No executions yet</p>
                                <p className="text-[10px] mt-2">Run a snippet to see results here</p>
                            </div>
                        ) : (
                            results.map((res) => (
                                <div key={res.id} className={`flex flex-col rounded-2xl border ${res.success ? 'border-caspier-border bg-caspier-panel/20' : 'border-red-500/30 bg-red-500/5'} overflow-hidden animate-in slide-in-from-bottom-2 duration-300`}>
                                    <div className="px-4 py-2 bg-caspier-black/40 flex justify-between items-center border-b border-caspier-border/40">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-mono text-caspier-muted">{new Date(res.timestamp).toLocaleTimeString()}</span>
                                            <div className="h-3 w-[1px] bg-caspier-border" />
                                            <div className="flex items-center gap-1.5 min-w-0 pr-4">
                                                <UserIcon className="w-2.5 h-2.5 text-caspier-muted" />
                                                <span className="text-[8px] font-mono text-caspier-muted truncate max-w-[120px]">{res.account}</span>
                                            </div>
                                        </div>
                                        <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${res.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {res.success ? 'Success' : 'Error'}
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="flex gap-2">
                                            <ChevronRightIcon className="w-3 h-3 text-labstx-orange mt-0.5 flex-shrink-0" />
                                            <code className="text-[11px] font-mono text-caspier-text leading-relaxed bg-caspier-black/40 px-2 py-1 rounded inline-block w-full">{res.code}</code>
                                        </div>
                                        <div className="pl-5">
                                            <pre className={`text-xs font-mono p-3 rounded-xl border whitespace-pre-wrap break-all ${res.success ? 'bg-caspier-black/60 border-caspier-border text-emerald-400' : 'bg-red-950/20 border-red-500/20 text-red-300'}`}>
                                                {res.result}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={resultsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimnetTab;

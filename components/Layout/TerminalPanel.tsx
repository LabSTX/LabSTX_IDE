import React, { useState, useEffect, useRef } from 'react';
import { TerminalLine, Problem } from '../../types';
import { CheckIcon, XIcon, BugIcon, TerminalIcon, PlayIcon, TrashIcon, CopyIcon } from '../UI/Icons';

interface TerminalPanelProps {
    terminalLines: TerminalLine[];
    outputLines: string[];
    problems: Problem[];
    height: number;
    theme: 'dark' | 'light';
    onClearTerminal: () => void;
    onCommand?: (command: string) => void;
    onLocateProblem?: (file: string, line: number, column: number) => void;
}

type TerminalTab = 'TERMINAL' | 'OUTPUT' | 'PROBLEMS';

const TerminalRow: React.FC<{ line: TerminalLine; theme: 'dark' | 'light' }> = ({ line, theme }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const renderContent = () => {
        if (line.type === 'query' && line.data) {
            return (
                <div className="flex flex-col">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:text-caspier-text transition-colors group"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <span className="text-caspier-muted opacity-50 w-3">{isExpanded ? '▼' : '▶'}</span>
                        <span className="text-blue-400 font-bold shrink-0">[QUERY]</span>
                        <span className="text-caspier-text truncate shrink">{line.content}</span>
                    </div>
                    {isExpanded && (
                        <div className={`mt-2 ml-5 p-3 rounded space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 border ${theme === 'dark' ? 'bg-caspier-dark/50 border-caspier-border' : 'bg-caspier-dark border-caspier-border'
                            }`}>
                            <div className="grid grid-cols-[80px_1fr] gap-x-4 gap-y-1.5 text-[11px]">
                                <span className="text-caspier-muted uppercase font-bold text-[9px]">Contract:</span>
                                <span className="text-caspier-text font-mono truncate bg-caspier-black/30 px-1 rounded">{line.data.contract}</span>

                                <span className="text-caspier-muted uppercase font-bold text-[9px]">Function:</span>
                                <span className="text-labstx-orange font-mono font-bold">{line.data.function}</span>

                                <span className="text-caspier-muted uppercase font-bold text-[9px]">Arguments:</span>
                                <pre className="text-caspier-text bg-caspier-black/30 p-2 rounded border border-caspier-border overflow-x-auto max-w-full font-mono text-[10px]">
                                    {line.data.args || 'None'}
                                </pre>

                                <span className="text-caspier-muted uppercase font-bold text-[9px] mt-1">Result:</span>
                                <div className={`mt-1 p-2 rounded border font-mono whitespace-pre-wrap break-all shadow-inner text-[10px] leading-relaxed ${theme === 'dark' ? 'bg-caspier-black border-caspier-border text-green-400' : 'bg-caspier-black border-caspier-border text-green-600'
                                    }`}>
                                    {line.data.result}
                                </div>
                            </div>
                            <div className="text-[8px] text-caspier-muted italic border-t border-caspier-border pt-2 flex justify-between">
                                <span>Status: Success</span>
                                <span>{new Date().toLocaleTimeString()}</span>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="flex gap-2 items-start py-0.5">
                {line.type === 'command' && <span className="text-caspier-red font-bold shrink-0">➜  ~</span>}
                <span className={`break-words ${line.type === 'error' ? 'text-red-500' :
                    line.type === 'success' ? 'text-green-500' :
                        line.type === 'command' ? 'text-caspier-text' :
                            line.type === 'query' ? 'text-blue-400' :
                                'text-caspier-muted'
                    }`}>
                    {line.content}
                </span>
                {line.type === 'success' && <CheckIcon className="w-3 h-3 text-green-500 inline mt-0.5 shrink-0" />}
            </div>
        );
    };

    return (
        <div className="border-b border-caspier-border last:border-0 hover:bg-caspier-hover px-2 -mx-2 transition-colors">
            {renderContent()}
        </div>
    );
};

const TerminalPanel: React.FC<TerminalPanelProps> = ({ terminalLines, outputLines, problems, height, theme, onClearTerminal, onCommand, onLocateProblem }) => {
    const [activeTab, setActiveTab] = useState<TerminalTab>('TERMINAL');
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);

    const copyProblem = (prob: Problem) => {
        const text = `${prob.file}:${prob.line}:${prob.column} - ${prob.severity.toUpperCase()}: ${prob.description}`;
        navigator.clipboard.writeText(text).catch(() => { });
        setCopiedId(prob.id);
        setTimeout(() => setCopiedId(null), 1800);
    };

    const copyAllProblems = () => {
        const text = problems
            .map(p => `${p.file}:${p.line}:${p.column} - ${p.severity.toUpperCase()}: ${p.description}`)
            .join('\n');
        navigator.clipboard.writeText(text).catch(() => { });
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 1800);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [terminalLines, activeTab]);

    const getTabIcon = (tab: TerminalTab) => {
        switch (tab) {
            case 'TERMINAL': return <TerminalIcon className="w-3.5 h-3.5" />;
            case 'OUTPUT': return <PlayIcon className="w-3.5 h-3.5" />;
            case 'PROBLEMS': return <BugIcon className="w-3.5 h-3.5" />;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim() && onCommand) {
            onCommand(inputValue.trim());
            setInputValue('');
        }
    };

    const renderTerminal = () => (
        <div className={`flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 ${theme === 'dark' ? 'bg-caspier-black' : 'bg-caspier-black'}`}
            onClick={() => document.getElementById('terminal-input')?.focus()}
        >
            <div className="text-caspier-muted mb-4 border-b border-caspier-border pb-1.5 flex justify-between items-center pr-1">
                <span className="font-bold tracking-tight opacity-80 uppercase text-[9px]">LabSTX Shell v1.0.0</span>
                <span className="text-[9px] opacity-40 px-1.5 py-0.5 bg-caspier-dark rounded border border-caspier-border">{terminalLines.length} lines</span>
            </div>
            {terminalLines.map((line) => (
                <TerminalRow key={line.id} line={line} theme={theme} />
            ))}

            <form onSubmit={handleSubmit} className="flex gap-2 items-center mt-2 group">
                <span className="text-caspier-red font-bold shrink-0">➜  ~</span>
                <input
                    id="terminal-input"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-caspier-text font-mono text-xs p-0 focus:ring-0"
                    placeholder="Type 'clarinet ...' for local dev tools"
                    autoComplete="off"
                    autoFocus
                />
            </form>

            {!inputValue && (
                <div className="flex gap-2 items-center mt-0.5 opacity-30">
                    <span className="text-caspier-red font-bold invisible">➜  ~</span>
                    <span className="w-2 h-4 bg-caspier-muted animate-pulse"></span>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );

    const renderOutput = () => (
        <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 bg-caspier-black font-sans">
            {outputLines.length === 0 && <div className="text-caspier-muted italic p-2">No output generated.</div>}
            {outputLines.map((line, idx) => (
                <div key={idx} className="text-caspier-muted whitespace-pre-wrap py-0.5">{line}</div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );

    const renderProblems = () => (
        <div className="flex-1 overflow-y-auto p-0 text-xs bg-caspier-black">
            {problems.length === 0 ? (
                <div className="p-4 text-caspier-muted italic flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-green-500" />
                    No problems detected in workspace.
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-caspier-panel text-caspier-muted font-bold sticky top-0 border-b border-caspier-border">
                        <tr>
                            <th className="p-2 w-8"></th>
                            <th className="p-2">Description</th>
                            <th className="p-2 w-28">File</th>
                            <th className="p-2 w-24">Location</th>
                            <th className="p-2 w-20 text-right pr-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {problems.map(prob => (
                            <tr key={prob.id} className="border-b border-caspier-border hover:bg-caspier-hover bg-caspier-black/20 group">
                                <td className="p-2 text-center">
                                    {prob.severity === 'error' ? (
                                        <XIcon className="w-4 h-4 text-red-500 inline" />
                                    ) : (
                                        <BugIcon className="w-4 h-4 text-yellow-500 inline" />
                                    )}
                                </td>
                                <td className="p-2 text-caspier-text">{prob.description}</td>
                                <td className="p-2 text-caspier-muted font-mono truncate max-w-[7rem]" title={prob.file}>{prob.file}</td>
                                <td className="p-2 text-caspier-muted font-mono">
                                    <span className="bg-caspier-dark/60 px-1.5 py-0.5 rounded border border-caspier-border text-[10px]">
                                        {prob.line}:{prob.column}
                                    </span>
                                </td>
                                <td className="p-2">
                                    <div className="flex items-center justify-end gap-1 pr-1">
                                        {/* Copy button */}
                                        <button
                                            onClick={() => copyProblem(prob)}
                                            title="Copy error to clipboard"
                                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition-all border ${copiedId === prob.id
                                                ? 'border-green-600/40 text-green-400 bg-green-900/20'
                                                : 'border-caspier-border text-caspier-muted hover:text-caspier-text hover:border-caspier-text/30 hover:bg-caspier-hover'
                                                }`}
                                        >
                                            {copiedId === prob.id ? (
                                                <><CheckIcon className="w-3 h-3" /><span>Copied</span></>
                                            ) : (
                                                <><CopyIcon className="w-3 h-3" /><span>Copy</span></>
                                            )}
                                        </button>
                                        {/* Locate button */}
                                        {onLocateProblem && (
                                            <button
                                                onClick={() => onLocateProblem(prob.file, prob.line, prob.column)}
                                                title={`Go to ${prob.file}:${prob.line}:${prob.column}`}
                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border border-caspier-border text-caspier-muted hover:text-labstx-orange hover:border-labstx-orange/50 hover:bg-labstx-orange/10 transition-all"
                                            >
                                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="11" cy="11" r="8" />
                                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                                    <line x1="11" y1="8" x2="11" y2="14" />
                                                    <line x1="8" y1="11" x2="14" y2="11" />
                                                </svg>
                                                <span>Locate</span>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    return (
        <div id="terminal-panel" className="bg-caspier-black border-t border-caspier-border w-full flex flex-col" style={{ height: `${height}px` }}>
            <div className="flex border-b border-caspier-border bg-caspier-panel h-8 justify-between items-center pr-2">
                <div className="flex h-full">
                    {(['TERMINAL', 'OUTPUT', 'PROBLEMS'] as TerminalTab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border-t-2 transition-all h-full ${activeTab === tab
                                ? `text-caspier-red border-caspier-red ${theme === 'dark' ? 'bg-caspier-black' : 'bg-caspier-black'}`
                                : 'text-caspier-muted border-transparent hover:text-caspier-text hover:bg-caspier-hover'
                                }`}
                        >
                            {getTabIcon(tab)}
                            <span>{tab}</span>
                            {tab === 'PROBLEMS' && problems.length > 0 && <span className="ml-0.5 opacity-50">({problems.length})</span>}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1">
                    {activeTab === 'PROBLEMS' && problems.length > 0 && (
                        <button
                            onClick={copyAllProblems}
                            className={`p-1 px-2 flex items-center gap-1.5 transition-colors text-[10px] uppercase font-bold group ${copiedAll
                                ? 'text-green-400'
                                : 'text-caspier-muted hover:text-caspier-text'
                                }`}
                            title="Copy all problems to clipboard"
                        >
                            {copiedAll ? (
                                <><CheckIcon className="w-3 h-3" /><span>Copied!</span></>
                            ) : (
                                <><CopyIcon className="w-3 h-3 group-hover:scale-110 transition-transform" /><span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Copy All</span></>
                            )}
                        </button>
                    )}
                    {activeTab === 'TERMINAL' && terminalLines.length > 0 && (
                        <button
                            onClick={onClearTerminal}
                            className="p-1 px-2 flex items-center gap-1.5 text-caspier-muted hover:text-caspier-red transition-colors text-[10px] uppercase font-bold group"
                            title="Clear Terminal"
                        >
                            <TrashIcon className="w-3 h-3 group-hover:scale-110 transition-transform" />
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Clear</span>
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'TERMINAL' && renderTerminal()}
            {activeTab === 'OUTPUT' && renderOutput()}
            {activeTab === 'PROBLEMS' && renderProblems()}
        </div>
    );
};

export default TerminalPanel;

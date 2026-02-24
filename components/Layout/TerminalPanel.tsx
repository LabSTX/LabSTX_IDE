
import React, { useState } from 'react';
import { TerminalLine, Problem } from '../../types';
import { CheckIcon, XIcon, BugIcon, TerminalIcon, PlayIcon, TrashIcon } from '../UI/Icons';

interface TerminalPanelProps {
    terminalLines: TerminalLine[];
    outputLines: string[];
    problems: Problem[];
    height: number;
    theme: 'dark' | 'light';
    onClearTerminal: () => void;
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
                        <span className="text-[9px] text-caspier-muted px-1.5 py-0.5 bg-caspier-dark rounded border border-caspier-border ml-auto shrink-0 uppercase tracking-tighter font-black">Details</span>
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
                                <pre className="text-caspier-text bg-caspier-black/30 p-2 rounded border border-caspier-border/30 overflow-x-auto max-w-full font-mono text-[10px]">
                                    {line.data.args || 'None'}
                                </pre>

                                <span className="text-caspier-muted uppercase font-bold text-[9px] mt-1">Result:</span>
                                <div className={`mt-1 p-2 rounded border font-mono whitespace-pre-wrap break-all shadow-inner text-[10px] leading-relaxed ${theme === 'dark' ? 'bg-caspier-black border-caspier-border text-green-400' : 'bg-caspier-black border-caspier-border text-green-600'
                                    }`}>
                                    {line.data.result}
                                </div>
                            </div>
                            <div className="text-[8px] text-caspier-muted italic border-t border-caspier-border/20 pt-2 flex justify-between">
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
        <div className="border-b border-caspier-border/5 last:border-0 hover:bg-caspier-hover px-2 -mx-2 transition-colors">
            {renderContent()}
        </div>
    );
};

const TerminalPanel: React.FC<TerminalPanelProps> = ({ terminalLines, outputLines, problems, height, theme, onClearTerminal }) => {
    const [activeTab, setActiveTab] = useState<TerminalTab>('TERMINAL');

    const getTabIcon = (tab: TerminalTab) => {
        switch (tab) {
            case 'TERMINAL': return <TerminalIcon className="w-3.5 h-3.5" />;
            case 'OUTPUT': return <PlayIcon className="w-3.5 h-3.5" />;
            case 'PROBLEMS': return <BugIcon className="w-3.5 h-3.5" />;
        }
    };

    const renderTerminal = () => (
        <div className={`flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 ${theme === 'dark' ? 'bg-caspier-black' : 'bg-caspier-black'}`}>
            <div className="text-caspier-muted mb-4 border-b border-caspier-border pb-1.5 flex justify-between items-center pr-1">
                <span className="font-bold tracking-tight opacity-80 uppercase text-[9px]">LabSTX Shell v1.0.0</span>
                <span className="text-[9px] opacity-40 px-1.5 py-0.5 bg-caspier-dark rounded border border-caspier-border">{terminalLines.length} lines</span>
            </div>
            {terminalLines.map((line) => (
                <TerminalRow key={line.id} line={line} theme={theme} />
            ))}
            <div className="flex gap-2 items-center mt-4 opacity-30">
                <span className="text-caspier-red font-bold">➜  ~</span>
                <span className="w-2 h-4 bg-caspier-muted animate-pulse"></span>
            </div>
        </div>
    );

    const renderOutput = () => (
        <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 bg-caspier-black font-sans">
            {outputLines.length === 0 && <div className="text-caspier-muted italic p-2">No output generated.</div>}
            {outputLines.map((line, idx) => (
                <div key={idx} className="text-caspier-muted whitespace-pre-wrap py-0.5">{line}</div>
            ))}
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
                            <th className="p-2 w-10"></th>
                            <th className="p-2">Description</th>
                            <th className="p-2 w-32">File</th>
                            <th className="p-2 w-24">Location</th>
                        </tr>
                    </thead>
                    <tbody>
                        {problems.map(prob => (
                            <tr key={prob.id} className="border-b border-caspier-border/50 hover:bg-caspier-hover bg-caspier-black/20 group">
                                <td className="p-2 text-center">
                                    {prob.severity === 'error' ? (
                                        <XIcon className="w-4 h-4 text-red-500 inline" />
                                    ) : (
                                        <BugIcon className="w-4 h-4 text-yellow-500 inline" />
                                    )}
                                </td>
                                <td className="p-2 text-caspier-text">{prob.description}</td>
                                <td className="p-2 text-caspier-muted">{prob.file}</td>
                                <td className="p-2 text-caspier-muted">[{prob.line}, {prob.column}]</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    return (
        <div className="bg-caspier-black border-t border-caspier-border w-full flex flex-col" style={{ height: `${height}px` }}>
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

            {activeTab === 'TERMINAL' && renderTerminal()}
            {activeTab === 'OUTPUT' && renderOutput()}
            {activeTab === 'PROBLEMS' && renderProblems()}
        </div>
    );
};

export default TerminalPanel;

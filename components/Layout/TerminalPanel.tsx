import React, { useEffect, useRef, useState, useMemo } from 'react';
import { TerminalLine, Problem, TerminalInstance } from '../../types';
import { CheckIcon, XIcon, XCircleIcon, BugIcon, TerminalIcon, PlayIcon, TrashIcon, CopyIcon, PlusIcon, LayoutSidebarRightIcon, BotIcon, MaximizeIcon, MinimizeIcon, ActivityIcon } from '../UI/Icons';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import 'xterm/css/xterm.css';
import { webContainerService } from '../../services/webContainerService';
import { ExternalLink, ChevronRight } from 'lucide-react';

// Clarinet Commands Database
const CLARINET_COMMANDS = [
    // --- Initialize a new project ---
    {
        name: 'clarinet new',
        usage: 'clarinet new [OPTIONS] <NAME>',
        description: 'Creates a new project with all necessary configuration files and directory structure.',
        options: [
            { flag: '--disable-telemetry', description: 'Do not provide developer usage telemetry for this project' }
        ]
    },

    // --- Manage your contracts ---
    {
        name: 'clarinet contracts new',
        usage: 'clarinet contracts new <COMMAND> <OPTIONS>',
        description: 'Generate files and settings for a new contract.'
    },
    {
        name: 'clarinet contracts rm',
        usage: 'clarinet contracts rm <COMMAND> <OPTIONS>',
        description: 'Remove files and settings for a contract.',
        options: [
            { flag: '--manifest-path <path>', description: 'Path to Clarinet.toml' }
        ]
    },

    // --- Validate your contracts ---
    {
        name: 'clarinet check',
        usage: 'clarinet check [FILE] [OPTIONS]',
        description: 'Checks contracts syntax and performs type checking.',
        options: [
            { flag: '--manifest-path <path>', short: '-m', description: 'Path to Clarinet.toml' },
            { flag: '--deployment-plan-path <path>', short: '-p', description: 'If specified, use this deployment file' },
            { flag: '--use-on-disk-deployment-plan', short: '-d', description: 'Use on disk deployment plan (prevent updates computing)' },
            { flag: '--use-computed-deployment-plan', short: '-c', description: 'Use computed deployment plan (will overwrite on disk version if any update)' },
            { flag: '--enable-clarity-wasm', description: 'Allow the Clarity Wasm preview to run in parallel with the Clarity interpreter (beta)' }
        ]
    },

    // --- Interact with your contracts in a local REPL ---
    {
        name: 'clarinet console',
        usage: 'clarinet console [OPTIONS]',
        description: 'Loads contracts in a REPL for an interactive session.',
        options: [
            { flag: '--manifest-path <path>', short: '-m', description: 'Path to Clarinet.toml' },
            { flag: '--deployment-plan-path <path>', short: '-p', description: 'If specified, use this deployment file' },
            { flag: '--use-on-disk-deployment-plan', short: '-d', description: 'Use on disk deployment plan (prevent updates computing)' },
            { flag: '--use-computed-deployment-plan', short: '-c', description: 'Use computed deployment plan (will overwrite on disk version if any update)' },
            { flag: '--enable-remote-data', short: '-r', description: 'Enable remote data fetching from mainnet or a testnet' },
            { flag: '--remote-data-api-url <url>', short: '-a', description: 'Set a custom Stacks Blockchain API URL for remote data fetching' },
            { flag: '--remote-data-initial-height <height>', short: '-b', description: 'Initial remote Stacks block height' },
            { flag: '--enable-clarity-wasm', description: 'Allow the Clarity Wasm preview to run in parallel with the Clarity interpreter (beta)' }
        ],
        repl_commands: [
            '::help', '::functions', '::keywords', '::describe', '::toggle_costs', '::toggle_timings', 
            '::mint_stx', '::set_tx_sender', '::get_assets_maps', '::get_contracts', '::get_block_height', 
            '::advance_chain_tip', '::advance_stacks_chain_tip', '::advance_burn_chain_tip', '::set_epoch', 
            '::get_epoch', '::debug', '::trace', '::get_costs', '::reload', '::read', '::encode', '::decode'
        ]
    },

    // --- Start a local development network ---
    {
        name: 'clarinet devnet start',
        usage: 'clarinet devnet start [OPTIONS]',
        description: 'Start a local Devnet network for interacting with your contracts.',
        options: [
            { flag: '--manifest-path <path>', short: '-m', description: 'Path to Clarinet.toml' },
            { flag: '--no-dashboard', description: 'Display streams of logs instead of terminal UI dashboard' },
            { flag: '--deployment-plan-path <path>', short: '-p', description: 'If specified, use this deployment file' },
            { flag: '--use-on-disk-deployment-plan', short: '-d', description: 'Use on disk deployment plan (prevent updates computing)' },
            { flag: '--use-computed-deployment-plan', short: '-c', description: 'Use computed deployment plan (will overwrite on disk version if any update)' },
            { flag: '--package <path>', description: "Path to Package.json produced by 'clarinet devnet package'" }
        ]
    },
    {
        name: 'clarinet devnet package',
        usage: 'clarinet devnet package [OPTIONS]',
        description: 'Generate package of all required devnet artifacts.',
        options: [
            { flag: '--name <name>', short: '-n', description: 'Output json file name' },
            { flag: '--manifest-path <path>', short: '-m', description: 'Path to Clarinet.toml' }
        ]
    },

    // --- Manage your deployments ---
    {
        name: 'clarinet deployments check',
        usage: 'clarinet deployments check [OPTIONS]',
        description: 'Check deployments format.',
        options: [
            { flag: '--manifest-path <path>', description: 'Path to Clarinet.toml' }
        ]
    },
    {
        name: 'clarinet deployments generate',
        usage: 'clarinet deployments generate [OPTIONS]',
        description: 'Generate new deployment.',
        options: [
            { flag: '--simnet', description: 'Generate a deployment file for simnet environments (console, tests)' },
            { flag: '--devnet', description: 'Generate a deployment file for devnet, using settings/Devnet.toml' },
            { flag: '--testnet', description: 'Generate a deployment file for testnet, using settings/Testnet.toml' },
            { flag: '--mainnet', description: 'Generate a deployment file for mainnet, using settings/Mainnet.toml' },
            { flag: '--manifest-path <path>', description: 'Path to Clarinet.toml' },
            { flag: '--no-batch', description: 'Generate a deployment file without trying to batch transactions (simnet only)' },
            { flag: '--low-cost', description: 'Compute and set cost, using low priority (network connection required)' },
            { flag: '--medium-cost', description: 'Compute and set cost, using medium priority (network connection required)' },
            { flag: '--high-cost', description: 'Compute and set cost, using high priority (network connection required)' },
            { flag: '--manual-cost', description: 'Leave cost estimation manual' }
        ]
    },
    {
        name: 'clarinet deployments apply',
        usage: 'clarinet deployments apply [OPTIONS]',
        description: 'Apply deployment.',
        options: [
            { flag: '--devnet', description: 'Apply default deployment settings/default.devnet-plan.toml' },
            { flag: '--testnet', description: 'Apply default deployment settings/default.testnet-plan.toml' },
            { flag: '--mainnet', description: 'Apply default deployment settings/default.mainnet-plan.toml' },
            { flag: '--manifest-path <path>', short: '-m', description: 'Path to Clarinet.toml' },
            { flag: '--deployment-plan-path <path>', short: '-p', description: 'Apply deployment plan specified' },
            { flag: '--no-dashboard', description: 'Display streams of logs instead of terminal UI dashboard' },
            { flag: '--use-on-disk-deployment-plan', short: '-d', description: 'Use on disk deployment plan (prevent updates computing)' },
            { flag: '--use-computed-deployment-plan', short: '-c', description: 'Use computed deployment plan (will overwrite on disk version if any update)' }
        ]
    },

    // --- Interact with Mainnet contracts ---
    {
        name: 'clarinet requirements add',
        usage: 'clarinet requirements <COMMAND>',
        description: 'Add a mainnet contract as a dependency to your project.',
        options: [
            { flag: '--manifest-path <path>', description: 'Path to Clarinet.toml' }
        ]
    },

    // --- Editor Integrations & Debugging ---
    {
        name: 'clarinet lsp',
        usage: 'clarinet lsp',
        description: 'Starts the Language Server Protocol service for Clarity, enabling intelligent code completion, error highlighting, and other IDE features in supported editors.'
    },
    {
        name: 'clarinet dap',
        usage: 'clarinet dap',
        description: 'Starts the Debug Adapter Protocol service, enabling debugging features like breakpoints, step-through execution, and variable inspection in supported editors.'
    },

    // --- Format your code ---
    {
        name: 'clarinet format',
        usage: 'clarinet format [OPTIONS]',
        description: 'Formats Clarity code files according to standard conventions.',
        options: [
            { flag: '--check', description: 'Check if code is formatted without modifying files', required: false },
            { flag: '--dry-run', description: 'Only echo the result of formatting', required: false },
            { flag: '--in-place', description: 'Replace the contents of a file with the formatted code', required: false },
            { flag: '--manifest-path <path>', short: '-m', description: 'Path to Clarinet.toml', required: false },
            { flag: '--file <file>', short: '-f', description: 'If specified, format only this file', required: false },
            { flag: '--max-line-length <length>', short: '-l', description: 'Maximum line length', required: false },
            { flag: '--indent <size>', short: '-i', description: 'Indentation size, e.g. 2', required: false },
            { flag: '--tabs', short: '-t', description: 'Use tabs instead of spaces', required: false }
        ]
    },

    // --- Utilities ---
    {
        name: 'clarinet completions',
        usage: 'clarinet completions <SHELL>',
        description: 'Generates shell completion scripts for your shell.',
        supported_shells: ['bash', 'zsh', 'fish', 'powershell', 'elvish'],
        options: [
            { flag: '--shell <shell>', short: '-s', description: 'Specify which shell to generation completions script for' }
        ]
    },

    // --- Environment Variables ---
    {
        name: 'CLARINET_MANIFEST_PATH',
        type: 'Environment Variable',
        description: 'Specifies the path to the Clarinet.toml project file.',
        example: 'export CLARINET_MANIFEST_PATH=/path/to/project'
    }
];

interface TerminalPanelProps {
    terminals: TerminalInstance[];
    activeTerminalId: string;
    outputLines: string[];
    problems: Problem[];
    height: number;
    theme: 'dark' | 'light';
    onClearTerminal: () => void;
    onAddTerminal: (type?: 'server' | 'webcontainer') => void;
    onRemoveTerminal: (id: string) => void;
    onSwitchTerminal: (id: string) => void;
    onCommand?: (command: string) => void;
    onLocateProblem?: (file: string, line: number, column: number) => void;
    onOpenStxerDebugger?: (txId: string) => void;
    onAskAI?: (problem: Problem) => void;
    isMaximized?: boolean;
    onMaximize?: () => void;
    onKillProcess?: (id: string) => void;
    pendingCommand?: { command: string, terminalId: string, timestamp: number } | null;
    onClearPendingCommand?: () => void;
    dirtyFileIds?: string[];
    onSaveFile?: () => void;
}

type TerminalTab = 'TERMINAL' | 'OUTPUT' | 'PROBLEMS' | 'PROCESSES';

const TerminalRow: React.FC<{
    line: TerminalLine;
    theme: 'dark' | 'light';
    onOpenStxerDebugger?: (txId: string) => void;
}> = ({ line, theme, onOpenStxerDebugger }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const renderLinkifiedText = (text: string) => {
        // Regex to match URLs starting with http/https OR common domain patterns
        const urlRegex = /((?:https?:\/\/|www\.)[^\s]+|(?:\b[a-z0-9][a-z0-9-]*\.(?:com|net|org|edu|gov|io|xyz|info|edu|gov|mil|biz|me|tv|sh|dev)\b(?:[^\s]*)))/gi;
        const parts = text.split(urlRegex);

        return parts.map((part, i) => {
            if (part && part.match(urlRegex)) {
                let url = part;
                if (!url.startsWith('http')) {
                    url = `https://${url}`;
                }
                return (
                    <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline cursor-pointer transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

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

        if (line.type === 'info' && line.data?.action === 'debug') {
            return (
                <div className="flex flex-col gap-2 py-2 px-3 my-1 bg-labstx-orange/5 border border-caspier-border animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8  bg-gray-800  rounded-lg border border-caspier-border flex items-center justify-center p-1.5">
                            <img src="/stxer.svg" alt="Stxer" className="w-full h-full object-contain " />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-caspier-text font-bold">Debug with stxer.xyz</p>
                            <p className="text-[9px] text-caspier-muted uppercase tracking-widest font-black opacity-50">Stxer Smart Contract Debugger</p>
                        </div>
                        <button
                            onClick={() => onOpenStxerDebugger?.(line.data.txId)}
                            className="flex items-center px-4 py-1.5 bg-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-labstx-orange/50 transition-all active:scale-95"
                        >
                            <ExternalLink className="w-3 h-3 mr-2" />
                            Debug Contract Function
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex gap-2 items-start py-0.5">
                {line.type === 'command' && <span className="text-caspier-red font-bold shrink-0">{line.prompt || '➜  ~'}</span>}
                <span className={`break-words whitespace-pre-wrap font-mono ${line.type === 'error' ? 'text-red-500' :
                    line.type === 'success' ? 'text-green-500' :
                        line.type === 'command' ? 'text-caspier-text' :
                            line.type === 'query' ? 'text-blue-400' :
                                'text-caspier-muted'
                    }`}>
                    {renderLinkifiedText(line.content)}
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

const TerminalPanel: React.FC<TerminalPanelProps> = ({
    terminals,
    activeTerminalId,
    onAddTerminal,
    onRemoveTerminal,
    onSwitchTerminal,
    outputLines,
    problems,
    height,
    theme,
    onClearTerminal,
    onCommand,
    onLocateProblem,
    onOpenStxerDebugger,
    onAskAI,
    isMaximized,
    onMaximize,
    onKillProcess,
    pendingCommand,
    onClearPendingCommand,
    dirtyFileIds = [],
    onSaveFile
}) => {
    const [activeTab, setActiveTab] = useState<TerminalTab>('TERMINAL');
    const lastCommandTimestamp = useRef<number>(0);
    const [inputValue, setInputValue] = useState('');
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [draftInput, setDraftInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);
    const [isTabsCollapsed, setIsTabsCollapsed] = useState(false);
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [pendingCommandToExecute, setPendingCommandToExecute] = useState<string | null>(null);
    
    // Autocomplete state
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [filteredCommands, setFilteredCommands] = useState<typeof CLARINET_COMMANDS>([]);
    const [selectedCommandIndex, setSelectedCommandIndex] = useState(-1);
    const [expandedCommandDescriptions, setExpandedCommandDescriptions] = useState<Record<string, boolean>>({});
    const autocompleteRef = useRef<HTMLDivElement>(null);

    const activeTerminal = terminals.find(t => t.id === activeTerminalId) || terminals[0];

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
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeTerminal.lines, activeTab]);

    // Handle clicking outside autocomplete
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
                const input = document.getElementById('terminal-input');
                if (!input?.contains(event.target as Node)) {
                    setShowAutocomplete(false);
                }
            }
        };

        if (showAutocomplete) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showAutocomplete]);

    // Scroll selected autocomplete item into view
    useEffect(() => {
        if (showAutocomplete && autocompleteRef.current && selectedCommandIndex >= 0) {
            const items = autocompleteRef.current.querySelectorAll('[class*="border-b"]');
            const selectedItem = items[selectedCommandIndex] as HTMLElement;
            if (selectedItem) {
                selectedItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedCommandIndex, showAutocomplete]);

    const getTabIcon = (tab: TerminalTab) => {
        switch (tab) {
            case 'TERMINAL': return <TerminalIcon className="w-3.5 h-3.5" />;
            case 'OUTPUT': return <PlayIcon className="w-3.5 h-3.5" />;
            case 'PROBLEMS': return <BugIcon className="w-3.5 h-3.5" />;
            case 'PROCESSES': return <ActivityIcon className="w-3.5 h-3.5" />;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cmd = inputValue.trim();
        if (cmd) {
            // Check if there are dirty files
            if (dirtyFileIds && dirtyFileIds.length > 0) {
                // Show dialog instead of executing immediately
                setPendingCommandToExecute(cmd);
                setShowUnsavedDialog(true);
            } else {
                // No dirty files, execute command immediately
                executeCommand(cmd);
            }
        }
    };

    const executeCommand = (cmd: string) => {
        if (onCommand) {
            onCommand(cmd);
            setCommandHistory(prev => {
                const newHistory = [cmd, ...prev.filter(c => c !== cmd)].slice(0, 50);
                return newHistory;
            });
            setInputValue('');
            setHistoryIndex(-1);
            setDraftInput('');
        }
    };

    const handleSaveAndContinue = () => {
        setShowUnsavedDialog(false);
        // Save the files first
        if (onSaveFile) {
            onSaveFile();
        }
        // Execute the command after a short delay to ensure save completes
        if (pendingCommandToExecute) {
            setTimeout(() => {
                executeCommand(pendingCommandToExecute);
                setPendingCommandToExecute(null);
            }, 100);
        }
    };

    const handleDiscardAndContinue = () => {
        setShowUnsavedDialog(false);
        if (pendingCommandToExecute) {
            executeCommand(pendingCommandToExecute);
            setPendingCommandToExecute(null);
        }
    };

    const handleCancelCommand = () => {
        setShowUnsavedDialog(false);
        setPendingCommandToExecute(null);
    };

    const filterAutocompleteCommands = (input: string) => {
        if (!input.trim()) {
            setShowAutocomplete(false);
            setFilteredCommands([]);
            setSelectedCommandIndex(-1);
            return;
        }

        const lowerInput = input.toLowerCase().trim();
        
        // Filter commands by name match (substring search)
        const filtered = CLARINET_COMMANDS.filter(cmd => 
            cmd.name.toLowerCase().includes(lowerInput)
        );

        // Show autocomplete if we have matches and input looks like a clarinet command
        // (starts with 'c', contains 'clar', or is a known command word)
        if (filtered.length > 0) {
            const isClarinet = lowerInput.length >= 1 && (
                lowerInput.startsWith('c') ||
                lowerInput.includes('clar') ||
                lowerInput.includes('check') ||
                lowerInput.includes('console') ||
                lowerInput.includes('deploy') ||
                lowerInput.includes('test') ||
                lowerInput.includes('new') ||
                lowerInput.includes('format') ||
                lowerInput.includes('devnet') ||
                lowerInput.includes('lsp') ||
                lowerInput.includes('dap') ||
                lowerInput.includes('requirement') ||
                lowerInput.includes('contract')
            );

            if (isClarinet) {
                setShowAutocomplete(true);
                setFilteredCommands(filtered);
                setSelectedCommandIndex(0);
            } else {
                setShowAutocomplete(false);
                setFilteredCommands([]);
                setSelectedCommandIndex(-1);
            }
        } else {
            setShowAutocomplete(false);
            setFilteredCommands([]);
            setSelectedCommandIndex(-1);
        }
    };

    const selectAutocompleteCommand = (commandName: string) => {
        setInputValue(commandName);
        setShowAutocomplete(false);
        setFilteredCommands([]);
        setSelectedCommandIndex(-1);
    };

    const toggleCommandDescription = (commandName: string) => {
        setExpandedCommandDescriptions(prev => ({
            ...prev,
            [commandName]: !prev[commandName]
        }));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'c' && e.ctrlKey && activeTerminal.isProcessRunning && onKillProcess) {
            e.preventDefault();
            onKillProcess(activeTerminalId);
            return;
        }

        // Autocomplete navigation
        if (showAutocomplete && filteredCommands.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedCommandIndex(prev => 
                    prev < filteredCommands.length - 1 ? prev + 1 : prev
                );
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedCommandIndex(prev => prev > 0 ? prev - 1 : -1);
                return;
            } else if (e.key === 'Enter' && selectedCommandIndex >= 0) {
                e.preventDefault();
                const selectedCommand = filteredCommands[selectedCommandIndex];
                selectAutocompleteCommand(selectedCommand.name);
                return;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowAutocomplete(false);
                return;
            }
        }

        // Command history navigation
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex === -1) {
                setDraftInput(inputValue);
            }

            const nextIndex = historyIndex + 1;
            if (nextIndex < commandHistory.length) {
                setHistoryIndex(nextIndex);
                setInputValue(commandHistory[nextIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const nextIndex = historyIndex - 1;
                setHistoryIndex(nextIndex);
                setInputValue(commandHistory[nextIndex]);
            } else if (historyIndex === 0) {
                setHistoryIndex(-1);
                setInputValue(draftInput);
            }
        }
    };

    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRefs = useRef<Record<string, {
        terminal: Terminal,
        fitAddon: FitAddon,
        shellProcess?: any,
        inputWriter?: WritableStreamDefaultWriter
    }>>({});
    const terminalInitialized = useRef<Record<string, boolean>>({});


    useEffect(() => {
        if (activeTab !== 'TERMINAL' || !terminalRef.current || activeTerminal.type !== 'webcontainer') return;

        let xtermData = xtermRefs.current[activeTerminalId];

        if (!xtermData) {
            const term = new Terminal({
                cursorBlink: true,
                fontSize: 12,
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                theme: {
                    background: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                    foreground: theme === 'dark' ? '#e5e5e5' : '#1a1a1a',
                    cursor: '#007bff',
                    selectionBackground: theme === 'dark' ? 'rgba(0, 123, 255, 0.3)' : 'rgba(0, 123, 255, 0.2)',
                },
                allowProposedApi: true,
                scrollOnUserInput: true
            });

            const fitAddon = new FitAddon();
            term.loadAddon(fitAddon);
            term.loadAddon(new WebLinksAddon());

            xtermData = { terminal: term, fitAddon };
            xtermRefs.current[activeTerminalId] = xtermData;

            // Handle Input
            term.onData(async (data) => {
                const currentData = xtermRefs.current[activeTerminalId];
                if (currentData?.inputWriter) {
                    try {
                        await currentData.inputWriter.write(data);
                    } catch (err) {
                        console.error('[Terminal] Failed to write to shell:', err);
                    }
                }
            });

            startWebContainerShell(activeTerminalId);
        } else {
            // Update theme for existing terminal
            xtermData.terminal.options.theme = {
                background: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                foreground: theme === 'dark' ? '#e5e5e5' : '#1a1a1a',
                cursor: '#007bff',
                selectionBackground: theme === 'dark' ? 'rgba(0, 123, 255, 0.3)' : 'rgba(0, 123, 255, 0.2)',
            };
        }

        // Attach to DOM only if not already attached to THIS container
        if (terminalRef.current && !terminalRef.current.contains(xtermData.terminal.element as Node)) {
            if (terminalRef.current.firstChild) {
                terminalRef.current.removeChild(terminalRef.current.firstChild);
            }
            xtermData.terminal.open(terminalRef.current);
        }

        // Always fit, focus, and scroll to bottom when switching to/showing this terminal
        setTimeout(() => {
            const ref = xtermRefs.current[activeTerminalId];
            if (ref) {
                ref.fitAddon.fit();
                ref.terminal.focus();
                ref.terminal.scrollToBottom();
            }
        }, 50);

        // Add ResizeObserver to handle dynamic height changes (like panel resizing)
        const resizeObserver = new ResizeObserver(() => {
            const ref = xtermRefs.current[activeTerminalId];
            if (ref) {
                try {
                    ref.fitAddon.fit();
                } catch (e) {
                    // Ignore errors during layout transitions
                }
            }
        });

        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };

    }, [activeTerminalId, activeTab, height, theme]);

    // Handle programmatically executed commands
    useEffect(() => {
        if (pendingCommand && pendingCommand.timestamp > lastCommandTimestamp.current) {
            lastCommandTimestamp.current = pendingCommand.timestamp;

            // If the command was sent to "temp", it means a new terminal was just created 
            // for it, and it should be the active one.
            const targetId = pendingCommand.terminalId === 'temp' ? activeTerminalId : pendingCommand.terminalId;

            const data = xtermRefs.current[targetId];
            if (data && data.inputWriter) {
                data.inputWriter.write(pendingCommand.command + '\r');
                onClearPendingCommand?.();
            }
        }
    }, [pendingCommand, activeTerminalId, onClearPendingCommand]);

    // Update terminal when new lines arrive (for server terminals - keep just in case of output sync)
    useEffect(() => {
        if (activeTerminal.type === 'server' && activeTab === 'TERMINAL') {
            // For server type, we might want to sync lines to xterm if we were using it, 
            // but we reverted to TerminalRow. So we don't need to write to xterm here.
        }
    }, [activeTerminal.lines]);

    const startWebContainerShell = async (id: string) => {
        try {
            // Ensure WebContainer is booted before spawning
            const wc = await webContainerService.boot();
            if (!wc) return;

            const xtermData = xtermRefs.current[id];
            if (!xtermData) return;

            const shellProcess = await wc.spawn('jsh', {
                terminal: {
                    cols: xtermData.terminal.cols,
                    rows: xtermData.terminal.rows,
                },
            });

            xtermData.shellProcess = shellProcess;
            xtermData.inputWriter = shellProcess.input.getWriter();

            shellProcess.output.pipeTo(new WritableStream({
                write(data) {
                    xtermData.terminal.write(data);
                    // Always scroll to bottom when new output arrives (including typed character echoes)
                    xtermData.terminal.scrollToBottom();
                },
            }));
        } catch (err) {
            console.error('[Terminal] Failed to start shell:', err);
            xtermRefs.current[id]?.terminal.write('\r\n\x1b[31mFailed to start WebContainer shell\x1b[0m\r\n');
        }
    };

    const renderTerminalTabs = () => (
        <div className={`${isTabsCollapsed ? 'w-12' : 'w-48'} border-l border-caspier-border flex flex-col p-2 text-caspier-muted transition-all duration-300 ease-in-out`}>
            <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
                {terminals.map((t, idx) => (
                    <div
                        key={t.id}
                        className={`flex ${isTabsCollapsed ? 'justify-center' : 'justify-between'} items-center px-2 py-1.5 rounded cursor-pointer transition-colors border group ${t.id === activeTerminalId
                            ? 'bg-caspier-dark border-gray-400/50  text-labstx-orange'
                            : 'hover:bg-caspier-hover border-transparent hover:border-caspier-border'
                            }`}
                        onClick={() => onSwitchTerminal(t.id)}
                        title={isTabsCollapsed ? t.title : ''}
                    >
                        <div className={`flex items-center ${isTabsCollapsed ? 'justify-center' : 'gap-1.5'} overflow-hidden`}>
                            <TerminalIcon className={`w-3 h-3 shrink-0 ${t.id === activeTerminalId ? 'text-labstx-orange' : 'text-caspier-muted opacity-50'}`} />
                            {!isTabsCollapsed && (
                                <span className="text-[10px] font-bold tracking-tight uppercase truncate">{t.title}</span>
                            )}
                        </div>

                        {!isTabsCollapsed && terminals.length > 1 && (
                            <button
                                className="hover:text-caspier-red transition-colors ml-1 opacity-0 group-hover:opacity-100 shrink-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveTerminal(t.id);
                                }}
                            >
                                <XIcon className="w-2.5 h-2.5" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderTerminal = () => {
        if (activeTerminal.type === 'webcontainer') {
            return (
                <div className="flex-1 h-full flex flex-row overflow-hidden font-mono text-xs bg-caspier-black">
                    <div
                        className="flex-1 h-full overflow-hidden relative flex flex-col"
                        onClick={() => {
                            const data = xtermRefs.current[activeTerminalId];
                            if (data) {
                                data.terminal.focus();
                                data.terminal.scrollToBottom();
                            }
                        }}
                    >
                        <div ref={terminalRef} className="flex-1 h-full w-full pt-4" />
                    </div>
                    {renderTerminalTabs()}
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-row overflow-hidden font-mono text-xs bg-caspier-black">
                <div
                    className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar"
                    onClick={() => {
                        document.getElementById('terminal-input')?.focus();
                        scrollToBottom();
                    }}
                >
                    {activeTerminal.lines.map((line) => (
                        <TerminalRow
                            key={line.id}
                            line={line}
                            theme={theme}
                            onOpenStxerDebugger={onOpenStxerDebugger}
                        />
                    ))}

                    <form onSubmit={handleSubmit} className="flex gap-2 items-center mt-2 group relative">
                        <span className="text-caspier-red font-bold shrink-0">{activeTerminal.isProcessRunning ? `${activeTerminal.title} >>` : '➜  ~'}</span>
                        <div className="flex-1 relative">
                            <input
                                id="terminal-input"
                                type="text"
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    if (historyIndex === -1) setDraftInput(e.target.value);
                                    filterAutocompleteCommands(e.target.value);
                                }}
                                onKeyDown={handleKeyDown}
                                className="flex-1 w-full bg-transparent border-none outline-none text-caspier-text font-mono text-xs p-0 focus:ring-0"
                                placeholder={activeTerminal.isProcessRunning ? `` : `Type 'clarinet ...' for local dev tools`}
                                autoComplete="off"
                                autoFocus
                            />
                            
                            {/* Autocomplete Dropdown */}
                          
                        </div>
                        {activeTerminal.isProcessRunning && onKillProcess && (
                            <button
                                type="button"
                                onClick={() => onKillProcess(activeTerminalId)}
                                className="p-1 items-center flex gap-1 -ml-1 mr-1 text-caspier-muted hover:text-red-500 transition-colors"
                                title="Kill Process (Ctrl+C)"
                            >
                                <XCircleIcon className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </form>

                    {!inputValue && (
                        <div className="flex gap-2 items-center mt-0.5 opacity-30">
                            <span className="text-caspier-red font-bold invisible">➜  ~</span>
                            <span className="w-2 h-4 bg-caspier-muted animate-pulse"></span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                {renderTerminalTabs()}
            </div>
        );
    };

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
                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border border-caspier-border text-caspier-muted hover:text-labstx-orange hover:border-caspier-border hover:bg-labstx-orange/10 transition-all"
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
                                        {/* Ask AI button */}
                                        {onAskAI && (
                                            <button
                                                onClick={() => onAskAI(prob)}
                                                title="Ask AI for a fix"
                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border border-caspier-border text-caspier-muted hover:text-blue-400 hover:border-blue-400/50 hover:bg-blue-400/10 transition-all"
                                            >
                                                <BotIcon className="w-3 h-3" />
                                                <span>Fix</span>
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

    const renderProcesses = () => {
        const runningProcesses = terminals.filter(t => t.isProcessRunning);
        return (
            <div className="flex-1 overflow-y-auto p-0 text-xs bg-caspier-black">
                {runningProcesses.length === 0 ? (
                    <div className="p-4 text-caspier-muted italic flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-green-500" />
                        No background processes currently running.
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-caspier-panel text-caspier-muted font-bold sticky top-0 border-b border-caspier-border">
                            <tr>
                                <th className="p-2 w-8"></th>
                                <th className="p-2">Process Name</th>
                                <th className="p-2 w-32 text-right pr-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {runningProcesses.map(proc => (
                                <tr key={proc.id} className="border-b border-caspier-border hover:bg-caspier-hover bg-caspier-black/20 group">
                                    <td className="p-2 text-center">
                                        <ActivityIcon className="w-4 h-4 text-blue-400 inline" />
                                    </td>
                                    <td className="p-2 text-caspier-text font-mono">{proc.title || 'Unknown Process'}</td>
                                    <td className="p-2">
                                        <div className="flex items-center justify-end gap-1 pr-1">
                                            {onKillProcess && (
                                                <button
                                                    onClick={() => onKillProcess(proc.id)}
                                                    title="Kill Process"
                                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border border-caspier-border text-caspier-muted hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/10 transition-all"
                                                >
                                                    <XCircleIcon className="w-3 h-3" />
                                                    <span>Kill</span>
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
    };

    return (
        <div id="terminal-panel" className="bg-caspier-black border-t border-caspier-border w-full flex flex-col" style={{ height: `${height}px` }}>
            <div className="flex border-b border-caspier-border bg-caspier-panel h-8 justify-between items-center pr-2">
                <div className="flex h-full">
                    {(['TERMINAL', 'OUTPUT', 'PROBLEMS', 'PROCESSES'] as TerminalTab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border-t-2 transition-all h-full ${activeTab === tab
                                ? `text-caspier-red border-caspier-red bg-caspier-black`
                                : 'text-caspier-muted border-transparent hover:text-caspier-text hover:bg-caspier-hover'
                                }`}
                        >
                            {getTabIcon(tab)}
                            <span>{tab}</span>
                            {tab === 'PROBLEMS' && problems.length > 0 && <span className="ml-0.5 opacity-50">({problems.length})</span>}
                            {tab === 'PROCESSES' && terminals.filter(t => t.isProcessRunning).length > 0 && <span className="ml-0.5 text-blue-400 font-bold">({terminals.filter(t => t.isProcessRunning).length})</span>}
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
                    {activeTab === 'TERMINAL' && (
                        <div className="flex items-center gap-1 ml-4 border-l border-caspier-border pl-2 mr-2">
                            <div className="flex justify-between items-center  px-1 ">
                                <span className="text-[9px] opacity-40 px-1.5 py-0.5 bg-caspier-dark rounded border border-caspier-border hidden sm:inline">
                                    {activeTerminal.lines.length} lines
                                </span>
                                <button
                                    onClick={() => onAddTerminal('server')}
                                    className="p-1 hover:text-labstx-orange transition-colors flex items-center justify-center opacity-60 hover:opacity-100"
                                    title="New Server Terminal (bash)"
                                >
                                    <PlusIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => onAddTerminal('webcontainer')}
                                    className="flex items-center justify-center px-3 py-1 hover:text-blue-400 transition-colors bg-caspier-black border border-caspier-border rounded-full opacity-60 hover:opacity-100 text-[10px]"
                                    title="New WebContainer Terminal (node)"
                                >
                                    <TerminalIcon className="w-3.5 h-3.5 mr-1" /> <p>Node Terminal</p>
                                </button>
                            </div>
                            {terminals.length > 0 && (
                                <button
                                    onClick={onClearTerminal}
                                    className="p-1 px-2 flex items-center gap-1.5 text-caspier-muted hover:text-caspier-red transition-colors text-[10px] uppercase font-bold group"
                                    title="Clear Terminal"
                                >
                                    <TrashIcon className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                    <span className=" transition-opacity whitespace-nowrap">Clear</span>
                                </button>
                            )}
                            <button
                                onClick={onMaximize}
                                className={`hidden p-1 px-2 flex items-center gap-1.5 transition-colors text-[10px] uppercase font-bold group ${isMaximized ? 'text-labstx-orange' : 'text-caspier-muted hover:text-labstx-orange'}`}
                                title={isMaximized ? "Minimize Terminal" : "Maximize Terminal"}
                            >
                                {isMaximized ? (
                                    <MinimizeIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                ) : (
                                    <MaximizeIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                )}
                                <span className="transition-opacity whitespace-nowrap">{isMaximized ? 'Minimize' : 'Maximize'}</span>
                            </button>
                            <button
                                onClick={() => setIsTabsCollapsed(!isTabsCollapsed)}
                                className={`p-1 hover:text-labstx-orange transition-all duration-200 opacity-60 hover:opacity-100 ${isTabsCollapsed ? 'rotate-180' : ''}`}
                                title={isTabsCollapsed ? "Expand Tabs" : "Collapse Tabs"}
                            >
                                <LayoutSidebarRightIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {activeTab === 'TERMINAL' && renderTerminal()}
            {activeTab === 'OUTPUT' && renderOutput()}
            {activeTab === 'PROBLEMS' && renderProblems()}
            {activeTab === 'PROCESSES' && renderProcesses()}

            {/* Unsaved Files Dialog */}
            {showUnsavedDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-caspier-panel border border-caspier-border rounded-lg shadow-xl max-w-md w-11/12 animate-in scale-in duration-200">
                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-labstx-orange/20 border border-labstx-orange/40 flex items-center justify-center shrink-0">
                                    <span className="text-labstx-orange text-xl font-bold">!</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-caspier-text mb-1">Unsaved Files Detected</h3>
                                    <p className="text-[10px] text-caspier-muted">
                                        You have <span className="font-semibold text-labstx-orange">{dirtyFileIds?.length || 0} file{dirtyFileIds?.length !== 1 ? 's' : ''}</span> with unsaved changes.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-caspier-dark/50 border border-caspier-border rounded p-3">
                                <p className="text-xs text-caspier-muted font-mono mb-2 uppercase font-bold opacity-70">Pending Command:</p>
                                <p className="text-[10px] font-mono text-blue-400 break-all">
                                    {pendingCommandToExecute}
                                </p>
                            </div>

                            <p className="text-[10px] text-caspier-muted">
                                Would you like to save your changes before executing this command?
                            </p>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleCancelCommand}
                                    className="flex px-4 py-2 rounded-lg border border-caspier-border text-caspier-text hover:bg-caspier-hover transition-colors text-[10px] font-bold uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDiscardAndContinue}
                                    className="flex px-4 py-2 rounded-lg bg-caspier-dark/50 border border-caspier-border text-caspier-text hover:bg-caspier-dark transition-colors text-[10px] font-bold uppercase tracking-wider"
                                >
                                    Discard & Continue
                                </button>
                                <button
                                    onClick={handleSaveAndContinue}
                                    className="flex px-4 py-2 rounded-lg bg-labstx-orange/20 border border-labstx-orange/40 text-labstx-orange hover:bg-labstx-orange/30 transition-colors text-[10px] font-bold uppercase tracking-wider"
                                >
                                    Save & Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TerminalPanel;

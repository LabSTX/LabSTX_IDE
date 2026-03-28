import React, { useState, useRef, useEffect, useMemo, useImperativeHandle } from 'react';
import { generateAIResponse, streamAIResponse } from '../../services/aiService';
import { ChatMessage, FileNode, WalletConnection } from '../../types';
import { Button } from '../UI/Button';
import { BotIcon, SendIcon, XIcon, SmartFileIcon, CheckIcon, ChevronDownIcon, GridIcon, PlusIcon, GitHubIcon, LoaderIcon, RocketIcon, CopyIcon, RefreshIcon, WalletIcon } from '../UI/Icons';
import { ProjectSettings } from '../../types';
import { useGitHubAuth } from '../../contexts/GitHubAuthContext';
import { DollarSign, Check } from 'lucide-react';

interface SidebarRightProps {
    currentCode: string;
    files: FileNode[];
    activeFileName?: string;
    width: number;
    settings: ProjectSettings;
    onClose: () => void;
    onUpdateFile: (fileId: string, content: string) => void;
    onCreateFile: (name: string, content: string) => void;
    theme: 'dark' | 'light';
    wallet: WalletConnection;
    sessionId?: string;
    isQuotaExceeded?: boolean;
    onOpenAccountSettings?: () => void;
    onInteraction?: () => void;
    onConnectWallet?: () => void;
}

interface CodeBlockProps {
    language?: string;
    content: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, content }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-4 rounded-lg border border-caspier-border bg-caspier-dark/50 overflow-hidden w-full transition-colors hover:border-caspier-border/80">
            <div className="flex justify-between items-center px-4 py-2 bg-caspier-panel border-b border-caspier-border">
                <span className="text-xs text-caspier-muted font-mono">{language || 'text'}</span>
                <button
                    onClick={handleCopy}
                    className="text-xs font-medium text-caspier-muted hover:text-caspier-text flex items-center gap-1.5 transition-colors"
                >
                    {copied ? <CheckIcon className="w-3.5 h-3.5 text-green-500" /> : null}
                    {copied ? 'Copied' : 'Copy code'}
                </button>
            </div>
            <div className="p-4 overflow-x-auto">
                <pre className="text-xs font-mono leading-relaxed text-caspier-text">
                    {content.trim()}
                </pre>
            </div>
        </div>
    );
};

interface FileActionBlockProps {
    type: 'UPDATE' | 'CREATE';
    filename: string;
    content: string;
    onApply: () => void;
}




const FileActionBlock: React.FC<FileActionBlockProps> = ({ type, filename, content, onApply }) => {
    const [applied, setApplied] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleApply = () => {
        onApply();
        setApplied(true);
        setTimeout(() => setApplied(false), 3000);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <div className="my-4 rounded-lg border border-caspier-border bg-caspier-panel/50 overflow-hidden w-full">
            <div className="flex justify-between items-center px-4 py-3 bg-caspier-panel border-b border-caspier-border">
                <div className="flex items-center gap-3">
                    <SmartFileIcon name={filename} className="w-4 h-4 text-caspier-muted" />
                    <div>
                        <div className="text-xs text-caspier-muted font-medium">
                            {type === 'UPDATE' ? 'Update File' : 'Create File'}
                        </div>
                        <div className="text-sm text-caspier-text font-semibold">{filename}</div>
                    </div>
                </div>

                {/* Button Container */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        disabled={copied}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${copied
                            ? 'border-green-500/30 bg-green-500/10 text-green-500 cursor-default'
                            : 'border-caspier-border bg-transparent text-caspier-text hover:bg-caspier-border/50 active:bg-caspier-border/70'
                            }`}
                    >
                        {copied ? 'Copied' : 'Copy'}
                    </button>

                    {/* Conditionally render Apply button for .clar files only */}

                    <button
                        onClick={handleApply}
                        disabled={applied}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${applied
                            ? 'bg-green-500/10 text-green-500 cursor-default'
                            : 'bg-caspier-text text-caspier-black hover:bg-caspier-text/90 active:bg-caspier-text/80'
                            }`}
                    >
                        {applied ? 'Applied' : 'Apply Changes'}
                    </button>

                </div>
            </div>
            <div className="p-4 bg-caspier-dark/30 max-h-48 overflow-y-auto">
                <pre className="text-xs font-mono leading-relaxed text-caspier-muted">
                    {content}
                </pre>
            </div>
        </div>
    );
};

interface TableBlockProps {
    content: string;
}

const TableBlock: React.FC<TableBlockProps> = ({ content }) => {
    const lines = content.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return null;

    const parseRow = (row: string) => {
        const cells = row.split('|');
        let result = [...cells];
        if (result[0]?.trim() === '') result.shift();
        if (result[result.length - 1]?.trim() === '') result.pop();
        return result.map(c => c.trim());
    };

    const headers = parseRow(lines[0]);
    const dataRows = lines.slice(2).map(line => parseRow(line));

    return (
        <div className="my-4 rounded-lg border border-caspier-border bg-caspier-panel/40 overflow-hidden w-full transition-all hover:border-caspier-border/80 group">

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="bg-caspier-black/20 border-b border-caspier-border">
                        <tr>
                            {headers.map((header, i) => (
                                <th key={i} className="px-4 py-3 font-semibold text-caspier-text border-r border-caspier-border last:border-0 whitespace-nowrap">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-caspier-border">
                        {dataRows.map((row, i) => (
                            <tr key={i} className="hover:bg-caspier-panel/40 transition-colors group/row">
                                {row.map((cell, j) => (
                                    <td key={j} className="px-4 py-2.5 text-caspier-muted border-r border-caspier-border last:border-0 leading-relaxed font-medium transition-colors group-hover/row:text-caspier-text">
                                        {cell === 'No contract address' ? <strong className="text-caspier-text font-bold">{cell}</strong> : cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export interface SidebarRightHandle {
    sendMessage: (text: string) => void;
}

const QuickPrompts: React.FC<{ onSelect: (prompt: string) => void }> = ({ onSelect }) => {
    const prompts = [
        "What are the best security practices for Clarity?",
        "How do I start as a beginner Clarity dev?",
        "Explain the trait system in Clarity",
        "How to handle STX transfers in a contract?"
    ];

    return (
        <div className="flex flex-wrap gap-2 mb-4 px-2">
            {prompts.map((prompt, i) => (
                <button
                    key={i}
                    onClick={() => onSelect(prompt)}
                    className="text-[11px] px-3 py-1.5 rounded-full bg-blue-300/20 dark:bg-caspier-panel border border-blue-400 text-blue-500 hover:text-blue-600 hover:border-blue-500 transition-all duration-200 text-left max-w-full truncate whitespace-nowrap"
                >
                    {prompt}
                </button>
            ))}
        </div>
    );
};

const WalletConnectionRequired: React.FC<{ theme: 'dark' | 'light', onConnect: () => void }> = ({ theme, onConnect }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-in fade-in zoom-in duration-700">
            <div className="relative mb-8 group">
                <div className="absolute -inset-4 rounded-full group-hover:bg-labstx-orange/20 transition-all duration-500" />
                <div className="w-16 h-16 bg-caspier-panel border border-caspier-border rounded-2xl flex items-center justify-center shadow-xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    <WalletIcon size={32} className="text-labstx-orange" />
                </div>
            </div>
            <h1 className="text-xl font-bold text-caspier-text mb-2 tracking-tight">
                Wallet Connection Required
            </h1>
            <p className="text-sm text-caspier-muted leading-relaxed max-w-[280px] mb-8">
                To interact with <span className="text-labstx-orange font-semibold">LabSTX Assistant</span> and access secure features, please connect your Stacks wallet.
            </p>

            <button
                onClick={onConnect}
                className="w-full max-w-[240px] flex items-center justify-center gap-3 bg-labstx-orange text-white py-3 px-4 rounded-xl font-bold text-sm hover:bg-labstx-orange/90 active:scale-95 transition-all shadow-lg"
            >
                <WalletIcon size={18} />
                Connect Wallet
            </button>

            <div className="mt-8 flex items-center gap-2 text-[10px] text-caspier-muted/50 uppercase tracking-widest font-bold">
                <div className="w-8 h-[1px] bg-caspier-border" />
                Secure Stacks Connection
                <div className="w-8 h-[1px] bg-caspier-border" />
            </div>
        </div>
    );
};

const GitHubLoginRequired: React.FC<{ theme: 'dark' | 'light', onLogin: () => void }> = ({ theme, onLogin }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-in fade-in zoom-in duration-700">
            <div className="relative mb-8 group">
                <div className="absolute -inset-4 rounded-full group-hover:bg-caspier-text/20 transition-all duration-500" />
                <div className="w-16 h-16 bg-caspier-panel border border-caspier-border rounded-2xl flex items-center justify-center shadow-xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    <GitHubIcon size={32} className="text-caspier-text" />
                </div>
            </div>
            <h1 className="text-xl font-bold text-caspier-text mb-2 tracking-tight">
                Authentication Required
            </h1>
            <p className="text-sm text-caspier-muted leading-relaxed max-w-[280px] mb-8">
                To use <span className="text-blue-500 font-semibold">LabSTX AI</span> and get help with your Clarity smart contracts, please sign in with GitHub.
            </p>

            <button
                onClick={onLogin}
                className="w-full max-w-[240px] flex items-center justify-center gap-3 bg-caspier-text text-caspier-black py-3 px-4 rounded-xl font-bold text-sm hover:bg-caspier-text/90 active:scale-95 transition-all shadow-lg"
            >
                <GitHubIcon size={18} />
                Login with GitHub
            </button>

            <div className="mt-8 flex items-center gap-2 text-[10px] text-caspier-muted/50 uppercase tracking-widest font-bold">
                <div className="w-8 h-[1px] bg-caspier-border" />
                Secure via GitHub OAuth
                <div className="w-8 h-[1px] bg-caspier-border" />
            </div>
        </div>
    );
};

const AssistantEmptyState: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-in fade-in zoom-in duration-700">
            <div className="relative mb-8 group">
                <div className="absolute -inset-4  rounded-full  group-hover:bg-caspier-text/20 transition-all duration-500" />
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
                        className="block object-contain w-[80px]"
                    />
                )}

            </div>
            <h1 className="flex gap-1 text-xl font-bold text-caspier-text mb-2 bg-gradient-to-r from-caspier-text to-caspier-muted bg-clip-text text-transparent">
                LabSTX <p className='text-blue-600'> AI</p>
            </h1>
            <p className="text-sm text-caspier-muted leading-relaxed max-w-[280px]">
                Your expert companion for building secure and efficient Clarity smart contracts on Stacks.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-[320px]">
                <div className="p-3 rounded-lg border border-caspier-border bg-caspier-panel/30 text-left">
                    <div className="text-caspier-text font-semibold text-xs mb-1">Edit Mode</div>
                    <div className="text-caspier-muted text-[10px]">Directly modify and create files in your workspace.</div>
                </div>
                <div className="p-3 rounded-lg border border-caspier-border bg-caspier-panel/30 text-left">
                    <div className="text-caspier-text font-semibold text-xs mb-1">Ask Mode</div>
                    <div className="text-caspier-muted text-[10px]">Get explanations and guidance without file changes.</div>
                </div>
            </div>


        </div>
    );
};

const UpgradeRequired: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-in fade-in zoom-in duration-700 bg-caspier-black/40">
            <div className="relative mb-8 group">
                <div className="hidden absolute -inset-6 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-all duration-500" />
                <div className="w-20 h-20 bg-caspier-panel border-2 border-indigo-500/50 rounded-3xl flex items-center justify-center  mb-4 group-hover:scale-110 group-hover:border-indigo-500 transition-all duration-300">
                    <BotIcon size={40} className="text-indigo-400" />
                </div>
                <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter shadow-lg">
                    Limit Reached
                </div>
            </div>

            <h1 className="text-2xl font-black text-caspier-text mb-3 tracking-tight uppercase">
                AI Quota <span className="text-indigo-400">Exhausted</span>
            </h1>

            <p className="text-sm text-caspier-muted leading-relaxed max-w-[280px] mb-10 font-medium">
                You've reached your Ai credits for <span className="text-caspier-text font-bold">LabSTX AI</span> interactions. Upgrade to a Pro plan to continue.
            </p>

            <button
                onClick={onUpgrade}
                className="w-full max-w-[240px] flex items-center justify-center gap-3 bg-indigo-500 text-white py-4 px-6 rounded-full font-black text-sm hover:bg-indigo-600 active:scale-95 transition-all  group"
            >
                <DollarSign size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                Buy more credits
            </button>

        </div>
    );
};

const SidebarRight = React.forwardRef<SidebarRightHandle, SidebarRightProps>(({ currentCode, files, activeFileName, width, settings, onClose, onUpdateFile, onCreateFile, theme, wallet, sessionId, isQuotaExceeded, onOpenAccountSettings, onInteraction, onConnectWallet }, ref) => {
    const { isAuthenticated, login, loading: authLoading } = useGitHubAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [aiMode, setAiMode] = useState<'ask' | 'edit'>('ask');
    const [isInputMinimized, setIsInputMinimized] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [filteredFiles, setFilteredFiles] = useState<FileNode[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, loading]);

    const getAllFiles = useMemo(() => {
        const flatten = (nodes: FileNode[], parentPath = ''): (FileNode & { path: string })[] => {
            let result: (FileNode & { path: string })[] = [];
            nodes.forEach(node => {
                const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
                if (node.type === 'file') result.push({ ...node, path: currentPath });
                if (node.children) result = [...result, ...flatten(node.children, currentPath)];
            });
            return result;
        };
        return flatten(files);
    }, [files]);

    // Build a file tree string for AI context
    const fileTreeString = useMemo(() => {
        const buildTree = (nodes: FileNode[], indent = ''): string => {
            return nodes.map(n => {
                if (n.type === 'folder') {
                    return `${indent}${n.name}/\n${buildTree(n.children || [], indent + '  ')}`;
                }
                return `${indent}${n.name}`;
            }).join('\n');
        };
        return buildTree(files);
    }, [files]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);

        const cursor = e.target.selectionStart || val.length;
        const textBeforeCursor = val.slice(0, cursor);
        const words = textBeforeCursor.split(/\s+/);
        const currentWord = words[words.length - 1];

        if (currentWord.startsWith('@')) {
            const query = currentWord.slice(1).toLowerCase();
            setMentionQuery(query);
            const filtered = getAllFiles.filter(f => f.name.toLowerCase().includes(query));
            setFilteredFiles(filtered);
            setSelectedIndex(0);
        } else {
            setMentionQuery(null);
        }

        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
    };

    const insertMention = (fileName: string) => {
        if (!inputRef.current) return;
        const cursor = inputRef.current.selectionStart || input.length;
        const textBeforeCursor = input.slice(0, cursor);
        const textAfterCursor = input.slice(cursor);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const newText = textBeforeCursor.substring(0, lastAtIndex) + `@${fileName} ` + textAfterCursor;
            setInput(newText);
            setMentionQuery(null);
            inputRef.current.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (mentionQuery !== null && filteredFiles.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredFiles.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(filteredFiles[selectedIndex].name);
            } else if (e.key === 'Escape') {
                setMentionQuery(null);
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    useImperativeHandle(ref, () => ({
        sendMessage: (text: string) => {
            handleSend(text);
        }
    }));

    const handleSend = async (overrideText?: string) => {
        const textToSend = overrideText || input;
        if (!textToSend.trim() || loading) return;

        const mentionRegex = /@([a-zA-Z0-9_.\/\\-]+)/g;
        const matches = Array.from(textToSend.matchAll(mentionRegex));

        let contextPayload = `Active File: ${activeFileName || 'none'}\n${currentCode}\n\n`;
        contextPayload += `Workspace File Tree:\n${fileTreeString}\n\n`;
        if (matches.length > 0) {
            contextPayload += "Referenced Files:\n";
            matches.forEach(match => {
                const fileName = match[1];
                const fileNode = getAllFiles.find(f => f.name === fileName || f.path === fileName);
                if (fileNode && fileNode.content) {
                    contextPayload += `--- FILE: ${fileNode.path} ---\n${fileNode.content}\n\n`;
                }
            });
        }

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: textToSend,
            timestamp: Date.now(),
            mode: aiMode
        };

        setMessages(prev => [...prev, userMsg]);
        if (!overrideText) setInput('');
        setLoading(true);

        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        try {
            const aiConfig: any = {
                provider: 'openrouter'
            };

            const key = settings.openRouterKeySource === 'ide'
                ? (import.meta as any).env.VITE_OPENROUTER_API_KEY
                : settings.aiApiKey;

            aiConfig.openRouter = {
                apiKey: key,
                model: settings.aiModel,
                customContext: settings.aiCustomContext
            };

            // Create placeholder message for streaming
            const aiMsgId = (Date.now() + 1).toString();
            const aiMsg: ChatMessage = {
                id: aiMsgId,
                role: 'model',
                text: '',
                timestamp: Date.now(),
                mode: aiMode
            };
            setMessages(prev => [...prev, aiMsg]);

            const modeInstruction = aiMode === 'ask'
                ? "\n\nMODE: ASK MODE. Answer questions based on code and documentation. DO NOT generate [UPDATE_FILE] or [CREATE_FILE] tags. Provide explanations only."
                : "\n\nMODE: EDIT MODE. You can suggest file changes using [UPDATE_FILE: filename] or [CREATE_FILE: filename] tags when appropriate. Always provide the full file content inside the tags.";

            let interactCalled = false;
            await streamAIResponse(userMsg.text, contextPayload + modeInstruction, history, aiConfig, (chunk) => {
                if (!interactCalled && chunk) {
                    onInteraction?.();
                    interactCalled = true;
                }
                setMessages(prev => prev.map(m =>
                    m.id === aiMsgId ? { ...m, text: m.text + chunk } : m
                ));
            }, wallet.address);

            // Telemetry Ingest - only on success
            try {
                await fetch('/ide-api/stats/ingest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventType: 'AI_INTERACTION',
                        wallet: wallet.address || 'unconnected',
                        payload: {
                            mode: aiMode,
                            messageLength: userMsg.text.length
                        }
                    })
                });
            } catch (err) {
                console.error('Telemetry failed:', err);
            }

            // Final signal to ensure quota is up to date after ingest
            onInteraction?.();

        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: "Failed to get response. Please check your connection or API key.",
                timestamp: Date.now()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setMessages([]);
        setInput('');
        setAiMode('edit');
    };

    const formatInlineTextInline = (text: string) => {
        const processedText = text.replace(/No contract address/g, '**No contract address**');
        const regex = /(\*\*[^*]+\*\*)|(`[^`]+`)|(@[a-zA-Z0-9_.-]+)|(\*[^*]+\*)|(_[^_]+_)/g;
        const parts: Array<{ type: string; content: string }> = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(processedText)) !== null) {
            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: processedText.slice(lastIndex, match.index) });
            }
            const str = match[0];
            if (str.startsWith('**')) parts.push({ type: 'bold', content: str.slice(2, -2) });
            else if (str.startsWith('`')) parts.push({ type: 'inline-code', content: str.slice(1, -1) });
            else if (str.startsWith('@')) parts.push({ type: 'mention', content: str.slice(1) });
            else if (str.startsWith('*') || str.startsWith('_')) parts.push({ type: 'italic', content: str.slice(1, -1) });
            lastIndex = match.index + str.length;
        }
        if (lastIndex < processedText.length) parts.push({ type: 'text', content: processedText.slice(lastIndex) });

        return parts.map((part, i) => {
            if (part.type === 'bold') return <strong key={i} className="text-caspier-text font-semibold">{part.content}</strong>;
            if (part.type === 'italic') return <em key={i} className="text-caspier-muted italic">{part.content}</em>;
            if (part.type === 'inline-code') return <code key={i} className="bg-caspier-panel px-1.5 py-0.5 rounded-md text-caspier-text font-mono text-xs border border-caspier-border">{part.content}</code>;
            if (part.type === 'mention') {
                return (
                    <span
                        key={i}
                        className="inline-flex items-center gap-1.5 bg-caspier-panel px-1.5 py-0.5 rounded-md border border-caspier-border text-xs font-medium mx-0.5 align-middle text-caspier-text"
                    >
                        <SmartFileIcon
                            name={part.content}
                            className="w-3.5 h-3.5 shrink-0 text-caspier-muted"
                        />
                        <span className="leading-none">{part.content}</span>
                    </span>
                );
            }
            return <span key={i}>{part.content}</span>;
        });
    };

    const formatMarkdown = (text: string) => {
        const lines = text.split('\n');
        const result: React.ReactNode[] = [];

        lines.forEach((line, lineIndex) => {
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                const content = headerMatch[2];
                const HeaderTag = `h${Math.min(level, 6)}` as any;
                const classes = ["", "text-xl", "text-lg", "text-base", "text-sm", "text-sm", "text-xs"][level] + " font-semibold mt-4 mb-2 text-caspier-text";
                result.push(<HeaderTag key={lineIndex} className={classes}>{formatInlineTextInline(content)}</HeaderTag>);
                return;
            }

            if (line.match(/^[-*+]\s+/)) {
                result.push(
                    <div key={lineIndex} className="flex items-start gap-2 my-1.5 pl-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-caspier-muted mt-2 flex-shrink-0" />
                        <span className="text-caspier-text text-sm leading-relaxed">{formatInlineTextInline(line.replace(/^[-*+]\s+/, ''))}</span>
                    </div>
                );
                return;
            }

            if (line.trim()) {
                result.push(<p key={lineIndex} className="my-2 text-caspier-text text-sm leading-relaxed">{formatInlineTextInline(line)}</p>);
            } else {
                result.push(<div key={lineIndex} className="h-2" />);
            }
        });
        return result;
    };

    const renderMessageContent = (text: string, mode: 'ask' | 'edit') => {
        const updateRegex = /\[UPDATE_FILE:\s*([^\]]+)\]([\s\S]*?)\[\/UPDATE_FILE\]/g;
        const createRegex = /\[CREATE_FILE:\s*([^\]]+)\]([\s\S]*?)\[\/CREATE_FILE\]/g;
        const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
        const tableRegex = /(?:^|\n)(\|.*\|(?:\r?\n\|[ -|]*\|)(?:\r?\n\|.*\|)+)/g;

        const parts: any[] = [];
        let sortedMatches: any[] = [];

        let match;
        while ((match = updateRegex.exec(text)) !== null) {
            sortedMatches.push({ type: 'update', filename: match[1].trim(), content: match[2].trim(), index: match.index, length: match[0].length });
        }
        while ((match = createRegex.exec(text)) !== null) {
            sortedMatches.push({ type: 'create', filename: match[1].trim(), content: match[2].trim(), index: match.index, length: match[0].length });
        }
        while ((match = codeBlockRegex.exec(text)) !== null) {
            sortedMatches.push({ type: 'code', language: match[1], content: match[2], index: match.index, length: match[0].length });
        }
        while ((match = tableRegex.exec(text)) !== null) {
            sortedMatches.push({ type: 'table', content: match[1].trim(), index: match.index, length: match[0].length });
        }

        sortedMatches.sort((a, b) => a.index - b.index);

        let lastIndex = 0;
        sortedMatches.forEach((m) => {
            if (m.index > lastIndex) {
                parts.push({ type: 'text', content: text.slice(lastIndex, m.index) });
            }
            parts.push(m);
            lastIndex = m.index + m.length;
        });
        if (lastIndex < text.length) {
            parts.push({ type: 'text', content: text.slice(lastIndex) });
        }

        if (parts.length === 0) {
            if (text === '') {
                return (
                    <div className="flex flex-col gap-2 animate-pulse">
                        <div className="h-2 w-3/4 bg-caspier-border rounded-full" />
                        <div className="h-2 w-1/2 bg-caspier-border rounded-full" />
                    </div>
                );
            }
            return (
                <div className="relative">
                    {formatMarkdown(text)}
                    {loading && <span className="inline-block w-1.5 h-4 ml-1 bg-caspier-text animate-pulse align-middle" />}
                </div>
            );
        }

        return parts.map((part, index) => {
            if (part.type === 'code') return <CodeBlock key={index} language={part.language} content={part.content} />;
            if (part.type === 'table') return <TableBlock key={index} content={part.content} />;
            if (part.type === 'update') {
                if (mode === 'ask') return <div key={index}>{formatMarkdown(part.content)}</div>;
                // Strip stray markdown code fences from AI output
                let cleanContent = part.content.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
                const baseName = part.filename.includes('/') ? part.filename.split('/').pop()! : part.filename;
                const targetFile = getAllFiles.find(f => f.path === part.filename || f.name === baseName);
                return (
                    <FileActionBlock
                        key={index}
                        type="UPDATE"
                        filename={part.filename}
                        content={cleanContent}
                        onApply={() => targetFile && onUpdateFile(targetFile.id, cleanContent)}
                    />
                );
            }
            if (part.type === 'create') {
                if (mode === 'ask') return <div key={index}>{formatMarkdown(part.content)}</div>;
                // Strip stray markdown code fences from AI output
                let cleanContent = part.content.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
                return (
                    <FileActionBlock
                        key={index}
                        type="CREATE"
                        filename={part.filename}
                        content={cleanContent}
                        onApply={() => onCreateFile(part.filename, cleanContent)}
                    />
                );
            }
            return <div key={index}>{formatMarkdown(part.content)}</div>;
        });
    };

    return (
        <div id="ai-assistant-sidebar" style={{ width }} className="flex-shrink-0  bg-caspier-black border-l border-caspier-border flex flex-col h-full relative ">
            <div className={`flex flex-col h-full transition-all duration-500 ${!wallet.connected ? 'blur-md pointer-events-none select-none opacity-50' : ''}`}>
                {/* Header */}
                <div className="h-14 px-4 flex items-center justify-between text-blue-600 bg-blue-300/20 dark:bg-caspier-panel border-b border-caspier-border z-20">
                    <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-sparkles-icon lucide-sparkles"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" /></svg>

                        <div>
                            <h2 className="text-sm font-semibold ">LabSTX AI</h2>
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                <span className="text-xs text-caspier-muted truncate">
                                    {settings.aiModel || 'OpenRouter'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {messages.length > 0 && (
                            <button
                                onClick={handleReset}
                                className="p-2 text-caspier-muted hover:text-caspier-text hover:bg-caspier-border rounded-md transition-colors"
                                title="New Chat"
                            >
                                <PlusIcon size={16} />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-caspier-muted hover:text-caspier-text hover:bg-caspier-border rounded-md transition-colors">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Chat Body */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-caspier-border relative" ref={scrollRef}>
                    {authLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <LoaderIcon className="w-6 h-6 text-caspier-muted animate-spin" />
                        </div>
                    ) : (
                        <>
                            {!isAuthenticated ? (
                                <GitHubLoginRequired theme={theme} onLogin={login} />
                            ) : isQuotaExceeded ? (
                                <UpgradeRequired onUpgrade={onOpenAccountSettings || (() => { })} />
                            ) : messages.length === 0 ? (
                                <AssistantEmptyState theme={theme} />
                            ) : (
                                <div className="p-4 space-y-6">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group animate-in fade-in duration-200`}>
                                            <div className={`
                                                p-4 text-sm rounded-xl border transition-all duration-200
                                                ${msg.role === 'user'
                                                    ? 'bg-caspier-panel border-caspier-border text-caspier-text max-w-[90%] shadow-sm'
                                                    : 'bg-transparent border-transparent w-full'}
                                            `}>
                                                {renderMessageContent(msg.text, msg.mode || 'ask')}
                                            </div>
                                            <div className={`flex items-center gap-2 mt-1 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <span className="text-[10px] text-caspier-muted/60 uppercase tracking-tight font-medium">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {msg.role === 'user' && (
                                                    <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(msg.text);
                                                            }}
                                                            className="p-1 text-caspier-muted hover:text-caspier-text transition-colors"
                                                            title="Copy message"
                                                        >
                                                            <CopyIcon size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleSend(msg.text)}
                                                            className="p-1 text-caspier-muted hover:text-caspier-text transition-colors"
                                                            title="Resend message"
                                                        >
                                                            <RefreshIcon size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Input Section */}
                {isAuthenticated && !isQuotaExceeded && (
                    <div className="p-4 bg-caspier-black/80 backdrop-blur-md border-t border-caspier-border/50">
                        <div className="relative">
                            {/* Quick Prompts */}
                            {messages.length === 0 && !loading && !mentionQuery && (
                                <QuickPrompts onSelect={(prompt) => handleSend(prompt)} />
                            )}

                            {/* Mention Popup */}
                            {mentionQuery !== null && filteredFiles.length > 0 && !isInputMinimized && (
                                <div className="absolute bottom-full left-0 right-0 mb-2 bg-caspier-panel border border-caspier-border rounded-lg shadow-xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 duration-200">
                                    <div className="text-xs text-caspier-muted px-3 py-2 border-b border-caspier-border font-medium bg-caspier-dark/50">
                                        Link Context
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {filteredFiles.map((file, idx) => (
                                            <div
                                                key={file.id}
                                                className={`px-3 py-2 text-sm flex items-center gap-2 cursor-pointer transition-colors ${idx === selectedIndex ? 'bg-caspier-border text-caspier-text' : 'text-caspier-muted hover:bg-caspier-dark'
                                                    }`}
                                                onClick={() => insertMention(file.name)}
                                            >
                                                <SmartFileIcon name={file.name} className="w-4 h-4" />
                                                <span>{file.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className={`flex flex-col bg-caspier-dark/40 border border-caspier-border/50 rounded-xl overflow-hidden focus-within:border-caspier-text/30 focus-within:ring-1 focus-within:ring-caspier-text/10 transition-all duration-300 ${isInputMinimized ? 'h-10' : ''}`}>
                                {!isInputMinimized ? (
                                    <>
                                        <textarea
                                            ref={inputRef}
                                            rows={1}
                                            className="w-full bg-transparent text-caspier-text text-sm px-4 py-3 focus:outline-none placeholder:text-caspier-muted/50 resize-none min-h-[80px] max-h-[200px] leading-relaxed"
                                            placeholder="Ask anything or use @ to link files..."
                                            value={input}
                                            onChange={handleInputChange}
                                            onKeyDown={handleKeyDown}
                                            disabled={loading}
                                        />
                                        <div className="px-3 py-2 border-t border-caspier-border flex justify-between items-center bg-caspier-panel/50">
                                            <div className="flex items-center gap-3">
                                                <div className="flex bg-caspier-dark rounded-md p-0.5 border border-caspier-border">
                                                    <button
                                                        onClick={() => setAiMode('ask')}
                                                        className={`px-3 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all ${aiMode === 'ask'
                                                            ? 'bg-caspier-text text-caspier-black shadow-sm'
                                                            : 'text-caspier-muted hover:text-caspier-text'}`}
                                                    >
                                                        Ask
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setAiMode('edit');
                                                            if (activeFileName && !input.includes(`@${activeFileName}`)) {
                                                                const suffix = input.endsWith(' ') ? '' : (input.length > 0 ? ' ' : '');
                                                                setInput(prev => prev + suffix + `@${activeFileName} `);
                                                                // focus input
                                                                setTimeout(() => inputRef.current?.focus(), 50);
                                                            }
                                                        }}
                                                        className={`px-3 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all ${aiMode === 'edit'
                                                            ? 'bg-caspier-text text-caspier-black shadow-sm'
                                                            : 'text-caspier-muted hover:text-caspier-text'}`}
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                                <div className="w-[1px] h-4 bg-caspier-border mx-1" />
                                                <button
                                                    onClick={() => setIsInputMinimized(true)}
                                                    className="text-xs text-caspier-muted hover:text-caspier-text flex items-center gap-1 transition-colors"
                                                >
                                                    Minimize <ChevronDownIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleSend()}
                                                disabled={loading || !input.trim()}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${input.trim()
                                                    ? 'bg-caspier-text text-caspier-black hover:bg-caspier-text/90'
                                                    : 'bg-caspier-border text-caspier-muted cursor-not-allowed'
                                                    }`}
                                            >
                                                <span className="text-xs font-medium">Send</span>
                                                <SendIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div
                                        className="flex items-center justify-between px-4 h-full cursor-pointer hover:bg-caspier-panel transition-colors"
                                        onClick={() => setIsInputMinimized(false)}
                                    >
                                        <span className="text-sm text-caspier-muted font-medium flex items-center gap-2">
                                            <BotIcon className="w-4 h-4" />
                                            Input Minimized
                                        </span>
                                        <div className="flex items-center gap-3">
                                            {input.trim() && <span className="text-xs text-caspier-muted bg-caspier-border px-2 py-0.5 rounded-md">Draft saved</span>}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsInputMinimized(false); }}
                                                className="text-xs text-caspier-text font-medium hover:underline"
                                            >
                                                Expand
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!wallet.connected && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-caspier-black/30 backdrop-blur-[1px]">
                    <WalletConnectionRequired theme={theme} onConnect={onConnectWallet || (() => { })} />
                </div>
            )}
        </div>
    );
});


export default SidebarRight;
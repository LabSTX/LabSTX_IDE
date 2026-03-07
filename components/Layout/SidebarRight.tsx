import React, { useState, useRef, useEffect, useMemo } from 'react';
import { generateAIResponse } from '../../services/aiService';
import { ChatMessage, FileNode } from '../../types';
import { Button } from '../UI/Button';
import { BotIcon, SendIcon, XIcon, SmartFileIcon, CheckIcon, ChevronDownIcon } from '../UI/Icons';
import { ProjectSettings } from '../../types';

interface SidebarRightProps {
    currentCode: string;
    files: FileNode[];
    width: number;
    settings: ProjectSettings;
    onClose: () => void;
    onUpdateFile: (fileId: string, content: string) => void;
    onCreateFile: (name: string, content: string) => void;
    sessionId?: string;
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
        <div className="my-4 rounded-xl border border-caspier-border/40 bg-caspier-dark/40 backdrop-blur-md overflow-hidden w-full group transition-all hover:border-caspier-border/60">
            <div className="flex justify-between items-center px-4 py-2 bg-caspier-panel/50 border-b border-caspier-border/40">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-caspier-red" />
                    <span className="text-[10px] text-caspier-muted font-mono uppercase tracking-widest">{language || 'code'}</span>
                </div>
                <button
                    onClick={handleCopy}
                    className="text-[10px] uppercase font-bold text-caspier-muted hover:text-caspier-text flex items-center gap-1.5 transition-all"
                >
                    {copied ? <CheckIcon className="w-3 h-3 text-green-500" /> : null}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <div className="p-4 overflow-x-auto bg-caspier-black/60">
                <pre className="text-xs font-mono leading-relaxed tab-[2] text-caspier-text opacity-90">
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

    const handleApply = () => {
        onApply();
        setApplied(true);
        setTimeout(() => setApplied(false), 3000);
    };

    return (
        <div className="my-4 rounded-xl border border-caspier-red/30 bg-caspier-red/5 overflow-hidden w-full transition-all hover:border-caspier-red/50">
            <div className="flex justify-between items-center px-4 py-3 bg-caspier-red/10 border-b border-caspier-red/20">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-caspier-red/20 rounded-lg">
                        <SmartFileIcon name={filename} className="w-4 h-4 text-caspier-red" />
                    </div>
                    <div>
                        <div className="text-[10px] text-caspier-red font-black uppercase tracking-widest">{type === 'UPDATE' ? 'Update File' : 'Create File'}</div>
                        <div className="text-xs text-caspier-text font-bold">{filename}</div>
                    </div>
                </div>
                <button
                    onClick={handleApply}
                    disabled={applied}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${applied
                        ? 'bg-green-500/20 text-green-500 cursor-default'
                        : 'bg-caspier-red text-caspier-black hover:scale-105 active:scale-95'
                        }`}
                >
                    {applied ? 'Applied!' : 'Apply Changes'}
                </button>
            </div>
            <div className="p-4 bg-caspier-black/40 max-h-48 overflow-y-auto">
                <pre className="text-[10px] font-mono leading-relaxed text-caspier-text/70 italic">
                    {content.length > 300 ? content.slice(0, 300) + '...' : content}
                </pre>
            </div>
        </div>
    );
};

const SidebarRight: React.FC<SidebarRightProps> = ({ currentCode, files, width, settings, onClose, onUpdateFile, onCreateFile, sessionId }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'model',
            text: 'Hello! I am your **LabSTX AI Assistant**. I can help you write, debug, and optimize **Clarity** smart contracts.\n\nI can now **edit existing files** or **create new ones**! Just mention the file with @filename and ask me to update it, or ask me to create a new contract.',
            timestamp: Date.now()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
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
        const flatten = (nodes: FileNode[]): FileNode[] => {
            let result: FileNode[] = [];
            nodes.forEach(node => {
                if (node.type === 'file') result.push(node);
                if (node.children) result = [...result, ...flatten(node.children)];
            });
            return result;
        };
        return flatten(files);
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

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
        const matches = Array.from(input.matchAll(mentionRegex));

        let contextPayload = `Active File:\n${currentCode}\n\n`;
        if (matches.length > 0) {
            contextPayload += "Referenced Files:\n";
            matches.forEach(match => {
                const fileName = match[1];
                const fileNode = getAllFiles.find(f => f.name === fileName);
                if (fileNode && fileNode.content) {
                    contextPayload += `--- FILE: ${fileName} ---\n${fileNode.content}\n\n`;
                }
            });
        }

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        try {
            const responseText = await generateAIResponse(userMsg.text, contextPayload, history, {
                provider: settings.aiApiKey ? 'openrouter' : 'chaingpt',
                openRouter: {
                    apiKey: settings.aiApiKey,
                    model: settings.aiModel
                }
            });

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: responseText,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: "❌ Failed to get response. Please check your connection or API key.",
                timestamp: Date.now()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const formatInlineTextInline = (text: string) => {
        const regex = /(\*\*[^*]+\*\*)|(`[^`]+`)|(@[a-zA-Z0-9_.-]+)|(\*[^*]+\*)|(_[^_]+_)/g;
        const parts: Array<{ type: string; content: string }> = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
            }
            const str = match[0];
            if (str.startsWith('**')) parts.push({ type: 'bold', content: str.slice(2, -2) });
            else if (str.startsWith('`')) parts.push({ type: 'inline-code', content: str.slice(1, -1) });
            else if (str.startsWith('@')) parts.push({ type: 'mention', content: str.slice(1) });
            else if (str.startsWith('*') || str.startsWith('_')) parts.push({ type: 'italic', content: str.slice(1, -1) });
            lastIndex = match.index + str.length;
        }
        if (lastIndex < text.length) parts.push({ type: 'text', content: text.slice(lastIndex) });

        return parts.map((part, i) => {
            if (part.type === 'bold') return <strong key={i} className="text-caspier-text font-bold">{part.content}</strong>;
            if (part.type === 'italic') return <em key={i} className="text-caspier-muted italic">{part.content}</em>;
            if (part.type === 'inline-code') return <code key={i} className="bg-caspier-dark px-1.5 py-0.5 rounded text-caspier-red font-mono text-[11px] border border-caspier-border0">{part.content}</code>;
            if (part.type === 'mention') {
                const file = getAllFiles.find(f => f.name === part.content);
                return (
                    <span key={i} className="inline-flex items-center gap-1 text-caspier-red bg-caspier-red/10 px-1.5 py-0.5 rounded border border-caspier-red/20 text-[11px] font-bold mx-0.5 align-baseline">
                        <SmartFileIcon name={part.content} className="w-3 h-3" />
                        {part.content}
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
                const classes = ["", "text-2xl", "text-xl", "text-lg", "text-base", "text-sm", "text-xs"][level] + " font-bold mt-6 mb-3 text-caspier-text tracking-tight";
                result.push(<HeaderTag key={lineIndex} className={classes}>{formatInlineTextInline(content)}</HeaderTag>);
                return;
            }

            if (line.match(/^[-*+]\s+/)) {
                result.push(
                    <div key={lineIndex} className="flex items-start gap-3 my-2 pl-2">
                        <div className="w-1 h-1 rounded-full bg-caspier-red mt-2 flex-shrink-0" />
                        <span className="text-caspier-text opacity-80 text-sm leading-relaxed">{formatInlineTextInline(line.replace(/^[-*+]\s+/, ''))}</span>
                    </div>
                );
                return;
            }

            if (line.trim()) {
                result.push(<p key={lineIndex} className="my-2 text-caspier-text opacity-80 text-sm leading-relaxed">{formatInlineTextInline(line)}</p>);
            } else {
                result.push(<div key={lineIndex} className="h-4" />);
            }
        });
        return result;
    };

    const renderMessageContent = (text: string) => {
        // Parse File update/create tags first
        const updateRegex = /\[UPDATE_FILE:\s*([^\]]+)\]([\s\S]*?)\[\/UPDATE_FILE\]/g;
        const createRegex = /\[CREATE_FILE:\s*([^\]]+)\]([\s\S]*?)\[\/CREATE_FILE\]/g;
        const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;

        const parts: any[] = [];
        let sortedMatches: any[] = [];

        // Collect all matches with their positions
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

        sortedMatches.sort((a, b) => a.index - b.index);

        let lastIndex = 0;
        sortedMatches.forEach((m, i) => {
            if (m.index > lastIndex) {
                parts.push({ type: 'text', content: text.slice(lastIndex, m.index) });
            }
            parts.push(m);
            lastIndex = m.index + m.length;
        });
        if (lastIndex < text.length) {
            parts.push({ type: 'text', content: text.slice(lastIndex) });
        }

        if (parts.length === 0) return <div>{formatMarkdown(text)}</div>;

        return parts.map((part, index) => {
            if (part.type === 'code') return <CodeBlock key={index} language={part.language} content={part.content} />;
            if (part.type === 'update') {
                const targetFile = getAllFiles.find(f => f.name === part.filename);
                return (
                    <FileActionBlock
                        key={index}
                        type="UPDATE"
                        filename={part.filename}
                        content={part.content}
                        onApply={() => targetFile && onUpdateFile(targetFile.id, part.content)}
                    />
                );
            }
            if (part.type === 'create') {
                return (
                    <FileActionBlock
                        key={index}
                        type="CREATE"
                        filename={part.filename}
                        content={part.content}
                        onApply={() => onCreateFile(part.filename, part.content)}
                    />
                );
            }
            return <div key={index}>{formatMarkdown(part.content)}</div>;
        });
    };

    return (
        <div id="ai-assistant-sidebar" style={{ width }} className="flex-shrink-0 bg-caspier-black border-l border-caspier-border flex flex-col h-full relative overflow-hidden">
            {/* Glossy Header */}
            <div className="h-14 px-4 flex items-center justify-between bg-caspier-panel/30 border-b border-caspier-border backdrop-blur-xl z-20">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-0 opacity-20 " />
                        <BotIcon className="text-caspier-red w-5 h-5 relative z-10" />
                    </div>
                    <div>
                        <h2 className="text-[11px] font-black text-caspier-text">LabSTX AI</h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                            <span className="text-[9px] text-caspier-muted  uppercase tracking-tighter">
                                {settings.aiApiKey ? settings.aiModel.split('/')[1]?.toUpperCase() || settings.aiModel : 'ChainGPT v2'}
                            </span>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-caspier-muted hover:text-caspier-text hover:bg-caspier-hover rounded-full transition-all">
                    <XIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-caspier-border" ref={scrollRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`
                            max-w-[100%]  p-4 text-sm transition-all
                            ${msg.role === 'user'
                                ? ' bg-gray-600/20 text-caspier-text font-medium  ml-8'
                                : 'bg-caspier-panel/40 border border-caspier-border text-caspier-text opacity-90  w-full '}
                        `}>
                            {renderMessageContent(msg.text)}
                        </div>
                        <div className={`flex items-center gap-2 mt-2 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className="text-[8px] text-caspier-muted opacity-40">•</span>
                            <span className="text-[9px] text-caspier-muted font-mono">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex items-start animate-pulse">
                        <div className="bg-caspier-panel/40 border border-caspier-border p-5 rounded-2xl rounded-tl-none space-y-2 w-2/3">
                            <div className="h-2 w-full bg-caspier-muted/10 rounded-full" />
                            <div className="h-2 w-2/3 bg-caspier-muted/10 rounded-full" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Section - Floating style */}
            <div className={`p-6 bg-gradient-to-t from-caspier-black to-transparent transition-all duration-300 ${isInputMinimized ? 'pb-2 pt-0' : 'pb-6'}`}>
                <div className="relative group">
                    {/* Mention Popup */}
                    {mentionQuery !== null && filteredFiles.length > 0 && !isInputMinimized && (
                        <div className="absolute bottom-full left-0 right-0 mb-4 bg-caspier-dark border border-caspier-border shadow-2xl rounded-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="text-[9px] text-caspier-muted px-4 py-2 bg-caspier-panel border-b border-caspier-border uppercase font-black tracking-widest">Connect Context</div>
                            {filteredFiles.map((file, idx) => (
                                <div
                                    key={file.id}
                                    className={`px-4 py-3 text-xs flex items-center gap-3 cursor-pointer transition-all ${idx === selectedIndex ? 'bg-caspier-red text-white font-bold' : 'text-caspier-muted hover:bg-caspier-hover'}`}
                                    onClick={() => insertMention(file.name)}
                                >
                                    <SmartFileIcon name={file.name} className="w-4 h-4" />
                                    <span>{file.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={`relative flex flex-col bg-caspier-panel/30 border border-caspier-border rounded-2xl overflow-hidden focus-within:border-caspier-red transition-all focus-within:shadow-[0_0_20px_rgba(0,123,255,0.05)] ${isInputMinimized ? 'min-h-0 h-10' : ''}`}>
                        {!isInputMinimized ? (
                            <>
                                <textarea
                                    ref={inputRef}
                                    rows={1}
                                    className="w-full bg-transparent text-caspier-text text-sm px-4 py-4 pr-14 focus:outline-none placeholder:text-caspier-muted/40 resize-none min-h-[56px] max-h-[200px]"
                                    placeholder="Type @ to link files..."
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    disabled={loading}
                                />
                                <div className="px-4 py-2 border-t border-caspier-border flex justify-between items-center bg-caspier-black/10">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[9px] text-caspier-muted font-bold uppercase">Markdown Supported</span>
                                        <button
                                            onClick={() => setIsInputMinimized(true)}
                                            className="text-[9px] text-caspier-muted hover:text-caspier-text font-black uppercase tracking-widest flex items-center gap-1"
                                        >
                                            Minimize <ChevronDownIcon className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleSend}
                                        disabled={loading || !input.trim()}
                                        className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-all ${input.trim() ? 'text-caspier-red bg-caspier-red/10 animate-bounce-subtle' : 'text-caspier-muted/20 cursor-not-allowed'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest">Send</span>
                                        <SendIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div
                                className="flex items-center justify-between px-4 h-full cursor-pointer hover:bg-caspier-hover/30 transition-colors"
                                onClick={() => setIsInputMinimized(false)}
                            >
                                <span className="text-[10px] text-caspier-muted font-black uppercase tracking-widest flex items-center gap-2">
                                    <BotIcon className="w-3 h-3 text-caspier-red" />
                                    AI Input Collapsed
                                </span>
                                <div className="flex items-center gap-3">
                                    {input.trim() && <span className="text-[9px] text-caspier-red bg-caspier-red/10 px-1.5 rounded">Pending Content</span>}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsInputMinimized(false); }}
                                        className="text-[10px] text-caspier-red font-black uppercase tracking-widest hover:underline"
                                    >
                                        Expand
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SidebarRight;

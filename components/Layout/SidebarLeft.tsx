
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FileNode, ActivityView, ProjectSettings, GitState, GitCommit, WalletConnection, CompilationResult, DeployedContract, TerminalLine } from '../../types';
import {
    FolderIcon, FileIcon, ChevronRightIcon, ChevronDownIcon,
    FilePlusIcon, FolderPlusIcon, EditIcon, TrashIcon, CheckIcon, XIcon,
    SearchIcon, SettingsIcon, GitIcon, PlusIcon, MinusIcon, RefreshIcon, SmartFileIcon, RocketIcon, GitBranchIcon, GitCommitIcon,
    ReplaceIcon, CaseSensitiveIcon, WholeWordIcon, RegexIcon, CollapseIcon
} from '../UI/Icons';
import { Button } from '../UI/Button';
import DeployPanel from '../Deploy/DeployPanel';
import DebugPanel from '../Layout/DebugPanel';
import { TEMPLATES, templateToFileNodes } from '../../services/templates';
import { NewProjectModal } from './NewProjectModal';

interface SidebarLeftProps {
    files: FileNode[];
    activeFileId: string | null;
    onFileSelect: (fileId: string) => void;
    activeView: ActivityView;
    onCreateNode: (parentId: string, type: 'file' | 'folder', name: string) => void;
    onRenameNode: (id: string, newName: string) => void;
    onDeleteNode: (id: string) => void;
    width: number;
    settings?: ProjectSettings;
    onUpdateSettings?: (key: keyof ProjectSettings, value: any) => void;
    gitState?: GitState;
    onStageFile?: (id: string) => void;
    onUnstageFile?: (id: string) => void;
    onDiscardFile?: (id: string) => void;
    onCommit?: (message: string) => void;
    onPush?: () => void;
    onSwitchBranch?: (branchName: string) => void;
    onCreateBranch?: (branchName: string) => void;
    wallet?: WalletConnection;
    onWalletConnect?: (wallet: WalletConnection) => void;
    onWalletDisconnect?: () => void;
    compilationResult?: CompilationResult;
    onDeploySuccess?: (contract: DeployedContract) => void;
    onLoadTemplate?: (nodes: FileNode[]) => void;
    onCreateBlank?: () => void;
    onImport?: () => void;
    isProjectModalOpen: boolean;
    setIsProjectModalOpen: (open: boolean) => void;
    onAddTerminalLine?: (line: Omit<TerminalLine, 'id'>) => void;
    theme: 'dark' | 'light';
    sessionId?: string;
    onUpdateFiles?: (newFiles: FileNode[]) => void;
    onCollapseAll?: () => void;
}

interface FileTreeItemProps {
    node: FileNode;
    activeFileId: string | null;
    onSelect: (id: string) => void;
    depth?: number;
    onStartCreate: (parentId: string, type: 'file' | 'folder') => void;
    onStartRename: (id: string, currentName: string) => void;
    onDelete: (id: string) => void;
    creatingInNodeId: string | null;
    creatingType: 'file' | 'folder' | null;
    onSubmitCreate: (name: string) => void;
    onCancelCreate: () => void;
    editingId: string | null;
    onSubmitRename: (id: string, newName: string) => void;
    onCancelRename: () => void;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
    node, activeFileId, onSelect, depth = 0,
    onStartCreate, onStartRename, onDelete,
    creatingInNodeId, creatingType, onSubmitCreate, onCancelCreate,
    editingId, onSubmitRename, onCancelRename
}) => {
    const [isOpen, setIsOpen] = useState(node.isOpen ?? true);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync state with node.isOpen when it's controlled from parent
    useEffect(() => {
        if (node.isOpen !== undefined) {
            setIsOpen(node.isOpen);
        }
    }, [node.isOpen]);

    // Focus input when appearing
    useEffect(() => {
        if ((creatingInNodeId === node.id || editingId === node.id) && inputRef.current) {
            inputRef.current.focus();
            if (editingId === node.id) setInputValue(node.name);
            else setInputValue('');
        }
    }, [creatingInNodeId, editingId, node.id, node.name]);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (editingId === node.id) return;

        if (node.type === 'folder') {
            setIsOpen(!isOpen);
        } else {
            onSelect(node.id);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, isRename: boolean) => {
        if (e.key === 'Enter') {
            if (isRename) onSubmitRename(node.id, inputValue);
            else onSubmitCreate(inputValue);
        } else if (e.key === 'Escape') {
            if (isRename) onCancelRename();
            else onCancelCreate();
        }
    };

    const isCreatingChild = creatingInNodeId === node.id;
    const isRenaming = editingId === node.id;

    return (
        <div className="select-none text-sm">
            <div
                className={`group flex items-center py-1 px-2 cursor-pointer transition-colors relative pr-2 ${node.id === activeFileId
                    ? 'bg-labstx-orange/10 text-labstx-orange border-r-2 border-labstx-orange'
                    : 'text-caspier-muted hover:bg-caspier-hover hover:text-caspier-text'
                    }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={handleClick}
            >
                {/* Toggle / Spacer */}
                <span className="mr-1.5 opacity-70 flex-shrink-0">
                    {node.type === 'folder' ? (
                        isOpen ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />
                    ) : (
                        <div className="w-3 h-3" />
                    )}
                </span>

                {/* Icon */}
                <span className="mr-1.5 flex-shrink-0">
                    {node.type === 'folder' ? <FolderIcon className="w-4 h-4 text-labstx-orange" open={isOpen} /> : <SmartFileIcon name={node.name} className="w-4 h-4" />}
                </span>

                {/* Name or Input */}
                <div className="flex-1 min-w-0">
                    {isRenaming ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full bg-caspier-black border border-labstx-orange text-caspier-text px-1 py-0.5 text-xs outline-none"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, true)}
                                onBlur={() => onCancelRename()}
                            />
                        </div>
                    ) : (
                        <span className="truncate block">{node.name}</span>
                    )}
                </div>

                {/* Hover Actions */}
                {!isRenaming && (
                    <div className="flex items-center gap-1 pl-2 z-10">
                        {node.type === 'folder' && (
                            <>
                                <button
                                    className="p-1 hover:text-labstx-orange"
                                    title="New File"
                                    onClick={(e) => { e.stopPropagation(); setIsOpen(true); onStartCreate(node.id, 'file'); }}
                                >
                                    <FilePlusIcon className="w-3 h-3" />
                                </button>
                                <button
                                    className="p-1 hover:text-labstx-orange"
                                    title="New Folder"
                                    onClick={(e) => { e.stopPropagation(); setIsOpen(true); onStartCreate(node.id, 'folder'); }}
                                >
                                    <FolderPlusIcon className="w-3 h-3" />
                                </button>
                            </>
                        )}
                        <button
                            className="p-1 hover:text-blue-400"
                            title="Rename"
                            onClick={(e) => { e.stopPropagation(); onStartRename(node.id, node.name); }}
                        >
                            <EditIcon className="w-3 h-3" />
                        </button>
                        <button
                            className="p-1 hover:text-red-500"
                            title="Delete"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to delete ${node.name}?`)) {
                                    onDelete(node.id);
                                }
                            }}
                        >
                            <TrashIcon className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>

            {/* Children */}
            {node.type === 'folder' && isOpen && (
                <div>
                    {/* Creating New Node Input Area */}
                    {isCreatingChild && (
                        <div
                            className="flex items-center py-1 pr-2 animate-in fade-in duration-200"
                            style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
                        >
                            <span className="mr-1.5 flex-shrink-0 ml-4.5">
                                {creatingType === 'folder' ? <FolderIcon className="w-4 h-4 text-labstx-orange" /> : <FileIcon className="w-4 h-4 text-caspier-muted" />}
                            </span>
                            <div className="flex-1 flex items-center gap-1">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="w-full bg-caspier-black border border-labstx-orange text-caspier-text px-1 py-0.5 text-xs outline-none focus:shadow-[2px_2px_0_0_#007bff]"
                                    placeholder={creatingType === 'folder' ? "Folder Name" : "File Name"}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, false)}
                                    onBlur={() => { if (!inputValue) onCancelCreate(); }}
                                />
                                <button onClick={() => onSubmitCreate(inputValue)} className="text-green-500 hover:text-green-400"><CheckIcon className="w-3 h-3" /></button>
                                <button onClick={onCancelCreate} className="text-red-500 hover:text-red-400"><XIcon className="w-3 h-3" /></button>
                            </div>
                        </div>
                    )}

                    {node.children && node.children.map((child) => (
                        <FileTreeItem
                            key={child.id}
                            node={child}
                            activeFileId={activeFileId}
                            onSelect={onSelect}
                            depth={depth + 1}
                            onStartCreate={onStartCreate}
                            onStartRename={onStartRename}
                            onDelete={onDelete}
                            creatingInNodeId={creatingInNodeId}
                            creatingType={creatingType}
                            onSubmitCreate={onSubmitCreate}
                            onCancelCreate={onCancelCreate}
                            editingId={editingId}
                            onSubmitRename={onSubmitRename}
                            onCancelRename={onCancelRename}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface InputGroupProps {
    label: string;
    children: React.ReactNode;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, children }) => (
    <div className="mb-4">
        <label className="block text-xs text-caspier-muted uppercase font-bold mb-2">{label}</label>
        {children}
    </div>
);

interface SearchResult {
    file: FileNode;
    fileNameMatch: boolean;
    contentMatches: { line: number; text: string; indices: [number, number] }[];
}

const SearchResultItem: React.FC<{
    result: SearchResult;
    onFileSelect: (id: string) => void;
    searchQuery: string;
    replaceQuery: string;
    onReplaceInFile: (fileId: string, newContent: string) => void;
    createSearchRegex: (q: string) => RegExp | null;
}> = ({ result, onFileSelect, searchQuery, replaceQuery, onReplaceInFile, createSearchRegex }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleReplaceThisFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        const regex = createSearchRegex(searchQuery);
        if (!regex || !result.file.content) return;
        const newContent = result.file.content.replace(regex, replaceQuery);
        onReplaceInFile(result.file.id, newContent);
    };

    const renderMatchText = (text: string, indices: [number, number]) => {
        const [start, end] = indices;
        const prefix = text.substring(Math.max(0, start - 20), start);
        const match = text.substring(start, end);
        const suffix = text.substring(end, Math.min(text.length, end + 40));

        return (
            <>
                <span className="opacity-50">...</span>
                <span>{prefix}</span>
                <span className="bg-labstx-orange/40 text-caspier-text rounded-sm px-0.5 border border-labstx-orange/20">{match}</span>
                <span>{suffix}</span>
                <span className="opacity-50">...</span>
            </>
        );
    };

    return (
        <div className="mb-0.5 overflow-hidden">
            <div
                className="flex items-center gap-1.5 cursor-pointer py-1 px-1.5 hover:bg-caspier-hover rounded group/file select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <ChevronRightIcon className={`w-3 h-3 text-caspier-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                <SmartFileIcon name={result.file.name} className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-[11px] text-caspier-text font-bold truncate flex-1">{result.file.name}</span>

                <div className="flex items-center gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity">
                    {replaceQuery && (
                        <button
                            className="p-1 hover:text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors"
                            onClick={handleReplaceThisFile}
                            title="Replace in this file"
                        >
                            <ReplaceIcon className="w-3 h-3" />
                        </button>
                    )}
                    <span className="text-[9px] font-black bg-caspier-border/40 text-caspier-muted px-1 rounded h-4 flex items-center">
                        {result.contentMatches.length}
                    </span>
                </div>
            </div>

            {isExpanded && result.contentMatches.length > 0 && (
                <div className="ml-4 mt-0.5 border-l border-caspier-border/30 space-y-0">
                    {result.contentMatches.map((match, idx) => (
                        <div
                            key={idx}
                            className="text-[10px] font-mono text-caspier-muted cursor-pointer hover:bg-caspier-hover/50 px-2 py-1 truncate flex items-center group/match"
                            onClick={() => onFileSelect(result.file.id)}
                            title={`Line ${match.line}: ${match.text.trim()}`}
                        >
                            <span className="text-caspier-muted/40 mr-2 w-7 text-right select-none flex-shrink-0">{match.line}</span>
                            <span className="truncate text-caspier-text/90">
                                {renderMatchText(match.text, match.indices)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const SidebarLeft: React.FC<SidebarLeftProps> = ({
    files, activeFileId, onFileSelect, activeView,
    onCreateNode, onRenameNode, onDeleteNode, width,
    settings, onUpdateSettings,
    gitState, onStageFile, onUnstageFile, onDiscardFile, onCommit, onPush, onSwitchBranch, onCreateBranch,
    wallet, onWalletConnect, onWalletDisconnect, compilationResult, onDeploySuccess,
    onLoadTemplate, onCreateBlank, onImport, theme, onAddTerminalLine,
    isProjectModalOpen, setIsProjectModalOpen, sessionId, onUpdateFiles, onCollapseAll
}) => {
    // Explorer State
    const [creatingInNodeId, setCreatingInNodeId] = useState<string | null>(null);
    const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [replaceQuery, setReplaceQuery] = useState('');
    const [isReplaceVisible, setIsReplaceVisible] = useState(false);
    const [searchOptions, setSearchOptions] = useState({
        matchCase: false,
        matchWholeWord: false,
        useRegex: false
    });

    // Git State
    const [commitMessage, setCommitMessage] = useState('');
    const [isPushing, setIsPushing] = useState(false);

    // --- Explorer Handlers ---
    const startCreate = (parentId: string, type: 'file' | 'folder') => {
        setCreatingInNodeId(parentId);
        setCreatingType(type);
        setEditingId(null);
    };

    const cancelCreate = () => {
        setCreatingInNodeId(null);
        setCreatingType(null);
    };

    const submitCreate = (name: string) => {
        if (name.trim() && creatingInNodeId && creatingType) {
            onCreateNode(creatingInNodeId, creatingType, name.trim());
        }
        cancelCreate();
    };

    const startRename = (id: string, currentName: string) => {
        setEditingId(id);
        setCreatingInNodeId(null);
    };

    const cancelRename = () => {
        setEditingId(null);
    };

    const submitRename = (id: string, newName: string) => {
        if (newName.trim()) {
            onRenameNode(id, newName.trim());
        }
        cancelRename();
    };

    // --- Search Logic ---
    const createSearchRegex = (query: string, global: boolean = true) => {
        try {
            let pattern = query;
            if (!searchOptions.useRegex) {
                // Escape regex special chars
                pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }

            if (searchOptions.matchWholeWord) {
                pattern = `\\b${pattern}\\b`;
            }

            const flags = (global ? 'g' : '') + (searchOptions.matchCase ? '' : 'i');
            return new RegExp(pattern, flags);
        } catch (e) {
            return null;
        }
    };

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];

        const results: SearchResult[] = [];
        const regex = createSearchRegex(searchQuery);
        if (!regex) return [];

        const traverse = (nodes: FileNode[]) => {
            for (const node of nodes) {
                if (node.type === 'file') {
                    let fileNameMatch = regex.test(node.name);
                    let contentMatches: { line: number; text: string; indices: [number, number] }[] = [];

                    if (node.content) {
                        const lines = node.content.split('\n');
                        lines.forEach((line, index) => {
                            regex.lastIndex = 0; // Reset for each line
                            const match = regex.exec(line);
                            if (match) {
                                contentMatches.push({
                                    line: index + 1,
                                    text: line,
                                    indices: [match.index, match.index + match[0].length]
                                });
                            }
                        });
                    }

                    if (fileNameMatch || contentMatches.length > 0) {
                        results.push({ file: node, fileNameMatch, contentMatches });
                    }
                }

                if (node.children) {
                    traverse(node.children);
                }
            }
        };

        traverse(files);
        return results;
    }, [searchQuery, files, searchOptions]);

    const handleReplaceAll = () => {
        if (!searchQuery || !onUpdateFiles) return;
        const regex = createSearchRegex(searchQuery);
        if (!regex) return;

        if (!window.confirm(`Are you sure you want to replace all occurrences of "${searchQuery}" with "${replaceQuery}" across all files?`)) {
            return;
        }

        const replaceRecursive = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
                if (node.type === 'file' && node.content) {
                    const newContent = node.content.replace(regex, replaceQuery);
                    return { ...node, content: newContent };
                }
                if (node.children) {
                    return { ...node, children: replaceRecursive(node.children) };
                }
                return node;
            });
        };

        const newFiles = replaceRecursive(files);
        onUpdateFiles(newFiles);
        onAddTerminalLine?.({ type: 'info', content: `Replace All: Processed ${searchResults.length} files.` });
    };

    const handleReplaceInFile = (fileId: string, newContent: string) => {
        if (!onUpdateFiles) return;
        const updateRecursive = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
                if (node.id === fileId) return { ...node, content: newContent };
                if (node.children) return { ...node, children: updateRecursive(node.children) };
                return node;
            });
        };
        onUpdateFiles(updateRecursive(files));
    };

    // --- Helper to find file name by ID ---
    const findFileName = (nodes: FileNode[], id: string): string => {
        const file = findFile(nodes, id);
        return file ? file.name : id;
    };

    const findFile = (nodes: FileNode[], id: string): FileNode | null => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findFile(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const handleCommitSubmit = () => {
        if (commitMessage.trim() && onCommit) {
            onCommit(commitMessage);
            setCommitMessage('');
        }
    };

    const handlePushClick = () => {
        if (onPush) {
            setIsPushing(true);
            onPush();
            setTimeout(() => setIsPushing(false), 1500);
        }
    };

    // --- Render Views ---

    const handleLoadTemplate = (templateId: string) => {
        const template = TEMPLATES.find(t => t.id === templateId);
        if (!template || !onLoadTemplate) return;

        const nodes = templateToFileNodes(template);
        onLoadTemplate(nodes);
    };

    const renderExplorer = () => (
        <div id="explorer-view" className="h-full flex flex-col">
            <div className="p-3 border-b border-caspier-border flex justify-between items-center bg-caspier-black">
                <span className="text-[10px] font-black text-caspier-muted tracking-[0.2em] uppercase">File Explorer</span>
                <div className="flex gap-2">
                    {/* Global Add Actions (Default to Root) */}
                    <button
                        className="text-caspier-muted hover:text-caspier-text p-1"
                        title="New File"
                        onClick={() => startCreate('root', 'file')}
                    >
                        <FilePlusIcon className="w-4 h-4" />
                    </button>
                    <button
                        className="text-caspier-muted hover:text-caspier-text p-1"
                        title="New Folder"
                        onClick={() => startCreate('root', 'folder')}
                    >
                        <FolderPlusIcon className="w-4 h-4" />
                    </button>
                    <button
                        className="text-caspier-muted hover:text-caspier-text p-1"
                        title="Collapse All"
                        onClick={onCollapseAll}
                    >
                        <CollapseIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Create Project Button */}
            <div className="px-3 py-3 border-b border-caspier-border bg-caspier-black/40">
                <button
                    id="create-project-button"
                    onClick={() => setIsProjectModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-labstx-orange/10 hover:bg-labstx-orange text-labstx-orange hover:text-white border border-labstx-orange hover:border-labstx-orange rounded-full transition-all font-black text-[10px] uppercase tracking-widest group shadow-sm active:scale-[0.98]"
                >
                    <PlusIcon className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
                    Create New Project
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
                {files.map(node => (
                    <FileTreeItem
                        key={node.id}
                        node={node}
                        activeFileId={activeFileId}
                        onSelect={onFileSelect}
                        onStartCreate={startCreate}
                        onStartRename={startRename}
                        onDelete={onDeleteNode}
                        creatingInNodeId={creatingInNodeId}
                        creatingType={creatingType}
                        onSubmitCreate={submitCreate}
                        onCancelCreate={cancelCreate}
                        editingId={editingId}
                        onSubmitRename={submitRename}
                        onCancelRename={cancelRename}
                    />
                ))}
            </div>
        </div>
    );

    const renderSearch = () => (
        <div className="flex flex-col h-full bg-caspier-black">
            <div className="p-3 border-b border-caspier-border">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[10px] font-black text-caspier-muted tracking-[0.2em] uppercase">Search & Replace</h2>
                </div>

                <div className="space-y-2">
                    {/* Search Field */}
                    <div className="flex items-center gap-1 group">
                        <button
                            onClick={() => setIsReplaceVisible(!isReplaceVisible)}
                            className={`p-1 transition-transform ${isReplaceVisible ? 'rotate-90' : ''}`}
                        >
                            <ChevronRightIcon className="w-3 h-3 text-caspier-muted" />
                        </button>
                        <div className="relative flex-1">
                            <input
                                type="text"
                                className="w-full bg-caspier-dark border border-caspier-border text-white text-[11px] font-medium px-2 py-1.5 focus:border-labstx-orange outline-none rounded pr-20"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                <button
                                    className={`p-1 rounded-sm transition-colors ${searchOptions.matchCase ? 'bg-labstx-orange/20 text-labstx-orange' : 'text-caspier-muted hover:bg-caspier-hover'}`}
                                    onClick={() => setSearchOptions(prev => ({ ...prev, matchCase: !prev.matchCase }))}
                                    title="Match Case"
                                >
                                    <CaseSensitiveIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    className={`p-1 rounded-sm transition-colors ${searchOptions.matchWholeWord ? 'bg-labstx-orange/20 text-labstx-orange' : 'text-caspier-muted hover:bg-caspier-hover'}`}
                                    onClick={() => setSearchOptions(prev => ({ ...prev, matchWholeWord: !prev.matchWholeWord }))}
                                    title="Match Whole Word"
                                >
                                    <WholeWordIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    className={`p-1 rounded-sm transition-colors ${searchOptions.useRegex ? 'bg-labstx-orange/20 text-labstx-orange' : 'text-caspier-muted hover:bg-caspier-hover'}`}
                                    onClick={() => setSearchOptions(prev => ({ ...prev, useRegex: !prev.useRegex }))}
                                    title="Use Regular Expression"
                                >
                                    <RegexIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Replace Field */}
                    {isReplaceVisible && (
                        <div className="flex items-center gap-1 animate-in slide-in-from-top-1 duration-200 pl-4">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    className="w-full bg-caspier-dark border border-caspier-border text-white text-[11px] font-medium px-2 py-1.5 focus:border-emerald-500 outline-none rounded pr-8"
                                    placeholder="Replace"
                                    value={replaceQuery}
                                    onChange={(e) => setReplaceQuery(e.target.value)}
                                />
                                <button
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-caspier-muted hover:text-emerald-500"
                                    onClick={handleReplaceAll}
                                    title="Replace All"
                                >
                                    <ReplaceIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-3 bg-caspier-dark/20">
                {!searchQuery && (
                    <div className="text-caspier-muted text-[11px] text-center mt-8 opacity-40">
                        Type to search across files...
                    </div>
                )}
                {searchQuery && searchResults.length === 0 && (
                    <div className="text-caspier-muted text-[11px] text-center mt-8">
                        No results found.
                    </div>
                )}

                {searchResults.map((result) => (
                    <SearchResultItem
                        key={result.file.id}
                        result={result}
                        onFileSelect={onFileSelect}
                        searchQuery={searchQuery}
                        replaceQuery={replaceQuery}
                        onReplaceInFile={handleReplaceInFile}
                        createSearchRegex={createSearchRegex}
                    />
                ))}
            </div>
        </div>
    );

    const renderGit = () => {
        if (!gitState) return null;

        const branches = Array.from(new Set(gitState.commits.map(c => c.branch || 'main'))) as string[];
        const lanes: Record<string, number> = {};

        if (branches.includes('main')) {
            lanes['main'] = 0;
            branches.filter(b => b !== 'main').forEach((b, i) => lanes[b] = i + 1);
        } else {
            branches.forEach((b, i) => lanes[b] = i);
        }

        const getLane = (branch?: string) => lanes[branch || 'main'] || 0;

        const ROW_HEIGHT = 42;
        const COL_WIDTH = 14;
        const DOT_RADIUS = 3;
        const branchColors = ['#007bff', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
        const getColor = (lane: number) => branchColors[lane % branchColors.length];

        return (
            <div id="git-view" className="flex flex-col h-full bg-caspier-dark">
                <div className="p-3 border-b border-caspier-border flex justify-between items-center bg-caspier-black">
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-[10px] font-black text-caspier-muted tracking-[0.2em] uppercase leading-none mb-1">Source Control</span>
                        <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => {
                            const newBranch = window.prompt('Switch/Create branch:', gitState.branch);
                            if (newBranch && newBranch !== gitState.branch) {
                                if (branches.includes(newBranch)) onSwitchBranch?.(newBranch);
                                else onCreateBranch?.(newBranch);
                            }
                        }}>
                            <GitBranchIcon className="w-3.5 h-3.5 text-labstx-orange" />
                            <span className="text-xs font-black text-caspier-text truncate group-hover:text-labstx-orange transition-colors uppercase tracking-tight">{gitState.branch}</span>
                            <ChevronDownIcon className="w-3 h-3 text-caspier-muted opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button
                            className={`p-1.5 rounded-md hover:bg-caspier-hover text-caspier-muted hover:text-caspier-text transition-all ${isPushing ? 'animate-spin text-labstx-orange' : ''}`}
                            title="Sync / Push Changes"
                            onClick={handlePushClick}
                        >
                            <RefreshIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="flex flex-col gap-2.5 p-1 bg-caspier-black/30 rounded-lg border border-caspier-border">
                        <textarea
                            className="w-full bg-caspier-black/50 border border-caspier-border text-caspier-text p-2.5 text-[11px] font-medium focus:border-labstx-orange/50 focus:ring-1 focus:ring-labstx-orange/20 outline-none resize-none h-20 rounded-md placeholder:text-caspier-muted transition-all"
                            placeholder="Commit message..."
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                        />
                        <button
                            onClick={handleCommitSubmit}
                            disabled={gitState.stagedFiles.length === 0 || !commitMessage.trim()}
                            className={`flex items-center justify-center gap-2 py-1.5 px-4 rounded-md text-[11px] font-black uppercase tracking-widest transition-all ${(gitState.stagedFiles.length === 0 || !commitMessage.trim())
                                ? 'bg-caspier-border text-caspier-muted cursor-not-allowed opacity-50'
                                : 'bg-labstx-orange text-white hover:bg-labstx-orange/90 shadow-[0_2px_10px_-3px_rgba(0,123,255,0.4)] active:scale-95'
                                }`}
                        >
                            <GitCommitIcon className="w-3.5 h-3.5" />
                            Commit
                        </button>
                    </div>

                    <div>
                        <div className="flex items-center justify-between text-[10px] font-black text-caspier-muted mb-2 uppercase tracking-widest px-1">
                            <span>Staged ({gitState.stagedFiles.length})</span>
                            <div className="h-[1px] flex-1 bg-caspier-border ml-3" />
                        </div>
                        {gitState.stagedFiles.length === 0 ? (
                            <div className="text-[11px] text-caspier-muted italic px-2 py-4 text-center border border-dashed border-caspier-border rounded-lg">No staged changes</div>
                        ) : (
                            <div className="space-y-0.5">
                                {gitState.stagedFiles.map(id => (
                                    <div key={id} className="flex items-center justify-between group hover:bg-caspier-hover px-2 py-1.5 rounded-md transition-all border border-transparent hover:border-caspier-border">
                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                            <SmartFileIcon name={findFileName(files, id)} className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="text-xs font-bold text-caspier-text truncate">{findFileName(files, id)}</span>
                                            <span className="text-[9px] font-black text-green-500 bg-green-500/10 px-1 rounded">STAGED</span>
                                        </div>
                                        <button
                                            className="p-1 rounded-md text-caspier-muted hover:text-caspier-text hover:bg-caspier-border opacity-0 group-hover:opacity-100 transition-all scale-90"
                                            onClick={() => onUnstageFile?.(id)}
                                            title="Unstage"
                                        >
                                            <MinusIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between text-[10px] font-black text-caspier-muted mb-2 uppercase tracking-widest px-1">
                            <span>Changes ({gitState.modifiedFiles.length})</span>
                            <div className="h-[1px] flex-1 bg-caspier-border ml-3" />
                        </div>
                        {gitState.modifiedFiles.length === 0 ? (
                            <div className="text-[11px] text-caspier-muted italic px-2 py-4 text-center border border-dashed border-caspier-border rounded-lg">All changes committed</div>
                        ) : (
                            <div className="space-y-0.5">
                                {gitState.modifiedFiles.map(id => (
                                    <div key={id} className="flex items-center justify-between group hover:bg-caspier-hover px-2 py-1.5 rounded-md transition-all border border-transparent hover:border-caspier-border">
                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                            <SmartFileIcon name={findFileName(files, id)} className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="text-xs font-bold text-caspier-text truncate">{findFileName(files, id)}</span>
                                            <span className="text-[9px] font-black text-labstx-orange bg-labstx-orange/10 px-1 rounded">MODIFIED</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all scale-90">
                                            <button
                                                className="p-1 rounded-md text-caspier-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                onClick={() => {
                                                    if (window.confirm('Discard all changes in this file?')) {
                                                        onDiscardFile?.(id);
                                                    }
                                                }}
                                                title="Discard Changes"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                className="p-1 rounded-md text-caspier-muted hover:text-green-500 hover:bg-green-500/10 transition-all"
                                                onClick={() => onStageFile?.(id)}
                                                title="Stage"
                                            >
                                                <PlusIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-caspier-border">
                        <div className="flex items-center justify-between text-[10px] font-black text-caspier-muted mb-4 uppercase tracking-widest px-1">
                            <span>Commits ({gitState.commits.length})</span>
                            <div className="flex items-center gap-1 text-[9px] bg-labstx-orange/10 text-labstx-orange px-1.5 py-0.5 rounded border border-labstx-orange/20">
                                <GitBranchIcon className="w-2.5 h-2.5" />
                                <span>{gitState.branch}</span>
                            </div>
                        </div>

                        {gitState.commits.length === 0 ? (
                            <div className="text-xs text-caspier-muted italic">No commits yet.</div>
                        ) : (
                            <div className="relative">
                                {gitState.commits.map((commit, index) => {
                                    const isHead = index === 0;
                                    const lane = getLane(commit.branch);
                                    const laneX = lane * COL_WIDTH + COL_WIDTH / 2;
                                    const centerY = ROW_HEIGHT / 2;

                                    return (
                                        <div key={commit.id} className="flex relative h-[42px]">
                                            <div className="relative flex-shrink-0 w-[50px]">
                                                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                                                    {commit.parents?.map(parentId => {
                                                        const parentIndex = gitState.commits.findIndex(c => c.id === parentId);
                                                        if (parentIndex > index) {
                                                            const parent = gitState.commits[parentIndex];
                                                            const parentLane = getLane(parent.branch);
                                                            const parentX = parentLane * COL_WIDTH + COL_WIDTH / 2;
                                                            const y2 = (parentIndex - index) * ROW_HEIGHT + ROW_HEIGHT / 2;
                                                            return (
                                                                <path
                                                                    key={parentId}
                                                                    d={`M ${laneX} ${centerY} C ${laneX} ${ROW_HEIGHT}, ${parentX} ${y2 - ROW_HEIGHT}, ${parentX} ${y2}`}
                                                                    stroke={getColor(parentLane)}
                                                                    strokeWidth="2"
                                                                    fill="none"
                                                                    opacity="0.6"
                                                                />
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                    <circle
                                                        cx={laneX}
                                                        cy={centerY}
                                                        r={DOT_RADIUS}
                                                        fill={isHead ? 'transparent' : getColor(lane)}
                                                        stroke={getColor(lane)}
                                                        strokeWidth="2"
                                                    />
                                                    {isHead && (
                                                        <circle cx={laneX} cy={centerY} r={1.5} fill={getColor(lane)} />
                                                    )}
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center border-b border-caspier-border group-last:border-0 ml-3 py-1">
                                                <div className="flex items-center gap-2 mb-0.5 min-w-0">
                                                    <span className={`text-[11px] font-bold truncate leading-tight ${isHead ? 'text-white' : 'text-caspier-muted hover:text-caspier-text'}`}>
                                                        {commit.message}
                                                    </span>
                                                    {isHead && (
                                                        <span className="text-[8px] font-black border border-labstx-orange/40 text-labstx-orange px-1 rounded bg-labstx-orange/5 uppercase tracking-tighter">HEAD</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-[9px] text-caspier-muted font-bold tracking-tight">
                                                    <span className="font-mono text-caspier-text opacity-50 px-1 bg-caspier-black/50 rounded">{commit.hash || commit.id.substring(commit.id.length - 6)}</span>
                                                    <span className="opacity-60">{new Date(commit.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderDeploy = () => (
        <div id="deploy-view-sidebar" className="flex flex-col h-full">
            <div className="p-4 border-b border-caspier-border bg-caspier-black">
                <h2 className="text-[10px] font-black text-caspier-muted tracking-[0.2em] uppercase">Deploy & Interaction</h2>
            </div>
            {(!wallet || !onWalletConnect || !onWalletDisconnect) ? (
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="text-caspier-muted text-sm italic">Connect your wallet to enable deployment features.</div>
                </div>
            ) : (
                <DeployPanel
                    files={files}
                    wallet={wallet}
                    onWalletConnect={onWalletConnect}
                    onWalletDisconnect={onWalletDisconnect}
                    compilationResult={compilationResult}
                    onDeploySuccess={onDeploySuccess}
                    onAddTerminalLine={onAddTerminalLine}
                    width={width}
                    theme={theme}
                    settings={settings}
                    onUpdateSettings={onUpdateSettings}
                />
            )}
        </div>
    );

    const renderSettings = () => (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-caspier-border bg-caspier-black">
                <h2 className="text-[10px] font-black text-caspier-muted tracking-[0.2em] uppercase">Project Settings</h2>
            </div>
            {(!settings || !onUpdateSettings) ? null : (
                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="text-labstx-orange font-black text-[10px] uppercase mb-4 tracking-widest border-b border-caspier-border pb-2">Editor Configuration</h3>
                    <InputGroup label="Font Size">
                        <input
                            type="number"
                            value={settings.fontSize}
                            onChange={(e) => onUpdateSettings('fontSize', parseInt(e.target.value))}
                            className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-1.5 text-sm focus:border-labstx-orange outline-none"
                        />
                    </InputGroup>
                    <InputGroup label="Word Wrap">
                        <select
                            value={settings.wordWrap}
                            onChange={(e) => onUpdateSettings('wordWrap', e.target.value)}
                            className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-1.5 text-sm focus:border-labstx-orange outline-none"
                        >
                            <option value="on">On</option>
                            <option value="off">Off</option>
                        </select>
                    </InputGroup>
                    <InputGroup label="Tab Size">
                        <input
                            type="number"
                            value={settings.tabSize}
                            onChange={(e) => onUpdateSettings('tabSize', parseInt(e.target.value))}
                            className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-1.5 text-sm focus:border-labstx-orange outline-none"
                        />
                    </InputGroup>
                    <div className="flex items-center gap-2 mb-8">
                        <input
                            type="checkbox"
                            id="minimap"
                            checked={settings.minimap}
                            onChange={(e) => onUpdateSettings('minimap', e.target.checked)}
                            className="rounded border-caspier-border bg-caspier-black text-labstx-orange focus:ring-labstx-orange"
                        />
                        <label htmlFor="minimap" className="text-sm text-caspier-muted font-bold">Show Minimap</label>
                    </div>

                    <h3 className="text-labstx-orange font-black text-[10px] uppercase mb-4 tracking-widest border-b border-caspier-border pb-2">AI Configuration</h3>
                    <InputGroup label="AI Model">
                        <select
                            value={settings.aiModel}
                            onChange={(e) => onUpdateSettings('aiModel', e.target.value)}
                            className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-1.5 text-sm focus:border-labstx-orange outline-none"
                        >
                            <option value="google/gemini-2.0-flash">Gemini 2.0 Flash</option>
                            <optgroup label="Free Models">
                                <option value="liquid/lfm-2.5-1.2b:free">Liquid LFM 2.5</option>
                                <option value="stepfun/step-3.5-flash:free">StepFun Step 3.5 Flash</option>
                                <option value="arcee-ai/trinity-large-preview:free">Arcee Trinity Large Preview</option>
                                <option value="liquid/lfm-2.5-1.2b-thinking:free">Liquid LFM 2.5 Thinking</option>
                                <option value="liquid/lfm-2.5-1.2b-instruct:free">Liquid LFM 2.5 Instruct</option>
                                <option value="nvidia/nemotron-3-nano-30b-a3b:free">Nvidia Nemotron 3 Nano 30B</option>
                                <option value="arcee-ai/trinity-mini:free">Arcee Trinity Mini</option>
                            </optgroup>
                        </select>
                    </InputGroup>
                    <InputGroup label="API Key">
                        <input
                            type="password"
                            value={settings.aiApiKey}
                            onChange={(e) => onUpdateSettings('aiApiKey', e.target.value)}
                            placeholder="sk-or-v1-..."
                            className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-1.5 text-sm focus:border-labstx-orange outline-none"
                        />
                    </InputGroup>
                </div>
            )}
        </div>
    );

    const renderPlaceholder = () => (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-caspier-border bg-caspier-black">
                <h2 className="text-[10px] font-black text-caspier-muted tracking-[0.2em] uppercase">{activeView}</h2>
            </div>
            <div className="p-4 text-caspier-muted text-sm italic">This view is currently under development.</div>
        </div>
    );

    const renderContent = () => {
        switch (activeView) {
            case ActivityView.EXPLORER: return renderExplorer();
            case ActivityView.SEARCH: return renderSearch();
            case ActivityView.GIT: return renderGit();
            case ActivityView.DEPLOY: return renderDeploy();
            case ActivityView.DEBUG: {
                const activeFile = activeFileId ? findFile(files, activeFileId) : null;
                return (
                    <DebugPanel
                        compilationResult={compilationResult}
                        contractCode={activeFile?.content || ''}
                        contractName={activeFile?.name || ''}
                        theme={theme}
                        sessionId={sessionId}
                    />
                );
            }
            case ActivityView.SETTINGS: return renderSettings();
            default: return renderPlaceholder();
        }
    };

    return (
        <div style={{ width }} className="relative flex-shrink-0 bg-caspier-dark border-r border-caspier-border flex flex-col h-full overflow-hidden">
            {renderContent()}

            {/* New Project Dialog */}
            <NewProjectModal
                isOpen={isProjectModalOpen}
                onClose={() => setIsProjectModalOpen(false)}
                onLoadTemplate={handleLoadTemplate}
                onCreateBlank={() => {
                    if (onCreateBlank) onCreateBlank();
                    setIsProjectModalOpen(false);
                }}
                onImport={() => {
                    if (onImport) onImport();
                    setIsProjectModalOpen(false);
                }}
            />
        </div>
    );
};

export default SidebarLeft;
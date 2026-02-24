

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FileNode, ActivityView, ProjectSettings, GitState, GitCommit, WalletConnection, CompilationResult, DeployedContract, TerminalLine } from '../../types';
import {
    FolderIcon, FileIcon, ChevronRightIcon, ChevronDownIcon,
    FilePlusIcon, FolderPlusIcon, EditIcon, TrashIcon, CheckIcon, XIcon,
    UndoIcon, RedoIcon, SearchIcon, SettingsIcon, GitIcon, PlusIcon, MinusIcon, RefreshIcon, SmartFileIcon, RocketIcon
} from '../UI/Icons';
import { Button } from '../UI/Button';
import DeployPanel from '../Deploy/DeployPanel';
import DebugPanel from '../Layout/DebugPanel';
import { TEMPLATES, templateToFileNodes } from '../../services/templates';

interface SidebarLeftProps {
    files: FileNode[];
    activeFileId: string | null;
    onFileSelect: (fileId: string) => void;
    activeView: ActivityView;
    onCreateNode: (parentId: string, type: 'file' | 'folder', name: string) => void;
    onRenameNode: (id: string, newName: string) => void;
    onDeleteNode: (id: string) => void;
    width: number;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    settings?: ProjectSettings;
    onUpdateSettings?: (key: keyof ProjectSettings, value: any) => void;
    gitState?: GitState;
    onStageFile?: (id: string) => void;
    onUnstageFile?: (id: string) => void;
    onCommit?: (message: string) => void;
    onPush?: () => void;
    wallet?: WalletConnection;
    onWalletConnect?: (wallet: WalletConnection) => void;
    onWalletDisconnect?: () => void;
    compilationResult?: CompilationResult;
    onDeploySuccess?: (contract: DeployedContract) => void;
    onLoadTemplate?: (nodes: FileNode[]) => void;
    onAddTerminalLine?: (line: Omit<TerminalLine, 'id'>) => void;
    theme: 'dark' | 'light';
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
    const [isOpen, setIsOpen] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

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
                    ? 'bg-caspier-red/10 text-caspier-red border-r-2 border-caspier-red'
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
                    {node.type === 'folder' ? <FolderIcon className="w-4 h-4 text-caspier-red" open={isOpen} /> : <SmartFileIcon name={node.name} className="w-4 h-4" />}
                </span>

                {/* Name or Input */}
                <div className="flex-1 min-w-0">
                    {isRenaming ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full bg-caspier-black border border-caspier-red text-caspier-text px-1 py-0.5 text-xs outline-none"
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
                    <div className="hidden group-hover:flex items-center gap-1 bg-caspier-dark pl-2 shadow-[-10px_0_10px_0_rgba(0,0,0,0.8)] z-10">
                        {node.type === 'folder' && (
                            <>
                                <button
                                    className="p-1 hover:text-caspier-red"
                                    title="New File"
                                    onClick={(e) => { e.stopPropagation(); setIsOpen(true); onStartCreate(node.id, 'file'); }}
                                >
                                    <FilePlusIcon className="w-3 h-3" />
                                </button>
                                <button
                                    className="p-1 hover:text-caspier-red"
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
                                {creatingType === 'folder' ? <FolderIcon className="w-4 h-4 text-caspier-red" /> : <FileIcon className="w-4 h-4 text-caspier-muted" />}
                            </span>
                            <div className="flex-1 flex items-center gap-1">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="w-full bg-caspier-black border border-caspier-red text-caspier-text px-1 py-0.5 text-xs outline-none focus:shadow-[2px_2px_0_0_#ff2d2e]"
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

// Collapsible Templates Section Component
interface TemplatesSectionProps {
    templates: typeof TEMPLATES;
    onLoadTemplate: (templateId: string) => void;
}

const TemplatesSection: React.FC<TemplatesSectionProps> = ({ templates, onLoadTemplate }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-caspier-border bg-caspier-black">
            <button
                className="w-full p-3 flex items-center justify-between hover:bg-caspier-hover transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-xs font-bold text-caspier-muted uppercase">
                    Examples ({templates.length})
                </span>
                <span className="text-caspier-muted">
                    {isOpen ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                </span>
            </button>

            {isOpen && (
                <div className="px-3 pb-3 max-h-64 overflow-y-auto space-y-1">
                    {templates.map(template => (
                        <button
                            key={template.id}
                            onClick={() => onLoadTemplate(template.id)}
                            className="w-full text-left p-2 bg-caspier-dark hover:bg-caspier-hover border border-caspier-border rounded text-xs transition-colors"
                        >
                            <div className="text-caspier-text font-medium">{template.name}</div>
                            <div className="text-caspier-muted text-[10px] mt-0.5 truncate">{template.description}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

interface SearchResult {
    file: FileNode;
    fileNameMatch: boolean;
    contentMatches: { line: number; text: string }[];
}

const SidebarLeft: React.FC<SidebarLeftProps> = ({
    files, activeFileId, onFileSelect, activeView,
    onCreateNode, onRenameNode, onDeleteNode, width,
    onUndo, onRedo, canUndo, canRedo,
    settings, onUpdateSettings,
    gitState, onStageFile, onUnstageFile, onCommit, onPush,
    wallet, onWalletConnect, onWalletDisconnect, compilationResult, onDeploySuccess,
    onLoadTemplate, theme, onAddTerminalLine
}) => {
    // Explorer State
    const [creatingInNodeId, setCreatingInNodeId] = useState<string | null>(null);
    const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');

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
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];

        const results: SearchResult[] = [];
        const lowerQuery = searchQuery.toLowerCase();

        const traverse = (nodes: FileNode[]) => {
            for (const node of nodes) {
                if (node.type === 'file') {
                    let fileNameMatch = node.name.toLowerCase().includes(lowerQuery);
                    let contentMatches: { line: number; text: string }[] = [];

                    if (node.content) {
                        const lines = node.content.split('\n');
                        lines.forEach((line, index) => {
                            if (line.toLowerCase().includes(lowerQuery)) {
                                contentMatches.push({ line: index + 1, text: line.trim() });
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
    }, [searchQuery, files]);

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

    // Helper to find all Clarity files for deployment dropdown
    const findClarityFiles = (nodes: FileNode[]): FileNode[] => {
        let clarFiles: FileNode[] = [];
        for (const node of nodes) {
            if (node.type === 'file' && (node.name.endsWith('.clar') || node.language === 'clarity')) {
                clarFiles.push(node);
            }
            if (node.children) {
                clarFiles = [...clarFiles, ...findClarityFiles(node.children)];
            }
        }
        return clarFiles;
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
        <>
            <div className="p-3 border-b border-caspier-border flex justify-between items-center bg-caspier-black">
                <span className="text-xs font-bold text-caspier-text tracking-wider">FILE EXPLORER</span>
                <div className="flex gap-2">
                    {/* Undo / Redo */}
                    {(onUndo && onRedo) && (
                        <div className="flex gap-1 border-r border-caspier-border pr-2 mr-1">
                            <button
                                className={`p-1 ${canUndo ? 'text-caspier-muted hover:text-caspier-text' : 'text-caspier-border cursor-not-allowed'}`}
                                onClick={canUndo ? onUndo : undefined}
                                title="Undo"
                            >
                                <UndoIcon className="w-4 h-4" />
                            </button>
                            <button
                                className={`p-1 ${canRedo ? 'text-caspier-muted hover:text-caspier-text' : 'text-caspier-border cursor-not-allowed'}`}
                                onClick={canRedo ? onRedo : undefined}
                                title="Redo"
                            >
                                <RedoIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
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
                </div>
            </div>

            {/* Templates Section - Collapsible */}
            {onLoadTemplate && (
                <TemplatesSection templates={TEMPLATES} onLoadTemplate={handleLoadTemplate} />
            )}

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
        </>
    );

    const renderSearch = () => (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-caspier-border bg-caspier-black">
                <h2 className="text-xs font-bold text-caspier-text tracking-wider mb-3">SEARCH</h2>
                <div className="relative">
                    <input
                        type="text"
                        className="w-full bg-caspier-dark border border-caspier-border text-caspier-text text-sm px-3 py-1.5 focus:border-caspier-red outline-none pl-8"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <SearchIcon className="w-4 h-4 absolute left-2 top-2 text-caspier-muted" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {searchQuery && searchResults.length === 0 && (
                    <div className="text-caspier-muted text-xs text-center mt-4">No results found.</div>
                )}

                {searchResults.map((result) => (
                    <div key={result.file.id} className="mb-2">
                        <div
                            className="flex items-center gap-2 cursor-pointer py-1 px-2 hover:bg-caspier-hover rounded group"
                            onClick={() => onFileSelect(result.file.id)}
                        >
                            <SmartFileIcon name={result.file.name} className="w-4 h-4 text-caspier-muted group-hover:text-caspier-red" />
                            <span className="text-sm text-caspier-text font-medium truncate flex-1">{result.file.name}</span>
                            <span className="text-xs bg-caspier-panel text-caspier-muted px-1.5 rounded-full border border-caspier-border">
                                {result.contentMatches.length > 0 ? result.contentMatches.length : (result.fileNameMatch ? 'Name' : '0')}
                            </span>
                        </div>
                        {result.contentMatches.length > 0 && (
                            <div className="ml-4 pl-2 border-l border-caspier-border mt-1 space-y-1">
                                {result.contentMatches.map((match, idx) => (
                                    <div
                                        key={idx}
                                        className="text-xs font-mono text-caspier-muted cursor-pointer hover:text-caspier-text truncate py-0.5"
                                        onClick={() => onFileSelect(result.file.id)}
                                    >
                                        <span className="text-caspier-text mr-2 select-none">{match.line}:</span>
                                        <span>{match.text.substring(0, 100)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderGit = () => {
        if (!gitState) return null;

        // Assign lanes to branches
        // Main branch always lane 0
        const branches = Array.from(new Set(gitState.commits.map(c => c.branch || 'main'))) as string[];
        const lanes: Record<string, number> = {};

        // Ensure main is 0
        if (branches.includes('main')) {
            lanes['main'] = 0;
            branches.filter(b => b !== 'main').forEach((b, i) => lanes[b] = i + 1);
        } else {
            branches.forEach((b, i) => lanes[b] = i);
        }

        const getLane = (branch?: string) => lanes[branch || 'main'] || 0;

        // Visualization Constants
        const ROW_HEIGHT = 42;
        const COL_WIDTH = 14;
        const DOT_RADIUS = 3;

        // Colors for branches
        const branchColors = ['#ff2d2e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
        const getColor = (lane: number) => branchColors[lane % branchColors.length];

        return (
            <div className="flex flex-col h-full">
                <div className="p-3 border-b border-caspier-border flex justify-between items-center bg-caspier-black">
                    <span className="text-xs font-bold text-caspier-text tracking-wider">SOURCE CONTROL</span>
                    <div className="flex gap-2">
                        <button
                            className={`p-1 text-caspier-muted hover:text-caspier-text ${isPushing ? 'animate-spin text-caspier-red' : ''}`}
                            title="Push Changes"
                            onClick={handlePushClick}
                        >
                            <RefreshIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {/* Commit Input */}
                    <div className="flex flex-col gap-2">
                        <textarea
                            className="w-full bg-caspier-black border border-caspier-border text-caspier-text p-2 text-sm focus:border-caspier-red outline-none resize-none h-20"
                            placeholder="Message (Enter to commit)"
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleCommitSubmit();
                                }
                            }}
                        />
                        <Button
                            size="sm"
                            onClick={handleCommitSubmit}
                            disabled={gitState.stagedFiles.length === 0}
                            className={gitState.stagedFiles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                            Commit
                        </Button>
                    </div>

                    {/* Staged Changes */}
                    <div>
                        <div className="flex items-center justify-between text-xs font-bold text-caspier-muted mb-2 uppercase">
                            <span>Staged Changes ({gitState.stagedFiles.length})</span>
                        </div>
                        {gitState.stagedFiles.length === 0 ? (
                            <div className="text-xs text-caspier-muted italic">No staged changes</div>
                        ) : (
                            <div className="space-y-1">
                                {gitState.stagedFiles.map(id => (
                                    <div key={id} className="flex items-center justify-between group hover:bg-caspier-hover p-1 rounded">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <SmartFileIcon name={findFileName(files, id)} className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            <span className="text-sm text-caspier-text truncate">{findFileName(files, id)}</span>
                                            <span className="text-[10px] text-caspier-muted">M</span>
                                        </div>
                                        <button
                                            className="p-1 text-caspier-muted hover:text-caspier-text opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => onUnstageFile?.(id)}
                                            title="Unstage"
                                        >
                                            <MinusIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Changes */}
                    <div>
                        <div className="flex items-center justify-between text-xs font-bold text-caspier-muted mb-2 uppercase">
                            <span>Changes ({gitState.modifiedFiles.length})</span>
                        </div>
                        {gitState.modifiedFiles.length === 0 ? (
                            <div className="text-xs text-caspier-muted italic">No changes</div>
                        ) : (
                            <div className="space-y-1">
                                {gitState.modifiedFiles.map(id => (
                                    <div key={id} className="flex items-center justify-between group hover:bg-caspier-hover p-1 rounded">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <SmartFileIcon name={findFileName(files, id)} className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                            <span className="text-sm text-caspier-text truncate">{findFileName(files, id)}</span>
                                            <span className="text-[10px] text-caspier-muted">M</span>
                                        </div>
                                        <button
                                            className="p-1 text-caspier-muted hover:text-caspier-text opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => onStageFile?.(id)}
                                            title="Stage"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* History Graph */}
                    <div className="pt-4 border-t border-caspier-border">
                        <div className="flex items-center justify-between text-xs font-bold text-caspier-muted mb-4 uppercase">
                            <span>Commits ({gitState.commits.length})</span>
                            <div className="flex items-center gap-1 text-[10px] bg-caspier-red/10 text-caspier-red px-1.5 py-0.5 rounded">
                                <GitIcon className="w-3 h-3" />
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
                                            {/* Graph Column */}
                                            <div className="relative flex-shrink-0 w-[50px]">
                                                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                                                    {/* Draw Lines */}
                                                    {/* Line to next commit if exists and is parent */}
                                                    {gitState.commits.slice(index + 1).map((nextCommit, nextIndex) => {
                                                        const relativeNextIndex = nextIndex; // 0 means immediate next
                                                        // Simple heuristic: if next commit is a parent, connect it.
                                                        if (commit.parents?.includes(nextCommit.id) || (commit.parents?.length === 0 && commit.branch === nextCommit.branch && relativeNextIndex === 0)) {
                                                            const nextLane = getLane(nextCommit.branch);
                                                            const nextX = nextLane * COL_WIDTH + COL_WIDTH / 2;
                                                            const nextY = ROW_HEIGHT + ROW_HEIGHT / 2 + (relativeNextIndex * ROW_HEIGHT);

                                                            // Only draw if it's the immediate visual neighbor for clean look, or handle long lines
                                                            // For this simple viz, we just draw to immediate next row if it is a parent
                                                            if (relativeNextIndex === 0) {
                                                                return (
                                                                    <path
                                                                        key={nextCommit.id}
                                                                        d={`M ${laneX} ${centerY} C ${laneX} ${ROW_HEIGHT}, ${nextX} ${0}, ${nextX} ${ROW_HEIGHT / 2}`}
                                                                        stroke={getColor(nextLane)}
                                                                        strokeWidth="2"
                                                                        fill="none"
                                                                    />
                                                                );
                                                            }
                                                        }
                                                        return null;
                                                    })}

                                                    {/* Explicit Parents Handling for merges (draw long lines or curves to other lanes) */}
                                                    {commit.parents && commit.parents.map(parentId => {
                                                        // Find parent in the list
                                                        const parentIndex = gitState.commits.findIndex(c => c.id === parentId);
                                                        if (parentIndex > index) {
                                                            const parent = gitState.commits[parentIndex];
                                                            const parentLane = getLane(parent.branch);

                                                            // If immediate neighbor, already handled above roughly. 
                                                            // This handles merges specifically or branching off
                                                            if (parentIndex === index + 1 && parentLane !== lane) {
                                                                const parentX = parentLane * COL_WIDTH + COL_WIDTH / 2;
                                                                return (
                                                                    <path
                                                                        key={parentId}
                                                                        d={`M ${laneX} ${centerY} C ${laneX} ${ROW_HEIGHT - 5}, ${parentX} ${5}, ${parentX} ${ROW_HEIGHT / 2}`}
                                                                        stroke={getColor(parentLane)}
                                                                        strokeWidth="2"
                                                                        fill="none"
                                                                    />
                                                                );
                                                            }

                                                            // Special Merge Curve for visual flair
                                                            if (parentLane !== lane) {
                                                                const parentX = parentLane * COL_WIDTH + COL_WIDTH / 2;
                                                                // Just draw a curve downwards out of view or to a specific point if close
                                                                if (parentIndex === index + 2) { // Just one skip
                                                                    return (
                                                                        <path
                                                                            key={parentId}
                                                                            d={`M ${laneX} ${centerY} C ${laneX} ${ROW_HEIGHT}, ${parentX} ${ROW_HEIGHT}, ${parentX} ${ROW_HEIGHT * 1.5}`}
                                                                            stroke={getColor(parentLane)}
                                                                            strokeWidth="2"
                                                                            fill="none"
                                                                            strokeDasharray="2,2"
                                                                        />
                                                                    );
                                                                }
                                                            }
                                                        }
                                                        return null;
                                                    })}

                                                    {/* Pass-through lines (simplified) - Draw vertical lines for other active lanes if we knew them. 
                                                    For now, just draw a vertical line for main if we are not main */}
                                                    {lane !== 0 && (
                                                        <line x1={COL_WIDTH / 2} y1="0" x2={COL_WIDTH / 2} y2={ROW_HEIGHT} stroke={branchColors[0]} strokeWidth="2" opacity="0.3" />
                                                    )}

                                                    {/* Commit Dot */}
                                                    <circle
                                                        cx={laneX}
                                                        cy={centerY}
                                                        r={DOT_RADIUS}
                                                        fill={isHead ? 'transparent' : getColor(lane)}
                                                        stroke={getColor(lane)}
                                                        strokeWidth="2"
                                                    />
                                                    {isHead && (
                                                        <circle
                                                            cx={laneX}
                                                            cy={centerY}
                                                            r={1.5}
                                                            fill={getColor(lane)}
                                                        />
                                                    )}
                                                </svg>
                                            </div>

                                            {/* Content Column */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center border-b border-caspier-border/10 group-last:border-0 ml-2">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={`text-xs font-bold truncate transition-colors ${isHead ? 'text-caspier-text' : 'text-caspier-muted hover:text-caspier-text'}`}>
                                                        {commit.message}
                                                    </span>
                                                    {isHead && (
                                                        <span className="text-[10px] border border-caspier-red/50 text-caspier-red px-1 rounded bg-caspier-red/5">HEAD</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 text-[10px] text-caspier-muted">
                                                    <span className="font-mono text-caspier-text opacity-70">{commit.hash || commit.id.substring(commit.id.length - 6)}</span>
                                                    <span>{new Date(commit.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
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
    }

    const renderDeploy = () => {
        if (!wallet || !onWalletConnect || !onWalletDisconnect) {
            return (
                <div className="flex flex-col h-full">
                    <div className="p-3 border-b border-caspier-border flex items-center gap-2 bg-caspier-black min-w-0">
                        <RocketIcon className="w-4 h-4 text-caspier-muted flex-shrink-0" />
                        {width >= 280 && (
                            <span className="text-xs font-bold text-caspier-text tracking-wider whitespace-nowrap">
                                DEPLOY & RUN TRANSACTIONS
                            </span>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="text-caspier-muted text-sm">Deploy panel requires wallet integration.</div>
                    </div>
                </div>
            );
        }

        return (
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
            />
        );
    };

    const renderSettings = () => {
        if (!settings || !onUpdateSettings) return null;

        return (
            <div className="flex flex-col h-full">
                <div className="p-3 border-b border-caspier-border flex items-center gap-2 bg-caspier-black">
                    <SettingsIcon className="w-4 h-4 text-caspier-muted" />
                    <span className="text-xs font-bold text-caspier-text tracking-wider">PROJECT SETTINGS</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4">

                    <h3 className="text-caspier-red font-bold text-xs uppercase mb-4 border-b border-gray-800 pb-2">Editor Configuration</h3>

                    <InputGroup label="Font Size">
                        <input
                            type="number"
                            value={settings.fontSize}
                            onChange={(e) => onUpdateSettings('fontSize', parseInt(e.target.value))}
                            className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-1.5 text-sm focus:border-caspier-red outline-none"
                        />
                    </InputGroup>

                    <InputGroup label="Word Wrap">
                        <select
                            value={settings.wordWrap}
                            onChange={(e) => onUpdateSettings('wordWrap', e.target.value)}
                            className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-1.5 text-sm focus:border-caspier-red outline-none"
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
                            className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-1.5 text-sm focus:border-caspier-red outline-none"
                        />
                    </InputGroup>

                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            id="minimap"
                            checked={settings.minimap}
                            onChange={(e) => onUpdateSettings('minimap', e.target.checked)}
                            className="rounded border-gray-600 bg-caspier-black text-caspier-red focus:ring-caspier-red"
                        />
                        <label htmlFor="minimap" className="text-sm text-caspier-text">Show Minimap</label>
                    </div>

                    <h3 className="text-caspier-red font-bold text-xs uppercase mb-4 mt-8 border-b border-gray-800 pb-2">Compiler Configuration</h3>

                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="checkbox"
                            id="optimization"
                            checked={settings.enableOptimization}
                            onChange={(e) => onUpdateSettings('enableOptimization', e.target.checked)}
                            className="rounded border-gray-600 bg-caspier-black text-caspier-red focus:ring-caspier-red"
                        />
                        <label htmlFor="optimization" className="text-sm text-caspier-text">Enable Optimization</label>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            id="autoCompile"
                            checked={settings.autoCompile}
                            onChange={(e) => onUpdateSettings('autoCompile', e.target.checked)}
                            className="rounded border-gray-600 bg-caspier-black text-caspier-red focus:ring-caspier-red"
                        />
                        <label htmlFor="autoCompile" className="text-sm text-caspier-text">Auto Compile</label>
                    </div>

                    <h3 className="text-caspier-red font-bold text-xs uppercase mb-4 mt-8 border-b border-gray-800 pb-2">AI Configuration</h3>

                    <InputGroup label="AI Model">
                        <select
                            value={settings.aiModel}
                            onChange={(e) => onUpdateSettings('aiModel', e.target.value)}
                            className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-1.5 text-sm focus:border-caspier-red outline-none"
                        >
                            <option value="openai/gpt-4o">GPT-4o (Paid)</option>
                            <option value="openai/gpt-4o-mini">GPT-4o Mini (Paid)</option>
                            <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Paid)</option>
                            <option value="google/gemini-pro-1.5">Gemini Pro 1.5 (Paid)</option>
                            <option value="meta-llama/llama-3.1-405b">Llama 3.1 405B (Paid)</option>
                            <optgroup label="Free Models (OpenRouter)">
                                <option value="liquid/lfm-2.5-1.2b-thinking:free">Liquid LFM 2.5 Thinking (Free)</option>
                                <option value="liquid/lfm-2.5-1.2b-instruct:free">Liquid LFM 2.5 Instruct (Free)</option>
                                <option value="nvidia/nemotron-3-nano-30b-a3b:free">Nvidia Nemotron 3 Nano (Free)</option>
                                <option value="qwen/qwen3-next-80b-a3b-instruct:free">Qwen 3 Next 80B (Free)</option>
                                <option value="google/gemini-flash-1.5:free">Gemini Flash 1.5 (Free)</option>
                                <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B (Free)</option>
                                <option value="mistralai/pixtral-12b:free">Pixtral 12B (Free)</option>
                                <option value="qwen/qwen-2.5-72b-instruct:free">Qwen 2.5 72B (Free)</option>
                                <option value="microsoft/phi-3-mini-128k-instruct:free">Phi-3 Mini (Free)</option>
                                <option value="huggingfaceh4/zephyr-7b-beta:free">Zephyr 7B Beta (Free)</option>
                            </optgroup>
                        </select>
                    </InputGroup>

                    <InputGroup label="OpenRouter API Key">
                        <input
                            type="password"
                            value={settings.aiApiKey}
                            onChange={(e) => onUpdateSettings('aiApiKey', e.target.value)}
                            placeholder="sk-or-v1-..."
                            className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-1.5 text-sm focus:border-caspier-red outline-none"
                        />
                    </InputGroup>
                    <p className="text-[10px] text-caspier-muted mt-1 italic">
                        Get your key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-caspier-red hover:underline">openrouter.ai</a>
                    </p>

                </div>
            </div>
        );
    }

    const renderPlaceholder = () => (
        <div className="flex flex-col p-4 text-caspier-muted text-sm">
            <h2 className="text-caspier-text font-bold uppercase tracking-wider mb-4 border-b border-caspier-border pb-2">{activeView}</h2>
            <p>This view is not implemented in the demo.</p>
        </div>
    );

    const renderContent = () => {
        const activeFile = activeFileId ? findFile(files, activeFileId) : null;
        const contractCode = activeFile?.content || '';
        const contractName = activeFile?.name || '';

        switch (activeView) {
            case ActivityView.EXPLORER: return renderExplorer();
            case ActivityView.SEARCH: return renderSearch();
            case ActivityView.GIT: return renderGit();
            case ActivityView.DEPLOY: return renderDeploy();
            case ActivityView.DEBUG: return (
                <DebugPanel
                    compilationResult={compilationResult}
                    contractCode={contractCode}
                    contractName={contractName}
                />
            );
            case ActivityView.SETTINGS: return renderSettings();
            default: return renderPlaceholder();
        }
    };

    return (
        <div style={{ width }} className="flex-shrink-0 bg-caspier-dark border-r border-caspier-border flex flex-col h-full overflow-hidden">
            {renderContent()}
        </div>
    );
};

export default SidebarLeft;
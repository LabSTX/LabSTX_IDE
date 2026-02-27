

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileNode, ActivityView, TerminalLine, ProjectSettings, GitState, GitCommit, Problem, WalletConnection, CompilationResult, DeployedContract } from './types';
import { INITIAL_FILES, DEFAULT_SETTINGS } from './constants';
import ActivityBar from './components/Layout/ActivityBar';
import SidebarLeft from './components/Layout/SidebarLeft';
import SidebarRight from './components/Layout/SidebarRight';
import TerminalPanel from './components/Layout/TerminalPanel';
import CodeEditor from './components/Editor/CodeEditor';
import EditorTabs from './components/Layout/EditorTabs';
import Header from './components/Layout/Header';
import { Button } from './components/UI/Button';
import { PlayIcon, BotIcon, RocketIcon, BugIcon, UndoIcon, RedoIcon, SaveIcon, EyeIcon, SearchIcon } from './components/UI/Icons';
import { DeploymentNotification } from './components/UI/DeploymentNotification';
import HomeTab from './components/UI/HomeTab';
import AbiPreviewTab from './components/UI/AbiPreviewTab';
import MarkdownPreviewTab from './components/UI/MarkdownPreviewTab';
import EmptyState from './components/Layout/EmptyState';
import { ClarityCompiler } from './services/stacks/compiler';
import { StacksWalletService } from './services/stacks/wallet';
import JSZip from 'jszip';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

function App() {
    const [activeView, setActiveView] = useState<ActivityView>(() => {
        const saved = localStorage.getItem('labstx_active_view');
        return (saved as ActivityView) || ActivityView.EXPLORER;
    });

    useEffect(() => {
        localStorage.setItem('labstx_active_view', activeView);
    }, [activeView]);

    // Theme State
    const [theme, setTheme] = useState<'dark' | 'light'>('light');

    // Workspace State with localStorage persistence
    const [workspaces, setWorkspaces] = useState<Record<string, FileNode[]>>(() => {
        const saved = localStorage.getItem('labstx_workspaces');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { return { 'default_workspace': INITIAL_FILES }; }
        }
        return { 'default_workspace': INITIAL_FILES };
    });
    const [activeWorkspace, setActiveWorkspace] = useState(() => {
        return localStorage.getItem('labstx_active_workspace') || 'default_workspace';
    });

    useEffect(() => {
        localStorage.setItem('labstx_workspaces', JSON.stringify(workspaces));
    }, [workspaces]);

    useEffect(() => {
        localStorage.setItem('labstx_active_workspace', activeWorkspace);
    }, [activeWorkspace]);

    // History State
    const [history, setHistory] = useState<FileNode[][]>([INITIAL_FILES]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Derived state for current file tree
    const files = history[historyIndex];

    // Editor Tabs State with persistence
    const [openFiles, setOpenFiles] = useState<string[]>(() => {
        const saved = localStorage.getItem('labstx_open_files');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { return ['@home', 'Clarinet.toml', 'simple-counter.clar']; }
        }
        return ['@home', 'Clarinet.toml', 'simple-counter.clar'];
    });
    const [activeFileId, setActiveFileId] = useState<string | null>(() => {
        return localStorage.getItem('labstx_active_file_id') || '@home';
    });

    useEffect(() => {
        localStorage.setItem('labstx_open_files', JSON.stringify(openFiles));
    }, [openFiles]);

    useEffect(() => {
        localStorage.setItem('labstx_active_file_id', activeFileId || '');
    }, [activeFileId]);

    const [activeContent, setActiveContent] = useState<string>('');
    const [activeLanguage, setActiveLanguage] = useState<string>('clarity');

    // Terminal, Output, Problems State
    const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
        { id: '1', type: 'info', content: 'Initializing LabSTX Environment...' },
        { id: '2', type: 'success', content: 'LabSTX Environment Ready.' }
    ]);
    const [outputLines, setOutputLines] = useState<string[]>([]);
    const [problems, setProblems] = useState<Problem[]>([]);

    // Compilation & Deployment State
    const [compilationResult, setCompilationResult] = useState<CompilationResult | undefined>();
    const [wallet, setWallet] = useState<WalletConnection>({
        type: 'none',
        connected: false
    });
    const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>([]);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

    // Deployment Notification State
    const [notification, setNotification] = useState<{ deployHash: string; network: string, contractName?: string } | null>(null);

    // Project Settings with localStorage persistence
    const [settings, setSettings] = useState<ProjectSettings>(() => {
        const saved = localStorage.getItem('labstx_settings');
        if (saved) {
            try {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            } catch (e) {
                return DEFAULT_SETTINGS;
            }
        }
        return DEFAULT_SETTINGS;
    });

    useEffect(() => {
        localStorage.setItem('labstx_settings', JSON.stringify(settings));
    }, [settings]);

    // Editing State
    const [dirtyFileIds, setDirtyFileIds] = useState<string[]>([]);
    const [editorAction, setEditorAction] = useState<{ type: 'undo' | 'redo' | 'save' | 'gotoLine' | null, timestamp: number, line?: number, column?: number }>({ type: null, timestamp: 0 });

    // Search-in-code state (synced to Monaco's find widget)
    const [editorSearchQuery, setEditorSearchQuery] = useState<string>('');
    const [searchFindQuery, setSearchFindQuery] = useState<string | undefined>(undefined);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounce the find query passed to the editor (avoids firing on every keystroke)
    const handleSearchChange = useCallback((value: string) => {
        setEditorSearchQuery(value);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setSearchFindQuery(value);
        }, 200);
    }, []);

    // Git State
    const [gitState, setGitState] = useState<GitState>({
        modifiedFiles: [],
        stagedFiles: [],
        commits: [
            // Simulated History
            { id: 'c-5', message: 'Merge branch feature/staking', date: Date.now() - 3600000, hash: '8f2a1b', branch: 'main', parents: ['c-4', 'c-3'] },
            { id: 'c-4', message: 'Update project configuration', date: Date.now() - 7200000, hash: '7e1c9d', branch: 'main', parents: ['c-2'] },
            { id: 'c-3', message: 'Implement staking contract logic', date: Date.now() - 86400000, hash: '6d4e5f', branch: 'feature/staking', parents: ['c-1'] },
            { id: 'c-2', message: 'Refactor utility functions', date: Date.now() - 172800000, hash: '5c3b2a', branch: 'main', parents: ['c-1'] },
            { id: 'c-1', message: 'Initial commit ✨', date: Date.now() - 259200000, hash: '4b2a1c', branch: 'main', parents: [] },
        ],
        branch: 'main'
    });

    // Layout State
    const [leftWidth, setLeftWidth] = useState(300);
    const [rightWidth, setRightWidth] = useState(320);
    const [terminalHeight, setTerminalHeight] = useState(200);
    const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(true);
    const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(true);
    const [isTerminalVisible, setIsTerminalVisible] = useState(true);

    // Layout Toggles
    const toggleLeftSidebar = () => setIsLeftSidebarVisible(!isLeftSidebarVisible);
    const toggleRightSidebar = () => setIsRightSidebarVisible(!isRightSidebarVisible);
    const toggleTerminal = () => setIsTerminalVisible(!isTerminalVisible);

    // --- Onboarding Tour State ---
    const [runTour, setRunTour] = useState(false);
    const [tourSteps] = useState<Step[]>([
        {
            target: 'body',
            content: (
                <div className="text-left">
                    <h3 className="text-lg font-bold text-labstx-orange mb-2">Welcome to LabSTX!</h3>
                    <p>Let's take a quick tour of your new Clarity smart contract development environment.</p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '#workspace-selector',
            content: 'Switch between different projects or create a new one here.',
            placement: 'bottom',
        },
        {
            target: '#home-button',
            content: 'The Home view provides templates and walkthroughs to get you started quickly.',
            placement: 'right',
        },
        {
            target: '#view-explorer',
            content: 'Manage your files and folders in the Explorer view.',
            placement: 'right',
        },
        {
            target: '#create-project-button',
            content: 'Quickly start a new project from building blocks.',
            placement: 'right',
        },
        {
            target: '#editor-tabs',
            content: 'Switch between open files using these tabs.',
            placement: 'bottom',
        },
        {
            target: '#check-button',
            content: 'Run a syntax and logic check on your current Clarity contract.',
            placement: 'bottom',
        },
        {
            target: '#deploy-button',
            content: 'Deploy your contracts to the Stacks network when you are ready.',
            placement: 'bottom',
        },
        {
            target: '#ai-assistant-button',
            content: 'Open the AI Assistant to help you write and debug code.',
            placement: 'left',
        },
        {
            target: '#terminal-panel',
            content: 'Interact with the Stacks blockchain and view logs in the terminal.',
            placement: 'top',
        },
        {
            target: '#layout-controls',
            content: 'Customize your workspace by toggling sidebars and panels.',
            placement: 'bottom',
        }
    ]);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('labstx_has_seen_tour');
        if (!hasSeenTour) {
            setRunTour(true);
        }
    }, []);

    const handleTourCallback = (data: CallBackProps) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            setRunTour(false);
            localStorage.setItem('labstx_has_seen_tour', 'true');
        }
    };

    // Prevent data loss on reload
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (gitState.modifiedFiles.length > 0 || gitState.stagedFiles.length > 0) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes in the code editor. Are you sure you want to leave?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [gitState.modifiedFiles, gitState.stagedFiles]);

    // Resizing Logic
    const startResizing = useCallback((direction: 'left' | 'right') => (mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        const startX = mouseDownEvent.clientX;
        const startWidth = direction === 'left' ? leftWidth : rightWidth;

        const doDrag = (mouseMoveEvent: MouseEvent) => {
            if (direction === 'left') {
                const newWidth = startWidth + mouseMoveEvent.clientX - startX;
                setLeftWidth(Math.max(160, Math.min(newWidth, 600)));
            } else {
                const newWidth = startWidth - (mouseMoveEvent.clientX - startX);
                setRightWidth(Math.max(240, Math.min(newWidth, 600)));
            }
        };

        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [leftWidth, rightWidth]);

    // Terminal Resizing Logic
    const startTerminalResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        const startY = mouseDownEvent.clientY;
        const startHeight = terminalHeight;

        const doDrag = (mouseMoveEvent: MouseEvent) => {
            const deltaY = startY - mouseMoveEvent.clientY; // Inverted because we're resizing from top
            const newHeight = startHeight + deltaY;
            setTerminalHeight(Math.max(100, Math.min(newHeight, 600)));
        };

        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    }, [terminalHeight]);

    const addTerminalLine = useCallback((line: Omit<TerminalLine, 'id'>) => {
        setTerminalLines(prev => [...prev, {
            ...line,
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9)
        }]);
    }, []);

    const handleClearTerminal = useCallback(() => {
        setTerminalLines([]);
    }, []);

    // Recursively find file by ID
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

    // Recursively find file by name
    const findFileByName = (nodes: FileNode[], name: string): FileNode | null => {
        for (const node of nodes) {
            if (node.type === 'file' && node.name === name) return node;
            if (node.children) {
                const found = findFileByName(node.children, name);
                if (found) return found;
            }
        }
        return null;
    };

    // Navigate the editor to a specific file + line/column (used by Problems "Locate")
    const handleLocateProblem = (fileName: string, line: number, column: number) => {
        const target = findFileByName(files, fileName);
        if (!target) return;
        // Open & activate the file tab
        if (!openFiles.includes(target.id)) {
            setOpenFiles(prev => [...prev, target.id]);
        }
        setActiveFileId(target.id);
        // Slight delay so Monaco mounts the new file before we jump
        setTimeout(() => {
            setEditorAction({ type: 'gotoLine', timestamp: Date.now(), line, column });
        }, 80);
    };

    // Helper to get all descendant IDs of a node (including itself)
    const getSubtreeIds = (node: FileNode): string[] => {
        let ids = [node.id];
        if (node.children) {
            node.children.forEach(child => {
                ids = [...ids, ...getSubtreeIds(child)];
            });
        }
        return ids;
    };

    // Update content when active file changes
    useEffect(() => {
        if (activeFileId) {
            const file = findFile(files, activeFileId);
            if (file && file.type === 'file') {
                setActiveContent(file.content || '');
                setActiveLanguage(file.language || 'plaintext');
            }
        } else {
            setActiveContent('');
        }
    }, [activeFileId, files]);

    // --- Theme Management ---
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // --- Workspace Management ---
    const handleCreateWorkspace = () => {
        const name = window.prompt("Enter new workspace name:");
        if (!name) return;
        if (workspaces[name]) {
            alert("Workspace already exists!");
            return;
        }

        // Save current state before switching
        setWorkspaces(prev => ({ ...prev, [activeWorkspace]: history[historyIndex] }));

        const newRoot: FileNode[] = [{
            id: 'root',
            name: name,
            type: 'folder',
            children: [
                { id: 'README.md', name: 'README.md', type: 'file', language: 'plaintext', content: `# ${name}\n\nNew workspace created.` }
            ]
        }];

        setWorkspaces(prev => ({ ...prev, [name]: newRoot }));
        setActiveWorkspace(name);

        // Reset view
        setHistory([newRoot]);
        setHistoryIndex(0);
        setOpenFiles(['README.md']);
        setActiveFileId('README.md');
        setGitState({ modifiedFiles: [], stagedFiles: [], commits: [], branch: 'main' });
        setTerminalLines(prev => [...prev, { id: Date.now().toString(), type: 'success', content: `Created and switched to workspace: ${name}` }]);
        setOutputLines([]);
        setProblems([]);
    };

    const handleRenameWorkspace = () => {
        const newName = window.prompt("Rename workspace:", activeWorkspace);
        if (!newName || newName === activeWorkspace) return;
        if (workspaces[newName]) {
            alert("Workspace with this name already exists.");
            return;
        }

        const currentData = workspaces[activeWorkspace];
        const newWorkspaces = { ...workspaces };
        delete newWorkspaces[activeWorkspace];

        // Update the root folder name if it exists to match workspace name
        const updatedRoot = [...currentData];
        if (updatedRoot.length > 0 && updatedRoot[0].type === 'folder') {
            updatedRoot[0] = { ...updatedRoot[0], name: newName };
        }

        newWorkspaces[newName] = updatedRoot;

        setWorkspaces(newWorkspaces);
        setActiveWorkspace(newName);
        setHistory([updatedRoot]);
        setHistoryIndex(0);

        setTerminalLines(prev => [...prev, { id: Date.now().toString(), type: 'success', content: `Renamed workspace to: ${newName}` }]);
    };

    const handleSwitchWorkspace = (name: string) => {
        if (name === activeWorkspace) return;

        // Save current state
        setWorkspaces(prev => ({ ...prev, [activeWorkspace]: history[historyIndex] }));

        // Load new state
        const nextFiles = workspaces[name];
        if (!nextFiles) return;

        setActiveWorkspace(name);
        setHistory([nextFiles]);
        setHistoryIndex(0);
        setOpenFiles([]);
        setActiveFileId(null);
        setGitState({ modifiedFiles: [], stagedFiles: [], commits: [], branch: 'main' });
        setTerminalLines(prev => [...prev, { id: Date.now().toString(), type: 'info', content: `Switched to workspace: ${name}` }]);
        setOutputLines([]);
        setProblems([]);
    };

    const handleDownloadWorkspace = async () => {
        try {
            const zip = new JSZip();

            // Helper to recursively add files/folders to zip
            const processNode = (node: FileNode, folder: any) => {
                if (node.type === 'folder') {
                    const newFolder = folder ? folder.folder(node.name) : zip.folder(node.name);
                    if (node.children) {
                        node.children.forEach(child => processNode(child, newFolder));
                    }
                } else {
                    // File
                    const content = node.content || '';
                    if (folder) {
                        folder.file(node.name, content);
                    } else {
                        zip.file(node.name, content);
                    }
                }
            };

            // Start processing from root
            files.forEach(node => processNode(node, zip));

            // Generate zip
            const content = await zip.generateAsync({ type: "blob" });

            // Trigger download
            const url = window.URL.createObjectURL(content);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${activeWorkspace}.zip`;
            document.body.appendChild(a);
            a.click();

            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setTerminalLines(prev => [
                ...prev,
                { id: Date.now().toString(), type: 'success', content: `Workspace '${activeWorkspace}' downloaded successfully.` }
            ]);

        } catch (error) {
            console.error("Download failed:", error);
            setTerminalLines(prev => [
                ...prev,
                { id: Date.now().toString(), type: 'error', content: `Failed to download workspace: ${error}` }
            ]);
        }
    };

    const handleImportWorkspace = async () => {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.zip';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                const zip = new JSZip();
                const zipContent = await zip.loadAsync(file);

                // Convert zip to FileNode structure
                const fileNodes: FileNode[] = [];
                const nodeMap: Record<string, FileNode> = {};

                // Process all files in zip
                for (const [path, zipEntry] of Object.entries(zipContent.files)) {
                    if (zipEntry.dir) continue;

                    const parts = path.split('/').filter(p => p);
                    const content = await zipEntry.async('string');

                    // Build file tree
                    let currentPath = '';
                    for (let i = 0; i < parts.length; i++) {
                        const part = parts[i];
                        const isFile = i === parts.length - 1;
                        const pathKey = currentPath ? `${currentPath}/${part}` : part;

                        if (!nodeMap[pathKey]) {
                            const extension = isFile ? part.split('.').pop()?.toLowerCase() : undefined;
                            const language = isFile ? getLanguageFromExtension(extension || '') : undefined;

                            const node: FileNode = {
                                id: `${activeWorkspace}-${pathKey}-${Date.now()}`,
                                name: part,
                                type: isFile ? 'file' : 'folder',
                                content: isFile ? content : undefined,
                                language,
                                children: isFile ? undefined : []
                            };

                            nodeMap[pathKey] = node;

                            if (i === 0) {
                                fileNodes.push(node);
                            } else {
                                const parentPath = parts.slice(0, i).join('/');
                                const parent = nodeMap[parentPath];
                                if (parent && parent.children) {
                                    parent.children.push(node);
                                }
                            }
                        }

                        currentPath = pathKey;
                    }
                }

                if (fileNodes.length > 0) {
                    setHistory([fileNodes]);
                    setHistoryIndex(0);
                    setOpenFiles([]);
                    setActiveFileId(null);
                    setTerminalLines(prev => [
                        ...prev,
                        { id: Date.now().toString(), type: 'success', content: `Workspace imported successfully.` }
                    ]);
                }
            };
            input.click();
        } catch (error) {
            console.error("Import failed:", error);
            setTerminalLines(prev => [
                ...prev,
                { id: Date.now().toString(), type: 'error', content: `Failed to import workspace: ${error}` }
            ]);
        }
    };

    const getLanguageFromExtension = (ext: string): string => {
        const langMap: Record<string, string> = {
            'clar': 'clarity',
            'rs': 'rust',
            'ts': 'typescript',
            'as': 'typescript',
            'toml': 'toml',
            'json': 'json',
            'md': 'markdown',
            'txt': 'plaintext',
            'makefile': 'makefile'
        };
        return langMap[ext] || 'plaintext';
    };

    // --- History Management ---

    const addToHistory = (newFiles: FileNode[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newFiles);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
        }
    };

    // --- Settings Management ---
    const handleUpdateSettings = (key: keyof ProjectSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleUpdateFileContent = useCallback((fileId: string, value: string) => {
        const updateContentRecursive = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
                if (node.id === fileId) {
                    return { ...node, content: value };
                }
                if (node.children) {
                    return { ...node, children: updateContentRecursive(node.children) };
                }
                return node;
            });
        };

        const newFiles = updateContentRecursive(history[historyIndex]);
        addToHistory(newFiles);

        // Update Git modified status
        setGitState(prev => {
            if (!prev.modifiedFiles.includes(fileId) && !prev.stagedFiles.includes(fileId)) {
                return { ...prev, modifiedFiles: [...prev.modifiedFiles, fileId] };
            }
            return prev;
        });

        // If it's the active file, update active content too
        if (fileId === activeFileId) {
            setActiveContent(value);
        }
    }, [activeFileId, history, historyIndex, addToHistory]);

    const handleEditorChange = (value: string | undefined) => {
        if (value === undefined || !activeFileId) return;
        setActiveContent(value);

        const updateContentRecursive = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
                if (node.id === activeFileId) {
                    return { ...node, content: value };
                }
                if (node.children) {
                    return { ...node, children: updateContentRecursive(node.children) };
                }
                return node;
            });
        };

        const newFiles = updateContentRecursive(files);
        // Update in place for editing to prevent history spam
        setHistory(prev => {
            const newHist = [...prev];
            newHist[historyIndex] = newFiles;
            return newHist;
        });

        // Mark as dirty (unsaved)
        if (!dirtyFileIds.includes(activeFileId)) {
            setDirtyFileIds(prev => [...prev, activeFileId]);
        }
    };

    const handleSaveFile = () => {
        if (!activeFileId || !dirtyFileIds.includes(activeFileId)) return;

        // Move from dirty to git modified
        setDirtyFileIds(prev => prev.filter(id => id !== activeFileId));
        setGitState(prev => {
            if (!prev.modifiedFiles.includes(activeFileId) && !prev.stagedFiles.includes(activeFileId)) {
                return { ...prev, modifiedFiles: [...prev.modifiedFiles, activeFileId] };
            }
            return prev;
        });

        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'success', content: `Saved: ${findFile(files, activeFileId)?.name}` }
        ]);

        // Trigger save effect in editor if needed
        setEditorAction({ type: 'save', timestamp: Date.now() });
    };

    const handleEditorUndo = () => setEditorAction({ type: 'undo', timestamp: Date.now() });
    const handleEditorRedo = () => setEditorAction({ type: 'redo', timestamp: Date.now() });

    const handleCompile = async () => {
        if (!activeFileId) return;
        const file = findFile(files, activeFileId);
        if (!file || file.type !== 'file') return;

        const fileName = file.name;
        const sourceCode = file.content || activeContent;

        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'command', content: `Running clarinet check: ${fileName}...` },
        ]);

        setOutputLines([
            `> Executing: clarinet check ${fileName}`,
            `> Using Clarinet CLI version 3.4.0`,
            `> Analyzing contract for syntax and logic errors...`
        ]);

        setProblems([]);
        setCompilationResult(undefined);

        try {
            let result: CompilationResult;

            if (file.language === 'clarity' || fileName.endsWith('.clar')) {
                result = await ClarityCompiler.check(sourceCode, fileName);
            } else {
                throw new Error(`Unsupported file type for Stacks: ${fileName}`);
            }

            setCompilationResult(result);

            if (result.success) {
                setTerminalLines(prev => [
                    ...prev,
                    { id: Date.now().toString(), type: 'success', content: 'Clarinet Check successful!' },
                ]);

                // Print the full raw log from the CLI
                const logLines = result.output ? result.output.split('\n') : ['Analysis completed.'];
                setOutputLines(prev => [
                    ...prev,
                    `> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                    ...logLines.map((l: string) => `  ${l}`),
                    `> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                    `> ✨ Contract is valid according to Clarinet.`
                ]);

                if (result.metadata?.entryPoints) {
                    setOutputLines(prev => [...prev, `> 🔧 Functions found: ${result.metadata.entryPoints.map(ep => ep.name).join(', ')}`]);
                }
            } else {
                setTerminalLines(prev => [
                    ...prev,
                    { id: Date.now().toString(), type: 'error', content: 'Clarinet Check failed. See Output and Problems for details.' },
                ]);

                const logLines = result.output ? result.output.split('\n') : ['Analysis failed.'];
                setOutputLines(prev => [
                    ...prev,
                    `Error: Clarinet Check failed.`,
                    `> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                    ...logLines.map((l: string) => `  ${l}`),
                    `> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                ]);

                if (result.errors) {
                    const fileProblems: Problem[] = result.errors.map((error, idx) => ({
                        id: `${Date.now()}-${idx}`,
                        file: fileName,
                        description: error,
                        line: 1,
                        column: 1,
                        severity: 'error'
                    }));
                    setProblems(fileProblems);
                }

                if (!isTerminalVisible) setIsTerminalVisible(true);
            }
        } catch (error: any) {
            setTerminalLines(prev => [
                ...prev,
                { id: Date.now().toString(), type: 'error', content: `Check error: ${error.message}` },
            ]);
            setOutputLines(prev => [...prev, `Error: ${error.message}`]);
            setProblems([{
                id: Date.now().toString(),
                file: fileName,
                description: error.message,
                line: 1,
                column: 1,
                severity: 'error'
            }]);
        }
    };

    const handleDebug = async () => {
        if (!activeFileId) return;
        const file = findFile(files, activeFileId);
        if (!file || file.type !== 'file') return;

        const fileName = file.name;

        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'command', content: `Starting debug session for: ${fileName}...` },
        ]);

        // Switch to debug view
        setActiveView(ActivityView.DEBUG);
        if (!isLeftSidebarVisible) toggleLeftSidebar();

        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'success', content: 'Debugger initialized. You can now use the REPL or inspect state.' },
        ]);
    };

    const handleTerminalCommand = async (command: string) => {
        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'command', content: command },
        ]);

        if (command.toLowerCase() === 'clear') {
            handleClearTerminal();
            return;
        }

        if (!command.startsWith('clarinet')) {
            setTerminalLines(prev => [
                ...prev,
                { id: Date.now().toString(), type: 'error', content: 'Only clarinet commands are allowed in this terminal.' },
            ]);
            return;
        }

        try {
            // We use the same 'activeContract' context if available
            let contractContext = null;
            if (activeFileId) {
                const file = findFile(files, activeFileId);
                if (file && file.type === 'file' && file.name.endsWith('.clar')) {
                    contractContext = { name: file.name, code: activeContent };
                }
            }

            // If we have a contract, ensure it's "deployed" to the backend session first
            if (contractContext) {
                await fetch('/ide-api/clarity/deploy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(contractContext)
                });
            }

            const response = await fetch('/ide-api/clarity/terminal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command })
            });

            const result = await response.json();

            if (result.output) {
                const outputLines = result.output.split('\n');
                outputLines.forEach((line: string) => {
                    if (line.trim()) {
                        setTerminalLines(prev => [
                            ...prev,
                            { id: Date.now().toString() + Math.random(), type: 'info', content: line },
                        ]);
                    }
                });
            }

            if (!result.success && !result.output) {
                setTerminalLines(prev => [
                    ...prev,
                    { id: Date.now().toString(), type: 'error', content: 'Command failed.' },
                ]);
            }
        } catch (error: any) {
            setTerminalLines(prev => [
                ...prev,
                { id: Date.now().toString(), type: 'error', content: `Execution error: ${error.message}` },
            ]);
        }
    };

    // --- Git Operations ---

    const handleStageFile = (id: string) => {
        setGitState(prev => ({
            ...prev,
            modifiedFiles: prev.modifiedFiles.filter(f => f !== id),
            stagedFiles: [...prev.stagedFiles, id]
        }));
    };

    const handleUnstageFile = (id: string) => {
        setGitState(prev => ({
            ...prev,
            stagedFiles: prev.stagedFiles.filter(f => f !== id),
            modifiedFiles: [...prev.modifiedFiles, id]
        }));
    };

    const handleCommit = (message: string) => {
        setGitState(prev => {
            // Mocking parent as the most recent commit (linear history default for new commits)
            const parentId = prev.commits.length > 0 ? prev.commits[0].id : undefined;

            const newCommit: GitCommit = {
                id: Date.now().toString(),
                message,
                date: Date.now(),
                hash: Math.random().toString(16).substring(2, 8),
                branch: prev.branch,
                parents: parentId ? [parentId] : []
            };

            return {
                ...prev,
                stagedFiles: [],
                commits: [newCommit, ...prev.commits]
            };
        });
        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'success', content: `Committed: ${message}` }
        ]);
    };

    const handleDiscardFile = (id: string) => {
        setGitState(prev => ({
            ...prev,
            modifiedFiles: prev.modifiedFiles.filter(f => f !== id),
            stagedFiles: prev.stagedFiles.filter(f => f !== id)
        }));
        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'info', content: `Discarded changes in ${id}` }
        ]);
    };

    const handleSwitchBranch = (branchName: string) => {
        setGitState(prev => ({ ...prev, branch: branchName }));
        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'info', content: `Switched to branch: ${branchName}` }
        ]);
    };

    const handleCreateBranch = (branchName: string) => {
        setGitState(prev => ({ ...prev, branch: branchName }));
        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'success', content: `Created and switched to branch: ${branchName}` }
        ]);
    };

    const handlePush = () => {
        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'info', content: `Pushing to origin/${gitState.branch}...` }
        ]);
        setTimeout(() => {
            setTerminalLines(prev => [
                ...prev,
                { id: Date.now().toString(), type: 'success', content: 'Push successful.' }
            ]);
        }, 1500);
    };

    const handleDeployView = () => {
        setActiveView(ActivityView.DEPLOY);
        if (!isLeftSidebarVisible) toggleLeftSidebar();
    };

    const handleWalletConnect = (newWallet: WalletConnection) => {
        setWallet(newWallet);
        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'success', content: `Wallet connected: ${newWallet.type}` },
        ]);
    };

    const handleWalletDisconnect = () => {
        setWallet({ type: 'none', connected: false });
        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'info', content: 'Wallet disconnected' },
        ]);
    };

    const handleDeploySuccess = (contract: DeployedContract) => {
        setDeployedContracts(prev => [contract, ...prev]);
        // Convert deployHash to hex string if it's a Uint8Array
        const deployHashStr = typeof contract.deployHash === 'string'
            ? contract.deployHash
            : Array.from(contract.deployHash as any).map((b: number) => b.toString(16).padStart(2, '0')).join('');

        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'success', content: `Contract deployed: ${deployHashStr}` },
        ]);

        // Show notification
        setNotification({
            deployHash: contract.deployHash,
            network: contract.network,
            contractName: contract.name
        });
    };

    const handleLoadTemplate = (templateNodes: FileNode[]) => {
        // Replace current files with template
        setHistory([templateNodes]);
        setHistoryIndex(0);
        setOpenFiles([]);
        setActiveFileId(null);
        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'info', content: 'Template loaded successfully' },
        ]);
    };

    // --- Tab Management ---

    const handleFileOpen = (fileId: string) => {
        if (!openFiles.includes(fileId)) {
            setOpenFiles([...openFiles, fileId]);
        }
        setActiveFileId(fileId);
    };

    const handleTabClose = (fileId: string) => {
        const filtered = openFiles.filter(id => id !== fileId);
        setOpenFiles(filtered);

        if (activeFileId === fileId) {
            if (filtered.length > 0) {
                setActiveFileId(filtered[filtered.length - 1]);
            } else {
                setActiveFileId(null);
            }
        }
    };

    const handleCloseOthers = (fileId: string) => {
        setOpenFiles([fileId]);
        setActiveFileId(fileId);
    };

    const handleCloseAll = () => {
        setOpenFiles([]);
        setActiveFileId(null);
    };

    // --- File System Operations ---

    const handleCreateNode = (parentId: string, type: 'file' | 'folder', name: string, initialContent?: string) => {
        const newId = `${name}-${Date.now()}`;
        const extension = name.split('.').pop() || 'plaintext';
        const language = extension === 'sol' ? 'sol' : extension === 'rs' ? 'rust' : extension === 'ts' ? 'typescript' : extension === 'js' ? 'javascript' : 'plaintext';

        const newNode: FileNode = {
            id: newId,
            name: name,
            type: type,
            language: type === 'file' ? language : undefined,
            content: type === 'file' ? (initialContent ?? '') : undefined,
            children: type === 'folder' ? [] : undefined
        };

        const addNodeRecursive = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
                if (node.id === parentId && node.type === 'folder') {
                    return { ...node, children: [...(node.children || []), newNode], isOpen: true };
                }
                if (node.children) {
                    return { ...node, children: addNodeRecursive(node.children) };
                }
                return node;
            });
        };

        const newFiles = addNodeRecursive(files);
        addToHistory(newFiles);
        if (type === 'file') {
            handleFileOpen(newId);
            setGitState(prev => ({ ...prev, modifiedFiles: [...prev.modifiedFiles, newId] }));
        }
    };

    const handleRenameNode = (id: string, newName: string) => {
        const renameRecursive = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
                if (node.id === id) {
                    return { ...node, name: newName };
                }
                if (node.children) {
                    return { ...node, children: renameRecursive(node.children) };
                }
                return node;
            });
        };
        const newFiles = renameRecursive(files);
        addToHistory(newFiles);
    };

    const handleDeleteNode = (id: string) => {
        // 1. Find the node to delete to identify all children
        const nodeToDelete = findFile(files, id);
        if (!nodeToDelete) return;

        // 2. Get all IDs being deleted (including children)
        const idsToDelete = getSubtreeIds(nodeToDelete);

        // 3. Close relevant tabs
        const newOpenFiles = openFiles.filter(fileId => !idsToDelete.includes(fileId));
        setOpenFiles(newOpenFiles);

        // 4. Update active file if it was deleted
        if (activeFileId && idsToDelete.includes(activeFileId)) {
            setActiveFileId(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
        }

        // 5. Remove from tree
        const deleteRecursive = (nodes: FileNode[]): FileNode[] => {
            return nodes
                .filter(node => node.id !== id)
                .map(node => {
                    if (node.children) {
                        return { ...node, children: deleteRecursive(node.children) };
                    }
                    return node;
                });
        };

        const newFiles = deleteRecursive(files);
        addToHistory(newFiles);

        // Update Git
        setGitState(prev => ({
            ...prev,
            modifiedFiles: prev.modifiedFiles.filter(f => f !== id),
            stagedFiles: prev.stagedFiles.filter(f => f !== id)
        }));
    };

    // --- GitHub Integration ---
    const handleGitHubClone = (clonedFiles: Record<string, string>, repoName: string) => {
        // Convert cloned files to FileNode structure
        const fileNodes: FileNode[] = [];
        const nodeMap: Record<string, FileNode> = {};

        for (const [path, content] of Object.entries(clonedFiles)) {
            const parts = path.split('/');
            let currentPath = '';

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isFile = i === parts.length - 1;
                const pathKey = currentPath ? `${currentPath}/${part}` : part;

                if (!nodeMap[pathKey]) {
                    const extension = isFile ? part.split('.').pop()?.toLowerCase() : undefined;
                    const language = isFile ? getLanguageFromExtension(extension || '') : undefined;

                    const node: FileNode = {
                        id: `clone-${pathKey}-${Date.now()}`,
                        name: part,
                        type: isFile ? 'file' : 'folder',
                        content: isFile ? content : undefined,
                        language,
                        children: isFile ? undefined : []
                    };

                    nodeMap[pathKey] = node;

                    if (i === 0) {
                        fileNodes.push(node);
                    } else {
                        const parentPath = parts.slice(0, i).join('/');
                        const parent = nodeMap[parentPath];
                        if (parent && parent.children) {
                            parent.children.push(node);
                        }
                    }
                }

                currentPath = pathKey;
            }
        }

        if (fileNodes.length > 0) {
            setHistory([fileNodes]);
            setHistoryIndex(0);
            setOpenFiles([]);
            setActiveFileId(null);
            setTerminalLines(prev => [
                ...prev,
                { id: Date.now().toString(), type: 'success', content: `Cloned repository: ${repoName}` }
            ]);
        }
    };

    const handleGitHubGistCreated = (url: string) => {
        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'success', content: `Gist created: ${url}` }
        ]);
    };

    // Collect all file contents for gist
    const collectWorkspaceFiles = (): Record<string, string> => {
        const result: Record<string, string> = {};

        const traverse = (nodes: FileNode[], prefix: string = '') => {
            for (const node of nodes) {
                const path = prefix ? `${prefix}/${node.name}` : node.name;
                if (node.type === 'file' && node.content) {
                    result[path] = node.content;
                }
                if (node.children) {
                    traverse(node.children, path);
                }
            }
        };

        traverse(files);
        return result;
    };

    const handleOpenHome = () => {
        if (!openFiles.includes('@home')) {
            setOpenFiles(['@home', ...openFiles]);
        }
        setActiveFileId('@home');
    };

    const handleOpenPreview = () => {
        if (!activeFileId) return;
        const file = findFile(files, activeFileId);
        if (!file) return;
        const isMd = file.name.endsWith('.md') || file.name.endsWith('.mdx') || file.name.endsWith('.markdown');
        const isClar = file.name.endsWith('.clar') || file.name.endsWith('.clarity');
        if (!isMd && !isClar) return;
        const tabId = isMd ? `@md-${activeFileId}` : `@abi-${activeFileId}`;
        if (!openFiles.includes(tabId)) {
            setOpenFiles(prev => [...prev, tabId]);
        }
        setActiveFileId(tabId);
    };

    // Determines if the Preview button should be enabled
    const previewableFile = (() => {
        if (!activeFileId || activeFileId === '@home') return null;
        if (activeFileId.startsWith('@abi-') || activeFileId.startsWith('@md-')) return null;
        const f = findFile(files, activeFileId);
        if (!f) return null;
        const isMd = f.name.endsWith('.md') || f.name.endsWith('.mdx') || f.name.endsWith('.markdown');
        const isClar = f.name.endsWith('.clar') || f.name.endsWith('.clarity');
        return (isMd || isClar) ? f : null;
    })();

    return (
        <div className="h-screen w-screen flex flex-col bg-caspier-black text-caspier-text overflow-hidden font-sans">

            {/* Top Header */}
            <Header
                currentWorkspace={activeWorkspace}
                workspaces={Object.keys(workspaces)}
                onSwitchWorkspace={handleSwitchWorkspace}
                onCreateWorkspace={handleCreateWorkspace}
                onRenameWorkspace={handleRenameWorkspace}
                onDownloadWorkspace={handleDownloadWorkspace}
                onImportWorkspace={handleImportWorkspace}
                theme={theme}
                toggleTheme={toggleTheme}
                isLeftSidebarVisible={isLeftSidebarVisible}
                toggleLeftSidebar={toggleLeftSidebar}
                isRightSidebarVisible={isRightSidebarVisible}
                toggleRightSidebar={toggleRightSidebar}
                isTerminalVisible={isTerminalVisible}
                toggleTerminal={toggleTerminal}
                onGitHubClone={handleGitHubClone}
                onGitHubGistCreated={handleGitHubGistCreated}
                workspaceFiles={collectWorkspaceFiles()}
            />

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden">
                <ActivityBar
                    activeView={activeView}
                    setActiveView={setActiveView}
                    isSidebarVisible={isLeftSidebarVisible}
                    onToggleSidebar={toggleLeftSidebar}
                    onOpenHome={handleOpenHome}
                />

                {isLeftSidebarVisible && (
                    <>
                        <SidebarLeft
                            files={files}
                            activeFileId={activeFileId}
                            onFileSelect={handleFileOpen}
                            activeView={activeView}
                            onCreateNode={handleCreateNode}
                            onRenameNode={handleRenameNode}
                            onDeleteNode={handleDeleteNode}
                            width={leftWidth}
                            onUndo={undo}
                            onRedo={redo}
                            canUndo={historyIndex > 0}
                            canRedo={historyIndex < history.length - 1}
                            settings={settings}
                            onUpdateSettings={handleUpdateSettings}
                            gitState={gitState}
                            onStageFile={handleStageFile}
                            onUnstageFile={handleUnstageFile}
                            onDiscardFile={handleDiscardFile}
                            onCommit={handleCommit}
                            onPush={handlePush}
                            onSwitchBranch={handleSwitchBranch}
                            onCreateBranch={handleCreateBranch}
                            wallet={wallet}
                            onWalletConnect={handleWalletConnect}
                            onWalletDisconnect={handleWalletDisconnect}
                            compilationResult={compilationResult}
                            onDeploySuccess={handleDeploySuccess}
                            onLoadTemplate={handleLoadTemplate}
                            onCreateBlank={handleCreateWorkspace}
                            onImport={handleImportWorkspace}
                            isProjectModalOpen={isProjectModalOpen}
                            setIsProjectModalOpen={setIsProjectModalOpen}
                            onAddTerminalLine={addTerminalLine}
                            theme={theme}
                        />
                        {/* Left Resizer */}
                        <div
                            className="w-1 bg-caspier-dark hover:bg-labstx-orange cursor-col-resize z-10 transition-colors delay-150"
                            onMouseDown={startResizing('left')}
                        />
                    </>
                )}

                <div className="flex-1 flex flex-col min-w-0 bg-caspier-dark">
                    {/* Editor Tabs & Header */}
                    <EditorTabs
                        files={files}
                        openFileIds={openFiles}
                        activeFileId={activeFileId}
                        onSelect={setActiveFileId}
                        onClose={handleTabClose}
                        onCloseOthers={handleCloseOthers}
                        onCloseAll={handleCloseAll}
                        onReorder={setOpenFiles}
                        modifiedFileIds={gitState.modifiedFiles}
                        dirtyFileIds={dirtyFileIds}
                    />

                    <div className="h-9 flex items-center bg-caspier-black rounded-b-lg border-b border-x border-caspier-border px-4 flex-shrink-0">
                        <div className="flex w-full items-center text-sm">
                            <span className="text-caspier-muted text-xs mr-2">{activeFileId ? findFile(files, activeFileId)?.name : ''}</span>
                        </div>

                        {/* Inline Search Box */}
                        <div className="flex items-center relative mr-2">
                            <SearchIcon className="absolute left-2 w-3 h-3 text-caspier-muted pointer-events-none" />
                            <input
                                type="text"
                                id="editor-search-input"
                                value={editorSearchQuery}
                                onChange={e => handleSearchChange(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Escape') handleSearchChange('');
                                }}
                                placeholder="Find in code…"
                                className="h-6 pl-6 pr-6 text-xs rounded bg-caspier-dark border border-caspier-border text-caspier-text placeholder-caspier-muted focus:outline-none focus:border-labstx-orange transition-all w-32 focus:w-48"
                                style={{ transition: 'width 0.2s ease' }}
                                title="Find in editor (Ctrl+F)"
                            />
                            {editorSearchQuery && (
                                <button
                                    onClick={() => handleSearchChange('')}
                                    className="absolute right-1.5 text-caspier-muted hover:text-caspier-text leading-none text-base"
                                    title="Clear search"
                                >×</button>
                            )}
                        </div>

                        <div className="flex w-auto items-center gap-2">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleOpenPreview}
                                disabled={!previewableFile}
                                className="rounded-full flex gap-2 items-center !py-1 shadow-none active:shadow-none translate-x-[0px] translate-y-[0px] active:translate-x-[0px] active:translate-y-[0px] disabled:opacity-40 disabled:cursor-not-allowed"
                                title={previewableFile
                                    ? previewableFile.name.endsWith('.md') || previewableFile.name.endsWith('.mdx') || previewableFile.name.endsWith('.markdown')
                                        ? 'Markdown Preview'
                                        : 'ABI Contract Specification'
                                    : 'Open a .clar or .md file to preview'
                                }
                            >
                                <EyeIcon className="w-3 h-3" />
                                <span>Preview</span>
                            </Button>
                            <Button
                                id="check-button"
                                variant="primary"
                                size="sm"
                                onClick={handleCompile}
                                className="rounded-full flex gap-2 items-center !py-1 shadow-none active:shadow-none translate-x-[0px] translate-y-[0px] active:translate-x-[0px] active:translate-y-[0px]"
                                title="Run Clarinet Check (F5)"
                            >
                                <PlayIcon className="w-3 h-3" />
                                <span>Check</span>
                            </Button>
                            <Button
                                id="debug-button"
                                variant="secondary"
                                size="sm"
                                onClick={handleDebug}
                                className="rounded-full  flex gap-2 items-center !py-1 shadow-none active:shadow-none translate-x-[0px] translate-y-[0px] active:translate-x-[0px] active:translate-y-[0px]"
                                title="Debug Clarity"
                            >
                                <BugIcon className="w-3 h-3" />
                                <span>Debug</span>
                            </Button>
                            <Button
                                id="deploy-button"
                                variant="primary"
                                size="sm"
                                onClick={handleDeployView}
                                className="rounded-full  flex gap-2 items-center !py-1 shadow-none active:shadow-none translate-x-[0px] translate-y-[0px] active:translate-x-[0px] active:translate-y-[0px]"
                            >
                                <RocketIcon className="w-3 h-3" />
                                <span>Deploy</span>
                            </Button>
                            <button
                                id="ai-assistant-button"
                                onClick={toggleRightSidebar}
                                className="text-caspier-muted hover:text-caspier-text p-1 ml-2 border border-transparent hover:border-caspier-border rounded"
                                title="Open AI Assistant"
                            >
                                <BotIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex w-fit items-center gap-1.5 px-2 border-l border-caspier-border ml-2">

                            <button
                                onClick={handleSaveFile}
                                disabled={!activeFileId || !dirtyFileIds.includes(activeFileId)}
                                className={`p-1.5 rounded transition-all ${activeFileId && dirtyFileIds.includes(activeFileId)
                                    ? 'text-labstx-orange hover:bg-labstx-orange/10 bg-labstx-orange/5'
                                    : 'text-caspier-muted opacity-50 cursor-not-allowed'
                                    }`}
                                title="Save File (Ctrl+S)"
                            >
                                <SaveIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Monaco Editor or Home Tab or ABI Preview */}
                    <div className="flex-1 relative min-h-0">
                        {activeFileId === '@home' ? (
                            <HomeTab
                                onCreateFile={() => handleCreateNode('root', 'file', `contract-${Date.now()}.clar`)}
                                onImportWorkspace={handleImportWorkspace}
                                onSelectWalkthrough={(id) => {
                                    setTerminalLines(prev => [...prev, { id: Date.now().toString(), type: 'info', content: `Starting walkthrough: ${id}` }]);
                                    // Could implement more logic here
                                }}
                                onClone={() => {
                                    const modal = document.getElementById('public-clone-modal');
                                    if (modal) modal.style.display = 'flex';
                                }}
                                theme={theme}
                            />
                        ) : activeFileId?.startsWith('@abi-') ? (() => {
                            const srcFileId = activeFileId.replace(/^@abi-/, '');
                            const srcFile = findFile(files, srcFileId);
                            return (
                                <AbiPreviewTab
                                    code={srcFile?.content || ''}
                                    fileName={srcFile?.name || 'contract.clar'}
                                    theme={theme}
                                />
                            );
                        })() : activeFileId?.startsWith('@md-') ? (() => {
                            const srcFileId = activeFileId.replace(/^@md-/, '');
                            const srcFile = findFile(files, srcFileId);
                            return (
                                <MarkdownPreviewTab
                                    content={srcFile?.content || ''}
                                    fileName={srcFile?.name || 'document.md'}
                                    theme={theme}
                                />
                            );
                        })() : !activeFileId ? (
                            <EmptyState
                                onCreateFile={() => handleCreateNode('root', 'file', `contract-${Date.now()}.clar`)}
                                onOpenProject={() => setIsProjectModalOpen(true)}
                                onToggleSearch={() => {
                                    const input = document.getElementById('editor-search-input');
                                    if (input) input.focus();
                                }}
                                onToggleCommandPalette={() => {
                                    // Could trigger a command palette if implemented
                                }}
                                theme={theme}
                            />
                        ) : (
                            <CodeEditor
                                code={activeContent}
                                language={activeLanguage}
                                onChange={handleEditorChange}
                                settings={settings}
                                theme={theme}
                                action={editorAction}
                                onSave={handleSaveFile}
                                findQuery={searchFindQuery}
                            />
                        )}
                    </div>

                    {isTerminalVisible && (
                        <>
                            {/* Terminal Resizer */}
                            <div
                                className="h-1 bg-caspier-dark hover:bg-labstx-orange cursor-row-resize z-10 transition-colors delay-150"
                                onMouseDown={startTerminalResizing}
                            />
                            <TerminalPanel
                                terminalLines={terminalLines}
                                outputLines={outputLines}
                                problems={problems}
                                height={terminalHeight}
                                theme={theme}
                                onClearTerminal={handleClearTerminal}
                                onCommand={handleTerminalCommand}
                                onLocateProblem={handleLocateProblem}
                            />
                        </>
                    )}
                </div>

                {isRightSidebarVisible && (
                    <>
                        {/* Right Resizer */}
                        <div
                            className="w-1 bg-caspier-dark hover:bg-labstx-orange cursor-col-resize z-10 transition-colors delay-150"
                            onMouseDown={startResizing('right')}
                        />
                        <SidebarRight
                            currentCode={activeContent}
                            files={files}
                            width={rightWidth}
                            settings={settings}
                            onClose={toggleRightSidebar}
                            onUpdateFile={handleUpdateFileContent}
                            onCreateFile={(name, content) => handleCreateNode('root', 'file', name, content)}
                        />
                    </>
                )}
            </div>

            {/* Status Bar */}
            <div className="h-6 bg-labstx-orange text-white flex justify-between items-center px-3 text-xs font-bold select-none flex-shrink-0">
                <div className="flex gap-4">
                    <span>{gitState.branch}*</span>
                    <span>{problems.length} problems</span>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setRunTour(true)}
                        className="hover:underline cursor-pointer"
                    >
                        🚀 Start Tour
                    </button>
                    <span>Ln 12, Col 4</span>
                    <span>UTF-8</span>
                    <span>{activeLanguage.toUpperCase()}</span>
                    <span>LabSTX v1.2.0</span>
                </div>
            </div>

            {/* Product Tour */}
            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous
                showProgress
                showSkipButton
                callback={handleTourCallback}
                styles={{
                    options: {
                        primaryColor: '#F05023', // labstx-orange
                        backgroundColor: '#1C1C1C',
                        textColor: '#E0E0E0',
                        arrowColor: '#1C1C1C',
                        zIndex: 1000,
                    },
                    tooltipContainer: {
                        textAlign: 'left',
                        borderRadius: '12px',
                        border: '1px solid #333',
                        padding: '10px'
                    },
                    buttonNext: {
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    },
                    buttonBack: {
                        marginRight: 10,
                        fontSize: '12px',
                        color: '#999'
                    },
                    buttonSkip: {
                        fontSize: '12px',
                        color: '#999'
                    }
                }}
            />

            {/* Deployment Notification */}
            {notification && (
                <DeploymentNotification
                    deployHash={notification.deployHash}
                    network={notification.network}
                    contractName={notification.contractName}
                    onClose={() => setNotification(null)}
                />
            )}
        </div>
    );
}

export default App;
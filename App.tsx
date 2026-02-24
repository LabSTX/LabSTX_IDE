

import React, { useState, useEffect, useCallback } from 'react';
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
import { PlayIcon, BotIcon, RocketIcon, BugIcon } from './components/UI/Icons';
import { DeploymentNotification } from './components/UI/DeploymentNotification';
import HomeTab from './components/UI/HomeTab';
import { ClarityCompiler } from './services/stacks/compiler';
import { StacksWalletService } from './services/stacks/wallet';
import JSZip from 'jszip';

function App() {
    const [activeView, setActiveView] = useState<ActivityView>(ActivityView.EXPLORER);

    // Theme State
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    // Workspace State
    const [workspaces, setWorkspaces] = useState<Record<string, FileNode[]>>({
        'default_workspace': INITIAL_FILES
    });
    const [activeWorkspace, setActiveWorkspace] = useState('default_workspace');

    // History State
    const [history, setHistory] = useState<FileNode[][]>([INITIAL_FILES]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Derived state for current file tree
    const files = history[historyIndex];

    // Editor Tabs State
    const [openFiles, setOpenFiles] = useState<string[]>(['@home', 'Clarinet.toml', 'simple-counter.clar']);
    const [activeFileId, setActiveFileId] = useState<string | null>('@home');

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

    // Deployment Notification State
    const [notification, setNotification] = useState<{ deployHash: string; network: string, contractName?: string } | null>(null);

    // Project Settings
    const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);

    // Git State
    const [gitState, setGitState] = useState<GitState>({
        modifiedFiles: [],
        stagedFiles: [],
        commits: [
            // Simulated History
            { id: 'c-5', message: 'Merge branch feature/auth', date: Date.now() - 1000000, hash: '8f2a1b', branch: 'main', parents: ['c-4', 'c-3'] },
            { id: 'c-4', message: 'Update configuration', date: Date.now() - 2000000, hash: '7e1c9d', branch: 'main', parents: ['c-2'] },
            { id: 'c-3', message: 'Implement login logic', date: Date.now() - 2500000, hash: '6d4e5f', branch: 'feature/auth', parents: ['c-1'] },
            { id: 'c-2', message: 'Fix typo in README', date: Date.now() - 3000000, hash: '5c3b2a', branch: 'main', parents: ['c-1'] },
            { id: 'c-1', message: 'Initial Commit', date: Date.now() - 4000000, hash: '4b2a1c', branch: 'main', parents: [] },
        ],
        branch: 'main'
    });

    // Layout State
    const [leftWidth, setLeftWidth] = useState(260);
    const [rightWidth, setRightWidth] = useState(320);
    const [terminalHeight, setTerminalHeight] = useState(200);
    const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(true);
    const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(true);
    const [isTerminalVisible, setIsTerminalVisible] = useState(true);

    // Layout Toggles
    const toggleLeftSidebar = () => setIsLeftSidebarVisible(!isLeftSidebarVisible);
    const toggleRightSidebar = () => setIsRightSidebarVisible(!isRightSidebarVisible);
    const toggleTerminal = () => setIsTerminalVisible(!isTerminalVisible);

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

        // Update Git modified status
        setGitState(prev => {
            if (!prev.modifiedFiles.includes(activeFileId) && !prev.stagedFiles.includes(activeFileId)) {
                return { ...prev, modifiedFiles: [...prev.modifiedFiles, activeFileId] };
            }
            return prev;
        });
    };

    const handleCompile = async () => {
        if (!activeFileId) return;
        const file = findFile(files, activeFileId);
        if (!file || file.type !== 'file') return;

        const fileName = file.name;
        const sourceCode = file.content || activeContent;

        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'command', content: `Checking Clarity contract: ${fileName}...` },
        ]);

        setOutputLines([
            `> Validating Clarity code: ${fileName}...`,
            `> Clarity Version: ${settings.clarityVersion || '2.0'}`,
            `> Checking for syntax errors...`
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
                    { id: Date.now().toString(), type: 'success', content: 'Clarity validation successful!' },
                ]);

                setOutputLines(prev => [
                    ...prev,
                    `> Analysis completed successfully.`,
                    `> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                    `> ✨ Contract is valid and ready for deployment.`,
                    `> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                ]);

                if (result.metadata?.entryPoints) {
                    setOutputLines(prev => [...prev, `> 🔧 Functions found: ${result.metadata.entryPoints.map(ep => ep.name).join(', ')}`]);
                }
            } else {
                setTerminalLines(prev => [
                    ...prev,
                    { id: Date.now().toString(), type: 'error', content: 'Validation failed. See Output and Problems for details.' },
                ]);
                setOutputLines(prev => [...prev, `Error: Validation failed.`, ...(result.errors || []).map(e => `  - ${e}`)]);

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

    const handlePush = () => {
        setTerminalLines(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'info', content: 'Pushing to origin/main...' }
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
                            onCommit={handleCommit}
                            onPush={handlePush}
                            wallet={wallet}
                            onWalletConnect={handleWalletConnect}
                            onWalletDisconnect={handleWalletDisconnect}
                            compilationResult={compilationResult}
                            onDeploySuccess={handleDeploySuccess}
                            onLoadTemplate={handleLoadTemplate}
                            onAddTerminalLine={addTerminalLine}
                            theme={theme}
                        />
                        {/* Left Resizer */}
                        <div
                            className="w-1 bg-caspier-dark hover:bg-caspier-red cursor-col-resize z-10 transition-colors delay-150"
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
                    />

                    <div className="h-9 flex items-center bg-caspier-black border-b border-caspier-border px-4 justify-between flex-shrink-0">
                        <div className="flex items-center text-sm">
                            <span className="text-caspier-muted text-xs mr-2">{activeFileId ? findFile(files, activeFileId)?.name : ''}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleCompile}
                                className="flex gap-2 items-center !py-1 shadow-none active:shadow-none translate-x-[0px] translate-y-[0px] active:translate-x-[0px] active:translate-y-[0px]"
                                title="Compile (F5)"
                            >
                                <PlayIcon className="w-3 h-3" />
                                <span>Compile</span>
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleDebug}
                                className="flex gap-2 items-center !py-1 shadow-none active:shadow-none translate-x-[0px] translate-y-[0px] active:translate-x-[0px] active:translate-y-[0px]"
                                title="Debug Clarity"
                            >
                                <BugIcon className="w-3 h-3" />
                                <span>Debug</span>
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleDeployView}
                                className="flex gap-2 items-center !py-1 shadow-none active:shadow-none translate-x-[0px] translate-y-[0px] active:translate-x-[0px] active:translate-y-[0px]"
                            >
                                <RocketIcon className="w-3 h-3" />
                                <span>Deploy</span>
                            </Button>
                            {!isRightSidebarVisible && (
                                <button
                                    onClick={toggleRightSidebar}
                                    className="text-caspier-muted hover:text-caspier-text p-1 ml-2 border border-transparent hover:border-caspier-border rounded"
                                    title="Open AI Assistant"
                                >
                                    <BotIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Monaco Editor or Home Tab */}
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
                        ) : (
                            <CodeEditor
                                code={activeContent}
                                language={activeLanguage}
                                onChange={handleEditorChange}
                                settings={settings}
                                theme={theme}
                            />
                        )}
                    </div>

                    {isTerminalVisible && (
                        <>
                            {/* Terminal Resizer */}
                            <div
                                className="h-1 bg-caspier-dark hover:bg-caspier-red cursor-row-resize z-10 transition-colors delay-150"
                                onMouseDown={startTerminalResizing}
                            />
                            <TerminalPanel
                                terminalLines={terminalLines}
                                outputLines={outputLines}
                                problems={problems}
                                height={terminalHeight}
                                theme={theme}
                                onClearTerminal={handleClearTerminal}
                            />
                        </>
                    )}
                </div>

                {isRightSidebarVisible && (
                    <>
                        {/* Right Resizer */}
                        <div
                            className="w-1 bg-caspier-dark hover:bg-caspier-red cursor-col-resize z-10 transition-colors delay-150"
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
            <div className="h-6 bg-caspier-red text-caspier-black flex justify-between items-center px-3 text-xs font-bold select-none flex-shrink-0">
                <div className="flex gap-4">
                    <span>{gitState.branch}*</span>
                    <span>{problems.length} problems</span>
                </div>
                <div className="flex gap-4">
                    <span>Ln 12, Col 4</span>
                    <span>UTF-8</span>
                    <span>{activeLanguage.toUpperCase()}</span>
                    <span>LabSTX v1.2.0</span>
                </div>
            </div>

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
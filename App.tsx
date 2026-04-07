

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileNode, ActivityView, TerminalLine, ProjectSettings, GitState, GitCommit, Problem, WalletConnection, CompilationResult, DeployedContract, TerminalInstance } from './types';
import { INITIAL_FILES, DEFAULT_SETTINGS } from './constants';
import ActivityBar from './components/Layout/ActivityBar';
import SidebarLeft from './components/Layout/SidebarLeft';
import SidebarRight from './components/Layout/SidebarRight';
import TerminalPanel from './components/Layout/TerminalPanel';
import CodeEditor from './components/Editor/CodeEditor';
import EditorTabs from './components/Layout/EditorTabs';
import Header from './components/Layout/Header';
import { Button } from './components/UI/Button';
import { PlayIcon, BotIcon, RocketIcon, BugIcon, UndoIcon, RedoIcon, SaveIcon, EyeIcon, SearchIcon, MessageSquareIcon, AnalyseIcon, RefreshIcon } from './components/UI/Icons';
import { DeploymentNotification } from './components/UI/DeploymentNotification';
import { SpecialTab } from './components/Layout/SpecialTab';
import EmptyState from './components/Layout/EmptyState';
import { ClarityCompiler } from './services/stacks/compiler';
import { StacksWalletService } from './services/stacks/wallet';
import { filesToFileNodes } from './services/templates';
import { GitHubTemplateService } from './services/githubTemplates';
import JSZip from 'jszip';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { io, Socket } from 'socket.io-client';
import { DiscoveryImportType, StacksNetworkType } from './components/Layout/DiscoveryImportModal';
import IntroLoading from './components/UI/IntroLoading';
import { webContainerService } from './services/webContainerService';
import confetti from 'canvas-confetti';
import { Droplets } from 'lucide-react';
import { get, set } from 'idb-keyval';
import FaucetPopover from './components/UI/FaucetPopover';

const CHANGELOG_CONTENT = `# Changelog

All notable changes to the LabSTX IDE will be documented in this file.

## [1.2.0] - 2026-03-07
### Added
- Line ending (LF/CRLF) support in the status bar and editor.
- Changelog button in the status bar.

## [1.1.0] - 2026-03-01
### Added
- Enhanced terminal output with color-coded status messages.
- New project templates for Clarity contracts.

## [1.0.0] - 2026-02-20
### Added
- Initial release of LabSTX IDE.
- Support for Clarity programming language.
- Integrated Stacks wallet connection.
- Clarinet-based compilation and debugging.
`;

function App() {
    const [activeView, setActiveView] = useState<ActivityView>(() => {
        const saved = localStorage.getItem('labstx_active_view');
        return (saved as ActivityView) || ActivityView.EXPLORER;
    });
    const [hasClarinet, setHasClarinet] = useState(false);

    const dialogRef = useRef<HTMLDialogElement>(null);

    const handleSelect = (value: 'LF' | 'CRLF') => {
        setLineEnding(value);
        dialogRef.current?.close();
    };
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        localStorage.setItem('labstx_active_view', activeView);
    }, [activeView]);

    // Theme State
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        return (localStorage.getItem('labstx_theme') as 'dark' | 'light') || 'dark';
    });

    useEffect(() => {
        localStorage.setItem('labstx_theme', theme);
    }, [theme]);

    // Session State
    const [sessionId] = useState(() => {
        const saved = sessionStorage.getItem('labstx_session_id');
        if (saved) return saved;
        const newId = `sess_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('labstx_session_id', newId);
        return newId;
    });

    const [firstRunWorkspaces, setFirstRunWorkspaces] = useState<Record<string, boolean>>({});
    const [isStateLoaded, setIsStateLoaded] = useState(false);

    const [workspaces, setWorkspaces] = useState<Record<string, FileNode[]>>({});
    const [activeWorkspace, setActiveWorkspace] = useState(() => {
        return localStorage.getItem('labstx_active_workspace') || 'default_workspace';
    });


    // Persistence logic moved to useEffect below
    useEffect(() => {
        if (isStateLoaded) {
            set('labstx_workspaces', workspaces);
            console.log("Saved to IndexedDB"); // Add this to verify it's firing
        }
    }, [workspaces, isStateLoaded]);

    useEffect(() => {
        if (isStateLoaded) {
            localStorage.setItem('labstx_active_workspace', activeWorkspace);
        }
    }, [activeWorkspace, isStateLoaded]);

    // Workspace Metadata (timestamps, etc)
    const [workspaceMetadata, setWorkspaceMetadata] = useState<Record<string, { createdAt: number }>>(() => {
        const saved = localStorage.getItem('labstx_workspace_metadata');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { return { 'default_workspace': { createdAt: Date.now() } }; }
        }
        return { 'default_workspace': { createdAt: Date.now() } };
    });

    useEffect(() => {
        localStorage.setItem('labstx_workspace_metadata', JSON.stringify(workspaceMetadata));
    }, [workspaceMetadata]);

    // History State
    const [history, setHistory] = useState<FileNode[][]>([INITIAL_FILES]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Derived state for current file tree
    const files = history[historyIndex];

    useEffect(() => {
        const checkClarinet = (nodes: FileNode[]): boolean => {
            return nodes.some(node => node.name.toLowerCase() === 'clarinet.toml');
        };
        setHasClarinet(checkClarinet(files));
    }, [files, setHasClarinet]);

    // Editor Tabs State with persistence
    // Editor Tabs State (non-persistent)
    const [openFileIds, setOpenFileIds] = useState<string[]>([]);
    const [openSpecialIds, setOpenSpecialIds] = useState<string[]>(['@home']);

    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [activeSpecialId, setActiveSpecialId] = useState<string | null>('@home');
    const [activeTabGroup, setActiveTabGroup] = useState<'file' | 'special'>('special');
    const [activeContent, setActiveContent] = useState<string>('');
    const [pendingNodeCommand, setPendingNodeCommand] = useState<{ command: string, terminalId: string, timestamp: number } | null>(null);
    //  const [searchFindQuery, setSearchFindQuery] = useState<string>('');
    //const [templateProgress, setTemplateProgress] = useState<number | null>(null);
    const [activeLanguage, setActiveLanguage] = useState<string>('clarity');
    // Tracks which file was last loaded into the editor so we only pull from 'files'
    // when the user actually switches tabs — never during normal typing.
    const loadedFileIdRef = useRef<string | null>(null);
    const sidebarRightRef = useRef<any>(null);

    // Simnet State
    const [activeSimnetAccount, setActiveSimnetAccount] = useState<string>(() => {
        return localStorage.getItem('labstx_active_simnet_account') || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    });

    useEffect(() => {
        localStorage.setItem('labstx_active_simnet_account', activeSimnetAccount);
    }, [activeSimnetAccount]);

    const handleOpenSimnetScratchpad = () => {
        if (!openSpecialIds.includes('@simnet')) {
            setOpenSpecialIds(prev => [...prev, '@simnet']);
        }
        setActiveSpecialId('@simnet');
        setActiveTabGroup('special');
    };
    const [lineEnding, setLineEnding] = useState<'LF' | 'CRLF'>('CRLF');
    const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
    const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleCursorChange = useCallback((position: { lineNumber: number, column: number }) => {
        if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
        cursorTimeoutRef.current = setTimeout(() => {
            setCursorPosition(position);
        }, 100);
    }, []);

    const [outputLines, setOutputLines] = useState<string[]>([]);
    const [problems, setProblems] = useState<Problem[]>([]);

    const [terminals, setTerminals] = useState<TerminalInstance[]>(() => [
        { id: 'default', title: 'clarinet', lines: [], isProcessRunning: false }
    ]);
    const [activeTerminalId, setActiveTerminalId] = useState<string>('default');
    const [discoveryProgress, setDiscoveryProgress] = useState(0);

    const socketRef = useRef<Socket | null>(null);
    const activeTerminal = terminals.find(t => t.id === activeTerminalId) || terminals[0];


    // Helper to add lines to a specific terminal
    const addTerminalLineToInstance = useCallback((terminalId: string, line: Omit<TerminalLine, 'id'>) => {
        setTerminals(prev => prev.map(t => {
            if (t.id === terminalId) {
                return {
                    ...t,
                    lines: [...t.lines, { ...line, id: Date.now().toString() + Math.random() }]
                };
            }
            return t;
        }));
    }, []);

    const addTerminalLine = useCallback((line: Omit<TerminalLine, 'id'>) => {
        addTerminalLineToInstance(activeTerminalId, line);
    }, [activeTerminalId, addTerminalLineToInstance]);

    const handleClearTerminal = useCallback(() => {
        setTerminals(prev => prev.map(t => t.id === activeTerminalId ? { ...t, lines: [] } : t));
    }, [activeTerminalId]);

    // Compilation & Deployment State
    const [compilationResult, setCompilationResult] = useState<CompilationResult | undefined>();
    const [wallet, setWallet] = useState<WalletConnection>(() => {
        const saved = localStorage.getItem('labstx_wallet');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { return { type: 'none', connected: false }; }
        }
        return { type: 'none', connected: false };
    });

    useEffect(() => {
        localStorage.setItem('labstx_wallet', JSON.stringify(wallet));
    }, [wallet]);

    const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>([]);

    useEffect(() => {
        if (isStateLoaded) {
            set('labstx_deployed_contracts', deployedContracts);
        }
    }, [deployedContracts, isStateLoaded]);

    // Initial State Loader and Migration
    useEffect(() => {
        const loadInitialState = async () => {
            try {
                // 1. Load Workspaces
                let savedWorkspaces = await get('labstx_workspaces');
                if (!savedWorkspaces) {
                    // Try migration from localStorage
                    const legacy = localStorage.getItem('labstx_workspaces');
                    if (legacy) {
                        try {
                            savedWorkspaces = JSON.parse(legacy);
                            await set('labstx_workspaces', savedWorkspaces);
                            localStorage.removeItem('labstx_workspaces');
                        } catch (e) {
                            savedWorkspaces = { 'default_workspace': INITIAL_FILES };
                        }
                    } else {
                        savedWorkspaces = { 'default_workspace': INITIAL_FILES };
                    }
                }
                setWorkspaces(savedWorkspaces);

                // 2. Load Active Workspace (stays in localStorage as it is small)
                const savedActive = localStorage.getItem('labstx_active_workspace');
                if (savedActive) setActiveWorkspace(savedActive);

                // 3. Load Deployed Contracts
                let savedContracts = await get('labstx_deployed_contracts');
                if (!savedContracts) {
                    // Try migration from localStorage
                    const legacy = localStorage.getItem('labstx_deployed_contracts');
                    if (legacy) {
                        try {
                            savedContracts = JSON.parse(legacy);
                            await set('labstx_deployed_contracts', savedContracts);
                            localStorage.removeItem('labstx_deployed_contracts');
                        } catch (e) {
                            savedContracts = [];
                        }
                    } else {
                        savedContracts = [];
                    }
                }
                // Filter out simnet contracts as they are transient
                const filteredContracts = (savedContracts || []).filter((c: any) => c.network !== 'simnet');
                setDeployedContracts(filteredContracts);

                // 4. Update History with initial files of the active workspace
                const activeFiles = savedWorkspaces[savedActive || 'default_workspace'] || INITIAL_FILES;
                setHistory([activeFiles]);

                setIsStateLoaded(true);
                console.log('[Persistence] State loaded from IndexedDB');
            } catch (err) {
                console.error('[Persistence] Failed to load state:', err);
                // Fallback to defaults
                setWorkspaces({ 'default_workspace': INITIAL_FILES });
                setHistory([INITIAL_FILES]);
                setIsStateLoaded(true);
            }
        };

        loadInitialState();
    }, []);

    const handleOpenNewProject = () => {
        if (!openSpecialIds.includes('@new-project')) {
            setOpenSpecialIds(prev => [...prev, '@new-project']);
        }
        setActiveSpecialId('@new-project');
        setActiveTabGroup('special');
    };

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

    const [isAiQuotaReached, setIsAiQuotaReached] = useState(false);
    const [aiStats, setAiStats] = useState<{ aiInteractions: number; aiQuotaLimit: number } | null>(null);
    const [templateProgress, setTemplateProgress] = useState<number | null>(null);
    const [prefilledContractInfo, setPrefilledContractInfo] = useState<{ address: string; name: string } | null>(null);

    const handleGoToInteract = useCallback((contractHash: string) => {
        const [address, name] = contractHash.split('.');
        setPrefilledContractInfo({ address, name });
        setActiveView(ActivityView.CALL_CONTRACT);
    }, []);

    const handleOpenContractCall = useCallback((contractHash: string) => {
        const tabId = `@contract-call-${contractHash}`;
        if (!openSpecialIds.includes(tabId)) {
            setOpenSpecialIds(prev => [...prev, tabId]);
        }
        setActiveSpecialId(tabId);
        setActiveTabGroup('special');
    }, [openSpecialIds]);

    // AI Quota Checker
    const handleCheckAiQuota = useCallback(async () => {
        if (!wallet.address || wallet.address === 'unconnected') return;
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const res = await fetch(`${backendUrl}/ide-api/stats/user/${wallet.address}`);
            if (res.ok) {
                const stats = await res.json();
                setAiStats({
                    aiInteractions: stats.aiInteractions,
                    aiQuotaLimit: stats.aiQuotaLimit
                });
                if (stats.aiInteractions >= stats.aiQuotaLimit) {
                    setIsAiQuotaReached(true);
                } else {
                    setIsAiQuotaReached(false);
                }
            }
        } catch (err) {
            console.error('[AI Quota Checker] Failed:', err);
        }
    }, [wallet.address]);

    useEffect(() => {
        handleCheckAiQuota();
        // Check every 6 minutes while app is active
        const interval = setInterval(handleCheckAiQuota, 6 * 60 * 1000);
        return () => clearInterval(interval);
    }, [handleCheckAiQuota]);

    // Editing State
    const [dirtyFileIds, setDirtyFileIds] = useState<string[]>([]);
    const [deletedFilePaths, setDeletedFilePaths] = useState<string[]>([]);
    const [editorAction, setEditorAction] = useState<{ type: 'save' | 'gotoLine' | null, timestamp: number, line?: number, column?: number }>({ type: null, timestamp: 0 });

    // Search-in-code state (synced to Monaco's find widget)
    const [editorSearchQuery, setEditorSearchQuery] = useState<string>('');
    const [searchFindQuery, setSearchFindQuery] = useState<string | undefined>(undefined);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const [rightWidth, setRightWidth] = useState(450);
    const [terminalHeight, setTerminalHeight] = useState(200);
    const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(true);
    const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(false);
    const [isTerminalVisible, setIsTerminalVisible] = useState(false);
    const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);

    // Faucet State
    const [isFaucetOpen, setIsFaucetOpen] = useState(false);
    const [faucetAnchorRect, setFaucetAnchorRect] = useState<DOMRect | null>(null);

    // Layout Toggles
    const toggleLeftSidebar = () => setIsLeftSidebarVisible(!isLeftSidebarVisible);
    const toggleRightSidebar = () => setIsRightSidebarVisible(!isRightSidebarVisible);
    const toggleTerminal = () => setIsTerminalVisible(!isTerminalVisible);
    const toggleTerminalMaximize = () => {
        const next = !isTerminalMaximized;
        setIsTerminalMaximized(next);
        if (next) setIsTerminalVisible(true);
    };

    // --- Onboarding Tour State ---
    const ONBOARDING_STEPS: Step[] = [
        {
            target: 'body',
            content: (
                <div className="text-left">
                    <h3 className="text-lg font-bold text-labstx-orange mb-2">Welcome to LabSTX! ✨</h3>
                    <p>The premier development environment for Clarity smart contracts on the Stacks blockchain.</p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '#workspace-selector',
            content: 'Manage your projects here. You can create, rename, import, and even sync workspaces directly from the server.',
            placement: 'bottom',
        },
        {
            target: '#home-button',
            content: 'The Home view is your dashboard. Access smart contract templates and follow walkthroughs to learn Clarity.',
            placement: 'right',
        },
        {
            target: '#view-explorer',
            content: 'Your file system at a glance. Create folders, contracts, and markdown documentation here.',
            placement: 'right',
        },
        {
            target: '#editor-search-input',
            content: 'Quickly find and replace text across your active file with powerful search tools.',
            placement: 'bottom',
        },
        {
            target: '#preview-button',
            content: 'Switch to Preview mode to see rendered Markdown or explore the ABI specification of your Clarity contracts.',
            placement: 'bottom',
        },
        {
            target: '#check-button',
            content: 'Run a syntax and logic check on your current Clarity contract using Clarinet.',
            placement: 'bottom',
        },
        {
            target: '#deploy-button',
            content: 'Deploy your contracts to Stacks Mainnet, Testnet when you are ready.',
            placement: 'bottom',
        },
        {
            target: '#ai-assistant-button',
            content: 'Open the LabSTX AI Assistant to help you write, explain, and debug Clarity code.',
            placement: 'left',
        },
        {
            target: '#terminal-panel',
            content: 'Interact with the Stacks blockchain, view compiler output, and track code problems in real-time.',
            placement: 'top',
        },
        {
            target: '#status-bar',
            content: 'Stay updated on your Problem count, line numbers, and the latest LabSTX improvements via the Changelog.',
            placement: 'top',
        },
        {
            target: '#layout-controls',
            content: 'Customize your layout! Toggle the sidebars, panels, and switch between light and dark themes.',
            placement: 'bottom',
        }
    ];

    const COMPILE_DEPLOY_STEPS: Step[] = [
        {
            target: 'body',
            content: (
                <div className="text-left">
                    <h3 className="text-lg font-bold text-labstx-orange mb-2">Compile & Deploy 🚀</h3>
                    <p>Learn how to turn your Clarity code into a live smart contract on the Stacks blockchain.</p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '#view-explorer',
            content: 'First, open a Clarity contract from the Explorer. Most contracts are located in the "contracts" folder.',
            placement: 'right',
        },
        {
            target: '#check-button',
            content: 'Use the Compile button (at the top of the editor) to run a static analysis. It catches syntax errors before you deploy.',
            placement: 'bottom',
        },
        {
            target: '#deploy-button',
            content: 'When you are ready, click Deploy. This will open the deployment panel where you can choose your network (Mainnet, Testnet, or Simnet).',
            placement: 'bottom',
        },
        {
            target: '#terminal-panel',
            content: 'Watch the terminal for deployment logs. You will see the transaction hash and deployment status here.',
            placement: 'top',
        },
        {
            target: '#view-activity_history',
            content: 'Check the Activity History to see all your past deployments and interactions with the blockchain.',
            placement: 'right',
        }
    ];

    const [runTour, setRunTour] = useState(false);
    const [activeTourId, setActiveTourId] = useState('getting-started');
    const [tourSteps, setTourSteps] = useState<Step[]>(ONBOARDING_STEPS);

    const handleStartTour = useCallback((tourId: string) => {
        // Force reset by clearing then setting
        setRunTour(false);
        setTimeout(() => {
            setActiveTourId(tourId);
            if (tourId === 'getting-started') {
                setTourSteps(ONBOARDING_STEPS);
            } else if (tourId === 'compile-deploy') {
                setTourSteps(COMPILE_DEPLOY_STEPS);
            }
            setRunTour(true);
        }, 10);
    }, []);

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

    // Initialize WebContainer
    useEffect(() => {
        const initWC = async () => {
            try {
                await webContainerService.boot();
                console.log('[WebContainer] Booted successfully');

                // Initial mount of files
                const currentFiles = getLatestFiles();
                const wcFiles = transformFilesToWC(currentFiles);
                await webContainerService.mountFiles(wcFiles);
                console.log('[WebContainer] Files mounted');
            } catch (err) {
                console.error('[WebContainer] Boot failed:', err);
            }
        };
        initWC();
    }, []);

    // Helper to transform FileNode[] to WebContainer FS format
    const transformFilesToWC = (nodes: FileNode[]): any => {
        const result: any = {};
        nodes.forEach(node => {
            if (node.type === 'file') {
                result[node.name] = {
                    file: {
                        contents: node.content || '',
                    },
                };
            } else if (node.children) {
                result[node.name] = {
                    directory: transformFilesToWC(node.children),
                };
            }
        });
        return result;
    };

    // Helper to sync nodes to WebContainer VFS
    const syncNodesToWebContainer = useCallback(async (nodes: FileNode[]) => {
        try {
            const wc = await webContainerService.boot();
            if (!wc) return;
            await webContainerService.clearFileSystem();
            const wcFiles = transformFilesToWC(nodes);
            await webContainerService.mountFiles(wcFiles);
            console.log('[WebContainer] VFS synchronized');
        } catch (err) {
            console.error('[WebContainer] VFS sync failed:', err);
        }
    }, []);

    const handleKillProcess = useCallback((id: string) => {
        const term = terminals.find(t => t.id === id);
        if (term?.isProcessRunning && socketRef.current) {
            socketRef.current.emit('terminal:kill', { sessionId, terminalId: id });
            setTerminals(prev => prev.map(t => t.id === id ? { ...t, isProcessRunning: false } : t));
            addTerminalLineToInstance(id, { type: 'error', content: 'Process stopped by user.' });
        }
    }, [terminals, sessionId, addTerminalLineToInstance]);

    const handleEnsureNodeTerminal = useCallback(() => {
        const nodeTerm = terminals.find(t => t.type === 'webcontainer');
        if (nodeTerm) {
            setActiveTerminalId(nodeTerm.id);
        } else {
            const newId = `term_${Math.random().toString(36).substring(2, 9)}`;
            setTerminals(prev => [
                ...prev,
                { id: newId, title: 'node', lines: [], isProcessRunning: false, type: 'webcontainer' }
            ]);
            setActiveTerminalId(newId);
        }
        setIsTerminalVisible(true);
    }, [terminals]);

    const handleAddTerminal = (type: 'server' | 'webcontainer' = 'server') => {
        const newId = `term_${Math.random().toString(36).substring(2, 9)}`;
        setTerminals(prev => [
            ...prev,
            { id: newId, title: type === 'webcontainer' ? 'node' : 'clarinet', lines: [], isProcessRunning: false, type }
        ]);
        setActiveTerminalId(newId);
    };

    const handleRemoveTerminal = (id: string) => {
        if (terminals.length <= 1) return;

        // Kill process on backend if running
        const term = terminals.find(t => t.id === id);
        if (term?.isProcessRunning && socketRef.current) {
            socketRef.current.emit('terminal:kill', { sessionId, terminalId: id });
        }

        setTerminals(prev => {
            const newTerminals = prev.filter(t => t.id !== id);
            if (activeTerminalId === id) {
                setActiveTerminalId(newTerminals[newTerminals.length - 1].id);
            }
            return newTerminals;
        });
    };

    const handleRunNodeCommand = useCallback((command: string) => {
        setIsTerminalVisible(true);
        // Switch to node terminal if it exists
        const nodeTerm = terminals.find(t => t.type === 'webcontainer');
        if (nodeTerm) {
            setActiveTerminalId(nodeTerm.id);
        } else {
            handleEnsureNodeTerminal();
        }

        // We need to trigger execution in TerminalPanel.
        // I'll add a state to track the command to be executed.
        setPendingNodeCommand({
            command,
            terminalId: nodeTerm ? nodeTerm.id : 'temp', // If temp, the new terminal will pick it up
            timestamp: Date.now()
        });
    }, [terminals, handleEnsureNodeTerminal]);

    // --- Deep Link Handling ---
    const handleDeepLink = useCallback(() => {
        const params = new URLSearchParams(window.location.search);

        // 1. Template Deep Link
        const templateId = params.get('template_id');
        if (templateId) {
            const loadDeepLinkTemplate = async () => {
                try {
                    const templates = await GitHubTemplateService.fetchTemplates();
                    const template = templates.find(t => t.id === templateId);
                    if (template) {
                        const workspaceName = `${template.name} (Imported)`;
                        const files = await GitHubTemplateService.fetchTemplateFiles(template.path);
                        const newRoot = GitHubTemplateService.templateToFileNodes(files);

                        setWorkspaces(prev => ({ ...prev, [workspaceName]: newRoot }));
                        setWorkspaceMetadata(prev => ({ ...prev, [workspaceName]: { createdAt: Date.now() } }));
                        setActiveWorkspace(workspaceName);

                        setHistory([newRoot]);
                        setHistoryIndex(0);

                        setOpenFileIds([]);
                        setActiveFileId(null);
                        setActiveTabGroup('file');

                        addTerminalLine({ type: 'success', content: `Imported template from GitHub: ${template.name}` });
                        syncNodesToWebContainer(newRoot);

                        // If not a clarity template or no Clarinet.toml, switch to node terminal
                        const hasClarinet = newRoot.some(node => node.name.toLowerCase() === 'clarinet.toml');
                        if (!hasClarinet || template.type !== 'clarity') {
                            handleEnsureNodeTerminal();
                        }

                        // Clear URL params
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                } catch (err) {
                    console.error('Failed to load deep link template:', err);
                    addTerminalLine({ type: 'error', content: 'Failed to load template from GitHub deep link.' });
                }
            };
            loadDeepLinkTemplate();
            return;
        }

        // 2. Snippet Deep Link
        const snippetCodeBase64 = params.get('snippet_code');
        if (snippetCodeBase64) {
            try {
                const code = decodeURIComponent(escape(window.atob(snippetCodeBase64)));
                const name = params.get('snippet_name') || 'snippet.clar';
                const lang = params.get('snippet_lang') || 'clarity';

                const newFile: FileNode = {
                    id: `${name}-${Date.now()}`,
                    name,
                    type: 'file',
                    language: lang,
                    content: code
                };

                setWorkspaces(prev => {
                    const currentFiles = prev[activeWorkspace] || INITIAL_FILES;
                    const contractsFolder = currentFiles.find(n => n.name === 'contracts' && n.type === 'folder');

                    let updatedFiles;
                    if (contractsFolder && contractsFolder.children) {
                        updatedFiles = currentFiles.map(n =>
                            n.id === contractsFolder.id
                                ? { ...n, children: [...(n.children || []), newFile] }
                                : n
                        );
                    } else {
                        updatedFiles = [...currentFiles, newFile];
                    }

                    syncNodesToWebContainer(updatedFiles);
                    return { ...prev, [activeWorkspace]: updatedFiles };
                });

                setActiveFileId(newFile.id);
                setOpenFileIds(prev => prev.includes(newFile.id) ? prev : [...prev, newFile.id]);
                setActiveTabGroup('file');

                addTerminalLine({ type: 'success', content: `Loaded snippet: ${name}` });

                // Clear URL params
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) {
                console.error('Failed to decode snippet:', e);
                addTerminalLine({ type: 'error', content: 'Failed to decode snippet code.' });
            }
        }
    }, [activeWorkspace, addTerminalLine, syncNodesToWebContainer, handleEnsureNodeTerminal]);

    useEffect(() => {
        // Run deep link handling after a short delay to ensure initial state is settled
        const timer = setTimeout(() => {
            handleDeepLink();
        }, 500);
        return () => clearTimeout(timer);
    }, [handleDeepLink]);

    // Prevent data loss and clear session on close
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const message = "Are you sure you want to leave? Your temporary session will be cleared and the workspace folder on the server will be deleted.";
            e.preventDefault();
            e.returnValue = message; // Traditional browser-standard way to show "Are you sure?"
            return message;
        };

        const handleUnload = () => {
            // Use sendBeacon to ensure the request is sent even during tab closure
            const payload = JSON.stringify({ sessionId });
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon('/ide-api/project/session/clear', blob);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('unload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('unload', handleUnload);
        };
    }, [sessionId]);

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


    const handleConnectWallet = useCallback(() => {
        setActiveView(ActivityView.DEPLOY);
        setIsLeftSidebarVisible(true);
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

    // Recursively get the path for a given file ID
    const getFilePath = (nodes: FileNode[], targetId: string, currentPath = ''): string | null => {
        for (const node of nodes) {
            const newPath = currentPath ? `${currentPath}/${node.name}` : node.name;
            if (node.id === targetId) return newPath;
            if (node.children) {
                const found = getFilePath(node.children, targetId, newPath);
                if (found) return found;
            }
        }
        return null;
    };

    // Find file by its full path
    const findFileByPath = (nodes: FileNode[], targetPath: string, currentPath = ''): FileNode | null => {
        for (const node of nodes) {
            const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;
            if (nodePath === targetPath) return node;
            if (node.children) {
                const found = findFileByPath(node.children, targetPath, nodePath);
                if (found) return found;
            }
        }
        return null;
    };

    // Navigate the editor to a specific file + line/column (used by Problems "Locate")
    const handleLocateProblem = useCallback((fileName: string, line: number, column: number) => {
        const target = findFile(files, fileName);
        if (!target) return;
        // Open & activate the file tab
        if (!openFileIds.includes(target.id)) {
            setOpenFileIds(prev => [...prev, target.id]);
        }
        setActiveFileId(target.id);
        setActiveTabGroup('file');

        // Slight delay so Monaco mounts the new file before we jump
        setTimeout(() => {
            setEditorAction({ type: 'gotoLine', timestamp: Date.now(), line, column });
        }, 80);
    }, [files, openFileIds]);

    const handleExplainCode = useCallback(() => {
        if (!activeFileId) return;
        const file = findFile(files, activeFileId);
        if (!file) return;

        const command = `Act as an expert Clarity smart contract developer. 
Analyze the file @${file.name} and provide a comprehensive, line-by-line technical breakdown. 
For each block of code:
1. Explain the specific logic and syntax used.
2. Identify any state changes (data-set, data-get, etc.).
3. Highlight security considerations or Stacks-specific patterns.
Break the explanation down into clear, readable sections.`;

        if (!isRightSidebarVisible) {
            setIsRightSidebarVisible(true);
            setTimeout(() => {
                sidebarRightRef.current?.sendMessage(command);
            }, 300);
        } else {
            sidebarRightRef.current?.sendMessage(command);
        }
    }, [activeFileId, files, isRightSidebarVisible]);

    const handleAnalyseCode = useCallback(() => {
        if (!activeFileId) return;
        const file = findFile(files, activeFileId);
        if (!file) return;

        const command = `Act as a senior Clarity software architect. 
Perform a deep structural and logical analysis of the smart contract @${file.name}.

Your analysis should include:
1. **Contract Overview**: Briefly describe the intended purpose and core functionality.
2. **State Management Analysis**: Review all (define-data-var) and (define-map) entries. Are they efficient? Are there any missing data points?
3. **Public API Surface**: Analyze all (define-public) functions. Detail the inputs, outputs, and any potential side effects.
4. **Access Control Audit**: Evaluate the permissioning logic (e.g., use of tx-sender vs contract-caller).
5. **Architectural Improvements**: Suggest ways to refactor the code for better modularity or lower execution costs.
6. **Integration Insights**: How should a frontend or other contracts best interact with this API?

Provide a high-level summary followed by technical details for each section.`;
        if (!isRightSidebarVisible) {
            setIsRightSidebarVisible(true);
            setTimeout(() => {
                sidebarRightRef.current?.sendMessage(command);
            }, 300);
        } else {
            sidebarRightRef.current?.sendMessage(command);
        }
    }, [activeFileId, files, isRightSidebarVisible]);


    const handleDebugCode = useCallback(() => {
        if (!activeFileId) return;
        const file = findFile(files, activeFileId);
        if (!file) return;

        const command = `Act as a senior Clarity security auditor and debugger. 
Deeply analyze the code in @${file.name} to identify bugs, logical errors, and optimization opportunities.

Please structure your response as follows:
1. **Critical Issues**: Identify any bugs that would cause the contract to fail or lose funds.
2. **Logic & Edge Cases**: Check if functions handle 'null' inputs, unauthorized callers, or unexpected state transitions.
3. **Clarity Best Practices**: Suggest improvements for gas efficiency (e.g., using 'map-get?' effectively) and code readability.
4. **Security Check**: Verify 'is-eq tx-sender contract-owner' checks and proper use of 'unwrap!' vs 'try!'.
5. **Proposed Fixes**: Provide the corrected code snippets for any issues found.

Focus specifically on the unique traits of the Stacks blockchain and the Post-Condition mode.`;

        if (!isRightSidebarVisible) {
            setIsRightSidebarVisible(true);
            setTimeout(() => {
                sidebarRightRef.current?.sendMessage(command);
            }, 300);
        } else {
            sidebarRightRef.current?.sendMessage(command);
        }
    }, [activeFileId, files, isRightSidebarVisible]);

    const handleAskAIFix = useCallback((problem: Problem) => {
        const command = `Act as an expert Clarity debugger. 
I'm seeing an error in my Clarity contract @${problem.file}

**Error Description**: 
${problem.description}

Please analyze the code for @${problem.file} and suggest a precise fix.
Explain why this error is occurring and how the proposed change resolves it. 
Include the corrected full and detailed code`;

        if (!isRightSidebarVisible) {
            setIsRightSidebarVisible(true);
            setTimeout(() => {
                sidebarRightRef.current?.sendMessage(command);
            }, 300);
        } else {
            sidebarRightRef.current?.sendMessage(command);
        }
    }, [isRightSidebarVisible]);

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

    // Update content ONLY when the user switches to a different file tab.
    // We intentionally do NOT include 'files' in the dependency array — doing so
    // would re-run this effect on every keystroke (because handleEditorChange
    // mutates the history/files array), causing Monaco's 'value' prop to reset
    // mid-edit and jump the cursor to the last line.
    // Detect line endings in content
    const detectLineEnding = (content: string): 'LF' | 'CRLF' => {
        if (content.includes('\r\n')) return 'CRLF';
        return 'LF';
    };

    // Update content ONLY when the user switches to a different file tab.
    useEffect(() => {
        if (activeTabGroup === 'file' && activeFileId && activeFileId !== loadedFileIdRef.current) {
            const file = findFile(files, activeFileId);
            if (file && file.type === 'file') {
                const content = file.content || '';
                setActiveContent(content);
                setActiveLanguage(file.language || 'plaintext');
                setLineEnding(detectLineEnding(content));
                loadedFileIdRef.current = activeFileId;
            }
        } else if (activeTabGroup === 'file' && !activeFileId) {
            setActiveContent('');
            loadedFileIdRef.current = null;
        }
    }, [activeFileId, activeTabGroup]);

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
        setWorkspaces(prev => ({ ...prev, [activeWorkspace]: getLatestFiles() }));

        const newRoot: FileNode[] = [
            {
                id: 'contracts',
                name: 'contracts',
                type: 'folder',
                children: []
            },
            {
                id: 'tests',
                name: 'tests',
                type: 'folder',
                children: []
            },
            {
                id: 'README.md',
                name: 'README.md',
                type: 'file',
                language: 'markdown',
                content: `# ${name}\n\nNew Clarity workspace created.\n\n- **contracts/**: Place your Clarity contracts here.\n- **tests/**: Place your Vitest tests here.`
            }
        ];

        const newWorkspaces = { ...workspaces, [name]: newRoot };
        setWorkspaces(newWorkspaces);
        setWorkspaceMetadata(prev => ({ ...prev, [name]: { createdAt: Date.now() } }));
        setActiveWorkspace(name);

        // Reset view
        setHistory([newRoot]);
        setHistoryIndex(0);
        setOpenFileIds(['README.md']);
        setActiveFileId('README.md');
        setOpenSpecialIds(['@home']);
        setActiveSpecialId('@home');
        setActiveTabGroup('file');
        setGitState({ modifiedFiles: [], stagedFiles: [], commits: [], branch: 'main' });
        addTerminalLine({ type: 'success', content: `Created and switched to workspace: ${name}` });
        syncNodesToWebContainer(newRoot);
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

        // No longer renaming root folder name since workspaces are flat by default
        const updatedRoot = [...currentData];

        newWorkspaces[newName] = updatedRoot;

        setWorkspaces(newWorkspaces);
        setActiveWorkspace(newName);
        setHistory([updatedRoot]);
        setHistoryIndex(0);

        addTerminalLine({ type: 'success', content: `Renamed workspace to: ${newName}` });
    };

    const handleSwitchWorkspace = (name: string) => {
        if (name === activeWorkspace) return;

        // Save current state
        setWorkspaces(prev => ({ ...prev, [activeWorkspace]: getLatestFiles() }));

        // Load new state
        const nextFiles = workspaces[name];
        if (!nextFiles) return;

        setActiveWorkspace(name);
        setHistory([nextFiles]);
        setHistoryIndex(0);
        setOpenFileIds([]);
        setActiveFileId(null);
        setActiveTabGroup('special');
        setActiveSpecialId('@home');
        setGitState({ modifiedFiles: [], stagedFiles: [], commits: [], branch: 'main' });
        addTerminalLine({ type: 'info', content: `Switched to workspace: ${name}` });
        syncNodesToWebContainer(nextFiles);
        setOutputLines([]);
        setProblems([]);
    };

    const handleDeleteWorkspace = () => {
        const workspaceNames = Object.keys(workspaces);
        if (workspaceNames.length <= 1) {
            alert("Cannot delete the only workspace.");
            return;
        }

        if (window.confirm(`Are you sure you want to delete workspace "${activeWorkspace}"? This action cannot be undone.`)) {
            const workspaceToDelete = activeWorkspace;
            const newWorkspaces = { ...workspaces };
            delete newWorkspaces[workspaceToDelete];

            // Identify the next workspace and its files BEFORE updating any state
            const remainingNames = Object.keys(newWorkspaces);
            const nextWorkspace = remainingNames[0];
            const nextFiles = newWorkspaces[nextWorkspace];

            // Perform a "clean" switch: Update workspaces and active workspace simultaneously
            // We do NOT call handleSwitchWorkspace here because it tries to save the current (deleted) state.
            setWorkspaces(newWorkspaces);
            setActiveWorkspace(nextWorkspace);
            setHistory([nextFiles]);
            setHistoryIndex(0);
            setOpenFileIds([]);
            setActiveFileId(null);
            setActiveTabGroup('special');
            setActiveSpecialId('@home');
            setGitState({ modifiedFiles: [], stagedFiles: [], commits: [], branch: 'main' });
            setOutputLines([]);
            setProblems([]);

            addTerminalLine({ type: 'warning', content: `Deleted workspace: ${workspaceToDelete}` });
            addTerminalLine({ type: 'info', content: `Switched to workspace: ${nextWorkspace}` });
        }
    };

    const handleClearAllWorkspaces = async () => {
        if (!window.confirm("Are you sure you want to CLEAR ALL workspace data? This will delete everything and reset to initial state. This action cannot be undone.")) {
            return;
        }

        try {
            // Reset to initial state
            const initialWorkspaces = { 'default_workspace': INITIAL_FILES };
            setWorkspaces(initialWorkspaces);
            setActiveWorkspace('default_workspace');
            setHistory([INITIAL_FILES]);
            setHistoryIndex(0);
            setOpenFileIds([]);
            setActiveFileId(null);
            setActiveTabGroup('special');
            setActiveSpecialId('@home');
            setGitState({ modifiedFiles: [], stagedFiles: [], commits: [], branch: 'main' });
            setOutputLines([]);
            setProblems([]);
            setDeployedContracts([]);

            // Clear storage
            await Promise.all([
                set('labstx_workspaces', initialWorkspaces),
                set('labstx_deployed_contracts', []),
                localStorage.setItem('labstx_active_workspace', 'default_workspace')
            ]);

            addTerminalLine({ type: 'success', content: 'Successfully cleared all workspace data.' });
            syncNodesToWebContainer(INITIAL_FILES);
        } catch (err) {
            console.error('Failed to clear workspaces:', err);
            alert('Failed to clear all workspace data. Please try again or clear storage manually in Browser Tools.');
        }
    };


    const handleCloneWorkspace = () => {
        const newName = window.prompt("Enter name for the cloned workspace:", `${activeWorkspace}-copy`);
        if (!newName) return;

        if (workspaces[newName]) {
            alert("A workspace with this name already exists.");
            return;
        }

        const currentFiles = history[historyIndex];
        // Deep copy of files to avoid shared reference issues
        const clonedFiles = JSON.parse(JSON.stringify(currentFiles));

        // Update root folder name if applicable
        if (clonedFiles.length > 0 && clonedFiles[0].type === 'folder') {
            clonedFiles[0].name = newName;
        }

        setWorkspaces(prev => ({ ...prev, [newName]: clonedFiles }));
        handleSwitchWorkspace(newName);
        addTerminalLine({ type: 'success', content: `Cloned workspace "${activeWorkspace}" to "${newName}"` });
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
            const currentFiles = getLatestFiles();
            currentFiles.forEach(node => processNode(node, zip));

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

            addTerminalLine({ type: 'success', content: `Workspace '${activeWorkspace}' downloaded successfully.` });

        } catch (error) {
            console.error("Download failed:", error);
            addTerminalLine({ type: 'error', content: `Failed to download workspace: ${error}` });
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
                    if ((zipEntry as any).dir) continue;

                    const parts = path.split('/').filter(p => p);
                    const content = await (zipEntry as any).async('string');

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
                    setWorkspaces(prev => ({ ...prev, [activeWorkspace]: fileNodes }));
                    setHistory([fileNodes]);
                    setHistoryIndex(0);
                    setOpenFileIds([]);
                    setActiveFileId(null);
                    setActiveTabGroup('special');
                    setActiveSpecialId('@home');
                    addTerminalLine({ type: 'success', content: `Workspace imported successfully.` });

                    // Only auto-sync if it contains a Clarinet.toml at the root
                    const hasClarinet = fileNodes.some(node => node.name.toLowerCase() === 'clarinet.toml');
                    if (hasClarinet) {
                        syncNodesToWebContainer(fileNodes);
                    } else {
                        addTerminalLine({ type: 'info', content: `Auto-sync skipped: Clarinet.toml not found in project root.` });
                        handleEnsureNodeTerminal();
                    }
                }
            };
            input.click();
        } catch (error) {
            console.error("Import failed:", error);
            addTerminalLine({ type: 'error', content: `Failed to import workspace: ${error}` });
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

    const getLatestFiles = useCallback(() => {
        if (!historyDebounceRef.current || !activeFileId) return files;

        clearTimeout(historyDebounceRef.current);
        const updateContentRecursive = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
                if (node.id === activeFileId) {
                    return { ...node, content: activeContent };
                }
                if (node.children) {
                    return { ...node, children: updateContentRecursive(node.children) };
                }
                return node;
            });
        };
        const updatedFiles = updateContentRecursive(history[historyIndex]);
        setHistory(prev => {
            const newHist = [...prev];
            newHist[historyIndex] = updatedFiles;
            return newHist;
        });
        return updatedFiles;
    }, [files, activeFileId, activeContent, history, historyIndex]);

    const addToHistory = useCallback((newFiles: FileNode[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newFiles);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

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

        // SYNC: If this is the active file, update activeContent so the editor reflects changes immediately
        if (fileId === activeFileId) {
            setActiveContent(value);
            // Also force Monaco to update even if it has focus
            setEditorAction({ type: 'updateContent', timestamp: Date.now(), content: value });
        }

        // Update Git modified status
        setGitState(prev => {
            if (!prev.modifiedFiles.includes(fileId) && !prev.stagedFiles.includes(fileId)) {
                return { ...prev, modifiedFiles: [...prev.modifiedFiles, fileId] };
            }
            return prev;
        });
    }, [history, historyIndex, addToHistory, activeFileId]);


    const handleEditorChange = useCallback((value: string | undefined) => {
        if (value === undefined || !activeFileId) return;
        if (value === activeContent) return;

        // 1. Immediate UI update for the editor's cursor/text responsiveness
        setActiveContent(value);

        // Clear existing debounce
        if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);

        historyDebounceRef.current = setTimeout(() => {
            // Recursive helper to find and update the file content
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

            // 2. Update HISTORY (The Editor's source)
            setHistory(prev => {
                const newHist = [...prev];
                const currentFiles = newHist[historyIndex];
                if (!currentFiles) return prev;

                const updatedFiles = updateContentRecursive(currentFiles);
                newHist[historyIndex] = updatedFiles;

                // 3. Sync to WEBCONTAINER (while we have the updated tree)
                const path = getFilePath(updatedFiles, activeFileId);
                if (path) {
                    webContainerService.writeFile(path, value);
                }

                return newHist;
            });

            // 4. Update WORKSPACES (The IndexedDB source)
            // This is the part that makes persistence work on refresh
            setWorkspaces(prev => {
                const currentFiles = prev[activeWorkspace] || [];
                const updatedFiles = updateContentRecursive(currentFiles);
                return {
                    ...prev,
                    [activeWorkspace]: updatedFiles
                };
            });

            // 5. Mark as DIRTY
            setDirtyFileIds(prev =>
                prev.includes(activeFileId) ? prev : [...prev, activeFileId]
            );

        }, 300);
    }, [activeFileId, historyIndex, getFilePath, activeWorkspace, activeContent, webContainerService]);


    const handleSaveFile = useCallback(() => {
        if (!activeFileId || !dirtyFileIds.includes(activeFileId)) return;

        // Force immediate sync of any pending history updates before saving
        const currentFiles = getLatestFiles();

        // Move from dirty to git modified
        setDirtyFileIds(prev => prev.filter(id => id !== activeFileId));
        setGitState(prev => {
            if (!prev.modifiedFiles.includes(activeFileId) && !prev.stagedFiles.includes(activeFileId)) {
                return { ...prev, modifiedFiles: [...prev.modifiedFiles, activeFileId] };
            }
            return prev;
        });

        addTerminalLine({ type: 'success', content: `Saved: ${findFile(files, activeFileId)?.name}` });

        // Trigger save effect in editor if needed
        setEditorAction({ type: 'save', timestamp: Date.now() });
    }, [activeFileId, dirtyFileIds, files, activeContent, historyIndex]);

    const handleClearEditorAction = useCallback(() => {
        setEditorAction({ type: null, timestamp: 0 });
    }, []);

    const runFullSync = useCallback(async (silent: boolean = false, filesOverride?: FileNode[]) => {
        if (!silent) addTerminalLine({ type: 'info', content: `Syncing workspace...` });
        const zip = new JSZip();
        const filesToSync = filesOverride || files;
        const processNode = (node: FileNode, folder: any) => {
            if (node.type === 'folder') {
                const newFolder = folder ? folder.folder(node.name) : zip.folder(node.name);
                if (node.children) node.children.forEach(child => processNode(child, newFolder));
            } else {
                const content = node.content || '';
                if (folder) folder.file(node.name, content);
                else zip.file(node.name, content);
            }
        };
        filesToSync.forEach(node => processNode(node, zip));
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const res = await ClarityCompiler.initWorkspace(sessionId, zipBlob);

        // Extract entry points for UI interaction if we have an active Clarity file
        if (res.success && activeFileId) {
            const activeFile = findFile(filesToSync, activeFileId);
            if (activeFile && activeFile.type === 'file' && (activeFile.name.endsWith('.clar') || activeFile.name.endsWith('.clarity'))) {
                const code = activeFile.content || activeContent;
                const entryPoints = ClarityCompiler.extractEntryPoints(code);
                if (res.metadata) {
                    res.metadata.entryPoints = entryPoints;
                } else {
                    res.metadata = { entryPoints, contractType: 'clarity' };
                }
            }
        }

        // Clear tracked deletions after full sync
        if (res.success) {
            setDeletedFilePaths([]);
        }
        return res;
    }, [files, sessionId, addTerminalLine, activeFileId, activeContent, findFile]);

    const runDeltaSync = useCallback(async () => {
        const changedFiles: Record<string, string> = {};

        // Mirror backend workspace hoisting: if there's exactly one root folder, strip its name
        const processPath = (rawPath: string | null) => {
            if (!rawPath) return null;
            if (files.length > 0 && files[0].type === 'folder' && rawPath.startsWith(files[0].name + '/')) {
                return rawPath.substring(files[0].name.length + 1);
            }
            return rawPath;
        };

        dirtyFileIds.forEach(id => {
            const file = findFile(files, id);
            if (file && file.type === 'file') {
                const path = processPath(getFilePath(files, id));
                if (path) changedFiles[path] = file.content || '';
            }
        });
        if (activeFileId && !dirtyFileIds.includes(activeFileId)) {
            const file = findFile(files, activeFileId);
            if (file && file.type === 'file') {
                const path = processPath(getFilePath(files, activeFileId));
                if (path) changedFiles[path] = file.content || activeContent;
            }
        }

        const res = await ClarityCompiler.updateWorkspace(sessionId, changedFiles, [], []);

        // Clear deletions if successful
        if (res.success) {
            setDeletedFilePaths([]);
        }
        return res;
    }, [files, sessionId, dirtyFileIds, activeFileId, activeContent, findFile, getFilePath]);
    const handleCompile = async () => {
        if (!isTerminalVisible) setIsTerminalVisible(true);
        addTerminalLine({ type: 'command', content: `Syncing workspace and running clarinet check...` });

        setOutputLines([
            `> Executing: clarinet check (Workspace Sync)`,
            `> Using Clarinet CLI version 3.4.0`,
            `> Analyzing project for syntax and logic errors...`
        ]);

        setProblems([]);
        setCompilationResult(undefined);

        try {
            let result: CompilationResult;

            // Force immediate sync of any pending history updates before compile
            const currentFilesToSync = getLatestFiles();

            // Always perform Full Sync for maximum reliability
            result = await runFullSync(true, currentFilesToSync);
            setFirstRunWorkspaces(prev => ({ ...prev, [activeWorkspace]: true }));

            // Extract functions for usage tracking
            const activeFile = activeFileId ? findFile(files, activeFileId) : null;
            const functionMatches = activeFile?.content?.matchAll(/\(define-(public|read-only|private)\s+([a-zA-Z0-9-]+)/g) || [];
            const functions = Array.from(functionMatches).map(m => m[2]);

            // Telemetry Ingest
            fetch('/ide-api/stats/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'COMPILATION',
                    wallet: wallet.address || 'unconnected',
                    payload: {
                        contractName: activeFile ? activeFile.name : 'unknown',
                        network: settings.network,
                        status: result.success ? 'success' : 'failure',
                        metadata: {
                            errors: result.errors?.length || 0,
                            functions: functions
                        }
                    }
                })
            }).catch(err => console.error('Telemetry failed:', err));

            setCompilationResult(result);


            // clear dirty
            setDirtyFileIds([]);

            if (result.success) {
                addTerminalLine({ type: 'success', content: 'Clarinet Check successful!' });

                const logLines = result.output ? result.output.split('\n') : ['Analysis completed.'];
                setOutputLines(prev => [
                    ...prev,
                    `> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                    ...logLines.map((l: string) => `  ${l}`),
                    `> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                    `> ✨ Contract is valid according to Clarinet.`
                ]);

                if (result.metadata?.entryPoints && result.metadata.entryPoints.length > 0) {
                    setOutputLines(prev => [...prev, `> 🔧 Functions found: ${result.metadata.entryPoints.map(ep => ep.name).join(', ')}`]);
                }
            } else {
                addTerminalLine({ type: 'error', content: 'Clarinet Check failed. See Output and Problems for details.' });

                const logLines = result.output ? result.output.split('\n') : ['Analysis failed.'];
                setOutputLines(prev => [
                    ...prev,
                    `Error: Clarinet Check failed.`,
                    `> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                    ...logLines.map((l: string) => `  ${l}`),
                    `> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                ]);

                if (result.errors) {
                    const fileProblems: Problem[] = result.errors.map((error, idx) => {
                        // Clarinet error format: path/to/file.clar:line:column: error: description
                        const match = error.match(/^(.*?):(\d+):(\d+): (?:error|syntax error|warning): (.*)$/i);
                        if (match) {
                            const filePath = match[1];
                            const fileName = filePath.split(/[/\\]/).pop() || filePath;
                            return {
                                id: `${Date.now()}-${idx}`,
                                file: fileName,
                                description: match[4],
                                line: parseInt(match[2], 10),
                                column: parseInt(match[3], 10),
                                severity: error.toLowerCase().includes('warning') ? 'warning' : 'error'
                            };
                        }
                        return {
                            id: `${Date.now()}-${idx}`,
                            file: activeFileId ? findFile(files, activeFileId)?.name || 'unknown' : 'unknown',
                            description: error,
                            line: 1,
                            column: 1,
                            severity: 'error'
                        };
                    });
                    setProblems(fileProblems);
                }


            }
        } catch (error: any) {
            addTerminalLine({ type: 'error', content: `Check error: ${error.message}` });
            setOutputLines(prev => [...prev, `Error: ${error.message}`]);

            // Attempt to parse catch error as well
            const catchMatch = error.message.match(/^(.*?):(\d+):(\d+): (?:error|syntax error|warning): (.*)$/i);
            if (catchMatch) {
                const filePath = catchMatch[1];
                const fileName = filePath.split(/[/\\]/).pop() || filePath;
                setProblems([{
                    id: Date.now().toString(),
                    file: fileName,
                    description: catchMatch[4],
                    line: parseInt(catchMatch[2], 10),
                    column: parseInt(catchMatch[3], 10),
                    severity: 'error'
                }]);
            } else {
                setProblems([{
                    id: Date.now().toString(),
                    file: activeFileId ? findFile(files, activeFileId)?.name || 'unknown' : 'unknown',
                    description: error.message,
                    line: 1,
                    column: 1,
                    severity: 'error'
                }]);
            }
        }

    };

    const handleFullSync = async () => {
        if (!isTerminalVisible) setIsTerminalVisible(true);
        const isSaving = (dirtyFileIds.length > 0 || !!firstRunWorkspaces[activeWorkspace]);


        addTerminalLine({ type: 'command', content: isSaving ? `Saving Changes...` : `Performing Full Sync...` });

        try {
            const currentFilesToSync = getLatestFiles();
            const result = await runFullSync(false, currentFilesToSync);

            if (result.success || result.errors) {
                addTerminalLine({ type: 'success', content: isSaving ? 'Changes saved!' : 'Full Sync successful!' });
                setFirstRunWorkspaces(prev => ({ ...prev, [activeWorkspace]: true }));
                // Clear dirty file IDs since we've synced everything
                setDirtyFileIds([]);
            }
        } catch (error: any) {
            addTerminalLine({ type: 'error', content: isSaving ? `Save error: ${error.message}` : `Sync error: ${error.message}` });
        }
    };

    const handleSyncWorkspace = useCallback(async () => {
        addTerminalLineToInstance(activeTerminalId, { type: 'info', content: 'Syncing workspace from server...' });

        try {
            // Save current open file paths and active file path before sync
            const oldOpenFilePaths = openFileIds
                .map(id => ({ id, path: getFilePath(files, id) }))
                .filter(item => item.path !== null) as { id: string, path: string }[];

            const activeFilePath = activeFileId ? getFilePath(files, activeFileId) : null;

            const serverFiles = await ClarityCompiler.getWorkspaceFiles(sessionId);
            if (Object.keys(serverFiles).length === 0) {
                addTerminalLineToInstance(activeTerminalId, { type: 'info', content: 'No files found in server workspace.' });
                return;
            }

            const newFileNodes = filesToFileNodes(serverFiles, activeWorkspace);

            setWorkspaces(prev => ({ ...prev, [activeWorkspace]: newFileNodes }));
            addToHistory(newFileNodes);
            addTerminalLineToInstance(activeTerminalId, { type: 'success', content: 'Workspace synced successfully!' });
            syncNodesToWebContainer(newFileNodes);

            // Restore open files using new IDs matching the old paths
            const newOpenFileIds: string[] = [];
            oldOpenFilePaths.forEach(item => {
                const newNode = findFileByPath(newFileNodes, item.path);
                if (newNode) {
                    newOpenFileIds.push(newNode.id);
                }
            });

            setOpenFileIds(newOpenFileIds);

            // Restore active file
            if (activeFilePath) {
                const newActiveNode = findFileByPath(newFileNodes, activeFilePath);
                if (newActiveNode) {
                    setActiveFileId(newActiveNode.id);
                } else {
                    // Active file no longer exists, try to pick first open file or null
                    setActiveFileId(newOpenFileIds.length > 0 ? newOpenFileIds[0] : null);
                }
            }

        } catch (error: any) {
            console.error('[Sync] Error:', error);
            let errorMessage = `Sync failed: ${error.message}`;

            if (error.message.includes('404')) {
                errorMessage = 'Sync failed: Server workspace not found. Please click "Check/Compile" button first to initialize the server environment.';
            }

            addTerminalLineToInstance(activeTerminalId, { type: 'error', content: errorMessage });
        }
    }, [activeTerminalId, activeFileId, openFileIds, files, activeWorkspace, sessionId, addTerminalLineToInstance, getFilePath, syncNodesToWebContainer]);





    const handleSyncWorkspaceRef = useRef(handleSyncWorkspace);
    const addTerminalLineToInstanceRef = useRef(addTerminalLineToInstance);

    useEffect(() => {
        handleSyncWorkspaceRef.current = handleSyncWorkspace;
    }, [handleSyncWorkspace]);

    useEffect(() => {
        addTerminalLineToInstanceRef.current = addTerminalLineToInstance;
    }, [addTerminalLineToInstance]);

    // Initialize Socket.io
    useEffect(() => {
        const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
        const socket = io(socketUrl, {
            transports: ['websocket', 'polling']
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Socket] Connected to backend');
            // Room joining is handled by another useEffect
            // that tracks terminal IDs and connection status
        });

        socket.on('terminal:output', ({ data, terminalId }: { data: string, terminalId: string }) => {
            const lines = data.split('\n');
            lines.forEach(content => {
                if (content || data.includes('\n')) {
                    addTerminalLineToInstanceRef.current(terminalId, { type: 'info', content });
                }
            });
        });

        socket.on('terminal:error', ({ message, terminalId }: { message: string, terminalId: string }) => {
            addTerminalLineToInstanceRef.current(terminalId, { type: 'error', content: `Terminal Error: ${message}` });
            setTerminals(prev => prev.map(t => t.id === terminalId ? { ...t, isProcessRunning: false } : t));
        });

        socket.on('terminal:exit', ({ code, terminalId }: { code: number, terminalId: string }) => {
            addTerminalLineToInstanceRef.current(terminalId, { type: 'info', content: `Process exited with code ${code}` });
            setTerminals(prev => prev.map(t => t.id === terminalId ? { ...t, isProcessRunning: false } : t));
            handleSyncWorkspaceRef.current();
        });

        return () => {
            socket.disconnect();
        };
    }, [sessionId]); // Stable! Only reconnect if sessionId changes.

    // Join terminal rooms for persistent output routing
    useEffect(() => {
        if (socketRef.current) {
            terminals.forEach(t => {
                socketRef.current?.emit('terminal:join', { sessionId, terminalId: t.id });
            });
        }
    }, [terminals.length, sessionId]); // Join on new terminals or session change



    const handleTerminalCommand = async (command: string) => {
        if (!socketRef.current) return;

        const cmdLower = command.toLowerCase().trim();

        addTerminalLineToInstance(activeTerminalId, {
            type: 'command',
            content: command,
            prompt: activeTerminal.isProcessRunning ? '➜ ' : '➜ ~'
        });

        if (cmdLower === 'clear') {
            setTerminals(prev => prev.map(t => t.id === activeTerminalId ? { ...t, lines: [] } : t));
            return;
        }

        // Intercept docker-dependent commands
        const dockerCommands = [
            'clarinet integrate',
            'clarinet devnet start',
            'clarinet deployment apply --devnet'
        ];

        if (dockerCommands.some(dc => cmdLower.startsWith(dc))) {
            addTerminalLineToInstance(activeTerminalId, {
                type: 'error',
                content: 'Docker is not currently available'
            });
            return;
        }

        if (activeTerminal.isProcessRunning) {
            socketRef.current.emit('terminal:input', { input: command + '\n', sessionId, terminalId: activeTerminalId });
            return;
        }

        if (!command.startsWith('clarinet')) {
            addTerminalLineToInstance(activeTerminalId, { type: 'error', content: 'Only clarinet commands are allowed in this terminal.' });
            return;
        }

        setTerminals(prev => prev.map(t => t.id === activeTerminalId ? { ...t, isProcessRunning: true, title: command.split(' ')[1] || 'clarinet' } : t));
        socketRef.current.emit('terminal:start', { command, sessionId, terminalId: activeTerminalId });
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
        addTerminalLine({ type: 'success', content: `Committed: ${message}` });
    };

    const handleDiscardFile = (id: string) => {
        setGitState(prev => ({
            ...prev,
            modifiedFiles: prev.modifiedFiles.filter(f => f !== id),
            stagedFiles: prev.stagedFiles.filter(f => f !== id)
        }));
        addTerminalLine({ type: 'info', content: `Discarded changes in ${id}` });
    };

    const handleSwitchBranch = (branchName: string) => {
        setGitState(prev => ({ ...prev, branch: branchName }));
        addTerminalLine({ type: 'info', content: `Switched to branch: ${branchName}` });
    };

    const handleCreateBranch = (branchName: string) => {
        setGitState(prev => ({ ...prev, branch: branchName }));
        addTerminalLine({ type: 'success', content: `Created and switched to branch: ${branchName}` });
    };

    const handlePush = () => {
        addTerminalLine({ type: 'info', content: `Pushing to origin/${gitState.branch}...` });
        setTimeout(() => {
            addTerminalLine({ type: 'success', content: 'Push successful.' });
        }, 1500);
    };

    const handleDeployView = () => {
        setActiveView(ActivityView.DEPLOY);
        if (!isLeftSidebarVisible) toggleLeftSidebar();
    };

    const handleWalletConnect = (newWallet: WalletConnection) => {
        setWallet(newWallet);
        addTerminalLine({ type: 'success', content: `Wallet connected sucessfully` });

        // Auto-sync global network settings with wallet network
        if (newWallet.network && settings.network !== newWallet.network) {
            handleUpdateSettings('network', newWallet.network);
            addTerminalLine({ type: 'info', content: `IDE network synchronized to ${newWallet.network}` });
        }
    };

    const handleWalletDisconnect = () => {
        setWallet({ type: 'none', connected: false });
        addTerminalLine({ type: 'info', content: 'Wallet disconnected' });
    };

    const handleDeploySuccess = (contract: DeployedContract) => {
        const enrichedContract = { ...contract, activityType: 'deploy' as const };
        setDeployedContracts(prev => [enrichedContract, ...prev]);
        // Convert deployHash to hex string if it's a Uint8Array
        const deployHashStr = typeof contract.deployHash === 'string'
            ? contract.deployHash
            : Array.from(contract.deployHash as any).map((b: number) => b.toString(16).padStart(2, '0')).join('');

        addTerminalLine({ type: 'success', content: `Contract deployed: ${deployHashStr}` });

        // Show notification
        setNotification({
            deployHash: contract.deployHash,
            network: contract.network,
            contractName: contract.name
        });

        // Trigger confetti animation
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#F97316', '#FB923C', '#FFF7ED', '#22C55E']
        });
    };


    const handleContractClick = (contract: DeployedContract) => {
        const tabId = `@contract-${contract.id}`;
        if (!openSpecialIds.includes(tabId)) {
            setOpenSpecialIds(prev => [...prev, tabId]);
        }
        setActiveSpecialId(tabId);
        setActiveTabGroup('special');
    };

    const handleTemplateSelect = (templateNodes: FileNode[], templateName?: string, type?: string) => {
        handleLoadTemplate(templateNodes, templateName, type);
        handleTabClose('@new-project');
    };

    const handleLoadTemplate = (templateNodes: FileNode[], templateName: string = 'unknown', type: string = 'clarity') => {
        // Replace current files with template
        setHistory([templateNodes]);
        setHistoryIndex(0);
        setOpenFileIds([]);
        setActiveFileId(null);
        setActiveTabGroup('file');
        setActiveSpecialId(null);
        addTerminalLine({ type: 'info', content: `Template [${templateName}] loaded successfully` });
        syncNodesToWebContainer(templateNodes);

        // Check for Clarinet.toml or project type
        const hasClarinet = templateNodes.some(node => node.name.toLowerCase() === 'clarinet.toml');
        if (!hasClarinet || type !== 'clarity') {
            handleEnsureNodeTerminal();
        }

        // Auto-sync template to backend ONLY if it is a Clarity project
        if (type === 'clarity') {
            runFullSync(true, templateNodes);
        } else {
            addTerminalLine({ type: 'info', content: `Auto-sync skipped for project type: ${type}` });
        }

        // Update workspaces for persistence
        setWorkspaces(prev => ({
            ...prev,
            [activeWorkspace]: templateNodes
        }));

        // Telemetry Ingest
        fetch('/ide-api/stats/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventType: 'TEMPLATE_LOAD',
                wallet: wallet.address || 'unconnected',
                payload: {
                    templateName: templateName,
                }
            })
        }).catch(err => console.error('Telemetry failed:', err));
    };

    const handleInteracted = (contractName: string, entryPoint: string, network: string, metadata: any = {}) => {
        // Log to activity history
        handleAddActivity({
            name: `${contractName}::${entryPoint}`,
            contractHash: metadata.contractId || '',
            deployHash: metadata.txId || '',
            network: network,
            activityType: 'call'
        });

        // Telemetry Ingest
        fetch('/ide-api/stats/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventType: 'CONTRACT_CALL',
                wallet: wallet.address || 'unconnected',
                payload: {
                    contractName,
                    entryPoint,
                    network,
                    metadata
                }
            })
        }).catch(err => console.error('Telemetry failed:', err));
    };

    const handleAddActivity = useCallback((activity: Partial<DeployedContract> & { name: string, activityType: 'deploy' | 'call' | 'query' }) => {
        const newActivity: DeployedContract = {
            id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: Date.now(),
            network: settings.network,
            contractHash: activity.contractHash || '',
            deployHash: activity.deployHash || '',
            ...activity
        };
        setDeployedContracts(prev => [newActivity, ...prev]);
    }, [settings.network]);


    const handleOpenStats = () => {
        if (!openSpecialIds.includes('@stats')) {
            setOpenSpecialIds(prev => [...prev, '@stats']);
        }
        setActiveSpecialId('@stats');
        setActiveTabGroup('special');
    };


    // --- Tab Management ---

    const handleFileOpen = (fileId: string, line?: number, column?: number, highlight?: string) => {
        if (!openFileIds.includes(fileId)) {
            setOpenFileIds([...openFileIds, fileId]);
        }
        setActiveFileId(fileId);
        setActiveTabGroup('file');

        if (line) {
            // Slight delay so Monaco mounts the new file before we jump
            setTimeout(() => {
                setEditorAction({ type: 'gotoLine', timestamp: Date.now(), line, column: column || 1 });
            }, 80);
        }

        if (highlight) {
            setSearchFindQuery(highlight);
        }
    };

    const handleTabClose = (id: string) => {
        if (id.startsWith('@')) {
            const filtered = openSpecialIds.filter(sid => sid !== id);
            setOpenSpecialIds(filtered);
            if (activeSpecialId === id) {
                if (filtered.length > 0) {
                    setActiveSpecialId(filtered[filtered.length - 1]);
                } else {
                    setActiveSpecialId(null);
                    if (openFileIds.length > 0) {
                        setActiveTabGroup('file');
                    } else {
                        setActiveTabGroup('file');
                    }
                }
            }
        } else {
            const filtered = openFileIds.filter(fid => fid !== id);
            setOpenFileIds(filtered);
            if (activeFileId === id) {
                if (filtered.length > 0) {
                    setActiveFileId(filtered[filtered.length - 1]);
                } else {
                    setActiveFileId(null);
                    if (openSpecialIds.length > 0) {
                        setActiveTabGroup('special');
                    } else {
                        setActiveTabGroup('file');
                    }
                }
            }
        }
    };

    const handleCloseOthers = (id: string) => {
        if (id.startsWith('@')) {
            setOpenSpecialIds([id]);
            setActiveSpecialId(id);
            setActiveTabGroup('special');
        } else {
            setOpenFileIds([id]);
            setActiveFileId(id);
            setActiveTabGroup('file');
        }
    };

    const handleCloseAll = () => {
        setOpenFileIds([]);
        setOpenSpecialIds([]);
        setActiveFileId(null);
        setActiveSpecialId(null);
        setActiveTabGroup('file');
    };

    // --- File System Operations ---

    const handleCreateNode = (parentId: string, type: 'file' | 'folder', name: string, initialContent?: string) => {
        // Support path-based creation (e.g. "contracts/utils/helper.clar")
        // When the AI suggests [CREATE_FILE: folder/subfolder/file.clar], we auto-create intermediate folders.
        if (type === 'file' && (name.includes('/') || name.includes('\\'))) {
            const parts = name.replace(/\\/g, '/').split('/');
            const fileName = parts.pop()!;
            const folderParts = parts;

            const ensureFolders = (nodes: FileNode[], pathParts: string[]): { nodes: FileNode[], parentId: string } => {
                if (pathParts.length === 0) return { nodes, parentId: 'root' };

                const folderName = pathParts[0];
                const remaining = pathParts.slice(1);
                const existing = nodes.find(n => n.name === folderName && n.type === 'folder');

                if (existing) {
                    const result = ensureFolders(existing.children || [], remaining);
                    return {
                        nodes: nodes.map(n => n.id === existing.id ? { ...n, children: result.nodes, isOpen: true } : n),
                        parentId: result.parentId === 'root' ? existing.id : result.parentId
                    };
                } else {
                    const newFolderId = `${folderName}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                    const result = ensureFolders([], remaining);
                    const newFolder: FileNode = {
                        id: newFolderId, name: folderName, type: 'folder',
                        children: result.nodes, isOpen: true
                    };
                    return {
                        nodes: [...nodes, newFolder],
                        parentId: result.parentId === 'root' ? newFolderId : result.parentId
                    };
                }
            };

            const newFileId = `${fileName}-${Date.now()}`;
            const ext = fileName.split('.').pop()?.toLowerCase() || 'plaintext';
            const lang = getLanguageFromExtension(ext);
            const newFile: FileNode = {
                id: newFileId, name: fileName, type: 'file',
                language: lang, content: initialContent ?? ''
            };

            setHistory(prevHistory => {
                const currentFiles = prevHistory[historyIndex];
                const { nodes: updatedTree, parentId: targetFolderId } = ensureFolders(currentFiles, folderParts);

                // Add file into the target folder
                const insertFile = (nodes: FileNode[]): FileNode[] => {
                    if (targetFolderId === 'root') return [...nodes, newFile];
                    return nodes.map(n => {
                        if (n.id === targetFolderId) return { ...n, children: [...(n.children || []), newFile] };
                        if (n.children) return { ...n, children: insertFile(n.children) };
                        return n;
                    });
                };
                const finalFiles = insertFile(updatedTree);

                setWorkspaces(prev => ({ ...prev, [activeWorkspace]: finalFiles }));
                const newHist = prevHistory.slice(0, historyIndex + 1);
                newHist.push(finalFiles);
                return newHist;
            });

            setHistoryIndex(prev => prev + 1);
            handleFileOpen(newFileId);
            setGitState(prev => ({ ...prev, modifiedFiles: [...prev.modifiedFiles, newFileId] }));
            return;
        }

        const newId = `${name}-${Date.now()}`;
        const extension = name.split('.').pop()?.toLowerCase() || 'plaintext';
        const language = getLanguageFromExtension(extension);

        const newNode: FileNode = {
            id: newId,
            name: name,
            type: type,
            language: type === 'file' ? language : undefined,
            content: type === 'file' ? (initialContent ?? '') : undefined,
            children: type === 'folder' ? [] : undefined,
            isOpen: type === 'folder' ? true : undefined
        };

        // Use functional update to ensure we use the most recent history state
        setHistory(prevHistory => {
            const currentFiles = prevHistory[historyIndex];
            let newFiles: FileNode[];

            if (parentId === 'root') {
                newFiles = [...currentFiles, newNode];
            } else {
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
                newFiles = addNodeRecursive(currentFiles);
            }

            // Sync with workspaces dictionary as well
            setWorkspaces(prevWorkspaces => ({
                ...prevWorkspaces,
                [activeWorkspace]: newFiles
            }));

            const newHistory = prevHistory.slice(0, historyIndex + 1);
            newHistory.push(newFiles);

            // Note: historyIndex will be updated in setHistoryIndex below
            return newHistory;
        });

        setHistoryIndex(prevIndex => prevIndex + 1);

        if (type === 'file') {
            handleFileOpen(newId);
            setGitState(prev => ({ ...prev, modifiedFiles: [...prev.modifiedFiles, newId] }));
        }
    };

    const handleCollapseAll = () => {
        const collapseRecursive = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
                if (node.type === 'folder') {
                    return {
                        ...node,
                        isOpen: false,
                        children: node.children ? collapseRecursive(node.children) : []
                    };
                }
                return node;
            });
        };
        const newFiles = collapseRecursive(files);
        addToHistory(newFiles);
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
        // --- ADD THIS BLOCK TO FIX PERSISTENCE ---
        setWorkspaces(prev => ({
            ...prev,
            [activeWorkspace]: newFiles
        }));
        // -----------------------------------------
        // Auto-sync renamed state
        runFullSync(true, newFiles);
    };

    const handleDeleteNode = (id: string) => {
        // 1. Find the node to delete to identify all children
        const nodeToDelete = findFile(files, id);
        if (!nodeToDelete) return;

        // Track path for delta sync deletion
        const pathToDelete = getFilePath(files, id);
        if (pathToDelete) {
            setDeletedFilePaths(prev => prev.includes(pathToDelete) ? prev : [...prev, pathToDelete]);
        }

        // 2. Get all IDs being deleted (including children)
        const idsToDelete = getSubtreeIds(nodeToDelete);

        // 3. Close relevant tabs
        setOpenFileIds(prev => prev.filter(fileId => !idsToDelete.includes(fileId)));

        // 4. Update active file if it was deleted
        if (activeFileId && idsToDelete.includes(activeFileId)) {
            setActiveFileId(null);
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

        // --- ADD THIS BLOCK TO FIX PERSISTENCE ---
        setWorkspaces(prev => ({
            ...prev,
            [activeWorkspace]: newFiles
        }));
        // -----------------------------------------

        addToHistory(newFiles);

        // Update Git
        setGitState(prev => ({
            ...prev,
            modifiedFiles: prev.modifiedFiles.filter(f => f !== id),
            stagedFiles: prev.stagedFiles.filter(f => f !== id)
        }));

        // Auto-sync deleted state
        runFullSync(true, newFiles);
    };


    const handleMoveNode = (nodeId: string, targetParentId: string) => {
        if (nodeId === targetParentId) return;

        const nodeToMove = findFile(files, nodeId);
        if (!nodeToMove) return;

        // Prevent moving a folder into its own descendant
        if (nodeToMove.type === 'folder') {
            const subtreeIds = getSubtreeIds(nodeToMove);
            if (subtreeIds.includes(targetParentId)) {
                addTerminalLine({ type: 'error', content: "Cannot move a folder into its own subfolder." });
                return;
            }
        }

        // 1. Remove from current position
        const removeRecursive = (nodes: FileNode[]): FileNode[] => {
            return nodes
                .filter(node => node.id !== nodeId)
                .map(node => ({
                    ...node,
                    children: node.children ? removeRecursive(node.children) : undefined
                }));
        };

        // 2. Add to new position
        const addRecursive = (nodes: FileNode[]): FileNode[] => {
            if (targetParentId === 'root') {
                return [...nodes, nodeToMove];
            }
            return nodes.map(node => {
                if (node.id === targetParentId && node.type === 'folder') {
                    return {
                        ...node,
                        children: [...(node.children || []), nodeToMove],
                        isOpen: true
                    };
                }
                if (node.children) {
                    return { ...node, children: addRecursive(node.children) };
                }
                return node;
            });
        };

        const intermediateFiles = removeRecursive(files);
        const newFiles = addRecursive(intermediateFiles);

        addToHistory(newFiles);
        addTerminalLine({ type: 'info', content: `Moved ${nodeToMove.name} to ${targetParentId === 'root' ? 'root' : findFile(files, targetParentId)?.name}` });
        // --- ADD THIS BLOCK TO FIX PERSISTENCE ---
        setWorkspaces(prev => ({
            ...prev,
            [activeWorkspace]: newFiles
        }));
        // -----------------------------------------
        // Auto-sync moved state
        runFullSync(true, newFiles);
    };

    const handleExternalDrop = async (fileList: FileList, targetParentId: string = 'root') => {
        const importedFileNames: string[] = [];
        const newNodes: FileNode[] = [];

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const content = await file.text();

            const newNodeId = `${file.name}-${Date.now()}-${Math.random()}`;
            const extension = file.name.split('.').pop()?.toLowerCase() || '';
            const language = getLanguageFromExtension(extension);

            const newNode: FileNode = {
                id: newNodeId,
                name: file.name,
                type: 'file',
                content,
                language,
            };

            newNodes.push(newNode);
            importedFileNames.push(file.name);

            // Track git state for each new file
            setGitState(prev => ({ ...prev, modifiedFiles: [...prev.modifiedFiles, newNodeId] }));
        }

        if (newNodes.length === 0) return;

        const addNodesRecursive = (nodes: FileNode[]): FileNode[] => {
            if (targetParentId === 'root') {
                return [...nodes, ...newNodes];
            }
            return nodes.map(node => {
                if (node.id === targetParentId && node.type === 'folder') {
                    return { ...node, children: [...(node.children || []), ...newNodes], isOpen: true };
                }
                if (node.children) {
                    return { ...node, children: addNodesRecursive(node.children) };
                }
                return node;
            });
        };

        const newFiles = addNodesRecursive(files);
        addToHistory(newFiles);

        addTerminalLine({ type: 'success', content: `Imported ${importedFileNames.length} file(s): ${importedFileNames.join(', ')}` });
        // --- ADD THIS BLOCK TO FIX PERSISTENCE ---
        setWorkspaces(prev => ({
            ...prev,
            [activeWorkspace]: newFiles
        }));
        // -----------------------------------------
        // Auto-sync imported files
        runFullSync(true, newFiles);

        // Open the first imported file
        if (newNodes.length > 0) {
            handleFileOpen(newNodes[0].id);
        }
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
            setOpenFileIds([]);
            setActiveFileId(null);
            addTerminalLine({ type: 'success', content: `Cloned repository: ${repoName}` });
            syncNodesToWebContainer(fileNodes);
            // --- ADD THIS BLOCK TO FIX PERSISTENCE ---
            setWorkspaces(prev => ({
                ...prev,
                [activeWorkspace]: fileNodes
            }));
            // -----------------------------------------
            // Auto-sync cloned repo to backend
            runFullSync(true, fileNodes);
        }
    };

    const handleDiscoveryImport = async (type: DiscoveryImportType, value: string, network: StacksNetworkType = 'mainnet', selectedContracts?: string[]) => {
        addTerminalLine({ type: 'command', content: `Importing from ${type.toUpperCase()} on ${network.toUpperCase()}: ${value}` });
        setDiscoveryProgress(5);

        try {
            let filesToAdd: Record<string, string> = { ...{} };
            const baseUrl = network === 'mainnet' ? 'https://api.mainnet.hiro.so' : 'https://api.testnet.hiro.so';

            // Helper to fetch source by contract ID
            const fetchSource = async (contractId: string): Promise<{ name: string, source: string } | null> => {
                const [addr, name] = contractId.split('.');
                if (!addr || !name) return null;
                const resp = await fetch(`${baseUrl}/v2/contracts/source/${addr}/${name}`);
                if (resp.ok) {
                    const data = await resp.json();
                    return { name, source: data.source };
                }
                return null;
            };

            switch (type) {
                case 'txid': {
                    addTerminalLine({ type: 'info', content: `Fetching transaction data from ${network} Hiro API...` });
                    const resp = await fetch(`${baseUrl}/extended/v1/tx/${value}`);
                    setDiscoveryProgress(30);
                    if (!resp.ok) throw new Error(`Hiro API error: ${resp.status} ${resp.statusText}`);
                    const tx = await resp.json();

                    let contractId = '';
                    if (tx.tx_type === 'smart_contract') {
                        contractId = tx.smart_contract.contract_id;
                    } else if (tx.tx_type === 'contract_call') {
                        contractId = tx.contract_call.contract_id;
                    }

                    if (contractId) {
                        setDiscoveryProgress(60);
                        addTerminalLine({ type: 'info', content: `Transaction involves contract ${contractId}. Fetching source...` });
                        const res = await fetchSource(contractId);
                        setDiscoveryProgress(90);
                        if (res) {
                            filesToAdd[`${res.name}.clar`] = res.source;
                        } else {
                            throw new Error(`Failed to fetch source for ${contractId}`);
                        }
                    } else {
                        throw new Error(`This transaction type (${tx.tx_type}) does not contain a direct contract reference.`);
                    }
                    break;
                }
                case 'contract_id': {
                    setDiscoveryProgress(40);
                    const res = await fetchSource(value);
                    setDiscoveryProgress(90);
                    if (!res) throw new Error(`Contract not found on ${network}`);
                    filesToAdd[`${res.name}.clar`] = res.source;
                    break;
                }
                case 'wallet': {
                    let contractArray: string[] = [];

                    if (selectedContracts && selectedContracts.length > 0) {
                        contractArray = selectedContracts;
                    } else {
                        addTerminalLine({ type: 'info', content: `Searching for contracts associated with ${value} on ${network}...` });
                        const resp = await fetch(`${baseUrl}/extended/v1/address/${value}/transactions?limit=50`);
                        setDiscoveryProgress(20);
                        if (!resp.ok) throw new Error(`Hiro API error: ${resp.statusText}`);
                        const data = await resp.json();

                        const contractIds = new Set<string>();
                        (data.results || []).forEach((tx: any) => {
                            if (tx.tx_type === 'smart_contract') contractIds.add(tx.smart_contract.contract_id);
                            if (tx.tx_type === 'contract_call') contractIds.add(tx.contract_call.contract_id);
                        });

                        if (contractIds.size === 0) throw new Error('No contract activity found for this address.');
                        contractArray = Array.from(contractIds);
                    }

                    setDiscoveryProgress(30);
                    addTerminalLine({ type: 'info', content: `Importing ${contractArray.length} unique contracts...` });

                    // Fetch sources with small delay to avoid rate limiting
                    for (let i = 0; i < contractArray.length; i++) {
                        const cId = contractArray[i];
                        const res = await fetchSource(cId);
                        if (res && res.source) {
                            filesToAdd[`${res.name}.clar`] = res.source;
                            addTerminalLine({ type: 'info', content: `(${i + 1}/${contractArray.length}) Imported ${cId}` });
                        }
                        const progress = 30 + ((i + 1) / contractArray.length) * 65;
                        setDiscoveryProgress(progress);
                        // Minor delay if many contracts
                        if (contractArray.length > 5) await new Promise(r => setTimeout(r, 100));
                    }
                    break;
                }
                case 'ipfs': {
                    addTerminalLine({ type: 'info', content: `Fetching from IPFS gateway...` });
                    setDiscoveryProgress(30);
                    const resp = await fetch(`https://ipfs.io/ipfs/${value}`);
                    setDiscoveryProgress(80);
                    if (!resp.ok) throw new Error(`IPFS gateway error: ${resp.statusText}`);
                    const text = await resp.text();
                    filesToAdd[`ipfs-${value.substring(0, 6)}.clar`] = text;
                    setDiscoveryProgress(95);
                    break;
                }
                case 'https': {
                    addTerminalLine({ type: 'info', content: `Fetching from ${value}...` });
                    setDiscoveryProgress(30);
                    const resp = await fetch(value);
                    setDiscoveryProgress(80);
                    if (!resp.ok) throw new Error(`HTTP error: ${resp.statusText}`);
                    const text = await resp.text();
                    const fileName = value.split('/').pop()?.split('?')[0] || `downloaded-${Date.now()}.txt`;
                    filesToAdd[fileName] = text;
                    setDiscoveryProgress(95);
                    break;
                }
            }

            if (Object.keys(filesToAdd).length > 0) {
                setDiscoveryProgress(100);
                // Add files to current workspace
                const newFiles = [...files];
                for (const [path, content] of Object.entries(filesToAdd)) {
                    if (!content) continue; // Skip empty files
                    const newNode: FileNode = {
                        id: `import-${Date.now()}-${Math.random()}`,
                        name: path,
                        type: 'file',
                        content,
                        language: getLanguageFromExtension(path.split('.').pop() || '')
                    };
                    newFiles.push(newNode);
                }
                addToHistory(newFiles);
                addTerminalLine({ type: 'success', content: `Successfully imported ${Object.keys(filesToAdd).length} file(s) from ${type}` });
                // --- ADD THIS BLOCK TO FIX PERSISTENCE ---
                setWorkspaces(prev => ({
                    ...prev,
                    [activeWorkspace]: newFiles
                }));
                // -----------------------------------------
                // Trigger workspace sync
                runFullSync(true, newFiles);
            } else {
                addTerminalLine({ type: 'info', content: 'No files were imported.' });
            }
        } catch (err: any) {
            const errorMsg = err.message || err.msg || (typeof err === 'string' ? err : 'Unknown error');
            if (err.type !== 'cancelation') {
                addTerminalLine({ type: 'error', content: `Import failed: ${errorMsg}` });
            }
            // If it's a cancellation, we don't necessarily want to spam the terminal or re-throw as uncaught
            if (err.type === 'cancelation') {
                console.log('[Discovery] Operation cancelled.');
            } else {
                throw err;
            }
        } finally {
            setTimeout(() => setDiscoveryProgress(0), 1000);
        }
    };

    const handleGitHubGistCreated = (url: string) => {
        addTerminalLine({ type: 'success', content: `Gist created: ${url}` });
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
        if (!openSpecialIds.includes('@home')) {
            setOpenSpecialIds(['@home', ...openSpecialIds]);
        }
        setActiveSpecialId('@home');
        setActiveTabGroup('special');
    };

    const handleOpenPreview = () => {
        if (!activeFileId) return;
        const file = findFile(files, activeFileId);
        if (!file) return;
        const isMd = file.name.endsWith('.md') || file.name.endsWith('.mdx') || file.name.endsWith('.markdown');
        const isClar = file.name.endsWith('.clar') || file.name.endsWith('.clarity');
        if (!isMd && !isClar) return;
        const tabId = isMd ? `@md-${activeFileId}` : `@abi-${activeFileId}`;
        if (!openSpecialIds.includes(tabId)) {
            setOpenSpecialIds(prev => [...prev, tabId]);
        }
        setActiveSpecialId(tabId);
        setActiveTabGroup('special');
    };

    const handleOpenChangelog = () => {
        if (!openSpecialIds.includes('@changelog')) {
            setOpenSpecialIds(['@changelog', ...openSpecialIds]);
        }
        setActiveSpecialId('@changelog');
        setActiveTabGroup('special');
    };

    const handleOpenStxerDebugger = (txId?: string) => {
        const url = txId
            ? `https://stxer.xyz/tx/testnet/${txId}/debugger?trace=&filter=all`
            : `https://stxer.xyz/`;
        window.open(url, '_blank');
    };

    const handleOpenAccountSettings = () => {
        if (!openSpecialIds.includes('@account')) {
            setOpenSpecialIds(prev => [...prev, '@account']);
        }
        setActiveSpecialId('@account');
        setActiveTabGroup('special');
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

    const isClarityFile = (() => {
        if (!activeFileId || activeFileId === '@home') return false;
        if (activeFileId.startsWith('@abi-') || activeFileId.startsWith('@md-')) return false;
        const f = findFile(files, activeFileId);
        if (!f) return false;
        return f.name.endsWith('.clar') || f.name.endsWith('.clarity');
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
                onDeleteWorkspace={handleDeleteWorkspace}
                onClearAllWorkspaces={handleClearAllWorkspaces}
                onCloneWorkspace={handleCloneWorkspace}
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
                onSync={handleSyncWorkspace}
                hasClarinet={hasClarinet}
                aiStats={aiStats}
                onOpenAccountSettings={handleOpenAccountSettings}
            />

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden">
                <ActivityBar
                    activeView={activeView}
                    setActiveView={setActiveView}
                    isSidebarVisible={isLeftSidebarVisible}
                    onToggleSidebar={toggleLeftSidebar}
                    onOpenHome={handleOpenHome}
                    onOpenAccountSettings={handleOpenAccountSettings}
                    onOpenStats={handleOpenStats}
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
                            hasClarinet={hasClarinet}
                            onWalletConnect={handleWalletConnect}
                            onWalletDisconnect={handleWalletDisconnect}
                            compilationResult={compilationResult}
                            onDeploySuccess={handleDeploySuccess}
                            onLoadTemplate={handleLoadTemplate}
                            onInteracted={handleInteracted}
                            onCreateBlank={handleCreateWorkspace}
                            onImport={handleImportWorkspace}
                            onDiscoveryImport={handleDiscoveryImport}
                            discoveryProgress={discoveryProgress}
                            theme={theme}
                            onAddTerminalLine={addTerminalLine}
                            onOpenNewProject={handleOpenNewProject}
                            sessionId={sessionId}
                            onUpdateFiles={addToHistory}
                            onCollapseAll={handleCollapseAll}
                            onMoveNode={handleMoveNode}
                            onExternalDrop={handleExternalDrop}
                            onContractClick={handleContractClick}
                            onOpenSimnetScratchpad={handleOpenSimnetScratchpad}
                            activeSimnetAccount={activeSimnetAccount}
                            onSimnetAccountChange={setActiveSimnetAccount}
                            deployedContracts={deployedContracts}
                            setDeployedContracts={setDeployedContracts}
                            onGoToInteract={handleGoToInteract}
                            onOpenContractCall={handleOpenContractCall}
                            prefilledContractInfo={prefilledContractInfo}
                            setPrefilledContractInfo={setPrefilledContractInfo}
                            onStartTour={handleStartTour}
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
                    <div className="flex flex-col flex-shrink-0">
                        {!isTerminalMaximized && openSpecialIds.length > 0 && (
                            <EditorTabs
                                files={files}
                                openFileIds={openSpecialIds}
                                activeFileId={activeTabGroup === 'special' ? activeSpecialId : null}
                                onSelect={(id) => {
                                    setActiveSpecialId(id);
                                    setActiveTabGroup('special');
                                }}
                                onClose={handleTabClose}
                                onCloseOthers={handleCloseOthers}
                                onCloseAll={handleCloseAll}
                                onReorder={setOpenSpecialIds}
                                modifiedFileIds={[]}
                                dirtyFileIds={[]}
                                settings={settings}
                                onUpdateSettings={handleUpdateSettings}
                            />
                        )}
                        {!isTerminalMaximized && (
                            <EditorTabs
                                files={files}
                                openFileIds={openFileIds}
                                activeFileId={activeTabGroup === 'file' ? activeFileId : null}
                                onSelect={(id) => {
                                    setActiveFileId(id);
                                    setActiveTabGroup('file');
                                }}
                                onClose={handleTabClose}
                                onCloseOthers={handleCloseOthers}
                                onCloseAll={handleCloseAll}
                                onReorder={setOpenFileIds}
                                modifiedFileIds={gitState.modifiedFiles}
                                dirtyFileIds={dirtyFileIds}
                                settings={settings}
                                onUpdateSettings={handleUpdateSettings}
                            />
                        )}
                    </div>

                    {activeTabGroup === 'file' && activeFileId && (
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
                                    id="preview-button"
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
                                {hasClarinet && (
                                    <>
                                        <Button
                                            id="check-button"
                                            variant="primary"
                                            size="sm"
                                            onClick={handleCompile}
                                            disabled={!isClarityFile}
                                            className="rounded-full flex gap-2 items-center !py-1 shadow-none active:shadow-none translate-x-[0px] translate-y-[0px] active:translate-x-[0px] active:translate-y-[0px] disabled:opacity-40 disabled:cursor-not-allowed"
                                            title={isClarityFile ? "Run Clarinet Check (F5)" : "Open a .clar file to compile"}
                                        >
                                            <PlayIcon className="w-3 h-3" />
                                            <span>Compile</span>
                                        </Button>

                                        <Button
                                            id="sync-button"
                                            variant="primary"
                                            size="sm"
                                            onClick={handleFullSync}
                                            className="rounded-full flex gap-2 items-center !py-1 shadow-none active:shadow-none translate-x-[0px] translate-y-[0px] active:translate-x-[0px] active:translate-y-[0px]"
                                            title="Perform Full Sync for maximum reliability"
                                        >
                                            {(dirtyFileIds.length > 0 || !!firstRunWorkspaces[activeWorkspace]) ? <SaveIcon className="w-3 h-3" /> : <RefreshIcon className="w-3 h-3" />}
                                            <span>{(dirtyFileIds.length > 0 || !!firstRunWorkspaces[activeWorkspace]) ? "Save" : "Sync"}</span>
                                        </Button>
                                    </>)}
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
                            </div>

                        </div>
                    )
                    }
                    {/* Monaco Editor or Special Tab — all always mounted, toggled via display */}

                    <div className="flex-1 relative min-h-0">
                        {/* Special Tab layer */}
                        <div
                            style={{ display: activeTabGroup === 'special' ? 'block' : 'none' }}
                            className="absolute inset-0 overflow-auto"
                        >
                            <SpecialTab
                                activeSpecialId={activeSpecialId}
                                files={files}
                                theme={theme}
                                wallet={wallet}
                                deployedContracts={deployedContracts}
                                changelogContent={CHANGELOG_CONTENT}
                                onCreateFile={() => handleCreateNode('root', 'file', `contract-${Date.now()}.clar`)}
                                onCreateFolder={() => {
                                    const name = window.prompt("Enter folder name:", "new-folder");
                                    if (name) handleCreateNode('root', 'folder', name);
                                }}
                                onCreateWorkspace={handleCreateWorkspace}
                                onImportWorkspace={handleImportWorkspace}
                                onSelectWalkthrough={(id) => {
                                    addTerminalLine({ type: 'info', content: `Starting walkthrough: ${id}` });
                                }}
                                onClone={() => {
                                    const modal = document.getElementById('public-clone-modal');
                                    if (modal) modal.style.display = 'flex';
                                }}
                                findFile={findFile}
                                onSelectView={setActiveView}
                                onSelectWorkspace={handleSwitchWorkspace}
                                workspaceMetadata={workspaceMetadata}
                                workspaceNames={Object.keys(workspaces)}
                                onLoadTemplate={handleTemplateSelect}
                                onCloseTab={handleTabClose}
                                onOpenStats={handleOpenStats}
                                onQuotaReached={setIsAiQuotaReached}
                                onConnectWallet={handleConnectWallet}
                                activeSimnetAccount={activeSimnetAccount}
                                onSimnetAccountChange={setActiveSimnetAccount}
                                onTemplateProgress={setTemplateProgress}
                                onAddTerminalLine={addTerminalLine}
                                onOpenStxerDebugger={handleOpenStxerDebugger}
                                onDiscoveryImport={handleDiscoveryImport}
                                onAddActivity={handleAddActivity}
                                settings={settings}
                            />

                        </div>

                        {/* Code Editor layer — always mounted so Monaco stays alive */}
                        <div
                            style={{ display: (activeTabGroup === 'file' && activeFileId) ? 'block' : 'none' }}
                            className="absolute inset-0"
                        >
                            <CodeEditor
                                code={activeContent}
                                language={activeLanguage}
                                onChange={handleEditorChange}
                                settings={settings}
                                theme={theme}
                                action={editorAction}
                                onSave={handleSaveFile}
                                onActionComplete={handleClearEditorAction}
                                findQuery={searchFindQuery}
                                lineEnding={lineEnding}
                                onCursorChange={handleCursorChange}
                                activeFileId={activeFileId}
                                onFileDrop={(files) => handleExternalDrop(files, 'root')}
                                onRunNodeCommand={handleRunNodeCommand}
                            />
                        </div>

                        {/* Empty State layer */}
                        <div
                            style={{ display: (activeTabGroup === 'file' && !activeFileId) ? 'flex' : 'none' }}
                            className="absolute inset-0 items-center justify-center"
                        >
                            <EmptyState
                                onCreateFile={() => handleCreateNode('root', 'file', `contract-${Date.now()}.clar`)}
                                onOpenProject={handleOpenNewProject}
                                onToggleSearch={() => {
                                    const input = document.getElementById('editor-search-input');
                                    if (input) input.focus();
                                }}
                                onToggleCommandPalette={() => {
                                    // Could trigger a command palette if implemented
                                }}
                                theme={theme}
                            />
                        </div>
                    </div>


                    {!isTerminalMaximized && (activeTabGroup === 'file' && activeFileId) && (
                        <div className="bg-caspier-black flex">
                            <button
                                className='flex gap-2 text-sm items-center px-3 py-1 bg-blue-600/80 text-white hover:bg-blue-800 border-t-2 border-t-transparent'
                                onClick={handleExplainCode}>
                                <MessageSquareIcon className="w-3.5 h-3.5" />
                                Explain Code with AI
                            </button>

                            <button
                                className='flex gap-2 text-sm items-center px-3 py-1  bg-yellow-600/80 text-white hover:bg-yellow-800 border-t-2 border-t-transparent'
                                onClick={handleAnalyseCode}>
                                <AnalyseIcon className="w-3.5 h-3.5" />
                                Analyse Code with AI
                            </button>
                            <button
                                className='flex gap-2 text-sm items-center px-3 py-1 bg-red-600/80 text-white hover:bg-red-800 border-t-2 border-t-transparent'
                                onClick={handleDebugCode}>
                                <BugIcon className="w-3.5 h-3.5" />
                                Debug Code with AI
                            </button>
                        </div>
                    )}
                    {isTerminalVisible && (
                        <>
                            {/* Terminal Resizer */}
                            <div
                                className="h-1 bg-caspier-dark hover:bg-labstx-orange cursor-row-resize z-10 transition-colors delay-150"
                                onMouseDown={startTerminalResizing}
                            />
                            <TerminalPanel
                                terminals={terminals}
                                activeTerminalId={activeTerminalId}
                                onAddTerminal={handleAddTerminal}
                                onRemoveTerminal={handleRemoveTerminal}
                                onSwitchTerminal={setActiveTerminalId}
                                outputLines={outputLines}
                                problems={problems}
                                height={isTerminalMaximized ? window.innerHeight * 0.5 : terminalHeight}
                                theme={theme}
                                onClearTerminal={handleClearTerminal}
                                onCommand={handleTerminalCommand}
                                onLocateProblem={handleLocateProblem}
                                onOpenStxerDebugger={handleOpenStxerDebugger}
                                onAskAI={handleAskAIFix}
                                isMaximized={isTerminalMaximized}
                                onMaximize={toggleTerminalMaximize}
                                onKillProcess={handleKillProcess}
                                pendingCommand={pendingNodeCommand}
                                onClearPendingCommand={() => setPendingNodeCommand(null)}
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
                            ref={sidebarRightRef}
                            currentCode={activeContent}
                            files={files}
                            activeFileName={activeFileId ? findFile(files, activeFileId)?.name : undefined}
                            width={rightWidth}
                            settings={settings}
                            onClose={() => setIsRightSidebarVisible(false)}
                            onUpdateFile={(fileId, content) => {
                                const file = findFile(files, fileId);
                                if (file) {
                                    handleUpdateFileContent(fileId, content);
                                }
                            }}
                            onCreateFile={(name, content) => handleCreateNode('root', 'file', name, content)}
                            theme={theme}
                            wallet={wallet}
                            isQuotaExceeded={isAiQuotaReached}
                            onOpenAccountSettings={handleOpenAccountSettings}
                            onInteraction={handleCheckAiQuota}
                            onConnectWallet={handleConnectWallet}
                        />
                    </>
                )}
            </div>

            {/* Status Bar */}
            <div id="status-bar" className=" bg-labstx-orange text-white flex justify-between items-center text-xs font-bold select-none ">

                {settings?.network === 'testnet' ? (
                    <button
                        onClick={(e) => {
                            setFaucetAnchorRect(e.currentTarget.getBoundingClientRect());
                            setIsFaucetOpen(true);
                        }}
                        className="bg-green-500 text-caspier-black px-2 py-0.5 font-bold shadow-sm flex items-center gap-1 hover:bg-green-600 transition-colors active:scale-95"
                    >
                        <svg style={{ width: '15px', height: 'auto' }} width="10" height="11" viewBox="0 0 8 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M2.55905 3.64548L2.55877 3.64536L2.56192 3.63986C2.57785 3.61208 2.57713 3.57435 2.55558 3.54137C2.55556 3.54134 2.55553 3.54131 2.55551 3.54128L1.13958 1.40584L1.13956 1.40585L1.13878 1.4046C1.08893 1.3257 1.0816 1.22654 1.12806 1.14305C1.17433 1.05552 1.26129 1.00894 1.35202 1.00894H1.90321C1.98538 1.00894 2.06506 1.05068 2.11521 1.1244L2.11571 1.12514L3.76929 3.62764L3.76943 3.62786C3.79889 3.67282 3.84522 3.69696 3.90022 3.69696H4.10798C4.1605 3.69696 4.20843 3.67052 4.23941 3.62688L5.88328 1.12195C5.93083 1.04431 6.01706 1.00462 6.09651 1.00462H6.6477C6.73867 1.00462 6.83105 1.05593 6.87291 1.14544C6.91822 1.23329 6.90558 1.33081 6.86163 1.4035L6.86168 1.40353L6.86018 1.40579L5.44404 3.54585L5.44407 3.54587L5.44268 3.54782C5.42357 3.57456 5.42137 3.61121 5.4378 3.63986L5.43889 3.64184C5.45731 3.67666 5.48585 3.69264 5.51988 3.69264H7.68649C7.83138 3.69264 7.93971 3.81089 7.93971 3.94915V4.41514C7.93971 4.55971 7.82517 4.67165 7.68649 4.67165H0.313233C0.168346 4.67165 0.060009 4.5534 0.060009 4.41514V3.94915C0.060009 3.81553 0.15774 3.71064 0.282871 3.69328H7.68649"
                                fill={theme === 'dark' ? 'black' : 'white'}
                            />
                            <path
                                d="M5.88758 9.46319L4.29882 7.0588L2.10737 9.47262L2.05161 9.43609L2.10723 9.47284L2.10736 9.47265C2.0611 9.54324 1.98501 9.58473 1.89897 9.58473H1.34778C1.25388 9.58473 1.1682 9.531 1.12337 9.44546C1.07712 9.35721 1.08964 9.25897 1.13385 9.18586L1.13381 9.18583L1.1353 9.18357L2.55144 7.0435L2.55141 7.04348L2.5528 7.04153C2.57142 7.01548 2.57497 6.98224 2.55659 6.94752L2.55649 6.94758L2.55481 6.94387C2.54122 6.91391 2.51566 6.89671 2.4756 6.89671H0.313233C0.168346 6.89671 0.060009 6.77847 0.060009 6.6402V6.17422C0.060009 6.02964 0.174548 5.91771 0.313233 5.91771H0.330193H7.68649C7.83138 5.91771 7.93971 6.03595 7.93971 6.17422V6.6402C7.93971 6.78478 7.82517 6.89671 7.68649 6.89671H5.52836C5.49709 6.89671 5.46674 6.91448 5.44685 6.94851C5.42953 6.98198 5.43177 7.01608 5.45263 7.04798C5.45265 7.04801 5.45267 7.04804 5.45269 7.04808L6.86421 9.18325C6.91612 9.25989 6.92185 9.36448 6.87543 9.44716C6.83038 9.52739 6.74522 9.58042 6.65194 9.58042H6.10075C6.02134 9.58042 5.93514 9.54077 5.88758 9.46319Z"
                                fill={theme === 'dark' ? 'black' : 'white'}
                            />
                        </svg>

                        Get Testnet Airdrop
                    </button>
                ) : (<div className="flex" />)}

                <div className="flex items-center justify-center gap-4">

                    {templateProgress !== null && (
                        <div className="flex items-center gap-2 mr-2 px-2 py-0.5 rounded-sm  border-white/20 animate-in fade-in slide-in-from-right-4 duration-300">
                            <span className="text-[9px] uppercase tracking-tighter animate-pulse">Template Loading</span>
                            <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden border border-white/10">
                                <div
                                    className="h-full bg-white transition-all duration-300 ease-out shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                                    style={{ width: `${templateProgress}%` }}
                                />
                            </div>
                            <span className="text-[9px] font-black min-w-[24px]">{templateProgress}%</span>
                        </div>
                    )}
                    <a
                        href="https://docs.google.com/forms/d/e/1FAIpQLSegIYqoTgB6U9s-cQDsx_Csf2b8Jfa3JJ8jz8EcrJg1oGssIg/viewform"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline cursor-pointer flex items-center gap-1 text-black border border-white/30 px-2 py-0.5  bg-green-500 hover:bg-green-600 transition-all mr-2"
                    >
                        ✨ Join Early Access
                    </a>
                    <div className="flex gap-4">
                        <span className=' hidden'>{gitState.branch}*</span>
                        <span>{problems.length === 0 ? 'No problems' : `${problems.length} problems`}</span>
                    </div>
                    {wallet.connected && wallet.type !== 'none' && (
                        <span className="bg-yellow-500 text-black px-2 py-0.5  font-bold shadow-sm flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></span>
                            Connected to
                            {wallet.type === 'xverse' ?
                                <p className='flex gap-1 items-center'>  <img src="/xverse.png" alt="Xverse" className="h-4 w-4 mr-1" />Xverse</p>
                                : wallet.type === 'leather' ? <p className='flex gap-1 items-center'>  <img src="/leather.svg" alt="Leather" className="h-4 w-4 mr-1" />Leather</p> : <p className='flex gap-1 items-center'>  <img src="/leather.svg" alt="Leather" className="h-4 w-4 mr-1" />Simnet</p>}
                        </span>
                    )}
                    <span>Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}</span>
                    <select
                        value={lineEnding}
                        onChange={(e) => setLineEnding(e.target.value as 'LF' | 'CRLF')}
                        className={` hidden border-none outline-none cursor-pointer hover:underline font-bold  `}
                    >
                        <option value="LF" className={theme === 'light' ? 'text-white' : 'text-black'}>LF</option>
                        <option value="CRLF" className={theme === 'light' ? 'text-white' : 'text-black'}>CRLF</option>
                    </select>

                    <input type="hidden" name="lineEnding" value={lineEnding} />

                    {/* 2. The Trigger Button displaying the currently selected value */}
                    <button
                        type="button"
                        onClick={() => dialogRef.current?.showModal()}
                        className="border-none outline-none cursor-pointer hover:underline font-bold bg-transparent"
                    >
                        {lineEnding}
                    </button>

                    {/* 3. The Dialog - 'm-auto' is crucial here to force Tailwind to center it */}
                    <dialog
                        ref={dialogRef}
                        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
                        className="m-auto rounded-lg p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm shadow-2xl border border-caspier-border"
                    >
                        <div className={`flex flex-col min-w-[80vh] ${theme === 'light' ? ' text-black' : 'bg-caspier-black text-white'}`}>

                            <div className="px-4 py-3 border-b border-gray-200/10 opacity-70">
                                <h3 className="text-sm font-semibold m-0">Select End of Line Sequence</h3>
                            </div>

                            <div className="p-2 flex flex-col gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleSelect('LF')}
                                    className={`text-left px-4 py-2 rounded text-sm transition-colors flex justify-between items-center ${lineEnding === 'LF'
                                        ? 'bg-blue-500 text-white'
                                        : 'hover:bg-gray-500/20'
                                        }`}
                                >
                                    <span>LF</span>
                                    <span className="opacity-50 text-xs">Clarity Standard</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleSelect('CRLF')}
                                    className={`text-left px-4 py-2 rounded text-sm transition-colors flex justify-between items-center ${lineEnding === 'CRLF'
                                        ? 'bg-blue-500 text-white'
                                        : 'hover:bg-gray-500/20'
                                        }`}
                                >
                                    <span>CRLF</span>

                                </button>
                            </div>

                        </div>
                    </dialog>
                    <span>{activeLanguage.toUpperCase()}</span>

                    <span className='mr-2'>LabSTX v1.2.1</span>
                </div>
            </div>

            {/* Product Tour */}
            <Joyride
                key={activeTourId}
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

            {/* Intro Loading Page */}
            {(loading || !isStateLoaded) && (
                <IntroLoading
                    theme={theme}
                    onComplete={() => {
                        if (isStateLoaded) {
                            setLoading(false);
                        } else {
                            // If state isn't loaded yet, we'll check again in a short interval
                            const checkInterval = setInterval(() => {
                                if (isStateLoaded) {
                                    setLoading(false);
                                    clearInterval(checkInterval);
                                }
                            }, 100);
                        }
                    }}
                />
            )}

            <FaucetPopover
                isOpen={isFaucetOpen}
                onClose={() => setIsFaucetOpen(false)}
                anchorRect={faucetAnchorRect}
                connectedAddress={wallet?.address}
            />
        </div>
    );
}

export default App;
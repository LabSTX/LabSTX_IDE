import React from 'react';

// Activity Views for the Sidebar
export enum ActivityView {
    EXPLORER = 'EXPLORER',
    SEARCH = 'SEARCH',
    DEPLOY = 'DEPLOY',
    CALL_CONTRACT = 'CALL',
    LEARN_STACKS = 'LEARN_STACKS',
    ACTIVITY_HISTORY = 'ACTIVITY_HISTORY',
    LEARAN_STX = 'LEARN_STX',
    LEARN_STX = 'LEARN_STX',
    SETTINGS = 'SETTINGS',
    STATISTICS = 'STATISTICS',
    SIMNET = 'SIMNET',
    UNIT_TEST = 'UNIT_TEST',
    HELP_WALKTHROUGH = 'HELP_WALKTHROUGH'
}

// File and Folder Structure
export interface FileNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    content?: string;
    language?: string;
    children?: FileNode[];
    isOpen?: boolean;
}

// Terminal Output
export interface TerminalLine {
    id: string;
    type: 'info' | 'success' | 'error' | 'command' | 'warning' | 'input' | 'query' | 'result';
    content: string;
    timestamp?: number;
    data?: any;
}

export interface TerminalInstance {
    id: string;
    title: string;
    lines: TerminalLine[];
    isProcessRunning: boolean;
}

// Project and IDE Settings
export interface ProjectSettings {
    fontSize: number;
    wordWrap: 'on' | 'off';
    minimap: boolean;
    tabSize: number;
    autoCompile: boolean;
    enableOptimization: boolean;
    network: 'testnet' | 'mainnet' | 'mocknet' | 'simnet';
    clarityVersion: string;
    aiProvider: string;
    aiModel: string;
    aiApiKey: string;
    openRouterKeySource: string;
    aiCustomContext?: string;
    theme?: 'dark' | 'light';
    activeSimnetAccount?: string;
}

// Git Integration
export interface GitCommit {
    id: string;
    message: string;
    date: number;
    hash: string;
    branch: string;
    parents: string[];
}

export interface GitState {
    modifiedFiles: string[];
    stagedFiles: string[];
    commits: GitCommit[];
    branch: string;
}

// Linter / Compiler Problems
export interface Problem {
    id: string;
    file: string;
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    description?: string;
}

// Wallet Connection Status
export interface WalletConnection {
    type: 'none' | 'leather' | 'xverse';
    connected: boolean;
    address?: string;
    publicKey?: string;
    network?: 'testnet' | 'mainnet' | 'mocknet' | 'simnet';
    addresses?: {
        mainnet: string;
        testnet: string;
    };
}

// AI Assistant Chat
export interface ChatMessage {
    id: string;
    role: 'user' | 'model' | 'system';
    text: string;
    timestamp: number;
    mode?: 'ask' | 'edit';
}

// Clarity Contract Metadata & ABI
export interface EntryPointArg {
    name: string;
    type: any;
}

export interface EntryPoint {
    name: string;
    args: EntryPointArg[];
    access: 'Public' | 'ReadOnly' | 'Private' | 'Constant';
    ret: string;
}

export interface ContractMetadata {
    entryPoints: EntryPoint[];
    contractType: string;
    contractName?: string;
}

// Compilation Results
export interface CompilationResult {
    success: boolean;
    errors: string[];
    warnings?: string[];
    metadata?: ContractMetadata;
}

// Tracked Deployments
export interface DeployedContract {
    id: string;
    name: string;
    contractHash: string;
    deployHash: string;
    network: string;
    timestamp: number;
    activityType?: 'deploy' | 'call' | 'query';
    originalFileId?: string;
    entryPoints?: EntryPoint[];
}

// Export for consumption
export type { EntryPointArg as ContractArg };

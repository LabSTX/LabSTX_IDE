

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string; // Only for files
  language?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

export interface FileSystemState {
  root: FileNode[];
  activeFileId: string | null;
  expandedFolders: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum ActivityView {
  EXPLORER = 'EXPLORER',
  SEARCH = 'SEARCH',
  GIT = 'GIT',
  DEPLOY = 'DEPLOY',
  DEBUG = 'DEBUG',
  EXTENSIONS = 'EXTENSIONS',
  SETTINGS = 'SETTINGS'
}

export interface TerminalLine {
  id: string;
  type: 'info' | 'error' | 'success' | 'command' | 'query';
  content: string;
  data?: any;
}

export interface Problem {
  id: string;
  file: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  line: number;
  column: number;
}

export interface ProjectSettings {
  // Editor
  fontSize: number;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  tabSize: number;
  // Compiler
  // Stacks-specific
  network: 'testnet' | 'mainnet' | 'devnet' | 'mocknet';
  autoCompile: boolean;
  enableOptimization: boolean;
  clarityVersion: string;
  // AI Settings
  aiModel: string;
  aiApiKey: string;
}

export interface GitCommit {
  id: string;
  message: string;
  date: number;
  hash?: string;
  branch?: string;
  parents?: string[]; // IDs of parent commits
}

export interface GitState {
  modifiedFiles: string[];
  stagedFiles: string[];
  commits: GitCommit[];
  branch: string;
}

// Casper-specific types
export interface DeployedContract {
  id: string;
  name: string;
  contractHash: string;
  deployHash: string;
  network: string;
  timestamp: number;
  entryPoints?: EntryPoint[];
}

export interface EntryPoint {
  name: string;
  args: EntryPointArg[];
  access: 'Public' | 'Group';
  ret: string;
}

export interface EntryPointArg {
  name: string;
  type: string;
  value?: any;
}

export interface CompilationResult {
  success: boolean;
  wasm?: Uint8Array;
  wasmBase64?: string;
  errors?: string[];
  warnings?: string[];
  metadata?: ContractMetadata;
}

export interface ContractMetadata {
  entryPoints: EntryPoint[];
  contractType: string;
  contractPackage?: string;
}

export interface WalletConnection {
  type: 'hiro' | 'leather' | 'xverse' | 'casper-wallet' | 'none';
  publicKey?: string;
  address?: string;
  connected: boolean;
  network?: string;
}

export interface DeployConfig {
  paymentAmount: number;
  gasPrice: number;
  ttl?: number;
  chainName?: string;
  runtimeArgs?: Record<string, any>;
}

// Contract upgrade types
export interface ContractUpgrade {
  id: string;
  contractPackageHash: string;
  version: number;
  deployHash: string;
  timestamp: number;
  network: string;
  changes?: string;
}

export interface UpgradeConfig extends DeployConfig {
  contractPackageHash: string;
  version?: number;
}

export type DeployMode = 'fresh' | 'upgrade';
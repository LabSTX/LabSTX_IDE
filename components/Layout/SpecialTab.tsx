
import React from 'react';
import { FileNode, WalletConnection, DeployedContract, ActivityView, ProjectSettings, TerminalLine } from '../../types';
import HomeTab from '../UI/HomeTab';
import AbiPreviewTab from '../UI/AbiPreviewTab';
import MarkdownPreviewTab from '../UI/MarkdownPreviewTab';
import { ContractActivityDetailTab } from './ContractActivityDetailTab';
import AccountSettingsTab from '../UI/AccountSettingsTab';
import { NewProjectTab } from '../UI/NewProjectTab';
import { StatisticsView } from '../Stats/StatisticsView';
import SimnetTab from '../UI/SimnetTab';
import { ContractCallTab } from '../UI/ContractCallTab';


interface SpecialTabProps {
    activeSpecialId: string | null;
    files: FileNode[];
    theme: 'dark' | 'light';
    wallet: WalletConnection;
    deployedContracts: DeployedContract[];
    changelogContent: string;
    onLoadTemplate: (nodes: FileNode[], templateName?: string, type?: string) => void;
    onCloseTab: (id: string) => void;
    onSelectWalkthrough: (id: string) => void;
    onClone: () => void;
    onCreateWorkspace: () => void;
    onCreateFile: () => void;
    onCreateFolder: () => void;
    onImportWorkspace: () => void;
    findFile: (nodes: FileNode[], id: string) => FileNode | null;
    onSelectView: (view: ActivityView) => void;
    onSelectWorkspace: (name: string) => void;
    onOpenStats: () => void;
    workspaceMetadata: Record<string, { createdAt: number }>;
    workspaceNames: string[];
    onQuotaReached?: (reached: boolean) => void;
    onConnectWallet?: () => void;
    activeSimnetAccount?: string;
    onSimnetAccountChange?: (address: string) => void;
    onTemplateProgress?: (percent: number | null) => void;
    onAddTerminalLine?: (line: Omit<TerminalLine, 'id'>) => void;
    onOpenStxerDebugger?: (txId?: string) => void;
    onDiscoveryImport?: (type: any, value: string, network: any) => Promise<void>;
    onAddActivity?: (activity: any) => void;
    settings: ProjectSettings;
}

export const SpecialTab: React.FC<SpecialTabProps> = ({
    activeSpecialId,
    files,
    theme,
    wallet,
    deployedContracts,
    changelogContent,
    onLoadTemplate,
    onCloseTab,
    onSelectWalkthrough,
    onClone,
    onCreateWorkspace,
    onCreateFile,
    onCreateFolder,
    onImportWorkspace,
    findFile,
    onSelectView,
    onSelectWorkspace,
    onOpenStats,
    workspaceMetadata,
    workspaceNames,
    onQuotaReached,
    onConnectWallet,
    activeSimnetAccount,
    onSimnetAccountChange,
    onTemplateProgress,
    onAddTerminalLine,
    onOpenStxerDebugger,
    onDiscoveryImport,
    onAddActivity,
    settings
}) => {
    if (!activeSpecialId) return null;

    if (activeSpecialId === '@home') {
        return (
            <HomeTab
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onImportWorkspace={onImportWorkspace}
                onSelectWalkthrough={onSelectWalkthrough}
                onClone={onClone}
                onCreateWorkspace={onCreateWorkspace}
                theme={theme}
                onSelectView={onSelectView}
                onSelectWorkspace={onSelectWorkspace}
                onOpenStats={onOpenStats}
                workspaceMetadata={workspaceMetadata}

                workspaceNames={workspaceNames}
            />
        );
    }

    if (activeSpecialId.startsWith('@abi-')) {
        const srcFileId = activeSpecialId.replace(/^@abi-/, '');
        const srcFile = findFile(files, srcFileId);
        return (
            <AbiPreviewTab
                code={srcFile?.content || ''}
                fileName={srcFile?.name || 'contract.clar'}
                theme={theme}
            />
        );
    }

    if (activeSpecialId === '@changelog') {
        return (
            <MarkdownPreviewTab
                content={changelogContent}
                fileName="CHANGELOG.md"
                theme={theme}
            />
        );
    }

    if (activeSpecialId.startsWith('@md-')) {
        const srcFileId = activeSpecialId.replace(/^@md-/, '');
        const srcFile = findFile(files, srcFileId);
        return (
            <MarkdownPreviewTab
                content={srcFile?.content || ''}
                fileName={srcFile?.name || 'document.md'}
                theme={theme}
            />
        );
    }

    if (activeSpecialId.startsWith('@contract-')) {
        if (activeSpecialId.startsWith('@contract-call-')) {
            const contractHash = activeSpecialId.replace(/^@contract-call-/, '');
            return (
                <ContractCallTab
                    contractHash={contractHash}
                    theme={theme}
                    wallet={wallet}
                    activeSimnetAccount={activeSimnetAccount}
                    network={settings.network}
                    deployedContracts={deployedContracts}
                    onAddTerminalLine={onAddTerminalLine}
                    onOpenStxerDebugger={onOpenStxerDebugger}
                    onImport={onDiscoveryImport}
                    onAddActivity={onAddActivity}
                />
            );
        }
        const contractId = activeSpecialId.replace(/^@contract-/, '');
        const contract = (deployedContracts || []).find(c => c.id === contractId);
        if (!contract) return <div className="p-8 text-caspier-muted">Contract record not found.</div>;
        return (
            <ContractActivityDetailTab
                contract={contract}
                theme={theme}
            />
        );
    }



    if (activeSpecialId === '@account') {
        return (
            <AccountSettingsTab
                wallet={wallet}
                deployedContracts={deployedContracts}
                onQuotaReached={onQuotaReached}
                onConnectWallet={onConnectWallet}
            />
        );
    }

    if (activeSpecialId === '@new-project') {
        return (
            <NewProjectTab
                onLoadTemplate={onLoadTemplate}
                onCreateBlank={onCreateWorkspace}
                onImport={onImportWorkspace}
                onClose={() => onCloseTab('@new-project')}
                theme={theme}
                onProgress={onTemplateProgress}
            />
        );
    }

    if (activeSpecialId === '@stats') {
        return <StatisticsView />;
    }

    if (activeSpecialId === '@simnet') {
        return (
            <SimnetTab
                activeAccount={activeSimnetAccount || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'}
                onAccountChange={onSimnetAccountChange}
                theme={theme}
            />
        );
    }


    return null;
};

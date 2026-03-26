
import React from 'react';
import { FileNode, WalletConnection, DeployedContract, ActivityView } from '../../types';
import HomeTab from '../UI/HomeTab';
import AbiPreviewTab from '../UI/AbiPreviewTab';
import MarkdownPreviewTab from '../UI/MarkdownPreviewTab';
import { ContractActivityDetailTab } from './ContractActivityDetailTab';
import StxerDebuggerTab from '../UI/StxerDebuggerTab';
import AccountSettingsTab from '../UI/AccountSettingsTab';
import { NewProjectTab } from '../UI/NewProjectTab';

interface SpecialTabProps {
    activeSpecialId: string | null;
    files: FileNode[];
    theme: 'dark' | 'light';
    wallet: WalletConnection;
    deployedContracts: DeployedContract[];
    activeDebugTxId?: string;
    changelogContent: string;
    onLoadTemplate: (templateId: string) => void;
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
    workspaceMetadata: Record<string, { createdAt: number }>;
    workspaceNames: string[];
}

export const SpecialTab: React.FC<SpecialTabProps> = ({
    activeSpecialId,
    files,
    theme,
    wallet,
    deployedContracts,
    activeDebugTxId,
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
    workspaceMetadata,
    workspaceNames
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
                wallet={wallet}
                network={wallet.network as any || 'testnet'}
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
        const contractId = activeSpecialId.replace(/^@contract-/, '');
        const contract = deployedContracts.find(c => c.id === contractId);
        if (!contract) return <div className="p-8 text-caspier-muted">Contract record not found.</div>;
        return (
            <ContractActivityDetailTab
                contract={contract}
                theme={theme}
            />
        );
    }

    if (activeSpecialId === '@stxer-debugger') {
        return (
            <StxerDebuggerTab
                txId={activeDebugTxId}
                theme={theme}
            />
        );
    }

    if (activeSpecialId === '@account') {
        return (
            <AccountSettingsTab
                wallet={wallet}
                deployedContracts={deployedContracts}
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
            />
        );
    }

    return null;
};


import React, { useState } from 'react';
import { BugIcon, SunIcon, MoonIcon, LayoutSidebarLeftIcon, LayoutSidebarRightIcon, LayoutPanelBottomIcon } from '../UI/Icons';
import WorkspaceSelector from './WorkspaceSelector';
import { GitHubAuth } from '../GitHub/GitHubAuth';
import { PublicCloneModal } from '../GitHub/PublicCloneModal';
import { BugReportModal } from '../UI/BugReportModal';

interface HeaderProps {
  currentWorkspace: string;
  workspaces: string[];
  onSwitchWorkspace: (name: string) => void;
  onCreateWorkspace: () => void;
  onRenameWorkspace: () => void;
  onDownloadWorkspace: () => void;
  onImportWorkspace: () => void;
  onDeleteWorkspace?: () => void;
  onCloneWorkspace?: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  isLeftSidebarVisible: boolean;
  toggleLeftSidebar: () => void;
  isRightSidebarVisible: boolean;
  toggleRightSidebar: () => void;
  isTerminalVisible: boolean;
  toggleTerminal: () => void;
  onGitHubClone?: (files: Record<string, string>, repoName: string) => void;
  onGitHubGistCreated?: (url: string) => void;
  workspaceFiles?: Record<string, string>;
  onSync?: () => void;
  aiStats: { aiInteractions: number; aiQuotaLimit: number } | null;
  onOpenAccountSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentWorkspace,
  workspaces,
  onSwitchWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDownloadWorkspace,
  onImportWorkspace,
  onDeleteWorkspace,
  onCloneWorkspace,
  theme,
  toggleTheme,
  isLeftSidebarVisible,
  toggleLeftSidebar,
  isRightSidebarVisible,
  toggleRightSidebar,
  isTerminalVisible,
  toggleTerminal,
  onGitHubClone,
  onGitHubGistCreated,
  workspaceFiles,
  onSync,
  aiStats,
  onOpenAccountSettings
}) => {
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);

  const aiUsedPercent = aiStats ? Math.min(100, Math.round((aiStats.aiInteractions / aiStats.aiQuotaLimit) * 100)) : 0;

  return (
    <div className="h-12 bg-caspier-black border-b border-caspier-border flex items-center px-4 justify-between shrink-0 select-none">
      <div className="flex items-center gap-6">
        {/* Brand */}

        <div className="flex items-center font-black gap-x-2">
          {theme === 'dark' ? (
            <img
              src="/lab_stx_dark.png"
              alt="stacks"
              className="block object-contain w-[20px]"
            />
          ) : (
            <img
              src="/lab_stx.png"
              alt="stacks"
              className="block object-contain w-[30px]"
            />
          )}
          LabSTX

          <p className='text-blue-600'> IDE</p>
        </div>

        {/* Separator */}
        <div className="h-4 w-[1px] bg-caspier-border"></div>

        <WorkspaceSelector
          currentWorkspace={currentWorkspace}
          workspaces={workspaces}
          onSwitchWorkspace={onSwitchWorkspace}
          onCreateWorkspace={onCreateWorkspace}
          onRenameWorkspace={onRenameWorkspace}
          onDownloadWorkspace={onDownloadWorkspace}
          onImportWorkspace={onImportWorkspace}
          onDeleteWorkspace={onDeleteWorkspace}
          onCloneWorkspace={onCloneWorkspace}
          onSync={onSync}
        />
      </div>

      <div className="flex items-center gap-4">
        {/* AI Credits Display */}

        <div className="flex items-center gap-2">
          <div className='flex items-center gap-x-1.5 text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-2 py-1 text-[10px] font-black tracking-widest uppercase'>
            <div className="w-1 h-1 rounded-full bg-emerald-500" />
            BETA
          </div>
          <button
            onClick={() => setIsBugModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#9ca3af] hover:text-white bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded transition-all duration-200 group"
            title="Report a bug or share feedback"
          >
            <BugIcon className="w-3 h-3 text-red-500 group-hover:animate-pulse" />
            Report Bug
          </button>
        </div>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-3">
        {/* Layout Toggles */}
        <div id="layout-controls" className="flex items-center gap-1 border-r border-caspier-border pr-2">
          <button
            onClick={toggleLeftSidebar}
            className={`p-1.5 rounded hover:bg-caspier-hover transition-colors ${isLeftSidebarVisible ? 'text-caspier-text' : 'text-caspier-muted opacity-50'}`}
            title="Toggle Left Sidebar"
          >
            <LayoutSidebarLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTerminal}
            className={`p-1.5 rounded hover:bg-caspier-hover transition-colors ${isTerminalVisible ? 'text-caspier-text' : 'text-caspier-muted opacity-50'}`}
            title="Toggle Panel"
          >
            <LayoutPanelBottomIcon className="w-4 h-4" />
          </button>
          <button
            onClick={toggleRightSidebar}
            className={`p-1.5 rounded hover:bg-caspier-hover transition-colors ${isRightSidebarVisible ? 'text-caspier-text' : 'text-caspier-muted opacity-50'}`}
            title="Toggle Right Sidebar"
          >
            <LayoutSidebarRightIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 hover:bg-caspier-hover rounded-full text-caspier-text transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
        </button>
        {aiStats && (
          <div
            className="hidden lg:flex flex-col items-end gap-1  border-l px-4 border-r border-caspier-border cursor-pointer"
            onClick={onOpenAccountSettings}
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${aiUsedPercent > 80 ? 'bg-red-500' : 'bg-indigo-500'} animate-pulse`} />
                <span className="text-[9px] font-black text-caspier-muted uppercase tracking-tighter">AI Credits</span>
              </div>
              <span className="text-[10px] font-bold text-caspier-text font-mono">
                {aiStats.aiInteractions.toLocaleString()} / {aiStats.aiQuotaLimit.toLocaleString()}
              </span>
            </div>
            <div className="w-24 h-1 bg-caspier-black/50 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(99,102,241,0.4)] ${aiUsedPercent > 80 ? 'bg-red-500' : 'bg-indigo-600'}`}
                style={{ width: `${aiUsedPercent}%` }}
              />
            </div>
          </div>
        )}


      </div>

      <PublicCloneModal onClone={onGitHubClone || (() => { })} />
      <BugReportModal
        isOpen={isBugModalOpen}
        onClose={() => setIsBugModalOpen(false)}
        theme={theme}
      />
    </div >
  );
};

export default Header;

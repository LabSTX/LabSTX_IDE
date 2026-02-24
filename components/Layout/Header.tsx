
import React from 'react';
import { PlusIcon, GridIcon, SunIcon, MoonIcon, LayoutSidebarLeftIcon, LayoutSidebarRightIcon, LayoutPanelBottomIcon, DownloadIcon, EditIcon, UploadIcon, GithubIcon, BugIcon } from '../UI/Icons';
import { GitHubAuth } from '../GitHub/GitHubAuth';
import { PublicCloneModal } from '../GitHub/PublicCloneModal';

interface HeaderProps {
  currentWorkspace: string;
  workspaces: string[];
  onSwitchWorkspace: (name: string) => void;
  onCreateWorkspace: () => void;
  onRenameWorkspace: () => void;
  onDownloadWorkspace: () => void;
  onImportWorkspace: () => void;
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
}

const Header: React.FC<HeaderProps> = ({
  currentWorkspace,
  workspaces,
  onSwitchWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDownloadWorkspace,
  onImportWorkspace,
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
  workspaceFiles
}) => {
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

        {/* Workspace Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-caspier-dark border border-caspier-border px-3 py-1.5 rounded-sm hover:border-caspier-muted transition-colors relative group">
            <GridIcon className="w-4 h-4 text-caspier-red" />
            <span className="text-xs text-caspier-muted font-bold uppercase tracking-wide">Workspace:</span>
            <div className="relative">
              <select
                value={currentWorkspace}
                onChange={(e) => onSwitchWorkspace(e.target.value)}
                className="appearance-none bg-transparent text-sm text-caspier-text outline-none cursor-pointer pr-4 font-medium"
              >
                {workspaces.map(w => <option key={w} value={w} className="bg-caspier-black text-caspier-text">{w}</option>)}
              </select>
            </div>
            <button
              onClick={onRenameWorkspace}
              className="ml-1 p-0.5 text-caspier-muted hover:text-caspier-text opacity-0 group-hover:opacity-100 transition-opacity"
              title="Rename Workspace"
            >
              <EditIcon className="w-3 h-3" />
            </button>
          </div>

          {/* Add Workspace */}
          <button
            onClick={onCreateWorkspace}
            className="bg-caspier-dark border border-caspier-border text-caspier-muted hover:text-caspier-red hover:border-caspier-red transition-all p-1.5 rounded-sm active:translate-y-[1px]"
            title="Create New Workspace"
          >
            <PlusIcon className="w-4 h-4" />
          </button>

          {/* Import Workspace */}
          <button
            onClick={onImportWorkspace}
            className="bg-caspier-dark border border-caspier-border text-caspier-muted hover:text-caspier-red hover:border-caspier-red transition-all p-1.5 rounded-sm active:translate-y-[1px]"
            title="Import Workspace"
          >
            <UploadIcon className="w-4 h-4" />
          </button>

          {/* Download Workspace */}
          <button
            onClick={onDownloadWorkspace}
            className="bg-caspier-dark border border-caspier-border text-caspier-muted hover:text-caspier-red hover:border-caspier-red transition-all p-1.5 rounded-sm active:translate-y-[1px]"
            title="Download Workspace"
          >
            <DownloadIcon className="w-4 h-4" />
          </button>

          {/* Clone Repository */}
          <button
            onClick={() => {
              const modal = document.getElementById('public-clone-modal');
              if (modal) modal.style.display = 'flex';
            }}
            className="group relative bg-caspier-dark border border-caspier-border text-caspier-muted hover:text-labstx-orange hover:border-labstx-orange transition-all p-1.5 rounded-sm active:translate-y-[1px] ml-1 shadow-sm"
            title="Clone GitHub Repository"
          >
            <div className="absolute inset-0 bg-labstx-orange/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm" />
            <GithubIcon className="w-4 h-4 relative z-10" />
          </button>
        </div>
      </div>

      <p className='flex items-center gap-x-1 text-emerald-600 border border-emerald-600 rounded-full px-2 py-1 text-xs font-bold'><BugIcon className='w-4 h-4' /> BETA</p>
      {/* Right Side - Links/Placeholders */}
      <div className="flex items-center gap-4 text-xs text-caspier-muted font-medium">
        {/* Layout Toggles */}
        <div className="flex items-center gap-1 border-r border-caspier-border pr-4 mr-2">
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
        {/* theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 hover:bg-caspier-hover rounded-full text-caspier-text transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
        </button>

        {/* GitHub Auth */}
        <GitHubAuth
          onClone={onGitHubClone}
          onGistCreated={onGitHubGistCreated}
          workspaceFiles={workspaceFiles}
        />
      </div>

      <PublicCloneModal onClone={onGitHubClone || (() => { })} />
    </div>
  );
};

export default Header;

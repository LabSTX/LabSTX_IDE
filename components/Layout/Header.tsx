
import React, { useState, useEffect, useRef } from 'react';
import { BugIcon, SunIcon, MoonIcon, LayoutSidebarLeftIcon, LayoutSidebarRightIcon, LayoutPanelBottomIcon, BellIcon, WifiIcon, WifiOffIcon } from '../UI/Icons';
import WorkspaceSelector from './WorkspaceSelector';
import { GitHubAuth } from '../GitHub/GitHubAuth';
import { PublicCloneModal } from '../GitHub/PublicCloneModal';
import { BugReportModal } from '../UI/BugReportModal';
import NotificationPopover from '../UI/NotificationPopover';

interface HeaderProps {
  currentWorkspace: string;
  workspaces: string[];
  onSwitchWorkspace: (name: string) => void;
  onCreateWorkspace: () => void;
  onRenameWorkspace: () => void;
  onDownloadWorkspace: () => void;
  onImportWorkspace: () => void;
  onDeleteWorkspace?: () => void;
  onClearAllWorkspaces?: () => void;
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
  hasClarinet?: boolean;
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
  onClearAllWorkspaces,
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
  hasClarinet,
  aiStats,
  onOpenAccountSettings
}) => {
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'connected' | 'connecting' | 'offline'>(
    navigator.onLine ? 'connected' : 'offline'
  );
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsAnchorRect, setNotificationsAnchorRect] = useState<DOMRect | null>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Welcome to LabSTX',
      message: 'Start building your Clarity smart contracts today!',
      type: 'info' as const,
      timestamp: new Date(),
      read: false
    },
    {
      id: '2',
      title: 'Simnet Ready',
      message: 'Your local testing environment is initialized.',
      type: 'success' as const,
      timestamp: new Date(Date.now() - 3600000),
      read: true
    }
  ]);

  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus('connecting');
      setTimeout(() => setNetworkStatus('connected'), 2000);
    };
    const handleOffline = () => setNetworkStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const aiUsedPercent = aiStats ? Math.min(100, Math.round((aiStats.aiInteractions / aiStats.aiQuotaLimit) * 100)) : 0;

  return (
    <div className="h-12 bg-caspier-black border-b border-caspier-border flex items-center px-4 justify-between shrink-0 select-none">
      <div className="flex items-center gap-6">
        {/* Brand */}

        <div className="flex items-center font-black gap-x-2">
          {theme === 'dark' ? (
            <img
              src="/lab_stx.png"
              alt="stacks"
              width={28}
              height={28}
              className="block object-contain invert brightness-0 invert-[1]"
            />
          ) : (
            <img
              src="/lab_stx.png"
              alt="stacks"
              width={28}
              height={28}
              className="block object-contain "
            />
          )}
          LabSTX

          <p className='text-blue-600'> IDE</p>
        </div>

        {/* Separator */}
        <div className="h-4 w-[1px] bg-caspier-border"></div>
        {/* Network Status */}
        <div className="flex items-center gap-2 px-3 py-1">
          <div className={`relative flex items-center justify-center`}>
            {networkStatus === 'connected' && (
              <>
                <div className="absolute w-2 h-2 bg-emerald-500 rounded-full animate-ping opacity-40" />
                <div className="relative w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </>
            )}
            {networkStatus === 'connecting' && (
              <>
                <div className="absolute w-2 h-2 bg-amber-500 rounded-full animate-ping opacity-40" />
                <div className="relative w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              </>
            )}
            {networkStatus === 'offline' && (
              <div className="relative w-1.5 h-1.5 bg-red-500 rounded-full opacity-60" />
            )}
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${networkStatus === 'connected' ? 'text-emerald-500' :
            networkStatus === 'connecting' ? 'text-amber-500' : 'text-red-500'
            }`}>
            {networkStatus}
          </span>
        </div>


      </div>

      <div className="flex items-center gap-4">

        <WorkspaceSelector
          currentWorkspace={currentWorkspace}
          workspaces={workspaces}
          onSwitchWorkspace={onSwitchWorkspace}
          onCreateWorkspace={onCreateWorkspace}
          onRenameWorkspace={onRenameWorkspace}
          onDownloadWorkspace={onDownloadWorkspace}
          onImportWorkspace={onImportWorkspace}
          onDeleteWorkspace={onDeleteWorkspace}
          onClearAllWorkspaces={onClearAllWorkspaces}
          onCloneWorkspace={onCloneWorkspace}
          onSync={onSync}
          hasClarinet={hasClarinet}
        />
        <div className='hidden flex items-center gap-x-1.5 text-emerald-500 bg-emerald-500/5 border border-emerald-500/10  px-2 py-1 text-[10px] font-black tracking-widest uppercase'>
          <div className="w-1 h-1  bg-emerald-500" />
          BETA
        </div>
        <button
          onClick={() => setIsBugModalOpen(true)}
          className="hidden flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#9ca3af] hover:text-white bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20  transition-all duration-200 group"
          title="Report a bug or share feedback"
        >
          <BugIcon className="w-3 h-3 text-red-500 group-hover:animate-pulse" />
          Report Bug
        </button>
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

        {/* Notifications */}
        <div className="relative">
          <button
            ref={notificationsButtonRef}
            onClick={() => {
              setNotificationsAnchorRect(notificationsButtonRef.current?.getBoundingClientRect() || null);
              setIsNotificationsOpen(!isNotificationsOpen);
            }}
            className={`p-1.5 rounded-full hover:bg-caspier-hover transition-all relative group ${isNotificationsOpen ? 'bg-caspier-hover text-labstx-orange' : 'text-caspier-text'}`}
            title="Notifications"
          >
            <BellIcon className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-labstx-orange text-[8px] font-black text-white flex items-center justify-center rounded-full border-2 border-caspier-black group-hover:scale-110 transition-transform">
                {unreadCount}
              </span>
            )}
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
      <NotificationPopover
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        anchorRect={notificationsAnchorRect}
        notifications={notifications}
        onMarkAllRead={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
        onClearAll={() => setNotifications([])}
      />
    </div >
  );
};

export default Header;

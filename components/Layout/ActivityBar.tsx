import React, { useState, useRef } from 'react';
import { ActivityView } from '../../types';
import { FileIcon, SearchIcon, GitIcon, BugIcon, SettingsIcon, RocketIcon, HomeIcon, ActivityIcon, GlobeIcon, UserIcon, BarChartIcon, DatabaseIcon, CheckCircleIcon, BookOpenIcon } from '../UI/Icons';

import { useGitHubAuth } from '../../contexts/GitHubAuthContext';
import AccountPopover from '../UI/AccountPopover';
import { CircleQuestionMarkIcon, FunctionSquareIcon, TestTubeDiagonal } from 'lucide-react';

interface ActivityBarProps {
  activeView: ActivityView;
  setActiveView: (view: ActivityView) => void;
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
  onOpenHome?: () => void;
  onOpenAccountSettings?: () => void;
  onOpenStats?: () => void;
}


const ActivityBar: React.FC<ActivityBarProps> = ({ activeView, setActiveView, isSidebarVisible, onToggleSidebar, onOpenHome, onOpenAccountSettings, onOpenStats }) => {

  const { user, isAuthenticated } = useGitHubAuth();
  const [isAccountPopoverOpen, setIsAccountPopoverOpen] = useState(false);
  const [accountAnchorRect, setAccountAnchorRect] = useState<DOMRect | null>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);

  const items = [
    { view: ActivityView.EXPLORER, icon: FileIcon, label: 'Explorer' },
    { view: ActivityView.SEARCH, icon: SearchIcon, label: 'Search' },
    { view: ActivityView.DEPLOY, icon: RocketIcon, label: 'Deploy & Run' },
    { view: ActivityView.CALL_CONTRACT, icon: FunctionSquareIcon, label: 'Call Functions & Query States' },
    // { view: ActivityView.SIMNET, icon: DatabaseIcon, label: 'Simnet Simulation' },
    { view: ActivityView.UNIT_TEST, icon: TestTubeDiagonal, label: 'Clarity Unit Testing' },
    { view: ActivityView.ACTIVITY_HISTORY, icon: ActivityIcon, label: 'Activity History' },
    //{ view: ActivityView.LEARN_STX, icon: GlobeIcon, label: 'Learn STX' },
    { view: ActivityView.HELP_WALKTHROUGH, icon: CircleQuestionMarkIcon, label: 'Help & Walkthrough' },
  ];


  const handleItemClick = (view: ActivityView) => {
    if (view === ActivityView.STATISTICS) {
      if (onOpenStats) onOpenStats();
      return;
    }
    if (activeView === view) {
      onToggleSidebar();
    } else {
      setActiveView(view);
      if (!isSidebarVisible) {
        onToggleSidebar();
      }
    }
  };


  const handleAccountClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = accountButtonRef.current?.getBoundingClientRect();
    if (rect) {
      setAccountAnchorRect(rect);
    }
    setIsAccountPopoverOpen(!isAccountPopoverOpen);
  };

  return (
    <>
      <div className="w-12 bg-caspier-black border-r border-caspier-border flex flex-col items-center py-4 justify-between h-full z-20 flex-shrink-0">
        <div className="flex flex-col gap-6 w-full items-center pt-2">
          <button
            id="home-button"
            onClick={onOpenHome}
            className="p-2 w-full flex justify-center text-caspier-muted hover:text-labstx-orange transition-colors group"
            title="Home"
          >
            <HomeIcon className="w-6 h-6" />
          </button>

          <div className="w-6 h-[1px] bg-caspier-border mb-2" />

          {items.map((item) => (
            <button
              key={item.view}
              id={`view-${item.view.toLowerCase()}`}
              onClick={() => handleItemClick(item.view)}
              className={`p-2 w-full flex justify-center transition-colors relative group ${activeView === item.view && isSidebarVisible ? 'text-labstx-orange' : 'text-caspier-muted hover:text-caspier-text'
                }`}
              title={item.label}
            >
              {activeView === item.view && isSidebarVisible && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-labstx-orange" />
              )}
              <item.icon className="w-6 h-6" />
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 pb-2 w-full items-center">
          <button
            ref={accountButtonRef}
            id="view-account"
            className="p-2 text-caspier-muted hover:text-caspier-text cursor-pointer transition-colors"
            title="Account Analytics"
            onClick={handleAccountClick}
          >
            {isAuthenticated && user?.avatar_url ? (
              <img src={user.avatar_url} className="w-6 h-6 rounded-full border border-caspier-border group-hover:border-labstx-orange" alt={user.login} />
            ) : (
              <UserIcon className="w-6 h-6" />
            )}
          </button>
          <button
            id="view-settings"
            className="p-2 text-caspier-muted hover:text-caspier-text"
            onClick={() => setActiveView(ActivityView.SETTINGS)}
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      <AccountPopover
        isOpen={isAccountPopoverOpen}
        onClose={() => setIsAccountPopoverOpen(false)}
        anchorRect={accountAnchorRect}
        onSettings={onOpenAccountSettings}
      />
    </>
  );
};

export default ActivityBar;

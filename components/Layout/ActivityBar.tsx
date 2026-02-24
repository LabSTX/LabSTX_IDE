import React from 'react';
import { ActivityView } from '../../types';
import { FileIcon, SearchIcon, GitIcon, BugIcon, SettingsIcon, RocketIcon, HomeIcon } from '../UI/Icons';

interface ActivityBarProps {
  activeView: ActivityView;
  setActiveView: (view: ActivityView) => void;
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
  onOpenHome?: () => void;
}

const ActivityBar: React.FC<ActivityBarProps> = ({ activeView, setActiveView, isSidebarVisible, onToggleSidebar, onOpenHome }) => {
  const items = [
    { view: ActivityView.EXPLORER, icon: FileIcon, label: 'Explorer' },
    { view: ActivityView.SEARCH, icon: SearchIcon, label: 'Search' },
    // { view: ActivityView.GIT, icon: GitIcon, label: 'Source Control' },
    { view: ActivityView.DEPLOY, icon: RocketIcon, label: 'Deploy & Run' },
    { view: ActivityView.DEBUG, icon: BugIcon, label: 'Debug' },
  ];

  const handleItemClick = (view: ActivityView) => {
    if (activeView === view) {
      onToggleSidebar();
    } else {
      setActiveView(view);
      if (!isSidebarVisible) {
        onToggleSidebar();
      }
    }
  };

  return (
    <div className="w-12 bg-caspier-black border-r border-caspier-border flex flex-col items-center py-4 justify-between h-full z-20 flex-shrink-0">
      <div className="flex flex-col gap-6 w-full items-center pt-2">
        <button
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
          className="p-2 text-caspier-muted hover:text-caspier-text"
          onClick={() => setActiveView(ActivityView.SETTINGS)}
        >
          <SettingsIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default ActivityBar;
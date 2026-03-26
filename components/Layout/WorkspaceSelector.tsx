import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDownIcon,
  GridIcon,
  PlusIcon,
  UploadIcon,
  DownloadIcon,
  EditIcon,
  TrashIcon,
  CopyIcon,
  GitHubIcon,

  RefreshIcon,
  CheckIcon
} from '../UI/Icons';

interface WorkspaceSelectorProps {
  currentWorkspace: string;
  workspaces: string[];
  onSwitchWorkspace: (name: string) => void;
  onCreateWorkspace: () => void;
  onRenameWorkspace: () => void;
  onDownloadWorkspace: () => void;
  onImportWorkspace: () => void;
  onDeleteWorkspace?: () => void;
  onCloneWorkspace?: () => void;
  onSync?: () => void;
}

const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  currentWorkspace,
  workspaces,
  onSwitchWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDownloadWorkspace,
  onImportWorkspace,
  onDeleteWorkspace,
  onCloneWorkspace,
  onSync
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2 border-x transition-all duration-300 group
          ${isOpen
            ? 'bg-caspier-hover border-caspier-active/50 text-caspier-text  '
            : 'bg-caspier-dark border-caspier-border text-caspier-muted hover:border-caspier-muted hover:text-caspier-text hover:shadow-lg'
          }`}
      >
        <div className={`p-1.5 rounded-md transition-colors duration-300 ${isOpen ? 'bg-caspier-active/10 text-caspier-active' : 'bg-caspier-black/40 text-caspier-red group-hover:text-caspier-active'}`}>
          <GridIcon className="w-4 h-4" />
        </div>

        <div className="flex flex-row items-center justify-center leading-none gap-1">
          <span className="text-[10px] uppercase tracking-[0.1em] font-bold opacity-50">Workspace:</span>
          <span className="text-sm font-bold truncate max-w-[140px] tracking-tight">{currentWorkspace}</span>
        </div>

        <div className={`ml-2 transition-transform duration-300 ${isOpen ? 'rotate-180 text-caspier-active' : 'opacity-40'}`}>
          <ChevronDownIcon className="w-4 h-4" />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-[calc(100%+8px)] left-0 w-80 bg-caspier-black  border border-caspier-border rounded-md shadow-xl  z-[100] overflow-hidden origin-top-left"
          style={{
            animation: 'dropdownEnter 0.2s ease-out forwards'
          }}
        >
          {/* Menu Header */}
          <div className="px-4 py-3.5 border-b border-caspier-border flex items-center justify-between bg-white/[0.02]">
            <span className="text-[11px] font-black uppercase tracking-widest text-caspier-muted flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-caspier-active shadow-[0_0_8px_rgba(0,123,255,0.5)]" />
              Your Workspaces
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); onCreateWorkspace(); setIsOpen(false); }}
                className="p-1.5 rounded-md hover:bg-caspier-active/10 text-caspier-muted hover:text-caspier-active transition-all"
                title="Create New Workspace"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onImportWorkspace(); setIsOpen(false); }}
                className="p-1.5 rounded-md hover:bg-caspier-active/10 text-caspier-muted hover:text-caspier-active transition-all"
                title="Import Workspace"
              >
                <UploadIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Workspaces List */}
          <div className="max-h-[280px] overflow-y-auto py-2 px-2 space-y-0.5 custom-scrollbar">
            {workspaces.map((w) => (
              <button
                key={w}
                className={`w-full group px-3 py-2.5 rounded-lg flex items-center justify-between transition-all duration-200
                  ${w === currentWorkspace
                    ? 'bg-caspier-active/10 text-caspier-active ring-1 ring-inset ring-caspier-active/20'
                    : 'text-caspier-text/80 hover:bg-white/[0.05] hover:text-caspier-text'}
                `}
                onClick={() => {
                  if (w !== currentWorkspace) {
                    onSwitchWorkspace(w);
                  }
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 
                    ${w === currentWorkspace
                      ? 'bg-caspier-active shadow-[0_0_12px_rgba(0,123,255,1)]'
                      : 'bg-white/10 group-hover:bg-white/30'}`}
                  />
                  <span className={`text-sm tracking-tight ${w === currentWorkspace ? 'font-bold' : 'font-medium'}`}>
                    {w}
                  </span>
                </div>

                {w === currentWorkspace && (
                  <div className="bg-caspier-active shadow-[0_0_15px_rgba(0,123,255,0.4)] p-0.5 rounded-full">
                    <CheckIcon className="w-3 h-3 text-caspier-black stroke-[3px]" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Action Grid */}
          <div className="mt-1 bg-white/[0.03] border-t border-caspier-border p-3">
            <div className="grid grid-cols-4 gap-2 mb-3">
              <button
                onClick={(e) => { e.stopPropagation(); onRenameWorkspace(); setIsOpen(false); }}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white/5 text-caspier-muted hover:text-caspier-text transition-all gap-1.5 group"
              >
                <EditIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] uppercase font-black tracking-tighter opacity-70">Rename</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onCloneWorkspace?.(); setIsOpen(false); }}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white/5 text-caspier-muted hover:text-caspier-text transition-all gap-1.5 group"
              >
                <CopyIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] uppercase font-black tracking-tighter opacity-70">Clone</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDownloadWorkspace(); setIsOpen(false); }}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white/5 text-caspier-muted hover:text-caspier-text transition-all gap-1.5 group"
              >
                <DownloadIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] uppercase font-black tracking-tighter opacity-70">Export</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteWorkspace?.(); setIsOpen(false); }}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-red-500/10 text-caspier-muted hover:text-red-500 transition-all gap-1.5 group"
              >
                <TrashIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] uppercase font-black tracking-tighter opacity-70">Delete</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const modal = document.getElementById('public-clone-modal');
                  if (modal) modal.style.display = 'flex';
                  setIsOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-white/5 border border-white/10 text-caspier-text hover:bg-white/10 hover:border-white/20 transition-all text-xs font-bold"
              >
                <GitHubIcon className="w-4 h-4" />

                GitHub Clone
              </button>
              <button
                onClick={() => { onSync?.(); setIsOpen(false); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-caspier-active/10 border border-caspier-active text-caspier-active hover:bg-caspier-active/20 hover:border-caspier-active/40 transition-all text-xs font-bold shadow-[0_0_15px_rgba(0,123,255,0.1)]"
              >
                <RefreshIcon className="w-4 h-4" />
                Sync Work
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropdownEnter {
          from { 
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 123, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default WorkspaceSelector;

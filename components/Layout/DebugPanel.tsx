import React, { useState } from 'react';
import { CompilationResult } from '../../types';
import ClarityRepl from '../Debug/ClarityRepl';
import StateInspector from '../Debug/StateInspector';
import TraceViewer from '../Debug/TraceViewer';
import { BugIcon, RefreshIcon, ChevronRightIcon } from '../UI/Icons';

interface DebugPanelProps {
  compilationResult?: CompilationResult;
  contractCode?: string;
  contractName?: string;
  theme?: 'dark' | 'light';
  sessionId?: string;
  onOpenStxerDebugger?: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ compilationResult, contractCode, contractName, theme, sessionId, onOpenStxerDebugger }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col h-full bg-caspier-black select-none">
      {/* Glossy Header */}
      <div className="p-3 border-b border-caspier-border flex items-center justify-between bg-caspier-panel/30 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 bg-labstx-orange blur-md opacity-20" />
            <BugIcon className="w-4 h-4 text-labstx-orange relative z-10" />
          </div>
          <span className="text-[10px] font-black text-caspier-text tracking-widest uppercase">
            Clarity Debugger
          </span>
        </div>
        <button
          onClick={handleRefresh}
          className="p-1.5 hover:bg-caspier-hover rounded-md text-caspier-muted hover:text-caspier-text transition-all active:scale-90"
          title="Refresh Debug Data"
        >
          <RefreshIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Stxer Debugger Card */}
        <div
          onClick={onOpenStxerDebugger}
          className="group relative cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-labstx-orange to-orange-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative flex items-center gap-4 p-4 bg-caspier-panel/50 border border-caspier-border rounded-2xl backdrop-blur-xl group-hover:border-caspier-border transition-all">
            <div className="w-12 h-12 flex-shrink-0 bg-caspier-black rounded-xl border border-caspier-border flex items-center justify-center p-2 group-hover:scale-110 transition-transform duration-500">
              <img src="/stxer.svg" alt="Stacks Logo" className="w-full h-full object-contain" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-caspier-text mb-0.5">STXER debugger</h3>
              <p className="text-[10px] text-caspier-muted font-medium uppercase tracking-wider">clarity smart contract debugger</p>
            </div>

            <ChevronRightIcon className="w-4 h-4 text-caspier-muted group-hover:text-labstx-orange group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        {!contractName && (
          <div className="pt-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
            <div className="w-12 h-12 bg-caspier-panel border border-caspier-border rounded-2xl flex items-center justify-center mb-4 shadow-xl">
              <BugIcon className="w-6 h-6 text-caspier-muted opacity-30" />
            </div>
            <h3 className="text-sm font-bold text-caspier-text mb-2">No Active Context</h3>
            <p className="text-xs text-caspier-muted max-w-[200px] leading-relaxed">
              Open a <span className="text-labstx-orange font-mono">.clar</span> file to begin debugging in the simulated environment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugPanel;

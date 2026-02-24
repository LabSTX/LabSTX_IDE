import React, { useState } from 'react';
import { CompilationResult } from '../../types';
import ClarityRepl from '../Debug/ClarityRepl';
import StateInspector from '../Debug/StateInspector';
import TraceViewer from '../Debug/TraceViewer';
import { BugIcon, RefreshIcon } from '../UI/Icons';

interface DebugPanelProps {
  compilationResult?: CompilationResult;
  contractCode?: string;
  contractName?: string;
  theme?: 'dark' | 'light';
}

type DebugTab = 'repl' | 'state' | 'trace';

const DebugPanel: React.FC<DebugPanelProps> = ({ compilationResult, contractCode, contractName, theme }) => {
  const [activeTab, setActiveTab] = useState<DebugTab>('repl');
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

      {/* Tabs Layout */}
      <div className="px-2 flex border-b border-caspier-border bg-caspier-dark/50 overflow-x-auto no-scrollbar">
        {(['repl', 'state', 'trace'] as DebugTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-[10px] font-bold transition-all relative flex flex-col items-center gap-1 group whitespace-nowrap ${activeTab === tab
              ? 'text-labstx-orange'
              : 'text-caspier-muted hover:text-caspier-text'
              }`}
          >
            <span className="uppercase tracking-widest">{tab === 'repl' ? 'Console' : tab === 'state' ? 'Inspector' : 'Trace'}</span>
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-labstx-orange animate-in slide-in-from-left duration-300" />
            )}
            <div className="absolute inset-0 bg-labstx-orange/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-md" />
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div key={refreshKey} className="h-full">
          {activeTab === 'repl' && <ClarityRepl contractCode={contractCode} contractName={contractName} theme={theme} />}
          {activeTab === 'state' && <StateInspector contractCode={contractCode} contractName={contractName} theme={theme} />}
          {activeTab === 'trace' && <TraceViewer contractCode={contractCode} contractName={contractName} theme={theme} />}
        </div>

        {!contractName && (
          <div className="absolute inset-0 bg-caspier-black/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
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

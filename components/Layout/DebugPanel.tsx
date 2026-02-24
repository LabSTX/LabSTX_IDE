import React, { useState } from 'react';
import { CompilationResult } from '../../types';
import ClarityRepl from '../Debug/ClarityRepl';
import StateInspector from '../Debug/StateInspector';
import TraceViewer from '../Debug/TraceViewer';
import { BugIcon } from '../UI/Icons';

interface DebugPanelProps {
  compilationResult?: CompilationResult;
  contractCode?: string;
  contractName?: string;
}

type DebugTab = 'repl' | 'state' | 'trace';

const DebugPanel: React.FC<DebugPanelProps> = ({ compilationResult, contractCode, contractName }) => {
  const [activeTab, setActiveTab] = useState<DebugTab>('repl');

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-caspier-border flex items-center gap-2 bg-caspier-black">
        <BugIcon className="w-4 h-4 text-labstx-orange" />
        <span className="text-xs font-bold text-caspier-text tracking-wider">CLARITY DEBUGGER</span>
      </div>

      <div className="flex border-b border-caspier-border bg-caspier-black">
        <button
          onClick={() => setActiveTab('repl')}
          className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === 'repl'
            ? 'text-labstx-orange border-b-2 border-labstx-orange'
            : 'text-caspier-muted hover:text-caspier-text'
            }`}
        >
          Clarity REPL
        </button>
        <button
          onClick={() => setActiveTab('state')}
          className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === 'state'
            ? 'text-labstx-orange border-b-2 border-labstx-orange'
            : 'text-caspier-muted hover:text-caspier-text'
            }`}
        >
          State Inspector
        </button>
        <button
          onClick={() => setActiveTab('trace')}
          className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === 'trace'
            ? 'text-labstx-orange border-b-2 border-labstx-orange'
            : 'text-caspier-muted hover:text-caspier-text'
            }`}
        >
          Execution Trace
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'repl' && <ClarityRepl />}
        {activeTab === 'state' && <StateInspector contractCode={contractCode} contractName={contractName} />}
        {activeTab === 'trace' && <TraceViewer contractCode={contractCode} contractName={contractName} />}
      </div>
    </div>
  );
};

export default DebugPanel;

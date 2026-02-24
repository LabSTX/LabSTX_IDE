import React from 'react';
import { CompilationResult } from '../../types';

interface MetadataInspectorProps {
  compilationResult?: CompilationResult;
}

const MetadataInspector: React.FC<MetadataInspectorProps> = ({ compilationResult }) => {
  if (!compilationResult?.metadata) {
    return (
      <div className="p-4 text-caspier-muted text-sm">
        No metadata available. Compile a contract first.
      </div>
    );
  }

  const metadata = compilationResult.metadata;

  return (
    <div className="flex flex-col h-full bg-caspier-dark">
      <div className="p-3 border-b border-caspier-border bg-caspier-black">
        <span className="text-xs font-bold text-caspier-text tracking-wider">CONTRACT METADATA</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="p-3 bg-caspier-black border border-caspier-border rounded">
          <div className="text-xs font-bold text-caspier-muted mb-2">Contract Information</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-caspier-muted">Type:</span>
              <span className="text-caspier-text">{metadata.contractType}</span>
            </div>
            {metadata.contractPackage && (
              <div className="flex justify-between">
                <span className="text-caspier-muted">Package:</span>
                <span className="text-caspier-text">{metadata.contractPackage}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-caspier-muted">Entry Points:</span>
              <span className="text-caspier-text">{metadata.entryPoints.length}</span>
            </div>
          </div>
        </div>

        {metadata.entryPoints.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-caspier-muted uppercase">Entry Points</div>
            {metadata.entryPoints.map((ep, idx) => (
              <div key={idx} className="p-3 bg-caspier-black border border-caspier-border rounded">
                <div className="text-sm font-bold text-caspier-text mb-2">{ep.name}</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-caspier-muted">Access:</span>
                    <span className="text-caspier-text">{ep.access}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caspier-muted">Return Type:</span>
                    <span className="text-caspier-text">{ep.ret}</span>
                  </div>
                  {ep.args && ep.args.length > 0 && (
                    <div className="mt-2">
                      <div className="text-caspier-muted mb-1">Arguments:</div>
                      <div className="space-y-1 ml-2">
                        {ep.args.map((arg, argIdx) => (
                          <div key={argIdx} className="text-caspier-text">
                            <span className="font-mono">{arg.name}</span>
                            <span className="text-caspier-muted">: {arg.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetadataInspector;











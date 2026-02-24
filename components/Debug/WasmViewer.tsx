import React, { useState } from 'react';
import { CompilationResult } from '../../types';
import { Button } from '../UI/Button';
import { DownloadIcon } from '../UI/Icons';

interface WasmViewerProps {
  compilationResult?: CompilationResult;
}

const WasmViewer: React.FC<WasmViewerProps> = ({ compilationResult }) => {
  const [viewMode, setViewMode] = useState<'hex' | 'base64' | 'info'>('info');

  if (!compilationResult?.wasm) {
    return (
      <div className="p-4 text-caspier-muted text-sm">
        No WASM available. Compile a contract first.
      </div>
    );
  }

  const wasm = compilationResult.wasm;
  const wasmHex = Array.from(wasm)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
  
  const wasmBase64 = compilationResult.wasmBase64 || btoa(String.fromCharCode(...wasm));

  const formatHex = (hex: string) => {
    const lines: string[] = [];
    const bytes = hex.split(' ');
    for (let i = 0; i < bytes.length; i += 16) {
      const offset = i.toString(16).padStart(8, '0');
      const lineBytes = bytes.slice(i, i + 16);
      const hexStr = lineBytes.join(' ');
      const ascii = lineBytes
        .map(b => {
          const code = parseInt(b, 16);
          return code >= 32 && code < 127 ? String.fromCharCode(code) : '.';
        })
        .join('');
      lines.push(`${offset}  ${hexStr.padEnd(48)}  ${ascii}`);
    }
    return lines;
  };

  const handleExport = () => {
    const blob = new Blob([wasm], { type: 'application/wasm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contract.wasm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-caspier-dark">
      <div className="p-3 border-b border-caspier-border flex items-center justify-between bg-caspier-black">
        <span className="text-xs font-bold text-caspier-text tracking-wider">WASM VIEWER</span>
        <div className="flex items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="bg-caspier-dark border border-caspier-border text-caspier-text px-2 py-1 text-xs"
          >
            <option value="info">Info</option>
            <option value="hex">Hex</option>
            <option value="base64">Base64</option>
          </select>
          <Button onClick={handleExport} size="sm" variant="secondary">
            <DownloadIcon className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'info' && (
          <div className="space-y-3">
            <div className="p-3 bg-caspier-black border border-caspier-border rounded">
              <div className="text-xs font-bold text-caspier-muted mb-2">WASM Information</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-caspier-muted">Size:</span>
                  <span className="text-caspier-text">{wasm.length} bytes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-caspier-muted">Format:</span>
                  <span className="text-caspier-text">WebAssembly</span>
                </div>
                {compilationResult.metadata && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-caspier-muted">Contract Type:</span>
                      <span className="text-caspier-text">{compilationResult.metadata.contractType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-caspier-muted">Entry Points:</span>
                      <span className="text-caspier-text">{compilationResult.metadata.entryPoints.length}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {compilationResult.metadata?.entryPoints && compilationResult.metadata.entryPoints.length > 0 && (
              <div className="p-3 bg-caspier-black border border-caspier-border rounded">
                <div className="text-xs font-bold text-caspier-muted mb-2">Entry Points</div>
                <div className="space-y-2">
                  {compilationResult.metadata.entryPoints.map((ep, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="text-caspier-text font-bold">{ep.name}</div>
                      <div className="text-caspier-muted ml-2">
                        Access: {ep.access} | Return: {ep.ret}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === 'hex' && (
          <div className="font-mono text-xs">
            <pre className="text-caspier-text whitespace-pre-wrap">
              {formatHex(wasmHex).join('\n')}
            </pre>
          </div>
        )}

        {viewMode === 'base64' && (
          <div className="font-mono text-xs">
            <pre className="text-caspier-text whitespace-pre-wrap break-all">
              {wasmBase64}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default WasmViewer;











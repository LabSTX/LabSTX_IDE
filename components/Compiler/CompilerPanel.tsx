import React, { useState } from 'react';
import { CompilationResult } from '../../types';
import { RustCompiler, AssemblyScriptCompiler } from '../../services/casper/compiler';
import { Button } from '../UI/Button';
import { PlayIcon, DownloadIcon } from '../UI/Icons';

interface CompilerPanelProps {
  sourceCode: string;
  fileName: string;
  language: string;
  onCompile: (result: CompilationResult) => void;
  onExport?: (wasm: Uint8Array) => void;
}

const CompilerPanel: React.FC<CompilerPanelProps> = ({
  sourceCode,
  fileName,
  language,
  onCompile,
  onExport
}) => {
  const [compiling, setCompiling] = useState(false);
  const [result, setResult] = useState<CompilationResult | null>(null);
  const [optimize, setOptimize] = useState(true);

  const handleCompile = async () => {
    setCompiling(true);
    setResult(null);

    try {
      let compileResult: CompilationResult;

      if (language === 'rust' || fileName.endsWith('.rs')) {
        compileResult = await RustCompiler.compile(sourceCode, fileName.replace('.rs', ''), optimize);
      } else if (language === 'typescript' || fileName.endsWith('.ts') || fileName.endsWith('.as')) {
        compileResult = await AssemblyScriptCompiler.compile(sourceCode, fileName.replace(/\.(ts|as)$/, ''), optimize);
      } else {
        throw new Error(`Unsupported language: ${language}`);
      }

      setResult(compileResult);
      onCompile(compileResult);
    } catch (error: any) {
      setResult({
        success: false,
        errors: [error.message || 'Compilation failed']
      });
    } finally {
      setCompiling(false);
    }
  };

  const handleExport = () => {
    if (result?.wasm) {
      if (onExport) {
        onExport(result.wasm);
      } else {
        // Default export behavior
        const blob = new Blob([result.wasm], { type: 'application/wasm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName.replace(/\.[^/.]+$/, '')}.wasm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-caspier-dark">
      <div className="p-3 border-b border-caspier-border flex items-center justify-between bg-caspier-black">
        <span className="text-xs font-bold text-caspier-text tracking-wider">COMPILER</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-caspier-muted">
            <input
              type="checkbox"
              checked={optimize}
              onChange={(e) => setOptimize(e.target.checked)}
              className="w-3 h-3"
            />
            Optimize
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <div className="text-xs text-caspier-muted">
            Language: <span className="text-caspier-text font-bold">{language.toUpperCase()}</span>
          </div>
          <div className="text-xs text-caspier-muted">
            File: <span className="text-caspier-text font-bold">{fileName}</span>
          </div>
        </div>

        <Button
          onClick={handleCompile}
          disabled={compiling}
          className="w-full flex items-center justify-center gap-2"
        >
          <PlayIcon className="w-4 h-4" />
          {compiling ? 'Compiling...' : 'Compile'}
        </Button>

        {result && (
          <div className="space-y-3">
            {result.success ? (
              <>
                <div className="p-3 bg-green-900/20 border border-green-700 rounded text-sm">
                  <div className="text-green-400 font-bold mb-1">✓ Compilation Successful</div>
                  {result.metadata && (
                    <div className="text-xs text-green-300 mt-2">
                      <div>Entry Points: {result.metadata.entryPoints.length}</div>
                      <div>Type: {result.metadata.contractType}</div>
                    </div>
                  )}
                </div>

                {result.wasm && (
                  <Button
                    onClick={handleExport}
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Export WASM
                  </Button>
                )}

                {result.warnings && result.warnings.length > 0 && (
                  <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded text-sm">
                    <div className="text-yellow-400 font-bold mb-2">Warnings:</div>
                    <ul className="text-xs text-yellow-300 space-y-1">
                      {result.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="p-3 bg-red-900/20 border border-red-700 rounded text-sm">
                <div className="text-red-400 font-bold mb-2">✗ Compilation Failed</div>
                {result.errors && (
                  <ul className="text-xs text-red-300 space-y-1">
                    {result.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompilerPanel;











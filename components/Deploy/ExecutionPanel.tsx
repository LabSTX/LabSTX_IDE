import React, { useState } from 'react';
import { DeployedContract, EntryPoint, WalletConnection, DeployConfig } from '../../types';
import { CasperDeploymentService } from '../../services/casper/deployment';
import { Button } from '../UI/Button';
import { PlayIcon } from '../UI/Icons';

interface ExecutionPanelProps {
  contract: DeployedContract;
  wallet: WalletConnection;
  network: string;
  onExecute: (result: { deployHash: string }) => void;
}

const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  contract,
  wallet,
  network,
  onExecute
}) => {
  const [selectedEntryPoint, setSelectedEntryPoint] = useState<EntryPoint | null>(
    contract.entryPoints?.[0] || null
  );
  const [args, setArgs] = useState<Record<string, any>>({});
  const [executing, setExecuting] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(1000000000);
  const [lastResult, setLastResult] = useState<{ deployHash: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    if (!selectedEntryPoint) return;

    setExecuting(true);
    setError(null);
    setLastResult(null);

    try {
      const config: DeployConfig = {
        paymentAmount,
        gasPrice: 1,
        chainName: network === 'testnet' ? 'casper-test' : network === 'mainnet' ? 'casper' : 'casper-test',
        runtimeArgs: args
      };

      const result = await CasperDeploymentService.executeEntryPoint(
        contract.contractHash,
        selectedEntryPoint.name,
        args,
        wallet,
        config
      );

      setLastResult(result);
      onExecute(result);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setExecuting(false);
    }
  };

  const updateArg = (name: string, value: any) => {
    setArgs(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold text-caspier-muted mb-2 block uppercase">Entry Point</label>
        <select
          value={selectedEntryPoint?.name || ''}
          onChange={(e) => {
            const ep = contract.entryPoints?.find(ep => ep.name === e.target.value);
            setSelectedEntryPoint(ep || null);
            setArgs({});
          }}
          className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-1.5 text-sm focus:border-caspier-red outline-none"
        >
          {contract.entryPoints?.map(ep => (
            <option key={ep.name} value={ep.name}>{ep.name}</option>
          ))}
        </select>
      </div>

      {selectedEntryPoint && selectedEntryPoint.args.length > 0 && (
        <div>
          <label className="text-xs font-bold text-caspier-muted mb-2 block uppercase">Arguments</label>
          <div className="space-y-2">
            {selectedEntryPoint.args.map((arg, idx) => (
              <div key={idx}>
                <label className="text-xs text-caspier-muted block mb-1">{arg.name} ({arg.type})</label>
                <input
                  type="text"
                  value={args[arg.name] || ''}
                  onChange={(e) => {
                    // Try to parse as number if it looks like one
                    const value = isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value);
                    updateArg(arg.name, value);
                  }}
                  placeholder={`Enter ${arg.name}`}
                  className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-1.5 text-sm focus:border-caspier-red outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-caspier-muted mb-2 block uppercase">Payment Amount</label>
        <input
          type="number"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
          className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-1.5 text-sm focus:border-caspier-red outline-none"
        />
      </div>

      <Button
        onClick={handleExecute}
        disabled={executing || !wallet.connected || !selectedEntryPoint}
        className="w-full flex items-center justify-center gap-2"
      >
        <PlayIcon className="w-4 h-4" />
        {executing ? 'Executing...' : 'Execute'}
      </Button>

      {lastResult && (
        <div className="p-3 bg-green-900/20 border border-green-700 rounded text-sm">
          <div className="text-green-400 font-bold mb-1">✓ Execution Successful</div>
          <div className="text-xs text-green-300 mt-2">
            <div>Deploy Hash:</div>
            <div className="font-mono break-all">{lastResult.deployHash}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-700 rounded text-sm">
          <div className="text-red-400 font-bold mb-1">✗ Execution Failed</div>
          <div className="text-xs text-red-300">{error}</div>
        </div>
      )}
    </div>
  );
};

export default ExecutionPanel;











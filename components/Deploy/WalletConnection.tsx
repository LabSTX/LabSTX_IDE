import React, { useState } from 'react';
import { WalletConnection } from '../../types';
import { StacksWalletService } from '../../services/stacks/wallet';
import { Button } from '../UI/Button';
import { XIcon, CheckIcon } from '../UI/Icons';

interface WalletConnectionProps {
  wallet: WalletConnection;
  onConnect: (wallet: WalletConnection) => void;
  onDisconnect: () => void;
}

const WalletConnectionComponent: React.FC<WalletConnectionProps> = ({
  wallet,
  onConnect,
  onDisconnect
}) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      const connection = await StacksWalletService.connect();
      onConnect(connection);
    } catch (err: any) {
      console.error('Stacks wallet connection error:', err);
      setError(err.message || 'Failed to connect Stacks wallet');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    StacksWalletService.disconnect();
    onDisconnect();
    setError(null);
  };

  if (wallet.connected) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-indigo-900/20 border border-indigo-700 rounded">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-indigo-400">Connected</span>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-caspier-muted hover:text-caspier-text transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs space-y-1">
            <div className="hidden text-caspier-muted">Wallet: <span className="text-caspier-text capitalize">{wallet.type}</span></div>
            <div className="text-caspier-muted">Network: <span className="text-caspier-text uppercase">{wallet.network || 'mainnet'}</span></div>
            <div className="text-caspier-muted">Address:</div>
            <div className="text-caspier-text font-mono text-xs break-all bg-black/10 p-1.5 rounded mt-1 border border-caspier-border">
              {wallet.address}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-700 rounded text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full h-10 font-bold tracking-wide"
          variant="primary"
        >
          {connecting ? 'Connecting...' : 'Connect Stacks Wallet'}
        </Button>
      </div>

      <div className="text-[11px] text-caspier-muted leading-relaxed">
        <p>Connect using <strong>Leather</strong>, <strong>Hiro</strong>, or <strong>Xverse</strong> to deploy and interact with Clarity contracts.</p>
      </div>
    </div>
  );
};

export default WalletConnectionComponent;

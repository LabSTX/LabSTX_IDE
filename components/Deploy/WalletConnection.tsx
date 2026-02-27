import React, { useState } from 'react';
import { WalletConnection } from '../../types';
import { StacksWalletService } from '../../services/stacks/wallet';
import { Button } from '../UI/Button';
import { XIcon, CheckIcon, CopyIcon, CheckCircleIcon } from '../UI/Icons';

interface WalletConnectionProps {
  wallet: WalletConnection;
  onConnect: (wallet: WalletConnection) => void;
  onDisconnect: () => void;
  network: 'testnet' | 'mainnet' | 'devnet';
}

const WalletConnectionComponent: React.FC<WalletConnectionProps> = ({
  wallet,
  onConnect,
  onDisconnect,
  network
}) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const connection = await StacksWalletService.connect(network);
      onConnect(connection);
    } catch (err: any) {
      setError(err.message || 'Failed to connect Stacks wallet');
    } finally {
      setConnecting(false);
    }
  };

  const handleCopy = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (wallet.connected) {
    return (
      <div className="group relative overflow-hidden border-caspier-border border border-white/10 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 p-4 transition-all hover:border-indigo-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20">
              <CheckIcon className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <span className="text-xs font-semibold tracking-wider uppercase text-indigo-400">
              Connected
            </span>
          </div>
          <button
            onClick={onDisconnect}
            className="rounded-lg p-1 text-caspier-muted hover:bg-red-500/10 hover:text-red-400 transition-all"
            title="Disconnect"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-caspier-muted font-medium">Active Address</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-caspier-text">
                  {formatAddress(wallet.address || '')}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-caspier-muted transition-colors active:scale-95"
                >
                  {copied ? (
                    <CheckCircleIcon className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <CopyIcon className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-caspier-muted font-medium">Network</p>
              <span className="text-xs font-bold text-caspier-text uppercase">
                {wallet.address?.startsWith('ST') ? 'testnet' : 'mainnet'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 animate-in fade-in slide-in-from-top-1">
          <span className="shrink-0">⚠️</span>
          {error}
        </div>
      )}

      <Button
        onClick={handleConnect}
        disabled={connecting}
        className={`w-full h-11 font-bold uppercase tracking-widest text-xs transition-all ${!connecting
          ? 'shadow-[4px_4px_0_0_rgba(79,70,229,0.3)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(79,70,229,0.4)]'
          : 'opacity-70'
          }`}
        variant="primary"
      >
        {connecting ? 'Connecting...' : 'Connect Stacks Wallet'}
      </Button>

      <p className="text-center text-[11px] text-caspier-muted px-2">
        Compatible with <span className="text-caspier-text">Leather</span>, <span className="text-caspier-text">Hiro</span>, or <span className="text-caspier-text">Xverse</span>.
      </p>
    </div>
  );
};

export default WalletConnectionComponent;
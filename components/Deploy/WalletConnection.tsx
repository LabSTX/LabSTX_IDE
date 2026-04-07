import React, { useState } from 'react';
import { WalletConnection } from '../../types';
import { StacksWalletService } from '../../services/stacks/wallet';
import { Button } from '../UI/Button';
import { XIcon, CheckIcon, CopyIcon, CheckCircleIcon } from '../UI/Icons';
import { getProviders } from 'sats-connect';
import { DownloadCloud, X, XCircle } from 'lucide-react';
import { connect } from '@stacks/connect';



const providers = getProviders();

// 1. Find the Xverse provider info from the array you saw in the console
const isXverseInstalled = providers.find(p => p.id === 'XverseProviders.BitcoinProvider');
const isLeatherInstalled = providers.find(p => p.id === 'LeatherProvider');
console.log(providers)

interface WalletConnectionProps {
  wallet: WalletConnection;
  onConnect: (wallet: WalletConnection) => void;
  onDisconnect: () => void;
  network: 'testnet' | 'mainnet' | 'devnet' | 'mocknet' | 'simnet';
}
const win = window as any;
const WalletConnectionComponent: React.FC<WalletConnectionProps> = ({
  wallet,
  onConnect,
  onDisconnect,
  network
}) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleConnect = async (provider: 'leather' | 'xverse') => {
    setConnecting(true);
    setError(null);
    try {
      const connection = await StacksWalletService.connect(network, provider);
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
              Connected ({wallet.type})
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
                {network}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {isXverseInstalled || isLeatherInstalled ?
        <div className="flex flex-col  pb-2">
          <h3 className="text-sm font-semibold text-caspier-text">Connect your Stacks Wallet </h3>
          <p className="text-xs text-caspier-muted mt-1 ">Select your preferred Stacks wallet provider to continue.</p>
        </div>
        : <div className="flex flex-col  pb-2">
          <h3 className="text-sm font-semibold text-caspier-text">Install Xverse or Leather wallet </h3>
          <p className="text-xs text-caspier-muted mt-1 ">You can download them from the official website or chrome extension store.</p>
        </div>
      }
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400 animate-in fade-in slide-in-from-top-1">
          <span className="shrink-0"><XCircle /></span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {isXverseInstalled ?
          <button
            onClick={() => handleConnect('xverse')}
            disabled={connecting}
            className="relative flex flex-col items-center justify-center p-4 border border-white/5 bg-white/5 rounded-xl hover:bg-white/10 hover:border-white/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Unstable Chip */}

            <span className="absolute -top-2 -right-2 bg-red-400 text-black text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
              unstable
            </span>

            <img src="/xverse.png" alt="Xverse" className="h-10 w-10 mb-3" />
            <span className="text-xs font-bold text-caspier-text">Xverse</span>
          </button> : <button


            className="flex flex-col items-center justify-center p-4 border border-white/5 bg-white/5 rounded-xl hover:bg-white/10 hover:border-white/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="/xverse.png" alt="Xverse" className="h-10 w-10 mb-3" />
            <span className="text-xs font-bold text-caspier-text">Xverse is not installed</span>
            <a className='flex items-center gap-2 py-1' href="https://chromewebstore.google.com/detail/xverse-bitcoin-crypto-wal/idnnbdplmphpflfnlkomgpfbpcgelopg" target="_blank" rel="noopener noreferrer">
              <DownloadCloud className="w-4 h-4 text-blue-500 hover:text-blue-600 hover:underline" /> <span className="text-[10px] hover:underline hover:text-blue-600 text-blue-500 font-bold">Download</span>
            </a>
          </button>}


        {isLeatherInstalled ?

          <button
            onClick={() => handleConnect('leather')}
            disabled={connecting}
            className="relative flex flex-col items-center justify-center p-4 border border-white/5 bg-white/5 rounded-xl hover:bg-white/10 hover:border-white/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Unstable Chip */}
            <span className="absolute -top-2 -right-2 bg-blue-400 text-black text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
              stable
            </span>

            <img src="/leather.svg" alt="Leather" className="h-10 w-10 mb-3" />
            <span className="text-xs font-bold text-caspier-text">Leather</span>

          </button>

          : <button

            className="flex flex-col items-center justify-center p-4 border border-white/5 bg-white/5 rounded-xl hover:bg-white/10 hover:border-white/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="/leather.svg" alt="Leather" className="h-10 w-10 mb-3" />
            <span className="text-xs font-bold text-caspier-text">Leather is not installed</span>
            <a className='flex items-center gap-2 py-1' href="https://chromewebstore.google.com/detail/leather/ldinpeekobnhjjdofggfgjlcehhmanlj?hl=en" target="_blank" rel="noopener noreferrer">
              <DownloadCloud className="w-4 h-4 text-blue-500 hover:text-blue-600 hover:underline" /> <span className="text-[10px] hover:underline hover:text-blue-600 text-blue-500 font-bold">Download</span>
            </a>
          </button>}



      </div>

      {connecting && (
        <div className="text-center text-xs text-caspier-muted animate-pulse">
          Connecting to wallet...
        </div>
      )}


    </div>
  );
};

export default WalletConnectionComponent;
import React, { useState, useEffect } from 'react'; // Added useEffect
import { WalletConnection } from '../../types';
import { StacksWalletService } from '../../services/stacks/wallet';
import { Button } from '../UI/Button';
import { XIcon, CheckIcon, CopyIcon, CheckCircleIcon } from '../UI/Icons';
import { getProviders } from 'sats-connect';
import { DownloadCloud, XCircle } from 'lucide-react';

interface WalletConnectionProps {
  wallet: WalletConnection;
  onConnect: (wallet: WalletConnection) => void;
  onDisconnect: () => void;
  network: 'testnet' | 'mainnet' | 'devnet' | 'mocknet' | 'simnet';
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

  const [isMounted, setisMounted] = useState(false);
  const [isXverseInstalled, setIsXverseInstalled] = useState(false);
  const [isLeatherInstalled, setIsLeatherInstalled] = useState(false);

  // Safe check in case you are using Next.js/SSR
  const lastUsedProvider = typeof window !== 'undefined' ? localStorage.getItem('lastUsedProvider') : null;

  // Mount effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setisMounted(true);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, []);

  // Polling effect
  useEffect(() => {
    if (!isMounted) return;

    const checkProviders = () => {
      try {
        const providers = getProviders();

        // Note: You might want to comment out the console.log to avoid spamming the console every second.
        // console.log("Detected Providers:", providers); 

        if (providers) {
          setIsXverseInstalled(!!providers.find(p => p.id === 'XverseProviders.BitcoinProvider'));
          setIsLeatherInstalled(!!providers.find(p => p.id === 'LeatherProvider'));

        }
      } catch (e) {
        console.error("Error detecting providers", e);
      }
    };

    // 1. Run the check immediately once
    checkProviders();

    // 2. Set up the interval to run every 1000ms (1 second)
    const intervalId = setInterval(() => {
      checkProviders();
    }, 1000);

    // 3. Cleanup the interval when the component unmounts or dependencies change
    return () => {
      clearInterval(intervalId);
    };
  }, [isMounted]);


  const handleConnect = async (provider: 'leather' | 'xverse') => {
    setConnecting(true);
    setError(null);
    try {
      const connection = await StacksWalletService.connect(network, provider);
      localStorage.setItem('lastUsedProvider', provider);
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
      {isXverseInstalled || isLeatherInstalled ? (
        <div className="flex flex-col pb-2">
          <h3 className="text-sm font-semibold text-caspier-text">Connect your Stacks Wallet</h3>
          <p className="text-xs text-caspier-muted mt-1">Select your preferred Stacks wallet provider to continue.</p>
        </div>
      ) : (
        <div className="flex flex-col pb-2">
          <h3 className="text-sm font-semibold text-caspier-text">Install Xverse or Leather wallet</h3>
          <p className="text-xs text-caspier-muted mt-1">You can download them from the official website or chrome extension store.</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400 animate-in fade-in slide-in-from-top-1">
          <span className="shrink-0"><XCircle className="w-4 h-4" /></span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Xverse Button Logic */}
        {isXverseInstalled ? (
          <button
            onClick={() => handleConnect('xverse')}
            disabled={connecting}
            className="relative flex flex-col items-center justify-center p-4 border border-zinc-400/20 bg-zinc-400/20  hover:bg-white/10 hover:border-white/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Unstable Badge (Top Right) */}
            <span className="absolute -top-2 -right-2 bg-red-400 text-black text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm z-10">
              unstable
            </span>

            <img src="/xverse.png" alt="Xverse" className="h-10 w-10 mb-3" />
            <span className="text-xs font-bold text-caspier-text mb-3">Xverse</span>

            {/* Last Used Badge (Bottom Right) */}
            {lastUsedProvider === 'xverse' && (
              <span className="absolute bottom-0 right-0 bg-blue-800 text-white text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-tighter">
                Last Used
              </span>
            )}
          </button>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 border border-zinc-400/20 bg-zinc-400/20">
            <img src="/xverse.png" alt="Xverse" className="h-10 w-10 mb-3 opacity-50 grayscale" />
            <span className="text-xs font-bold text-caspier-muted mb-3">Xverse</span>
            <a
              className='flex items-center gap-2 py-1 mt-1'
              href="https://chromewebstore.google.com/detail/xverse-bitcoin-crypto-wal/idnnbdplmphpflfnlkomgpfbpcgelopg"
              target="_blank"
              rel="noopener noreferrer"
            >
              <DownloadCloud className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] text-blue-500 font-bold hover:underline">Download</span>
            </a>
          </div>
        )}

        {/* Leather Button Logic */}
        {isLeatherInstalled ? (
          <button
            onClick={() => handleConnect('leather')}
            disabled={connecting}
            className="relative flex flex-col items-center justify-center p-4 border border-zinc-400/20 bg-zinc-400/20 hover:bg-white/10 hover:border-white/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute -top-2 -right-2 bg-blue-400 text-black text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
              stable
            </span>
            <img src="/leather.svg" alt="Leather" className="h-10 w-10 mb-3" />
            <span className="text-xs font-bold text-caspier-text mb-3">Leather</span>
            {lastUsedProvider === 'leather' && (
              <span className="absolute bottom-0 right-0 bg-blue-800 text-white text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-tighter">
                Last Used
              </span>
            )}
          </button>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 border border-zinc-400/20 bg-zinc-400/20">
            <img src="/leather.svg" alt="Leather" className="h-10 w-10 mb-3 opacity-50 grayscale" />
            <span className="text-xs font-bold text-caspier-muted mb-3">Leather</span>
            <a
              className='flex items-center gap-2 py-1 mt-1'
              href="https://chromewebstore.google.com/detail/leather/ldinpeekobnhjjdofggfgjlcehhmanlj"
              target="_blank"
              rel="noopener noreferrer"
            >
              <DownloadCloud className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] text-blue-500 font-bold hover:underline">Download</span>
            </a>
          </div>
        )}
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
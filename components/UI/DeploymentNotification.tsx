import React, { useEffect } from 'react';

interface DeploymentNotificationProps {
  contractName?: string;
  deployHash: string | Uint8Array;
  network: string;
  onClose: () => void;
}

export const DeploymentNotification: React.FC<DeploymentNotificationProps> = ({
  contractName,
  deployHash,
  network,
  onClose
}) => {
  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onClose]);

  // Convert deployHash to hex string if needed
  const deployHashHex = typeof deployHash === 'string'
    ? deployHash
    : Array.from(deployHash as any).map((b: number) => b.toString(16).padStart(2, '0')).join('');

  // Construct the Stacks explorer URL
  const explorerUrl = network === 'mainnet'
    ? `https://explorer.stacks.co/txid/${deployHashHex}?chain=mainnet`
    : `https://explorer.stacks.co/txid/${deployHashHex}?chain=testnet`;

  const handleClick = () => {
    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .notification-enter {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
      <div
        className="fixed bottom-6 right-6 z-[9999] bg-caspier-dark border border-labstx-orange/30 rounded-lg shadow-[0_10px_40px_-10px_rgba(255,107,0,0.2)] p-4 min-w-[340px] max-w-[420px] cursor-pointer hover:border-labstx-orange transition-all duration-300 notification-enter overflow-hidden"
        onClick={handleClick}
      >
        {/* Progress bar background */}
        <div className="absolute bottom-0 left-0 h-1 bg-labstx-orange/20 w-full" />
        {/* Animating progress bar */}
        <div
          className="absolute bottom-0 left-0 h-1 bg-labstx-orange transition-all duration-[10000ms] ease-linear"
          style={{ width: '100%', animation: 'shrink 10s linear forwards' }}
        />
        <style>{`
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 bg-labstx-orange/10 p-2 rounded-lg">
            <svg
              className="w-6 h-6 text-labstx-orange"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-caspier-text">
                {contractName ? `Contract Broadcasted` : 'Transaction Broadcasted'}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${network === 'mainnet' ? 'bg-green-500/10 text-green-500' : 'bg-labstx-orange/10 text-labstx-orange'
                }`}>
                {network}
              </span>
            </div>

            <div className="text-[11px] text-caspier-muted font-medium mb-2 truncate">
              {contractName ? (
                <>Contract <span className="text-labstx-orange font-bold text-[10px]">{contractName}</span> is being deployed.</>
              ) : (
                'Contract is being deployed to the Stacks network.'
              )}
            </div>

            <div className="flex items-center justify-between bg-black/40 px-2 py-1.5 rounded border border-white/5">
              <code className="text-[10px] text-indigo-400 font-mono truncate mr-2">
                {deployHashHex.substring(0, 8)}...{deployHashHex.substring(deployHashHex.length - 8)}
              </code>
              <span className="text-[10px] text-labstx-orange font-bold uppercase tracking-wider whitespace-nowrap">
                View Explorer →
              </span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex-shrink-0 text-caspier-muted hover:text-caspier-text transition-colors p-1"
            aria-label="Close notification"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

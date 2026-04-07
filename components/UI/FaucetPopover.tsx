import React, { useState, useRef, useEffect } from 'react';
import { WalletIcon, CheckCircle2, AlertCircle, Loader2, Copy } from 'lucide-react';
import { Button } from './Button';
import { StacksWalletService } from '../../services/stacks/wallet';

interface FaucetPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    anchorRect: DOMRect | null;
    connectedAddress?: string;
}

const RATE_LIMIT_MS = 2 * 60 * 1000; // 2 minutes in milliseconds

const FaucetPopover: React.FC<FaucetPopoverProps> = ({
    isOpen,
    onClose,
    anchorRect,
    connectedAddress
}) => {
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [cooldownTime, setCooldownTime] = useState(0);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (connectedAddress) {
            setAddress(connectedAddress);
        }
    }, [connectedAddress]);

    // Handle rate limit countdown
    useEffect(() => {
        const calculateCooldown = () => {
            const lastRequest = localStorage.getItem('faucet_last_request_time');
            if (lastRequest) {
                const timePassed = Date.now() - parseInt(lastRequest, 10);
                if (timePassed < RATE_LIMIT_MS) {
                    setCooldownTime(Math.ceil((RATE_LIMIT_MS - timePassed) / 1000));
                } else {
                    setCooldownTime(0);
                }
            }
        };

        // Check immediately when opened/rendered
        calculateCooldown();

        // Update the timer every second
        const interval = setInterval(calculateCooldown, 1000);
        return () => clearInterval(interval);
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                if (!loading) onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, loading]);

    if (!isOpen || !anchorRect) return null;

    const handleRequest = async () => {
        if (!address.trim() || cooldownTime > 0) return;
        setLoading(true);
        setStatus('idle');
        setMessage('');

        try {
            const result = await StacksWalletService.requestTestnetTokens(address);
            if (result.success) {
                setStatus('success');
                setMessage('500 STX will be sent to your address shortly!');
                
                // Set the rate limit timestamp on success
                localStorage.setItem('faucet_last_request_time', Date.now().toString());
                setCooldownTime(RATE_LIMIT_MS / 1000);
            } else {
                setStatus('error');
                setMessage(result.reason || 'Failed to request tokens. Please try again.');
            }
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message || 'Network error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const top = anchorRect.top - 350; // Position above the status bar
    const left = anchorRect.left;
    const bottom = anchorRect.bottom;

    // Helper to format the cooldown seconds into MM:SS
    const formatCooldown = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div
            ref={popoverRef}
            className="fixed z-[100] bottom-0 w-80 bg-caspier-black border border-caspier-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{
                top: Math.max(10, top),
                left: Math.max(50, left),
                bottom: Math.min(25, bottom),
            }}
        >
            <div className="p-4 border-b border-caspier-border bg-caspier-panel/30">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-labstx-orange/20 flex items-center justify-center">
                        <WalletIcon className="w-4 h-4 text-labstx-orange" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-caspier-text">Testnet Faucet</h3>
                        <p className="text-[10px] text-caspier-muted uppercase tracking-wider font-bold">Request free STX tokens</p>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-caspier-muted font-bold block px-1">
                        Stacks Address (Testnet)
                    </label>
                    <div className="relative group">
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="ST..."
                            disabled={loading || cooldownTime > 0}
                            className="w-full bg-caspier-dark border border-caspier-border focus:border-labstx-orange/50 rounded-md px-3 py-2 text-xs text-caspier-text placeholder:text-caspier-muted focus:outline-none transition-all disabled:opacity-50"
                        />
                        {connectedAddress && connectedAddress !== address && (
                            <button
                                onClick={() => setAddress(connectedAddress)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-labstx-orange hover:text-labstx-orange/80 transition-colors uppercase tracking-tighter"
                                disabled={loading || cooldownTime > 0}
                            >
                                Use Connected
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-labstx-orange/5 border border-labstx-orange/10 rounded-md p-3">
                    <p className="text-[11px] text-caspier-text leading-relaxed">
                        You will receive <span className="text-labstx-orange font-bold">500 STX</span> for your development and testing needs.
                    </p>
                </div>

                {status !== 'idle' && (
                    <div className={`flex items-start gap-2 p-3 rounded-md text-[11px] animate-in fade-in zoom-in-95 duration-200 ${status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        {status === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 shrink-0" />
                        )}
                        <span>{message}</span>
                    </div>
                )}

                <Button
                    onClick={handleRequest}
                    disabled={loading || !address.startsWith('ST') || cooldownTime > 0}
                    className={`w-full h-10 font-bold uppercase tracking-widest text-[10px] transition-all hover:bg-labstx-orange/90 ${cooldownTime > 0 ? 'bg-caspier-dark text-caspier-muted border-caspier-border cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin mr-2" />
                            Requesting...
                        </>
                    ) : cooldownTime > 0 ? (
                        `Wait ${formatCooldown(cooldownTime)}`
                    ) : (
                        'Request STX Tokens'
                    )}
                </Button>
            </div>

            <div className="p-3 bg-caspier-panel/20 text-center border-t border-caspier-border">
                <p className="text-[9px] text-caspier-muted font-medium">Hiro Testnet Faucet API</p>
            </div>
        </div>
    );
};

export default FaucetPopover;
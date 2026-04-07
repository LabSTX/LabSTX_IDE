
import React, { useState } from 'react';
import { XIcon, SearchIcon, GlobeIcon, DatabaseIcon, WalletIcon, HashIcon, FileTextIcon, LoaderIcon } from '../UI/Icons';

export type DiscoveryImportType = 'txid' | 'contract_id' | 'wallet' | 'ipfs' | 'https';
export type StacksNetworkType = 'mainnet' | 'testnet';

interface DiscoveryImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (type: DiscoveryImportType, value: string, network: StacksNetworkType, selectedContracts?: string[]) => Promise<void>;
    theme?: 'dark' | 'light';
    progress?: number; // 0 to 100
}

interface DiscoveredContract {
    id: string;
    name: string;
    selected: boolean;
}

export const DiscoveryImportModal: React.FC<DiscoveryImportModalProps> = ({
    isOpen,
    onClose,
    onImport,
    theme = 'dark',
    progress = 0
}) => {
    const [importType, setImportType] = useState<DiscoveryImportType>('txid');
    const [network, setNetwork] = useState<StacksNetworkType>('mainnet');
    const [inputValue, setInputValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'input' | 'selection'>('input');
    const [discoveredContracts, setDiscoveredContracts] = useState<DiscoveredContract[]>([]);

    if (!isOpen) return null;

    const handleFetchContracts = async () => {
        if (!inputValue.trim()) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const baseUrl = network === 'mainnet' ? 'https://api.mainnet.hiro.so' : 'https://api.testnet.hiro.so';
            const resp = await fetch(`${baseUrl}/extended/v1/address/${inputValue.trim()}/transactions?limit=50`);
            if (!resp.ok) throw new Error(`Hiro API error: ${resp.statusText}`);
            const data = await resp.json();

            const contractIds = new Set<string>();
            (data.results || []).forEach((tx: any) => {
                if (tx.tx_type === 'smart_contract') contractIds.add(tx.smart_contract.contract_id);
                if (tx.tx_type === 'contract_call') contractIds.add(tx.contract_call.contract_id);
            });

            if (contractIds.size === 0) throw new Error('No contract activity found for this address.');

            const contracts = Array.from(contractIds).map(id => ({
                id,
                name: id.split('.')[1] || id,
                selected: true
            }));

            setDiscoveredContracts(contracts);
            setStep('selection');
        } catch (err: any) {
            setError(err.message || 'Failed to fetch contracts.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSumbit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        if (importType === 'wallet' && step === 'input') {
            handleFetchContracts();
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const selectedIds = importType === 'wallet'
                ? discoveredContracts.filter(c => c.selected).map(c => c.id)
                : undefined;

            await onImport(importType, inputValue.trim(), network, selectedIds);
            setInputValue('');
            setStep('input');
            setDiscoveredContracts([]);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to import. Please check the value and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleContract = (id: string) => {
        setDiscoveredContracts(prev => prev.map(c =>
            c.id === id ? { ...c, selected: !c.selected } : c
        ));
    };

    const selectAll = (selected: boolean) => {
        setDiscoveredContracts(prev => prev.map(c => ({ ...c, selected })));
    };

    const getConfig = () => {
        switch (importType) {
            case 'txid':
                return {
                    label: 'Transaction ID',
                    placeholder: '0x...',
                    icon: <HashIcon className="w-5 h-5" />,
                    description: 'Fetch the exact transaction that deployed a contract.'
                };
            case 'contract_id':
                return {
                    label: 'Contract ID',
                    placeholder: 'SP...ABC.contract-name',
                    icon: <FileTextIcon className="w-5 h-5" />,
                    description: 'Fetch any contract source code using its canonical ID.'
                };
            case 'wallet':
                return {
                    label: 'Wallet Address',
                    placeholder: 'SP...',
                    icon: <WalletIcon className="w-5 h-5" />,
                    description: 'Fetch all contracts deployed by a specific wallet.'
                };
            case 'ipfs':
                return {
                    label: 'IPFS CID',
                    placeholder: 'Qm... or ba...',
                    icon: <DatabaseIcon className="w-5 h-5" />,
                    description: 'Import files directly from IPFS.'
                };
            case 'https':
                return {
                    label: 'HTTPS URL',
                    placeholder: 'https://...',
                    icon: <GlobeIcon className="w-5 h-5" />,
                    description: 'Import a single file or a ZIP from a URL.'
                };
        }
    };

    const config = getConfig();

    const types: { id: DiscoveryImportType; label: string; icon: React.ReactNode }[] = [
        { id: 'txid', label: 'TXID', icon: <HashIcon className="w-3.5 h-3.5" /> },
        { id: 'contract_id', label: 'Contract ID', icon: <FileTextIcon className="w-3.5 h-3.5" /> },
        { id: 'wallet', label: 'Wallet', icon: <WalletIcon className="w-3.5 h-3.5" /> },
        { id: 'ipfs', label: 'IPFS', icon: <DatabaseIcon className="w-3.5 h-3.5" /> },
        { id: 'https', label: 'HTTPS', icon: <GlobeIcon className="w-3.5 h-3.5" /> },
    ];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-caspier-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="bg-caspier-dark border-2 border-caspier-border w-full max-w-lg rounded-2xl shadow-[8px_8px_0_0_rgba(240,80,35,0.2)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b-2 border-caspier-border flex justify-between items-center bg-caspier-black">
                    <div>
                        <h2 className="text-xl font-black tracking-widest uppercase flex items-center gap-3">
                            <SearchIcon className="w-6 h-6 text-labstx-orange" />
                            Discovery Import
                        </h2>
                        <p className="text-caspier-muted text-[9px] mt-1 font-black uppercase tracking-[0.2em]">Fetch contracts from the network</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-labstx-orange hover:text-caspier-text rounded-full text-caspier-muted transition-all"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 bg-caspier-dark/50">
                    {/* Mode Tabs */}
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap gap-2">
                            {types.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => { setImportType(t.id); setError(null); setStep('input'); setDiscoveredContracts([]); }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${importType === t.id
                                        ? 'bg-labstx-orange border-labstx-orange text-caspier-text shadow-lg'
                                        : 'bg-caspier-black border-caspier-border text-caspier-muted hover:border-caspier-border hover:text-caspier-text'
                                        }`}
                                >
                                    {t.icon}
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Network Switcher */}
                        <div className="flex items-center gap-2 bg-caspier-black p-1 rounded-xl border border-caspier-border self-start">
                            <button
                                onClick={() => setNetwork('mainnet')}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${network === 'mainnet'
                                    ? 'bg-caspier-dark text-labstx-orange shadow-inner border border-caspier-border'
                                    : 'text-caspier-muted hover:text-caspier-text'
                                    }`}
                            >
                                Mainnet
                            </button>
                            <button
                                onClick={() => setNetwork('testnet')}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${network === 'testnet'
                                    ? 'bg-caspier-dark text-labstx-orange shadow-inner border border-caspier-border'
                                    : 'text-caspier-muted hover:text-caspier-text'
                                    }`}
                            >
                                Testnet
                            </button>
                        </div>
                    </div>

                    {/* Description Area */}
                    <div className="p-4 bg-caspier-black/40 border border-caspier-border rounded-xl flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-full bg-labstx-orange/10 flex items-center justify-center text-labstx-orange shrink-0">
                            {config.icon}
                        </div>
                        <div>
                            <div className="text-xs font-bold text-caspier-text mb-1">{config.label}</div>
                            <div className="text-[11px] text-caspier-muted leading-relaxed">{config.description}</div>
                        </div>
                    </div>

                    {/* Input Form / Selection UI */}
                    {step === 'input' ? (
                        <form onSubmit={handleSumbit} className="space-y-4">
                            <div className="relative">
                                <input
                                    autoFocus
                                    type="text"
                                    className={`w-full bg-caspier-black border-2 ${error ? 'border-red-500/50' : 'border-caspier-border'} focus:border-labstx-orange text-caspier-text px-4 py-3 rounded-xl outline-none transition-all placeholder:text-caspier-muted/50 text-sm font-mono`}
                                    placeholder={config.placeholder}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    disabled={isSubmitting}
                                />
                                {isSubmitting && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <LoaderIcon className="w-5 h-5 text-labstx-orange animate-spin" />
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider px-1">
                                    ⚠️ {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || !inputValue.trim()}
                                className={`w-full py-3 rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-2 ${isSubmitting || !inputValue.trim()
                                    ? 'bg-caspier-border text-caspier-muted cursor-not-allowed'
                                    : 'bg-labstx-orange text-caspier-text hover:shadow-[0_4px_15px_-5px_rgba(240,80,35,0.5)] active:scale-[0.98]'
                                    }`}
                            >
                                {isSubmitting ? 'Fetching...' : importType === 'wallet' ? 'Find Contracts' : `Import via ${importType.replace('_', ' ')}`}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center px-1">
                                <div className="text-[10px] font-black uppercase tracking-widest text-caspier-muted">
                                    Select Contracts ({discoveredContracts.filter(c => c.selected).length}/{discoveredContracts.length})
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => selectAll(true)}
                                        className="text-[9px] font-black uppercase tracking-widest text-labstx-orange hover:underline"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={() => selectAll(false)}
                                        className="text-[9px] font-black uppercase tracking-widest text-caspier-muted hover:text-caspier-text"
                                    >
                                        Deselect All
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-48 overflow-y-auto border-2 border-caspier-border rounded-xl bg-caspier-black divide-y divide-caspier-border">
                                {discoveredContracts.map(contract => (
                                    <div
                                        key={contract.id}
                                        onClick={() => toggleContract(contract.id)}
                                        className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors ${contract.selected ? 'bg-labstx-orange/5' : ''}`}
                                    >
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${contract.selected ? 'bg-labstx-orange border-labstx-orange' : 'border-caspier-border'}`}>
                                            {contract.selected && <div className="w-2 h-2 bg-white rounded-sm" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-xs font-bold truncate ${contract.selected ? 'text-caspier-text' : 'text-caspier-muted'}`}>{contract.name}</div>
                                            <div className="text-[9px] font-mono text-caspier-muted truncate">{contract.id.split('.')[0]}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('input')}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 rounded-xl border-2 border-caspier-border font-black uppercase tracking-[0.2em] text-[10px] text-caspier-muted hover:text-caspier-text hover:border-caspier-text transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={(e) => handleSumbit(e)}
                                    disabled={isSubmitting || discoveredContracts.filter(c => c.selected).length === 0}
                                    className={`flex-[2] py-3 rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-2 ${isSubmitting || discoveredContracts.filter(c => c.selected).length === 0
                                        ? 'bg-caspier-border text-caspier-muted cursor-not-allowed'
                                        : 'bg-labstx-orange text-caspier-text hover:shadow-[0_4px_15px_-5px_rgba(240,80,35,0.5)] active:scale-[0.98]'
                                        }`}
                                >
                                    {isSubmitting ? 'Importing...' : 'Import Selected'}
                                </button>
                            </div>

                            {isSubmitting && progress > 0 && (
                                <div className="space-y-2 pt-2 border-t border-caspier-border">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-labstx-orange">
                                        <span>Importing {discoveredContracts.filter(c => c.selected).length} Files...</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-caspier-black border border-caspier-border rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-labstx-orange transition-all duration-300 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-caspier-black border-t-2 border-caspier-border flex items-center justify-center">
                    <span className="text-[9px] text-caspier-muted uppercase tracking-[0.2em] font-black">LabSTX Network Discovery v1.0</span>
                </div>
            </div>
        </div>
    );
};

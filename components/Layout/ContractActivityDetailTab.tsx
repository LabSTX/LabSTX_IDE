import React from 'react';
import { DeployedContract } from '../../types';
import { RocketIcon, GlobeIcon, HashIcon, ExternalLinkIcon, ClockIcon, CopyIcon, CodeIcon } from '../UI/Icons';
import { Button } from '../UI/Button';

interface ContractActivityDetailTabProps {
    contract: DeployedContract;
    theme: 'dark' | 'light';
}

export const ContractActivityDetailTab: React.FC<ContractActivityDetailTabProps> = ({ contract, theme }) => {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add a toast here
    };

    const explorerUrl = contract.network === 'mainnet'
        ? `https://explorer.hiro.so/txid/${contract.deployHash}`
        : `https://explorer.hiro.so/txid/${contract.deployHash}?chain=testnet`;

    const apiSourceUrl = contract.network === 'mainnet'
        ? `https://api.mainnet.hiro.so/v2/contracts/source/${contract.contractHash.split('.')[0]}/${contract.contractHash.split('.')[1]}`
        : `https://api.testnet.hiro.so/v2/contracts/source/${contract.contractHash.split('.')[0]}/${contract.contractHash.split('.')[1]}`;

    return (
        <div className="flex-1 flex flex-col h-full bg-caspier-dark overflow-y-auto font-sans">
            <div className="max-w-5xl mx-auto w-full px-6 py-10 lg:px-10 lg:py-14 space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-caspier-black/60 rounded-xl border border-caspier-border shadow-sm">
                                <RocketIcon className="w-6 h-6 text-labstx-orange" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-2xl font-black text-caspier-text tracking-tight uppercase">{contract.name}</h1>
                                <span className="text-[10px] text-caspier-muted font-bold tracking-[0.2em] uppercase opacity-70">Deployed Contract</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-start">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[10px] font-black tracking-widest uppercase transition-all shadow-sm ${contract.network === 'mainnet'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-labstx-orange/10 text-labstx-orange border-caspier-border'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${contract.network === 'mainnet' ? 'bg-green-500' : 'bg-labstx-orange'} animate-pulse`} />
                            {contract.network}
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-caspier-black/80 rounded-md border border-caspier-border text-[10px] font-bold text-caspier-muted uppercase tracking-wider">
                            <ClockIcon className="w-3 h-3" />
                            {new Date(contract.timestamp).toLocaleString(undefined, {
                                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Identifiers */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-caspier-black/30 border border-caspier-border rounded-xl p-6 lg:p-8 hover:border-caspier-border/80 transition-colors">
                            <h3 className="text-[10px] font-black text-caspier-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <HashIcon className="w-3.5 h-3.5" />
                                Identifiers
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-caspier-muted uppercase tracking-widest">Contract Principal</label>
                                    <div className="flex items-center justify-between bg-caspier-dark/50 p-3.5 rounded-lg border border-caspier-border group/copy hover:border-caspier-border transition-colors">
                                        <code className="text-[13px] font-mono text-caspier-text truncate min-w-0 mr-4 select-all">{contract.contractHash}</code>
                                        <button
                                            onClick={() => copyToClipboard(contract.contractHash)}
                                            className="p-2 -m-2 opacity-50 group-hover/copy:opacity-100 hover:text-labstx-orange hover:bg-labstx-orange/10 rounded-md transition-all flex-shrink-0"
                                            title="Copy Principal"
                                        >
                                            <CopyIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-caspier-muted uppercase tracking-widest">Transaction Hash</label>
                                    <div className="flex items-center justify-between bg-caspier-dark/50 p-3.5 rounded-lg border border-caspier-border group/copy hover:border-caspier-border transition-colors">
                                        <code className="text-[13px] font-mono text-caspier-text truncate min-w-0 mr-4 select-all">{contract.deployHash}</code>
                                        <button
                                            onClick={() => copyToClipboard(contract.deployHash)}
                                            className="p-2 -m-2 opacity-50 group-hover/copy:opacity-100 hover:text-labstx-orange hover:bg-labstx-orange/10 rounded-md transition-all flex-shrink-0"
                                            title="Copy TXID"
                                        >
                                            <CopyIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status Panel */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-caspier-black/30 border border-caspier-border rounded-xl p-5 flex flex-col gap-1 hover:border-caspier-border/80 transition-colors">
                                <span className="text-[10px] font-bold text-caspier-muted uppercase tracking-widest">Status</span>
                                <span className="text-sm font-black text-caspier-text tracking-wide uppercase mt-1">Confirmed</span>
                            </div>
                            <div className="bg-caspier-black/30 border border-caspier-border rounded-xl p-5 flex flex-col gap-1 hover:border-caspier-border/80 transition-colors">
                                <span className="text-[10px] font-bold text-caspier-muted uppercase tracking-widest">Language</span>
                                <span className="text-sm font-black text-caspier-text tracking-wide uppercase mt-1">Clarity</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="space-y-6">
                        <div className="bg-caspier-black/30 border border-caspier-border rounded-xl p-6 lg:p-8 hover:border-caspier-border/80 transition-colors">
                            <h3 className="text-[10px] font-black text-caspier-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <GlobeIcon className="w-3.5 h-3.5" />
                                Explorer
                            </h3>

                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={() => window.open(explorerUrl, '_blank')}
                                    className="w-full h-12 flex items-center justify-center gap-2 bg-labstx-orange hover:bg-labstx-orange/90 text-white font-black uppercase tracking-widest text-[10px] group shadow-neobrutal-sm active:shadow-none translate-x-[-2px] translate-y-[-2px] active:translate-x-[0px] active:translate-y-[0px] rounded-lg border-none"
                                >
                                    <ExternalLinkIcon className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                                    View in Explorer
                                </Button>

                                <Button
                                    variant="secondary"
                                    onClick={() => window.open(apiSourceUrl, '_blank')}
                                    className="w-full h-12 flex items-center justify-center gap-2 bg-caspier-black/50 hover:bg-caspier-black text-caspier-text font-black uppercase tracking-widest text-[10px] border border-caspier-border rounded-lg group transition-colors shadow-none"
                                >
                                    <CodeIcon className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:text-labstx-orange transition-all" />
                                    Fetch API Source
                                </Button>
                            </div>
                        </div>

                        <div className="bg-transparent border border-dashed border-caspier-border rounded-xl p-5 flex flex-col gap-2">
                            <h4 className="text-[10px] font-black text-caspier-text uppercase tracking-widest">Monitoring</h4>
                            <p className="text-[10px] text-caspier-muted leading-relaxed font-bold">
                                This contract is currently synchronized. Interaction and testing tools can interact live via the LabSTX interface.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

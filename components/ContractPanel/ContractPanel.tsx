import { CloudDownloadIcon, Dot, Network, Wifi } from "lucide-react"
import { Button } from "../UI/Button"
import React, { useState } from 'react';

interface ContractPanelProps {
    onOpenContractCall?: (hash: string) => void;
    prefilledContractInfo?: { address: string; name: string } | null;
    setPrefilledContractInfo?: React.Dispatch<React.SetStateAction<{ address: string; name: string } | null>>;
    activeSimnetAccount?: string;
    network: string;
    deployedContracts?: any[];
}

const ContractPanel: React.FC<ContractPanelProps> = ({
    onOpenContractCall,
    prefilledContractInfo,
    setPrefilledContractInfo,
    activeSimnetAccount,
    network,
    deployedContracts = []
}) => {
    const [contractAddress, setContractAddress] = useState(prefilledContractInfo?.address || '');
    const [contractName, setContractName] = useState(prefilledContractInfo?.name || '');

    /**
     * Handles the logic for splitting a full contract identifier (address.name)
     * if pasted into the address field.
     */
    const handleAddressChange = (value: string) => {
        if (value.includes('.')) {
            // Split by the first dot found
            const parts = value.split('.');
            const addr = parts[0].trim();
            // Join the rest back together in case the contract name contains a dot
            const name = parts.slice(1).join('.').trim();

            setContractAddress(addr);
            setContractName(name);
        } else {
            // Standard behavior if no dot is present
            setContractAddress(value);
        }
    };

    const handleGetContract = () => {
        if (contractAddress && contractName) {
            onOpenContractCall?.(`${contractAddress.trim()}.${contractName.trim()}`);
        }
    };

    const suggestedContracts = [
        { name: 'pox-4', address: 'ST000000000000000000002AMW42H' },
        { name: 'bns', address: 'ST000000000000000000002AMW42H' },
        { name: 'costs', address: 'ST000000000000000000002AMW42H' }
    ];

    return (
        <div className="flex flex-col h-full bg-caspier-black">
            <div className="flex items-center justify-between p-4 border-b border-caspier-border bg-caspier-black">
                <h2 className="text-[10px] font-black text-caspier-muted tracking-[0.2em] uppercase">Contract Interaction</h2>
                <p className='text-amber-500 border border-amber-500 w-fit px-2 py-1 rounded-full text-[10px]'>Experimental</p>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">
                    <div className="space-y-3">
                        <p className="text-[11px] text-caspier-muted leading-relaxed">
                            Manually enter contract details below, or select from suggested contracts to see available functions.
                        </p>
                        <p className="text-[11px] text-caspier-muted leading-relaxed">
                            Hint: you can paste the <span className='underline font-bold text-caspier-text'>smart contracts' identifier</span> in this format: [principal].[contract-name]
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 w-fit px-2 py-1 border border-caspier-border">
                            <Wifi className="w-3 h-3" />
                            <p className=" text-caspier-text text-[9px] font-black uppercase tracking-widest">{network} - Network</p>
                        </div>

                        {network === 'simnet' && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 w-fit px-2 py-1 border border-caspier-border bg-blue-500">
                                    <div className="w-2 h-2 rounded-full bg-caspier-black " />
                                    <p className=" text-caspier-black text-[9px] font-black uppercase tracking-widest">Clarity 5.0</p>
                                </div>
                                <div className="flex items-center gap-2 w-fit px-2 py-1 border border-caspier-border bg-yellow-500">
                                    <div className="w-2 h-2 rounded-full bg-caspier-black " />
                                    <p className=" text-caspier-black text-[9px] font-black uppercase tracking-widest">Epoch 3.4</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-caspier-muted uppercase tracking-widest">Contract Address</label>
                            <input
                                type="text"
                                value={contractAddress}
                                onChange={(e) => handleAddressChange(e.target.value)}
                                className="w-full bg-caspier-dark border border-caspier-border text-caspier-text text-[11px] font-medium px-2 py-1.5 focus:border-labstx-orange outline-none rounded transition-colors"
                                placeholder="ST1PQHQKV..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-caspier-muted uppercase tracking-widest">Contract Name</label>
                            <input
                                type="text"
                                value={contractName}
                                onChange={(e) => setContractName(e.target.value)}
                                className="w-full bg-caspier-dark border border-caspier-border text-caspier-text text-[11px] font-medium px-2 py-1.5 focus:border-labstx-orange outline-none rounded transition-colors"
                                placeholder="contract-name"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                            variant="primary"
                            onClick={handleGetContract}
                            disabled={!contractAddress || !contractName}
                            className="w-full text-[10px] font-black uppercase py-2 bg-caspier-black hover:bg-caspier-hover text-caspier-text active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                            <CloudDownloadIcon className="w-3 h-3" />
                            Get Contract
                        </Button>
                    </div>

                    <div className="mt-8">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-labstx-orange animate-pulse" />
                            <span className="text-[9px] font-black text-caspier-muted uppercase tracking-widest">
                                {network === 'simnet' ? 'Active Simnet Contracts' : 'Suggested Contracts'}
                            </span>
                        </div>

                        <div className='space-y-2'>
                            {network === 'simnet' ? (
                                deployedContracts.length > 0 ? (
                                    deployedContracts.filter(c => c.network === 'simnet').map((c, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                const [addr, name] = c.contractHash.split('.');
                                                setContractAddress(addr);
                                                setContractName(name);
                                                onOpenContractCall?.(c.contractHash);
                                            }}
                                            className='w-full text-left p-2 border border-caspier-border hover:border-labstx-orange/50 hover:bg-labstx-orange/5 transition-all group rounded'
                                        >
                                            <div className='text-[10px] font-bold text-caspier-text group-hover:text-labstx-orange uppercase'>{c.name}</div>
                                            <div className='text-[9px] text-caspier-muted truncate font-mono'>{c.contractHash}</div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-[10px] text-caspier-muted italic p-2 border border-dashed border-caspier-border rounded">
                                        No contracts deployed to Simnet yet.
                                    </div>
                                )
                            ) : (
                                suggestedContracts.map((c, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setContractAddress(c.address);
                                            setContractName(c.name);
                                            onOpenContractCall?.(`${c.address}.${c.name}`);
                                        }}
                                        className='w-full text-left p-2 border border-caspier-border hover:border-labstx-orange/50 hover:bg-labstx-orange/5 transition-all group rounded'
                                    >
                                        <div className='text-[10px] font-bold text-caspier-text group-hover:text-labstx-orange'>{c.name}</div>
                                        <div className='text-[9px] text-caspier-muted truncate font-mono'>{c.address}</div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ContractPanel;
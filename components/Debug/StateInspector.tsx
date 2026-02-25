import React, { useState, useEffect } from 'react';
import { ClarityDebugger, StateVar } from '../../services/stacks/debugger';

interface StateInspectorProps {
    contractCode?: string;
    contractName?: string;
    theme?: 'dark' | 'light';
}

const StateInspector: React.FC<StateInspectorProps> = ({ contractCode, contractName, theme }) => {
    const [stateVars, setStateVars] = useState<StateVar[]>([]);
    const [loading, setLoading] = useState(false);
    const [systemInfo, setSystemInfo] = useState<{ blockHeight: number; deployer: string }>({ blockHeight: 1, deployer: 'ST1PQ...GM' });

    useEffect(() => {
        const timer = setTimeout(() => {
            const fetchData = async () => {
                if (!contractCode || !contractName) return;
                setLoading(true);
                try {
                    const data = await ClarityDebugger.getDebugData(contractCode, contractName);
                    setStateVars(data.state);
                    // System info is returned in the same object by the service but we don't have a direct type for it yet
                    // In a real app we'd expand the type
                } catch (error) {
                    console.error("Failed to fetch state:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }, 500);

        return () => clearTimeout(timer);
    }, [contractCode, contractName]);

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-caspier-panel/20 animate-pulse rounded-xl border border-caspier-border" />
                ))}
            </div>
        );
    }

    const assets = stateVars.filter(v => v.type === 'asset');
    const system = stateVars.filter(v => v.type === 'system');

    return (
        <div className="flex flex-col h-full bg-caspier-black p-5 overflow-y-auto no-scrollbar space-y-6">
            {/* System Info Section */}
            <section>
                <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-caspier-red" />
                    <h3 className="text-[10px] font-black text-caspier-muted uppercase tracking-[0.2em]">Live Simulator</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-caspier-panel/30 border border-caspier-border p-3 rounded-xl backdrop-blur-sm">
                        <div className="text-[9px] text-caspier-muted uppercase font-bold mb-1 opacity-50">Block Height</div>
                        <div className="text-xs font-mono text-caspier-text font-bold"># {systemInfo.blockHeight}</div>
                    </div>
                    <div className="bg-caspier-panel/30 border border-caspier-border p-3 rounded-xl backdrop-blur-sm">
                        <div className="text-[9px] text-caspier-muted uppercase font-bold mb-1 opacity-50">Runtime</div>
                        <div className="text-xs font-mono text-caspier-text font-bold">2.1 (Clarity)</div>
                    </div>
                </div>
            </section>

            {/* Assets Section */}
            <section>
                <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-labstx-orange" />
                        <h3 className="text-[10px] font-black text-caspier-muted uppercase tracking-[0.2em]">Asset Balances</h3>
                    </div>
                    <span className="text-[9px] bg-labstx-orange/10 text-labstx-orange px-1.5 py-0.5 rounded font-bold">{assets.length} Found</span>
                </div>

                {assets.length === 0 ? (
                    <div className="p-8 border border-caspier-border border-dashed rounded-2xl text-center">
                        <p className="text-xs text-caspier-muted italic">No assets detected in this environment.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {assets.map((sv, idx) => (
                            <div key={idx} className="bg-caspier-panel/40 border border-caspier-border p-3 rounded-xl group hover:border-labstx-orange/50 transition-all">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[11px] font-bold text-indigo-300">{sv.name}</span>
                                    <span className="text-[8px] bg-caspier-black px-1.5 py-0.5 rounded text-caspier-muted border border-caspier-border uppercase font-black">STX</span>
                                </div>
                                <div className="text-[13px] font-mono text-caspier-text font-black tracking-tight">
                                    {(() => {
                                        try {
                                            return BigInt(sv.value).toLocaleString();
                                        } catch {
                                            return sv.value;
                                        }
                                    })()} <span className="text-[9px] opacity-30 font-sans">micro-STX</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* System/Others Section */}
            {system.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <h3 className="text-[10px] font-black text-caspier-muted uppercase tracking-[0.2em]">Network Context</h3>
                    </div>
                    <div className="space-y-2">
                        {system.map((sv, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-caspier-dark/40 rounded-xl border border-caspier-border">
                                <span className="text-[10px] text-caspier-muted font-bold">{sv.name}</span>
                                <span className="text-[10px] text-caspier-text font-mono truncate ml-4 opacity-80">{sv.value}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default StateInspector;

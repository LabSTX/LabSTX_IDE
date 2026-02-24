import React, { useState, useEffect } from 'react';
import { ClarityDebugger, StateVar } from '../../services/stacks/debugger';

interface StateInspectorProps {
    contractCode?: string;
    contractName?: string;
}

const StateInspector: React.FC<StateInspectorProps> = ({ contractCode, contractName }) => {
    const [stateVars, setStateVars] = useState<StateVar[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!contractCode || !contractName) return;
            setLoading(true);
            try {
                const data = await ClarityDebugger.getDebugData(contractCode, contractName);
                setStateVars(data.state);
            } catch (error) {
                console.error("Failed to fetch state:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [contractCode, contractName]);

    if (loading) {
        return <div className="p-4 text-caspier-muted text-xs animate-pulse">Loading contract state...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-caspier-black p-4 overflow-y-auto">
            <div className="text-[10px] font-bold text-caspier-muted uppercase mb-4 tracking-wider">Contract State Variables</div>

            {stateVars.length === 0 ? (
                <div className="text-xs text-caspier-muted italic text-center py-8 border border-dashed border-caspier-border rounded">
                    No state variables detected or contract not analyzed.
                </div>
            ) : (
                <div className="space-y-3">
                    {stateVars.map((sv, idx) => (
                        <div key={idx} className="bg-caspier-dark border border-caspier-border p-2 rounded-sm group hover:border-labstx-orange transition-colors">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-indigo-400">{sv.name}</span>
                                <span className="text-[9px] bg-caspier-black px-1.5 py-0.5 rounded text-caspier-muted border border-caspier-border">{sv.type}</span>
                            </div>
                            <div className="text-xs font-mono text-caspier-text bg-black/30 p-1.5 rounded truncate">
                                {sv.value}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 pt-4 border-t border-caspier-border">
                <div className="text-[10px] font-bold text-caspier-muted uppercase mb-4 tracking-wider">Map Data Explorer</div>
                <div className="text-xs text-caspier-muted italic text-center py-8">
                    No maps defined in active contract
                </div>
            </div>
        </div>
    );
};

export default StateInspector;

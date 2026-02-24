import React, { useState, useEffect } from 'react';
import { ClarityDebugger, TraceStep } from '../../services/stacks/debugger';

interface TraceViewerProps {
    contractCode?: string;
    contractName?: string;
}

const TraceViewer: React.FC<TraceViewerProps> = ({ contractCode, contractName }) => {
    const [trace, setTrace] = useState<TraceStep[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!contractCode || !contractName) return;
            setLoading(true);
            try {
                const data = await ClarityDebugger.getDebugData(contractCode, contractName);
                setTrace(data.trace);
            } catch (error) {
                console.error("Failed to fetch trace:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [contractCode, contractName]);

    if (loading) {
        return <div className="p-4 text-caspier-muted text-xs animate-pulse">Loading execution trace...</div>;
    }

    const totalGas = trace.reduce((acc, step) => acc + step.spent, 0);

    return (
        <div className="flex flex-col h-full bg-caspier-black p-4 overflow-y-auto font-mono text-[11px]">
            <div className="text-[10px] font-bold text-caspier-muted uppercase mb-4 tracking-wider font-sans">Execution Trace (Last Transaction)</div>

            {trace.length === 0 ? (
                <div className="text-xs text-caspier-muted italic text-center py-8 border border-dashed border-caspier-border rounded font-sans">
                    No execution trace available. Run a command in the REPL to see the trace.
                </div>
            ) : (
                <div className="space-y-1">
                    {trace.map((step, idx) => (
                        <div
                            key={idx}
                            className="group flex flex-col border-l-2 border-labstx-orange/30 pl-3 py-1 hover:border-labstx-orange transition-colors"
                            style={{ marginLeft: `${step.depth * 16}px` }}
                        >
                            <div className="flex justify-between items-center text-indigo-400">
                                <span>
                                    <span className="text-caspier-muted">{step.contract}.</span>
                                    <span className="font-bold">{step.function}</span>
                                    <span className="text-caspier-muted italic ml-1">({step.args.join(', ')})</span>
                                </span>
                                <span className="text-[9px] text-caspier-muted font-sans bg-caspier-dark px-1 rounded">
                                    {step.spent} gas
                                </span>
                            </div>
                            {step.result && (
                                <div className="text-green-400 mt-0.5 opacity-80">
                                    → {step.result}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {trace.length > 0 && (
                <div className="mt-8 p-3 bg-labstx-orange/5 border border-labstx-orange/20 rounded-sm">
                    <div className="text-[10px] font-bold text-labstx-orange uppercase mb-2 font-sans">Summary</div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <div className="text-caspier-muted mb-1 font-sans">Total Gas</div>
                            <div className="text-caspier-text font-bold">{totalGas} units</div>
                        </div>
                        <div>
                            <div className="text-caspier-muted mb-1 font-sans">Status</div>
                            <div className="text-green-500 font-bold">Success</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TraceViewer;

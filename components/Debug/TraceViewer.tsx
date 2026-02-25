import React, { useState, useEffect } from 'react';
import { ClarityDebugger, TraceStep } from '../../services/stacks/debugger';

interface TraceViewerProps {
    contractCode?: string;
    contractName?: string;
    theme?: 'dark' | 'light';
}

const TraceViewer: React.FC<TraceViewerProps> = ({ contractCode, contractName, theme }) => {
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
        return (
            <div className="p-6 space-y-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-10 bg-caspier-panel/20 animate-pulse rounded border border-caspier-border" />
                ))}
            </div>
        );
    }

    const totalGas = trace.reduce((acc, step) => acc + (step.spent || 0), 0);

    return (
        <div className="flex flex-col h-full bg-caspier-black p-5 overflow-y-auto no-scrollbar font-mono text-[11px]">
            <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-labstx-orange animate-pulse" />
                    <h3 className="text-[10px] font-black text-caspier-muted uppercase tracking-[0.2em] font-sans">Execution Trace</h3>
                </div>
                {trace.length > 0 && (
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-bold font-sans">
                        {trace.length} Steps
                    </span>
                )}
            </div>

            {trace.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-10 border border-caspier-border border-dashed rounded-3xl opacity-50 grayscale">
                    <div className="text-xs text-caspier-muted italic text-center font-sans">
                        No execution trace available.<br />
                        <span className="text-[10px] block mt-2 opacity-60">Run a command in the console to capture flow data.</span>
                    </div>
                </div>
            ) : (
                <div className="space-y-0.5 border-l border-caspier-border ml-2">
                    {trace.map((step, idx) => (
                        <div
                            key={idx}
                            className="group relative flex flex-col pl-6 py-2 hover:bg-caspier-panel/20 transition-all rounded-r-lg"
                            style={{ marginLeft: `${step.depth * 12}px` }}
                        >
                            {/* Connection node */}
                            <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-caspier-black bg-caspier-muted group-hover:bg-labstx-orange transition-colors" />

                            <div className="flex justify-between items-center text-caspier-text">
                                <div className="flex items-center gap-2">
                                    <span className="text-indigo-400 font-bold opacity-80">{step.function}</span>
                                    <span className="text-[9px] text-caspier-muted truncate max-w-[120px]">
                                        ({step.args.join(', ')})
                                    </span>
                                </div>
                                <span className="text-[9px] text-caspier-muted font-sans bg-caspier-black border border-caspier-border px-1 rounded">
                                    {step.spent} g
                                </span>
                            </div>

                            {step.result && (
                                <div className="text-green-400/80 mt-1 pl-2 border-l border-green-500/20 text-[10px]">
                                    <span className="opacity-40">↩</span> {step.result}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {trace.length > 0 && (
                <div className="mt-8 p-4 bg-caspier-panel/30 border border-caspier-border rounded-2xl">
                    <div className="text-[10px] font-black text-caspier-muted uppercase mb-3 font-sans opacity-50">Capture Summary</div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[9px] text-caspier-muted mb-0.5 font-sans">Total Gas Cost</div>
                            <div className="text-xs text-caspier-text font-black">{totalGas.toLocaleString()} Units</div>
                        </div>
                        <div>
                            <div className="text-[9px] text-caspier-muted mb-0.5 font-sans">Result State</div>
                            <div className="text-xs text-green-500 font-black">Success</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-10 pt-6 border-t border-caspier-border flex items-center justify-between opacity-30 px-1">
                <span className="text-[9px] font-black uppercase tracking-widest font-sans">Simulated via Clarinet</span>
                <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-caspier-muted" />
                    <div className="w-1 h-1 rounded-full bg-caspier-muted" />
                    <div className="w-1 h-1 rounded-full bg-caspier-muted" />
                </div>
            </div>
        </div>
    );
};

export default TraceViewer;

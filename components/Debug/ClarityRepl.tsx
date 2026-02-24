import React, { useState, useRef, useEffect } from 'react';
import { ClarityDebugger, DebugLine } from '../../services/stacks/debugger';

interface ClarityReplProps {
    contractCode?: string;
    contractName?: string;
    theme?: 'dark' | 'light';
}

const ClarityRepl: React.FC<ClarityReplProps> = ({ contractCode, contractName, theme }) => {
    const [lines, setLines] = useState<DebugLine[]>(() => [
        { id: '1', type: 'output', content: 'CLARITY REPL v2.0' },
        { id: '2', type: 'output', content: 'Connection: SIMNET (Local Backend)' },
        { id: '3', type: 'output', content: '--' },
    ]);
    const [input, setInput] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contractName) {
            const cleanName = contractName.replace(/\.clar$/, '').replace(/[^a-zA-Z0-9-]/g, '-');
            setLines(prev => [...prev, {
                id: `ctx-${Date.now()}`,
                type: 'output',
                content: `> Context: .${cleanName} deployed at ST1PQ...GM`
            }]);
        }
    }, [contractName]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines]);

    const handleSend = async () => {
        if (!input.trim() || isExecuting) return;

        if (input.toLowerCase() === 'clear') {
            setLines([
                { id: Date.now().toString(), type: 'output', content: 'Console cleared.' }
            ]);
            setInput('');
            return;
        }

        const commandId = Date.now().toString();
        const inputLine: DebugLine = { id: commandId, type: 'input', content: input };
        setLines(prev => [...prev, inputLine]);

        const currentInput = input;
        setInput('');
        setIsExecuting(true);

        try {
            const result = await ClarityDebugger.execute(currentInput,
                contractCode && contractName ? { code: contractCode, name: contractName } : undefined
            );

            const responseLine: DebugLine = {
                id: (Date.now() + 1).toString(),
                type: result.success ? 'output' : 'error',
                content: typeof result.output === 'string' ? result.output : JSON.stringify(result.output)
            };

            setLines(prev => [...prev, responseLine]);
        } catch (error: any) {
            setLines(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                type: 'error',
                content: `Error: ${error.message}`
            }]);
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-caspier-black font-mono text-[11px] selection:bg-labstx-orange/30">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1.5 scroll-smooth">
                {lines.map(line => (
                    <div key={line.id} className="flex gap-2.5 group">
                        <span className={`shrink-0 opacity-40 font-bold ${line.type === 'input' ? 'text-labstx-orange' :
                            line.type === 'error' ? 'text-red-500' : 'text-caspier-muted'
                            }`}>
                            {line.type === 'input' ? '⟫' : '·'}
                        </span>
                        <span className={`break-all leading-relaxed ${line.type === 'input' ? 'text-caspier-text font-bold' :
                            line.type === 'error' ? 'text-red-400' : 'text-indigo-300'
                            }`}>
                            {line.content}
                        </span>
                    </div>
                ))}
                {isExecuting && (
                    <div className="flex gap-2.5 animate-pulse opacity-50">
                        <span className="text-caspier-muted font-bold">·</span>
                        <span className="text-caspier-muted italic">Processing...</span>
                    </div>
                )}
            </div>

            <div className="p-3 bg-caspier-panel/20 backdrop-blur-md border-t border-caspier-border flex gap-3 focus-within:bg-caspier-panel/40 transition-all">
                <span className="text-labstx-orange font-bold drop-shadow-[0_0_8px_rgba(255,107,0,0.3)]">⟫</span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isExecuting}
                    className="flex-1 bg-transparent outline-none text-caspier-text placeholder:text-caspier-muted/30"
                    placeholder={isExecuting ? "Waiting..." : "Expression (e.g. (+ 2 3))"}
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                />
            </div>
        </div>
    );
};

export default ClarityRepl;
